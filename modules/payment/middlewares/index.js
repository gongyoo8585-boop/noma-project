"use strict";

// modules/payment/middlewares/index.js

/**
 * ============================================
 * SAFE REQUIRE
 * 파일 없어도 서버 안 죽게
 * ============================================
 */
function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (err) {
    console.warn(`[payment middleware] missing: ${modulePath}`);
    return {};
  }
}

/**
 * ============================================
 * LOAD MIDDLEWARE MODULES
 * ============================================
 */
const validate = safeRequire("./validate.payment");
const guard = safeRequire("./payment.guard");
const owner = safeRequire("./payment.owner");

/**
 * ============================================
 * MERGE HELPER
 * 동일 키 충돌 시 로그 남김
 * ============================================
 */
function mergeModules(...modules) {
  const merged = {};

  for (const mod of modules) {
    if (!mod || typeof mod !== "object") continue;

    for (const key of Object.keys(mod)) {
      if (Object.prototype.hasOwnProperty.call(merged, key)) {
        console.warn(
          `[payment middleware] duplicate export detected: ${key}`
        );
      }
      merged[key] = mod[key];
    }
  }

  return merged;
}

/**
 * ============================================
 * EXPORT
 * ============================================
 */
module.exports = mergeModules(
  validate,
  guard,
  owner
);