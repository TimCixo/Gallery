using GalleryApp.Api;
using GalleryApp.Api.Models.Requests;
using GalleryApp.Api.Services;
using GalleryApp.Api.Validation;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using static GalleryApp.Api.Services.LegacyHelpers;

namespace GalleryApp.Api.Endpoints;

public static class TagsEndpoints
{
    public static IEndpointRouteBuilder MapTagsEndpoints(this IEndpointRouteBuilder app)
    {
        var connectionString = app.ServiceProvider.GetRequiredService<string>();
        var mediaRootPath = app.ServiceProvider.GetRequiredService<MediaStorageOptions>().RootPath;

app.MapGet("/api/tag-types", () =>
{
    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT Id, Name, Color
        FROM TagTypes
        ORDER BY Id DESC;
        """;

    using var reader = command.ExecuteReader();
    var items = new List<object>();
    while (reader.Read())
    {
        items.Add(new
        {
            id = reader.GetInt64(0),
            name = reader.GetString(1),
            color = reader.GetString(2)
        });
    }

    return Results.Ok(new { items });
});

app.MapPost("/api/tag-types", (TagTypeCreateRequest request) =>
{
    var name = NormalizeOptionalText(request.Name);
    if (name is null)
    {
        return Results.BadRequest(new { error = "Name is required." });
    }

    var color = NormalizeOptionalText(request.Color)?.ToUpperInvariant();
    if (color is null || !ReusableValidation.IsValidHexColor(color))
    {
        return Results.BadRequest(new { error = "Color must be a valid hex code (#RRGGBB)." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO TagTypes (Name, Color)
        VALUES ($name, $color);

        SELECT last_insert_rowid();
        """;
    command.Parameters.AddWithValue("$name", name);
    command.Parameters.AddWithValue("$color", color);

    var createdId = Convert.ToInt64(command.ExecuteScalar());
    return Results.Ok(new
    {
        id = createdId,
        name,
        color
    });
});

app.MapPut("/api/tag-types/{id:long}", (long id, TagTypeUpdateRequest request) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid tag type id." });
    }

    var name = NormalizeOptionalText(request.Name);
    if (name is null)
    {
        return Results.BadRequest(new { error = "Name is required." });
    }

    var color = NormalizeOptionalText(request.Color)?.ToUpperInvariant();
    if (color is null || !ReusableValidation.IsValidHexColor(color))
    {
        return Results.BadRequest(new { error = "Color must be a valid hex code (#RRGGBB)." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var command = connection.CreateCommand();
    command.CommandText = """
        UPDATE TagTypes
        SET Name = $name, Color = $color
        WHERE Id = $id;
        """;
    command.Parameters.AddWithValue("$name", name);
    command.Parameters.AddWithValue("$color", color);
    command.Parameters.AddWithValue("$id", id);

    var affectedRows = command.ExecuteNonQuery();
    if (affectedRows == 0)
    {
        return Results.NotFound(new { error = "TagType not found." });
    }

    return Results.Ok(new
    {
        id,
        name,
        color
    });
});

app.MapGet("/api/tag-types/{id:long}/tags", (long id) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid tag type id." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT Id, Name, Description
        FROM Tags
        WHERE TagTypeId = $tagTypeId
        ORDER BY Name COLLATE NOCASE ASC, Id ASC;
        """;
    command.Parameters.AddWithValue("$tagTypeId", id);

    using var reader = command.ExecuteReader();
    var items = new List<object>();
    while (reader.Read())
    {
        items.Add(new
        {
            id = reader.GetInt64(0),
            name = reader.GetString(1),
            description = reader.IsDBNull(2) ? null : reader.GetString(2)
        });
    }

    return Results.Ok(new { items });
});

app.MapGet("/api/tags", () =>
{
    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT
            t.Id,
            t.Name,
            t.Description,
            tt.Id AS TagTypeId,
            tt.Name AS TagTypeName,
            tt.Color AS TagTypeColor
        FROM Tags t
        INNER JOIN TagTypes tt ON tt.Id = t.TagTypeId
        ORDER BY tt.Name COLLATE NOCASE ASC, t.Name COLLATE NOCASE ASC, t.Id ASC;
        """;

    using var reader = command.ExecuteReader();
    var items = new List<object>();
    while (reader.Read())
    {
        items.Add(new
        {
            id = reader.GetInt64(0),
            name = reader.GetString(1),
            description = reader.IsDBNull(2) ? null : reader.GetString(2),
            tagTypeId = reader.GetInt64(3),
            tagTypeName = reader.GetString(4),
            tagTypeColor = reader.GetString(5)
        });
    }

    return Results.Ok(new { items });
});

app.MapPost("/api/tag-types/{id:long}/tags", (long id, TagCreateRequest request) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid tag type id." });
    }

    var name = NormalizeOptionalText(request.Name);
    if (name is null)
    {
        return Results.BadRequest(new { error = "Tag name is required." });
    }

    var description = NormalizeOptionalText(request.Description);

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var checkCommand = connection.CreateCommand();
    checkCommand.CommandText = """
        SELECT EXISTS (
            SELECT 1
            FROM TagTypes
            WHERE Id = $tagTypeId
        );
        """;
    checkCommand.Parameters.AddWithValue("$tagTypeId", id);
    var tagTypeExists = Convert.ToInt64(checkCommand.ExecuteScalar()) == 1;
    if (!tagTypeExists)
    {
        return Results.NotFound(new { error = "TagType not found." });
    }

    using var duplicateCommand = connection.CreateCommand();
    duplicateCommand.CommandText = """
        SELECT EXISTS (
            SELECT 1
            FROM Tags
            WHERE TagTypeId = $tagTypeId
              AND Name = $name COLLATE NOCASE
        );
        """;
    duplicateCommand.Parameters.AddWithValue("$tagTypeId", id);
    duplicateCommand.Parameters.AddWithValue("$name", name);
    var hasDuplicate = Convert.ToInt64(duplicateCommand.ExecuteScalar()) == 1;
    if (hasDuplicate)
    {
        return Results.Conflict(new { error = "Tag with this name already exists in this category." });
    }

    using var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO Tags (Name, Description, TagTypeId)
        VALUES ($name, $description, $tagTypeId);

        SELECT last_insert_rowid();
        """;
    command.Parameters.AddWithValue("$name", name);
    command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
    command.Parameters.AddWithValue("$tagTypeId", id);

    var createdId = Convert.ToInt64(command.ExecuteScalar());
    return Results.Ok(new
    {
        id = createdId,
        name,
        description,
        tagTypeId = id
    });
});

app.MapPut("/api/tags/{id:long}", (long id, TagUpdateRequest request) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid tag id." });
    }

    var name = NormalizeOptionalText(request.Name);
    if (name is null)
    {
        return Results.BadRequest(new { error = "Tag name is required." });
    }

    var description = NormalizeOptionalText(request.Description);

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var duplicateCommand = connection.CreateCommand();
    duplicateCommand.CommandText = """
        SELECT EXISTS (
            SELECT 1
            FROM Tags
            WHERE TagTypeId = (
                    SELECT TagTypeId
                    FROM Tags
                    WHERE Id = $id
                )
              AND Name = $name COLLATE NOCASE
              AND Id <> $id
        );
        """;
    duplicateCommand.Parameters.AddWithValue("$name", name);
    duplicateCommand.Parameters.AddWithValue("$id", id);
    var hasDuplicate = Convert.ToInt64(duplicateCommand.ExecuteScalar()) == 1;
    if (hasDuplicate)
    {
        return Results.Conflict(new { error = "Tag with this name already exists in this category." });
    }

    using var command = connection.CreateCommand();
    command.CommandText = """
        UPDATE Tags
        SET Name = $name, Description = $description
        WHERE Id = $id;
        """;
    command.Parameters.AddWithValue("$name", name);
    command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
    command.Parameters.AddWithValue("$id", id);

    var affectedRows = command.ExecuteNonQuery();
    if (affectedRows == 0)
    {
        return Results.NotFound(new { error = "Tag not found." });
    }

    return Results.Ok(new
    {
        id,
        name,
        description
    });
});

app.MapDelete("/api/tags/{id:long}", (long id) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid tag id." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var command = connection.CreateCommand();
    command.CommandText = """
        DELETE FROM Tags
        WHERE Id = $id;
        """;
    command.Parameters.AddWithValue("$id", id);

    var affectedRows = command.ExecuteNonQuery();
    if (affectedRows == 0)
    {
        return Results.NotFound(new { error = "Tag not found." });
    }

    return Results.Ok(new { id });
});

app.MapDelete("/api/tag-types/{id:long}", (long id) =>
{
    if (id <= 0)
    {
        return Results.BadRequest(new { error = "Invalid tag type id." });
    }

    using var connection = new SqliteConnection(connectionString);
    connection.Open();

    using var transaction = connection.BeginTransaction();
    using var command = connection.CreateCommand();
    command.Transaction = transaction;
    command.CommandText = """
        DELETE FROM MediaTags
        WHERE TagId IN (
            SELECT Id
            FROM Tags
            WHERE TagTypeId = $id
        );

        DELETE FROM Tags
        WHERE TagTypeId = $id;

        DELETE FROM TagTypes
        WHERE Id = $id;
        """;
    command.Parameters.AddWithValue("$id", id);

    var affectedRows = command.ExecuteNonQuery();
    if (affectedRows == 0)
    {
        transaction.Rollback();
        return Results.NotFound(new { error = "TagType not found." });
    }

    transaction.Commit();
    return Results.Ok(new { id });
});


        return app;
    }
}
