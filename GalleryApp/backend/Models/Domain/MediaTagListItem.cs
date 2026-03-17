namespace GalleryApp.Api.Models.Domain;

public sealed record MediaTagListItem(
    long Id,
    string Name,
    string? Description,
    long TagTypeId,
    string TagTypeName,
    string TagTypeColor);
