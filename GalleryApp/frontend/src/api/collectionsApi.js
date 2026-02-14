import { httpRequest } from "./httpClient";

/** @typedef {{id:number,label:string,description?:string,coverMediaId?:number|null}} CollectionItem */
/** @typedef {{label:string,description:string,coverMediaId:number|null}} CollectionPayload */

export const collectionsApi = {
  /** @param {{search?:string,mediaId?:number}} [params] @returns {Promise<{items: CollectionItem[]}>} */
  listCollections: (params = {}) => httpRequest("/api/collections", { query: params }),
  /** @param {number} collectionId @param {{page:number,pageSize:number}} params */
  listCollectionMedia: (collectionId, params) => httpRequest(`/api/collections/${collectionId}/media`, { query: params }),
  /** @param {CollectionPayload} payload */
  createCollection: (payload) => httpRequest("/api/collections", { method: "POST", body: payload }),
  /** @param {number} collectionId @param {CollectionPayload} payload */
  updateCollection: (collectionId, payload) => httpRequest(`/api/collections/${collectionId}`, { method: "PATCH", body: payload }),
  /** @param {number} collectionId */
  deleteCollection: (collectionId) => httpRequest(`/api/collections/${collectionId}`, { method: "DELETE" }),
  /** @param {number} collectionId @param {number} mediaId */
  addMediaToCollection: (collectionId, mediaId) => httpRequest(`/api/collections/${collectionId}/media`, {
    method: "POST",
    body: { mediaId }
  })
};
