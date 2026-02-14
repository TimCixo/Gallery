import { createFieldReducer } from "./useFieldReducer";

const initialUploadState = {
  uploadItems: [],
  uploadStep: "queue",
  activeUploadIndex: 0,
  uploadState: { type: "", message: "" },
  isGroupUploadEnabled: false,
  uploadCollectionIds: [],
  uploadCollections: [],
  isUploadCollectionsLoading: false,
  uploadCollectionsError: "",
  isUploadCollectionPickerOpen: false,
  isUploadQueueDragOver: false,
  isDragOverPage: false,
  backgroundUploadState: {
    total: 0,
    queued: 0,
    completed: 0,
    failed: 0,
    isProcessing: false,
    activeFileName: "",
    activePercent: 0
  },
  uploadTaskStatuses: []
};

/**
 * Upload state domain.
 * - Initial state: queue/editor UI, batch progress, queue statuses, collection picker.
 * - Actions: SET_FIELD/SET_FIELDS plus generated setters (setUploadItems, setUploadStep...).
 * - Reducer: field-based immutable updates with functional setter support.
 * - Side-effects: API loading, background upload worker, drag-and-drop handlers stay in App and call setters.
 */
export const useUploadManager = createFieldReducer(initialUploadState);
