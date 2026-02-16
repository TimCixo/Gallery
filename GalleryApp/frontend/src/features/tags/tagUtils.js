export const getTagId = (tag) => {
  const value = Number(tag?.id);
  return Number.isInteger(value) && value > 0 ? value : null;
};

export const getTagTypeId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parseTagNamesList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getMediaTagColor = (tag) => {
  const value = String(tag?.tagTypeColor || "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#94a3b8";
};
