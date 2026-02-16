import { useReducer } from "react";
import {
  FAVORITES_ACTIONS,
  favoritesInitialState,
  favoritesReducer
} from "../features/favorites/state/favoritesReducer";

export function useFavoritesManager() {
  const [state, dispatch] = useReducer(favoritesReducer, favoritesInitialState);

  return {
    ...state,
    dispatch,
    actions: FAVORITES_ACTIONS
  };
}
