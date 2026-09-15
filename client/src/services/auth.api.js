"use strict";

import axios from "axios";

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
        "https://api.nora365.co.kr/api"
      );

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

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

    console.warn(
      "FIXED BASE URL:",
      API.defaults.baseURL
    );
  }
} catch {}

function normalizeToken(token) {
  return String(token || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function decodeTokenPayload(token) {
  try {
    const safeToken =
      normalizeToken(token);

    const payload =
      safeToken.split(".")[1];

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
          .map(
            (char) =>
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
  const payload =
    decodeTokenPayload(token);

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

function isAdminUser(user = {}) {
  if (
    !user ||
    typeof user !== "object"
  ) {
    return false;
  }

  const role =
    String(
      user?.role ||
      user?.userRole ||
      user?.type ||
      ""
    )
      .trim()
      .toLowerCase();

  return (
    user?.isAdmin === true ||
    role === "admin" ||
    role === "superadmin" ||
    role === "super_admin"
  );
}

function extractUser(data = {}) {
  return (
    data?.user ||
    data?.data?.user ||
    null
  );
}

function saveUser(user) {
  if (
    !user ||
    isAdminUser(user)
  ) {
    return;
  }

  try {
    const value =
      JSON.stringify(user);

    localStorage.setItem(
      "user",
      value
    );

    sessionStorage.setItem(
      "user",
      value
    );
  } catch (e) {
    console.warn(
      "SAVE USER ERROR:",
      e.message
    );
  }
}

function extractToken(data = {}) {
  return (
    data?.token ||
    data?.accessToken ||
    data?.authToken ||
    data?.adminToken ||
    data?.jwt ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.authToken ||
    data?.data?.adminToken ||
    data?.data?.jwt ||
    null
  );
}

function saveToken(token) {
  if (!token) return;

  const safeToken =
    normalizeToken(token);

  if (
    !safeToken ||
    isAdminToken(safeToken)
  ) {
    return;
  }

  try {
    [
      "accessToken",
      "authToken",
      "jwt",
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    localStorage.setItem(
      "token",
      safeToken
    );

    sessionStorage.setItem(
      "token",
      safeToken
    );
  } catch (e) {
    console.warn(
      "SAVE TOKEN ERROR:",
      e.message
    );
  }
}

function clearUserAuth() {
  try {
    [
      "token",
      "accessToken",
      "authToken",
      "jwt",
      "user",
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch (e) {
    console.warn(
      "CLEAR USER AUTH ERROR:",
      e.message
    );
  }
}

function getStoredUserToken() {
  try {
    const candidates = [
      localStorage.getItem(
        "token"
      ),
      sessionStorage.getItem(
        "token"
      ),
      localStorage.getItem(
        "accessToken"
      ),
      sessionStorage.getItem(
        "accessToken"
      ),
      localStorage.getItem(
        "authToken"
      ),
      sessionStorage.getItem(
        "authToken"
      ),
      localStorage.getItem(
        "jwt"
      ),
      sessionStorage.getItem(
        "jwt"
      ),
    ]
      .filter(
        (token) =>
          token &&
          token !== "undefined" &&
          token !== "null"
      )
      .map(
        (token) =>
          normalizeToken(token)
      );

    return (
      candidates.find(
        (token) =>
          token &&
          !isAdminToken(token)
      ) ||
      ""
    );
  } catch {
    return "";
  }
}

API.interceptors.request.use(
  (config) => {
    const token =
      getStoredUserToken();

    config.headers =
      config.headers || {};

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;

      config.headers.authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (err) =>
    Promise.reject(err)
);

API.interceptors.response.use(
  (res) => {
    return res?.data ?? res;
  },

  (err) => {
    const status =
      err.response?.status;

    const message =
      err.response?.data?.message ||
      err.response?.data?.msg ||
      err.message ||
      "AUTH_API_ERROR";

    if (status >= 500) {
      return Promise.reject(
        new Error(message)
      );
    }

    if (status === 401) {
      const requestUrl =
        err?.config?.url || "";

      const isSessionCheckRequest =
        requestUrl.includes(
          "/auth/me"
        ) ||
        requestUrl.includes(
          "/auth/verify"
        );

      const isAdminRequest =
        requestUrl.includes(
          "/admin"
        ) ||
        requestUrl.includes(
          "/shops"
        ) ||
        requestUrl.includes(
          "/shop"
        );

      if (
        isSessionCheckRequest &&
        !isAdminRequest
      ) {
        clearUserAuth();

        const path =
          window.location.pathname;

        if (
          path !== "/login" &&
          path !== "/signup"
        ) {
          alert(
            "로그인이 필요합니다."
          );

          window.location.href =
            "/login";
        }
      }
    }

    return Promise.reject(
      new Error(message)
    );
  }
);

const authApi = {
  async login(data) {
    const res =
      await API.post(
        "/auth/login",
        data
      );

    try {
      const user =
        extractUser(res);

      const token =
        extractToken(res);

      const adminResponse =
        isAdminUser(user) ||
        isAdminToken(token);

      if (!adminResponse) {
        if (user) {
          saveUser(user);
        }

        if (token) {
          saveToken(token);
        }
      }
    } catch (e) {
      console.warn(
        "LOGIN USER SAVE ERROR:",
        e.message
      );
    }

    return res;
  },

  register(data) {
    return API.post(
      "/auth/register",
      data
    );
  },

  logout() {
    clearUserAuth();

    return API.post(
      "/auth/logout"
    );
  },

  getMe() {
    return API.get(
      "/auth/me"
    );
  },

  verify() {
    return API.get(
      "/auth/verify"
    );
  },

  kakaoLogin() {
    return API.get(
      "/auth/kakao/login"
    );
  },

  kakaoSimple(data) {
    return API.post(
      "/auth/kakao/simple",
      data
    );
  },

  safeGetMe: async () => {
    try {
      return await authApi.getMe();
    } catch {
      return {
        ok: false,
        user: null,
      };
    }
  },
};

export default authApi;
