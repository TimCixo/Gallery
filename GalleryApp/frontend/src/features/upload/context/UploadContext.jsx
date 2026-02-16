import { createContext, useContext } from "react";

const UploadContext = createContext(null);

export function UploadContextProvider({ value, children }) {
  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUploadContext() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUploadContext must be used within UploadContextProvider.");
  }

  return context;
}

export function useOptionalUploadContext() {
  return useContext(UploadContext);
}
