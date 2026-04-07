using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Models.Domain;

namespace GalleryApp.Api.Services;

internal static class MediaListItemBuilder
{
    public static MediaListItem? TryBuild(
        MediaRepository.MediaRow row,
        IReadOnlyDictionary<long, IReadOnlyList<MediaTagListItem>> tagsByMediaId,
        MediaStorageOptions mediaStorageOptions)
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
            row.HasCollections,
            displayUrl,
            originalUrl,
            tileUrl,
            mediaType,
            tagsByMediaId.TryGetValue(row.Id, out var tags) ? tags : [],
            fileInfo.Length,
            fileInfo.LastWriteTimeUtc);
    }
}
