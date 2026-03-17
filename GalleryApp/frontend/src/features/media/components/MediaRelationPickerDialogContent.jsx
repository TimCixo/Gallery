import { useEffect, useMemo, useState } from "react";
import PickerDialog from "../../shared/components/PickerDialog";
import AppIcon from "../../shared/components/AppIcon";
import SearchInput from "../../search/components/SearchInput";
import GalleryMediaTile from "../../gallery/GalleryMediaTile";
import { buildSearchSuggestions, getSearchTokenRange, parseSearchSegments } from "../../shared/utils/searchUtils";
import { normalizePageJumpInput } from "../../shared/utils/pagination";
import { buildSearchTagTypeOptions } from "../../shared/utils/tagUtils";
import { addSearchHistoryItem } from "../../../app/utils/searchHistory";
import { applySearchSuggestionToValue, getSubmittedSearchText } from "../../../app/utils/searchState";

const BASE_SEARCH_TAG_OPTIONS = ["path", "title", "description", "id", "source"];
const BASE_SEARCH_TAG_NAMES = new Set(BASE_SEARCH_TAG_OPTIONS);

const getDisplayName = (item) => item?.title || item?.relativePath || `#${item?.id ?? "media"}`;

export default function MediaRelationPickerDialogContent({
  mode,
  query,
  onQueryChange,
  items,
  page,
  totalPages,
  totalCount,
  isLoading,
  errorMessage,
  tagCatalog = [],
  tagTypes = [],
  onPrev,
  onNext,
  onPageChange,
  onClose,
  onSelect
}) {
  const mediaItems = Array.isArray(items) ? items : [];
  const [searchDraft, setSearchDraft] = useState(String(query || ""));
  const [searchCaretPosition, setSearchCaretPosition] = useState(0);
  const [searchHistory, setSearchHistory] = useState([]);
  const [pageJumpInput, setPageJumpInput] = useState(String(page || 1));
  const [failedPreviewPaths, setFailedPreviewPaths] = useState(new Set());

  useEffect(() => {
    setSearchDraft(String(query || ""));
  }, [query]);

  useEffect(() => {
    setPageJumpInput(String(page || 1));
  }, [page]);

  const searchTagTypeOptions = useMemo(
    () => buildSearchTagTypeOptions(
      Array.isArray(tagTypes) ? tagTypes : [],
      Array.isArray(tagCatalog) ? tagCatalog : []
    ),
    [tagCatalog, tagTypes]
  );

  const searchTagTypeMap = useMemo(() => {
    const map = new Map();
    searchTagTypeOptions.forEach((item) => {
      map.set(item.lowerName, item);
    });
    return map;
  }, [searchTagTypeOptions]);

  const searchTagOptions = useMemo(
    () => Array.from(new Set([...BASE_SEARCH_TAG_OPTIONS, ...searchTagTypeOptions.map((item) => item.lowerName)])),
    [searchTagTypeOptions]
  );

  const highlightSegments = useMemo(() => parseSearchSegments({
    value: searchDraft,
    baseSearchTagNames: BASE_SEARCH_TAG_NAMES,
    searchTagTypeMap,
    searchTagOptions
  }), [searchDraft, searchTagOptions, searchTagTypeMap]);

  const searchTokenRange = useMemo(
    () => getSearchTokenRange(searchDraft, searchCaretPosition),
    [searchDraft, searchCaretPosition]
  );

  const searchSuggestions = useMemo(
    () => buildSearchSuggestions({
      searchTokenRange,
      searchTagOptions,
      searchTagTypeMap,
      baseSearchTagNames: BASE_SEARCH_TAG_NAMES,
      mediaTagCatalog: Array.isArray(tagCatalog) ? tagCatalog : []
    }),
    [searchTagOptions, searchTagTypeMap, searchTokenRange, tagCatalog]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextSubmittedText = getSubmittedSearchText(searchDraft);
    onQueryChange?.(nextSubmittedText);
    setSearchHistory((current) => addSearchHistoryItem(current, nextSubmittedText));
  };

  const handlePageJumpSubmit = (event) => {
    event.preventDefault();
    if (!onPageChange) {
      return;
    }

    const result = normalizePageJumpInput(pageJumpInput, page, totalPages);
    if (!result.isValid) {
      setPageJumpInput(String(page));
      return;
    }

    setPageJumpInput(String(result.targetPage));
    onPageChange(result.targetPage);
  };

  const toolbar = (
    <form className="top-form media-relation-picker-toolbar" onSubmit={handleSubmit}>
      <SearchInput
        value={searchDraft}
        placeholder="Search by id, title, path..."
        highlightSegments={highlightSegments}
        suggestions={searchSuggestions}
        suggestionsEnabled
        historyItems={searchHistory}
        helpText="Search media"
        onValueChange={setSearchDraft}
        onCaretChange={setSearchCaretPosition}
        onApplySuggestion={({ suggestion, searchTokenRange: nextSearchTokenRange }) => {
          const nextState = applySearchSuggestionToValue({
            inputValue: searchDraft,
            suggestion,
            searchTokenRange: nextSearchTokenRange
          });
          setSearchDraft(nextState.nextValue);
          setSearchCaretPosition(nextState.nextCaret);
          return nextState;
        }}
        onSelectHistory={(historyValue) => {
          const nextValue = String(historyValue || "").trim();
          if (!nextValue) {
            return;
          }

          setSearchDraft(nextValue);
          setSearchHistory((current) => addSearchHistoryItem(current, nextValue));
        }}
        onClearHistory={() => setSearchHistory([])}
      />
      <button
        type="submit"
        className="media-action-btn media-action-primary top-search-submit-btn"
        aria-label="Search media"
        title="Search media"
      >
        <AppIcon name="search" alt="" aria-hidden="true" />
      </button>
    </form>
  );

  const footer = (
    <div className="media-pagination-wrap">
      <div className="media-pagination">
        <button
          type="button"
          className="media-action-btn app-button-icon-only"
          onClick={onPrev}
          disabled={isLoading || page <= 1}
          aria-label="Previous page"
        >
          <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
        </button>
        <p>
          Page {page}
          {totalPages > 0 ? ` of ${totalPages}` : ""}
        </p>
        <button
          type="button"
          className="media-action-btn app-button-icon-only"
          onClick={onNext}
          disabled={isLoading || (totalPages > 0 && page >= totalPages)}
          aria-label="Next page"
        >
          <AppIcon name="arrowRight" alt="" aria-hidden="true" />
        </button>
        <form className="media-pagination-jump" onSubmit={handlePageJumpSubmit}>
          <input
            type="number"
            min={1}
            max={Math.max(totalPages, 1)}
            step={1}
            inputMode="numeric"
            value={pageJumpInput}
            onChange={(event) => setPageJumpInput(event.target.value)}
            disabled={isLoading || totalPages === 0}
            aria-label="Go to page"
          />
          <button
            type="submit"
            className="media-action-btn app-button-icon-only"
            disabled={isLoading || totalPages === 0 || !onPageChange}
            aria-label="Go to page"
          >
            <AppIcon name="confirm" alt="" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );

  const gridContent = (
    <div className="media-relation-picker-results">
      <div className="media-grid media-relation-picker-grid">
        {mediaItems.map((item) => {
          const normalizedItem = {
            ...item,
            _tileUrl: item?.tileUrl || item?.previewUrl || item?.originalUrl || item?.url || ""
          };

          return (
            <GalleryMediaTile
              key={`relation-picker-${item.id}`}
              file={normalizedItem}
              alt={getDisplayName(item)}
              hasPreviewError={failedPreviewPaths.has(item.relativePath)}
              onSelect={() => onSelect?.(item)}
              onPreviewError={(relativePath) => {
                if (!relativePath) {
                  return;
                }
                setFailedPreviewPaths((current) => new Set(current).add(relativePath));
              }}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <PickerDialog
      title={`Select ${mode === "child" ? "child" : "parent"} media`}
      className="media-relation-picker-dialog"
      onClose={onClose}
      toolbar={toolbar}
      errorMessage={errorMessage}
      isLoading={isLoading}
      loadingText="Loading media..."
      isEmpty={mediaItems.length === 0}
      emptyText="No media found."
      content={gridContent}
      footer={footer}
    />
  );
}
