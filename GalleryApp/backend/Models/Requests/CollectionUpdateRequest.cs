namespace GalleryApp.Api.Models.Requests;

public sealed record CollectionUpdateRequest(string? Label, string? Description, long? Cover);
