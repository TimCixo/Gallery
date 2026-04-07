import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tagsApi } from "../api/tagsApi";
import MediaFilterPopover from "./components/MediaFilterPopover";
import GalleryContainer from "../features/gallery/GalleryContainer";
import FavoritesContainer from "../features/favorites/FavoritesContainer";
import DuplicatesContainer from "../features/duplicates/DuplicatesContainer";
import CollectionsContainer from "../features/collections/CollectionsContainer";
import TagsContainer from "../features/tags/TagsContainer";
import SettingsContainer from "../features/settings/SettingsContainer";
import UploadManagerContainer from "../features/upload/UploadManagerContainer";
import SearchInput from "../features/search/components/SearchInput";
import { BASE_SEARCH_TAG_NAMES, BASE_SEARCH_TAG_OPTIONS } from "../features/search/searchTags";
import AppIcon from "../features/shared/components/AppIcon";
import {
  buildSearchSuggestions,
  getSearchTokenRange,
  parseSearchSegments
} from "../features/shared/utils/searchUtils";
import { buildSearchTagTypeOptions } from "../features/shared/utils/tagUtils";
import {
  applySearchSuggestionToValue,
  createGalleryBrandNavigationState,
  getSubmittedSearchText
} from "./utils/searchState";
import { addSearchHistoryItem } from "./utils/searchHistory";
import { loadPersistedShellState, persistShellState } from "./utils/persistedShellState";
import { loadPersistedSettings, persistSettings } from "./utils/persistedSettings";
import { normalizeAppSettings } from "../features/settings/utils/appSettings";

