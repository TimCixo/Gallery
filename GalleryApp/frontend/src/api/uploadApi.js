import { mediaApi } from "./mediaApi";

/**
 * @typedef {{ title: string|null, description: string|null, source: string|null, tagIds?: number[], parent: number|null, child: number|null }} UploadMediaPayload
 */

/**
 * API helpers for post-upload metadata flows.
 */
export const uploadApi = {
  /** @param {number} mediaId @param {UploadMediaPayload} payload */
  updateUploadedMedia: (mediaId, payload) => mediaApi.updateMedia(mediaId, {
    tagIds: Array.isArray(payload.tagIds) ? payload.tagIds : [],
    ...payload
  })
};
