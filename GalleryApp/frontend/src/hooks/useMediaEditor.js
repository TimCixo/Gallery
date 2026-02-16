import { useReducer } from "react";
import {
  MEDIA_EDITOR_ACTIONS,
  mediaEditorInitialState,
  mediaEditorReducer
} from "../features/media/state/mediaEditorReducer";

export function useMediaEditor() {
  const [state, dispatch] = useReducer(mediaEditorReducer, mediaEditorInitialState);

  return {
    ...state,
    dispatch,
    actions: MEDIA_EDITOR_ACTIONS
  };
}
