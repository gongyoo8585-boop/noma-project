"use strict";

import axios from "axios";

if (
  typeof window !== "undefined" &&
  typeof window.process === "undefined"
) {
  window.process = { env: {} };
}

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

API.interceptors.request.use(
  (config) => {
    try {
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
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

function requireId(id, name = "id") {
  if (!id) {
    throw new Error(`${name} 필요`);
  }
}

function emptyPaymentList() {
  return {
    ok: true,
    items: [],
    list: [],
    data: [],
  };
}

const paymentApi = {
  kakaoReady(data) {
    return API.post("/payments/kakao/ready", data);
  },

  kakaoApprove(data) {
    return API.post("/payments/kakao/approve", data);
  },

  kakaoCancel(data) {
    return API.post("/payments/kakao/cancel", data);
  },

  getMyList(params = {}) {
    return API.get("/payments/me", {
      params: cleanParams(params),
    });
  },

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

  getDetail(id) {
    requireId(id, "paymentId");

    return API.get(`/payments/${id}`);
  },

  getStatus(id) {
    requireId(id, "paymentId");

    return API.get(
      `/payments/${id}/status`
    );
  },

  refund(id, data = {}) {
    requireId(id, "paymentId");

    return API.post(
      `/payments/${id}/refund`,
      data
    );
  },

  fail(data = {}) {
    return API.post("/payments/fail", data);
  },

  webhook(data = {}) {
    return API.post(
      "/payments/webhook",
      data
    );
  },

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
