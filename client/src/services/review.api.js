"use strict";

if (typeof process === "undefined") {
  window.process = { env: {} };
}

import axios from "axios";

/**
 * =====================================================
 * REVIEW API SERVICE
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
  reviews: 0,
  reviewCount: 0,
  hidden: 0,
  reported: 0,
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
    return (
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
      ""
    );
  } catch (e) {
    return "";
  }
}

function isSafeToken(token) {
  return (
    token &&
    token !== "undefined" &&
    token !== "null" &&
    String(token).trim() !== ""
  );
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
        "TOKEN LOAD ERROR:",
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
      "REVIEW_API_ERROR";

    if (status === 401) {
      try {
        if (!isAdminPage() && !isLoginPage()) {
          localStorage.removeItem("token");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("authToken");
          localStorage.removeItem("adminToken");
          localStorage.removeItem("jwt");
          localStorage.removeItem("user");

          sessionStorage.removeItem("token");
          sessionStorage.removeItem("accessToken");
          sessionStorage.removeItem("authToken");
          sessionStorage.removeItem("adminToken");
          sessionStorage.removeItem("jwt");

          if (
            !authAlertShown &&
            typeof window !== "undefined"
          ) {
            authAlertShown = true;

            alert("로그인이 필요합니다.");

            window.location.href = "/login";
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

function emptyReviewList() {
  return {
    ok: true,
    items: [],
    data: [],
    list: [],
  };
}

function normalizeReviewList(res) {
  const list =
    (Array.isArray(res) && res) ||
    (Array.isArray(res?.items) && res.items) ||
    (Array.isArray(res?.data) && res.data) ||
    (Array.isArray(res?.list) && res.list) ||
    (Array.isArray(res?.reviews) && res.reviews) ||
    (Array.isArray(res?.data?.items) && res.data.items) ||
    (Array.isArray(res?.data?.data) && res.data.data) ||
    (Array.isArray(res?.data?.list) && res.data.list) ||
    (Array.isArray(res?.data?.reviews) && res.data.reviews) ||
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
      res?.reviews ??
      res?.reviewCount ??
      statsCache.total,
    count:
      res?.count ??
      res?.total ??
      res?.reviews ??
      res?.reviewCount ??
      statsCache.count,
    reviews:
      res?.reviews ??
      res?.reviewCount ??
      res?.total ??
      res?.count ??
      statsCache.reviews,
    reviewCount:
      res?.reviewCount ??
      res?.reviews ??
      res?.total ??
      res?.count ??
      statsCache.reviewCount,
  };
}

const reviewApi = {
  create(data) {
    return Promise.resolve({
      ok: true,
      data: data || null,
      item: data || null,
      message: "리뷰 기능이 비활성화되었습니다.",
    });
  },

  getMyList(params = {}) {
    cleanParams(params);

    return Promise.resolve(emptyReviewList());
  },

  getByShop(shopId, params = {}) {
    if (!shopId) {
      return Promise.resolve(emptyReviewList());
    }

    cleanParams(params);

    return Promise.resolve(emptyReviewList());
  },

  getDetail(id) {
    requireId(id, "reviewId");

    return Promise.resolve({
      ok: true,
      item: null,
      data: null,
    });
  },

  update(id, data) {
    requireId(id, "reviewId");

    return Promise.resolve({
      ok: true,
      data: data || null,
      item: data || null,
      message: "리뷰 기능이 비활성화되었습니다.",
    });
  },

  remove(id) {
    requireId(id, "reviewId");

    return Promise.resolve({
      ok: true,
      id,
      deleted: true,
    });
  },

  report(id, reason = "") {
    requireId(id, "reviewId");

    return Promise.resolve({
      ok: true,
      id,
      reason,
    });
  },

  async getStats(params = {}) {
    try {
      const now = Date.now();

      if (now - lastStatsAt < 3000) {
        return statsCache;
      }

      lastStatsAt = now;
      cleanParams(params);

      statsCache =
        normalizeStats({
          ok: true,
          total: 0,
          count: 0,
          reviews: 0,
          reviewCount: 0,
          hidden: 0,
          reported: 0,
          items: [],
          data: [],
          list: [],
        });

      return statsCache;
    } catch (e) {
      console.warn(
        "REVIEW FALLBACK → getStats empty"
      );

      return statsCache;
    }
  },

  async getAdminList(params = {}) {
    try {
      const now = Date.now();

      if (now - lastAdminListAt < 3000) {
        return adminListCache;
      }

      lastAdminListAt = now;
      cleanParams(params);

      adminListCache =
        normalizeReviewList({
          ok: true,
          items: [],
          data: [],
          list: [],
        });

      return adminListCache;
    } catch (e) {
      console.warn(
        "REVIEW FALLBACK → getAdminList empty"
      );

      return adminListCache;
    }
  },

  hide(id) {
    requireId(id, "reviewId");

    return Promise.resolve({
      ok: true,
      id,
      hidden: true,
    });
  },

  restore(id) {
    requireId(id, "reviewId");

    return Promise.resolve({
      ok: true,
      id,
      hidden: false,
      restored: true,
    });
  },

  reply(id, content) {
    requireId(id, "reviewId");

    if (
      !content ||
      !String(content).trim()
    ) {
      throw new Error(
        "답글 내용 필요"
      );
    }

    return Promise.resolve({
      ok: true,
      id,
      content: String(
        content
      ).trim(),
    });
  },

  adminRemove(id) {
    requireId(id, "reviewId");

    return Promise.resolve({
      ok: true,
      id,
      deleted: true,
    });
  },

  safeGetMyList: async (params = {}) => {
    try {
      cleanParams(params);

      return emptyReviewList();
    } catch (e) {
      console.warn(
        "REVIEW FALLBACK → getMyList empty"
      );

      return emptyReviewList();
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

export default reviewApi;
