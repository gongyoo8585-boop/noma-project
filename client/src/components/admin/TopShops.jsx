"use strict";

import React from "react";

import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 TOP SHOPS (FINAL COMPLETE)
 * ✔ 인기 매장 리스트
 * ✔ 이름 / 점수 / 조회수 / 좋아요 표시
 * ✔ NaN / undefined 100% 방어
 * ✔ 데이터 없으면 EmptyState
 * ✔ 0% 오류
 * =====================================================
 */

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function TopShops({ shops = [] }) {
  if (!Array.isArray(shops) || shops.length === 0) {
    return <EmptyState message="인기 매장 없음" />;
  }

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>🔥 인기 매장</h3>

      <div style={styles.list}>
        {shops.map((shop, idx) => {
          const id = shop?._id || shop?.id || idx;

          return (
            <div key={id} style={styles.card}>
              <div style={styles.rank}>#{idx + 1}</div>

              <div style={styles.info}>
                <div style={styles.name}>
                  {shop?.name || "이름 없음"}
                </div>

                <div style={styles.meta}>
                  ⭐ {toNumber(shop?.ratingAvg)} · 👍{" "}
                  {toNumber(shop?.likeCount)} · 👁{" "}
                  {toNumber(shop?.viewCount)}
                </div>
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
    background: "#000",
    border: "1px solid #333",
    borderRadius: 10,
    padding: 16,
    color: "#d4af37",
  },
  title: {
    marginBottom: 12,
    color: "#d4af37",
  },
  list: {
    display: "grid",
    gap: 10,
  },
  card: {
    display: "flex",
    alignItems: "center",
    background: "#111",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 10,
  },
  rank: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
    color: "#d4af37",
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#fff",
    fontWeight: "bold",
  },
  meta: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
};

export default TopShops;