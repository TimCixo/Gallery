import { createContext, useContext } from "react";

export const MediaEditorContext = createContext(null);

export function MediaEditorContextProvider({ value, children }) {
  return <MediaEditorContext.Provider value={value}>{children}</MediaEditorContext.Provider>;
}

export function useMediaEditorContext() {
  const context = useContext(MediaEditorContext);
  if (!context) {
    throw new Error("useMediaEditorContext must be used within MediaEditorContextProvider.");
  }

  return context;
}
