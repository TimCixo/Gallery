namespace GalleryApp.Api.Models.Requests;

public sealed record MediaUpdateRequest(string? Title,string? Description,string? Source,long? Parent,long? Child,IReadOnlyList<long>? TagIds);
