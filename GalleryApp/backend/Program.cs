using System.ComponentModel;
using System.Diagnostics;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http;
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

        app.MapGet("/api/media", () =>
        {
            if (!Directory.Exists(mediaRootPath))
            {
                Directory.CreateDirectory(mediaRootPath);
                return Results.Ok(new { files = Array.Empty<object>() });
            }

            var files = Directory
                .EnumerateFiles(mediaRootPath, "*", SearchOption.AllDirectories)
                .Where(path =>
                {
                    return IsAllowedMediaFile(path);
                })
                .Select(path =>
                {
                    var relativePath = Path.GetRelativePath(mediaRootPath, path).Replace("\\", "/");
                    var extension = Path.GetExtension(path);
                    var mediaType = IsImageFile(extension) ? "image" : IsVideoFile(extension) ? "video" : "file";
                    var fileInfo = new FileInfo(path);
                    var originalUrl = BuildMediaUrl(relativePath);
                    var tileUrl = BuildTileUrl(relativePath, extension, fileInfo.LastWriteTimeUtc.Ticks);

                    return new
                    {
                        name = Path.GetFileName(path),
                        relativePath,
                        originalUrl,
                        tileUrl,
                        mediaType,
                        sizeBytes = fileInfo.Length,
                        modifiedAtUtc = fileInfo.LastWriteTimeUtc
                    };
                })
                .OrderByDescending(file => file.modifiedAtUtc)
                .ToArray();

            return Results.Ok(new { files });
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

        app.MapPost("/api/upload", async (HttpRequest request) =>
        {
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

                try
                {
                    if (IsGifFile(extension))
                    {
                        uniqueName = BuildUniqueFileName(targetDirectory, safeOriginalName);
                        destinationPath = Path.Combine(targetDirectory, uniqueName);

                        await using var stream = File.Create(destinationPath);
                        await file.CopyToAsync(stream);
                    }
                    else if (IsImageFile(extension))
                    {
                        var webpName = Path.ChangeExtension(safeOriginalName, ".webp");
                        uniqueName = BuildUniqueFileName(targetDirectory, webpName);
                        destinationPath = Path.Combine(targetDirectory, uniqueName);

                        await ConvertImageToWebpAsync(file, destinationPath);
                    }
                    else if (IsVideoFile(extension))
                    {
                        var mp4Name = Path.ChangeExtension(safeOriginalName, ".mp4");
                        uniqueName = BuildUniqueFileName(targetDirectory, mp4Name);
                        destinationPath = Path.Combine(targetDirectory, uniqueName);

                        await ConvertVideoToMp4Async(file, destinationPath, extension);
                    }
                    else
                    {
                        return Results.BadRequest(new { error = $"Unsupported file type: {safeOriginalName}" });
                    }
                }
                catch (MediaConversionException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }

                savedFiles.Add(new
                {
                    originalName = safeOriginalName,
                    storedName = uniqueName,
                    relativePath = Path.Combine("App_Data", "Media", dateFolderName, uniqueName)
                });
            }

            return Results.Ok(new
            {
                uploadedAtUtc = uploadDate,
                dateFolder = dateFolderName,
                files = savedFiles
            });
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
            CREATE TABLE IF NOT EXISTS AppInfo (
                Id INTEGER PRIMARY KEY CHECK (Id = 1),
                Name TEXT NOT NULL,
                CreatedAtUtc TEXT NOT NULL
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

    private sealed class MediaConversionException(string message) : Exception(message);
}
