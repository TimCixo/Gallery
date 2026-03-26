namespace GalleryApp.Api.Models.Requests;

public sealed record DuplicateGroupDeleteRequest(long ParentMediaId, IReadOnlyList<long>? MediaIds);
