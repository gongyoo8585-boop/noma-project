"use strict";

/**
 * =====================================================
 * 🔥 USER API (FINAL STABLE COMPLETE)
 * ✔ 기존 기능 100% 유지
 * ✔ 휴대폰 인증번호 발송 API 최소 추가
 * ✔ 휴대폰 인증번호 확인 API 최소 추가
 * =====================================================
 */

import axios from "axios";

/* =========================
🔥 BASE URL
========================= */
const isLocalHost =
  typeof window !== "undefined" &&
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );

const API_BASE_URL =
  isLocalHost
    ? "http://localhost:10000/api"
    : (
        (typeof window !== "undefined" &&
          window.__ENV__ &&
          window.__ENV__.API_BASE_URL) ||
        (typeof import.meta !== "undefined" &&
          import.meta.env &&
          (
            import.meta.env.VITE_API_BASE_URL ||
            import.meta.env.VITE_API_URL
          )) ||
        "https://api.nora365.co.kr/api"
      );

/* =========================
🔥 AXIOS INSTANCE
========================= */
const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
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
      "FIXED BASE URL:",
      API.defaults.baseURL
    );
  }

  if (
    API.defaults.baseURL &&
    API.defaults.baseURL.endsWith("/")
  ) {
    API.defaults.baseURL =
      API.defaults.baseURL.slice(0, -1);
  }
} catch (e) {
  console.warn(
    "BASE URL FIX ERROR:",
    e.message
  );
}

/* =========================
🔥 CACHE / LOCK
========================= */
let authAlertShown = false;
let lastStatsAt = 0;
let lastListAt = 0;
let listPending = null;

const USER_LIST_TIMEOUT_MS = 15000;
const USER_STATS_TIMEOUT_MS = 15000;
const USER_FAST_FALLBACK_MS = 300;

function resolveAfter(ms, value) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });
}

let statsCache = {
  ok: true,
  total: 0,
  count: 0,
  users: 0,
  userCount: 0,
  admin: 0,
  blocked: 0,
  items: [],
  list: [],
  usersList: [],
  data: [],
};

let listCache = {
  ok: true,
  total: 0,
  count: 0,
  items: [],
  list: [],
  users: [],
  data: [],
};

/* =========================
🔥 TOKEN UTIL
========================= */
function decodeTokenPayload(token) {
  try {
    const payload =
      String(token || "")
        .split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized =
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padded =
      normalized +
      "=".repeat(
        (4 - (normalized.length % 4)) % 4
      );

    return JSON.parse(
      decodeURIComponent(
        atob(padded)
          .split("")
          .map((char) =>
            `%${char
              .charCodeAt(0)
              .toString(16)
              .padStart(2, "0")}`
          )
          .join("")
      )
    );
  } catch {
    return null;
  }
}

function isAdminToken(token) {
  const value =
    String(token || "")
      .replace(/^Bearer\s+/i, "")
      .trim();

  const payload =
    decodeTokenPayload(value);

  const role =
    String(payload?.role || "")
      .trim()
      .toLowerCase();

  return (
    payload?.isAdmin === true ||
    role === "admin" ||
    role === "superadmin" ||
    role === "super_admin"
  );
}

function isTokenExpired(token, skewMs = 5000) {
  const payload =
    decodeTokenPayload(token);

  const expiresAt =
    Number(payload?.exp || 0) * 1000;

  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    return false;
  }

  return Date.now() + skewMs >= expiresAt;
}

function isUsableAdminToken(token) {
  return (
    isAdminToken(token) &&
    !isTokenExpired(token)
  );
}

function isUsableUserToken(token) {
  return (
    !!token &&
    !isAdminToken(token) &&
    !isTokenExpired(token)
  );
}

function isAdminUser(user = {}) {
  if (
    !user ||
    typeof user !== "object"
  ) {
    return false;
  }

  const normalizedUser =
    normalizeAdminUser(user);

  return normalizedUser?.isAdmin === true;
}

