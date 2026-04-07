namespace GalleryApp.Api.Models.Domain;

public sealed record MediaListItem(
    long Id,
    string Name,
    string RelativePath,
    string? Title,
    string? Description,
    string? Source,
    long? Parent,
    long? Child,
    bool IsFavorite,
    bool HasCollections,
    string DisplayUrl,
    string OriginalUrl,
    string TileUrl,
    string MediaType,
    IReadOnlyList<MediaTagListItem> Tags,
    long SizeBytes,
    DateTime ModifiedAtUtc);
