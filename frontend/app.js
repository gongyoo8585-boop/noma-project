"use strict";

/* =====================================================
🔥 GLOBAL FRONTEND APP (FINAL MASTER)
공통 상태 / API / 인증 / 에러 / 유틸 / 이벤트
===================================================== */

/* =====================================================
🔥 CONFIG
===================================================== */
const APP_CONFIG = {
  API_BASE: "/api",
  TIMEOUT: 10000,
};

/* =====================================================
🔥 GLOBAL STATE
===================================================== */
const APP_STATE = {
  user: null,
  token: null,
  loading: false,
};

/* =====================================================
🔥 UTIL
===================================================== */
function log(...args) {
  console.log("[APP]", ...args);
}

function error(...args) {
  console.error("[APP]", ...args);
}

function qs(sel) {
  return document.querySelector(sel);
}

function createEl(tag, attrs = {}) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/* =====================================================
🔥 STORAGE
===================================================== */
const Storage = {
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (_) {
      return null;
    }
  },
  del(key) {
    localStorage.removeItem(key);
  }
};

/* =====================================================
🔥 AUTH
===================================================== */
const Auth = {
  setUser(user) {
    APP_STATE.user = user;
    Storage.set("user", user);
  },

  getUser() {
    if (APP_STATE.user) return APP_STATE.user;
    const u = Storage.get("user");
    APP_STATE.user = u;
    return u;
  },

  logout() {
    APP_STATE.user = null;
    Storage.del("user");
    location.href = "/";
  },

  isLoggedIn() {
    return !!this.getUser();
  }
};

/* =====================================================
🔥 LOADING
===================================================== */
function showLoading() {
  APP_STATE.loading = true;
  document.body.style.opacity = "0.6";
}

function hideLoading() {
  APP_STATE.loading = false;
  document.body.style.opacity = "1";
}

/* =====================================================
🔥 API CORE
===================================================== */
async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUT);

  try {
    showLoading();

    const res = await fetch(APP_CONFIG.API_BASE + url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeout);

    const data = await res.json();

    if (!res.ok || data.ok === false) {
      throw new Error(data.message || "API_ERROR");
    }

    return data;

  } catch (e) {
    error("API ERROR:", e.message);

    if (e.name === "AbortError") {
      alert("요청 시간 초과");
    } else {
      alert(e.message);
    }

    return { ok: false };

  } finally {
    hideLoading();
  }
}

/* =====================================================
🔥 API WRAPPER
===================================================== */
const API = {
  get(url) {
    return apiFetch(url);
  },
  post(url, body) {
    return apiFetch(url, {
      method: "POST",
      body: JSON.stringify(body || {})
    });
  },
  put(url, body) {
    return apiFetch(url, {
      method: "PUT",
      body: JSON.stringify(body || {})
    });
  },
  delete(url) {
    return apiFetch(url, {
      method: "DELETE"
    });
  }
};

/* =====================================================
🔥 GLOBAL ERROR HANDLER
===================================================== */
window.addEventListener("error", (e) => {
  error("GLOBAL ERROR:", e.message);
});

/* =====================================================
🔥 ROUTER (간단)
===================================================== */
function go(path) {
  location.href = path;
}

/* =====================================================
🔥 UI HELPERS
===================================================== */
function toast(msg) {
  const el = createEl("div");
  el.innerText = msg;
  el.style.position = "fixed";
  el.style.bottom = "20px";
  el.style.left = "50%";
  el.style.transform = "translateX(-50%)";
  el.style.background = "#111";
  el.style.color = "#fff";
  el.style.padding = "10px 16px";
  el.style.borderRadius = "8px";
  el.style.zIndex = "9999";

  document.body.appendChild(el);

  setTimeout(() => el.remove(), 2000);
}

/* =====================================================
🔥 INIT
===================================================== */
(function init() {
  log("APP INIT");

  const user = Auth.getUser();

  if (user) {
    log("USER LOADED:", user.email);
  }
})();

/* =====================================================
🔥 EXPORT (전역)
===================================================== */
window.APP = {
  API,
  Auth,
  go,
  toast,
  state: APP_STATE
};