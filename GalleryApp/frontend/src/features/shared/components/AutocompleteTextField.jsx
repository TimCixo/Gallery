import { useEffect, useMemo, useRef } from "react";
import { useAutocompleteField } from "../hooks/useAutocompleteField";

export default function AutocompleteTextField({
  id,
  value,
  placeholder,
  disabled = false,
  suggestionsEnabled = true,
  highlightSegments = [],
  sections = [],
  helpText = "",
  onValueChange,
  onCaretChange,
  onApplyOption,
  closeOnBlurDelayMs = 0,
  commitKeys = ["Tab"],
  rootClassName,
  wrapClassName,
  highlightClassName,
  segmentClassName,
  tagSegmentClassName,
  placeholderClassName,
  inputClassName,
  dropdownClassName,
  toolbarClassName,
  titleClassName,
  actionClassName,
  optionClassName,
  label,
  labelClassName
}) {
  const inputRef = useRef(null);
  const highlightRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const normalizedSections = Array.isArray(sections) ? sections.filter((section) => Array.isArray(section?.items) && section.items.length > 0) : [];
  const flatOptions = useMemo(
    () => normalizedSections.flatMap((section) => section.items),
    [normalizedSections]
  );
  const field = useAutocompleteField({
    optionCount: flatOptions.length,
    onCaretChange,
    commitKeys,
    isEnabled: suggestionsEnabled && !disabled
  });

  const syncHighlightScroll = () => {
    if (!inputRef.current || !highlightRef.current) {
      return;
    }

    highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
  };

  useEffect(() => {
    syncHighlightScroll();
  }, [value]);

  useEffect(() => () => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
    }
  }, []);

  const isDropdownOpen = suggestionsEnabled && field.isFocused && field.isOpen && flatOptions.length > 0;
  const activeOption = field.isOptionActive ? flatOptions[field.activeIndex] || null : null;
  const activeDescendant = activeOption ? `${field.optionIdPrefix}-${activeOption.key}` : undefined;

  const commitOption = (optionIndex) => {
    const option = flatOptions[optionIndex] || flatOptions[0];
    if (!option) {
      return;
    }

    const result = onApplyOption?.({
      option,
      caret: field.caret,
      value
    }) || {};
    const nextCaret = Number.isInteger(result.nextCaret) ? result.nextCaret : field.caret;
    field.updateCaret(nextCaret);
    field.resetActiveOption();
    if (result.keepOpen === false) {
      field.close();
    } else {
      field.open();
    }

    requestAnimationFrame(() => {
      if (!inputRef.current) {
        return;
      }

      inputRef.current.focus();
      inputRef.current.setSelectionRange(nextCaret, nextCaret);
      syncHighlightScroll();
    });
  };

  return (
    <div className={rootClassName}>
      {label ? <label className={labelClassName} htmlFor={id}>{label}</label> : null}
      <div className={wrapClassName}>
        <div ref={highlightRef} className={highlightClassName} aria-hidden="true">
          {value ? (
            highlightSegments.map((segment, index) => (
              <span
                key={`${id || field.comboboxId}-segment-${index}-${segment.text}`}
                className={segment.isTag ? tagSegmentClassName : segmentClassName}
                style={segment.isTag && segment.color ? { outlineColor: segment.color } : undefined}
              >
                {segment.text}
              </span>
            ))
          ) : (
            <span className={placeholderClassName}>{placeholder}</span>
          )}
        </div>
        <input
          ref={inputRef}
          id={id}
          className={inputClassName}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={suggestionsEnabled ? field.listboxId : undefined}
          aria-expanded={isDropdownOpen}
          aria-activedescendant={activeDescendant}
          aria-describedby={suggestionsEnabled && field.isFocused && helpText ? field.hintId : undefined}
          onChange={(event) => {
            const nextValue = event.target.value;
            const nextCaret = event.target.selectionStart ?? nextValue.length;
            onValueChange?.(nextValue);
            field.handleValueInput(nextCaret);
          }}
          onFocus={(event) => {
            if (blurTimeoutRef.current) {
              window.clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
            field.handleFocus(event.target.selectionStart ?? event.target.value.length);
          }}
          onBlur={() => {
            if (closeOnBlurDelayMs > 0) {
              blurTimeoutRef.current = window.setTimeout(() => {
                field.handleBlur();
                blurTimeoutRef.current = null;
              }, closeOnBlurDelayMs);
              return;
            }
            field.handleBlur();
          }}
          onClick={(event) => field.handleValueInput(event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
          onKeyUp={(event) => {
            if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(event.key)) {
              return;
            }

            field.handleValueInput(event.currentTarget.selectionStart ?? event.currentTarget.value.length);
          }}
          onKeyDown={(event) => {
            field.handleKeyDown(event, commitOption);
          }}
          onScroll={syncHighlightScroll}
        />
        {isDropdownOpen ? (
          <ul id={field.listboxId} className={dropdownClassName} role="listbox">
            {normalizedSections.map((section) => (
              <li key={`${section.key}-group`} role="presentation">
                {section.title || section.actionLabel ? (
                  <div className={toolbarClassName} role="presentation">
                    {section.title ? <span className={titleClassName}>{section.title}</span> : <span />}
                    {section.actionLabel ? (
                      <button
                        type="button"
                        className={actionClassName}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          section.onAction?.();
                        }}
                      >
                        {section.actionLabel}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <ul role="presentation">
                  {section.items.map((option) => {
                    const optionIndex = flatOptions.findIndex((entry) => entry.key === option.key);
                    const isActive = field.isOptionActive && optionIndex === field.activeIndex;
                    return (
                      <li key={option.key} role="presentation">
                        <button
                          id={`${field.optionIdPrefix}-${option.key}`}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className={`${optionClassName}${isActive ? ` ${optionClassName}-active is-active` : ""}`}
                          style={option.color ? { outlineColor: option.color } : undefined}
                          onMouseEnter={() => {
                            field.setActiveIndex(optionIndex);
                            field.setIsOptionActive(true);
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            commitOption(optionIndex);
                          }}
                        >
                          <span>{option.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {suggestionsEnabled && field.isFocused && helpText ? (
        <p id={field.hintId} className="sr-only">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
