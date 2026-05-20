"use strict";

// 🔥 process 에러 방어 (최상단 최소 추가)
if (typeof process === "undefined") {
  window.process = { env: {} };
}

import axios from "axios";

/**
 * =====================================================
 * 🔥 PAYMENT API (ULTRA FINAL - PATCHED STABLE)
 * ✔ 기존 기능 100% 유지
 * ✔ 서버 라우트 100% 일치 유지
 * ✔ null 응답 방어 유지
 * ✔ 네트워크 에러 안정성 유지
 * ✔ baseURL 이중 /api 방어 추가
 * ✔ 상세/상태 API 안정성 강화
 * ✔ 429 과다 요청 방지 최소 추가
 * ✔ 401 alert 반복 방지 최소 추가
 * ✔ admin list / stats fallback 추가
 * ✔ 기존 함수명 유지
 * ✔ 기존 API 호출 방식 유지
 * ✔ 최소 수정만 적용
 * =====================================================
 */

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    window.__ENV__?.API_BASE_URL ||
    "http://localhost:10000/api",
  timeout: 10000,
});

/* 🔥 최소 추가: /api/api 방어 */
try {
  if (API.defaults.baseURL?.includes("/api/api")) {
    API.defaults.baseURL = API.defaults.baseURL.replace(
      "/api/api",
      "/api"
    );

    console.warn(
      "FIXED PAYMENT API BASE URL:",
      API.defaults.baseURL
    );
  }
} catch (e) {
  console.error("PAYMENT BASE URL FIX ERROR:", e);
}

/* =========================
🔥 429 / 중복 요청 방어
========================= */
let authAlertShown = false;
let lastAdminListAt = 0;
let lastStatsAt = 0;

let adminListCache = {
  ok: true,
  items: [],
  list: [],
  data: [],
};

let statsCache = {
  ok: true,
  total: 0,
  count: 0,
  revenue: 0,
  items: [],
  list: [],
  data: [],
};

/* =========================
🔥 PARAM CLEAN
========================= */
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

/* =========================
🔥 요청 인터셉터 (JWT)
========================= */
API.interceptors.request.use(
  (config) => {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("jwt");

      if (
        token &&
        token !== "undefined" &&
        token !== "null"
      ) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("PAYMENT TOKEN LOAD ERROR:", e);
    }

    return config;
  },
  (err) => Promise.reject(err)
);

/* =========================
🔥 응답 인터셉터
========================= */
API.interceptors.response.use(
  (res) => res?.data ?? res,
  (err) => {
    const status = err?.response?.status;

    const message =
      err?.response?.data?.message ||
      err?.response?.data?.msg ||
      err?.message ||
      "PAYMENT API ERROR";

    if (status === 401) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("authToken");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");

        if (
          !authAlertShown &&
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          authAlertShown = true;

          alert("로그인이 필요합니다.");
          window.location.href = "/login";
        }
      } catch (e) {
        console.error("PAYMENT AUTH CLEAR ERROR:", e);
      }
    }

    if (status === 429) {
      return Promise.reject(
        new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.")
      );
    }

    return Promise.reject(new Error(message));
  }
);

/* =========================
🔥 ID 검증 (최소 추가)
========================= */
function requireId(id, name = "id") {
  if (!id) {
    throw new Error(`${name} 필요`);
  }
}

/* =========================
🔥 EMPTY RESPONSE
========================= */
function emptyPaymentList() {
  return {
    ok: true,
    items: [],
    list: [],
    data: [],
  };
}

/* =========================
🔥 API 정의 (서버와 100% 일치)
========================= */
const paymentApi = {
  /* =========================
  카카오 결제
  ========================= */
  kakaoReady(data) {
    return API.post("/payments/kakao/ready", data);
  },

  kakaoApprove(data) {
    return API.post("/payments/kakao/approve", data);
  },

  kakaoCancel(data) {
    return API.post("/payments/kakao/cancel", data);
  },

  /* =========================
  사용자
  ========================= */
  getMyList(params = {}) {
    return API.get("/payments/me", {
      params: cleanParams(params),
    });
  },

  /* =========================
  관리자
  ========================= */
  async getAdminList(params = {}) {
    try {
      const now = Date.now();

      if (now - lastAdminListAt < 3000) {
        return adminListCache;
      }

      lastAdminListAt = now;

      const res = await API.get("/payments/admin", {
        params: cleanParams(params),
      });

      adminListCache =
        res || emptyPaymentList();

      return adminListCache;
    } catch (e) {
      console.warn(
        "PAYMENT ADMIN FALLBACK:",
        e?.message
      );

      return adminListCache;
    }
  },

  async getStats() {
    try {
      const now = Date.now();

      if (now - lastStatsAt < 3000) {
        return statsCache;
      }

      lastStatsAt = now;

      const res = await API.get("/payments/admin/stats");

      statsCache =
        res || statsCache;

      return statsCache;
    } catch (e) {
      console.warn(
        "PAYMENT STATS FALLBACK:",
        e?.message
      );

      return statsCache;
    }
  },

  /* =========================
  상세
  ========================= */
  getDetail(id) {
    requireId(id, "paymentId");

    return API.get(`/payments/${id}`);
  },

  /* =========================
  상태 조회
  ========================= */
  getStatus(id) {
    requireId(id, "paymentId");

    return API.get(
      `/payments/${id}/status`
    );
  },

  /* =========================
  환불 (관리자)
  ========================= */
  refund(id, data = {}) {
    requireId(id, "paymentId");

    return API.post(
      `/payments/${id}/refund`,
      data
    );
  },

  /* =========================
  최소 추가: 실패 처리
  ========================= */
  fail(data = {}) {
    return API.post("/payments/fail", data);
  },

  /* =========================
  최소 추가: webhook
  ========================= */
  webhook(data = {}) {
    return API.post(
      "/payments/webhook",
      data
    );
  },

  /* =========================
  최소 추가: 안전 조회
  ========================= */
  async safeGetAdminList(
    params = {}
  ) {
    try {
      const res =
        await paymentApi.getAdminList(
          params
        );

      return (
        res || emptyPaymentList()
      );
    } catch (e) {
      console.warn(
        "PAYMENT ADMIN FALLBACK:",
        e?.message
      );

      return emptyPaymentList();
    }
  },

  /* =========================
  최소 추가: 런타임 재검증
  ========================= */
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

export default paymentApi;