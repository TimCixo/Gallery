namespace GalleryApp.Api.Models.Domain;

public sealed record MediaMetadata(long Id,string RelativePath,string? Title,string? Description,string? Source,long? Parent,long? Child,bool IsFavorite);
