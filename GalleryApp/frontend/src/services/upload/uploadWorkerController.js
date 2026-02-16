import { ServiceError } from "../serviceClient";

export const uploadSingleFileWithProgress = (file, onProgress, onXhrReady) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  onXhrReady?.(xhr);
  const formData = new FormData();
  formData.append("files", file);

  xhr.upload.onprogress = (progressEvent) => {
    const loaded = progressEvent.loaded || 0;
    const total = progressEvent.total || 0;
    const percent = total > 0 ? Math.min((loaded / total) * 100, 100) : 0;
    onProgress(percent);
  };

  xhr.onerror = () => reject(new ServiceError({ message: "Upload failed.", code: "UPLOAD_FAILED" }));
  xhr.onabort = () => reject(new ServiceError({ message: "Upload cancelled.", code: "UPLOAD_ABORTED" }));
  xhr.onload = () => {
    let payload = {};
    try {
      payload = xhr.responseType === "json" ? (xhr.response || {}) : JSON.parse(xhr.responseText || "{}");
    } catch {
      payload = {};
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      resolve(payload);
      return;
    }

    reject(new ServiceError({
      message: payload?.message || payload?.error || "Upload failed.",
      code: payload?.code || `HTTP_${xhr.status}`,
      details: payload,
      status: xhr.status
    }));
  };

  xhr.open("POST", "/api/upload");
  xhr.responseType = "json";
  xhr.send(formData);
});
