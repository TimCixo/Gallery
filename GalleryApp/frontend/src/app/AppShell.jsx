import { useState } from "react";
import GalleryContainer from "../features/gallery/GalleryContainer";
import FavoritesContainer from "../features/favorites/FavoritesContainer";
import CollectionsContainer from "../features/collections/CollectionsContainer";
import TagsContainer from "../features/tags/TagsContainer";
import UploadManagerContainer from "../features/upload/UploadManagerContainer";

const pages = [
  { id: "gallery", label: "Gallery" },
  { id: "favorites", label: "Favorites" },
  { id: "collections", label: "Collections" },
  { id: "tags", label: "Tags" }
];

export default function AppShell() {
  const [activePage, setActivePage] = useState("gallery");

  return (
    <main className="app-root">
      <header className="top-header">
        <a className="top-brand" href="/" onClick={(event) => { event.preventDefault(); setActivePage("gallery"); }}>
          Gallery
        </a>
        <nav className="top-page-nav" aria-label="Page navigation">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className={`top-page-btn${activePage === page.id ? " is-active" : ""}`}
              onClick={() => setActivePage(page.id)}
            >
              {page.label}
            </button>
          ))}
        </nav>
        <UploadManagerContainer />
      </header>

      {activePage === "gallery" ? <GalleryContainer /> : null}
      {activePage === "favorites" ? <FavoritesContainer /> : null}
      {activePage === "collections" ? <CollectionsContainer /> : null}
      {activePage === "tags" ? <TagsContainer /> : null}
    </main>
  );
}
