import { httpRequest } from "./httpClient";

/** @typedef {{id:number,name:string,color?:string}} TagType */
/** @typedef {{id:number,name:string,tagTypeId:number}} Tag */

export const tagsApi = {
  /** @returns {Promise<{items: TagType[]}>} */
  listTagTypes: () => httpRequest("/api/tag-types"),
  /** @returns {Promise<{items: Tag[]}>} */
  listTags: () => httpRequest("/api/tags"),
  /** @param {number} tagTypeId @returns {Promise<{items: Tag[]}>} */
  listTagsByTagType: (tagTypeId) => httpRequest(`/api/tag-types/${tagTypeId}/tags`),
  /** @param {{name:string,color:string}} payload */
  createTagType: (payload) => httpRequest("/api/tag-types", { method: "POST", body: payload }),
  /** @param {number} tagTypeId @param {{name:string,color:string}} payload */
  updateTagType: (tagTypeId, payload) => httpRequest(`/api/tag-types/${tagTypeId}`, { method: "PATCH", body: payload }),
  /** @param {number} tagTypeId */
  deleteTagType: (tagTypeId) => httpRequest(`/api/tag-types/${tagTypeId}`, { method: "DELETE" }),
  /** @param {number} tagTypeId @param {{name:string}} payload */
  createTag: (tagTypeId, payload) => httpRequest(`/api/tag-types/${tagTypeId}/tags`, { method: "POST", body: payload }),
  /** @param {number} tagId @param {{name:string}} payload */
  updateTag: (tagId, payload) => httpRequest(`/api/tags/${tagId}`, { method: "PATCH", body: payload }),
  /** @param {number} tagId */
  deleteTag: (tagId) => httpRequest(`/api/tags/${tagId}`, { method: "DELETE" }),
  /** @param {number} tagId @param {number} tagTypeId */
  moveTagToType: (tagId, tagTypeId) => httpRequest(`/api/tags/${tagId}/tag-type`, {
    method: "PATCH",
    body: { tagTypeId }
  })
};
