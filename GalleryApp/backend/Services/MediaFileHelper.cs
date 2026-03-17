using System.Security.Cryptography;
using System.Text;

namespace GalleryApp.Api.Services;

public static class MediaFileHelper
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
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

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".jfif",
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

    public static string BuildDisplayUrl(string relativePath)
    {
        return $"/api/media/view?path={Uri.EscapeDataString(relativePath)}";
    }

    public static string BuildTileUrl(string relativePath, long modifiedTicks)
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

    public static string BuildEntityTag(string scope, string relativePath, long modifiedTicks)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{scope}|{relativePath}|{modifiedTicks}"));
        return $"\"{Convert.ToHexString(bytes)}\"";
    }
}
