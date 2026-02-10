namespace GalleryApp.Api.Models.Pagination;

public sealed record PagedResult<T>(
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    T[] Items);
