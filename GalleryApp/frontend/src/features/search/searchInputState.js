export function getNextSuggestionState({ direction, activeIndex, suggestionCount, isSuggestionActive }) {
  if (suggestionCount <= 0) {
    return {
      activeIndex: 0,
      isSuggestionActive: false
    };
  }

  if (direction === "next") {
    if (!isSuggestionActive) {
      return {
        activeIndex: 0,
        isSuggestionActive: true
      };
    }

    return {
      activeIndex: (activeIndex + 1) % suggestionCount,
      isSuggestionActive: true
    };
  }

  if (!isSuggestionActive) {
    return {
      activeIndex: suggestionCount - 1,
      isSuggestionActive: true
    };
  }

  return {
    activeIndex: (activeIndex - 1 + suggestionCount) % suggestionCount,
    isSuggestionActive: true
  };
}

export function shouldApplySuggestionOnTab({ isSuggestionListOpen, suggestionCount }) {
  return Boolean(isSuggestionListOpen) && suggestionCount > 0;
}

export function shouldCloseSuggestionListOnEscape({ isSuggestionListOpen }) {
  return Boolean(isSuggestionListOpen);
}
