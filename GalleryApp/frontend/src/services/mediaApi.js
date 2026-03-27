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

export const mediaApi = {
  getHealth: async () => {
    try {
      return await requestJson("/api/health");
    } catch (error) {
      throw toServiceError(error, "Failed to load health status.", "HEALTH_FETCH_FAILED");
    }
  },
  listMedia: async ({ page, pageSize, search, signal, timeoutMs }) => {
    try {
      return await requestJson(`/api/media${toQuery({ page, pageSize, search })}`, { signal, timeoutMs });
    } catch (error) {
      throw toServiceError(error, "Failed to fetch media files.", "MEDIA_LIST_FAILED");
    }
  },
  listFavorites: async ({ page, pageSize, signal, timeoutMs }) => {
    try {
      return await requestJson(`/api/favorites${toQuery({ page, pageSize })}`, { signal, timeoutMs });
    } catch (error) {
      throw toServiceError(error, "Failed to fetch favorites.", "FAVORITES_LIST_FAILED");
    }
  },
  listRecommendedMedia: async (mediaId, { signal, timeoutMs } = {}) => {
    try {
      return await requestJson(`/api/media/${mediaId}/similar`, { signal, timeoutMs });
    } catch (error) {
      throw toServiceError(error, "Failed to fetch recommended media.", "RECOMMENDED_MEDIA_LIST_FAILED");
    }
  },
  listSimilarMedia: async (mediaId, options = {}) => mediaApi.listRecommendedMedia(mediaId, options),
  setFavorite: async (mediaId, isFavorite) => {
    try {
      return await requestJson(`/api/media/${mediaId}/favorite`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite })
      });
    } catch (error) {
      throw toServiceError(error, "Failed to update favorite.", "FAVORITE_UPDATE_FAILED");
    }
  },
  updateMedia: async (mediaId, payload) => {
    try {
      return await requestJson(`/api/media/${mediaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw toServiceError(error, "Failed to update media.", "MEDIA_UPDATE_FAILED");
    }
  },
  deleteMedia: async (mediaId) => {
    try {
      return await requestJson(`/api/media/${mediaId}`, { method: "DELETE" });
    } catch (error) {
      throw toServiceError(error, "Failed to delete media.", "MEDIA_DELETE_FAILED");
    }
  }
};
