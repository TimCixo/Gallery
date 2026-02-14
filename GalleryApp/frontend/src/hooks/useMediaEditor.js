import { createFieldReducer } from "./useFieldReducer";

const initialMediaEditorState = {
  selectedMedia: null,
  isEditingMedia: false,
  isMediaSaving: false,
  isMediaDeleting: false,
  showDeleteConfirm: false,
  pendingTagDelete: null,
  isTagDeleting: false,
  mediaModalError: "",
  isFavoriteUpdating: false,
  isCollectionPickerOpen: false,
  collectionPickerItems: [],
  isCollectionPickerLoading: false,
  collectionPickerError: "",
  isAddingMediaToCollection: false,
  mediaTagCatalog: [],
  isMediaTagCatalogLoading: false,
  mediaTagCatalogError: "",
  activeTagManagerTagTypeId: null,
  mediaDraft: {
    title: "",
    description: "",
    source: "",
    tagsByType: {},
    parent: "",
    child: ""
  },
  isMediaRelationPickerOpen: false,
  mediaRelationPickerMode: "parent",
  mediaRelationPickerContext: "media",
  mediaRelationPickerQuery: "",
  mediaRelationPickerPage: 1,
  mediaRelationPickerItems: [],
  mediaRelationPickerTotalPages: 0,
  mediaRelationPickerTotalCount: 0,
  isMediaRelationPickerLoading: false,
  mediaRelationPickerError: "",
  mediaRelationPreviewByMode: {
    parent: { item: null, isLoading: false, error: "" },
    child: { item: null, isLoading: false, error: "" }
  }
};

/**
 * Media modal/editor state domain.
 * - Initial state: selected media, edit/delete/favorite workflows, tags/catalog, relation picker and preview.
 * - Actions: SET_FIELD/SET_FIELDS and generated setters.
 * - Reducer: immutable field reducer.
 * - Side-effects: modal fetches, save/delete/favorite requests, and relation lookup requests remain in App handlers.
 */
export const useMediaEditor = createFieldReducer(initialMediaEditorState);
