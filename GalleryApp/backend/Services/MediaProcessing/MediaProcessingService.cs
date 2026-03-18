using System.ComponentModel;
using System.Diagnostics;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;

namespace GalleryApp.Api.Services.MediaProcessing;

public sealed class MediaProcessingService(ILogger<MediaProcessingService> logger) : IMediaProcessingService
{
    private const string UserSafeProcessingError = "Media processing failed. Please verify the file and try again.";

    public async Task<MediaProcessingResult> ProcessUploadAsync(
        IFormFile file,
        string targetDirectory,
        long mediaId,
        CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        string storedName;
        string destinationPath;

        if (IsGifFile(extension))
        {
            storedName = $"{mediaId}{extension}";
            destinationPath = Path.Combine(targetDirectory, storedName);

            await using var stream = File.Create(destinationPath);
            await file.CopyToAsync(stream, cancellationToken);
            return new MediaProcessingResult(storedName, destinationPath);
        }

        if (IsImageFile(extension))
        {
            storedName = $"{mediaId}.webp";
            destinationPath = Path.Combine(targetDirectory, storedName);

            await ConvertImageToWebpAsync(file, destinationPath, cancellationToken);
            return new MediaProcessingResult(storedName, destinationPath);
        }

        if (IsVideoFile(extension))
        {
            storedName = $"{mediaId}.mp4";
            destinationPath = Path.Combine(targetDirectory, storedName);

            await ConvertVideoToMp4Async(file, destinationPath, extension, cancellationToken);
            return new MediaProcessingResult(storedName, destinationPath);
        }

        throw new MediaConversionException(UserSafeProcessingError);
    }

    public async Task<byte[]?> GeneratePreviewAsync(
        string sourcePath,
        string extension,
        CancellationToken cancellationToken = default)
    {
        if (IsVideoFile(extension))
        {
            return await GenerateVideoPreviewJpegAsync(sourcePath, cancellationToken);
        }

        if (IsGifFile(extension))
        {
            return GenerateGifPreviewJpeg(sourcePath);
        }

        return null;
    }

    private static bool IsImageFile(string extension) => ImageExtensions.Contains(extension);

    private static bool IsVideoFile(string extension) => VideoExtensions.Contains(extension);

    private static bool IsGifFile(string extension) => extension.Equals(".gif", StringComparison.OrdinalIgnoreCase);

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

    private async Task ConvertImageToWebpAsync(IFormFile file, string destinationPath, CancellationToken cancellationToken)
    {
        await using var inputStream = file.OpenReadStream();

        try
        {
            using var image = await Image.LoadAsync(inputStream, cancellationToken);
            BrowserSafeImageHelper.ResizeForBrowser(image);
            await image.SaveAsync(destinationPath, new WebpEncoder { Quality = 85 }, cancellationToken);
        }
        catch (UnknownImageFormatException ex)
        {
            logger.LogWarning(ex, "Unsupported image content during upload for file {FileName}", file.FileName);
            throw new MediaConversionException(UserSafeProcessingError);
        }
    }

    private async Task ConvertVideoToMp4Async(IFormFile file, string destinationPath, string sourceExtension, CancellationToken cancellationToken)
    {
        if (sourceExtension.Equals(".mp4", StringComparison.OrdinalIgnoreCase))
        {
            await using var stream = File.Create(destinationPath);
            await file.CopyToAsync(stream, cancellationToken);
            return;
        }

        var tempInputPath = Path.Combine(Path.GetTempPath(), $"gallery-upload-{Guid.NewGuid()}{sourceExtension}");

        try
        {
            await using (var tempInputStream = File.Create(tempInputPath))
            {
                await file.CopyToAsync(tempInputStream, cancellationToken);
            }

            var processStartInfo = new ProcessStartInfo
            {
                FileName = ResolveFfmpegExecutable(),
                Arguments = FfmpegArguments.BuildVideoConversion(tempInputPath, destinationPath),
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
            catch (Win32Exception ex)
            {
                logger.LogError(ex, "ffmpeg executable is not available for video conversion.");
                throw new MediaConversionException(UserSafeProcessingError);
            }

            var stdOutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stdErrTask = process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);
            _ = await stdOutTask;
            var stdErr = await stdErrTask;

            if (process.ExitCode != 0)
            {
                if (File.Exists(destinationPath))
                {
                    File.Delete(destinationPath);
                }

                logger.LogError(
                    "Video conversion failed for {FileName}. ffmpeg exit code: {ExitCode}. Error: {FfmpegError}",
                    file.FileName,
                    process.ExitCode,
                    FirstNonEmptyLine(stdErr));
                throw new MediaConversionException(UserSafeProcessingError);
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

    private byte[] GenerateGifPreviewJpeg(string sourcePath)
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
        catch (UnknownImageFormatException ex)
        {
            logger.LogWarning(ex, "Unsupported GIF content for preview generation: {SourcePath}", sourcePath);
            throw new MediaConversionException(UserSafeProcessingError);
        }
    }

    private async Task<byte[]> GenerateVideoPreviewJpegAsync(string sourcePath, CancellationToken cancellationToken)
    {
        try
        {
            var tempPreviewPath = Path.Combine(Path.GetTempPath(), $"gallery-preview-{Guid.NewGuid()}.jpg");
            try
            {
                var processStartInfo = new ProcessStartInfo
                {
                    FileName = ResolveFfmpegExecutable(),
                    Arguments = FfmpegArguments.BuildVideoPreview(sourcePath, tempPreviewPath),
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
                catch (Win32Exception ex)
                {
                    logger.LogError(ex, "ffmpeg executable is not available for preview generation.");
                    throw new MediaConversionException(UserSafeProcessingError);
                }

                var stdOutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
                var stdErrTask = process.StandardError.ReadToEndAsync(cancellationToken);
                var waitForExitTask = process.WaitForExitAsync(cancellationToken);
                var delayTask = Task.Delay(15000, cancellationToken);
                var completed = await Task.WhenAny(waitForExitTask, delayTask);
                _ = await stdOutTask;
                var stdErr = await stdErrTask;

                if (completed != waitForExitTask)
                {
                    try
                    {
                        process.Kill(entireProcessTree: true);
                    }
                    catch
                    {
                    }

                    logger.LogError("Video preview generation timed out for {SourcePath}", sourcePath);
                    throw new MediaConversionException(UserSafeProcessingError);
                }

                if (process.ExitCode != 0 || !File.Exists(tempPreviewPath))
                {
                    logger.LogError(
                        "Video preview generation failed for {SourcePath}. ffmpeg exit code: {ExitCode}. Error: {FfmpegError}",
                        sourcePath,
                        process.ExitCode,
                        FirstNonEmptyLine(stdErr));
                    throw new MediaConversionException(UserSafeProcessingError);
                }

                return await File.ReadAllBytesAsync(tempPreviewPath, cancellationToken);
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
            logger.LogError(ex, "I/O error during preview generation for {SourcePath}", sourcePath);
            throw new MediaConversionException(UserSafeProcessingError);
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
}
