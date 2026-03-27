import { useMemo } from "react";
import AutocompleteTextField from "../../shared/components/AutocompleteTextField";
import { getSearchTokenRange } from "../../shared/utils/searchUtils";
import { getSearchSuggestionSelection } from "../../../app/utils/searchState";

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
  const normalizedHistoryItems = Array.isArray(historyItems) ? historyItems : [];
  const historyOptions = normalizedHistoryItems.map((item, index) => ({
    kind: "history",
    key: `history-${index}-${item}`,
    label: item,
    value: item
  }));
  const visibleSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const sections = [];

  if (visibleSuggestions.length > 0) {
    sections.push({
      key: "suggestions",
      title: "Suggestions",
      items: visibleSuggestions
    });
  }

  if (historyOptions.length > 0) {
    sections.push({
      key: "history",
      title: "Recent",
      actionLabel: "Clear",
      onAction: onClearHistory,
      items: historyOptions
    });
  }

  const flattenedOptions = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  return (
    <AutocompleteTextField
      value={value}
      placeholder={placeholder}
      highlightSegments={highlightSegments}
      sections={sections}
      suggestionsEnabled={suggestionsEnabled}
      helpText={helpText}
      onValueChange={onValueChange}
      onCaretChange={onCaretChange}
      onApplyOption={({ option, caret }) => {
        if (option.kind === "history") {
          onSelectHistory(option.value);
          const nextCaret = option.value.length;
          return {
            nextCaret,
            keepOpen: true
          };
        }

        const nextState = onApplySuggestion({
          suggestion: getSearchSuggestionSelection(flattenedOptions, flattenedOptions.findIndex((entry) => entry.key === option.key)) || option,
          searchTokenRange: getSearchTokenRange(value, caret)
        });

        return {
          nextCaret: nextState?.nextCaret,
          keepOpen: true
        };
      }}
      rootClassName="top-search-field"
      wrapClassName="top-input-wrap"
      highlightClassName="top-input-highlight"
      segmentClassName="top-input-segment"
      tagSegmentClassName="top-input-segment is-tag"
      placeholderClassName="top-input-placeholder"
      inputClassName="top-input"
      dropdownClassName="top-search-suggestions"
      toolbarClassName="top-search-suggestions-toolbar"
      titleClassName="top-search-suggestions-title"
      actionClassName="top-search-history-clear"
      optionClassName="top-search-suggestion"
      commitKeys={["Tab"]}
    />
  );
}
