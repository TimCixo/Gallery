export function resolvePagedMediaNavigation({ currentIndex, itemCount, currentPage, totalPages, offset }) {
  if (
    !Number.isInteger(currentIndex)
    || currentIndex < 0
    || !Number.isInteger(itemCount)
    || itemCount <= 0
    || !Number.isInteger(currentPage)
    || currentPage <= 0
    || !Number.isInteger(totalPages)
    || totalPages <= 0
    || !Number.isInteger(offset)
    || offset === 0
  ) {
    return null;
  }

  const nextIndex = currentIndex + offset;
  if (nextIndex >= 0 && nextIndex < itemCount) {
    return { type: "item", index: nextIndex };
  }

  if (offset > 0 && currentPage < totalPages) {
    return { type: "page", page: currentPage + 1, select: "first" };
  }

  if (offset < 0 && currentPage > 1) {
    return { type: "page", page: currentPage - 1, select: "last" };
  }

  return {
    type: "item",
    index: ((nextIndex % itemCount) + itemCount) % itemCount
  };
}
