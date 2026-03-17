const MAX_SEARCH_HISTORY_ITEMS = 5;

export function normalizeSearchHistory(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, MAX_SEARCH_HISTORY_ITEMS);
}

export function addSearchHistoryItem(history, nextValue) {
  const normalizedValue = String(nextValue || "").trim();
  if (!normalizedValue) {
    return normalizeSearchHistory(history);
  }

  return normalizeSearchHistory([normalizedValue, ...normalizeSearchHistory(history)]);
}
