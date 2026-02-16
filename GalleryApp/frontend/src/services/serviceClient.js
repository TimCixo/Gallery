export class ServiceError extends Error {
  constructor({ message, code = "UNKNOWN", details = null, status = 0 }) {
    super(message || "Request failed.");
    this.name = "ServiceError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export const readResponsePayload = async (response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

export const toServiceError = (error, fallbackMessage, fallbackCode = "REQUEST_FAILED") => {
  if (error instanceof ServiceError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ServiceError({
      message: "Request timed out. Try again.",
      code: "TIMEOUT",
      details: error
    });
  }

  if (error instanceof Error) {
    return new ServiceError({
      message: error.message || fallbackMessage,
      code: fallbackCode,
      details: error
    });
  }

  return new ServiceError({ message: fallbackMessage, code: fallbackCode, details: error });
};

export const requestJson = async (url, options = {}) => {
  const { timeoutMs = 20000, signal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const abortHandler = () => controller.abort();
  signal?.addEventListener("abort", abortHandler);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    const payload = await readResponsePayload(response);
    if (!response.ok) {
      throw new ServiceError({
        message: payload?.message || payload?.error || `Request failed with status ${response.status}.`,
        code: payload?.code || `HTTP_${response.status}`,
        details: payload,
        status: response.status
      });
    }

    return payload;
  } catch (error) {
    throw toServiceError(error, "Request failed.");
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortHandler);
  }
};
