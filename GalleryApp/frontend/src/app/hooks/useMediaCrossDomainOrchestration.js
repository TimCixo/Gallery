import { useCallback } from "react";
import { FAVORITES_ACTIONS } from "../../features/favorites/state/favoritesReducer";
import { GALLERY_ACTIONS } from "../../features/gallery/state/galleryReducer";
import { MEDIA_EDITOR_ACTIONS } from "../../features/media/state/mediaEditorReducer";

export function useMediaCrossDomainOrchestration({ galleryDispatch, favoritesDispatch, mediaEditorDispatch }) {
  const syncFavoriteSuccess = useCallback(
    ({ galleryEntities, favoritesEntities, shouldCloseEditor = true }) => {
      if (Array.isArray(galleryEntities)) {
        galleryDispatch({
          type: GALLERY_ACTIONS.SET_ENTITIES,
          payload: galleryEntities
        });
      }

      if (Array.isArray(favoritesEntities)) {
        favoritesDispatch({
          type: FAVORITES_ACTIONS.SET_ENTITIES,
          payload: favoritesEntities
        });
      }

      if (shouldCloseEditor) {
        mediaEditorDispatch({
          type: MEDIA_EDITOR_ACTIONS.SET_FORMS,
          payload: { isEditingMedia: false }
        });
      }
    },
    [favoritesDispatch, galleryDispatch, mediaEditorDispatch]
  );

  return { syncFavoriteSuccess };
}
