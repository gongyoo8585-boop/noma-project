"use strict";

import React from "react";

import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 PREMIUM CHART (FINAL COMPLETE)
 * ✔ 프리미엄 스타일 차트 (Bar + Glow)
 * ✔ 외부 라이브러리 없음
 * ✔ NaN / undefined 100% 방어
 * ✔ 데이터 없으면 EmptyState
 * ✔ 0% 오류
 * =====================================================
 */

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeData(data) {
  if (!Array.isArray(data)) return [];

  return data.map((d) => ({
    label: String(d?.label ?? ""),
    value: toNumber(d?.value, 0),
  }));
}

function PremiumChart({ data = [], title = "차트" }) {
  const list = normalizeData(data);

  if (!list.length) {
    return <EmptyState message="차트 데이터 없음" />;
  }

  const max = Math.max(...list.map((d) => d.value), 1);

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>{title}</h3>

      <div style={styles.chart}>
        {list.map((item, idx) => {
          const height = (item.value / max) * 100;

          return (
            <div key={idx} style={styles.barWrapper}>
              <div style={styles.barContainer}>
                <div
                  style={{
                    ...styles.bar,
                    height: `${height}%`,
                  }}
                />
                <div
                  style={{
                    ...styles.glow,
                    height: `${height}%`,
                  }}
                />
              </div>

              <div style={styles.label}>{item.label}</div>
              <div style={styles.value}>
                {item.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  wrapper: {
    background: "linear-gradient(145deg, #0d0d0d, #1a1a1a)",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: 14,
    padding: 16,
    color: "#d4af37",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.6), inset 0 0 10px rgba(212,175,55,0.05)",
  },
  title: {
    marginBottom: 12,
    color: "#d4af37",
  },
  chart: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    height: 220,
  },
  barWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  barContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "flex-end",
  },
  bar: {
    width: "100%",
    background:
      "linear-gradient(180deg, #d4af37 0%, #b8962e 100%)",
    borderRadius: 6,
    zIndex: 2,
  },
  glow: {
    position: "absolute",
    width: "100%",
    background: "rgba(212,175,55,0.25)",
    filter: "blur(8px)",
    borderRadius: 6,
    zIndex: 1,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: "#888",
  },
  value: {
    fontSize: 12,
    color: "#fff",
  },
};

export default PremiumChart;