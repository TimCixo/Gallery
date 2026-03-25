export function getAutocompleteNextState({ direction, activeIndex, optionCount, isOptionActive }) {
  if (optionCount <= 0) {
    return {
      activeIndex: 0,
      isOptionActive: false
    };
  }

  if (direction === "next") {
    if (!isOptionActive) {
      return {
        activeIndex: 0,
        isOptionActive: true
      };
    }

    return {
      activeIndex: (activeIndex + 1) % optionCount,
      isOptionActive: true
    };
  }

  if (!isOptionActive) {
    return {
      activeIndex: optionCount - 1,
      isOptionActive: true
    };
  }

  return {
    activeIndex: (activeIndex - 1 + optionCount) % optionCount,
    isOptionActive: true
  };
}

export function shouldAutocompleteCommit({ isOpen, optionCount, key, commitKeys = ["Tab"] }) {
  return Boolean(isOpen) && optionCount > 0 && commitKeys.includes(key);
}

export function shouldAutocompleteClose({ isOpen, key }) {
  return key === "Escape" && Boolean(isOpen);
}
