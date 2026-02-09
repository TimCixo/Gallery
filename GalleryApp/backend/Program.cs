using System.ComponentModel;
using System.Diagnostics;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http;
using SixLabors.ImageSharp;
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

        app.MapGet("/api/health", () =>
            Results.Ok(new
            {
                status = "ok",
                timestampUtc = DateTime.UtcNow
            }));

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
                FileName = "ffmpeg",
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
                throw new MediaConversionException("Video conversion requires ffmpeg installed and available in PATH.");
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

    private static string FirstNonEmptyLine(string value)
    {
        return value
            .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .FirstOrDefault(line => !string.IsNullOrWhiteSpace(line))
            ?? string.Empty;
    }

    private sealed class MediaConversionException(string message) : Exception(message);
}
