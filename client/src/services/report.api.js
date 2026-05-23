"use strict";

if (typeof process === "undefined") {
  window.process = { env: {} };
}

import axios from "axios";

/**
 * =====================================================
 * REPORT API SERVICE
 * =====================================================
 */

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    window.__ENV__?.API_BASE_URL ||
    "http://localhost:10000/api",

  timeout: 10000,
});

try {
  if (API.defaults.baseURL?.includes("/api/api")) {
    API.defaults.baseURL =
      API.defaults.baseURL.replace(
        "/api/api",
        "/api"
      );

    console.warn(
      "FIXED BASE URL:",
      API.defaults.baseURL
    );
  }
} catch {}

let authAlertShown = false;
let lastAdminListAt = 0;
let lastStatsAt = 0;

let adminListCache = {
  ok: true,
  items: [],
  data: [],
  list: [],
};

let statsCache = {
  ok: true,
  total: 0,
  count: 0,
  reports: 0,
  reportCount: 0,
  pending: 0,
  completed: 0,
  rejected: 0,
  items: [],
  data: [],
  list: [],
};

function isAdminPage() {
  try {
    return (
      window.location.pathname === "/admin" ||
      window.location.pathname.startsWith("/admin/")
    );
  } catch (e) {
    return false;
  }
}

function isLoginPage() {
  try {
    return (
      window.location.pathname === "/login" ||
      window.location.pathname.startsWith("/login")
    );
  } catch (e) {
    return false;
  }
}

function getToken() {
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("adminToken") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("local-admin-token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("accessToken") ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("adminToken") ||
      sessionStorage.getItem("jwt") ||
      sessionStorage.getItem("local-admin-token") ||
      "";

    if (
      token === "undefined" ||
      token === "null"
    ) {
      return "";
    }

    return token;
  } catch (e) {
    return "";
  }
}

