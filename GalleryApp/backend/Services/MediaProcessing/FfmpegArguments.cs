namespace GalleryApp.Api.Services.MediaProcessing;

internal static class FfmpegArguments
{
    public static string BuildVideoConversion(string inputPath, string outputPath)
    {
        return $"-y -i \"{inputPath}\" -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart \"{outputPath}\"";
    }

    public static string BuildVideoPreview(string sourcePath, string previewPath)
    {
        return $"-y -ss 00:00:00.500 -i \"{sourcePath}\" -frames:v 1 -update 1 -q:v 3 -vf \"scale=640:-1\" \"{previewPath}\"";
    }
}
