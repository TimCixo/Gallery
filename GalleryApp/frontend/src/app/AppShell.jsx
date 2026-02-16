import { useState } from "react";
import GalleryContainer from "../features/gallery/GalleryContainer";
import FavoritesContainer from "../features/favorites/FavoritesContainer";
import CollectionsContainer from "../features/collections/CollectionsContainer";
import TagsContainer from "../features/tags/TagsContainer";
import UploadManagerContainer from "../features/upload/UploadManagerContainer";

export default function AppShell() {
  const [activePage, setActivePage] = useState("gallery");
  const [isSlideMenuOpen, setIsSlideMenuOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [submittedText, setSubmittedText] = useState("");

  const openGalleryPage = (event) => {
    event.preventDefault();
    setActivePage("gallery");
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
    const nextSubmittedText = inputValue.trim();
    setSubmittedText(nextSubmittedText);
    setIsSlideMenuOpen(false);
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
            <div className="top-input-highlight" aria-hidden="true">
              {inputValue ? (
                <span className="top-input-segment">{inputValue}</span>
              ) : (
                <span className="top-input-placeholder">Search by name, path, id...</span>
              )}
            </div>
            <input
              className="top-input"
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Search by name, path, id..."
              spellCheck={false}
              autoComplete="off"
            />
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

      {activePage === "gallery" ? <GalleryContainer searchQuery={submittedText} /> : null}
      {activePage === "favorites" ? <FavoritesContainer /> : null}
      {activePage === "collections" ? <CollectionsContainer searchQuery={submittedText} /> : null}
      {activePage === "tags" ? <TagsContainer /> : null}
    </main>
  );
}
