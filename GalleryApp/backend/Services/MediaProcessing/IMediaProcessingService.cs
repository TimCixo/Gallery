namespace GalleryApp.Api.Services.MediaProcessing;

public interface IMediaProcessingService
{
    Task<MediaProcessingResult> ProcessUploadAsync(
        IFormFile file,
        string targetDirectory,
        long mediaId,
        CancellationToken cancellationToken = default);

    Task<byte[]?> GeneratePreviewAsync(
        string sourcePath,
        string extension,
        CancellationToken cancellationToken = default);
}

public sealed record MediaProcessingResult(string StoredName, string DestinationPath);
