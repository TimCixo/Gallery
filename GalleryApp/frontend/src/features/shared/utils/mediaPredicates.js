import { getExtensionFromPath } from "./mediaFormatters";

const videoExtensions = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]);
const imageExtensions = new Set([".jpg", ".jpeg", ".jfif", ".png", ".webp", ".bmp"]);

export const resolveOriginalMediaUrl = (file) => file?.displayUrl || file?.originalUrl || file?.url || file?._tileUrl || "";

export const resolveTileMediaUrl = (file) => {
  if (file?.tileUrl) {
    return file.tileUrl;
  }

  if (file?.previewUrl) {
    return file.previewUrl;
  }

  const original = file?.originalUrl || file?.url || "";
  if (file?.mediaType === "image" && original) {
    return original;
  }

  if (imageExtensions.has(getExtensionFromPath(original))) {
    return original;
  }

  if ((file?.mediaType === "video" || file?.mediaType === "gif") && file?.relativePath) {
    return `/api/media/preview?path=${encodeURIComponent(file.relativePath)}`;
  }

  return "";
};

export const resolvePreviewMediaUrl = (file) => {
  if (!file) {
    return "";
  }

  if (file.previewUrl) {
    return file.previewUrl;
  }

  if (file._tileUrl) {
    return file._tileUrl;
  }

  return resolveTileMediaUrl(file) || resolveOriginalMediaUrl(file);
};

export const isVideoFile = (file) => {
  if (!file) {
    return false;
  }

  if (file.mediaType === "video") {
    return true;
  }

  return videoExtensions.has(getExtensionFromPath(resolveOriginalMediaUrl(file) || file.name));
};