export default function AppShell() {
  const initialSettingsState = useMemo(() => loadPersistedSettings(), []);
  const initialShellState = useMemo(() => loadPersistedShellState(), []);
  const [appSettings, setAppSettings] = useState(initialSettingsState);
  const normalizedAppSettings = useMemo(() => normalizeAppSettings(appSettings), [appSettings]);
  const [activePage, setActivePage] = useState(initialSettingsState.rememberLastOpenedPage ? initialShellState.activePage : "gallery");
  const [isSlideMenuOpen, setIsSlideMenuOpen] = useState(false);
  const [inputValue, setInputValue] = useState(initialShellState.inputValue);
  const [submittedText, setSubmittedText] = useState(initialShellState.submittedText);
  const [searchHistory, setSearchHistory] = useState(initialSettingsState.rememberSearchHistory ? initialShellState.searchHistory : []);
  const [searchCaretPosition, setSearchCaretPosition] = useState(0);
  const [searchTagTypes, setSearchTagTypes] = useState([]);
  const [searchTagCatalog, setSearchTagCatalog] = useState([]);
  const [searchSubmitSeq, setSearchSubmitSeq] = useState(0);
  const [openMediaRequest, setOpenMediaRequest] = useState({ token: 0, media: null });
  const [groupRelatedMedia, setGroupRelatedMedia] = useState(
    initialShellState.groupRelatedMedia || initialSettingsState.groupRelatedMediaByDefault
  );
  const [excludeCollectionMedia, setExcludeCollectionMedia] = useState(initialShellState.excludeCollectionMedia);
  const [showHiddenDuplicateGroups, setShowHiddenDuplicateGroups] = useState(false);
  const [isMediaFilterOpen, setIsMediaFilterOpen] = useState(false);
  const prevActivePageRef = useRef("gallery");
  const mediaFilterButtonRef = useRef(null);
  const mediaFilterWrapRef = useRef(null);

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
    persistShellState({
      activePage: appSettings.rememberLastOpenedPage ? activePage : "gallery",
      inputValue,
      submittedText,
      searchHistory: appSettings.rememberSearchHistory ? searchHistory : [],
      groupRelatedMedia,
      excludeCollectionMedia
    });
  }, [activePage, appSettings.rememberLastOpenedPage, appSettings.rememberSearchHistory, excludeCollectionMedia, groupRelatedMedia, inputValue, submittedText, searchHistory]);

  useEffect(() => {
    persistSettings(appSettings);
  }, [appSettings]);

  useEffect(() => {
    if (!appSettings.rememberSearchHistory && searchHistory.length > 0) {
      setSearchHistory([]);
    }
  }, [appSettings.rememberSearchHistory, searchHistory.length]);

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
      mediaTagCatalog: searchTagCatalog,
      maxSuggestions: normalizedAppSettings.searchSuggestionsLimit
    }),
    [normalizedAppSettings.searchSuggestionsLimit, searchTagCatalog, searchTagOptions, searchTagTypeMap, searchTokenRange]
  );
  const searchHighlightSegments = useMemo(() => {
    if (!inputValue) {
      return [];
    }

    if (activePage === "collections") {
      return [{ text: inputValue, isTag: false, color: "" }];
    }

    return parseSearchSegments({
      value: inputValue,
      baseSearchTagNames: BASE_SEARCH_TAG_NAMES,
      searchTagTypeMap,
      searchTagOptions
    });
  }, [activePage, inputValue, searchTagOptions, searchTagTypeMap]);

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

  useEffect(() => {
    if (!isMediaFilterOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const filterWrap = mediaFilterWrapRef.current;
      if (filterWrap instanceof HTMLElement && !filterWrap.contains(event.target)) {
        setIsMediaFilterOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isMediaFilterOpen]);

  const openGalleryPage = (event) => {
    event.preventDefault();
    const nextState = createGalleryBrandNavigationState({ inputValue, submittedText });
    const shouldRefreshGallery = activePage !== "gallery";
    setActivePage(nextState.activePage);
    setInputValue(nextState.inputValue);
    setSubmittedText(nextState.submittedText);
    if (shouldRefreshGallery) {
      setSearchSubmitSeq((value) => value + 1);
    }
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

  const openDuplicatesPage = () => {
    setActivePage("duplicates");
    setIsSlideMenuOpen(false);
  };

  const openTagsPage = () => {
    setActivePage("tags");
    setIsSlideMenuOpen(false);
  };

  const openSettingsPage = () => {
    setActivePage("settings");
    setIsSlideMenuOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextSubmittedText = getSubmittedSearchText(inputValue);
    setSubmittedText(nextSubmittedText);
    setActivePage("gallery");
    setSearchSubmitSeq((value) => value + 1);
    if (appSettings.rememberSearchHistory) {
      setSearchHistory((current) => addSearchHistoryItem(current, activePage === "collections" ? "" : nextSubmittedText));
    }
    setIsSlideMenuOpen(false);
  };

  const searchPlaceholder = activePage === "collections" ? "collection name" : "title:cat filetype:image";
  const searchHelpText = activePage === "collections"
    ? "Search collections by name."
    : "Use filters like title:cat, id:42, or filetype:image.";

  const handleSearchSuggestionApply = ({ suggestion, searchTokenRange: nextSearchTokenRange }) => {
    const nextState = applySearchSuggestionToValue({
      inputValue,
      suggestion,
      searchTokenRange: nextSearchTokenRange
    });
    setInputValue(nextState.nextValue);
    setSearchCaretPosition(nextState.nextCaret);
    return nextState;
  };

  const handleSearchHistorySelect = (historyValue) => {
    const nextValue = String(historyValue || "").trim();
    if (!nextValue) {
      return;
    }

    setInputValue(nextValue);
    if (appSettings.rememberSearchHistory) {
      setSearchHistory((current) => addSearchHistoryItem(current, nextValue));
    }
  };

  const handleSearchHistoryClear = () => {
    setSearchHistory([]);
  };

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
            <AppIcon name="menu" alt="" aria-hidden="true" />
          </button>
          <a className="top-brand" href="/" onClick={openGalleryPage}>
            Gallery
          </a>
        </div>

        <form className="top-form" onSubmit={handleSubmit}>
          <SearchInput
            value={inputValue}
            placeholder={searchPlaceholder}
            highlightSegments={searchHighlightSegments}
            suggestions={searchSuggestions}
            suggestionsEnabled={activePage !== "collections"}
            historyItems={searchHistory}
            helpText={searchHelpText}
            onValueChange={setInputValue}
            onCaretChange={setSearchCaretPosition}
            onApplySuggestion={handleSearchSuggestionApply}
            onSelectHistory={handleSearchHistorySelect}
            onClearHistory={handleSearchHistoryClear}
          />
          <button type="submit" className="media-action-btn app-button-icon-only top-search-submit-btn" aria-label="Search" title="Search">
            <AppIcon name="search" alt="" aria-hidden="true" />
          </button>
          <div ref={mediaFilterWrapRef} className="top-filter-control">
            <button
              ref={mediaFilterButtonRef}
              type="button"
              className="media-action-btn app-button-icon-only top-search-submit-btn"
              aria-label="Open media filters"
              aria-expanded={isMediaFilterOpen}
              aria-haspopup="dialog"
              title="Media filters"
              onClick={() => setIsMediaFilterOpen((current) => !current)}
            >
              <AppIcon name="filter" alt="" aria-hidden="true" />
            </button>
            <MediaFilterPopover
              isOpen={isMediaFilterOpen}
              buttonRef={mediaFilterButtonRef}
              onClose={() => setIsMediaFilterOpen(false)}
              groupRelatedMedia={groupRelatedMedia}
              onGroupRelatedMediaChange={setGroupRelatedMedia}
              excludeCollectionMedia={excludeCollectionMedia}
              onExcludeCollectionMediaChange={setExcludeCollectionMedia}
              showHiddenDuplicateGroups={showHiddenDuplicateGroups}
              onShowHiddenDuplicateGroupsChange={setShowHiddenDuplicateGroups}
              activePage={activePage}
            />
          </div>
        </form>

        <div className="top-upload-group">
          <UploadManagerContainer
            defaultGroupUploadMode={appSettings.defaultGroupUploadMode}
          />
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
                <AppIcon name="favoriteEnabled" alt="" aria-hidden="true" />
                <span>Favorite</span>
              </button>
              <button type="button" className="slide-menu-item" onClick={openDuplicatesPage}>
                <AppIcon name="duplicate" alt="" aria-hidden="true" />
                <span>Duplicates</span>
              </button>
              <button type="button" className="slide-menu-item" onClick={openTagsPage}>
                <AppIcon name="tag" alt="" aria-hidden="true" />
                <span>Tags</span>
              </button>
              <button type="button" className="slide-menu-item" onClick={openCollectionsPage}>
                <AppIcon name="collection" alt="" aria-hidden="true" />
                <span>Collections</span>
              </button>
              <button type="button" className="slide-menu-item" onClick={openSettingsPage}>
                <AppIcon name="settings" alt="" aria-hidden="true" />
                <span>Settings</span>
              </button>
            </nav>
          </aside>
        </div>
      ) : null}

      {activePage === "gallery" ? (
        <GalleryContainer
          searchQuery={submittedText}
          searchSubmitSeq={searchSubmitSeq}
          openMediaRequest={openMediaRequest}
          groupRelatedMedia={groupRelatedMedia}
          excludeCollectionMedia={excludeCollectionMedia}
          recommendationSettings={appSettings.recommendationSettings}
          mediaGridPageSize={appSettings.mediaGridPageSize}
          defaultMediaFitMode={appSettings.defaultMediaFitMode}
          showRelatedMediaStrip={appSettings.showRelatedMediaStrip}
          confirmDestructiveActions={appSettings.confirmDestructiveActions}
          defaultQuickTaggingTags={appSettings.defaultQuickTaggingTags}
        />
      ) : null}
      {activePage === "favorites" ? (
        <FavoritesContainer
          recommendationSettings={appSettings.recommendationSettings}
          mediaGridPageSize={appSettings.mediaGridPageSize}
          defaultMediaFitMode={appSettings.defaultMediaFitMode}
          showRelatedMediaStrip={appSettings.showRelatedMediaStrip}
          confirmDestructiveActions={appSettings.confirmDestructiveActions}
          defaultQuickTaggingTags={appSettings.defaultQuickTaggingTags}
        />
      ) : null}
      {activePage === "duplicates" ? (
        <DuplicatesContainer
          recommendationSettings={appSettings.recommendationSettings}
          duplicatesPageSize={appSettings.duplicatesPageSize}
          defaultMediaFitMode={appSettings.defaultMediaFitMode}
          showRelatedMediaStrip={appSettings.showRelatedMediaStrip}
          confirmDestructiveActions={appSettings.confirmDestructiveActions}
          showHiddenDuplicateGroups={showHiddenDuplicateGroups}
        />
      ) : null}
      {activePage === "collections" ? (
        <CollectionsContainer
          searchQuery={submittedText}
          recommendationSettings={appSettings.recommendationSettings}
          mediaGridPageSize={appSettings.mediaGridPageSize}
          defaultMediaFitMode={appSettings.defaultMediaFitMode}
          showRelatedMediaStrip={appSettings.showRelatedMediaStrip}
          confirmDestructiveActions={appSettings.confirmDestructiveActions}
          defaultQuickTaggingTags={appSettings.defaultQuickTaggingTags}
        />
      ) : null}
      {activePage === "tags" ? <TagsContainer confirmDestructiveActions={appSettings.confirmDestructiveActions} /> : null}
      {activePage === "settings" ? (
        <SettingsContainer
          appSettings={appSettings}
          onAppSettingsChange={(nextSettings) => setAppSettings(normalizeAppSettings(nextSettings))}
          onGroupRelatedMediaDefaultChange={setGroupRelatedMedia}
        />
      ) : null}
    </main>
  );
}
