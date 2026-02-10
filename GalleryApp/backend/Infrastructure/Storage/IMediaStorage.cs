namespace GalleryApp.Api.Infrastructure.Storage;

public interface IMediaStorage
{
    string BuildUniqueFileName(string directoryPath, string originalName);

    bool TryResolveMediaFilePath(string mediaRootPath, string relativePath, out string absolutePath, out string extension);

    string SanitizeFileName(string value);

    bool DeleteFileIfExists(string mediaRootPath, string relativePath);
}
