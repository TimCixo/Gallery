namespace GalleryApp.Api.Models.Pagination;

public sealed record PagedRequest(int? Page, int? PageSize);
