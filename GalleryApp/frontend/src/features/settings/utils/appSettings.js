import { DEFAULT_RECOMMENDATION_SETTINGS, normalizeRecommendationSettings } from "./recommendationSettings.js";

export const DEFAULT_APP_SETTINGS = Object.freeze({
  groupRelatedMediaByDefault: false,
  defaultMediaFitMode: "resize",
  rememberLastOpenedPage: true,
  rememberSearchHistory: true,
  defaultQuickTaggingTags: "",
  defaultGroupUploadMode: false,
  mediaGridPageSize: 36,
  duplicatesPageSize: 12,
  showRelatedMediaStrip: true,
  confirmDestructiveActions: true,
  recommendationSettings: DEFAULT_RECOMMENDATION_SETTINGS
});

const ALLOWED_MEDIA_FIT_MODES = new Set(["resize", "height", "width"]);

function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

export function normalizeAppSettings(settings) {
  const defaultMediaFitMode = ALLOWED_MEDIA_FIT_MODES.has(settings?.defaultMediaFitMode)
    ? settings.defaultMediaFitMode
    : DEFAULT_APP_SETTINGS.defaultMediaFitMode;

  return {
    groupRelatedMediaByDefault: normalizeBoolean(settings?.groupRelatedMediaByDefault, DEFAULT_APP_SETTINGS.groupRelatedMediaByDefault),
    defaultMediaFitMode,
    rememberLastOpenedPage: normalizeBoolean(settings?.rememberLastOpenedPage, DEFAULT_APP_SETTINGS.rememberLastOpenedPage),
    rememberSearchHistory: normalizeBoolean(settings?.rememberSearchHistory, DEFAULT_APP_SETTINGS.rememberSearchHistory),
    defaultQuickTaggingTags: normalizeString(settings?.defaultQuickTaggingTags, DEFAULT_APP_SETTINGS.defaultQuickTaggingTags).trim(),
    defaultGroupUploadMode: normalizeBoolean(settings?.defaultGroupUploadMode, DEFAULT_APP_SETTINGS.defaultGroupUploadMode),
    mediaGridPageSize: normalizeNumber(settings?.mediaGridPageSize, DEFAULT_APP_SETTINGS.mediaGridPageSize, 12, 120),
    duplicatesPageSize: normalizeNumber(settings?.duplicatesPageSize, DEFAULT_APP_SETTINGS.duplicatesPageSize, 6, 60),
    showRelatedMediaStrip: normalizeBoolean(settings?.showRelatedMediaStrip, DEFAULT_APP_SETTINGS.showRelatedMediaStrip),
    confirmDestructiveActions: normalizeBoolean(settings?.confirmDestructiveActions, DEFAULT_APP_SETTINGS.confirmDestructiveActions),
    recommendationSettings: normalizeRecommendationSettings(settings?.recommendationSettings)
  };
}
