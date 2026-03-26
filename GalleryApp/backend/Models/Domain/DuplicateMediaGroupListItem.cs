namespace GalleryApp.Api.Models.Domain;

public sealed record DuplicateMediaGroupListItem(
    string GroupKey,
    string ImageHash,
    long? ParentMediaId,
    IReadOnlyList<MediaListItem> Items,
    IReadOnlyList<MediaListItem> ExcludedItems);
