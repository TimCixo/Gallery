export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".jfif", ".png", ".webp", ".bmp"]);
export const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]);
export const ALLOWED_MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ".gif"]);

export const getExtensionFromPath = (value) => {
  if (!value) {
    return "";
  }

  const cleanValue = String(value).split("?")[0];
  const dotIndex = cleanValue.lastIndexOf(".");
  return dotIndex >= 0 ? cleanValue.slice(dotIndex).toLowerCase() : "";
};

export const resolveOriginalMediaUrl = (file) => file?.displayUrl || file?.originalUrl || file?.url || file?._tileUrl || "";

export const resolveTileUrl = (file) => {
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

  if (IMAGE_EXTENSIONS.has(getExtensionFromPath(original))) {
    return original;
  }

  if ((file?.mediaType === "video" || file?.mediaType === "gif") && file?.relativePath) {
    return `/api/media/preview?path=${encodeURIComponent(file.relativePath)}`;
  }

  return "";
};

export const getMediaIdentity = (file) => {
  if (!file || typeof file !== "object") {
    return "";
  }

  const id = Number(file.id);
  if (Number.isSafeInteger(id) && id > 0) {
    return `id:${id}`;
  }

  const path = String(file.relativePath || "").trim();
  if (path) {
    return `path:${path}`;
  }

  return "";
};

export const isVideoFile = (file) => {
  if (!file) {
    return false;
  }

  if (file.mediaType === "video") {
    return true;
  }

  return VIDEO_EXTENSIONS.has(getExtensionFromPath(resolveOriginalMediaUrl(file) || file.name));
};
