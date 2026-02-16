export const uploadInitialState = {
  queue: {
    items: [],
    step: "queue",
    activeUploadIndex: 0,
    taskStatuses: []
  },
  state: {
    type: "",
    message: ""
  },
  settings: {
    isGroupUploadEnabled: false,
    uploadCollectionIds: []
  },
  collections: {
    entities: [],
    loading: false,
    error: "",
    isPickerOpen: false
  },
  dragAndDrop: {
    isQueueDragOver: false,
    isPageDragOver: false
  },
  background: {
    total: 0,
    queued: 0,
    completed: 0,
    failed: 0,
    isProcessing: false,
    activeFileName: "",
    activePercent: 0
  }
};

export const UPLOAD_ACTIONS = {
  SET_QUEUE: "upload/setQueue",
  SET_STATE: "upload/setState",
  SET_SETTINGS: "upload/setSettings",
  SET_COLLECTIONS: "upload/setCollections",
  SET_DRAG_AND_DROP: "upload/setDragAndDrop",
  SET_BACKGROUND: "upload/setBackground",
  RESET: "upload/reset"
};

export function uploadReducer(state, action) {
  switch (action.type) {
    case UPLOAD_ACTIONS.SET_QUEUE:
      return { ...state, queue: { ...state.queue, ...action.payload } };
    case UPLOAD_ACTIONS.SET_STATE:
      return { ...state, state: { ...state.state, ...action.payload } };
    case UPLOAD_ACTIONS.SET_SETTINGS:
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case UPLOAD_ACTIONS.SET_COLLECTIONS:
      return { ...state, collections: { ...state.collections, ...action.payload } };
    case UPLOAD_ACTIONS.SET_DRAG_AND_DROP:
      return { ...state, dragAndDrop: { ...state.dragAndDrop, ...action.payload } };
    case UPLOAD_ACTIONS.SET_BACKGROUND:
      return { ...state, background: { ...state.background, ...action.payload } };
    case UPLOAD_ACTIONS.RESET:
      return uploadInitialState;
    default:
      return state;
  }
}
