export function getSubmittedSearchText(inputValue) {
  return String(inputValue || "").trim();
}

export function createGalleryBrandNavigationState(currentState = {}) {
  return {
    activePage: "gallery",
    inputValue: String(currentState.inputValue || ""),
    submittedText: String(currentState.submittedText || "")
  };
}

export function getSearchSuggestionSelection(searchSuggestions, activeSearchSuggestionIndex) {
  if (!Array.isArray(searchSuggestions) || searchSuggestions.length === 0) {
    return null;
  }

  const normalizedIndex = Math.max(0, Math.min(activeSearchSuggestionIndex, searchSuggestions.length - 1));
  return searchSuggestions[normalizedIndex] || null;
}
