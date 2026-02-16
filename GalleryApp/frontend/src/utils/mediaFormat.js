import { getExtensionFromPath, isVideoFile, resolveOriginalMediaUrl } from "./mediaIdentity.js";

export const formatMediaDate = (value) => {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
};

export const formatFileSize = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "-";
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(fractionDigits)} ${units[unitIndex]} (${bytes.toLocaleString()} B)`;
};

export const getMediaShortType = (file) => {
  const source = resolveOriginalMediaUrl(file) || file?.name || "";
  const extension = getExtensionFromPath(source);
  if (extension === ".gif") {
    return "gif";
  }

  if (isVideoFile(file)) {
    return "vid";
  }

  return "img";
};
