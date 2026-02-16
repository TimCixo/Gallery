export const favoritesInitialState = {
  entities: [],
  loading: false,
  error: "",
  pagination: {
    page: 1,
    totalPages: 0,
    totalItems: 0,
    pageJumpInput: "1"
  }
};

export const FAVORITES_ACTIONS = {
  SET_ENTITIES: "favorites/setEntities",
  SET_LOADING: "favorites/setLoading",
  SET_ERROR: "favorites/setError",
  SET_PAGINATION: "favorites/setPagination",
  RESET: "favorites/reset"
};

export function favoritesReducer(state, action) {
  switch (action.type) {
    case FAVORITES_ACTIONS.SET_ENTITIES:
      return { ...state, entities: action.payload };
    case FAVORITES_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case FAVORITES_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case FAVORITES_ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload
        }
      };
    case FAVORITES_ACTIONS.RESET:
      return favoritesInitialState;
    default:
      return state;
  }
}
