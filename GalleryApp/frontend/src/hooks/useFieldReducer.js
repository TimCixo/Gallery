import { useMemo, useReducer } from "react";

export function createFieldReducer(initialState) {
  return function useFieldReducer() {
    const [state, dispatch] = useReducer((current, action) => {
      if (action.type === "SET_FIELD") {
        const nextValue = typeof action.value === "function" ? action.value(current[action.field]) : action.value;
        if (Object.is(current[action.field], nextValue)) {
          return current;
        }

        return { ...current, [action.field]: nextValue };
      }

      if (action.type === "SET_FIELDS") {
        return { ...current, ...action.value };
      }

      return current;
    }, initialState);

    const setters = useMemo(() => {
      const result = {};
      Object.keys(initialState).forEach((field) => {
        const setterName = `set${field.charAt(0).toUpperCase()}${field.slice(1)}`;
        result[setterName] = (value) => dispatch({ type: "SET_FIELD", field, value });
      });
      return result;
    }, []);

    return { ...state, ...setters, dispatch };
  };
}
