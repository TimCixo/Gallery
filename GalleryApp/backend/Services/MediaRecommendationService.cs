using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Models.Domain;
using GalleryApp.Api.Services.Embeddings;

namespace GalleryApp.Api.Services;

public sealed class MediaRecommendationService(
    MediaRepository mediaRepository,
    MediaEmbeddingRepository mediaEmbeddingRepository,
    MediaStorageOptions mediaStorageOptions,
    IImageEmbeddingGenerator imageEmbeddingGenerator)
{
    public const int DefaultRecommendationCount = 8;

    private readonly SemaphoreSlim _backfillLock = new(1, 1);

    public async Task BackfillMissingEmbeddingsAsync(CancellationToken cancellationToken = default)
    {
        await _backfillLock.WaitAsync(cancellationToken);
        try
        {
            var missingItems = mediaEmbeddingRepository.GetMediaWithoutEmbedding(imageEmbeddingGenerator.ModelKey);
            foreach (var item in missingItems)
            {
                cancellationToken.ThrowIfCancellationRequested();
                await EnsureEmbeddingAsync(item.MediaId, item.Path, cancellationToken);
            }
        }
        finally
        {
            _backfillLock.Release();
        }
    }

    public async Task UpdateEmbeddingAsync(long mediaId, string relativePath, CancellationToken cancellationToken = default)
    {
        await EnsureEmbeddingAsync(mediaId, relativePath, cancellationToken);
    }

    public async Task<IReadOnlyList<RecommendedMediaResult>> GetRecommendedMediaAsync(
        long mediaId,
        int take = DefaultRecommendationCount,
        CancellationToken cancellationToken = default)
    {
        if (mediaId <= 0 || take <= 0)
        {
            return [];
        }

        await BackfillMissingEmbeddingsAsync(cancellationToken);

        var source = mediaEmbeddingRepository.GetMediaEmbedding(mediaId);
        if (source is null || string.IsNullOrWhiteSpace(source.Path))
        {
            return [];
        }

        if (!TryResolveImagePath(source.Path, out _, out _))
        {
            return [];
        }

        var sourceVector = source.ModelKey == imageEmbeddingGenerator.ModelKey && source.Vector.Length > 0
            ? source.Vector
            : await EnsureEmbeddingAsync(source.MediaId, source.Path, cancellationToken);
        if (sourceVector is null || sourceVector.Length == 0)
        {
            return [];
        }

        var matchedCandidates = mediaEmbeddingRepository
            .GetEmbeddingsExcluding(mediaId, imageEmbeddingGenerator.ModelKey)
            .Select(candidate => new
            {
                candidate.MediaId,
                Score = Dot(sourceVector, candidate.Vector)
            })
            .OrderByDescending(item => item.Score)
            .ThenByDescending(item => item.MediaId)
            .Take(take)
            .ToArray();

        if (matchedCandidates.Length == 0)
        {
            return [];
        }

        var rows = mediaRepository.GetMediaByIds(matchedCandidates.Select(item => item.MediaId).ToArray());
        var rowsById = rows.ToDictionary(row => row.Id);
        var tagsByMediaId = mediaRepository.GetMediaTags(rowsById.Keys.ToArray());
        var results = new List<RecommendedMediaResult>(matchedCandidates.Length);

        foreach (var match in matchedCandidates)
        {
            if (!rowsById.TryGetValue(match.MediaId, out var row))
            {
                continue;
            }

            var item = MediaListItemBuilder.TryBuild(row, tagsByMediaId, mediaStorageOptions);
            if (item is null)
            {
                continue;
            }

            results.Add(new RecommendedMediaResult(item, match.Score));
        }

        return results;
    }

    private async Task<float[]?> EnsureEmbeddingAsync(long mediaId, string relativePath, CancellationToken cancellationToken)
    {
        if (!TryResolveImagePath(relativePath, out var absolutePath, out _))
        {
            mediaEmbeddingRepository.DeleteEmbedding(mediaId);
            return null;
        }

        try
        {
            var embedding = await imageEmbeddingGenerator.GenerateEmbeddingAsync(absolutePath, cancellationToken);
            if (embedding is null || embedding.Length == 0)
            {
                mediaEmbeddingRepository.DeleteEmbedding(mediaId);
                return null;
            }

            mediaEmbeddingRepository.UpsertEmbedding(mediaId, imageEmbeddingGenerator.ModelKey, embedding);
            return embedding;
        }
        catch
        {
            mediaEmbeddingRepository.DeleteEmbedding(mediaId);
            return null;
        }
    }

    private bool TryResolveImagePath(string relativePath, out string absolutePath, out string extension)
    {
        absolutePath = string.Empty;
        extension = string.Empty;

        if (!MediaFileHelper.TryResolveMediaFilePath(mediaStorageOptions.RootPath, relativePath, out absolutePath, out extension))
        {
            return false;
        }

        return MediaFileHelper.IsImageFile(extension);
    }

    private static float Dot(float[] left, float[] right)
    {
        var length = Math.Min(left.Length, right.Length);
        var total = 0f;
        for (var index = 0; index < length; index++)
        {
            total += left[index] * right[index];
        }

        return total;
    }
}
