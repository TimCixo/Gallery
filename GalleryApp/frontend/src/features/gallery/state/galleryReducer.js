export const galleryInitialState = {
  entities: [],
  loading: true,
  error: "",
  pagination: {
    page: 1,
    totalPages: 0,
    totalItems: 0,
    pageJumpInput: "1"
  },
  filters: {
    inputValue: "",
    submittedText: ""
  },
  failedPreviewPaths: new Set()
};

export const GALLERY_ACTIONS = {
  SET_ENTITIES: "gallery/setEntities",
  SET_LOADING: "gallery/setLoading",
  SET_ERROR: "gallery/setError",
  SET_PAGINATION: "gallery/setPagination",
  SET_FILTERS: "gallery/setFilters",
  SET_FAILED_PREVIEW_PATHS: "gallery/setFailedPreviewPaths",
  RESET: "gallery/reset"
};

export function galleryReducer(state, action) {
  const resolve = (currentValue) =>
    typeof action.payload === "function" ? action.payload(currentValue) : action.payload;

  switch (action.type) {
    case GALLERY_ACTIONS.SET_ENTITIES:
      return { ...state, entities: resolve(state.entities) };
    case GALLERY_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case GALLERY_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case GALLERY_ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload
        }
      };
    case GALLERY_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };
    case GALLERY_ACTIONS.SET_FAILED_PREVIEW_PATHS:
      return { ...state, failedPreviewPaths: resolve(state.failedPreviewPaths) };
    case GALLERY_ACTIONS.RESET:
      return galleryInitialState;
    default:
      return state;
  }
}
