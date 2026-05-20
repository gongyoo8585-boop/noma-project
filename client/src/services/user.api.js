"use strict";

/**
 * =====================================================
 * 🔥 USER API (FINAL STABLE COMPLETE)
 * =====================================================
 */

import axios from "axios";

/* =========================
🔥 BASE URL
========================= */
const API_BASE_URL =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL) ||
  (typeof window !== "undefined" &&
    window.__ENV__ &&
    window.__ENV__.API_BASE_URL) ||
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  "http://localhost:10000/api";

/* =========================
🔥 AXIOS INSTANCE
========================= */
const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
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
function getStoredToken() {
  try {
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("local-admin-token") ||
      sessionStorage.getItem("adminToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("accessToken") ||
      sessionStorage.getItem("authToken") ||
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

  nextUser.role =
    nextUser.role ||
    nextUser.userRole ||
    nextUser.type ||
    "admin";

  nextUser.userRole =
    nextUser.userRole ||
    nextUser.role ||
    nextUser.type ||
    "admin";

  nextUser.type =
    nextUser.type ||
    nextUser.role ||
    nextUser.userRole ||
    "admin";

  nextUser.isAdmin =
    nextUser.isAdmin === false
      ? false
      : true;

  return nextUser;
}

function saveToken(token) {
  if (
    !token ||
    token === "undefined" ||
    token === "null"
  ) {
    return;
  }

  try {
    [
      "adminToken",
      "token",
      "accessToken",
      "authToken",
      "jwt",
      "local-admin-token",
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

function saveUser(user) {
  if (!user) return;

  try {
    const normalizedUser =
      normalizeAdminUser(user);

    localStorage.setItem(
      "user",
      JSON.stringify(
        normalizedUser
      )
    );

    sessionStorage.setItem(
      "user",
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
    [
      "token",
      "accessToken",
      "authToken",
      "adminToken",
      "jwt",
      "local-admin-token",
    ].forEach((key) => {
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

    try {
      const token =
        extractToken(data);

      if (token) {
        saveToken(token);
      }

      const user =
        extractUser(data);

      if (user) {
        saveUser(user);
      }
    } catch (e) {
      console.warn(
        "AUTO TOKEN SAVE ERROR:",
        e.message
      );
    }

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

    console.error(
      "USER API ERROR:",
      message
    );

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

    if (token) {
      saveToken(token);
    }

    const user =
      extractUser(res) ||
      {
        id:
          data?.id ||
          data?.email ||
          "admin",
        role: "admin",
        userRole: "admin",
        type: "admin",
        isAdmin: true,
      };

    saveUser(user);

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

    if (token) {
      saveToken(token);
    }

    const user =
      extractUser(res);

    if (user) {
      saveUser(user);
    }

    return res;
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

      if (listPending) {
        return listPending;
      }

      if (
        now - lastListAt < 5000
      ) {
        return listCache;
      }

      lastListAt =
        now;

      listPending =
        API.get(
          "/admin/users",
          {
            params:
              cleanParams(params),
          }
        )
          .then((res) => {
            listCache =
              normalizeUserList(res);

            return listCache;
          })
          .catch((e) => {
            console.warn(
              "USER LIST FALLBACK:",
              e?.message || e
            );

            return listCache;
          })
          .finally(() => {
            listPending =
              null;
          });

      return listPending;
    } catch (e) {
      console.warn(
        "USER LIST FALLBACK:",
        e?.message || e
      );

      return listCache;
    }
  },

  updateRole(id, role) {
    return API.patch(
      `/users/${id}/role`,
      { role }
    );
  },

  block(id, blocked) {
    return API.patch(
      `/users/${id}/block`,
      { blocked }
    );
  },

  async getStats() {
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
          "/users/admin/stats"
        );

      statsCache =
        normalizeStats(res);

      return statsCache;
    } catch (e) {
      console.warn(
        "USER STATS FALLBACK:",
        e?.message || e
      );

      return statsCache;
    }
  },
};

export default userApi;