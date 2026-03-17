import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tagsApi } from "../api/tagsApi";
import GalleryContainer from "../features/gallery/GalleryContainer";
import FavoritesContainer from "../features/favorites/FavoritesContainer";
import CollectionsContainer from "../features/collections/CollectionsContainer";
import TagsContainer from "../features/tags/TagsContainer";
import UploadManagerContainer from "../features/upload/UploadManagerContainer";
import {
  buildSearchSuggestions,
  formatSearchTagValue,
  getSearchTokenRange,
  parseSearchSegments
} from "../features/shared/utils/searchUtils";
import { buildSearchTagTypeOptions } from "../features/shared/utils/tagUtils";
import { createGalleryBrandNavigationState, getSubmittedSearchText } from "./utils/searchState";

const BASE_SEARCH_TAG_OPTIONS = ["path", "title", "description", "id", "source"];
const BASE_SEARCH_TAG_NAMES = new Set(BASE_SEARCH_TAG_OPTIONS);

export default function AppShell() {
  const [activePage, setActivePage] = useState("gallery");
  const [isSlideMenuOpen, setIsSlideMenuOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [searchCaretPosition, setSearchCaretPosition] = useState(0);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [activeSearchSuggestionIndex, setActiveSearchSuggestionIndex] = useState(0);
  const [isSearchSuggestionExplicitlyActive, setIsSearchSuggestionExplicitlyActive] = useState(false);
  const [searchTagTypes, setSearchTagTypes] = useState([]);
  const [searchTagCatalog, setSearchTagCatalog] = useState([]);
  const [searchSubmitSeq, setSearchSubmitSeq] = useState(0);
  const [openMediaRequest, setOpenMediaRequest] = useState({ token: 0, media: null });
  const searchInputRef = useRef(null);
  const searchHighlightRef = useRef(null);
  const prevActivePageRef = useRef("gallery");

  const loadSearchMetadata = useCallback(async () => {
    try {
      const [tagTypesResponse, tagsResponse] = await Promise.all([
        tagsApi.listTagTypes(),
        tagsApi.listTags()
      ]);
      setSearchTagTypes(Array.isArray(tagTypesResponse?.items) ? tagTypesResponse.items : []);
      setSearchTagCatalog(Array.isArray(tagsResponse?.items) ? tagsResponse.items : []);
    } catch {
      setSearchTagTypes([]);
      setSearchTagCatalog([]);
    }
  }, []);

  useEffect(() => {
    void loadSearchMetadata();
  }, [loadSearchMetadata]);

  useEffect(() => {
    const previousPage = prevActivePageRef.current;
    prevActivePageRef.current = activePage;
    if (activePage === "gallery" && previousPage !== "gallery") {
      void loadSearchMetadata();
    }
  }, [activePage, loadSearchMetadata]);

  const searchTagTypeOptions = useMemo(
    () => buildSearchTagTypeOptions(searchTagTypes, searchTagCatalog),
    [searchTagTypes, searchTagCatalog]
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

  const syncSearchHighlightScroll = () => {
    if (!searchInputRef.current || !searchHighlightRef.current) {
      return;
    }
    searchHighlightRef.current.scrollLeft = searchInputRef.current.scrollLeft;
  };

  const searchTokenRange = useMemo(
    () => getSearchTokenRange(inputValue, searchCaretPosition),
    [inputValue, searchCaretPosition]
  );
  const searchSuggestions = useMemo(
    () => buildSearchSuggestions({
      searchTokenRange,
      searchTagOptions,
      searchTagTypeMap,
      baseSearchTagNames: BASE_SEARCH_TAG_NAMES,
      mediaTagCatalog: searchTagCatalog
    }),
    [searchTagCatalog, searchTagOptions, searchTagTypeMap, searchTokenRange]
  );
  const hasSearchSuggestions = activePage !== "collections" && isSearchInputFocused && searchSuggestions.length > 0;

  const handleSearchInputChange = (event) => {
    setInputValue(event.target.value);
    const caretPosition = event.target.selectionStart ?? event.target.value.length;
    setSearchCaretPosition(caretPosition);
    setActiveSearchSuggestionIndex(0);
    setIsSearchSuggestionExplicitlyActive(false);
  };

  const updateSearchCaretPosition = (event) => {
    const caretPosition = event.target.selectionStart ?? event.target.value.length;
    setSearchCaretPosition(caretPosition);
    setIsSearchSuggestionExplicitlyActive(false);
  };

  const applySearchSuggestion = (suggestion) => {
    if (!suggestion) {
      return;
    }

    const prefix = inputValue.slice(0, searchTokenRange.start);
    const suffix = inputValue.slice(searchTokenRange.end);
    let insertedToken = `${suggestion.tagName}:`;

    if (suggestion.kind === "tagValue") {
      insertedToken = `${suggestion.tagName}:${formatSearchTagValue(suggestion.tagValue)}`;
      if (!suffix.startsWith(" ")) {
        insertedToken += " ";
      }
    }

    const nextValue = `${prefix}${insertedToken}${suffix}`;
    const nextCaret = prefix.length + insertedToken.length;
    setInputValue(nextValue);
    setSearchCaretPosition(nextCaret);
    setActiveSearchSuggestionIndex(0);
    setIsSearchSuggestionExplicitlyActive(false);

    requestAnimationFrame(() => {
      if (!searchInputRef.current) {
        return;
      }
      searchInputRef.current.focus();
      searchInputRef.current.setSelectionRange(nextCaret, nextCaret);
      syncSearchHighlightScroll();
    });
  };

  const handleSearchInputKeyDown = (event) => {
    if (!hasSearchSuggestions) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsSearchSuggestionExplicitlyActive(true);
      setActiveSearchSuggestionIndex((current) => (current + 1) % searchSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsSearchSuggestionExplicitlyActive(true);
      setActiveSearchSuggestionIndex((current) => ((current - 1 + searchSuggestions.length) % searchSuggestions.length));
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const selectedSuggestion = searchSuggestions[Math.max(0, Math.min(activeSearchSuggestionIndex, searchSuggestions.length - 1))];
      if (selectedSuggestion) {
        applySearchSuggestion(selectedSuggestion);
      }
      return;
    }

    if (event.key === "Enter") {
      if (!isSearchSuggestionExplicitlyActive) {
        return;
      }

      event.preventDefault();
      const selectedSuggestion = searchSuggestions[Math.max(0, Math.min(activeSearchSuggestionIndex, searchSuggestions.length - 1))];
      if (selectedSuggestion) {
        applySearchSuggestion(selectedSuggestion);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsSearchInputFocused(false);
      setIsSearchSuggestionExplicitlyActive(false);
    }
  };

  useEffect(() => {
    syncSearchHighlightScroll();
  }, [inputValue]);

  useEffect(() => {
    if (activeSearchSuggestionIndex < searchSuggestions.length) {
      return;
    }
    setActiveSearchSuggestionIndex(0);
    setIsSearchSuggestionExplicitlyActive(false);
  }, [activeSearchSuggestionIndex, searchSuggestions.length]);

  useEffect(() => {
    const handleOpenMedia = (event) => {
      setOpenMediaRequest({
        token: Date.now(),
        media: event.detail?.media || null
      });
      setActivePage("gallery");
      setIsSlideMenuOpen(false);
    };

    window.addEventListener("gallery:open-media", handleOpenMedia);
    return () => window.removeEventListener("gallery:open-media", handleOpenMedia);
  }, []);

  const openGalleryPage = (event) => {
    event.preventDefault();
    const nextState = createGalleryBrandNavigationState();
    setActivePage(nextState.activePage);
    setSubmittedText(nextState.submittedText);
    setSearchSubmitSeq((value) => value + 1);
    setIsSlideMenuOpen(false);
  };

  const openFavoritesPage = () => {
    setActivePage("favorites");
    setIsSlideMenuOpen(false);
  };

  const openCollectionsPage = () => {
    setActivePage("collections");
    setIsSlideMenuOpen(false);
  };

  const openTagsPage = () => {
    setActivePage("tags");
    setIsSlideMenuOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextSubmittedText = getSubmittedSearchText(inputValue);
    setSubmittedText(nextSubmittedText);
    setActivePage("gallery");
    setSearchSubmitSeq((value) => value + 1);
    setIsSlideMenuOpen(false);
  };

  const searchPlaceholder = activePage === "collections" ? "collection name" : "title:cat id:42";

  return (
    <main className="app-root">
      <header className="top-header">
        <div className="top-brand-group">
          <button
            type="button"
            className="top-menu-toggle"
            onClick={() => setIsSlideMenuOpen((value) => !value)}
            aria-label="Open menu"
            aria-expanded={isSlideMenuOpen}
            aria-controls="app-slide-menu"
          >
            <span />
            <span />
            <span />
          </button>
          <a className="top-brand" href="/" onClick={openGalleryPage}>
            Gallery
          </a>
        </div>

        <form className="top-form" onSubmit={handleSubmit}>
          <div className="top-input-wrap">
            <div ref={searchHighlightRef} className="top-input-highlight" aria-hidden="true">
              {inputValue ? (
                activePage === "collections" ? (
                  <span className="top-input-segment">{inputValue}</span>
                ) : (
                  parseSearchSegments({
                    value: inputValue,
                    baseSearchTagNames: BASE_SEARCH_TAG_NAMES,
                    searchTagTypeMap,
                    searchTagOptions
                  }).map((segment, index) => (
                    <span
                      key={`${index}-${segment.text}`}
                      className={segment.isTag ? "top-input-segment is-tag" : "top-input-segment"}
                      style={segment.isTag && segment.color ? { outlineColor: segment.color } : undefined}
                    >
                      {segment.text}
                    </span>
                  ))
                )
              ) : (
                <span className="top-input-placeholder">{searchPlaceholder}</span>
              )}
            </div>
            <input
              ref={searchInputRef}
              className="top-input"
              type="text"
              value={inputValue}
              onChange={handleSearchInputChange}
              onFocus={() => setIsSearchInputFocused(true)}
              onBlur={() => {
                setIsSearchInputFocused(false);
                setIsSearchSuggestionExplicitlyActive(false);
              }}
              onClick={updateSearchCaretPosition}
              onKeyUp={updateSearchCaretPosition}
              onKeyDown={handleSearchInputKeyDown}
              onScroll={syncSearchHighlightScroll}
              placeholder={searchPlaceholder}
              spellCheck={false}
              autoComplete="off"
            />
            {hasSearchSuggestions ? (
              <ul className="top-search-suggestions">
                {searchSuggestions.map((suggestion, index) => (
                  <li key={suggestion.key}>
                    <button
                      type="button"
                      className={`top-search-suggestion${index === activeSearchSuggestionIndex ? " is-active" : ""}`}
                      style={suggestion.color ? { outlineColor: suggestion.color } : undefined}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySearchSuggestion(suggestion);
                      }}
                    >
                      {suggestion.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button type="submit" className="media-action-btn">
            Search
          </button>
        </form>

        <div className="top-upload-group">
          <UploadManagerContainer />
        </div>
      </header>

      {isSlideMenuOpen ? (
        <div className="slide-menu-overlay" onClick={() => setIsSlideMenuOpen(false)}>
          <aside
            id="app-slide-menu"
            className="slide-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="slide-menu-header">
              <p>Menu</p>
            </div>
            <nav className="slide-menu-nav">
              <button type="button" className="slide-menu-item" onClick={openFavoritesPage}>
                Favorite
              </button>
              <button type="button" className="slide-menu-item" onClick={openTagsPage}>
                Tags
              </button>
              <button type="button" className="slide-menu-item" onClick={openCollectionsPage}>
                Collections
              </button>
            </nav>
          </aside>
        </div>
      ) : null}

      {activePage === "gallery" ? <GalleryContainer searchQuery={submittedText} searchSubmitSeq={searchSubmitSeq} openMediaRequest={openMediaRequest} /> : null}
      {activePage === "favorites" ? <FavoritesContainer /> : null}
      {activePage === "collections" ? <CollectionsContainer searchQuery={submittedText} /> : null}
      {activePage === "tags" ? <TagsContainer /> : null}
    </main>
  );
}
