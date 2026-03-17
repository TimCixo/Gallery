import { requestJson, toServiceError } from "./serviceClient";

export const uploadApi = {
  uploadFiles: async (files) => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      return await requestJson("/api/upload", {
        method: "POST",
        body: formData,
        timeoutMs: 120000
      });
    } catch (error) {
      throw toServiceError(error, "Failed to upload files.", "UPLOAD_FILES_FAILED");
    }
  },
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
