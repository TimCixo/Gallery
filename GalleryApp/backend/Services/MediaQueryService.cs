using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Data.Search;
using GalleryApp.Api.Infrastructure.Pagination;
using GalleryApp.Api.Models.Domain;
using GalleryApp.Api.Models.Pagination;

namespace GalleryApp.Api.Services;

public sealed class MediaQueryService(
    MediaRepository mediaRepository,
    MediaStorageOptions mediaStorageOptions,
    PreviewCacheService previewCacheService)
{
    public PagedResult<MediaListItem> GetPagedMedia(MediaSearchCriteria? criteria, bool favoritesOnly, PagedRequest request)
    {
        var normalizedPage = Math.Max(request.Page ?? PaginationHelper.DefaultPage, PaginationHelper.MinPage);
        var normalizedPageSize = Math.Clamp(request.PageSize ?? PaginationHelper.DefaultPageSize, PaginationHelper.MinPageSize, PaginationHelper.MaxPageSize);
        var pageData = mediaRepository.GetPagedMedia(criteria, favoritesOnly, normalizedPage, normalizedPageSize);
        var tagsByMediaId = mediaRepository.GetMediaTags(pageData.Rows.Select(row => row.Id).ToArray());

        return new PagedResult<MediaListItem>(
            pageData.Page,
            pageData.PageSize,
            pageData.TotalCount,
            pageData.TotalPages,
            pageData.Rows
                .Select(row => TryBuildItem(row, tagsByMediaId))
                .Where(item => item is not null)
                .Select(item => item!)
                .ToArray());
    }

    public PagedResult<MediaListItem> GetPagedCollectionMedia(long collectionId, PagedRequest request)
    {
        var normalizedPage = Math.Max(request.Page ?? PaginationHelper.DefaultPage, PaginationHelper.MinPage);
        var normalizedPageSize = Math.Clamp(request.PageSize ?? PaginationHelper.DefaultPageSize, PaginationHelper.MinPageSize, PaginationHelper.MaxPageSize);
        var pageData = mediaRepository.GetPagedCollectionMedia(collectionId, normalizedPage, normalizedPageSize);
        var tagsByMediaId = mediaRepository.GetMediaTags(pageData.Rows.Select(row => row.Id).ToArray());

        return new PagedResult<MediaListItem>(
            pageData.Page,
            pageData.PageSize,
            pageData.TotalCount,
            pageData.TotalPages,
            pageData.Rows
                .Select(row => TryBuildItem(row, tagsByMediaId))
                .Where(item => item is not null)
                .Select(item => item!)
                .ToArray());
    }

    public void WarmPagePreviews(IEnumerable<string> relativePaths)
    {
        var paths = relativePaths
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (paths.Length == 0)
        {
            return;
        }

        _ = Task.Run(async () =>
        {
            foreach (var path in paths)
            {
                try
                {
                    await previewCacheService.WarmExistingAsync(path);
                }
                catch
                {
                }
            }
        });
    }

    private MediaListItem? TryBuildItem(
        MediaRepository.MediaRow row,
        IReadOnlyDictionary<long, IReadOnlyList<MediaTagListItem>> tagsByMediaId)
    {
        var normalizedPath = row.Path.Replace("\\", "/");
        if (!MediaFileHelper.TryResolveMediaFilePath(mediaStorageOptions.RootPath, normalizedPath, out var absolutePath, out var extension))
        {
            return null;
        }

        var fileInfo = new FileInfo(absolutePath);
        var mediaType = MediaFileHelper.IsImageFile(extension) ? "image" : MediaFileHelper.IsVideoFile(extension) ? "video" : "file";
        var originalUrl = MediaFileHelper.BuildMediaUrl(normalizedPath);
        var displayUrl = MediaFileHelper.IsImageFile(extension) && !MediaFileHelper.IsGifFile(extension)
            ? MediaFileHelper.BuildDisplayUrl(normalizedPath)
            : originalUrl;
        var tileUrl = MediaFileHelper.BuildTileUrl(normalizedPath, fileInfo.LastWriteTimeUtc.Ticks);

        return new MediaListItem(
            row.Id,
            Path.GetFileName(normalizedPath),
            normalizedPath,
            row.Title,
            row.Description,
            row.Source,
            row.Parent,
            row.Child,
            row.IsFavorite,
            displayUrl,
            originalUrl,
            tileUrl,
            mediaType,
            tagsByMediaId.TryGetValue(row.Id, out var tags) ? tags : [],
            fileInfo.Length,
            fileInfo.LastWriteTimeUtc);
    }
}
