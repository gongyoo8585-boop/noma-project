// ==============================
// 🔥 기존 코드 유지 + 안정성 보완 + 확장 (최종 완성형)
// ==============================

(function () {
  // 🔥 기본값 안전 처리
  const DEFAULT_CONFIG = {
    API_BASE_URL: "",
    KAKAO_JS_KEY: ""
  };

  // 🔥 기존 값 유지 + 병합
  const USER_CONFIG = window.APP_CONFIG || {};

  const CONFIG = {
    ...DEFAULT_CONFIG,
    ...USER_CONFIG
  };

  // ==============================
  // 🔥 오류 수정
  // ==============================

  // 1. API_BASE_URL 자동 보정
  if (!CONFIG.API_BASE_URL) {
    if (location.hostname.includes("localhost")) {
      CONFIG.API_BASE_URL = "http://localhost:3000";
    } else {
      CONFIG.API_BASE_URL = location.origin;
    }
  }

  // 2. 끝 슬래시 제거
  CONFIG.API_BASE_URL = CONFIG.API_BASE_URL.replace(/\/$/, "");

  // ==============================
  // 🔥 기존 기능 유지
  // ==============================

  function validateConfig() {
    if (!CONFIG.KAKAO_JS_KEY || CONFIG.KAKAO_JS_KEY.includes("여기에")) {
      console.warn("⚠️ KAKAO_JS_KEY가 설정되지 않았습니다.");
    }

    if (!CONFIG.API_BASE_URL) {
      console.error("❌ API_BASE_URL 설정 필요");
    }
  }

  function getConfig() {
    return CONFIG;
  }

  function logConfig() {
    console.log("📦 APP CONFIG:", CONFIG);
  }

  // ==============================
  // 🔥 기존 + 확장 기능
  // ==============================

  // 1️⃣ 환경 감지
  CONFIG.ENV = location.hostname.includes("localhost") ? "dev" : "prod";

  // 2️⃣ 디버그 모드 자동 설정
  CONFIG.DEBUG = CONFIG.ENV === "dev";

  // 3️⃣ 안전 getter
  function get(key, fallback = "") {
    return CONFIG[key] ?? fallback;
  }

  // 4️⃣ API URL 생성기
  function apiUrl(path = "") {
    return CONFIG.API_BASE_URL + path;
  }

  // 5️⃣ local override
  function loadLocalOverride() {
    try {
      const local = JSON.parse(localStorage.getItem("APP_CONFIG_OVERRIDE") || "{}");
      Object.assign(CONFIG, local);
    } catch {}
  }

  // 6️⃣ config 저장
  function saveConfig(newConfig = {}) {
    const merged = { ...CONFIG, ...newConfig };
    localStorage.setItem("APP_CONFIG_OVERRIDE", JSON.stringify(merged));
    Object.assign(CONFIG, merged);
  }

  // 7️⃣ 필수 체크
  function checkRequired(keys = []) {
    keys.forEach((k) => {
      if (!CONFIG[k]) {
        console.warn(`⚠️ 필수 CONFIG 누락: ${k}`);
      }
    });
  }

  // 8️⃣ debounce logger
  let logTimer;
  function debugLog(msg) {
    if (!CONFIG.DEBUG) return;
    clearTimeout(logTimer);
    logTimer = setTimeout(() => console.log("🐞 DEBUG:", msg), 200);
  }

  // 9️⃣ query config
  function applyQueryConfig() {
    const params = new URLSearchParams(location.search);
    params.forEach((v, k) => {
      if (k.startsWith("cfg_")) {
        CONFIG[k.replace("cfg_", "")] = v;
      }
    });
  }

  // 🔟 freeze
  function lockConfig() {
    Object.freeze(CONFIG);
  }

  // ==============================
  // 🔥 신규 추가 기능 10개
  // ==============================

  // 1️⃣ deep merge
  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] instanceof Object) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  // 2️⃣ reset config
  function resetConfig() {
    localStorage.removeItem("APP_CONFIG_OVERRIDE");
    location.reload();
  }

  // 3️⃣ key 제거
  function removeConfigKey(key) {
    const local = JSON.parse(localStorage.getItem("APP_CONFIG_OVERRIDE") || "{}");
    delete local[key];
    localStorage.setItem("APP_CONFIG_OVERRIDE", JSON.stringify(local));
  }

  // 4️⃣ number getter
  function getNumber(key, fallback = 0) {
    const v = Number(CONFIG[key]);
    return isNaN(v) ? fallback : v;
  }

  // 5️⃣ boolean getter
  function getBoolean(key, fallback = false) {
    const v = CONFIG[key];
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return fallback;
  }

  // 6️⃣ config change listener
  const listeners = [];
  function onConfigChange(fn) {
    listeners.push(fn);
  }

  function emitChange() {
    listeners.forEach(fn => {
      try { fn(CONFIG); } catch {}
    });
  }

  // 7️⃣ save safe
  function saveConfigSafe(newConfig = {}) {
    deepMerge(CONFIG, newConfig);
    localStorage.setItem("APP_CONFIG_OVERRIDE", JSON.stringify(CONFIG));
    emitChange();
  }

  // 8️⃣ session fallback
  function getSessionConfig(key) {
    return sessionStorage.getItem("CFG_" + key);
  }

  // 9️⃣ prefix getter
  function getByPrefix(prefix) {
    const result = {};
    Object.keys(CONFIG).forEach(k => {
      if (k.startsWith(prefix)) result[k] = CONFIG[k];
    });
    return result;
  }

  // 🔟 export
  function exportConfig() {
    console.log("EXPORT CONFIG:", JSON.stringify(CONFIG, null, 2));
  }

  // ==============================
  // 🔥 전역 등록
  // ==============================
  window.APP_CONFIG = CONFIG;
  window.getAppConfig = getConfig;

  window.APP_CONFIG_GET = get;
  window.APP_CONFIG_API = apiUrl;
  window.APP_CONFIG_SAVE = saveConfig;
  window.APP_CONFIG_DEBUG = debugLog;

  window.APP_CONFIG_RESET = resetConfig;
  window.APP_CONFIG_REMOVE = removeConfigKey;
  window.APP_CONFIG_NUMBER = getNumber;
  window.APP_CONFIG_BOOL = getBoolean;
  window.APP_CONFIG_ON_CHANGE = onConfigChange;
  window.APP_CONFIG_SAVE_SAFE = saveConfigSafe;
  window.APP_CONFIG_PREFIX = getByPrefix;
  window.APP_CONFIG_EXPORT = exportConfig;

  // ==============================
  // 🔥 초기 실행
  // ==============================
  loadLocalOverride();   // 🔥 추가 위치 A
  applyQueryConfig();    // 🔥 추가 위치 B

  validateConfig();
  checkRequired(["API_BASE_URL"]); // 🔥 추가 위치 C

  logConfig();

  // lockConfig(); // 🔥 추가 위치 D (선택)
})();