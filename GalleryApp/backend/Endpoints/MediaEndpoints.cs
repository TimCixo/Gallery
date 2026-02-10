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

public static class MediaEndpoints
{
    public static IEndpointRouteBuilder MapMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var connectionString = app.ServiceProvider.GetRequiredService<string>();
        var mediaRootPath = app.ServiceProvider.GetRequiredService<MediaStorageOptions>().RootPath;

app.MapGet("/api/media", (int? page, int? pageSize, string? search) =>
{
    var searchCriteria = ParseMediaSearchCriteria(search);
    var allFiles = LoadMediaItems(connectionString, mediaRootPath, searchCriteria, favoritesOnly: false);
    var pagedResult = PaginationHelper.CreatePagedResult(allFiles, new PagedRequest(page, pageSize));

    return Results.Ok(pagedResult);
});

app.MapGet("/api/favorites", (int? page, int? pageSize) =>
{
    var allFiles = LoadMediaItems(connectionString, mediaRootPath, criteria: null, favoritesOnly: true);
    var pagedResult = PaginationHelper.CreatePagedResult(allFiles, new PagedRequest(page, pageSize));

    return Results.Ok(pagedResult);
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

        return app;
    }
}
