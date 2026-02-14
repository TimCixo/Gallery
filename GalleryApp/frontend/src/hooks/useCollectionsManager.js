import { createFieldReducer } from "./useFieldReducer";

const initialCollectionsState = {
  collections: [],
  isCollectionsLoading: false,
  collectionsError: "",
  collectionsSearchQuery: "",
  collectionFormLabel: "",
  collectionFormDescription: "",
  collectionFormCover: "",
  editingCollectionId: null,
  isCollectionSaving: false,
  isCollectionModalOpen: false,
  collectionPreviewMedia: null,
  isCollectionPreviewLoading: false,
  selectedCollection: null,
  collectionFiles: [],
  isCollectionFilesLoading: false,
  collectionFilesError: "",
  collectionFilesPage: 1,
  collectionFilesTotalPages: 0,
  collectionFilesTotalCount: 0,
  collectionFilesPageJumpInput: "1",
  pendingCollectionDelete: null,
  isCollectionDeleting: false
};

/**
 * Collections state domain.
 * - Initial state: list/details data, modal form draft, pagination, delete confirmations.
 * - Actions: SET_FIELD/SET_FIELDS and generated setters.
 * - Reducer: immutable field reducer.
 * - Side-effects: fetch/save/delete collection API calls and preview loading are coordinated from App via setters.
 */
export const useCollectionsManager = createFieldReducer(initialCollectionsState);
