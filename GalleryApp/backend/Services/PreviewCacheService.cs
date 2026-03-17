using GalleryApp.Api.Services.MediaProcessing;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
using System.Collections.Concurrent;

namespace GalleryApp.Api.Services;

public sealed class PreviewCacheService(
    MediaStorageOptions mediaStorageOptions,
    IMediaProcessingService mediaProcessingService)
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> CacheLocks = new(StringComparer.Ordinal);

    public sealed record PreviewCacheResult(string Path, string ContentType, DateTimeOffset LastModifiedUtc, string ETag);

    public async Task<PreviewCacheResult> GetOrCreateAsync(
        string relativePath,
        string absolutePath,
        string extension,
        long modifiedTicks,
        CancellationToken cancellationToken = default)
    {
        var cachePath = Path.Combine(mediaStorageOptions.PreviewCachePath, $"{MediaFileHelper.BuildEntityTag("preview-cache", relativePath, modifiedTicks).Trim('"')}.jpg");
        if (!HasUsableCacheFile(cachePath))
        {
            var cacheLock = CacheLocks.GetOrAdd(cachePath, static _ => new SemaphoreSlim(1, 1));
            await cacheLock.WaitAsync(cancellationToken);
            try
            {
                if (!HasUsableCacheFile(cachePath))
                {
                    var previewBytes = MediaFileHelper.IsImageFile(extension) && !MediaFileHelper.IsGifFile(extension)
                        ? GenerateImagePreviewJpeg(absolutePath)
                        : await mediaProcessingService.GeneratePreviewAsync(absolutePath, extension, cancellationToken)
                            ?? throw new MediaConversionException("Preview is not available for this media type.");

                    await WriteCacheFileAtomicallyAsync(cachePath, previewBytes, cancellationToken);
                }
            }
            finally
            {
                cacheLock.Release();
            }
        }

        return new PreviewCacheResult(
            cachePath,
            "image/jpeg",
            File.GetLastWriteTimeUtc(cachePath),
            MediaFileHelper.BuildEntityTag("preview", relativePath, modifiedTicks));
    }

    public async Task WarmAsync(
        string relativePath,
        string absolutePath,
        string extension,
        CancellationToken cancellationToken = default)
    {
        var modifiedTicks = File.GetLastWriteTimeUtc(absolutePath).Ticks;
        _ = await GetOrCreateAsync(relativePath, absolutePath, extension, modifiedTicks, cancellationToken);
    }

    public Task WarmExistingAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        if (!MediaFileHelper.TryResolveMediaFilePath(mediaStorageOptions.RootPath, relativePath, out var absolutePath, out var extension))
        {
            return Task.CompletedTask;
        }

        return WarmAsync(relativePath, absolutePath, extension, cancellationToken);
    }

    private static bool HasUsableCacheFile(string cachePath)
    {
        return File.Exists(cachePath) && new FileInfo(cachePath).Length > 0;
    }

    private static async Task WriteCacheFileAtomicallyAsync(string cachePath, byte[] previewBytes, CancellationToken cancellationToken)
    {
        var tempPath = Path.Combine(Path.GetDirectoryName(cachePath)!, $"{Path.GetFileName(cachePath)}.{Guid.NewGuid():N}.tmp");
        try
        {
            await File.WriteAllBytesAsync(tempPath, previewBytes, cancellationToken);

            if (File.Exists(cachePath))
            {
                File.Delete(cachePath);
            }

            File.Move(tempPath, cachePath);
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }

    private static byte[] GenerateImagePreviewJpeg(string sourcePath, int maxSize = 640, int quality = 75)
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
}
