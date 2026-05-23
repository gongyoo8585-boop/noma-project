"use strict";

/* =====================================================
🔥 I18N SERVICE
👉 다국어 처리 (translation engine)
👉 locale 감지 + fallback
👉 cache / analytics / middleware 지원
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;
let analyticsService = null;

try { cacheService = require("./cacheService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE || "ko";

/* =====================================================
🔥 DICTIONARY (기본 내장)
===================================================== */
const DICT = {
  ko: {
    OK: "성공",
    ERROR: "오류",
    NOT_FOUND: "찾을 수 없습니다",
    UNAUTHORIZED: "인증이 필요합니다",
  },
  en: {
    OK: "Success",
    ERROR: "Error",
    NOT_FOUND: "Not found",
    UNAUTHORIZED: "Unauthorized",
  },
};

/* =====================================================
🔥 SERVICE
===================================================== */
class I18nService {
  constructor() {
    this.dict = { ...DICT };
    this.last = null;
  }

  /* =====================================================
  🔥 SET DICTIONARY
  ===================================================== */
  addLocale(locale, messages = {}) {
    if (!locale || typeof messages !== "object") {
      throw new Error("INVALID_LOCALE");
    }

    this.dict[locale] = {
      ...(this.dict[locale] || {}),
      ...messages,
    };

    return true;
  }

  /* =====================================================
  🔥 TRANSLATE
  ===================================================== */
  t(key, locale = DEFAULT_LOCALE, params = {}) {
    const cacheKey = `i18n:${locale}:${key}`;

    if (cacheService) {
      const cached = cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const lang = this.dict[locale] || this.dict[DEFAULT_LOCALE] || {};
    let message = lang[key] || key;

    // 변수 치환
    for (const k in params) {
      message = message.replace(`{${k}}`, params[k]);
    }

    this.last = {
      key,
      locale,
      message,
    };

    if (cacheService) {
      cacheService.set(cacheKey, message, 300);
    }

    if (analyticsService) {
      analyticsService.track({
        type: "i18n",
        payload: { key, locale },
      });
    }

    return message;
  }

  /* =====================================================
  🔥 DETECT LOCALE
  ===================================================== */
  detect(req) {
    return (
      req.headers["x-lang"] ||
      req.headers["accept-language"]?.split(",")[0]?.slice(0, 2) ||
      DEFAULT_LOCALE
    );
  }

  /* =====================================================
  🔥 EXPRESS MIDDLEWARE
  ===================================================== */
  middleware() {
    return (req, res, next) => {
      const locale = this.detect(req);

      req.locale = locale;

      req.t = (key, params) => this.t(key, locale, params);

      res.t = (key, params) => this.t(key, locale, params);

      next();
    };
  }

  /* =====================================================
  🔥 GET AVAILABLE LOCALES
  ===================================================== */
  getLocales() {
    return Object.keys(this.dict);
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.last;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.dict = { ...DICT };
    this.last = null;
    return true;
  }
}

module.exports = new I18nService();