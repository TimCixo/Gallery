const GALLERY_VIEW_STATE_KEY = "gallery.gallery-view-state";

const DEFAULT_GALLERY_VIEW_STATE = {
  page: 1,
  selectedMediaId: null,
  searchQuery: ""
};

export function loadGalleryViewState(storage = globalThis?.sessionStorage) {
  if (!storage) {
    return { ...DEFAULT_GALLERY_VIEW_STATE };
  }

  try {
    const rawValue = storage.getItem(GALLERY_VIEW_STATE_KEY);
    if (!rawValue) {
      return { ...DEFAULT_GALLERY_VIEW_STATE };
    }

    const parsed = JSON.parse(rawValue);
    const page = Number.parseInt(String(parsed?.page ?? ""), 10);
    const selectedMediaId = Number(parsed?.selectedMediaId);

    return {
      page: Number.isSafeInteger(page) && page > 0 ? page : DEFAULT_GALLERY_VIEW_STATE.page,
      selectedMediaId: Number.isSafeInteger(selectedMediaId) && selectedMediaId > 0 ? selectedMediaId : null,
      searchQuery: String(parsed?.searchQuery || "")
    };
  } catch {
    return { ...DEFAULT_GALLERY_VIEW_STATE };
  }
}

export function persistGalleryViewState(state, storage = globalThis?.sessionStorage) {
  if (!storage) {
    return;
  }

  const page = Number(state?.page);
  const selectedMediaId = Number(state?.selectedMediaId);

  storage.setItem(GALLERY_VIEW_STATE_KEY, JSON.stringify({
    page: Number.isSafeInteger(page) && page > 0 ? page : DEFAULT_GALLERY_VIEW_STATE.page,
    selectedMediaId: Number.isSafeInteger(selectedMediaId) && selectedMediaId > 0 ? selectedMediaId : null,
    searchQuery: String(state?.searchQuery || "")
  }));
}
