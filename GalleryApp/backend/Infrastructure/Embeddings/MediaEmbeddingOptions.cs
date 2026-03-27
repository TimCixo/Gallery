namespace GalleryApp.Api.Infrastructure.Embeddings;

public sealed record MediaEmbeddingOptions(
    string ModelsRootPath,
    string ModelPath,
    string ModelDownloadUrl);
