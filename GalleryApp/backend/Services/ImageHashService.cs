using System.Globalization;
using System.Numerics;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace GalleryApp.Api.Services;

public sealed class ImageHashService
{
    public const int HashBits = 64;

    public async Task<string?> ComputeDHashHexAsync(string absolutePath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(absolutePath) || !File.Exists(absolutePath))
        {
            return null;
        }

        using var image = await Image.LoadAsync<L8>(absolutePath, cancellationToken);
        image.Mutate(context => context.Resize(9, 8));

        ulong hash = 0;
        var bitIndex = 0;
        for (var y = 0; y < image.Height; y++)
        {
            for (var x = 0; x < image.Width - 1; x++)
            {
                var left = image[x, y].PackedValue;
                var right = image[x + 1, y].PackedValue;
                if (left > right)
                {
                    hash |= 1UL << bitIndex;
                }

                bitIndex++;
            }
        }

        return hash.ToString("X16", CultureInfo.InvariantCulture);
    }

    public int GetHammingDistance(string leftHashHex, string rightHashHex)
    {
        var left = ParseHash(leftHashHex);
        var right = ParseHash(rightHashHex);
        return BitOperations.PopCount(left ^ right);
    }

    private static ulong ParseHash(string hashHex)
    {
        if (string.IsNullOrWhiteSpace(hashHex))
        {
            throw new ArgumentException("Hash value is required.", nameof(hashHex));
        }

        return ulong.Parse(hashHex, NumberStyles.HexNumber, CultureInfo.InvariantCulture);
    }
}
