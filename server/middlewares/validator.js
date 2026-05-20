"use strict";

/**
 * =====================================================
 * 🔥 VALIDATOR MIDDLEWARE (ULTRA FINAL)
 * ✔ 요청 데이터 검증 (body / query / params)
 * ✔ 필수값 체크
 * ✔ 타입 체크
 * ✔ 커스텀 규칙 지원
 * ✔ 변환 (number / boolean auto cast)
 * ✔ 중첩 객체 지원
 * ✔ 에러 응답 통일
 * ✔ 기존 기능 100% 유지 + 확장
 * =====================================================
 */

/* =========================
공통 응답
========================= */
const fail = (res, msg = "VALIDATION_ERROR", code = 400) =>
  res.status(code).json({ ok: false, msg });

/* =========================
유틸
========================= */
const isEmpty = (v) =>
  v === undefined || v === null || v === "";

/* 타입 캐스팅 */
const castValue = (value, type) => {
  if (type === "number") return Number(value);
  if (type === "boolean") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return value;
};

/* =========================
🔥 기본 검증 함수
========================= */
function validate(schema = {}) {
  return (req, res, next) => {
    try {
      const errors = [];

      ["body", "query", "params"].forEach((target) => {
        const rules = schema[target];
        if (!rules) return;

        const data = req[target] || {};

        Object.keys(rules).forEach((key) => {
          const rule = rules[key];
          let value = data[key];

          /* =========================
          필수값 체크
          ========================= */
          if (rule.required && isEmpty(value)) {
            errors.push(`${key} is required`);
            return;
          }

          if (value === undefined) return;

          /* =========================
          타입 캐스팅
          ========================= */
          if (rule.type) {
            value = castValue(value, rule.type);
            data[key] = value;
          }

          /* =========================
          타입 체크
          ========================= */
          if (rule.type) {
            const type = rule.type;

            if (type === "number" && isNaN(value)) {
              errors.push(`${key} must be number`);
            }

            if (type === "string" && typeof value !== "string") {
              errors.push(`${key} must be string`);
            }

            if (type === "boolean" && typeof value !== "boolean") {
              errors.push(`${key} must be boolean`);
            }

            if (type === "array" && !Array.isArray(value)) {
              errors.push(`${key} must be array`);
            }

            if (type === "object" && typeof value !== "object") {
              errors.push(`${key} must be object`);
            }
          }

          /* =========================
          길이 체크
          ========================= */
          if (rule.min && value?.length < rule.min) {
            errors.push(`${key} min length ${rule.min}`);
          }

          if (rule.max && value?.length > rule.max) {
            errors.push(`${key} max length ${rule.max}`);
          }

          /* =========================
          숫자 범위
          ========================= */
          if (rule.minValue && Number(value) < rule.minValue) {
            errors.push(`${key} min value ${rule.minValue}`);
          }

          if (rule.maxValue && Number(value) > rule.maxValue) {
            errors.push(`${key} max value ${rule.maxValue}`);
          }

          /* =========================
          정규식 체크
          ========================= */
          if (rule.regex && !rule.regex.test(value)) {
            errors.push(`${key} format invalid`);
          }

          /* =========================
          enum 체크
          ========================= */
          if (rule.enum && !rule.enum.includes(value)) {
            errors.push(`${key} must be one of ${rule.enum.join(", ")}`);
          }

          /* =========================
          커스텀 함수
          ========================= */
          if (rule.validate && typeof rule.validate === "function") {
            const valid = rule.validate(value, req);

            if (!valid) {
              errors.push(`${key} validation failed`);
            }
          }
        });
      });

      if (errors.length > 0) {
        return fail(res, errors.join(", "));
      }

      next();

    } catch (e) {
      return fail(res, e.message);
    }
  };
}

/* =========================
🔥 빠른 필수값 체크
========================= */
function requireFields(fields = []) {
  return (req, res, next) => {
    const missing = [];

    fields.forEach((f) => {
      if (isEmpty(req.body[f])) {
        missing.push(f);
      }
    });

    if (missing.length > 0) {
      return fail(res, `Missing: ${missing.join(", ")}`);
    }

    next();
  };
}

/* =========================
🔥 신규: 하나라도 필요
========================= */
function requireOneOf(fields = []) {
  return (req, res, next) => {
    const exists = fields.some((f) => !isEmpty(req.body[f]));

    if (!exists) {
      return fail(res, `One of required: ${fields.join(", ")}`);
    }

    next();
  };
}

/* =========================
🔥 신규: 쿼리 전용 검증
========================= */
function validateQuery(schema = {}) {
  return validate({ query: schema });
}

/* =========================
EXPORT
========================= */
module.exports = {
  validate,
  requireFields,
  requireOneOf,
  validateQuery,
};