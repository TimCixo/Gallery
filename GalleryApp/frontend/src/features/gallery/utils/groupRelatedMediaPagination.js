import { groupRelatedMediaItems } from "./groupRelatedMediaItems.js";

export function buildGroupedMediaPagination(items, page, pageSize) {
  const groupedItems = groupRelatedMediaItems(items);
  const normalizedPageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 1;
  const totalCount = groupedItems.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / normalizedPageSize);
  const effectivePage = totalPages === 0 ? 1 : Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = totalPages === 0 ? 0 : (effectivePage - 1) * normalizedPageSize;

  return {
    items: groupedItems.slice(startIndex, startIndex + normalizedPageSize),
    totalCount,
    totalPages,
    page: effectivePage
  };
}
