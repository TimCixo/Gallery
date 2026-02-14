/**
 * @typedef {Object} ApiRequestOptions
 * @property {string} [method]
 * @property {Record<string, string | number | boolean | null | undefined>} [query]
 * @property {unknown} [body]
 * @property {Record<string, string>} [headers]
 * @property {AbortSignal} [signal]
 * @property {number} [timeoutMs]
 */

/**
 * Error wrapper for HTTP client failures.
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, data?: unknown, cause?: unknown }} [meta]
   */
  constructor(message, meta = {}) {
    super(message);
    this.name = "ApiError";
    this.status = meta.status ?? 0;
    this.data = meta.data;
    this.cause = meta.cause;
  }
}

const DEFAULT_TIMEOUT_MS = 20000;

/**
 * @template T
 * @param {string} url
 * @param {ApiRequestOptions} [options]
 * @returns {Promise<T>}
 */
export const httpRequest = async (url, options = {}) => {
  const {
    method = "GET",
    query,
    body,
    headers = {},
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = options;

  const queryString = new URLSearchParams(
    Object.entries(query || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0) {
        acc[key] = String(value);
      }
      return acc;
    }, /** @type {Record<string, string>} */ ({}))
  ).toString();

  const endpoint = queryString ? `${url}?${queryString}` : url;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const abortHandler = () => controller.abort();
  signal?.addEventListener("abort", abortHandler);

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const text = await response.text();
    /** @type {any} */
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { error: text };
      }
    }

    if (!response.ok) {
      throw new ApiError(payload?.error || `Request failed with status ${response.status}.`, {
        status: response.status,
        data: payload
      });
    }

    return /** @type {T} */ (payload);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Try again.", { cause: error });
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(error instanceof Error ? error.message : "Request failed.", { cause: error });
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortHandler);
  }
};

/**
 * @param {unknown} error
 * @param {string} fallbackMessage
 * @returns {string}
 */
export const getErrorMessage = (error, fallbackMessage) => {
  if (error instanceof ApiError) {
    return error.message || fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }
  return fallbackMessage;
};
