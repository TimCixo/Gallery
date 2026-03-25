export const DEFAULT_MEDIA_REFERENCE_KEYS = Object.freeze(["parent", "child"]);

export function getNormalizedMediaReferenceModes(keys = DEFAULT_MEDIA_REFERENCE_KEYS) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return [...DEFAULT_MEDIA_REFERENCE_KEYS];
  }

  const normalizedKeys = keys.map((key) => String(key || "").trim()).filter(Boolean);
  return normalizedKeys.length > 0 ? normalizedKeys : [...DEFAULT_MEDIA_REFERENCE_KEYS];
}

export function getMediaReferenceModesSignature(keys = DEFAULT_MEDIA_REFERENCE_KEYS) {
  return getNormalizedMediaReferenceModes(keys).join("|");
}

export function getMediaReferenceValueSignature(valueByMode, keys = DEFAULT_MEDIA_REFERENCE_KEYS) {
  return getNormalizedMediaReferenceModes(keys)
    .map((key) => String(valueByMode?.[key] || "").trim())
    .join("|");
}

export function createMediaReferencePreviewState(keys = DEFAULT_MEDIA_REFERENCE_KEYS) {
  return keys.reduce((result, key) => ({
    ...result,
    [key]: { item: null, isLoading: false, error: "" }
  }), {});
}

export function normalizeMediaReferenceMode(mode, allowedModes = DEFAULT_MEDIA_REFERENCE_KEYS) {
  return allowedModes.includes(mode) ? mode : allowedModes[0] || "parent";
}

export function normalizeMediaReferenceValue(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  const parsed = Number.parseInt(text, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : NaN;
}
