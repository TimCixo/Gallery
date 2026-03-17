using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace GalleryApp.Api.Services;

public static class BrowserSafeImageHelper
{
    public const int MaxBrowserImageDimension = 16383;

    public static bool RequiresBrowserSafeViewTranscode(string extension, int width, int height, int maxDimension = MaxBrowserImageDimension)
    {
        return extension.Equals(".webp", StringComparison.OrdinalIgnoreCase) || RequiresResize(width, height, maxDimension);
    }

    public static bool RequiresResize(int width, int height, int maxDimension = MaxBrowserImageDimension)
    {
        return width > maxDimension || height > maxDimension;
    }

    public static Size GetSafeDimensions(int width, int height, int maxDimension = MaxBrowserImageDimension)
    {
        if (width <= 0 || height <= 0)
        {
            return new Size(1, 1);
        }

        if (!RequiresResize(width, height, maxDimension))
        {
            return new Size(width, height);
        }

        var scale = Math.Min((double)maxDimension / width, (double)maxDimension / height);
        var scaledWidth = Math.Max(1, (int)Math.Round(width * scale, MidpointRounding.AwayFromZero));
        var scaledHeight = Math.Max(1, (int)Math.Round(height * scale, MidpointRounding.AwayFromZero));

        return new Size(scaledWidth, scaledHeight);
    }

    public static void ResizeForBrowser(Image image, int maxDimension = MaxBrowserImageDimension)
    {
        var safeSize = GetSafeDimensions(image.Width, image.Height, maxDimension);
        if (safeSize.Width == image.Width && safeSize.Height == image.Height)
        {
            return;
        }

        image.Mutate((context) => context.Resize(new ResizeOptions
        {
            Mode = ResizeMode.Max,
            Size = safeSize
        }));
    }
}
