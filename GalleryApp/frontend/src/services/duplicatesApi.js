import { requestJson, toServiceError } from "./serviceClient";

const toQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export const duplicatesApi = {
  listDuplicateGroups: async ({ page, pageSize, signal, timeoutMs }) => {
    try {
      return await requestJson(`/api/media/duplicates${toQuery({ page, pageSize })}`, { signal, timeoutMs });
    } catch (error) {
      throw toServiceError(error, "Failed to fetch duplicate groups.", "DUPLICATE_GROUPS_LIST_FAILED");
    }
  },
  excludeDuplicateMedia: async (groupKey, mediaId) => {
    try {
      return await requestJson(`/api/media/duplicates/${encodeURIComponent(groupKey)}/exclude`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId })
      });
    } catch (error) {
      throw toServiceError(error, "Failed to exclude media from duplicate group.", "DUPLICATE_GROUP_EXCLUDE_FAILED");
    }
  },
  restoreDuplicateMedia: async (groupKey, mediaId) => {
    try {
      return await requestJson(`/api/media/duplicates/${encodeURIComponent(groupKey)}/exclude/${mediaId}`, {
        method: "DELETE"
      });
    } catch (error) {
      throw toServiceError(error, "Failed to restore media to duplicate group.", "DUPLICATE_GROUP_RESTORE_FAILED");
    }
  },
  mergeDuplicateGroup: async (groupKey, parentMediaId) => {
    try {
      return await requestJson(`/api/media/duplicates/${encodeURIComponent(groupKey)}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentMediaId })
      });
    } catch (error) {
      throw toServiceError(error, "Failed to merge duplicate group.", "DUPLICATE_GROUP_MERGE_FAILED");
    }
  },
  deleteDuplicateGroupItems: async (groupKey, payload) => {
    try {
      return await requestJson(`/api/media/duplicates/${encodeURIComponent(groupKey)}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw toServiceError(error, "Failed to delete duplicates.", "DUPLICATE_GROUP_DELETE_FAILED");
    }
  }
};
