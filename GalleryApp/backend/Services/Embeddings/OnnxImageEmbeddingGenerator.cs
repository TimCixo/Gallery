using GalleryApp.Api.Infrastructure.Embeddings;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using SixLabors.ImageSharp.Advanced;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace GalleryApp.Api.Services.Embeddings;

public sealed class OnnxImageEmbeddingGenerator(
    MediaEmbeddingOptions options,
    HttpClient httpClient) : IImageEmbeddingGenerator, IDisposable
{
    private const string InputName = "pixel_values";
    private const string OutputName = "image_embeds";
    private const int InputSize = 224;

    private static readonly float[] Mean = [0.48145466f, 0.4578275f, 0.40821073f];
    private static readonly float[] Std = [0.26862954f, 0.26130258f, 0.27577711f];

    private readonly SemaphoreSlim _sessionLock = new(1, 1);
    private InferenceSession? _session;

    public string ModelKey => "xenova/clip-vit-base-patch32-vision-quantized";

    public async Task<float[]?> GenerateEmbeddingAsync(string absolutePath, CancellationToken cancellationToken = default)
    {
        var session = await GetSessionAsync(cancellationToken);
        var input = CreateInputTensor(absolutePath);
        var tensor = new DenseTensor<float>(input, [1, 3, InputSize, InputSize]);
        using var results = session.Run([NamedOnnxValue.CreateFromTensor(InputName, tensor)]);
        var output = results.FirstOrDefault(result => string.Equals(result.Name, OutputName, StringComparison.Ordinal));
        var embedding = output?.AsEnumerable<float>().ToArray();
        return embedding is null || embedding.Length == 0
            ? null
            : Normalize(embedding);
    }

    public void Dispose()
    {
        _session?.Dispose();
        _sessionLock.Dispose();
    }

    private async Task<InferenceSession> GetSessionAsync(CancellationToken cancellationToken)
    {
        if (_session is not null)
        {
            return _session;
        }

        await _sessionLock.WaitAsync(cancellationToken);
        try
        {
            if (_session is not null)
            {
                return _session;
            }

            Directory.CreateDirectory(options.ModelsRootPath);
            await EnsureModelDownloadedAsync(cancellationToken);
            _session = new InferenceSession(options.ModelPath);
            return _session;
        }
        finally
        {
            _sessionLock.Release();
        }
    }

    private async Task EnsureModelDownloadedAsync(CancellationToken cancellationToken)
    {
        if (File.Exists(options.ModelPath))
        {
            return;
        }

        var tempPath = $"{options.ModelPath}.download";
        using var response = await httpClient.GetAsync(options.ModelDownloadUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using (var source = await response.Content.ReadAsStreamAsync(cancellationToken))
        await using (var target = File.Create(tempPath))
        {
            await source.CopyToAsync(target, cancellationToken);
        }

        if (File.Exists(options.ModelPath))
        {
            File.Delete(options.ModelPath);
        }

        File.Move(tempPath, options.ModelPath);
    }

    private static float[] CreateInputTensor(string absolutePath)
    {
        using var image = Image.Load<Rgb24>(absolutePath);
        ResizeAndCrop(image);

        var input = new float[3 * InputSize * InputSize];
        for (var y = 0; y < InputSize; y++)
        {
            var row = image.DangerousGetPixelRowMemory(y).Span;
            for (var x = 0; x < InputSize; x++)
            {
                var pixel = row[x];
                var pixelOffset = y * InputSize + x;
                input[pixelOffset] = NormalizeChannel(pixel.R, 0);
                input[(InputSize * InputSize) + pixelOffset] = NormalizeChannel(pixel.G, 1);
                input[(2 * InputSize * InputSize) + pixelOffset] = NormalizeChannel(pixel.B, 2);
            }
        }

        return input;
    }

    private static void ResizeAndCrop(Image<Rgb24> image)
    {
        var scale = InputSize / (float)Math.Min(image.Width, image.Height);
        var width = Math.Max(InputSize, (int)Math.Round(image.Width * scale));
        var height = Math.Max(InputSize, (int)Math.Round(image.Height * scale));
        image.Mutate(context => context.Resize(width, height));

        var cropX = Math.Max(0, (image.Width - InputSize) / 2);
        var cropY = Math.Max(0, (image.Height - InputSize) / 2);
        image.Mutate(context => context.Crop(new Rectangle(cropX, cropY, InputSize, InputSize)));
    }

    private static float NormalizeChannel(byte value, int channelIndex)
    {
        var rescaled = value / 255f;
        return (rescaled - Mean[channelIndex]) / Std[channelIndex];
    }

    private static float[] Normalize(float[] vector)
    {
        var length = MathF.Sqrt(vector.Sum(value => value * value));
        if (length <= 0f)
        {
            return vector;
        }

        for (var index = 0; index < vector.Length; index++)
        {
            vector[index] /= length;
        }

        return vector;
    }
}
