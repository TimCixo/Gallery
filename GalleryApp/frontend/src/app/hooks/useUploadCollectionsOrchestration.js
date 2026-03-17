import { useCallback } from "react";
import { COLLECTIONS_ACTIONS } from "../../features/collections/state/collectionsReducer";
import { UPLOAD_ACTIONS } from "../../features/upload/state/uploadReducer";

export function useUploadCollectionsOrchestration({ collectionsDispatch, uploadDispatch }) {
  const syncCollectionsForUpload = useCallback(
    ({ collections, selectedIds = [] }) => {
      collectionsDispatch({
        type: COLLECTIONS_ACTIONS.SET_ENTITIES,
        payload: collections
      });

      uploadDispatch({
        type: UPLOAD_ACTIONS.SET_COLLECTIONS,
        payload: {
          entities: collections,
          loading: false,
          error: ""
        }
      });

      uploadDispatch({
        type: UPLOAD_ACTIONS.SET_SETTINGS,
        payload: {
          uploadCollectionIds: selectedIds
        }
      });
    },
    [collectionsDispatch, uploadDispatch]
  );

  return { syncCollectionsForUpload };
}
