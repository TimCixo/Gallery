export const createMediaDraft = () => ({
  title: "",
  description: "",
  source: "",
  parent: "",
  child: "",
  tagIds: []
});

export const getFileKey = (file) => `${file.name}::${file.size}::${file.lastModified}::${file.type}`;

export const isFileDragEvent = (event) => Array.from(event.dataTransfer?.types || []).includes("Files");

export const parseNullableId = (value, label) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label} must be a positive integer.`);
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
};