function getStoredToken() {
  try {
    if (isAdminPage()) {
      const adminCandidates = [
        localStorage.getItem("adminToken"),
        localStorage.getItem("local-admin-token"),
        sessionStorage.getItem("adminToken"),
        sessionStorage.getItem("local-admin-token"),
      ]
        .filter(
          (token) =>
            token &&
            token !== "undefined" &&
            token !== "null"
        )
        .map((token) =>
          String(token)
            .replace(/^Bearer\s+/i, "")
            .trim()
        );

      const savedAdminToken =
        adminCandidates.find(isUsableAdminToken);

      if (savedAdminToken) {
        return savedAdminToken;
      }

      const legacyAdminCandidates = [
        localStorage.getItem("token"),
        localStorage.getItem("accessToken"),
        localStorage.getItem("authToken"),
        localStorage.getItem("jwt"),
        sessionStorage.getItem("token"),
        sessionStorage.getItem("accessToken"),
        sessionStorage.getItem("authToken"),
        sessionStorage.getItem("jwt"),
      ]
        .filter(
          (token) =>
            token &&
            token !== "undefined" &&
            token !== "null"
        )
        .map((token) =>
          String(token)
            .replace(/^Bearer\s+/i, "")
            .trim()
        );

      const legacyAdminToken =
        legacyAdminCandidates.find(isUsableAdminToken);

      if (legacyAdminToken) {
        saveAdminToken(legacyAdminToken);
        return legacyAdminToken;
      }

      return "";
    }

    const userCandidates = [
      localStorage.getItem("token"),
      localStorage.getItem("accessToken"),
      localStorage.getItem("authToken"),
      localStorage.getItem("jwt"),
      sessionStorage.getItem("token"),
      sessionStorage.getItem("accessToken"),
      sessionStorage.getItem("authToken"),
      sessionStorage.getItem("jwt"),
    ]
      .filter(
        (token) =>
          token &&
          token !== "undefined" &&
          token !== "null"
      )
      .map((token) =>
        String(token)
          .replace(/^Bearer\s+/i, "")
          .trim()
      );

    return (
      userCandidates.find(
        isUsableUserToken
      ) ||
      ""
    );
  } catch {
    return "";
  }
}

function extractToken(data = {}) {
  const token =
    data?.token ||
    data?.accessToken ||
    data?.access_token ||
    data?.authToken ||
    data?.jwt ||
    data?.adminToken ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.access_token ||
    data?.data?.authToken ||
    data?.data?.jwt ||
    data?.data?.adminToken ||
    data?.user?.token ||
    data?.user?.accessToken ||
    data?.user?.authToken ||
    data?.user?.adminToken ||
    "";

  if (
    token === "undefined" ||
    token === "null"
  ) {
    return "";
  }

  return token;
}

function extractUser(data = {}) {
  return (
    data?.user ||
    data?.data?.user ||
    data?.data?.data?.user ||
    data?.data ||
    null
  );
}

function normalizeAdminUser(user = {}) {
  const nextUser = {
    ...user,
  };

  const role =
    String(
      nextUser.role ||
      nextUser.userRole ||
      nextUser.type ||
      "user"
    )
      .trim();

  const normalizedRole =
    role === "superadmin"
      ? "superAdmin"
      : role === "super_admin"
      ? "superAdmin"
      : role;

  const isAdmin =
    nextUser.isAdmin === true ||
    normalizedRole === "admin" ||
    normalizedRole === "superAdmin";

  nextUser.role =
    normalizedRole;

  nextUser.userRole =
    nextUser.userRole ||
    normalizedRole;

  nextUser.type =
    nextUser.type ||
    normalizedRole;

  nextUser.isAdmin =
    isAdmin;

  return nextUser;
}

function saveToken(token) {
  if (
    !token ||
    token === "undefined" ||
    token === "null" ||
    isAdminToken(token)
  ) {
    return;
  }

  try {
    [
      "token",
      "accessToken",
      "authToken",
      "jwt",
    ].forEach((key) => {
      localStorage.setItem(
        key,
        token
      );

      sessionStorage.setItem(
        key,
        token
      );
    });
  } catch (e) {
    console.warn(
      "TOKEN SAVE ERROR:",
      e.message
    );
  }
}

function saveAdminToken(token) {
  const safeToken =
    String(token || "")
      .replace(/^Bearer\s+/i, "")
      .trim();

  if (
    !safeToken ||
    safeToken === "undefined" ||
    safeToken === "null" ||
    !isUsableAdminToken(safeToken)
  ) {
    return;
  }

  try {
    [
      "adminToken",
      "local-admin-token",
    ].forEach((key) => {
      localStorage.setItem(
        key,
        safeToken
      );

      sessionStorage.setItem(
        key,
        safeToken
      );
    });
  } catch (e) {
    console.warn(
      "ADMIN TOKEN SAVE ERROR:",
      e.message
    );
  }
}

