import { httpRequest } from "./httpClient";

/** @typedef {{ id:number, title?:string|null, description?:string|null, source?:string|null, parent?:number|null, child?:number|null }} MediaItem */
/** @typedef {{ files?: MediaItem[], items?: MediaItem[], page?: number, totalPages?: number, totalCount?: number }} MediaListResponse */
/** @typedef {{ title: string|null, description: string|null, source: string|null, tagIds: number[], parent: number|null, child: number|null }} UpdateMediaPayload */

export const mediaApi = {
  /** @returns {Promise<{status:string,timestampUtc:string}>} */
  getHealth: () => httpRequest("/api/health"),
  /** @param {{page:number,pageSize:number,search?:string,signal?:AbortSignal,timeoutMs?:number}} params @returns {Promise<MediaListResponse>} */
  listMedia: ({ page, pageSize, search, signal, timeoutMs }) => httpRequest("/api/media", {
    query: { page, pageSize, search },
    signal,
    timeoutMs
  }),
  /** @param {{page:number,pageSize:number}} params @returns {Promise<MediaListResponse>} */
  listFavorites: ({ page, pageSize }) => httpRequest("/api/favorites", { query: { page, pageSize } }),
  /** @param {number} mediaId @param {UpdateMediaPayload} payload */
  updateMedia: (mediaId, payload) => httpRequest(`/api/media/${mediaId}`, { method: "PUT", body: payload }),
  /** @param {number} mediaId */
  deleteMedia: (mediaId) => httpRequest(`/api/media/${mediaId}`, { method: "DELETE" }),
  /** @param {number} mediaId @param {boolean} isFavorite */
  setFavorite: (mediaId, isFavorite) => httpRequest(`/api/media/${mediaId}/favorite`, {
    method: "PATCH",
    body: { isFavorite }
  })
};
