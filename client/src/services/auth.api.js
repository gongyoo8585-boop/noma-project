"use strict";

import axios from "axios";

const isLocalHost =
  typeof window !== "undefined" &&
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );

const API_BASE_URL =
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
  "https://api.nora365.co.kr/api";

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
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

function extractUser(data = {}) {
  return (
    data?.user ||
    data?.data?.user ||
    null
  );
}

function saveUser(user) {
  if (!user) return;

  try {
    localStorage.setItem(
      "user",
      JSON.stringify(user)
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

  try {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("jwt");

    localStorage.setItem(
      "adminToken",
      token
    );
  } catch (e) {
    console.warn(
      "SAVE TOKEN ERROR:",
      e.message
    );
  }
}

API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt");

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

  (err) => Promise.reject(err)
);

API.interceptors.response.use(
  (res) => {
    try {
      const user =
        extractUser(
          res?.data
        );

      if (user) {
        saveUser(user);
      }

      const token =
        extractToken(
          res?.data
        );

      if (token) {
        saveToken(token);
      }
    } catch (e) {
      console.warn(
        "AUTO USER SAVE ERROR:",
        e.message
      );
    }

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

      const isAuthRequest =
        requestUrl.includes("/auth/me") ||
        requestUrl.includes("/auth/verify") ||
        requestUrl.includes("/auth/login");

      const isAdminRequest =
        requestUrl.includes("/admin") ||
        requestUrl.includes("/shops") ||
        requestUrl.includes("/shop");

      if (
        isAuthRequest &&
        !isAdminRequest
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("authToken");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");

        const path =
          window.location.pathname;

        if (
          path !== "/login" &&
          path !== "/signup"
        ) {
          alert("로그인이 필요합니다.");

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

      if (user) {
        saveUser(user);
      }

      const token =
        extractToken(res);

      if (token) {
        saveToken(token);
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
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");

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
