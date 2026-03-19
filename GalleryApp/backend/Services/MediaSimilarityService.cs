using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Models.Domain;

namespace GalleryApp.Api.Services;

public sealed class MediaSimilarityService(
    MediaRepository mediaRepository,
    MediaStorageOptions mediaStorageOptions,
    ImageHashService imageHashService)
{
    public const int DefaultMaxDistance = 8;

    private readonly SemaphoreSlim _backfillLock = new(1, 1);

    public async Task BackfillMissingHashesAsync(CancellationToken cancellationToken = default)
    {
        await _backfillLock.WaitAsync(cancellationToken);
        try
        {
            var missingItems = mediaRepository.GetMediaWithoutImageHash();
            foreach (var item in missingItems)
            {
                cancellationToken.ThrowIfCancellationRequested();
                await EnsureImageHashAsync(item.Id, item.Path, cancellationToken);
            }
        }
        finally
        {
            _backfillLock.Release();
        }
    }

    public async Task UpdateImageHashAsync(long mediaId, string relativePath, CancellationToken cancellationToken = default)
    {
        await EnsureImageHashAsync(mediaId, relativePath, cancellationToken);
    }

    public async Task<IReadOnlyList<MediaSimilarityResult>> GetSimilarMediaAsync(
        long mediaId,
        int maxDistance = DefaultMaxDistance,
        CancellationToken cancellationToken = default)
    {
        if (mediaId <= 0)
        {
            return [];
        }

        await BackfillMissingHashesAsync(cancellationToken);

        var source = mediaRepository.GetMediaImageHashRecord(mediaId);
        if (source is null || string.IsNullOrWhiteSpace(source.Path))
        {
            return [];
        }

        if (!TryResolveImagePath(source.Path, out var _, out _))
        {
            return [];
        }

        var sourceHash = source.ImageHash;
        if (string.IsNullOrWhiteSpace(sourceHash))
        {
            sourceHash = await EnsureImageHashAsync(source.Id, source.Path, cancellationToken);
            if (string.IsNullOrWhiteSpace(sourceHash))
            {
                return [];
            }
        }

        var candidates = mediaRepository.GetMediaWithImageHashExcluding(mediaId);
        var matchedCandidates = candidates
            .Select(candidate => new
            {
                Candidate = candidate,
                Distance = imageHashService.GetHammingDistance(sourceHash, candidate.ImageHash!)
            })
            .Where(item => item.Distance <= maxDistance)
            .OrderBy(item => item.Distance)
            .ThenByDescending(item => item.Candidate.Id)
            .ToArray();

        if (matchedCandidates.Length == 0)
        {
            return [];
        }

        var rows = mediaRepository.GetMediaByIds(matchedCandidates.Select(item => item.Candidate.Id).ToArray());
        var rowsById = rows.ToDictionary(row => row.Id);
        var tagsByMediaId = mediaRepository.GetMediaTags(rowsById.Keys.ToArray());
        var results = new List<MediaSimilarityResult>();

        foreach (var match in matchedCandidates)
        {
            if (!rowsById.TryGetValue(match.Candidate.Id, out var row))
            {
                continue;
            }

            var item = MediaListItemBuilder.TryBuild(row, tagsByMediaId, mediaStorageOptions);
            if (item is null)
            {
                continue;
            }

            results.Add(new MediaSimilarityResult(item, match.Distance, match.Distance == 0));
        }

        return results;
    }

    private async Task<string?> EnsureImageHashAsync(long mediaId, string relativePath, CancellationToken cancellationToken)
    {
        if (!TryResolveImagePath(relativePath, out var absolutePath, out _))
        {
            mediaRepository.UpdateImageHash(mediaId, null);
            return null;
        }

        try
        {
            var hash = await imageHashService.ComputeDHashHexAsync(absolutePath, cancellationToken);
            mediaRepository.UpdateImageHash(mediaId, hash);
            return hash;
        }
        catch
        {
            mediaRepository.UpdateImageHash(mediaId, null);
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
}

public sealed record MediaSimilarityResult(MediaListItem Item, int Distance, bool IsExactMatch);
