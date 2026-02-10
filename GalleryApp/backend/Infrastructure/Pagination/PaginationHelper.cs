using GalleryApp.Api.Models.Pagination;

namespace GalleryApp.Api.Infrastructure.Pagination;

public static class PaginationHelper
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 36;
    public const int MinPage = 1;
    public const int MinPageSize = 1;
    public const int MaxPageSize = 100;

    public static PagedResult<T> CreatePagedResult<T>(IReadOnlyList<T> source, PagedRequest request)
    {
        var normalizedPage = Math.Max(request.Page ?? DefaultPage, MinPage);
        var normalizedPageSize = Math.Clamp(request.PageSize ?? DefaultPageSize, MinPageSize, MaxPageSize);

        var totalCount = source.Count;
        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)normalizedPageSize);

        var effectivePage = totalPages == 0
            ? DefaultPage
            : Math.Min(normalizedPage, totalPages);

        var skip = totalPages == 0
            ? 0
            : (effectivePage - 1) * normalizedPageSize;

        var items = source
            .Skip(skip)
            .Take(normalizedPageSize)
            .ToArray();

        return new PagedResult<T>(
            Page: effectivePage,
            PageSize: normalizedPageSize,
            TotalCount: totalCount,
            TotalPages: totalPages,
            Items: items);
    }
}
