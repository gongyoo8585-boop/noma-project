"use strict";

import React, {
  memo,
  useMemo,
  useState,
} from "react";

/**
 * =====================================================
 * 🔥 NORA NEARBY BUTTON
 * ✔ 내 주변 버튼
 * ✔ 네온 UI
 * ✔ 현재 위치 재검색
 * ✔ 로딩 상태 대응
 * ✔ GPS 중복 요청 방지
 * ✔ 접근성 대응
 * ✔ 모바일 대응
 * ✔ 런타임 에러 방지
 * =====================================================
 */

function NearbyButton({
  loading = false,
  active = false,
  disabled = false,
  label = "내 주변",
  onClick = null,
}) {
  const [clicked, setClicked] =
    useState(false);

  const isDisabled =
    loading ||
    disabled ||
    clicked;

  const handleClick =
    async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isDisabled) {
        return;
      }

      try {
        setClicked(true);

        if (
          typeof onClick ===
          "function"
        ) {
          await Promise.resolve(
            onClick()
          );
        }
      } catch (err) {
        console.error(
          "NearbyButton Error:",
          err
        );
      } finally {
        setClicked(false);
      }
    };

  const buttonStyle =
    useMemo(() => {
      return {
        ...styles.button,

        ...(active
          ? styles.activeButton
          : {}),

        ...(isDisabled
          ? styles.disabledButton
          : {}),
      };
    }, [
      active,
      isDisabled,
    ]);

  return (
    <button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={handleClick}
      style={buttonStyle}
    >
      {/* =========================
      🔥 ICON
      ========================= */}
      <div style={styles.iconWrap}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          style={styles.icon}
        >
          <path
            d="M12 2V6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <path
            d="M12 18V22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <path
            d="M2 12H6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <path
            d="M18 12H22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <circle
            cx="12"
            cy="12"
            r="5"
            stroke="currentColor"
            strokeWidth="2"
          />

          <circle
            cx="12"
            cy="12"
            r="1.5"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* =========================
      🔥 TEXT
      ========================= */}
      <span style={styles.text}>
        {loading || clicked
          ? "위치 확인중..."
          : label}
      </span>

      {/* =========================
      🔥 NEON GLOW
      ========================= */}
      <div style={styles.glow} />
    </button>
  );
}

/* =========================
🔥 STYLE
========================= */

const styles = {
  button: {
    position: "relative",

    height: 58,

    minWidth: 148,

    padding:
      "0 22px 0 18px",

    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",

    gap: 12,

    borderRadius: 18,

    border:
      "1px solid rgba(255,215,0,0.72)",

    background:
      "linear-gradient(135deg, rgba(10,10,10,0.96) 0%, rgba(18,18,18,0.96) 100%)",

    color: "#FFD700",

    cursor: "pointer",

    fontSize: 17,
    fontWeight: 800,

    outline: "none",

    overflow: "hidden",

    userSelect: "none",

    backdropFilter:
      "blur(14px)",

    boxShadow:
      "0 0 14px rgba(255,215,0,0.22), inset 0 0 12px rgba(255,215,0,0.05)",

    transition:
      "all 0.24s ease",

    WebkitTapHighlightColor:
      "transparent",
  },

  activeButton: {
    color: "#fff",

    border:
      "1px solid rgba(255,0,128,0.9)",

    background:
      "linear-gradient(135deg, rgba(255,0,128,0.22) 0%, rgba(40,0,20,0.95) 100%)",

    boxShadow:
      "0 0 18px rgba(255,0,128,0.42), 0 0 38px rgba(255,0,128,0.22), inset 0 0 14px rgba(255,255,255,0.08)",
  },

  disabledButton: {
    opacity: 0.72,
    cursor: "not-allowed",
  },

  iconWrap: {
    position: "relative",

    width: 24,
    height: 24,

    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",

    flexShrink: 0,

    zIndex: 2,
  },

  icon: {
    display: "block",

    filter:
      "drop-shadow(0 0 8px rgba(255,215,0,0.9))",
  },

  text: {
    position: "relative",

    zIndex: 2,

    whiteSpace: "nowrap",

    letterSpacing: "-0.02em",
  },

  glow: {
    position: "absolute",

    inset: 0,

    background:
      "radial-gradient(circle at center, rgba(255,215,0,0.12) 0%, transparent 70%)",

    opacity: 1,

    pointerEvents: "none",

    zIndex: 1,
  },
};

export default memo(
  NearbyButton
);