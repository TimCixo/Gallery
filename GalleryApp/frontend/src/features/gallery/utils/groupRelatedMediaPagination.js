import { groupRelatedMediaItems } from "./groupRelatedMediaItems.js";
import { paginateMediaItems } from "./paginateMediaItems.js";

export function buildGroupedMediaPagination(items, page, pageSize) {
  return paginateMediaItems(groupRelatedMediaItems(items), page, pageSize);
}
