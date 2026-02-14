import { createFieldReducer } from "./useFieldReducer";

const initialTagsState = {
  tagTypeNameInput: "",
  tagTypeColorInput: "#2563EB",
  tagTypes: [],
  isTagTypesLoading: false,
  isTagTypeSaving: false,
  editingTagTypeId: null,
  editingTagTypeName: "",
  editingTagTypeColor: "#2563EB",
  isTagTypeUpdating: false,
  tagsByTagTypeId: {},
  tagSearchQueryByTagTypeId: {},
  tagTableStateByTagTypeId: {},
  newTagDraftByTagTypeId: {},
  editingTagByTagTypeId: {},
  editingTagDraftById: {},
  savingTagByTagTypeId: {},
  tagTypesError: "",
  isTagMoveInProgress: false,
  draggedTag: null,
  dragTargetTagTypeId: null,
  tagTypeCalloutOpenById: {},
  activeTagTypeDropdownId: null,
  tagTypeQueryById: {}
};

/**
 * Tags/tag-types state domain.
 * - Initial state: tag-type CRUD forms, tags dictionaries, drag-and-drop state, lookup dropdowns.
 * - Actions: SET_FIELD/SET_FIELDS and generated setters.
 * - Reducer: immutable field reducer.
 * - Side-effects: tag/type CRUD & move requests are handled in App event handlers and use these setters.
 */
export const useTagsManager = createFieldReducer(initialTagsState);
