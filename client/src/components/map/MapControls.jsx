"use strict";

import React from "react";

function MapControls({
  onZoomIn,
  onZoomOut,
  onCurrentLocation,
  onRefreshArea,
  disabled = false,
}) {
  const safeClick = (callback) => {
    if (disabled) {
      return;
    }

    if (typeof callback === "function") {
      callback();
    }
  };

  return (
    <div style={styles.wrap}>
      <button
        type="button"
        style={{
          ...styles.refreshButton,
          ...(disabled ? styles.disabled : null),
        }}
        onClick={() =>
          safeClick(onRefreshArea)
        }
        disabled={disabled}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M20 12C20 16.4183 16.4183 20 12 20C8.13401 20 4.90873 17.2616 4.15856 13.6134"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          <path
            d="M4 12C4 7.58172 7.58172 4 12 4C15.866 4 19.0913 6.73835 19.8414 10.3866"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          <path
            d="M20 4V10H14"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M4 20V14H10"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span style={styles.refreshText}>
          이 지역 재검색
        </span>
      </button>

      <div style={styles.rightFloat}>
        <div style={styles.group}>
          <button
            type="button"
            style={{
              ...styles.button,
              ...(disabled ? styles.disabled : null),
            }}
            onClick={() => safeClick(onZoomIn)}
            disabled={disabled}
            aria-label="지도 확대"
          >
            +
          </button>

          <div style={styles.divider} />

          <button
            type="button"
            style={{
              ...styles.button,
              ...(disabled ? styles.disabled : null),
            }}
            onClick={() => safeClick(onZoomOut)}
            disabled={disabled}
            aria-label="지도 축소"
          >
            −
          </button>
        </div>

        <button
          type="button"
          style={{
            ...styles.locationButton,
            ...(disabled ? styles.disabled : null),
          }}
          onClick={() =>
            safeClick(onCurrentLocation)
          }
          disabled={disabled}
          aria-label="현재 위치"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="3.4"
              fill="#FFD400"
            />

            <circle
              cx="12"
              cy="12"
              r="8.1"
              stroke="#FFD400"
              strokeWidth="2.3"
            />

            <line
              x1="12"
              y1="1.5"
              x2="12"
              y2="4.8"
              stroke="#FFD400"
              strokeWidth="2.3"
              strokeLinecap="round"
            />

            <line
              x1="12"
              y1="19.2"
              x2="12"
              y2="22.5"
              stroke="#FFD400"
              strokeWidth="2.3"
              strokeLinecap="round"
            />

            <line
              x1="1.5"
              y1="12"
              x2="4.8"
              y2="12"
              stroke="#FFD400"
              strokeWidth="2.3"
              strokeLinecap="round"
            />

            <line
              x1="19.2"
              y1="12"
              x2="22.5"
              y2="12"
              stroke="#FFD400"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "absolute",
    inset: 0,
    zIndex: 30,
    pointerEvents: "none",
  },

  rightFloat: {
    position: "absolute",
    right: 20,
    bottom: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
    pointerEvents: "auto",
  },

  group: {
    width: 64,
    borderRadius: 32,
    background:
      "linear-gradient(180deg, rgba(8,8,8,0.98) 0%, rgba(0,0,0,0.96) 100%)",
    border: "1px solid rgba(255,212,0,0.92)",
    boxShadow:
      "0 0 0 1px rgba(255,212,0,0.12), 0 0 14px rgba(255,212,0,0.62), 0 0 30px rgba(255,212,0,0.26), 0 10px 28px rgba(0,0,0,0.82)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backdropFilter: "blur(8px)",
  },

  divider: {
    width: "100%",
    height: 1,
    background:
      "linear-gradient(90deg, transparent 0%, rgba(255,212,0,0.85) 50%, transparent 100%)",
  },

  button: {
    width: "100%",
    height: 58,
    border: "none",
    outline: "none",
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(255,212,0,0.04) 100%)",
    color: "#FFD400",
    fontSize: 43,
    fontWeight: 400,
    cursor: "pointer",
    transition:
      "transform 0.16s ease, filter 0.16s ease, background 0.16s ease, text-shadow 0.16s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    textShadow:
      "0 0 8px rgba(255,212,0,0.95), 0 0 18px rgba(255,212,0,0.55)",
  },

  locationButton: {
    width: 62,
    height: 62,
    borderRadius: "50%",
    border: "1px solid rgba(255,212,0,0.96)",
    background:
      "radial-gradient(circle at 50% 50%, rgba(255,212,0,0.08) 0%, rgba(0,0,0,0.96) 58%, rgba(0,0,0,1) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow:
      "0 0 0 1px rgba(255,212,0,0.12), 0 0 14px rgba(255,212,0,0.72), 0 0 32px rgba(255,212,0,0.32), inset 0 0 12px rgba(255,212,0,0.08)",
    backdropFilter: "blur(8px)",
    transition:
      "transform 0.16s ease, filter 0.16s ease, box-shadow 0.16s ease",
  },

  refreshButton: {
    position: "absolute",
    top: 16,
    right: 20,
    minWidth: 150,
    height: 44,
    borderRadius: 8,
    border: "1px solid rgba(255,212,0,0.88)",
    background:
      "linear-gradient(180deg, rgba(7,7,7,0.98) 0%, rgba(0,0,0,0.96) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "0 14px",
    cursor: "pointer",
    boxShadow:
      "0 0 0 1px rgba(255,212,0,0.10), 0 0 12px rgba(255,212,0,0.34), 0 8px 20px rgba(0,0,0,0.76)",
    backdropFilter: "blur(8px)",
    transition:
      "transform 0.16s ease, filter 0.16s ease, box-shadow 0.16s ease",
    pointerEvents: "auto",
  },

  refreshText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 900,
    whiteSpace: "nowrap",
    letterSpacing: "-0.3px",
    textShadow:
      "0 0 8px rgba(255,255,255,0.22)",
  },

  disabled: {
    opacity: 0.45,
    cursor: "not-allowed",
    filter: "grayscale(0.4)",
  },
};

export default MapControls;