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
using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Data.Search;

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
        builder.Services.AddSingleton<MediaRepository>();
        builder.Services.AddSingleton<CollectionRepository>();
        builder.Services.AddSingleton<TagRepository>();
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

        app.MapGet("/api/media", (int? page, int? pageSize, string? search, MediaRepository mediaRepository) =>
        {
            var normalizedPageSize = Math.Clamp(pageSize ?? 36, 1, 100);
            var normalizedPage = Math.Max(page ?? 1, 1);
            var searchCriteria = MediaSearchParser.ParseMediaSearchCriteria(search);
            var allFiles = BuildMediaPayload(mediaRootPath, mediaRepository.GetMedia(searchCriteria, favoritesOnly: false));

            var totalCount = allFiles.Count;
            var totalPages = totalCount == 0
                ? 0
                : (int)Math.Ceiling(totalCount / (double)normalizedPageSize);
            var effectivePage = totalPages == 0 ? 1 : Math.Min(normalizedPage, totalPages);
            var skip = totalPages == 0 ? 0 : (effectivePage - 1) * normalizedPageSize;
            var files = allFiles.Skip(skip).Take(normalizedPageSize).ToArray();

            return Results.Ok(new { page = effectivePage, pageSize = normalizedPageSize, totalCount, totalPages, files });
        });

        app.MapGet("/api/favorites", (int? page, int? pageSize, MediaRepository mediaRepository) =>
        {
            var normalizedPageSize = Math.Clamp(pageSize ?? 36, 1, 100);
            var normalizedPage = Math.Max(page ?? 1, 1);
            var allFiles = BuildMediaPayload(mediaRootPath, mediaRepository.GetMedia(criteria: null, favoritesOnly: true));

            var totalCount = allFiles.Count;
            var totalPages = totalCount == 0
                ? 0
                : (int)Math.Ceiling(totalCount / (double)normalizedPageSize);
            var effectivePage = totalPages == 0 ? 1 : Math.Min(normalizedPage, totalPages);
            var skip = totalPages == 0 ? 0 : (effectivePage - 1) * normalizedPageSize;
            var files = allFiles.Skip(skip).Take(normalizedPageSize).ToArray();

            return Results.Ok(new { page = effectivePage, pageSize = normalizedPageSize, totalCount, totalPages, files });
        });

        app.MapGet("/api/collections", (string? search, long? mediaId, CollectionRepository collectionRepository) =>
        {
            var normalizedSearch = NormalizeOptionalText(search);
            if (mediaId.HasValue && mediaId.Value <= 0)
            {
                return Results.BadRequest(new { error = "Invalid media id." });
            }

            var records = collectionRepository.GetCollections(normalizedSearch, mediaId);
            var items = records.Select(record => new
            {
                id = record.Id,
                label = record.Label,
                description = record.Description,
                cover = record.Cover,
                coverMedia = BuildCollectionCoverPayload(mediaRootPath, record.Cover, record.CoverPath),
                containsMedia = record.ContainsMedia
            }).ToArray();

            return Results.Ok(new { items });
        });

        app.MapPost("/api/collections", (CollectionCreateRequest request, CollectionRepository collectionRepository, MediaRepository mediaRepository) =>
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

            if (cover.HasValue && !mediaRepository.MediaRecordExists(cover.Value))
            {
                return Results.BadRequest(new { error = "Cover media id was not found." });
            }

            if (collectionRepository.CollectionNameExists(label))
            {
                return Results.Conflict(new { error = "Collection with this name already exists." });
            }

            var createdId = collectionRepository.CreateCollection(label, description, cover);
            return Results.Ok(new { id = createdId, label, description, cover });
        });

        app.MapPut("/api/collections/{id:long}", (long id, CollectionUpdateRequest request, CollectionRepository collectionRepository, MediaRepository mediaRepository) =>
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

            if (cover.HasValue && !mediaRepository.MediaRecordExists(cover.Value))
            {
                return Results.BadRequest(new { error = "Cover media id was not found." });
            }

            if (collectionRepository.CollectionNameExists(label, id))
            {
                return Results.Conflict(new { error = "Collection with this name already exists." });
            }

            if (!collectionRepository.UpdateCollection(id, label, description, cover))
            {
                return Results.NotFound(new { error = "Collection not found." });
            }

            return Results.Ok(new { id, label, description, cover });
        });

        app.MapGet("/api/collections/{id:long}/media", (long id, int? page, int? pageSize, MediaRepository mediaRepository) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid collection id." });
            }

            var normalizedPageSize = Math.Clamp(pageSize ?? 36, 1, 100);
            var normalizedPage = Math.Max(page ?? 1, 1);
            var allFiles = BuildMediaPayload(mediaRootPath, mediaRepository.GetCollectionMedia(id));

            var totalCount = allFiles.Count;
            var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)normalizedPageSize);
            var effectivePage = totalPages == 0 ? 1 : Math.Min(normalizedPage, totalPages);
            var skip = totalPages == 0 ? 0 : (effectivePage - 1) * normalizedPageSize;
            var files = allFiles.Skip(skip).Take(normalizedPageSize).ToArray();

            return Results.Ok(new { page = effectivePage, pageSize = normalizedPageSize, totalCount, totalPages, files });
        });

        app.MapDelete("/api/collections/{id:long}", (long id, CollectionRepository collectionRepository) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid collection id." });
            }

            if (!collectionRepository.DeleteCollection(id))
            {
                return Results.NotFound(new { error = "Collection not found." });
            }

            return Results.Ok(new { id });
        });

        app.MapPost("/api/collections/{id:long}/media", (long id, CollectionMediaAddRequest request, CollectionRepository collectionRepository, MediaRepository mediaRepository) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid collection id." });
            }

            if (request.MediaId <= 0)
            {
                return Results.BadRequest(new { error = "Invalid media id." });
            }

            if (!collectionRepository.CollectionExists(id))
            {
                return Results.NotFound(new { error = "Collection not found." });
            }

            if (!mediaRepository.MediaRecordExists(request.MediaId))
            {
                return Results.BadRequest(new { error = "Media record not found." });
            }

            var included = collectionRepository.ToggleCollectionMedia(id, request.MediaId);
            return Results.Ok(new { collectionId = id, mediaId = request.MediaId, isIncluded = included });
        });

        app.MapGet("/api/tag-types", (TagRepository tagRepository) =>
        {
            var items = tagRepository.GetTagTypes().Select(item => new { id = item.Id, name = item.Name, color = item.Color }).ToArray();
            return Results.Ok(new { items });
        });

        app.MapPost("/api/tag-types", (TagTypeCreateRequest request, TagRepository tagRepository) =>
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

            var createdId = tagRepository.CreateTagType(name, color);
            return Results.Ok(new { id = createdId, name, color });
        });

        app.MapPut("/api/tag-types/{id:long}", (long id, TagTypeUpdateRequest request, TagRepository tagRepository) =>
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

            if (!tagRepository.UpdateTagType(id, name, color))
            {
                return Results.NotFound(new { error = "TagType not found." });
            }

            return Results.Ok(new { id, name, color });
        });

        app.MapGet("/api/tag-types/{id:long}/tags", (long id, TagRepository tagRepository) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid tag type id." });
            }

            var items = tagRepository.GetTagsByType(id)
                .Select(item => new { id = item.Id, name = item.Name, description = item.Description })
                .ToArray();
            return Results.Ok(new { items });
        });

        app.MapGet("/api/tags", (TagRepository tagRepository) =>
        {
            var items = tagRepository.GetAllTags().Select(item => new
            {
                id = item.Id,
                name = item.Name,
                description = item.Description,
                tagTypeId = item.TagTypeId,
                tagTypeName = item.TagTypeName,
                tagTypeColor = item.TagTypeColor
            }).ToArray();

            return Results.Ok(new { items });
        });

        app.MapPost("/api/tag-types/{id:long}/tags", (long id, TagCreateRequest request, TagRepository tagRepository) =>
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
            if (!tagRepository.TagTypeExists(id))
            {
                return Results.NotFound(new { error = "TagType not found." });
            }

            if (tagRepository.TagNameExists(name))
            {
                return Results.Conflict(new { error = "Tag with this name already exists." });
            }

            var createdId = tagRepository.CreateTag(name, description, id);
            return Results.Ok(new { id = createdId, name, description, tagTypeId = id });
        });

        app.MapPut("/api/tags/{id:long}", (long id, TagUpdateRequest request, TagRepository tagRepository) =>
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
            if (tagRepository.TagNameExists(name, id))
            {
                return Results.Conflict(new { error = "Tag with this name already exists." });
            }

            if (!tagRepository.UpdateTag(id, name, description))
            {
                return Results.NotFound(new { error = "Tag not found." });
            }

            return Results.Ok(new { id, name, description });
        });

        app.MapDelete("/api/tags/{id:long}", (long id, TagRepository tagRepository) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid tag id." });
            }

            if (!tagRepository.DeleteTag(id))
            {
                return Results.NotFound(new { error = "Tag not found." });
            }

            return Results.Ok(new { id });
        });

        app.MapDelete("/api/tag-types/{id:long}", (long id, TagRepository tagRepository) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid tag type id." });
            }

            if (!tagRepository.DeleteTagType(id))
            {
                return Results.NotFound(new { error = "TagType not found." });
            }

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

        app.MapPut("/api/media/{id:long}", (long id, MediaUpdateRequest request, MediaRepository mediaRepository) =>
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
            var normalizedTagIds = request.TagIds?.Where(tagId => tagId > 0).Distinct().ToArray();

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

            if (!mediaRepository.MediaRecordExists(id))
            {
                return Results.NotFound(new { error = "Media record not found." });
            }

            if (parent.HasValue && !mediaRepository.MediaRecordExists(parent.Value))
            {
                return Results.BadRequest(new { error = "Parent media id was not found." });
            }

            if (child.HasValue && !mediaRepository.MediaRecordExists(child.Value))
            {
                return Results.BadRequest(new { error = "Child media id was not found." });
            }

            var currentLinks = mediaRepository.GetMediaLinks(id);
            if (currentLinks is null)
            {
                return Results.NotFound(new { error = "Media record not found." });
            }

            if (normalizedTagIds is not null && normalizedTagIds.Length > 0 && !mediaRepository.AreAllTagsExist(normalizedTagIds))
            {
                return Results.BadRequest(new { error = "One or more tags were not found." });
            }

            mediaRepository.UpdateMedia(
                id,
                title,
                description,
                source,
                parent,
                child,
                currentLinks.Value.Parent,
                currentLinks.Value.Child,
                normalizedTagIds);

            return Results.Ok(new { id, title, description, source, parent, child });
        });

        app.MapPut("/api/media/{id:long}/favorite", (long id, FavoriteUpdateRequest request, MediaRepository mediaRepository) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid media id." });
            }

            if (!mediaRepository.MediaRecordExists(id))
            {
                return Results.NotFound(new { error = "Media record not found." });
            }

            mediaRepository.UpdateFavorite(id, request.IsFavorite);
            return Results.Ok(new { id, isFavorite = request.IsFavorite });
        });

        app.MapDelete("/api/media/{id:long}", (long id, MediaRepository mediaRepository) =>
        {
            if (id <= 0)
            {
                return Results.BadRequest(new { error = "Invalid media id." });
            }

            var rawPath = mediaRepository.GetMediaPath(id);
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

            mediaRepository.DeleteMediaRecordAndRelations(id);
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

    private static List<object> BuildMediaPayload(string mediaRootPath, IEnumerable<MediaRepository.MediaRow> mediaRows)
    {
        var result = new List<object>();
        foreach (var row in mediaRows)
        {
            if (string.IsNullOrWhiteSpace(row.Path))
            {
                continue;
            }

            var normalizedPath = row.Path.Replace("\\", "/");
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

            result.Add(new
            {
                id = row.Id,
                name = Path.GetFileName(normalizedPath),
                relativePath = normalizedPath,
                title = row.Title,
                description = row.Description,
                source = row.Source,
                parent = row.Parent,
                child = row.Child,
                isFavorite = row.IsFavorite,
                originalUrl,
                tileUrl,
                mediaType,
                sizeBytes = fileInfo.Length,
                modifiedAtUtc = fileInfo.LastWriteTimeUtc
            });
        }

        return result;
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

}
