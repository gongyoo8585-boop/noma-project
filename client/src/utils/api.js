"use strict";

const isLocalHost =
  typeof window !== "undefined" &&
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );

export const API_BASE_URL =
  (
    typeof window !== "undefined" &&
    window.__ENV__ &&
    window.__ENV__.API_BASE_URL
  ) ||
  (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    (
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL
    )
  ) ||
  (
    isLocalHost
      ? "/api"
      : "https://api.nora365.co.kr/api"
  );

export function getAuthToken() {
  return (
    localStorage.getItem("adminToken") ||
    sessionStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    sessionStorage.getItem("jwt") ||
    localStorage.getItem("local-admin-token") ||
    sessionStorage.getItem("local-admin-token") ||
    ""
  );
}

export function createApiUrl(path = "") {
  const safePath = String(path || "");

  if (
    safePath.startsWith("http://") ||
    safePath.startsWith("https://")
  ) {
    return safePath.replace("/api/api", "/api");
  }

  const base = API_BASE_URL
    .replace(/\/+$/, "")
    .replace("/api/api", "/api");

  const endpoint = safePath.startsWith("/")
    ? safePath
    : `/${safePath}`;

  return `${base}${endpoint}`.replace("/api/api", "/api");
}

export async function apiFetch(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeout || 10000;

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(createApiUrl(path), {
      ...options,
      headers,
      credentials: options.credentials || "include",
      cache: options.cache || "no-store",
      signal: options.signal || controller.signal,
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.msg ||
        data?.message ||
        data?.error ||
        `API_ERROR_${response.status}`;

      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function apiGet(path, options = {}) {
  return apiFetch(path, {
    ...options,
    method: "GET",
  });
}

export function apiPost(path, body, options = {}) {
  return apiFetch(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}

export function apiPut(path, body, options = {}) {
  return apiFetch(path, {
    ...options,
    method: "PUT",
    body: JSON.stringify(body || {}),
  });
}

export function apiPatch(path, body, options = {}) {
  return apiFetch(path, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(body || {}),
  });
}

export function apiDelete(path, options = {}) {
  return apiFetch(path, {
    ...options,
    method: "DELETE",
  });
}

const api = {
  baseURL: API_BASE_URL,
  getAuthToken,
  createApiUrl,
  fetch: apiFetch,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
};

export default api;