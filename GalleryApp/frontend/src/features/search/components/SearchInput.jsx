import { useEffect, useId, useRef, useState } from "react";
import { getSearchTokenRange } from "../../shared/utils/searchUtils";
import { getSearchSuggestionSelection } from "../../../app/utils/searchState";
import {
  getNextSuggestionState,
  shouldApplySuggestionOnTab,
  shouldCloseSuggestionListOnEscape
} from "../searchInputState";

export default function SearchInput({
  value,
  placeholder,
  highlightSegments,
  suggestions,
  suggestionsEnabled,
  historyItems,
  helpText,
  onValueChange,
  onCaretChange,
  onApplySuggestion,
  onSelectHistory,
  onClearHistory
}) {
  const searchInputRef = useRef(null);
  const searchHighlightRef = useRef(null);
  const [searchCaretPosition, setSearchCaretPosition] = useState(0);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [isSuggestionListOpen, setIsSuggestionListOpen] = useState(false);
  const [activeSearchSuggestionIndex, setActiveSearchSuggestionIndex] = useState(0);
  const [isSearchSuggestionExplicitlyActive, setIsSearchSuggestionExplicitlyActive] = useState(false);
  const comboboxId = useId();
  const listboxId = `${comboboxId}-listbox`;
  const hintId = `${comboboxId}-hint`;
  const optionIdPrefix = `${comboboxId}-option`;

  const syncSearchHighlightScroll = () => {
    if (!searchInputRef.current || !searchHighlightRef.current) {
      return;
    }

    searchHighlightRef.current.scrollLeft = searchInputRef.current.scrollLeft;
  };

  const resetSuggestionSelection = () => {
    setActiveSearchSuggestionIndex(0);
    setIsSearchSuggestionExplicitlyActive(false);
  };

  const updateCaretPosition = (nextCaretPosition) => {
    setSearchCaretPosition(nextCaretPosition);
    onCaretChange(nextCaretPosition);
  };

  const openSuggestions = suggestionsEnabled && isSearchInputFocused && isSuggestionListOpen;
  const normalizedHistoryItems = Array.isArray(historyItems) ? historyItems : [];
  const historyOptions = normalizedHistoryItems.map((item, index) => ({
    kind: "history",
    key: `history-${index}-${item}`,
    label: item,
    value: item
  }));
  const hasTypedValue = value.trim() !== "";
  const displayedOptions = hasTypedValue ? [...suggestions, ...historyOptions] : historyOptions;
  const shouldShowSuggestionsSection = openSuggestions && hasTypedValue && suggestions.length > 0;
  const shouldShowHistory = openSuggestions && historyOptions.length > 0;
  const hasDisplayedOptions = displayedOptions.length > 0;
  const isDropdownOpen = openSuggestions && hasDisplayedOptions;
  const activeSuggestion = isSearchSuggestionExplicitlyActive
    ? getSearchSuggestionSelection(displayedOptions, activeSearchSuggestionIndex)
    : null;
  const activeDescendant = activeSuggestion ? `${optionIdPrefix}-${activeSuggestion.key}` : undefined;

  const applySuggestion = (suggestion) => {
    if (!suggestion) {
      return;
    }

    if (suggestion.kind === "history") {
      onSelectHistory(suggestion.value);
      resetSuggestionSelection();
      setIsSuggestionListOpen(true);
      requestAnimationFrame(() => {
        if (!searchInputRef.current) {
          return;
        }

        const nextCaret = suggestion.value.length;
        searchInputRef.current.focus();
        searchInputRef.current.setSelectionRange(nextCaret, nextCaret);
        updateCaretPosition(nextCaret);
      });
      return;
    }

    const { nextCaret } = onApplySuggestion({
      suggestion,
      searchTokenRange: getSearchTokenRange(value, searchCaretPosition)
    });

    updateCaretPosition(nextCaret);
    resetSuggestionSelection();
    setIsSuggestionListOpen(true);

    requestAnimationFrame(() => {
      if (!searchInputRef.current) {
        return;
      }

      searchInputRef.current.focus();
      searchInputRef.current.setSelectionRange(nextCaret, nextCaret);
      syncSearchHighlightScroll();
    });
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    const nextCaretPosition = event.target.selectionStart ?? nextValue.length;
    onValueChange(nextValue);
    updateCaretPosition(nextCaretPosition);
    resetSuggestionSelection();
    setIsSuggestionListOpen(true);
  };

  const handleInputFocus = (event) => {
    setIsSearchInputFocused(true);
    setIsSuggestionListOpen(true);
    updateCaretPosition(event.target.selectionStart ?? value.length);
  };

  const handleInputBlur = () => {
    setIsSearchInputFocused(false);
    setIsSuggestionListOpen(false);
    resetSuggestionSelection();
  };

  const handleCaretChange = (event) => {
    updateCaretPosition(event.target.selectionStart ?? event.target.value.length);
    setIsSuggestionListOpen(true);
    setIsSearchSuggestionExplicitlyActive(false);
  };

  const handleInputKeyUp = (event) => {
    if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(event.key)) {
      return;
    }

    handleCaretChange(event);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "ArrowDown" && hasDisplayedOptions) {
      event.preventDefault();
      const nextState = getNextSuggestionState({
        direction: "next",
        activeIndex: activeSearchSuggestionIndex,
        suggestionCount: displayedOptions.length,
        isSuggestionActive: isSearchSuggestionExplicitlyActive
      });
      setActiveSearchSuggestionIndex(nextState.activeIndex);
      setIsSearchSuggestionExplicitlyActive(nextState.isSuggestionActive);
      return;
    }

    if (event.key === "ArrowUp" && hasDisplayedOptions) {
      event.preventDefault();
      const nextState = getNextSuggestionState({
        direction: "previous",
        activeIndex: activeSearchSuggestionIndex,
        suggestionCount: displayedOptions.length,
        isSuggestionActive: isSearchSuggestionExplicitlyActive
      });
      setActiveSearchSuggestionIndex(nextState.activeIndex);
      setIsSearchSuggestionExplicitlyActive(nextState.isSuggestionActive);
      return;
    }

    if (event.key === "Tab" && shouldApplySuggestionOnTab({ isSuggestionListOpen: openSuggestions, suggestionCount: displayedOptions.length })) {
      event.preventDefault();
      applySuggestion(getSearchSuggestionSelection(displayedOptions, activeSearchSuggestionIndex));
      return;
    }

    if (event.key === "Escape" && shouldCloseSuggestionListOnEscape({ isSuggestionListOpen: openSuggestions })) {
      event.preventDefault();
      setIsSuggestionListOpen(false);
      resetSuggestionSelection();
    }
  };

  useEffect(() => {
    syncSearchHighlightScroll();
  }, [value]);

  useEffect(() => {
    if (activeSearchSuggestionIndex < displayedOptions.length) {
      return;
    }

    resetSuggestionSelection();
  }, [activeSearchSuggestionIndex, displayedOptions.length]);

  useEffect(() => {
    if (suggestionsEnabled) {
      return;
    }

    setIsSuggestionListOpen(false);
    resetSuggestionSelection();
  }, [suggestionsEnabled]);

  return (
    <div className="top-search-field">
      <div className="top-input-wrap">
        <div ref={searchHighlightRef} className="top-input-highlight" aria-hidden="true">
          {value ? (
            highlightSegments.map((segment, index) => (
              <span
                key={`${index}-${segment.text}`}
                className={segment.isTag ? "top-input-segment is-tag" : "top-input-segment"}
                style={segment.isTag && segment.color ? { outlineColor: segment.color } : undefined}
              >
                {segment.text}
              </span>
            ))
          ) : (
            <span className="top-input-placeholder">{placeholder}</span>
          )}
        </div>
        <input
          ref={searchInputRef}
          className="top-input"
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onClick={handleCaretChange}
          onKeyUp={handleInputKeyUp}
          onKeyDown={handleInputKeyDown}
          onScroll={syncSearchHighlightScroll}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={suggestionsEnabled ? listboxId : undefined}
          aria-expanded={isDropdownOpen}
          aria-activedescendant={activeDescendant}
          aria-describedby={suggestionsEnabled && isSearchInputFocused ? hintId : undefined}
        />
        {isDropdownOpen ? (
          <ul id={listboxId} className="top-search-suggestions" role="listbox">
            {shouldShowSuggestionsSection ? (
              <li className="top-search-suggestions-toolbar" role="presentation">
                <span className="top-search-suggestions-title">Suggestions</span>
              </li>
            ) : null}
            {shouldShowSuggestionsSection
              ? suggestions.map((suggestion, index) => {
                  const isActive = isSearchSuggestionExplicitlyActive && index === activeSearchSuggestionIndex;
                  return (
                    <li key={suggestion.key} role="presentation">
                      <button
                        id={`${optionIdPrefix}-${suggestion.key}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={`top-search-suggestion${isActive ? " is-active" : ""}`}
                        style={suggestion.color ? { outlineColor: suggestion.color } : undefined}
                        onMouseEnter={() => {
                          setActiveSearchSuggestionIndex(index);
                          setIsSearchSuggestionExplicitlyActive(true);
                        }}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applySuggestion(suggestion);
                        }}
                      >
                        {suggestion.label}
                      </button>
                    </li>
                  );
                })
              : null}
            {shouldShowHistory ? (
              <li className="top-search-suggestions-toolbar" role="presentation">
                <span className="top-search-suggestions-title">Recent</span>
                <button
                  type="button"
                  className="top-search-history-clear"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onClearHistory();
                    resetSuggestionSelection();
                    setIsSuggestionListOpen(false);
                  }}
                >
                  Clear
                </button>
              </li>
            ) : null}
            {historyOptions.map((suggestion, index) => {
              const optionIndex = shouldShowSuggestionsSection ? suggestions.length + index : index;
              const isActive = isSearchSuggestionExplicitlyActive && index === activeSearchSuggestionIndex;
              return (
                <li key={suggestion.key} role="presentation">
                  <button
                    id={`${optionIdPrefix}-${suggestion.key}`}
                    type="button"
                    role="option"
                    aria-selected={isSearchSuggestionExplicitlyActive && optionIndex === activeSearchSuggestionIndex}
                    className={`top-search-suggestion is-history${isSearchSuggestionExplicitlyActive && optionIndex === activeSearchSuggestionIndex ? " is-active" : ""}`}
                    style={suggestion.color ? { outlineColor: suggestion.color } : undefined}
                    onMouseEnter={() => {
                      setActiveSearchSuggestionIndex(optionIndex);
                      setIsSearchSuggestionExplicitlyActive(true);
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applySuggestion(suggestion);
                    }}
                  >
                    {suggestion.label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      {suggestionsEnabled && isSearchInputFocused ? (
        <p id={hintId} className="sr-only">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
