import { useMemo, useState } from "react";
import AutocompleteTextField from "../../shared/components/AutocompleteTextField";
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

  return (
    <AutocompleteTextField
      id={id}
      value={value}
      label={label}
      labelClassName={undefined}
      placeholder={placeholder}
      disabled={disabled}
      highlightSegments={highlightSegments}
      sections={[
        {
          key: "tag-names",
          items: suggestions
        }
      ]}
      onValueChange={onChange}
      onCaretChange={setCaret}
      onApplyOption={({ option, caret }) => {
        const nextState = applyTagListAutocompleteSuggestion({
          value,
          caret,
          suggestion: option
        });

        onChange(nextState.value);
        return {
          nextCaret: nextState.caret,
          keepOpen: true
        };
      }}
      rootClassName="media-quick-tagging-field"
      wrapClassName="media-quick-tagging-input-wrap"
      highlightClassName="media-quick-tagging-input-highlight"
      segmentClassName="media-quick-tagging-input-segment"
      tagSegmentClassName="media-quick-tagging-input-segment is-tag"
      placeholderClassName="media-quick-tagging-input-placeholder"
      inputClassName="media-quick-tagging-input"
      dropdownClassName="media-tag-dropdown"
      optionClassName="media-tag-dropdown-item"
      closeOnBlurDelayMs={120}
      commitKeys={["Enter", "Tab"]}
      suggestionsEnabled={!disabled}
    />
  );
}
