import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from "../../features/settings/utils/appSettings.js";

const SETTINGS_KEY = "gallery.app-settings";

export function loadPersistedSettings(storage = globalThis?.localStorage) {
  if (!storage) {
    return { ...DEFAULT_APP_SETTINGS };
  }

  try {
    const rawValue = storage.getItem(SETTINGS_KEY);
    if (!rawValue) {
      return { ...DEFAULT_APP_SETTINGS };
    }

    const parsed = JSON.parse(rawValue);
    return normalizeAppSettings(parsed);
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function persistSettings(settings, storage = globalThis?.localStorage) {
  if (!storage) {
    return;
  }

  storage.setItem(SETTINGS_KEY, JSON.stringify({
    ...normalizeAppSettings(settings)
  }));
}
