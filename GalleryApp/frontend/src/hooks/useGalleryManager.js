import { useReducer } from "react";
import { GALLERY_ACTIONS, galleryInitialState, galleryReducer } from "../features/gallery/state/galleryReducer";

export function useGalleryManager() {
  const [state, dispatch] = useReducer(galleryReducer, galleryInitialState);

  return {
    ...state,
    dispatch,
    actions: GALLERY_ACTIONS
  };
}
