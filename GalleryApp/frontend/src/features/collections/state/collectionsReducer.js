export const collectionsInitialState = {
  entities: [],
  loading: false,
  error: "",
  searchQuery: "",
  form: {
    label: "",
    description: "",
    coverPath: "",
    editingCollectionId: null,
    isModalOpen: false,
    isSaving: false,
    previewMedia: null,
    isPreviewLoading: false
  },
  details: {
    selectedCollection: null,
    files: [],
    loading: false,
    error: "",
    pagination: {
      page: 1,
      totalPages: 0,
      totalItems: 0,
      pageJumpInput: "1"
    }
  },
  deleteFlow: {
    pendingDelete: null,
    isDeleting: false
  }
};

export const COLLECTIONS_ACTIONS = {
  SET_ENTITIES: "collections/setEntities",
  SET_LOADING: "collections/setLoading",
  SET_ERROR: "collections/setError",
  SET_SEARCH_QUERY: "collections/setSearchQuery",
  SET_FORM: "collections/setForm",
  SET_DETAILS: "collections/setDetails",
  SET_DETAILS_PAGINATION: "collections/setDetailsPagination",
  SET_DELETE_FLOW: "collections/setDeleteFlow",
  RESET: "collections/reset"
};

export function collectionsReducer(state, action) {
  switch (action.type) {
    case COLLECTIONS_ACTIONS.SET_ENTITIES:
      return { ...state, entities: action.payload };
    case COLLECTIONS_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case COLLECTIONS_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case COLLECTIONS_ACTIONS.SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload };
    case COLLECTIONS_ACTIONS.SET_FORM:
      return { ...state, form: { ...state.form, ...action.payload } };
    case COLLECTIONS_ACTIONS.SET_DETAILS:
      return { ...state, details: { ...state.details, ...action.payload } };
    case COLLECTIONS_ACTIONS.SET_DETAILS_PAGINATION:
      return {
        ...state,
        details: {
          ...state.details,
          pagination: { ...state.details.pagination, ...action.payload }
        }
      };
    case COLLECTIONS_ACTIONS.SET_DELETE_FLOW:
      return { ...state, deleteFlow: { ...state.deleteFlow, ...action.payload } };
    case COLLECTIONS_ACTIONS.RESET:
      return collectionsInitialState;
    default:
      return state;
  }
}
