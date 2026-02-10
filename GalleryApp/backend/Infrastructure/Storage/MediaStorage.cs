namespace GalleryApp.Api.Infrastructure.Storage;

public sealed class MediaStorage : IMediaStorage
{
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

    public string BuildUniqueFileName(string directoryPath, string originalName)
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

    public bool TryResolveMediaFilePath(string mediaRootPath, string relativePath, out string absolutePath, out string extension)
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

    public string SanitizeFileName(string value)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var cleaned = new string(value.Select(ch => invalidChars.Contains(ch) ? '_' : ch).ToArray()).Trim();

        return string.IsNullOrWhiteSpace(cleaned) ? "file" : cleaned;
    }

    public bool DeleteFileIfExists(string mediaRootPath, string relativePath)
    {
        var normalizedRelativePath = relativePath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        var rootPath = Path.GetFullPath(mediaRootPath + Path.DirectorySeparatorChar);
        var absolutePath = Path.GetFullPath(Path.Combine(mediaRootPath, normalizedRelativePath));

        if (!absolutePath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Stored media path is invalid.");
        }

        if (!File.Exists(absolutePath))
        {
            return false;
        }

        File.Delete(absolutePath);
        return true;
    }

    private static bool IsAllowedMediaFile(string fileName)
    {
        var extension = Path.GetExtension(fileName);
        return !string.IsNullOrWhiteSpace(extension) && AllowedExtensions.Contains(extension);
    }
}
