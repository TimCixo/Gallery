using GalleryApp.Api;
using GalleryApp.Api.Infrastructure.Pagination;
using GalleryApp.Api.Models.Pagination;
using GalleryApp.Api.Models.Requests;
using GalleryApp.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using static GalleryApp.Api.Services.LegacyHelpers;

namespace GalleryApp.Api.Endpoints;

public static class CollectionsEndpoints
{
    public static IEndpointRouteBuilder MapCollectionsEndpoints(this IEndpointRouteBuilder app)
    {
        var connectionString = app.ServiceProvider.GetRequiredService<string>();
        var mediaRootPath = app.ServiceProvider.GetRequiredService<MediaStorageOptions>().RootPath;

app.MapGet("/api/collections", (string? search, long? mediaId) =>
{
    var normalizedSearch = NormalizeOptionalText(search);
    if (mediaId.HasValue && mediaId.Value <= 0)
    {
        return Results.BadRequest(new { error = "Invalid media id." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT
            c.Id,
            c.Lable,
            c.Description,
            c.Cover,
            m.Path,
            EXISTS (
                SELECT 1
                FROM CollectionsMedia cm
                WHERE cm.CollectionId = c.Id
                  AND ($mediaId IS NOT NULL AND cm.MediaId = $mediaId)
            ) AS ContainsMedia
        FROM Collections c
        LEFT JOIN Media m ON m.Id = c.Cover
        WHERE c.Lable <> 'Favorites'
          AND ($search IS NULL OR LOWER(c.Lable) LIKE $search)
        ORDER BY c.Id DESC;
        """;
    command.Parameters.AddWithValue("$search", normalizedSearch is null
        ? DBNull.Value
        : $"%{normalizedSearch.ToLowerInvariant()}%");
    command.Parameters.AddWithValue("$mediaId", mediaId ?? (object)DBNull.Value);

    using var reader = command.ExecuteReader();
    var items = new List<object>();
    while (reader.Read())
    {
        var coverId = reader.IsDBNull(3) ? (long?)null : reader.GetInt64(3);
        var coverPath = reader.IsDBNull(4) ? null : reader.GetString(4);
        items.Add(new
        {
            id = reader.GetInt64(0),
            label = reader.GetString(1),
            description = reader.IsDBNull(2) ? null : reader.GetString(2),
            cover = coverId,
            coverMedia = BuildCollectionCoverPayload(mediaRootPath, coverId, coverPath),
            containsMedia = !reader.IsDBNull(5) && reader.GetInt64(5) == 1
        });
    }

    return Results.Ok(new { items });
});

app.MapPost("/api/collections", (CollectionCreateRequest request) =>
{
    var label = NormalizeOptionalText(request.Label);
    if (label is null)
    {
        return Results.BadRequest(new { error = "Collection name is required." });
    }

    var description = NormalizeOptionalText(request.Description);
    var cover = request.Cover;
    if (cover.HasValue && cover.Value <= 0)
    {
        return Results.BadRequest(new { error = "Cover must be a positive media id." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    if (cover.HasValue && !MediaRecordExists(connection, cover.Value))
    {
        return Results.BadRequest(new { error = "Cover media id was not found." });
    }

    using var duplicateCommand = connection.CreateCommand();
    duplicateCommand.CommandText = """
        SELECT EXISTS (
            SELECT 1
            FROM Collections
            WHERE Lable = $label COLLATE NOCASE
        );
        """;
    duplicateCommand.Parameters.AddWithValue("$label", label);
    var hasDuplicate = Convert.ToInt64(duplicateCommand.ExecuteScalar()) == 1;
    if (hasDuplicate)
    {
        return Results.Conflict(new { error = "Collection with this name already exists." });
    }

    using var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO Collections (Lable, Description, Cover)
        VALUES ($label, $description, $cover);

        SELECT last_insert_rowid();
        """;
    command.Parameters.AddWithValue("$label", label);
    command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
    command.Parameters.AddWithValue("$cover", cover ?? (object)DBNull.Value);

    var createdId = Convert.ToInt64(command.ExecuteScalar());
    return Results.Ok(new
    {
        id = createdId,
        label,
        description,
        cover
    });
});

app.MapPut("/api/collections/{id:long}", (long id, CollectionUpdateRequest request) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid collection id." });
    }

    var label = NormalizeOptionalText(request.Label);
    if (label is null)
    {
        return Results.BadRequest(new { error = "Collection name is required." });
    }

    var description = NormalizeOptionalText(request.Description);
    var cover = request.Cover;
    if (cover.HasValue && cover.Value <= 0)
    {
        return Results.BadRequest(new { error = "Cover must be a positive media id." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    if (cover.HasValue && !MediaRecordExists(connection, cover.Value))
    {
        return Results.BadRequest(new { error = "Cover media id was not found." });
    }

    using var duplicateCommand = connection.CreateCommand();
    duplicateCommand.CommandText = """
        SELECT EXISTS (
            SELECT 1
            FROM Collections
            WHERE Lable = $label COLLATE NOCASE
              AND Id <> $id
        );
        """;
    duplicateCommand.Parameters.AddWithValue("$label", label);
    duplicateCommand.Parameters.AddWithValue("$id", id);
    var hasDuplicate = Convert.ToInt64(duplicateCommand.ExecuteScalar()) == 1;
    if (hasDuplicate)
    {
        return Results.Conflict(new { error = "Collection with this name already exists." });
    }

    using var command = connection.CreateCommand();
    command.CommandText = """
        UPDATE Collections
        SET Lable = $label, Description = $description, Cover = $cover
        WHERE Id = $id
          AND Lable <> 'Favorites';
        """;
    command.Parameters.AddWithValue("$label", label);
    command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
    command.Parameters.AddWithValue("$cover", cover ?? (object)DBNull.Value);
    command.Parameters.AddWithValue("$id", id);

    var affectedRows = command.ExecuteNonQuery();
    if (affectedRows == 0)
    {
        return Results.NotFound(new { error = "Collection not found." });
    }

    return Results.Ok(new
    {
        id,
        label,
        description,
        cover
    });
});

app.MapGet("/api/collections/{id:long}/media", (long id, int? page, int? pageSize) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid collection id." });
    }

    var mediaQueryService = app.ServiceProvider.GetRequiredService<MediaQueryService>();
    var pagedResult = mediaQueryService.GetPagedCollectionMedia(id, new PagedRequest(page, pageSize));
    return Results.Ok(pagedResult);
});

app.MapDelete("/api/collections/{id:long}", (long id) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid collection id." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var command = connection.CreateCommand();
    command.CommandText = """
        DELETE FROM Collections
        WHERE Id = $id
          AND Lable <> 'Favorites';
        """;
    command.Parameters.AddWithValue("$id", id);

    var affectedRows = command.ExecuteNonQuery();
    if (affectedRows == 0)
    {
        return Results.NotFound(new { error = "Collection not found." });
    }

    return Results.Ok(new { id });
});

app.MapPost("/api/collections/{id:long}/media", (long id, CollectionMediaAddRequest request) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid collection id." });
    }

    if (request.MediaId <= 0)
    {
        return Results.BadRequest(new { error = "Invalid media id." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var collectionExistsCommand = connection.CreateCommand();
    collectionExistsCommand.CommandText = """
        SELECT EXISTS (
            SELECT 1
            FROM Collections
            WHERE Id = $collectionId
        );
        """;
    collectionExistsCommand.Parameters.AddWithValue("$collectionId", id);
    var collectionExists = Convert.ToInt64(collectionExistsCommand.ExecuteScalar()) == 1;
    if (!collectionExists)
    {
        return Results.NotFound(new { error = "Collection not found." });
    }

    if (!MediaRecordExists(connection, request.MediaId))
    {
        return Results.BadRequest(new { error = "Media record not found." });
    }

    using var existsCommand = connection.CreateCommand();
    existsCommand.CommandText = """
        SELECT EXISTS (
            SELECT 1
            FROM CollectionsMedia
            WHERE CollectionId = $collectionId
              AND MediaId = $mediaId
        );
        """;
    existsCommand.Parameters.AddWithValue("$collectionId", id);
    existsCommand.Parameters.AddWithValue("$mediaId", request.MediaId);
    var alreadyIncluded = Convert.ToInt64(existsCommand.ExecuteScalar()) == 1;

    using var command = connection.CreateCommand();
    if (alreadyIncluded)
    {
        command.CommandText = """
            DELETE FROM CollectionsMedia
            WHERE CollectionId = $collectionId AND MediaId = $mediaId;
            """;
    }
    else
    {
        command.CommandText = """
            INSERT INTO CollectionsMedia (CollectionId, MediaId)
            VALUES ($collectionId, $mediaId);
            """;
    }
    command.Parameters.AddWithValue("$collectionId", id);
    command.Parameters.AddWithValue("$mediaId", request.MediaId);
    command.ExecuteNonQuery();

    return Results.Ok(new
    {
        collectionId = id,
        mediaId = request.MediaId,
        isIncluded = !alreadyIncluded
    });
});


        return app;
    }
}