function saveUser(user) {
  if (!user) return;

  try {
    const normalizedUser =
      normalizeAdminUser(user);

    const storageKey =
      normalizedUser?.isAdmin === true
        ? "adminUser"
        : "user";

    localStorage.setItem(
      storageKey,
      JSON.stringify(
        normalizedUser
      )
    );

    sessionStorage.setItem(
      storageKey,
      JSON.stringify(
        normalizedUser
      )
    );
  } catch (e) {
    console.warn(
      "USER SAVE ERROR:",
      e.message
    );
  }
}

function clearToken() {
  try {
    const keys =
      isAdminPage()
        ? [
            "adminToken",
            "local-admin-token",
            "adminUser",
            "local-admin",
            "isAdmin",
            "adminLoggedIn",
          ]
        : [
            "token",
            "accessToken",
            "authToken",
            "jwt",
            "user",
          ];

    keys.forEach((key) => {
      localStorage.removeItem(
        key
      );

      sessionStorage.removeItem(
        key
      );
    });
  } catch (e) {
    console.warn(
      "TOKEN CLEAR ERROR:",
      e.message
    );
  }
}

function normalizeStoredToken(token) {
  return String(token || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function removeStoredTokenValue(token) {
  const failedToken =
    normalizeStoredToken(token);

  if (!failedToken) {
    return;
  }

  try {
    const tokenKeys = [
      "adminToken",
      "local-admin-token",
      "token",
      "accessToken",
      "authToken",
      "jwt",
    ];

    [localStorage, sessionStorage].forEach((storage) => {
      tokenKeys.forEach((key) => {
        const savedToken =
          normalizeStoredToken(
            storage.getItem(key)
          );

        if (savedToken === failedToken) {
          storage.removeItem(key);
        }
      });
    });
  } catch (e) {
    console.warn(
      "FAILED ADMIN TOKEN CLEAR ERROR:",
      e.message
    );
  }
}

function clearInvalidAdminSession() {
  try {
    const adminKeys = [
      "adminToken",
      "local-admin-token",
      "adminUser",
      "local-admin",
      "isAdmin",
      "adminLoggedIn",
    ];

    [localStorage, sessionStorage].forEach((storage) => {
      adminKeys.forEach((key) => {
        storage.removeItem(key);
      });

      [
        "token",
        "accessToken",
        "authToken",
        "jwt",
      ].forEach((key) => {
        const savedToken =
          normalizeStoredToken(
            storage.getItem(key)
          );

        if (
          savedToken &&
          (
            isAdminToken(savedToken) ||
            isTokenExpired(savedToken)
          )
        ) {
          storage.removeItem(key);
        }
      });
    });
  } catch (e) {
    console.warn(
      "ADMIN SESSION CLEAR ERROR:",
      e.message
    );
  }
}

function getRequestAuthToken(config = {}) {
  const headers =
    config?.headers || {};

  return normalizeStoredToken(
    headers.Authorization ||
      headers.authorization ||
      headers["x-access-token"] ||
      headers["x-auth-token"] ||
      ""
  );
}

function applyRequestAuthToken(config = {}, token = "") {
  const safeToken =
    normalizeStoredToken(token);

  if (!safeToken) {
    return config;
  }

  config.headers =
    config.headers || {};

  config.headers.Authorization =
    `Bearer ${safeToken}`;
  config.headers.authorization =
    `Bearer ${safeToken}`;
  config.headers["x-access-token"] =
    safeToken;
  config.headers["x-auth-token"] =
    safeToken;

  if (safeToken.startsWith("local-admin-")) {
    config.headers["x-local-admin"] =
      "true";
  } else if (config.headers["x-local-admin"]) {
    delete config.headers["x-local-admin"];
  }

  return config;
}

function isAdminPage() {
  try {
    return (
      window.location.pathname === "/admin" ||
      window.location.pathname.startsWith("/admin/")
    );
  } catch {
    return false;
  }
}

function isLoginPage() {
  try {
    return (
      window.location.pathname === "/login" ||
      window.location.pathname.startsWith("/login")
    );
  } catch {
    return false;
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
  } catch {
    return {};
  }
}

function normalizeUserList(res) {
  const list =
    (Array.isArray(res) && res) ||
    (Array.isArray(res?.data) && res.data) ||
    (Array.isArray(res?.items) && res.items) ||
    (Array.isArray(res?.users) && res.users) ||
    (Array.isArray(res?.list) && res.list) ||
    (Array.isArray(res?.data?.items) && res.data.items) ||
    (Array.isArray(res?.data?.users) && res.data.users) ||
    (Array.isArray(res?.data?.list) && res.data.list) ||
    [];

  return {
    ok: res?.ok !== false,
    total:
      res?.total ||
      res?.count ||
      list.length,
    count:
      res?.count ||
      res?.total ||
      list.length,
    items: list,
    list,
    users: list,
    data: list,
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
      res?.users ??
      res?.userCount ??
      statsCache.total,
    count:
      res?.count ??
      res?.total ??
      res?.users ??
      res?.userCount ??
      statsCache.count,
    users:
      res?.users ??
      res?.userCount ??
      res?.total ??
      res?.count ??
      statsCache.users,
    userCount:
      res?.userCount ??
      res?.users ??
      res?.total ??
      res?.count ??
      statsCache.userCount,
  };
}

/* =========================
🔥 REQUEST INTERCEPTOR
========================= */
API.interceptors.request.use(
  (config) => {
    const token =
      getStoredToken();

    config.headers =
      config.headers || {};

    if (
      token &&
      token !== "undefined" &&
      token !== "null"
    ) {
      config.headers.Authorization =
        `Bearer ${token}`;

      config.headers.authorization =
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

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

/* =========================
🔥 RESPONSE INTERCEPTOR
========================= */
API.interceptors.response.use(
  (res) => {
    const data =
      res?.data;

    if (data?.data) {
      return data.data;
    }

    if (
      data?.user ||
      data?.token ||
      data?.accessToken ||
      data?.access_token ||
      data?.authToken ||
      data?.jwt ||
      data?.adminToken
    ) {
      return data;
    }

    if (
      data?.ok !== undefined
    ) {
      return data;
    }

    if (
      Array.isArray(data)
    ) {
      return data;
    }

    if (
      typeof data !== "object"
    ) {
      return data;
    }

    return data ?? res;
  },

  async (err) => {
    const status =
      err?.response?.status;

    const message =
      err?.response?.data?.message ||
      err?.response?.data?.msg ||
      err?.response?.data?.error ||
      err?.message ||
      "USER_API_ERROR";

    if (
      typeof message === "string" &&
      message.includes("timeout")
    ) {
      console.warn(
        "USER API FALLBACK:",
        message
      );
    } else {
      console.error(
        "USER API ERROR:",
        message
      );
    }

    if (
      typeof message === "string" &&
      (
        message.includes("buffering timed out") ||
        message.includes("ECONNREFUSED") ||
        message.includes("ENOTFOUND") ||
        message.includes("Mongo") ||
        message.includes("network")
      )
    ) {
      return Promise.reject({
        ok: false,
        error: true,
        message:
          "서버 DB 연결 중입니다. 잠시 후 다시 시도해주세요.",
      });
    }

    if (status === 429) {
      return Promise.reject({
        ok: false,
        error: true,
        status: 429,
        message:
          "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      });
    }

    if (status === 401) {
      const requestUrl =
        err?.config?.url || "";

      const isAuthRequest =
        requestUrl.includes("/auth/me") ||
        requestUrl.includes("/auth/verify");

      const isLoginRequest =
        requestUrl.includes("/auth/login");

      const isAdminRequest =
        requestUrl.includes("/admin") ||
        requestUrl.includes("/users") ||
        requestUrl.includes("/shops") ||
        requestUrl.includes("/shop") ||
        requestUrl.includes("/reservations") ||
        requestUrl.includes("/payments") ||
        requestUrl.includes("/reviews");

      if (
        isAdminPage() &&
        isAdminRequest &&
        !isLoginRequest
      ) {
        const failedToken =
          getRequestAuthToken(
            err?.config || {}
          );

        if (failedToken) {
          removeStoredTokenValue(
            failedToken
          );
        }

        const retryConfig =
          err?.config || null;

        const nextAdminToken =
          getStoredToken();

        if (
          retryConfig &&
          retryConfig.__noraAdminAuthRetry !== true &&
          nextAdminToken &&
          nextAdminToken !== failedToken
        ) {
          retryConfig.__noraAdminAuthRetry =
            true;

          applyRequestAuthToken(
            retryConfig,
            nextAdminToken
          );

          return API.request(
            retryConfig
          );
        }

        clearInvalidAdminSession();
        lastListAt = 0;
        lastStatsAt = 0;
        listPending = null;

        try {
          window.dispatchEvent(
            new Event("auth-updated")
          );
        } catch (e) {
          console.warn(
            "ADMIN AUTH UPDATE EVENT ERROR:",
            e.message
          );
        }

        const path =
          window.location.pathname;

        if (path !== "/admin") {
          window.location.replace(
            "/admin"
          );
        }
      }

      if (
        isAuthRequest &&
        !isLoginRequest &&
        !isAdminRequest &&
        !isAdminPage() &&
        !isLoginPage()
      ) {
        clearToken();

        const path =
          window.location.pathname;

        if (
          !authAlertShown &&
          path !== "/login" &&
          path !== "/signup"
        ) {
          authAlertShown = true;

          alert("로그인이 필요합니다.");

          window.location.replace(
            "/login"
          );
        }
      }
    }

    return Promise.reject(
      err?.response?.data || err
    );
  }
);

/* =========================
🔥 USER API
========================= */
const userApi = {
  async login(data) {
    const res =
      await API.post(
        "/auth/login",
        data
      );

    const token =
      extractToken(res);

    const adminToken =
      isAdminToken(token);

    const user =
      extractUser(res) ||
      {
        id:
          data?.id ||
          data?.email ||
          "",
        role:
          adminToken
            ? "admin"
            : "user",
        userRole:
          adminToken
            ? "admin"
            : "user",
        type:
          adminToken
            ? "admin"
            : "user",
        isAdmin:
          adminToken,
      };

    const normalizedUser =
      normalizeAdminUser(user);

    if (isAdminPage()) {
      if (
        token &&
        adminToken &&
        isAdminUser(normalizedUser)
      ) {
        saveAdminToken(token);
        saveUser(normalizedUser);
      }

      return res;
    }

    if (
      token &&
      !adminToken &&
      !isAdminUser(normalizedUser)
    ) {
      saveToken(token);
      saveUser(normalizedUser);
    }

    return res;
  },

  async register(data) {
    const res =
      await API.post(
        "/auth/register",
        data
      );

    const token =
      extractToken(res);

    const user =
      extractUser(res);

    if (
      token &&
      !isAdminToken(token)
    ) {
      saveToken(token);
    }

    if (
      user &&
      !isAdminUser(user)
    ) {
      saveUser(user);
    }

    lastListAt = 0;
    lastStatsAt = 0;

    return res;
  },

  async shopRegister(data) {
    const res =
      await API.post(
        "/auth/shop/register",
        data
      );

    lastListAt = 0;
    lastStatsAt = 0;

    return res;
  },

  async adminRegister(data) {
    return API.post(
      "/auth/admin/register",
      data
    );
  },

  sendVerificationCode(data) {
    return API.post(
      "/auth/send-code",
      data
    );
  },

  verifyVerificationCode(data) {
    return API.post(
      "/auth/verify-code",
      data
    );
  },

  sendEmailVerificationCode(data) {
    return API.post(
      "/auth/send-email-code",
      data
    );
  },

  verifyEmailVerificationCode(data) {
    return API.post(
      "/auth/verify-email-code",
      data
    );
  },

  async logout() {
    try {
      await API.post(
        "/auth/logout"
      );
    } catch (e) {
      console.warn(
        "LOGOUT API ERROR:",
        e?.message
      );
    } finally {
      clearToken();
    }

    return {
      ok: true,
    };
  },

  getMe() {
    return API.get("/auth/me");
  },

  checkAuth() {
    return API.get("/auth/verify");
  },

  update(data) {
    return API.put(
      "/users/me",
      data
    );
  },

  changePassword(data) {
    return API.post(
      "/users/change-password",
      data
    );
  },

  getDetail(id) {
    return API.get(
      `/users/${id}`
    );
  },

  remove(id) {
    return API.delete(
      `/users/${id}`
    );
  },

  async getList(params = {}) {
    try {
      const now =
        Date.now();

      const hasCachedList =
        Array.isArray(listCache.users) &&
        listCache.users.length > 0;

      if (listPending) {
        return listPending;
      }

      if (
        hasCachedList &&
        now - lastListAt < 5000
      ) {
        return listCache;
      }

      lastListAt =
        now;

      listPending =
        API.get(
          "/users/admin",
          {
            params:
              cleanParams(params),
            timeout:
              USER_LIST_TIMEOUT_MS,
          }
        )
          .then((res) => {
            const normalized =
              normalizeUserList(res);

            listCache =
              normalized;

            return normalized;
          })
          .catch((e) => {
            console.warn(
              "USER LIST ERROR:",
              e?.message ||
                e?.msg ||
                e?.error ||
                e
            );

            const hasFallbackList =
              Array.isArray(listCache.users) &&
              listCache.users.length > 0;

            if (hasFallbackList) {
              return listCache;
            }

            throw e;
          })
          .finally(() => {
            listPending =
              null;
          });

      return await listPending;
    } catch (e) {
      console.warn(
        "USER LIST ERROR:",
        e?.message ||
          e?.msg ||
          e?.error ||
          e
      );

      const hasFallbackList =
        Array.isArray(listCache.users) &&
        listCache.users.length > 0;

      if (hasFallbackList) {
        return listCache;
      }

      throw e;
    }
  },

  getAll(params = {}) {
    return this.getList(params);
  },

  updateRole(id, role) {
    return API.patch(
      `/users/${id}/role`,
      { role }
    );
  },

  async updateServiceType(id, serviceType) {
    const res =
      await API.patch(
        `/users/${id}/service-type`,
        {
          serviceType,
        }
      );

    lastListAt = 0;

    return res;
  },

  async updateJobGrade(id, jobGrade) {
    const res = await API.patch(
      `/users/${id}/job-grade`,
      { jobGrade }
    );

    lastListAt = 0;
    return res;
  },

  async updateJobPostingEnabled(id, jobPostingEnabled) {
    const res = await API.patch(
      `/users/${id}/job-posting-enabled`,
      { jobPostingEnabled: jobPostingEnabled === true }
    );

    lastListAt = 0;
    return res;
  },

  getShopLinks() {
    return API.get(
      "/users/admin/shop-links"
    );
  },

  linkShopToUser(userId, shopId) {
    return API.post(
      `/users/admin/shop-links/user/${userId}`,
      { shopId }
    );
  },

  unlinkShopFromUser(userId) {
    return API.delete(
      `/users/admin/shop-links/user/${userId}`
    );
  },

  approveShopLinkRequest(requestId) {
    return API.post(
      `/users/admin/shop-link-requests/${requestId}/approve`
    );
  },

  rejectShopLinkRequest(requestId, reason = "") {
    return API.post(
      `/users/admin/shop-link-requests/${requestId}/reject`,
      { reason }
    );
  },

  block(id, blocked) {
    return API.patch(
      `/users/${id}/block`,
      { blocked }
    );
  },

  updateId(id, nextId) {
    return API.patch(
      `/users/${id}/id`,
      {
        id: nextId,
      }
    );
  },

  updateNickname(id, nextNickname) {
    return API.patch(
      `/users/${id}/nickname`,
      {
        nickname: nextNickname,
      }
    );
  },

  resetPassword(id, nextPassword) {
    return API.patch(
      `/users/${id}/password`,
      {
        password: nextPassword,
      }
    );
  },

  async getStats() {
    try {
      const now =
        Date.now();

      const hasCachedStats =
        Number(statsCache.total || 0) > 0 ||
        Number(statsCache.users || 0) > 0 ||
        Number(statsCache.userCount || 0) > 0;

      if (
        hasCachedStats &&
        now - lastStatsAt < 3000
      ) {
        return statsCache;
      }

      lastStatsAt =
        now;

      try {
        const res =
          await API.get(
            "/users/admin/stats",
            {
              timeout:
                USER_STATS_TIMEOUT_MS,
            }
          );

        statsCache =
          normalizeStats(res);

        return statsCache;
      } catch (e) {
        console.warn(
          "USER STATS FALLBACK:",
          e?.message || e
        );

        const listRes =
          await userApi.getList({
            adminStatsFallback:
              "true",
          });

        const normalizedList =
          normalizeUserList(listRes);

        const total =
          normalizedList.total ||
          normalizedList.count ||
          normalizedList.users.length ||
          0;

        statsCache = {
          ...statsCache,
          ok: true,
          total,
          count: total,
          users: total,
          userCount: total,
          items:
            normalizedList.items,
          list:
            normalizedList.list,
          usersList:
            normalizedList.users,
          data:
            normalizedList.data,
        };

        return statsCache;
      }
    } catch (e) {
      console.warn(
        "USER STATS ERROR:",
        e?.message || e
      );

      const hasFallbackStats =
        Number(statsCache.total || 0) > 0 ||
        Number(statsCache.users || 0) > 0 ||
        Number(statsCache.userCount || 0) > 0;

      if (hasFallbackStats) {
        return statsCache;
      }

      throw e;
    }
  },
};

export default userApi;

