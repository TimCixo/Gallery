import { createContext, useContext } from "react";

const TagsContext = createContext(null);

export function TagsContextProvider({ value, children }) {
  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}

export function useTagsContext() {
  const context = useContext(TagsContext);
  if (!context) {
    throw new Error("useTagsContext must be used within TagsContextProvider.");
  }

  return context;
}
