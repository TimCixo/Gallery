using System.ComponentModel;
using System.Diagnostics;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
using System.Text.RegularExpressions;

namespace GalleryApp.Api;

public class Program
{
    private static readonly Regex HexColorRegex = new("^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);

    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.WebHost.ConfigureKestrel(options =>
        {
            options.Limits.MaxRequestBodySize = null;
        });
        builder.Services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = long.MaxValue;
        });

        var dbPath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "gallery.db");
        Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
        var mediaRootPath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "Media");
        Directory.CreateDirectory(mediaRootPath);

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath
        }.ToString();

        builder.Services.AddSingleton(connectionString);
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy
                    .WithOrigins("http://localhost:5173")
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        var app = builder.Build();

        EnsureDatabase(app.Services);

        app.UseCors("Frontend");
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(mediaRootPath),
            RequestPath = "/media"
        });

        app.MapGet("/api/health", () =>
            Results.Ok(new
            {
                status = "ok",
                timestampUtc = DateTime.UtcNow
            }));

        app.MapGet("/api/media", (int? page, int? pageSize, string? search) =>
        {
            var normalizedPageSize = Math.Clamp(pageSize ?? 36, 1, 100);
            var normalizedPage = Math.Max(page ?? 1, 1);
            var searchCriteria = ParseMediaSearchCriteria(search);
            var allFiles = LoadMediaItems(connectionString, mediaRootPath, searchCriteria, favoritesOnly: false);

            var totalCount = allFiles.Count;
            var totalPages = totalCount == 0
                ? 0
                : (int)Math.Ceiling(totalCount / (double)normalizedPageSize);
            var effectivePage = totalPages == 0
                ? 1
                : Math.Min(normalizedPage, totalPages);
            var skip = totalPages == 0 ? 0 : (effectivePage - 1) * normalizedPageSize;
            var files = allFiles
                .Skip(skip)
                .Take(normalizedPageSize)
                .ToArray();

            return Results.Ok(new
            {
                page = effectivePage,
                pageSize = normalizedPageSize,
                totalCount,
                totalPages,
                files
            });
        });

        app.MapGet("/api/favorites", (int? page, int? pageSize) =>
        {
            var normalizedPageSize = Math.Clamp(pageSize ?? 36, 1, 100);
            var normalizedPage = Math.Max(page ?? 1, 1);
            var allFiles = LoadMediaItems(connectionString, mediaRootPath, criteria: null, favoritesOnly: true);

            var totalCount = allFiles.Count;
            var totalPages = totalCount == 0
                ? 0
                : (int)Math.Ceiling(totalCount / (double)normalizedPageSize);
            var effectivePage = totalPages == 0
                ? 1
                : Math.Min(normalizedPage, totalPages);
            var skip = totalPages == 0 ? 0 : (effectivePage - 1) * normalizedPageSize;
            var files = allFiles
                .Skip(skip)
                .Take(normalizedPageSize)
                .ToArray();

            return Results.Ok(new
            {
                page = effectivePage,
                pageSize = normalizedPageSize,
                totalCount,
                totalPages,
                files
            });
        });

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

            var normalizedPageSize = Math.Clamp(pageSize ?? 36, 1, 100);
            var normalizedPage = Math.Max(page ?? 1, 1);
            var allFiles = LoadCollectionMediaItems(connectionString, mediaRootPath, id);

            var totalCount = allFiles.Count;
            var totalPages = totalCount == 0
                ? 0
                : (int)Math.Ceiling(totalCount / (double)normalizedPageSize);
            var effectivePage = totalPages == 0
                ? 1
                : Math.Min(normalizedPage, totalPages);
            var skip = totalPages == 0 ? 0 : (effectivePage - 1) * normalizedPageSize;
            var files = allFiles
                .Skip(skip)
                .Take(normalizedPageSize)
                .ToArray();

            return Results.Ok(new
            {
                page = effectivePage,
                pageSize = normalizedPageSize,
                totalCount,
                totalPages,
                files
            });
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
            if (color is null || !HexColorRegex.IsMatch(color))
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
            if (color is null || !HexColorRegex.IsMatch(color))
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
                    WHERE Name = $name COLLATE NOCASE
                );
                """;
            duplicateCommand.Parameters.AddWithValue("$name", name);
            var hasDuplicate = Convert.ToInt64(duplicateCommand.ExecuteScalar()) == 1;
            if (hasDuplicate)
            {
                return Results.Conflict(new { error = "Tag with this name already exists." });
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
                    WHERE Name = $name COLLATE NOCASE
                      AND Id <> $id
                );
                """;
            duplicateCommand.Parameters.AddWithValue("$name", name);
            duplicateCommand.Parameters.AddWithValue("$id", id);
            var hasDuplicate = Convert.ToInt64(duplicateCommand.ExecuteScalar()) == 1;
            if (hasDuplicate)
            {
                return Results.Conflict(new { error = "Tag with this name already exists." });
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

        app.MapGet("/api/media/preview", (string path) =>
        {
            if (!TryResolveMediaFilePath(mediaRootPath, path, out var absolutePath, out var extension))
            {
                return Results.NotFound(new { error = "Media file not found." });
            }

            try
            {
                if (IsVideoFile(extension))
                {
                    var bytes = GenerateVideoPreviewJpeg(absolutePath);
                    return Results.File(bytes, "image/jpeg");
                }

                if (IsGifFile(extension))
                {
                    var bytes = GenerateGifPreviewJpeg(absolutePath);
                    return Results.File(bytes, "image/jpeg");
                }
            }
            catch (MediaConversionException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }

            return Results.NotFound(new { error = "Preview is supported only for video and gif files." });
        });

        app.MapPut("/api/media/{id:long}", (long id, MediaUpdateRequest request) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid media id." });
            }

            var title = NormalizeOptionalText(request.Title);
            var description = NormalizeOptionalText(request.Description);
            var source = NormalizeOptionalText(request.Source);
            var parent = request.Parent;
            var child = request.Child;
            var normalizedTagIds = request.TagIds?
                .Where(tagId => tagId > 0)
                .Distinct()
                .ToArray();

            if (source is not null && !IsValidHttpUrl(source))
            {
                return Results.BadRequest(new { error = "Source must be a valid absolute http/https URL." });
            }

            if (parent.HasValue && parent.Value <= 0)
            {
                return Results.BadRequest(new { error = "Parent must be a positive id." });
            }

            if (child.HasValue && child.Value <= 0)
            {
                return Results.BadRequest(new { error = "Child must be a positive id." });
            }

            if (parent == id || child == id)
            {
                return Results.BadRequest(new { error = "Parent and Child cannot reference the same media item." });
            }

            using var connection = new SqliteConnection(connectionString);
            connection.Open();

            if (!MediaRecordExists(connection, id))
            {
                return Results.NotFound(new { error = "Media record not found." });
            }

            if (parent.HasValue && !MediaRecordExists(connection, parent.Value))
            {
                return Results.BadRequest(new { error = "Parent media id was not found." });
            }

            if (child.HasValue && !MediaRecordExists(connection, child.Value))
            {
                return Results.BadRequest(new { error = "Child media id was not found." });
            }

            var currentLinks = GetMediaLinks(connection, id);
            if (currentLinks is null)
            {
                return Results.NotFound(new { error = "Media record not found." });
            }
            var previousParent = currentLinks.Value.Parent;
            var previousChild = currentLinks.Value.Child;

            if (normalizedTagIds is not null && normalizedTagIds.Length > 0)
            {
                using var tagExistsCommand = connection.CreateCommand();
                var tagIdParams = new List<string>();
                for (var i = 0; i < normalizedTagIds.Length; i++)
                {
                    var parameterName = $"$tagId{i}";
                    tagIdParams.Add(parameterName);
                    tagExistsCommand.Parameters.AddWithValue(parameterName, normalizedTagIds[i]);
                }

                tagExistsCommand.CommandText = $"""
                    SELECT COUNT(*)
                    FROM Tags
                    WHERE Id IN ({string.Join(", ", tagIdParams)});
                    """;

                var existingTagCount = Convert.ToInt32(tagExistsCommand.ExecuteScalar());
                if (existingTagCount != normalizedTagIds.Length)
                {
                    return Results.BadRequest(new { error = "One or more tags were not found." });
                }
            }

            using var transaction = connection.BeginTransaction();
            using (var command = connection.CreateCommand())
            {
                command.Transaction = transaction;
                command.CommandText = """
                    UPDATE Media
                    SET
                        Title = $title,
                        Description = $description,
                        Source = $source,
                        Parent = $parent,
                        Child = $child
                    WHERE Id = $id;
                    """;
                command.Parameters.AddWithValue("$title", title ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("$source", source ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("$parent", parent ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("$child", child ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("$id", id);
                command.ExecuteNonQuery();
            }

            if (previousParent.HasValue && previousParent.Value != parent)
            {
                using var clearOldParentReverse = connection.CreateCommand();
                clearOldParentReverse.Transaction = transaction;
                clearOldParentReverse.CommandText = """
                    UPDATE Media
                    SET Child = NULL
                    WHERE Id = $oldParentId AND Child = $mediaId;
                    """;
                clearOldParentReverse.Parameters.AddWithValue("$oldParentId", previousParent.Value);
                clearOldParentReverse.Parameters.AddWithValue("$mediaId", id);
                clearOldParentReverse.ExecuteNonQuery();
            }

            if (previousChild.HasValue && previousChild.Value != child)
            {
                using var clearOldChildReverse = connection.CreateCommand();
                clearOldChildReverse.Transaction = transaction;
                clearOldChildReverse.CommandText = """
                    UPDATE Media
                    SET Parent = NULL
                    WHERE Id = $oldChildId AND Parent = $mediaId;
                    """;
                clearOldChildReverse.Parameters.AddWithValue("$oldChildId", previousChild.Value);
                clearOldChildReverse.Parameters.AddWithValue("$mediaId", id);
                clearOldChildReverse.ExecuteNonQuery();
            }

            if (parent.HasValue)
            {
                var parentLinks = GetMediaLinks(connection, parent.Value, transaction);
                var parentPreviousChild = parentLinks?.Child;

                using var setParentReverse = connection.CreateCommand();
                setParentReverse.Transaction = transaction;
                setParentReverse.CommandText = """
                    UPDATE Media
                    SET Child = $mediaId
                    WHERE Id = $parentId;
                    """;
                setParentReverse.Parameters.AddWithValue("$mediaId", id);
                setParentReverse.Parameters.AddWithValue("$parentId", parent.Value);
                setParentReverse.ExecuteNonQuery();

                if (parentPreviousChild.HasValue && parentPreviousChild.Value != id)
                {
                    using var clearConflictedChildParent = connection.CreateCommand();
                    clearConflictedChildParent.Transaction = transaction;
                    clearConflictedChildParent.CommandText = """
                        UPDATE Media
                        SET Parent = NULL
                        WHERE Id = $oldChildId AND Parent = $parentId;
                        """;
                    clearConflictedChildParent.Parameters.AddWithValue("$oldChildId", parentPreviousChild.Value);
                    clearConflictedChildParent.Parameters.AddWithValue("$parentId", parent.Value);
                    clearConflictedChildParent.ExecuteNonQuery();
                }
            }

            if (child.HasValue)
            {
                var childLinks = GetMediaLinks(connection, child.Value, transaction);
                var childPreviousParent = childLinks?.Parent;

                using var setChildReverse = connection.CreateCommand();
                setChildReverse.Transaction = transaction;
                setChildReverse.CommandText = """
                    UPDATE Media
                    SET Parent = $mediaId
                    WHERE Id = $childId;
                    """;
                setChildReverse.Parameters.AddWithValue("$mediaId", id);
                setChildReverse.Parameters.AddWithValue("$childId", child.Value);
                setChildReverse.ExecuteNonQuery();

                if (childPreviousParent.HasValue && childPreviousParent.Value != id)
                {
                    using var clearConflictedParentChild = connection.CreateCommand();
                    clearConflictedParentChild.Transaction = transaction;
                    clearConflictedParentChild.CommandText = """
                        UPDATE Media
                        SET Child = NULL
                        WHERE Id = $oldParentId AND Child = $childId;
                        """;
                    clearConflictedParentChild.Parameters.AddWithValue("$oldParentId", childPreviousParent.Value);
                    clearConflictedParentChild.Parameters.AddWithValue("$childId", child.Value);
                    clearConflictedParentChild.ExecuteNonQuery();
                }
            }

            if (normalizedTagIds is not null)
            {
                using (var deleteTagsCommand = connection.CreateCommand())
                {
                    deleteTagsCommand.Transaction = transaction;
                    deleteTagsCommand.CommandText = """
                        DELETE FROM MediaTags
                        WHERE MediaId = $mediaId;
                        """;
                    deleteTagsCommand.Parameters.AddWithValue("$mediaId", id);
                    deleteTagsCommand.ExecuteNonQuery();
                }

                foreach (var tagId in normalizedTagIds)
                {
                    using var insertTagCommand = connection.CreateCommand();
                    insertTagCommand.Transaction = transaction;
                    insertTagCommand.CommandText = """
                        INSERT INTO MediaTags (MediaId, TagId)
                        VALUES ($mediaId, $tagId);
                        """;
                    insertTagCommand.Parameters.AddWithValue("$mediaId", id);
                    insertTagCommand.Parameters.AddWithValue("$tagId", tagId);
                    insertTagCommand.ExecuteNonQuery();
                }
            }

            transaction.Commit();
            return Results.Ok(new
            {
                id,
                title,
                description,
                source,
                parent,
                child
            });
        });

        app.MapPut("/api/media/{id:long}/favorite", (long id, FavoriteUpdateRequest request) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid media id." });
            }

            using var connection = new SqliteConnection(connectionString);
            connection.Open();

            if (!MediaRecordExists(connection, id))
            {
                return Results.NotFound(new { error = "Media record not found." });
            }

            var favoritesCollectionId = EnsureFavoritesCollection(connection);

            using var command = connection.CreateCommand();
            if (request.IsFavorite)
            {
                command.CommandText = """
                    INSERT OR IGNORE INTO CollectionsMedia (CollectionId, MediaId)
                    VALUES ($collectionId, $mediaId);
                    """;
            }
            else
            {
                command.CommandText = """
                    DELETE FROM CollectionsMedia
                    WHERE CollectionId = $collectionId AND MediaId = $mediaId;
                    """;
            }

            command.Parameters.AddWithValue("$collectionId", favoritesCollectionId);
            command.Parameters.AddWithValue("$mediaId", id);
            command.ExecuteNonQuery();

            return Results.Ok(new
            {
                id,
                isFavorite = request.IsFavorite
            });
        });

        app.MapDelete("/api/media/{id:long}", (long id) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid media id." });
            }

            using var connection = new SqliteConnection(connectionString);
            connection.Open();

            using var pathCommand = connection.CreateCommand();
            pathCommand.CommandText = """
                SELECT Path
                FROM Media
                WHERE Id = $id;
                """;
            pathCommand.Parameters.AddWithValue("$id", id);
            var rawPath = pathCommand.ExecuteScalar() as string;
            if (string.IsNullOrWhiteSpace(rawPath))
            {
                return Results.NotFound(new { error = "Media record not found." });
            }

            var normalizedRelativePath = rawPath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
            var rootPath = Path.GetFullPath(mediaRootPath + Path.DirectorySeparatorChar);
            var absolutePath = Path.GetFullPath(Path.Combine(mediaRootPath, normalizedRelativePath));
            if (!absolutePath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest(new { error = "Stored media path is invalid." });
            }

            if (File.Exists(absolutePath))
            {
                try
                {
                    File.Delete(absolutePath);
                }
                catch (IOException ex)
                {
                    return Results.Problem($"Failed to delete file: {ex.Message}");
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Problem($"Failed to delete file: {ex.Message}");
                }
            }

            using var transaction = connection.BeginTransaction();
            using var deleteCommand = connection.CreateCommand();
            deleteCommand.Transaction = transaction;
            deleteCommand.CommandText = """
                UPDATE Media SET Parent = NULL WHERE Parent = $id;
                UPDATE Media SET Child = NULL WHERE Child = $id;
                DELETE FROM CollectionsMedia WHERE MediaId = $id;
                DELETE FROM Media WHERE Id = $id;
                """;
            deleteCommand.Parameters.AddWithValue("$id", id);
            deleteCommand.ExecuteNonQuery();
            transaction.Commit();

            return Results.Ok(new { id });
        });

        var uploadEndpoint = app.MapPost("/api/upload", async (HttpRequest request) =>
        {
            var maxRequestBodySizeFeature = request.HttpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();
            if (maxRequestBodySizeFeature is not null && !maxRequestBodySizeFeature.IsReadOnly)
            {
                maxRequestBodySizeFeature.MaxRequestBodySize = null;
            }

            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new { error = "Content type must be multipart/form-data." });
            }

            var form = await request.ReadFormAsync();
            if (form.Files.Count == 0)
            {
                return Results.BadRequest(new { error = "No files were provided." });
            }

            var uploadDate = DateTime.UtcNow;
            var dateFolderName = uploadDate.ToString("yyyy-MM-dd");
            var targetDirectory = Path.Combine(mediaRootPath, dateFolderName);
            Directory.CreateDirectory(targetDirectory);

            var savedFiles = new List<object>();
            await using var dbConnection = new SqliteConnection(connectionString);
            await dbConnection.OpenAsync();

            foreach (var file in form.Files)
            {
                if (file.Length == 0)
                {
                    continue;
                }

                var safeOriginalName = Path.GetFileName(file.FileName);
                if (!IsAllowedMediaFile(safeOriginalName))
                {
                    return Results.BadRequest(new { error = $"Unsupported file type: {safeOriginalName}" });
                }

                var extension = Path.GetExtension(safeOriginalName).ToLowerInvariant();
                string uniqueName;
                string destinationPath;
                long mediaId = 0;
                string relativePath;

                try
                {
                    mediaId = CreatePendingMediaRecord(dbConnection);

                    if (IsGifFile(extension))
                    {
                        uniqueName = $"{mediaId}{extension}";
                        destinationPath = Path.Combine(targetDirectory, uniqueName);

                        await using var stream = File.Create(destinationPath);
                        await file.CopyToAsync(stream);
                    }
                    else if (IsImageFile(extension))
                    {
                        uniqueName = $"{mediaId}.webp";
                        destinationPath = Path.Combine(targetDirectory, uniqueName);

                        await ConvertImageToWebpAsync(file, destinationPath);
                    }
                    else if (IsVideoFile(extension))
                    {
                        uniqueName = $"{mediaId}.mp4";
                        destinationPath = Path.Combine(targetDirectory, uniqueName);

                        await ConvertVideoToMp4Async(file, destinationPath, extension);
                    }
                    else
                    {
                        return Results.BadRequest(new { error = $"Unsupported file type: {safeOriginalName}" });
                    }

                    relativePath = Path.Combine(dateFolderName, uniqueName).Replace("\\", "/");
                    UpdateMediaPath(dbConnection, mediaId, relativePath);
                }
                catch (MediaConversionException ex)
                {
                    if (mediaId > 0)
                    {
                        DeleteMediaRecord(dbConnection, mediaId);
                    }

                    return Results.BadRequest(new { error = ex.Message });
                }

                savedFiles.Add(new
                {
                    id = mediaId,
                    originalName = safeOriginalName,
                    storedName = uniqueName,
                    relativePath
                });
            }

            return Results.Ok(new
            {
                uploadedAtUtc = uploadDate,
                dateFolder = dateFolderName,
                files = savedFiles
            });
        });
        uploadEndpoint.WithMetadata(new RequestFormLimitsAttribute
        {
            MultipartBodyLengthLimit = long.MaxValue
        });

        app.Run();
    }

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".mp4",
        ".webm",
        ".mov",
        ".avi",
        ".mkv",
        ".m4v"
    };
    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp"
    };
    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4",
        ".webm",
        ".mov",
        ".avi",
        ".mkv",
        ".m4v"
    };
    private static void EnsureDatabase(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var connectionString = scope.ServiceProvider.GetRequiredService<string>();

        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS AppInfo (
                Id INTEGER PRIMARY KEY CHECK (Id = 1),
                Name TEXT NOT NULL,
                CreatedAtUtc TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Media (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Path TEXT NOT NULL,
                Title TEXT NULL,
                Description TEXT NULL,
                Source TEXT NULL,
                Parent INTEGER NULL,
                Child INTEGER NULL,
                FOREIGN KEY (Parent) REFERENCES Media(Id),
                FOREIGN KEY (Child) REFERENCES Media(Id)
            );

            CREATE TABLE IF NOT EXISTS Collections (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Lable TEXT NOT NULL,
                Description TEXT NULL,
                Cover INTEGER NULL,
                FOREIGN KEY (Cover) REFERENCES Media(Id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS CollectionsMedia (
                CollectionId INTEGER NOT NULL,
                MediaId INTEGER NOT NULL,
                PRIMARY KEY (CollectionId, MediaId),
                FOREIGN KEY (CollectionId) REFERENCES Collections(Id) ON DELETE CASCADE,
                FOREIGN KEY (MediaId) REFERENCES Media(Id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS TagTypes (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Color TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Tags (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Description TEXT NULL,
                TagTypeId INTEGER NOT NULL,
                FOREIGN KEY (TagTypeId) REFERENCES TagTypes(Id) ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS MediaTags (
                MediaId INTEGER NOT NULL,
                TagId INTEGER NOT NULL,
                PRIMARY KEY (MediaId, TagId),
                FOREIGN KEY (MediaId) REFERENCES Media(Id) ON DELETE CASCADE,
                FOREIGN KEY (TagId) REFERENCES Tags(Id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS IX_Media_Parent ON Media(Parent);
            CREATE INDEX IF NOT EXISTS IX_Media_Child ON Media(Child);
            CREATE INDEX IF NOT EXISTS IX_Collections_Cover ON Collections(Cover);
            CREATE INDEX IF NOT EXISTS IX_Collections_Lable ON Collections(Lable);
            CREATE INDEX IF NOT EXISTS IX_CollectionsMedia_CollectionId ON CollectionsMedia(CollectionId);
            CREATE INDEX IF NOT EXISTS IX_CollectionsMedia_MediaId ON CollectionsMedia(MediaId);
            CREATE INDEX IF NOT EXISTS IX_Tags_TagTypeId ON Tags(TagTypeId);
            CREATE INDEX IF NOT EXISTS IX_MediaTags_MediaId ON MediaTags(MediaId);
            CREATE INDEX IF NOT EXISTS IX_MediaTags_TagId ON MediaTags(TagId);

            INSERT INTO Collections (Lable, Description, Cover)
            SELECT 'Favorites', NULL, NULL
            WHERE NOT EXISTS (
                SELECT 1
                FROM Collections
                WHERE Lable = 'Favorites'
            );

            INSERT INTO AppInfo (Id, Name, CreatedAtUtc)
            VALUES (1, 'GalleryApp', CURRENT_TIMESTAMP)
            ON CONFLICT(Id) DO NOTHING;
            """;
        command.ExecuteNonQuery();
    }

    private static bool IsAllowedMediaFile(string fileName)
    {
        var extension = Path.GetExtension(fileName);
        return !string.IsNullOrWhiteSpace(extension) && AllowedExtensions.Contains(extension);
    }

    private static bool IsImageFile(string extension) => ImageExtensions.Contains(extension);

    private static bool IsVideoFile(string extension) => VideoExtensions.Contains(extension);

    private static bool IsGifFile(string extension) => extension.Equals(".gif", StringComparison.OrdinalIgnoreCase);

    private static string BuildMediaUrl(string relativePath)
    {
        return $"/media/{Uri.EscapeDataString(relativePath).Replace("%2F", "/")}";
    }

    private static string BuildTileUrl(string relativePath, string extension, long modifiedTicks)
    {
        if (IsVideoFile(extension) || IsGifFile(extension))
        {
            return $"/api/media/preview?path={Uri.EscapeDataString(relativePath)}&v={modifiedTicks}";
        }

        return BuildMediaUrl(relativePath);
    }

    private static bool TryResolveMediaFilePath(
        string mediaRootPath,
        string relativePath,
        out string absolutePath,
        out string extension)
    {
        absolutePath = string.Empty;
        extension = string.Empty;

        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return false;
        }

        var normalizedRelativePath = relativePath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        var rootPath = Path.GetFullPath(mediaRootPath + Path.DirectorySeparatorChar);
        var candidatePath = Path.GetFullPath(Path.Combine(mediaRootPath, normalizedRelativePath));

        if (!candidatePath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!File.Exists(candidatePath) || !IsAllowedMediaFile(candidatePath))
        {
            return false;
        }

        absolutePath = candidatePath;
        extension = Path.GetExtension(candidatePath).ToLowerInvariant();
        return true;
    }

    private static string BuildUniqueFileName(string directoryPath, string originalName)
    {
        var baseName = Path.GetFileNameWithoutExtension(originalName);
        var extension = Path.GetExtension(originalName);

        if (string.IsNullOrWhiteSpace(baseName))
        {
            baseName = "file";
        }

        var safeBaseName = SanitizeFileName(baseName);
        var candidate = $"{safeBaseName}{extension}";
        var counter = 1;

        while (File.Exists(Path.Combine(directoryPath, candidate)))
        {
            candidate = $"{safeBaseName}_{counter}{extension}";
            counter++;
        }

        return candidate;
    }

    private static string SanitizeFileName(string value)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var cleaned = new string(value.Select(ch => invalidChars.Contains(ch) ? '_' : ch).ToArray()).Trim();

        return string.IsNullOrWhiteSpace(cleaned) ? "file" : cleaned;
    }

    private static async Task ConvertImageToWebpAsync(IFormFile file, string destinationPath)
    {
        await using var inputStream = file.OpenReadStream();

        try
        {
            using var image = await Image.LoadAsync(inputStream);
            await image.SaveAsync(destinationPath, new WebpEncoder { Quality = 85 });
        }
        catch (UnknownImageFormatException)
        {
            throw new MediaConversionException($"Unsupported image content: {file.FileName}");
        }
    }

    private static async Task ConvertVideoToMp4Async(IFormFile file, string destinationPath, string sourceExtension)
    {
        if (sourceExtension.Equals(".mp4", StringComparison.OrdinalIgnoreCase))
        {
            await using var stream = File.Create(destinationPath);
            await file.CopyToAsync(stream);
            return;
        }

        var tempInputPath = Path.Combine(Path.GetTempPath(), $"gallery-upload-{Guid.NewGuid()}{sourceExtension}");

        try
        {
            await using (var tempInputStream = File.Create(tempInputPath))
            {
                await file.CopyToAsync(tempInputStream);
            }

            var processStartInfo = new ProcessStartInfo
            {
                FileName = ResolveFfmpegExecutable(),
                Arguments = $"-y -i \"{tempInputPath}\" -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart \"{destinationPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = processStartInfo };
            try
            {
                process.Start();
            }
            catch (Win32Exception)
            {
                throw new MediaConversionException("Video conversion requires ffmpeg available in PATH or FFMPEG_PATH.");
            }

            var stdOutTask = process.StandardOutput.ReadToEndAsync();
            var stdErrTask = process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();
            _ = await stdOutTask;
            var stdErr = await stdErrTask;

            if (process.ExitCode != 0)
            {
                if (File.Exists(destinationPath))
                {
                    File.Delete(destinationPath);
                }

                var details = FirstNonEmptyLine(stdErr);
                throw new MediaConversionException(string.IsNullOrWhiteSpace(details)
                    ? $"Video conversion failed: {file.FileName}"
                    : $"Video conversion failed: {file.FileName}. {details}");
            }
        }
        finally
        {
            if (File.Exists(tempInputPath))
            {
                File.Delete(tempInputPath);
            }
        }
    }

    private static byte[] GenerateGifPreviewJpeg(string sourcePath)
    {
        try
        {
            using var image = Image.Load(sourcePath);
            while (image.Frames.Count > 1)
            {
                image.Frames.RemoveFrame(image.Frames.Count - 1);
            }

            using var stream = new MemoryStream();
            image.Save(stream, new JpegEncoder { Quality = 85 });
            return stream.ToArray();
        }
        catch (UnknownImageFormatException)
        {
            throw new MediaConversionException($"Unsupported image content: {Path.GetFileName(sourcePath)}");
        }
    }

    private static byte[] GenerateVideoPreviewJpeg(string sourcePath)
    {
        try
        {
            var tempPreviewPath = Path.Combine(Path.GetTempPath(), $"gallery-preview-{Guid.NewGuid()}.jpg");
            try
            {
                var processStartInfo = new ProcessStartInfo
                {
                    FileName = ResolveFfmpegExecutable(),
                    Arguments = $"-y -ss 00:00:00.500 -i \"{sourcePath}\" -frames:v 1 -q:v 3 -vf \"scale=640:-1\" \"{tempPreviewPath}\"",
                    RedirectStandardOutput = false,
                    RedirectStandardError = false,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = new Process { StartInfo = processStartInfo };
                try
                {
                    process.Start();
                }
                catch (Win32Exception)
                {
                    throw new MediaConversionException("Video preview requires ffmpeg available in PATH or FFMPEG_PATH.");
                }

                if (!process.WaitForExit(15000))
                {
                    try
                    {
                        process.Kill(entireProcessTree: true);
                    }
                    catch
                    {
                    }

                    throw new MediaConversionException($"Preview generation timed out: {Path.GetFileName(sourcePath)}");
                }

                if (process.ExitCode != 0 || !File.Exists(tempPreviewPath))
                {
                    throw new MediaConversionException($"Preview generation failed: {Path.GetFileName(sourcePath)}");
                }

        return File.ReadAllBytes(tempPreviewPath);
            }
            finally
            {
                if (File.Exists(tempPreviewPath))
                {
                    File.Delete(tempPreviewPath);
                }
            }
        }
        catch (IOException ex)
        {
            throw new MediaConversionException($"Preview generation failed: {Path.GetFileName(sourcePath)}. {ex.Message}");
        }
    }

    private static string FirstNonEmptyLine(string value)
    {
        return value
            .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .FirstOrDefault(line => !string.IsNullOrWhiteSpace(line))
            ?? string.Empty;
    }

    private static string ResolveFfmpegExecutable()
    {
        var configuredPath = Environment.GetEnvironmentVariable("FFMPEG_PATH");
        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            return configuredPath;
        }

        return "ffmpeg";
    }

    private static long CreatePendingMediaRecord(SqliteConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO Media (Path, Title, Description, Source, Parent, Child)
            VALUES ($path, NULL, NULL, NULL, NULL, NULL);

            SELECT last_insert_rowid();
            """;
        command.Parameters.AddWithValue("$path", "__pending__");

        return Convert.ToInt64(command.ExecuteScalar());
    }

    private static void UpdateMediaPath(SqliteConnection connection, long mediaId, string relativePath)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE Media
            SET Path = $path
            WHERE Id = $id;
            """;
        command.Parameters.AddWithValue("$path", relativePath);
        command.Parameters.AddWithValue("$id", mediaId);
        command.ExecuteNonQuery();
    }

    private static void DeleteMediaRecord(SqliteConnection connection, long mediaId)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            DELETE FROM Media
            WHERE Id = $id;
            """;
        command.Parameters.AddWithValue("$id", mediaId);
        command.ExecuteNonQuery();
    }

    private static bool MediaRecordExists(SqliteConnection connection, long id)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM Media
                WHERE Id = $id
            );
            """;
        command.Parameters.AddWithValue("$id", id);
        var result = command.ExecuteScalar();
        return Convert.ToInt64(result) == 1;
    }

    private static (long? Parent, long? Child)? GetMediaLinks(
        SqliteConnection connection,
        long mediaId,
        SqliteTransaction? transaction = null)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT Parent, Child
            FROM Media
            WHERE Id = $id;
            """;
        command.Parameters.AddWithValue("$id", mediaId);

        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        var parent = reader.IsDBNull(0) ? (long?)null : reader.GetInt64(0);
        var child = reader.IsDBNull(1) ? (long?)null : reader.GetInt64(1);
        return (parent, child);
    }

    private static long EnsureFavoritesCollection(SqliteConnection connection)
    {
        using var findCommand = connection.CreateCommand();
        findCommand.CommandText = """
            SELECT Id
            FROM Collections
            WHERE Lable = 'Favorites'
            ORDER BY Id
            LIMIT 1;
            """;

        var existingId = findCommand.ExecuteScalar();
        if (existingId is not null && existingId != DBNull.Value)
        {
            return Convert.ToInt64(existingId);
        }

        using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO Collections (Lable, Description, Cover)
            VALUES ('Favorites', NULL, NULL);

            SELECT last_insert_rowid();
            """;

        return Convert.ToInt64(insertCommand.ExecuteScalar());
    }

    private static object? BuildCollectionCoverPayload(string mediaRootPath, long? coverId, string? coverPath)
    {
        if (!coverId.HasValue || string.IsNullOrWhiteSpace(coverPath))
        {
            return null;
        }

        var normalizedPath = coverPath.Replace("\\", "/");
        if (!TryResolveMediaFilePath(mediaRootPath, normalizedPath, out var absolutePath, out var extension))
        {
            return null;
        }

        var fileInfo = new FileInfo(absolutePath);
        var mediaType = IsImageFile(extension) ? "image" : IsVideoFile(extension) ? "video" : "file";
        var originalUrl = BuildMediaUrl(normalizedPath);
        var tileUrl = BuildTileUrl(normalizedPath, extension, fileInfo.LastWriteTimeUtc.Ticks);

        return new
        {
            id = coverId.Value,
            relativePath = normalizedPath,
            originalUrl,
            tileUrl,
            mediaType
        };
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static bool IsValidHttpUrl(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return false;
        }

        return uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            || uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
    }

    private static List<object> LoadMediaItems(
        string connectionString,
        string mediaRootPath,
        MediaSearchCriteria? criteria = null,
        bool favoritesOnly = false)
    {
        var result = new List<object>();

        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        var whereClauses = BuildMediaSearchWhereClauses(command, criteria, favoritesOnly);
        var whereSql = whereClauses.Count == 0
            ? string.Empty
            : $"{Environment.NewLine}            WHERE {string.Join($"{Environment.NewLine}              AND ", whereClauses)}";

        command.CommandText = $"""
            SELECT
                m.Id,
                m.Path,
                m.Title,
                m.Description,
                m.Source,
                m.Parent,
                m.Child,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                ) AS IsFavorite
            FROM Media m{whereSql}
            ORDER BY m.Id DESC;
            """;

        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var path = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
            if (string.IsNullOrWhiteSpace(path))
            {
                continue;
            }

            var normalizedPath = path.Replace("\\", "/");
            var normalizedRelativePath = normalizedPath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
            var rootPath = Path.GetFullPath(mediaRootPath + Path.DirectorySeparatorChar);
            var absolutePath = Path.GetFullPath(Path.Combine(mediaRootPath, normalizedRelativePath));
            if (!absolutePath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var extension = Path.GetExtension(absolutePath);
            if (!File.Exists(absolutePath) || !IsAllowedMediaFile(absolutePath))
            {
                continue;
            }

            var fileInfo = new FileInfo(absolutePath);
            var mediaType = IsImageFile(extension) ? "image" : IsVideoFile(extension) ? "video" : "file";
            var originalUrl = BuildMediaUrl(normalizedPath);
            var tileUrl = BuildTileUrl(normalizedPath, extension, fileInfo.LastWriteTimeUtc.Ticks);
            var item = new MediaMetadata(
                Id: reader.GetInt64(0),
                RelativePath: normalizedPath,
                Title: reader.IsDBNull(2) ? null : reader.GetString(2),
                Description: reader.IsDBNull(3) ? null : reader.GetString(3),
                Source: reader.IsDBNull(4) ? null : reader.GetString(4),
                Parent: reader.IsDBNull(5) ? null : reader.GetInt64(5),
                Child: reader.IsDBNull(6) ? null : reader.GetInt64(6),
                IsFavorite: !reader.IsDBNull(7) && reader.GetInt64(7) == 1);

            result.Add(new
            {
                id = item.Id,
                name = Path.GetFileName(normalizedPath),
                relativePath = item.RelativePath,
                title = item.Title,
                description = item.Description,
                source = item.Source,
                parent = item.Parent,
                child = item.Child,
                isFavorite = item.IsFavorite,
                originalUrl,
                tileUrl,
                mediaType,
                sizeBytes = fileInfo.Length,
                modifiedAtUtc = fileInfo.LastWriteTimeUtc
            });
        }

        return result;
    }

    private static List<object> LoadCollectionMediaItems(
        string connectionString,
        string mediaRootPath,
        long collectionId)
    {
        var result = new List<object>();

        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                m.Id,
                m.Path,
                m.Title,
                m.Description,
                m.Source,
                m.Parent,
                m.Child,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cmFav
                    INNER JOIN Collections cFav ON cFav.Id = cmFav.CollectionId
                    WHERE cmFav.MediaId = m.Id AND cFav.Lable = 'Favorites'
                ) AS IsFavorite
            FROM Media m
            INNER JOIN CollectionsMedia cm ON cm.MediaId = m.Id
            WHERE cm.CollectionId = $collectionId
            ORDER BY m.Id DESC;
            """;
        command.Parameters.AddWithValue("$collectionId", collectionId);

        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var path = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
            if (string.IsNullOrWhiteSpace(path))
            {
                continue;
            }

            var normalizedPath = path.Replace("\\", "/");
            var normalizedRelativePath = normalizedPath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
            var rootPath = Path.GetFullPath(mediaRootPath + Path.DirectorySeparatorChar);
            var absolutePath = Path.GetFullPath(Path.Combine(mediaRootPath, normalizedRelativePath));
            if (!absolutePath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var extension = Path.GetExtension(absolutePath);
            if (!File.Exists(absolutePath) || !IsAllowedMediaFile(absolutePath))
            {
                continue;
            }

            var fileInfo = new FileInfo(absolutePath);
            var mediaType = IsImageFile(extension) ? "image" : IsVideoFile(extension) ? "video" : "file";
            var originalUrl = BuildMediaUrl(normalizedPath);
            var tileUrl = BuildTileUrl(normalizedPath, extension, fileInfo.LastWriteTimeUtc.Ticks);
            var item = new MediaMetadata(
                Id: reader.GetInt64(0),
                RelativePath: normalizedPath,
                Title: reader.IsDBNull(2) ? null : reader.GetString(2),
                Description: reader.IsDBNull(3) ? null : reader.GetString(3),
                Source: reader.IsDBNull(4) ? null : reader.GetString(4),
                Parent: reader.IsDBNull(5) ? null : reader.GetInt64(5),
                Child: reader.IsDBNull(6) ? null : reader.GetInt64(6),
                IsFavorite: !reader.IsDBNull(7) && reader.GetInt64(7) == 1);

            result.Add(new
            {
                id = item.Id,
                name = Path.GetFileName(normalizedPath),
                relativePath = item.RelativePath,
                title = item.Title,
                description = item.Description,
                source = item.Source,
                parent = item.Parent,
                child = item.Child,
                isFavorite = item.IsFavorite,
                originalUrl,
                tileUrl,
                mediaType,
                sizeBytes = fileInfo.Length,
                modifiedAtUtc = fileInfo.LastWriteTimeUtc
            });
        }

        return result;
    }

    private static List<string> BuildMediaSearchWhereClauses(
        SqliteCommand command,
        MediaSearchCriteria? criteria,
        bool favoritesOnly = false)
    {
        var whereClauses = new List<string>();
        if (favoritesOnly)
        {
            whereClauses.Add("""
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                )
                """);
        }

        if (criteria is null || !criteria.HasFilters)
        {
            return whereClauses;
        }

        var parameterIndex = 0;

        AddContainsClauses(criteria.PathTerms, "m.Path");
        AddContainsClauses(criteria.TitleTerms, "IFNULL(m.Title, '')");
        AddContainsClauses(criteria.DescriptionTerms, "IFNULL(m.Description, '')");
        AddContainsClauses(criteria.SourceTerms, "IFNULL(m.Source, '')");
        AddTagClauses(criteria.TagFilters);

        if (criteria.Ids.Count > 0)
        {
            var idParams = new List<string>();
            foreach (var id in criteria.Ids.Distinct())
            {
                var paramName = $"$p{parameterIndex++}";
                idParams.Add(paramName);
                command.Parameters.AddWithValue(paramName, id);
            }

            whereClauses.Add(idParams.Count == 1
                ? $"m.Id = {idParams[0]}"
                : $"m.Id IN ({string.Join(", ", idParams)})");
        }

        return whereClauses;

        void AddContainsClauses(IEnumerable<string> terms, string sqlField)
        {
            foreach (var term in terms.Where(value => !string.IsNullOrWhiteSpace(value)))
            {
                var paramName = $"$p{parameterIndex++}";
                command.Parameters.AddWithValue(paramName, $"%{term.Trim().ToLowerInvariant()}%");
                whereClauses.Add($"LOWER({sqlField}) LIKE {paramName}");
            }
        }

        void AddTagClauses(IEnumerable<MediaSearchTagFilter> filters)
        {
            foreach (var filter in filters)
            {
                if (string.IsNullOrWhiteSpace(filter.TagTypeName) || string.IsNullOrWhiteSpace(filter.TagName))
                {
                    continue;
                }

                var typeParamName = $"$p{parameterIndex++}";
                var tagParamName = $"$p{parameterIndex++}";
                command.Parameters.AddWithValue(typeParamName, filter.TagTypeName.Trim().ToLowerInvariant());
                command.Parameters.AddWithValue(tagParamName, $"%{filter.TagName.Trim().ToLowerInvariant()}%");
                whereClauses.Add($"""
                    EXISTS (
                        SELECT 1
                        FROM MediaTags mt
                        INNER JOIN Tags t ON t.Id = mt.TagId
                        INNER JOIN TagTypes tt ON tt.Id = t.TagTypeId
                        WHERE mt.MediaId = m.Id
                          AND LOWER(tt.Name) = {typeParamName}
                          AND LOWER(t.Name) LIKE {tagParamName}
                    )
                    """);
            }
        }
    }

    private static MediaSearchCriteria ParseMediaSearchCriteria(string? search)
    {
        var criteria = new MediaSearchCriteria();
        if (string.IsNullOrWhiteSpace(search))
        {
            return criteria;
        }

        var text = search.Trim();
        var index = 0;

        while (index < text.Length)
        {
            while (index < text.Length && char.IsWhiteSpace(text[index]))
            {
                index++;
            }

            if (index >= text.Length)
            {
                break;
            }

            var hasAtPrefix = text[index] == '@';
            var tagStart = hasAtPrefix ? index + 1 : index;
            var separatorIndex = text.IndexOf(':', tagStart);
            if (separatorIndex < 0)
            {
                while (index < text.Length && !char.IsWhiteSpace(text[index]))
                {
                    index++;
                }

                continue;
            }

            var hasWhitespaceBeforeSeparator = false;
            for (var i = tagStart; i < separatorIndex; i++)
            {
                if (char.IsWhiteSpace(text[i]))
                {
                    hasWhitespaceBeforeSeparator = true;
                    break;
                }
            }

            if (hasWhitespaceBeforeSeparator || separatorIndex == tagStart)
            {
                while (index < text.Length && !char.IsWhiteSpace(text[index]))
                {
                    index++;
                }
                continue;
            }

            var tag = text.Substring(tagStart, separatorIndex - tagStart).Trim().ToLowerInvariant();
            index = separatorIndex + 1;

            while (index < text.Length && char.IsWhiteSpace(text[index]))
            {
                index++;
            }

            if (index >= text.Length)
            {
                break;
            }

            string rawValue;
            if (text[index] == '"' || text[index] == '“' || text[index] == '”')
            {
                var openingQuote = text[index];
                var closingQuote = openingQuote == '“' ? '”' : '"';
                var valueStart = index + 1;
                var closingQuoteIndex = text.IndexOf(closingQuote, valueStart);
                if (closingQuoteIndex < 0 && closingQuote != '"')
                {
                    closingQuoteIndex = text.IndexOf('"', valueStart);
                }

                if (closingQuoteIndex < 0)
                {
                    rawValue = text[valueStart..];
                    index = text.Length;
                }
                else
                {
                    rawValue = text.Substring(valueStart, closingQuoteIndex - valueStart);
                    index = closingQuoteIndex + 1;
                }

                if (index < text.Length && !char.IsWhiteSpace(text[index]))
                {
                    while (index < text.Length && !char.IsWhiteSpace(text[index]))
                    {
                        index++;
                    }

                    continue;
                }
            }
            else
            {
                var valueStart = index;
                while (index < text.Length && !char.IsWhiteSpace(text[index]))
                {
                    index++;
                }

                rawValue = text.Substring(valueStart, index - valueStart);
            }

            var value = rawValue.Trim();
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            switch (tag)
            {
                case "path":
                    criteria.PathTerms.Add(value);
                    break;
                case "title":
                    criteria.TitleTerms.Add(value);
                    break;
                case "description":
                    criteria.DescriptionTerms.Add(value);
                    break;
                case "source":
                    criteria.SourceTerms.Add(value);
                    break;
                case "id":
                    if (long.TryParse(value, out var parsedId) && parsedId > 0)
                    {
                        criteria.Ids.Add(parsedId);
                    }
                    break;
                default:
                    criteria.TagFilters.Add(new MediaSearchTagFilter(
                        TagTypeName: tag,
                        TagName: value));
                    break;
            }
        }

        return criteria;
    }

    private sealed class MediaConversionException(string message) : Exception(message);

    private sealed record MediaUpdateRequest(
        string? Title,
        string? Description,
        string? Source,
        long? Parent,
        long? Child,
        IReadOnlyList<long>? TagIds);

    private sealed record FavoriteUpdateRequest(bool IsFavorite);
    private sealed record CollectionCreateRequest(string? Label, string? Description, long? Cover);
    private sealed record CollectionUpdateRequest(string? Label, string? Description, long? Cover);
    private sealed record CollectionMediaAddRequest(long MediaId);
    private sealed record TagTypeCreateRequest(string? Name, string? Color);
    private sealed record TagTypeUpdateRequest(string? Name, string? Color);
    private sealed record TagCreateRequest(string? Name, string? Description);
    private sealed record TagUpdateRequest(string? Name, string? Description);

    private sealed record MediaMetadata(
        long Id,
        string RelativePath,
        string? Title,
        string? Description,
        string? Source,
        long? Parent,
        long? Child,
        bool IsFavorite);

    private sealed class MediaSearchCriteria
    {
        public List<string> PathTerms { get; } = [];
        public List<string> TitleTerms { get; } = [];
        public List<string> DescriptionTerms { get; } = [];
        public List<string> SourceTerms { get; } = [];
        public List<long> Ids { get; } = [];
        public List<MediaSearchTagFilter> TagFilters { get; } = [];

        public bool HasFilters =>
            PathTerms.Count > 0
            || TitleTerms.Count > 0
            || DescriptionTerms.Count > 0
            || SourceTerms.Count > 0
            || Ids.Count > 0
            || TagFilters.Count > 0;
    }

    private sealed record MediaSearchTagFilter(
        string TagTypeName,
        string TagName);
}
