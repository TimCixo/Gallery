export function paginateMediaItems(items, page, pageSize) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const normalizedPageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 1;
  const totalCount = normalizedItems.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / normalizedPageSize);
  const effectivePage = totalPages === 0 ? 1 : Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = totalPages === 0 ? 0 : (effectivePage - 1) * normalizedPageSize;

  return {
    items: normalizedItems.slice(startIndex, startIndex + normalizedPageSize),
    totalCount,
    totalPages,
    page: effectivePage
  };
}
