import { requestJson, toServiceError } from "./serviceClient";

export const uploadApi = {
  updateUploadedMedia: async (mediaId, payload) => {
    try {
      return await requestJson(`/api/media/${mediaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw toServiceError(error, "Failed to save uploaded media metadata.", "UPLOAD_METADATA_FAILED");
    }
  }
};
