import { normalizeSearchHistory } from "./searchHistory.js";

const SHELL_STATE_KEY = "gallery.app-shell-state";

const DEFAULT_SHELL_STATE = {
  activePage: "gallery",
  inputValue: "",
  submittedText: "",
  searchHistory: []
};

export function loadPersistedShellState(storage = globalThis?.sessionStorage) {
  if (!storage) {
    return { ...DEFAULT_SHELL_STATE };
  }

  try {
    const rawValue = storage.getItem(SHELL_STATE_KEY);
    if (!rawValue) {
      return { ...DEFAULT_SHELL_STATE };
    }

    const parsed = JSON.parse(rawValue);
    const activePage = ["gallery", "favorites", "collections", "tags"].includes(parsed?.activePage)
      ? parsed.activePage
      : DEFAULT_SHELL_STATE.activePage;

    return {
      activePage,
      inputValue: String(parsed?.inputValue || ""),
      submittedText: String(parsed?.submittedText || ""),
      searchHistory: normalizeSearchHistory(parsed?.searchHistory)
    };
  } catch {
    return { ...DEFAULT_SHELL_STATE };
  }
}

export function persistShellState(state, storage = globalThis?.sessionStorage) {
  if (!storage) {
    return;
  }

  storage.setItem(SHELL_STATE_KEY, JSON.stringify({
    activePage: state?.activePage || DEFAULT_SHELL_STATE.activePage,
    inputValue: String(state?.inputValue || ""),
    submittedText: String(state?.submittedText || ""),
    searchHistory: normalizeSearchHistory(state?.searchHistory)
  }));
}
