import { useReducer } from "react";
import { TAGS_ACTIONS, tagsInitialState, tagsReducer } from "../features/tags/state/tagsReducer";

export function useTagsManager() {
  const [state, dispatch] = useReducer(tagsReducer, tagsInitialState);

  return {
    ...state,
    dispatch,
    actions: TAGS_ACTIONS
  };
}
