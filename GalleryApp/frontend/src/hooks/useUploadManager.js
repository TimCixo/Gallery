import { useReducer } from "react";
import { UPLOAD_ACTIONS, uploadInitialState, uploadReducer } from "../features/upload/state/uploadReducer";

export function useUploadManager() {
  const [state, dispatch] = useReducer(uploadReducer, uploadInitialState);

  return {
    ...state,
    dispatch,
    actions: UPLOAD_ACTIONS
  };
}
