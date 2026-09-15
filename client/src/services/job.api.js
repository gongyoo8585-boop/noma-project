"use strict";

import axios from "axios";

const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_BASE_URL = isLocalHost
  ? "http://localhost:10000/api"
  : (
      (typeof window !== "undefined" &&
        window.__ENV__ &&
        window.__ENV__.API_BASE_URL) ||
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) ||
      "https://api.nora365.co.kr/api"
    );

const API = axios.create({
  baseURL: String(API_BASE_URL || "").replace(/\/+$/, ""),
  timeout: 60000,
  withCredentials: true,
});

function getAdminAuthState() {
  if (typeof window === "undefined") {
    return { token: "", isLocalAdmin: false };
  }

  const localAdminToken =
    localStorage.getItem("local-admin-token") ||
    sessionStorage.getItem("local-admin-token") ||
    "";

  const token =
    localStorage.getItem("adminToken") ||
    sessionStorage.getItem("adminToken") ||
    localAdminToken ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    "";

  return {
    token,
    isLocalAdmin: !!localAdminToken,
  };
}

function normalizeToken(value) {
  const token = String(value || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!token || token === "undefined" || token === "null") {
    return "";
  }

  return token;
}

function isAdminRequest(config = {}) {
  const url = String(config?.url || "").toLowerCase();
  return url.startsWith("/jobs/admin") || url.includes("/jobs/admin/");
}

function getUserAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  const candidates = [
    localStorage.getItem("token"),
    localStorage.getItem("accessToken"),
    localStorage.getItem("authToken"),
    localStorage.getItem("jwt"),
    sessionStorage.getItem("token"),
    sessionStorage.getItem("accessToken"),
    sessionStorage.getItem("authToken"),
    sessionStorage.getItem("jwt"),
  ];

  for (const value of candidates) {
    const token = normalizeToken(value);
    if (token) return token;
  }

  return "";
}

function isUserJobWriteRequest(config = {}) {
  const url = String(config?.url || "").toLowerCase();

  return (
    url.startsWith("/jobs/write-context") ||
    url.startsWith("/jobs/premium") ||
    url.startsWith("/jobs/normal")
  );
}

API.interceptors.request.use((config) => {
  if (isAdminRequest(config)) {
    const authState = getAdminAuthState();
    const token = normalizeToken(authState.token);

    if (!token) {
      return config;
    }

    config.headers = config.headers || {};

    if (authState.isLocalAdmin || /^local-admin-/i.test(token)) {
      config.headers["x-local-admin"] = "true";
      config.headers["x-local-admin-token"] = token;
      return config;
    }

    config.headers.Authorization = `Bearer ${token}`;
    config.headers.authorization = `Bearer ${token}`;
    config.headers["x-access-token"] = token;
    config.headers["x-auth-token"] = token;

    return config;
  }

  if (isUserJobWriteRequest(config)) {
    const token = getUserAuthToken();

    if (!token) {
      return config;
    }

    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    config.headers.authorization = `Bearer ${token}`;
    config.headers["x-access-token"] = token;
    config.headers["x-auth-token"] = token;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const responseData = error?.response?.data || {};
    const message =
      responseData?.message ||
      responseData?.msg ||
      responseData?.error ||
      error?.message ||
      "JOB_API_ERROR";

    const nextError = new Error(message);
    nextError.status = error?.response?.status;
    nextError.response = error?.response;
    nextError.data = responseData;

    return Promise.reject(nextError);
  }
);

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params || {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
}

function unwrap(response) {
  return response?.data || {};
}

const jobApi = {
  getList: async (params = {}) => {
    const response = await API.get("/jobs", {
      params: cleanParams(params),
    });

    return unwrap(response);
  },

  getDetail: async (jobId, params = {}) => {
    if (!jobId) {
      throw new Error("JOB_ID_REQUIRED");
    }

    const response = await API.get(`/jobs/${encodeURIComponent(jobId)}`, {
      params: cleanParams(params),
    });

    return unwrap(response);
  },

  getWriteContext: async () => {
    const response = await API.get("/jobs/write-context");
    return unwrap(response);
  },

  createPremium: async (payload = {}, imageFiles = []) => {
    const files = (Array.isArray(imageFiles) ? imageFiles : [imageFiles])
      .filter(Boolean)
      .filter((file) =>
        typeof File === "undefined" ? true : file instanceof File
      )
      .slice(0, 12);

    if (!files.length || typeof FormData === "undefined") {
      const response = await API.post("/jobs/premium", payload);
      return unwrap(response);
    }

    const formData = new FormData();

    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        value.forEach((item) => {
          formData.append(key, String(item));
        });
        return;
      }

      if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
        return;
      }

      formData.append(key, String(value));
    });

    files.forEach((file) => {
      formData.append("images", file, file?.name || "job-image.jpg");
    });

    const response = await API.post("/jobs/premium", formData);
    return unwrap(response);
  },

  createNormal: async (payload = {}, imageFiles = []) => {
    const files = (Array.isArray(imageFiles) ? imageFiles : [imageFiles])
      .filter(Boolean)
      .filter((file) =>
        typeof File === "undefined" ? true : file instanceof File
      )
      .slice(0, 12);

    if (!files.length || typeof FormData === "undefined") {
      const response = await API.post("/jobs/normal", payload);
      return unwrap(response);
    }

    const formData = new FormData();

    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        value.forEach((item) => {
          formData.append(key, String(item));
        });
        return;
      }

      if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
        return;
      }

      formData.append(key, String(value));
    });

    files.forEach((file) => {
      formData.append("images", file, file?.name || "job-image.jpg");
    });

    const response = await API.post("/jobs/normal", formData);
    return unwrap(response);
  },

  adminGetList: async (params = {}) => {
    const response = await API.get("/jobs/admin/list", {
      params: cleanParams(params),
    });

    return unwrap(response);
  },

  adminGetDetail: async (jobId) => {
    if (!jobId) {
      throw new Error("JOB_ID_REQUIRED");
    }

    const response = await API.get(`/jobs/admin/${encodeURIComponent(jobId)}`);
    return unwrap(response);
  },

  adminCreate: async (payload = {}) => {
    const response = await API.post("/jobs/admin", payload);
    return unwrap(response);
  },

  adminUpdate: async (jobId, payload = {}) => {
    if (!jobId) {
      throw new Error("JOB_ID_REQUIRED");
    }

    const response = await API.patch(
      `/jobs/admin/${encodeURIComponent(jobId)}`,
      payload
    );

    return unwrap(response);
  },

  adminClose: async (jobId) => {
    if (!jobId) {
      throw new Error("JOB_ID_REQUIRED");
    }

    const response = await API.post(
      `/jobs/admin/${encodeURIComponent(jobId)}/close`
    );

    return unwrap(response);
  },

  adminDelete: async (jobId) => {
    if (!jobId) {
      throw new Error("JOB_ID_REQUIRED");
    }

    const response = await API.delete(`/jobs/admin/${encodeURIComponent(jobId)}`);
    return unwrap(response);
  },
};

export { API_BASE_URL };
export default jobApi;
