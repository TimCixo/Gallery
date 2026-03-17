using System.ComponentModel;
using System.Diagnostics;
using System.Text.RegularExpressions;
using GalleryApp.Api.Models.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace GalleryApp.Api.Services;

public static class LegacyHelpers
{
public static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
{
    ".jpg",
    ".jpeg",
    ".jfif",
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
public static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
{
    ".jpg",
    ".jpeg",
    ".jfif",
    ".png",
    ".gif",
    ".webp",
    ".bmp"
};
public static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
{
    ".mp4",
    ".webm",
    ".mov",
    ".avi",
    ".mkv",
    ".m4v"
};
public static void EnsureDatabase(IServiceProvider services)
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

public static bool IsAllowedMediaFile(string fileName)
{
    var extension = Path.GetExtension(fileName);
    return !string.IsNullOrWhiteSpace(extension) && AllowedExtensions.Contains(extension);
}

public static bool IsImageFile(string extension) => ImageExtensions.Contains(extension);

public static bool IsVideoFile(string extension) => VideoExtensions.Contains(extension);

public static bool IsGifFile(string extension) => extension.Equals(".gif", StringComparison.OrdinalIgnoreCase);

public static string BuildMediaUrl(string relativePath)
{
    return $"/media/{Uri.EscapeDataString(relativePath).Replace("%2F", "/")}";
}

public static string BuildTileUrl(string relativePath, string extension, long modifiedTicks)
{
    return $"/api/media/preview?path={Uri.EscapeDataString(relativePath)}&v={modifiedTicks}";
}

public static bool TryResolveMediaFilePath(
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

public static string BuildUniqueFileName(string directoryPath, string originalName)
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

public static string SanitizeFileName(string value)
{
    var invalidChars = Path.GetInvalidFileNameChars();
    var cleaned = new string(value.Select(ch => invalidChars.Contains(ch) ? '_' : ch).ToArray()).Trim();

    return string.IsNullOrWhiteSpace(cleaned) ? "file" : cleaned;
}

public static async Task ConvertImageToWebpAsync(IFormFile file, string destinationPath)
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

public static async Task ConvertVideoToMp4Async(IFormFile file, string destinationPath, string sourceExtension)
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

public static byte[] GenerateGifPreviewJpeg(string sourcePath)
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

public static byte[] GenerateImagePreviewJpeg(string sourcePath, int maxSize = 640, int quality = 75)
{
    try
    {
        using var image = Image.Load(sourcePath);
        image.Mutate((context) => context.Resize(new ResizeOptions
        {
            Mode = ResizeMode.Max,
            Size = new Size(maxSize, maxSize)
        }));

        using var stream = new MemoryStream();
        image.Save(stream, new JpegEncoder { Quality = quality });
        return stream.ToArray();
    }
    catch (UnknownImageFormatException ex)
    {
        throw new MediaConversionException($"Image preview generation failed: {ex.Message}");
    }
}

public static byte[] GenerateVideoPreviewJpeg(string sourcePath)
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

public static string FirstNonEmptyLine(string value)
{
    return value
        .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
        .Select(line => line.Trim())
        .FirstOrDefault(line => !string.IsNullOrWhiteSpace(line))
        ?? string.Empty;
}

public static string ResolveFfmpegExecutable()
{
    var configuredPath = Environment.GetEnvironmentVariable("FFMPEG_PATH");
    if (!string.IsNullOrWhiteSpace(configuredPath))
    {
        return configuredPath;
    }

    return "ffmpeg";
}

public static long CreatePendingMediaRecord(SqliteConnection connection)
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

public static void UpdateMediaPath(SqliteConnection connection, long mediaId, string relativePath)
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

public static void DeleteMediaRecord(SqliteConnection connection, long mediaId)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        DELETE FROM Media
        WHERE Id = $id;
        """;
    command.Parameters.AddWithValue("$id", mediaId);
    command.ExecuteNonQuery();
}

public static bool MediaRecordExists(SqliteConnection connection, long id)
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

public static (long? Parent, long? Child)? GetMediaLinks(
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

public static long EnsureFavoritesCollection(SqliteConnection connection)
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

public static object? BuildCollectionCoverPayload(string mediaRootPath, long? coverId, string? coverPath)
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

public static string? NormalizeOptionalText(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return null;
    }

    return value.Trim();
}

public static bool IsValidHttpUrl(string value)
{
    if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
    {
        return false;
    }

    return uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
        || uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
}

public static List<object> LoadMediaItems(
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
        var tags = LoadMediaTags(connection, item.Id);

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
            tags,
            sizeBytes = fileInfo.Length,
            modifiedAtUtc = fileInfo.LastWriteTimeUtc
        });
    }

    return result;
}

public static List<object> LoadCollectionMediaItems(
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
        var tags = LoadMediaTags(connection, item.Id);

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
            tags,
            sizeBytes = fileInfo.Length,
            modifiedAtUtc = fileInfo.LastWriteTimeUtc
        });
    }

    return result;
}

private static List<object> LoadMediaTags(SqliteConnection connection, long mediaId)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT
            t.Id,
            t.Name,
            t.Description,
            tt.Id AS TagTypeId,
            tt.Name AS TagTypeName,
            tt.Color AS TagTypeColor
        FROM MediaTags mt
        INNER JOIN Tags t ON t.Id = mt.TagId
        INNER JOIN TagTypes tt ON tt.Id = t.TagTypeId
        WHERE mt.MediaId = $mediaId
        ORDER BY tt.Name COLLATE NOCASE ASC, t.Name COLLATE NOCASE ASC, t.Id ASC;
        """;
    command.Parameters.AddWithValue("$mediaId", mediaId);

    using var reader = command.ExecuteReader();
    var tags = new List<object>();
    while (reader.Read())
    {
        tags.Add(new
        {
            id = reader.GetInt64(0),
            name = reader.GetString(1),
            description = reader.IsDBNull(2) ? null : reader.GetString(2),
            tagTypeId = reader.GetInt64(3),
            tagTypeName = reader.GetString(4),
            tagTypeColor = reader.GetString(5)
        });
    }

    return tags;
}

public static List<string> BuildMediaSearchWhereClauses(
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

public static MediaSearchCriteria ParseMediaSearchCriteria(string? search)
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

public sealed class MediaConversionException(string message) : Exception(message);

}