function cleanAuthStorage() {
  try {
    [
      "token",
      "accessToken",
      "authToken",
      "adminToken",
      "jwt",
      "local-admin-token",
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
  } catch (e) {
    console.error(
      "AUTH CLEAR ERROR:",
      e
    );
  }
}

function normalizeReportList(res) {
  const list =
    (Array.isArray(res) && res) ||
    (Array.isArray(res?.items) && res.items) ||
    (Array.isArray(res?.data) && res.data) ||
    (Array.isArray(res?.list) && res.list) ||
    (Array.isArray(res?.reports) && res.reports) ||
    (Array.isArray(res?.data?.items) && res.data.items) ||
    (Array.isArray(res?.data?.data) && res.data.data) ||
    (Array.isArray(res?.data?.list) && res.data.list) ||
    (Array.isArray(res?.data?.reports) && res.data.reports) ||
    [];

  return {
    ok: res?.ok !== false,
    items: list,
    data: list,
    list,
  };
}

function normalizeStats(res) {
  if (!res || typeof res !== "object") {
    return statsCache;
  }

  return {
    ...statsCache,
    ...res,
    ok: res?.ok !== false,
    total:
      res?.total ??
      res?.count ??
      res?.reports ??
      res?.reportCount ??
      statsCache.total,
    count:
      res?.count ??
      res?.total ??
      res?.reports ??
      res?.reportCount ??
      statsCache.count,
    reports:
      res?.reports ??
      res?.reportCount ??
      res?.total ??
      res?.count ??
      statsCache.reports,
    reportCount:
      res?.reportCount ??
      res?.reports ??
      res?.total ??
      res?.count ??
      statsCache.reportCount,
  };
}

API.interceptors.request.use(
  (config) => {
    try {
      const token =
        getToken();

      if (
        token &&
        token !== "undefined" &&
        token !== "null"
      ) {
        config.headers =
          config.headers || {};

        config.headers.Authorization =
          `Bearer ${token}`;

        config.headers["x-access-token"] =
          token;

        config.headers["x-auth-token"] =
          token;

        if (
          String(token).startsWith(
            "local-admin-"
          )
        ) {
          config.headers["x-local-admin"] =
            "true";
        }
      }
    } catch (e) {
      console.error(
        "TOKEN ERROR:",
        e
      );
    }

    return config;
  },

  (err) => Promise.reject(err)
);

API.interceptors.response.use(
  (res) => res?.data ?? res,

  (err) => {
    const status =
      err?.response?.status;

    const message =
      err?.response?.data?.message ||
      err?.response?.data?.msg ||
      err?.message ||
      "REPORT_API_ERROR";

    if (status === 401) {
      try {
        if (!isAdminPage() && !isLoginPage()) {
          cleanAuthStorage();

          if (
            typeof window !==
              "undefined" &&
            !authAlertShown
          ) {
            authAlertShown = true;

            alert("로그인이 필요합니다.");

            window.location.href =
              "/login";
          }
        }
      } catch (e) {
        console.error(
          "AUTH CLEAR ERROR:",
          e
        );
      }
    }

    if (status === 429) {
      return Promise.reject(
        new Error(
          "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
        )
      );
    }

    return Promise.reject(
      new Error(message)
    );
  }
);

function requireId(id, name = "id") {
  if (!id) {
    throw new Error(`${name} 필요`);
  }
}

function cleanParams(params = {}) {
  try {
    return Object.fromEntries(
      Object.entries(params).filter(
        ([_, v]) =>
          v !== undefined &&
          v !== null &&
          v !== ""
      )
    );
  } catch (e) {
    return {};
  }
}

const reportApi = {
  create(data) {
    return API.post(
      "/reports",
      data
    );
  },

  getMyList(params = {}) {
    return API.get(
      "/reports/me",
      {
        params: cleanParams(params),
      }
    );
  },

  async getAdminList(params = {}) {
    try {
      const now =
        Date.now();

      if (
        now - lastAdminListAt < 3000
      ) {
        return adminListCache;
      }

      lastAdminListAt =
        now;

      const res =
        await API.get(
          "/reports/admin",
          {
            params:
              cleanParams(params),
          }
        );

      adminListCache =
        normalizeReportList(res);

      return adminListCache;
    } catch (e) {
      console.warn(
        "REPORT FALLBACK → ADMIN EMPTY"
      );

      return adminListCache;
    }
  },

  getDetail(id) {
    requireId(id, "reportId");

    return API.get(
      `/reports/${id}`
    );
  },

  updateStatus(id, status) {
    requireId(id, "reportId");

    return API.patch(
      `/reports/${id}/status`,
      { status }
    );
  },

  remove(id) {
    requireId(id, "reportId");

    return API.delete(
      `/reports/${id}`
    );
  },

  async getStats(params = {}) {
    try {
      const now =
        Date.now();

      if (
        now - lastStatsAt < 3000
      ) {
        return statsCache;
      }

      lastStatsAt =
        now;

      const res =
        await API.get(
          "/reports/stats",
          {
            params:
              cleanParams(params),
          }
        );

      statsCache =
        normalizeStats(res);

      return statsCache;
    } catch (e) {
      console.warn(
        "REPORT FALLBACK → STATS EMPTY"
      );

      return statsCache;
    }
  },

  safeGetMyList: async (params = {}) => {
    try {
      return await reportApi.getMyList(
        params
      );
    } catch (e) {
      console.warn(
        "REPORT FALLBACK → EMPTY"
      );

      return {
        ok: true,
        items: [],
        data: [],
        list: [],
      };
    }
  },

  _ensureBaseURL: (() => {
    try {
      if (
        API.defaults.baseURL?.includes(
          "/api/api"
        )
      ) {
        API.defaults.baseURL =
          API.defaults.baseURL.replace(
            "/api/api",
            "/api"
          );
      }
    } catch {}
  })(),
};

export default reportApi;