namespace GalleryApp.Api.Models.Requests;

public sealed record CollectionCreateRequest(string? Label, string? Description, long? Cover);
