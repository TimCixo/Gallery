export const tagsInitialState = {
  entities: {
    tagTypes: [],
    tagsByTagTypeId: {}
  },
  loading: {
    tagTypes: false,
    tagTypeSaving: false,
    tagTypeUpdating: false,
    tagMoveInProgress: false,
    savingTagByTagTypeId: {},
    isDeletingTagEntity: false
  },
  error: {
    tagTypes: ""
  },
  forms: {
    createTagType: { name: "", color: "#2563EB" },
    editTagType: { id: null, name: "", color: "#2563EB" },
    tagSearchQueryByTagTypeId: {},
    tagTableStateByTagTypeId: {},
    newTagDraftByTagTypeId: {},
    editingTagByTagTypeId: {},
    editingTagDraftById: {},
    tagTypeCalloutOpenById: {},
    activeTagTypeDropdownId: null,
    tagTypeQueryById: {}
  },
  drag: {
    draggedTag: null,
    dragTargetTagTypeId: null
  }
};

export const TAGS_ACTIONS = {
  SET_ENTITIES: "tags/setEntities",
  SET_LOADING: "tags/setLoading",
  SET_ERROR: "tags/setError",
  SET_FORMS: "tags/setForms",
  SET_DRAG: "tags/setDrag",
  RESET: "tags/reset"
};

export function tagsReducer(state, action) {
  switch (action.type) {
    case TAGS_ACTIONS.SET_ENTITIES:
      return { ...state, entities: { ...state.entities, ...action.payload } };
    case TAGS_ACTIONS.SET_LOADING:
      return { ...state, loading: { ...state.loading, ...action.payload } };
    case TAGS_ACTIONS.SET_ERROR:
      return { ...state, error: { ...state.error, ...action.payload } };
    case TAGS_ACTIONS.SET_FORMS:
      return { ...state, forms: { ...state.forms, ...action.payload } };
    case TAGS_ACTIONS.SET_DRAG:
      return { ...state, drag: { ...state.drag, ...action.payload } };
    case TAGS_ACTIONS.RESET:
      return tagsInitialState;
    default:
      return state;
  }
}
