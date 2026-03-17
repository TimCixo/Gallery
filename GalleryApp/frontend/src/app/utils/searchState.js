import { formatSearchTagValue } from "../../features/shared/utils/searchUtils.js";

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

export function applySearchSuggestionToValue({ inputValue, suggestion, searchTokenRange }) {
  const currentValue = String(inputValue || "");
  if (!suggestion) {
    return {
      nextValue: currentValue,
      nextCaret: currentValue.length
    };
  }

  const prefix = currentValue.slice(0, searchTokenRange.start);
  const suffix = currentValue.slice(searchTokenRange.end);
  const currentToken = currentValue.slice(searchTokenRange.start, searchTokenRange.end);
  const operatorPrefix = currentToken.trimStart().startsWith("-") ? "-" : "";
  let insertedToken = `${operatorPrefix}${suggestion.tagName}:`;

  if (suggestion.kind === "tagValue") {
    insertedToken = `${operatorPrefix}${suggestion.tagName}:${formatSearchTagValue(suggestion.tagValue)}`;
    if (!suffix.startsWith(" ")) {
      insertedToken += " ";
    }
  }

  return {
    nextValue: `${prefix}${insertedToken}${suffix}`,
    nextCaret: prefix.length + insertedToken.length
  };
}
