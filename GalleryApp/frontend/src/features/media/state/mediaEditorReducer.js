export const mediaEditorInitialState = {
  selectedMedia: null,
  loading: {
    mediaSaving: false,
    mediaDeleting: false,
    favoriteUpdating: false,
    collectionPickerLoading: false,
    addingToCollection: false,
    mediaTagCatalogLoading: false,
    mediaRelationPickerLoading: false,
    tagDeleting: false
  },
  error: {
    mediaModal: "",
    collectionPicker: "",
    mediaTagCatalog: "",
    mediaRelationPicker: ""
  },
  forms: {
    isEditingMedia: false,
    showDeleteConfirm: false,
    pendingTagDelete: null,
    isCollectionPickerOpen: false,
    activeTagManagerTagTypeId: null,
    mediaDraft: {
      title: "",
      description: "",
      source: "",
      tagsByType: {},
      parent: "",
      child: ""
    }
  },
  entities: {
    collectionPickerItems: [],
    mediaTagCatalog: []
  },
  relationPicker: {
    isOpen: false,
    mode: "parent",
    context: "media",
    query: "",
    pagination: {
      page: 1,
      totalPages: 0,
      totalCount: 0
    },
    items: [],
    previewByMode: {
      parent: { item: null, isLoading: false, error: "" },
      child: { item: null, isLoading: false, error: "" }
    }
  }
};

export const MEDIA_EDITOR_ACTIONS = {
  SET_SELECTED_MEDIA: "mediaEditor/setSelectedMedia",
  SET_LOADING: "mediaEditor/setLoading",
  SET_ERROR: "mediaEditor/setError",
  SET_FORMS: "mediaEditor/setForms",
  SET_ENTITIES: "mediaEditor/setEntities",
  SET_RELATION_PICKER: "mediaEditor/setRelationPicker",
  SET_RELATION_PAGINATION: "mediaEditor/setRelationPagination",
  RESET: "mediaEditor/reset"
};

export function mediaEditorReducer(state, action) {
  switch (action.type) {
    case MEDIA_EDITOR_ACTIONS.SET_SELECTED_MEDIA:
      return { ...state, selectedMedia: action.payload };
    case MEDIA_EDITOR_ACTIONS.SET_LOADING:
      return { ...state, loading: { ...state.loading, ...action.payload } };
    case MEDIA_EDITOR_ACTIONS.SET_ERROR:
      return { ...state, error: { ...state.error, ...action.payload } };
    case MEDIA_EDITOR_ACTIONS.SET_FORMS:
      return { ...state, forms: { ...state.forms, ...action.payload } };
    case MEDIA_EDITOR_ACTIONS.SET_ENTITIES:
      return { ...state, entities: { ...state.entities, ...action.payload } };
    case MEDIA_EDITOR_ACTIONS.SET_RELATION_PICKER:
      return { ...state, relationPicker: { ...state.relationPicker, ...action.payload } };
    case MEDIA_EDITOR_ACTIONS.SET_RELATION_PAGINATION:
      return {
        ...state,
        relationPicker: {
          ...state.relationPicker,
          pagination: {
            ...state.relationPicker.pagination,
            ...action.payload
          }
        }
      };
    case MEDIA_EDITOR_ACTIONS.RESET:
      return mediaEditorInitialState;
    default:
      return state;
  }
}
