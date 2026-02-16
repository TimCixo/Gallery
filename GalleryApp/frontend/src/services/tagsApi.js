import { requestJson, toServiceError } from "./serviceClient";

export const tagsApi = {
  listTagTypes: async () => {
    try {
      return await requestJson("/api/tag-types");
    } catch (error) {
      throw toServiceError(error, "Failed to fetch tag types.", "TAG_TYPES_LIST_FAILED");
    }
  },
  listTags: async () => {
    try {
      return await requestJson("/api/tags");
    } catch (error) {
      throw toServiceError(error, "Failed to fetch tags.", "TAGS_LIST_FAILED");
    }
  },
  listTagsByTagType: async (tagTypeId) => {
    try {
      return await requestJson(`/api/tag-types/${tagTypeId}/tags`);
    } catch (error) {
      throw toServiceError(error, "Failed to fetch tags.", "TAGS_BY_TYPE_LIST_FAILED");
    }
  },
  createTagType: async (payload) => {
    try {
      return await requestJson("/api/tag-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw toServiceError(error, "Failed to create tag type.", "TAG_TYPE_CREATE_FAILED");
    }
  },
  updateTagType: async (tagTypeId, payload) => {
    try {
      return await requestJson(`/api/tag-types/${tagTypeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw toServiceError(error, "Failed to update tag type.", "TAG_TYPE_UPDATE_FAILED");
    }
  },
  deleteTagType: async (tagTypeId) => {
    try {
      return await requestJson(`/api/tag-types/${tagTypeId}`, { method: "DELETE" });
    } catch (error) {
      throw toServiceError(error, "Failed to delete tag type.", "TAG_TYPE_DELETE_FAILED");
    }
  },
  createTag: async (tagTypeId, payload) => {
    try {
      return await requestJson(`/api/tag-types/${tagTypeId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw toServiceError(error, "Failed to create tag.", "TAG_CREATE_FAILED");
    }
  },
  updateTag: async (tagId, payload) => {
    try {
      return await requestJson(`/api/tags/${tagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw toServiceError(error, "Failed to update tag.", "TAG_UPDATE_FAILED");
    }
  },
  deleteTag: async (tagId) => {
    try {
      return await requestJson(`/api/tags/${tagId}`, { method: "DELETE" });
    } catch (error) {
      throw toServiceError(error, "Failed to delete tag.", "TAG_DELETE_FAILED");
    }
  },
  moveTagToType: async (tagId, tagTypeId) => {
    try {
      return await requestJson(`/api/tags/${tagId}/tag-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagTypeId })
      });
    } catch (error) {
      throw toServiceError(error, "Failed to move tag.", "TAG_MOVE_FAILED");
    }
  }
};
