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

namespace GalleryApp.Api;

public class Program
{
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

        app.MapGet("/api/media", (int? page, int? pageSize) =>
        {
            var normalizedPageSize = Math.Clamp(pageSize ?? 36, 1, 100);
            var normalizedPage = Math.Max(page ?? 1, 1);
            var metadataByPath = LoadMediaMetadataByPath(connectionString);

            if (!Directory.Exists(mediaRootPath))
            {
                Directory.CreateDirectory(mediaRootPath);
                return Results.Ok(new
                {
                    page = 1,
                    pageSize = normalizedPageSize,
                    totalCount = 0,
                    totalPages = 0,
                    files = Array.Empty<object>()
                });
            }

            var allFiles = Directory
                .EnumerateFiles(mediaRootPath, "*", SearchOption.AllDirectories)
                .Where(path =>
                {
                    return IsAllowedMediaFile(path);
                })
                .Select(path =>
                {
                    var relativePath = Path.GetRelativePath(mediaRootPath, path).Replace("\\", "/");
                    metadataByPath.TryGetValue(relativePath, out var metadata);
                    var extension = Path.GetExtension(path);
                    var mediaType = IsImageFile(extension) ? "image" : IsVideoFile(extension) ? "video" : "file";
                    var fileInfo = new FileInfo(path);
                    var originalUrl = BuildMediaUrl(relativePath);
                    var tileUrl = BuildTileUrl(relativePath, extension, fileInfo.LastWriteTimeUtc.Ticks);

                    return new
                    {
                        id = metadata?.Id,
                        name = Path.GetFileName(path),
                        relativePath,
                        title = metadata?.Title,
                        description = metadata?.Description,
                        source = metadata?.Source,
                        parent = metadata?.Parent,
                        child = metadata?.Child,
                        isFavorite = metadata?.IsFavorite ?? false,
                        originalUrl,
                        tileUrl,
                        mediaType,
                        sizeBytes = fileInfo.Length,
                        modifiedAtUtc = fileInfo.LastWriteTimeUtc
                    };
                })
                .OrderByDescending(file => file.modifiedAtUtc)
                .ToArray();

            var totalCount = allFiles.Length;
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
            var metadataByPath = LoadMediaMetadataByPath(connectionString);

            if (!Directory.Exists(mediaRootPath))
            {
                Directory.CreateDirectory(mediaRootPath);
                return Results.Ok(new
                {
                    page = 1,
                    pageSize = normalizedPageSize,
                    totalCount = 0,
                    totalPages = 0,
                    files = Array.Empty<object>()
                });
            }

            var allFiles = Directory
                .EnumerateFiles(mediaRootPath, "*", SearchOption.AllDirectories)
                .Where(path =>
                {
                    return IsAllowedMediaFile(path);
                })
                .Select(path =>
                {
                    var relativePath = Path.GetRelativePath(mediaRootPath, path).Replace("\\", "/");
                    metadataByPath.TryGetValue(relativePath, out var metadata);
                    if (metadata is null || !metadata.IsFavorite)
                    {
                        return null;
                    }

                    var extension = Path.GetExtension(path);
                    var mediaType = IsImageFile(extension) ? "image" : IsVideoFile(extension) ? "video" : "file";
                    var fileInfo = new FileInfo(path);
                    var originalUrl = BuildMediaUrl(relativePath);
                    var tileUrl = BuildTileUrl(relativePath, extension, fileInfo.LastWriteTimeUtc.Ticks);

                    return new
                    {
                        id = metadata.Id,
                        name = Path.GetFileName(path),
                        relativePath,
                        title = metadata.Title,
                        description = metadata.Description,
                        source = metadata.Source,
                        parent = metadata.Parent,
                        child = metadata.Child,
                        isFavorite = true,
                        originalUrl,
                        tileUrl,
                        mediaType,
                        sizeBytes = fileInfo.Length,
                        modifiedAtUtc = fileInfo.LastWriteTimeUtc
                    };
                })
                .Where(file => file is not null)
                .Select(file => file!)
                .OrderByDescending(file => file.modifiedAtUtc)
                .ToArray();

            var totalCount = allFiles.Length;
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

            using var command = connection.CreateCommand();
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

            CREATE INDEX IF NOT EXISTS IX_Media_Parent ON Media(Parent);
            CREATE INDEX IF NOT EXISTS IX_Media_Child ON Media(Child);
            CREATE INDEX IF NOT EXISTS IX_Collections_Cover ON Collections(Cover);
            CREATE INDEX IF NOT EXISTS IX_CollectionsMedia_CollectionId ON CollectionsMedia(CollectionId);
            CREATE INDEX IF NOT EXISTS IX_CollectionsMedia_MediaId ON CollectionsMedia(MediaId);

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

    private static Dictionary<string, MediaMetadata> LoadMediaMetadataByPath(string connectionString)
    {
        var result = new Dictionary<string, MediaMetadata>(StringComparer.OrdinalIgnoreCase);

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
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                ) AS IsFavorite
            FROM Media m;
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
            result[normalizedPath] = new MediaMetadata(
                Id: reader.GetInt64(0),
                Title: reader.IsDBNull(2) ? null : reader.GetString(2),
                Description: reader.IsDBNull(3) ? null : reader.GetString(3),
                Source: reader.IsDBNull(4) ? null : reader.GetString(4),
                Parent: reader.IsDBNull(5) ? null : reader.GetInt64(5),
                Child: reader.IsDBNull(6) ? null : reader.GetInt64(6),
                IsFavorite: !reader.IsDBNull(7) && reader.GetInt64(7) == 1);
        }

        return result;
    }

    private sealed class MediaConversionException(string message) : Exception(message);

    private sealed record MediaUpdateRequest(
        string? Title,
        string? Description,
        string? Source,
        long? Parent,
        long? Child);

    private sealed record FavoriteUpdateRequest(bool IsFavorite);

    private sealed record MediaMetadata(
        long Id,
        string? Title,
        string? Description,
        string? Source,
        long? Parent,
        long? Child,
        bool IsFavorite);
}
