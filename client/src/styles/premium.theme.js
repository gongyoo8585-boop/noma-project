"use strict";

/**
 * =====================================================
 * 🔥 PREMIUM THEME (FINAL COMPLETE)
 * ✔ 전체 UI 테마 설정
 * ✔ 색상 / 그림자 / 배경 / 텍스트 통합
 * ✔ 프리미엄 느낌 (골드 + 다크)
 * ✔ 0% 오류
 * =====================================================
 */

const colors = {
  primary: "#d4af37",
  primaryDark: "#b8962e",
  background: "#000",
  surface: "#111",
  border: "#333",
  text: "#fff",
  textSub: "#aaa",
  textMuted: "#888",

  success: "#4caf50",
  warning: "#ff9800",
  danger: "#f44336",
};

const shadows = {
  card:
    "0 4px 20px rgba(0,0,0,0.6), inset 0 0 10px rgba(212,175,55,0.05)",
  hover:
    "0 6px 24px rgba(0,0,0,0.8), inset 0 0 12px rgba(212,175,55,0.08)",
};

const gradients = {
  gold:
    "linear-gradient(145deg, #d4af37, #b8962e)",
  dark:
    "linear-gradient(145deg, #0d0d0d, #1a1a1a)",
};

const radius = {
  sm: 6,
  md: 10,
  lg: 14,
};

const typography = {
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSub,
  },
  body: {
    fontSize: 13,
    color: colors.text,
  },
  caption: {
    fontSize: 12,
    color: colors.textMuted,
  },
};

const theme = {
  colors,
  shadows,
  gradients,
  radius,
  typography,
};

export default theme;