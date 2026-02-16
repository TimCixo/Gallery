import { useReducer } from "react";
import {
  COLLECTIONS_ACTIONS,
  collectionsInitialState,
  collectionsReducer
} from "../features/collections/state/collectionsReducer";

export function useCollectionsManager() {
  const [state, dispatch] = useReducer(collectionsReducer, collectionsInitialState);

  return {
    ...state,
    dispatch,
    actions: COLLECTIONS_ACTIONS
  };
}
