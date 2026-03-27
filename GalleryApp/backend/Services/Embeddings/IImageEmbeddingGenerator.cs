namespace GalleryApp.Api.Services.Embeddings;

public interface IImageEmbeddingGenerator
{
    string ModelKey { get; }

    Task<float[]?> GenerateEmbeddingAsync(string absolutePath, CancellationToken cancellationToken = default);
}
