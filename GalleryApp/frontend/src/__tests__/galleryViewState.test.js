import test from "node:test";
import assert from "node:assert/strict";
import { loadGalleryViewState, persistGalleryViewState } from "../features/gallery/utils/galleryViewState.js";

const createStorage = () => {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
};

test("gallery view state persists page selected media and search query", () => {
  const storage = createStorage();
  persistGalleryViewState({
    page: 4,
    selectedMediaId: 77,
    searchQuery: "title:cat"
  }, storage);

  assert.deepEqual(loadGalleryViewState(storage), {
    page: 4,
    selectedMediaId: 77,
    searchQuery: "title:cat"
  });
});

test("gallery view state clamps invalid persisted values", () => {
  const storage = createStorage();
  storage.setItem("gallery.gallery-view-state", JSON.stringify({ page: -1, selectedMediaId: "bad" }));

  assert.deepEqual(loadGalleryViewState(storage), {
    page: 1,
    selectedMediaId: null,
    searchQuery: ""
  });
});
