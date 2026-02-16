import { requestJson, toServiceError } from "./serviceClient";

const toQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export const collectionsApi = {
  listCollections: async (params = {}) => {
    try {
      return await requestJson(`/api/collections${toQuery(params)}`);
    } catch (error) {
      throw toServiceError(error, "Failed to fetch collections.", "COLLECTIONS_LIST_FAILED");
    }
  },
  listCollectionMedia: async (collectionId, { page, pageSize }) => {
    try {
      return await requestJson(`/api/collections/${collectionId}/media?page=${page}&pageSize=${pageSize}`);
    } catch (error) {
      throw toServiceError(error, "Failed to fetch collection media.", "COLLECTION_MEDIA_LIST_FAILED");
    }
  },
  saveCollection: async (collectionId, payload) => {
    try {
      const endpoint = collectionId ? `/api/collections/${collectionId}` : "/api/collections";
      return await requestJson(endpoint, {
        method: collectionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw toServiceError(error, "Failed to save collection.", "COLLECTION_SAVE_FAILED");
    }
  },
  deleteCollection: async (collectionId) => {
    try {
      return await requestJson(`/api/collections/${collectionId}`, { method: "DELETE" });
    } catch (error) {
      throw toServiceError(error, "Failed to delete collection.", "COLLECTION_DELETE_FAILED");
    }
  },
  addMediaToCollection: async (collectionId, mediaId) => {
    try {
      return await requestJson(`/api/collections/${collectionId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId })
      });
    } catch (error) {
      throw toServiceError(error, "Failed to add media to collection.", "COLLECTION_ADD_MEDIA_FAILED");
    }
  }
};
