import { requestJson, toServiceError } from "./serviceClient";

export const favoritesApi = {
  listFavorites: async ({ page, pageSize }) => {
    try {
      return await requestJson(`/api/favorites?page=${page}&pageSize=${pageSize}`);
    } catch (error) {
      throw toServiceError(error, "Failed to fetch favorites.", "FAVORITES_LIST_FAILED");
    }
  },
  setFavorite: async (mediaId, isFavorite) => {
    try {
      return await requestJson(`/api/media/${mediaId}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite })
      });
    } catch (error) {
      throw toServiceError(error, "Failed to update favorite.", "FAVORITE_UPDATE_FAILED");
    }
  }
};
