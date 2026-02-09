using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http;

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

                if (!IsAllowedMediaFile(file.FileName))
                {
                    return Results.BadRequest(new { error = $"Unsupported file type: {file.FileName}" });
                }

                var safeOriginalName = Path.GetFileName(file.FileName);
                var uniqueName = BuildUniqueFileName(targetDirectory, safeOriginalName);
                var destinationPath = Path.Combine(targetDirectory, uniqueName);

                await using var stream = File.Create(destinationPath);
                await file.CopyToAsync(stream);

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
        ".svg",
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
}
