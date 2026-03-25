import { useEffect, useMemo, useRef, useState } from "react";
import { parseTagNamesList } from "../../tags/tagUtils";
import { parseSearchSegments } from "../../shared/utils/searchUtils";
import { buildSearchTagTypeOptions } from "../../shared/utils/tagUtils";
import { applyTagListAutocompleteSuggestion, buildTagListAutocompleteSuggestions, getTagListTokenRange } from "../utils/tagListAutocomplete";

export default function TagNamesAutocompleteInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  tagCatalog,
  disabled = false
}) {
  const inputRef = useRef(null);
  const highlightRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caret, setCaret] = useState(String(value || "").length);
  const tagTypeOptions = useMemo(() => buildSearchTagTypeOptions([], Array.isArray(tagCatalog) ? tagCatalog : []), [tagCatalog]);
  const searchTagTypeMap = useMemo(() => new Map(tagTypeOptions.map((option) => [option.lowerName, option])), [tagTypeOptions]);
  const highlightSegments = useMemo(() => parseSearchSegments({
    value,
    baseSearchTagNames: new Set(),
    searchTagTypeMap,
    searchTagOptions: tagTypeOptions.map((option) => option.lowerName),
    mediaTagCatalog: Array.isArray(tagCatalog) ? tagCatalog : []
  }), [searchTagTypeMap, tagCatalog, tagTypeOptions, value]);
  const suggestions = useMemo(() => {
    const tokenRange = getTagListTokenRange(value, caret);
    const selectedNames = parseTagNamesList(value).filter((name) => name.toLowerCase() !== String(tokenRange.token || "").trim().toLowerCase());
    return buildTagListAutocompleteSuggestions({
      value,
      caret,
      tagCatalog,
      selectedNames
    });
  }, [caret, tagCatalog, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions.length, value]);

  const listboxId = `${id}-suggestions`;
  const isSuggestionsVisible = isOpen && suggestions.length > 0;

  const syncHighlightScroll = () => {
    if (!inputRef.current || !highlightRef.current) {
      return;
    }

    highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
  };

  useEffect(() => {
    syncHighlightScroll();
  }, [value]);

  const commitSuggestion = (suggestion) => {
    const nextState = applyTagListAutocompleteSuggestion({
      value,
      caret,
      suggestion
    });
    onChange(nextState.value);
    setCaret(nextState.caret);
    setIsOpen(true);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextState.caret, nextState.caret);
    }, 0);
  };

  return (
    <div className="media-quick-tagging-field">
      <label htmlFor={id}>{label}</label>
      <div className="media-quick-tagging-input-wrap">
        <div ref={highlightRef} className="media-quick-tagging-input-highlight" aria-hidden="true">
          {value ? (
            highlightSegments.map((segment, index) => (
              <span
                key={`${id}-segment-${index}-${segment.text}`}
                className={segment.isTag ? "media-quick-tagging-input-segment is-tag" : "media-quick-tagging-input-segment"}
                style={segment.isTag && segment.color ? { outlineColor: segment.color } : undefined}
              >
                {segment.text}
              </span>
            ))
          ) : (
            <span className="media-quick-tagging-input-placeholder">{placeholder}</span>
          )}
        </div>
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="media-quick-tagging-input"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isSuggestionsVisible}
          aria-controls={isSuggestionsVisible ? listboxId : undefined}
          onFocus={(event) => {
            setCaret(event.target.selectionStart ?? event.target.value.length);
            setIsOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onClick={(event) => {
            setCaret(event.currentTarget.selectionStart ?? event.currentTarget.value.length);
          }}
          onKeyUp={(event) => {
            setCaret(event.currentTarget.selectionStart ?? event.currentTarget.value.length);
          }}
          onChange={(event) => {
            setCaret(event.target.selectionStart ?? event.target.value.length);
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onScroll={syncHighlightScroll}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
              return;
            }

            if (!suggestions.length) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => (current + 1) % suggestions.length);
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
              return;
            }

            if ((event.key === "Enter" || event.key === "Tab") && isSuggestionsVisible) {
              event.preventDefault();
              commitSuggestion(suggestions[activeIndex] || suggestions[0]);
            }
          }}
        />
        {isSuggestionsVisible ? (
          <ul id={listboxId} className="media-tag-dropdown" role="listbox">
            {suggestions.map((suggestion, index) => (
              <li key={`${id}-${suggestion.key}`}>
                <button
                  type="button"
                  className={`media-tag-dropdown-item${index === activeIndex ? " is-active" : ""}`}
                  style={suggestion.color ? { outlineColor: suggestion.color } : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitSuggestion(suggestion)}
                >
                  <span>{suggestion.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
