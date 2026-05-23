// /client/src/services/reservation.api.js

"use strict";

if (typeof process === "undefined") {
  window.process = { env: {} };
}

import axios from "axios";

/**
 * =====================================================
 * RESERVATION API
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
  if (
    API.defaults.baseURL &&
    API.defaults.baseURL.includes("/api/api")
  ) {
    API.defaults.baseURL =
      API.defaults.baseURL.replace(
        "/api/api",
        "/api"
      );

    console.warn(
      "FIXED RESERVATION API BASE URL:",
      API.defaults.baseURL
    );
  }
} catch (e) {
  console.error(
    "RESERVATION BASE URL FIX ERROR:",
    e
  );
}

let authAlertShown = false;

let lastAdminListAt = 0;
let lastStatsAt = 0;
let lastSlotsAt = 0;

let adminListCache = {
  ok: true,
  list: [],
  items: [],
  data: [],
};

let statsCache = {
  ok: true,
  total: 0,
  count: 0,
  reservations: 0,
  reservationCount: 0,
  pending: 0,
  confirmed: 0,
  cancelled: 0,
  completed: 0,
  items: [],
  data: [],
  list: [],
};

let slotsCache = [];

function cleanParams(params = {}) {
  try {
    return Object.fromEntries(
      Object.entries(params).filter(
        ([_, value]) =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
    );
  } catch (e) {
    console.error(
      "CLEAN PARAMS ERROR:",
      e
    );

    return {};
  }
}

function getStorageItem(key) {
  try {
    return (
      localStorage.getItem(key) ||
      sessionStorage.getItem(key) ||
      ""
    );
  } catch (e) {
    return "";
  }
}

function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch (e) {
    console.error(
      "REMOVE STORAGE ERROR:",
      e
    );
  }
}

function getToken() {
  return (
    getStorageItem("token") ||
    getStorageItem("accessToken") ||
    getStorageItem("authToken") ||
    getStorageItem("adminToken") ||
    getStorageItem("jwt") ||
    getStorageItem("local-admin-token") ||
    ""
  );
}

function isSafeToken(token) {
  return (
    token &&
    token !== "undefined" &&
    token !== "null" &&
    String(token).trim() !== ""
  );
}

function isAdminPage() {
  try {
    return (
      window.location.pathname === "/admin" ||
      window.location.pathname.startsWith(
        "/admin/"
      )
    );
  } catch (e) {
    return false;
  }
}

function isLoginPage() {
  try {
    return (
      window.location.pathname === "/login" ||
      window.location.pathname.startsWith(
        "/login"
      )
    );
  } catch (e) {
    return false;
  }
}

function normalizeListResponse(res) {
  try {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.items)) {
      return res.items;
    }

    if (Array.isArray(res?.list)) {
      return res.list;
    }

    if (Array.isArray(res?.data?.list)) {
      return res.data.list;
    }

    if (Array.isArray(res?.data?.items)) {
      return res.data.items;
    }

    return [];
  } catch (e) {
    console.error(
      "NORMALIZE LIST ERROR:",
      e
    );

    return [];
  }
}

function normalizeAdminList(res) {
  const list =
    normalizeListResponse(res);

  return {
    ok: res?.ok !== false,
    list,
    items: list,
    data: list,
  };
}

function normalizeStats(res) {
  try {
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
        res?.reservations ??
        res?.reservationCount ??
        0,

      count:
        res?.count ??
        res?.total ??
        res?.reservations ??
        res?.reservationCount ??
        0,

      reservations:
        res?.reservations ??
        res?.reservationCount ??
        res?.total ??
        res?.count ??
        0,

      reservationCount:
        res?.reservationCount ??
        res?.reservations ??
        res?.total ??
        res?.count ??
        0,

      pending:
        res?.pending ?? 0,

      confirmed:
        res?.confirmed ?? 0,

      cancelled:
        res?.cancelled ?? 0,

      completed:
        res?.completed ?? 0,

      items:
        normalizeListResponse(res),

      data:
        normalizeListResponse(res),

      list:
        normalizeListResponse(res),
    };
  } catch (e) {
    console.error(
      "NORMALIZE STATS ERROR:",
      e
    );

    return statsCache;
  }
}

function clearAuthStorage() {
  removeStorageItem("token");
  removeStorageItem("accessToken");
  removeStorageItem("authToken");
  removeStorageItem("adminToken");
  removeStorageItem("jwt");
  removeStorageItem("local-admin-token");
  removeStorageItem("user");
}

API.interceptors.request.use(
  (config) => {
    try {
      const token = getToken();

      if (isSafeToken(token)) {
        config.headers =
          config.headers || {};

        config.headers.Authorization =
          `Bearer ${token}`;

        config.headers["x-access-token"] =
          token;

        config.headers["x-auth-token"] =
          token;
      }
    } catch (e) {
      console.error(
        "RESERVATION TOKEN ERROR:",
        e
      );
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

API.interceptors.response.use(
  (response) => {
    return response?.data ?? response;
  },

  (err) => {
    const status =
      err?.response?.status;

    const message =
      err?.response?.data?.message ||
      err?.response?.data?.msg ||
      err?.message ||
      "RESERVATION API ERROR";

    if (status === 401) {
      try {
        if (
          !isAdminPage() &&
          !isLoginPage()
        ) {
          clearAuthStorage();

          if (
            !authAlertShown &&
            typeof window !==
              "undefined"
          ) {
            authAlertShown = true;

            alert(
              "로그인이 필요합니다."
            );

            window.location.href =
              "/login";
          }
        }
      } catch (e) {
        console.error(
          "AUTH HANDLE ERROR:",
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

const reservationApi = {
  create(data = {}) {
    return API.post(
      "/reservations",
      data
    );
  },

  createTx(data = {}) {
    return API.post(
      "/reservations/tx",
      data
    );
  },

  getMyList(params = {}) {
    return API.get(
      "/reservations/me",
      {
        params:
          cleanParams(params),
      }
    );
  },

  getDetail(id) {
    return API.get(
      `/reservations/${id}`
    );
  },

  cancel(id) {
    return API.post(
      `/reservations/${id}/cancel`
    );
  },

  cancelTx(id) {
    return API.post(
      `/reservations/${id}/cancel-tx`
    );
  },

  async getSlots(shopId, date) {
    try {
      const now = Date.now();

      if (
        now - lastSlotsAt < 2000 &&
        Array.isArray(slotsCache)
      ) {
        return slotsCache;
      }

      lastSlotsAt = now;

      const res =
        await API.get(
          "/reservations/slots",
          {
            params:
              cleanParams({
                shopId,
                date,
              }),
          }
        );

      slotsCache =
        normalizeListResponse(res);

      return slotsCache;
    } catch (e) {
      console.warn(
        "RESERVATION SLOT FALLBACK:",
        e?.message
      );

      return Array.isArray(
        slotsCache
      )
        ? slotsCache
        : [];
    }
  },

  async getAdminList(params = {}) {
    try {
      const now = Date.now();

      if (
        now - lastAdminListAt <
        3000
      ) {
        return adminListCache;
      }

      lastAdminListAt = now;

      const res =
        await API.get(
          "/reservations/admin",
          {
            params:
              cleanParams(params),
          }
        );

      adminListCache =
        normalizeAdminList(res);

      return adminListCache;
    } catch (e) {
      console.warn(
        "RESERVATION ADMIN FALLBACK:",
        e?.message
      );

      return adminListCache;
    }
  },

  updateStatus(id, status) {
    return API.patch(
      `/reservations/${id}/status`,
      {
        status,
      }
    );
  },

  updateStatusTx(id, status) {
    return API.patch(
      `/reservations/${id}/status-tx`,
      {
        status,
      }
    );
  },

  remove(id) {
    return API.delete(
      `/reservations/${id}`
    );
  },

  adminCancel(id) {
    return API.delete(
      `/reservations/${id}/admin-cancel`
    );
  },

  async getStats() {
    try {
      const now = Date.now();

      if (
        now - lastStatsAt <
        3000
      ) {
        return statsCache;
      }

      lastStatsAt = now;

      const res =
        await API.get(
          "/reservations/admin/stats"
        );

      statsCache =
        normalizeStats(res);

      return statsCache;
    } catch (e) {
      console.warn(
        "RESERVATION STATS FALLBACK:",
        e?.message
      );

      return statsCache;
    }
  },

  getTxStatus(id) {
    return API.get(
      `/reservations/${id}/tx-status`
    );
  },

  resetCache() {
    lastAdminListAt = 0;
    lastStatsAt = 0;
    lastSlotsAt = 0;

    adminListCache = {
      ok: true,
      list: [],
      items: [],
      data: [],
    };

    statsCache = {
      ok: true,
      total: 0,
      count: 0,
      reservations: 0,
      reservationCount: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      items: [],
      data: [],
      list: [],
    };

    slotsCache = [];
  },

  _ensureBaseURL: (() => {
    try {
      if (
        API.defaults.baseURL &&
        API.defaults.baseURL.includes(
          "/api/api"
        )
      ) {
        API.defaults.baseURL =
          API.defaults.baseURL.replace(
            "/api/api",
            "/api"
          );
      }
    } catch (e) {
      console.error(
        "ENSURE BASE URL ERROR:",
        e
      );
    }
  })(),
};

export default reservationApi;