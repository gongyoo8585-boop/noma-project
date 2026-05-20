"use strict";

import axios from "axios";

/**
 * =====================================================
 * 🔥 AUTH API (ULTRA FINAL - PATCHED)
 * ✔ 기존 기능 100% 유지
 * ✔ 401 리다이렉트 루프 방지 (signup 포함)
 * ✔ authToken 대응
 * ✔ user 제거 안정화
 * ✔ admin/shop API 401 로그아웃 방지
 * ✔ adminToken/jwt 동시 대응
 * ✔ 🔥 login 시 user 자동 저장 추가
 * ✔ 🔥 admin/dashboard 무한 반복 수정
 * ✔ 최소 수정만 적용
 * ✔ 🔥 중복 토큰 충돌 수정
 * =====================================================
 */

/* =========================
🔥 AXIOS INSTANCE
========================= */
const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    window.__ENV__?.API_BASE_URL ||
    "http://localhost:10000/api",
  timeout: 10000,
});

/* 🔥 baseURL 이중 /api 방어 */
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

/* =========================
🔥 최소 추가
========================= */
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

/* 🔥 최소 추가 */
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

/* 🔥 최소 추가 */
function saveToken(token) {

  if (!token) return;

  try {

    /* 🔥 기존 중복 토큰 제거 */
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("jwt");

    /* 🔥 adminToken 하나만 유지 */
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

/* =========================
🔥 REQUEST INTERCEPTOR
========================= */
API.interceptors.request.use(
  (config) => {

    /* 🔥 핵심 수정 */
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

/* =========================
🔥 RESPONSE INTERCEPTOR
========================= */
API.interceptors.response.use(

  (res) => {

    /* 🔥 핵심 수정 */
    try {

      const user =
        extractUser(
          res?.data
        );

      if (user) {
        saveUser(user);
      }

      /* 🔥 최소 추가 */
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

    /* 🔥 최소 추가: 서버 에러는 인증 에러로 강제 변환 방지 */
    if (status >= 500) {
      return Promise.reject(
        new Error(message)
      );
    }

    if (status === 401) {

      /* 🔥 최소 추가 */
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

      /* 🔥 핵심 수정 */
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

        /* 🔥 핵심 수정: signup 포함해서 리다이렉트 제한 */
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

/* =========================
🔥 AUTH API
========================= */
const authApi = {

  async login(data) {

    const res =
      await API.post(
        "/auth/login",
        data
      );

    /* 🔥 핵심 수정 */
    try {

      const user =
        extractUser(res);

      if (user) {
        saveUser(user);
      }

      /* 🔥 최소 추가 */
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

    /* 🔥 최소 추가 */
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