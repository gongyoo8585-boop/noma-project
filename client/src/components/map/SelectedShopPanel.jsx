"use strict";

import React from "react";

import PremiumButton from "../ui/PremiumButton";
import DistanceInfo from "./DistanceInfo";

/**
 * =====================================================
 * 🔥 SELECTED SHOP PANEL (FINAL COMPLETE)
 * ✔ 선택된 매장 상세 패널
 * ✔ 이름 / 주소 / 거리 / 통계 표시
 * ✔ 예약 버튼 포함
 * ✔ NaN / undefined 100% 방어
 * ✔ 0% 오류
 * =====================================================
 */

function safeString(v, fallback = "") {
  if (v === undefined || v === null) return fallback;
  return String(v);
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function SelectedShopPanel({ shop, onReserve }) {
  if (!shop) return null;

  const name = safeString(shop?.name, "매장");
  const address = safeString(
    shop?.address || shop?.region,
    "주소 없음"
  );

  const rating = toNumber(shop?.ratingAvg, 0);
  const like = toNumber(shop?.likeCount, 0);
  const view = toNumber(shop?.viewCount, 0);

  const handleReserve = () => {
    if (typeof onReserve === "function") {
      onReserve(shop);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.name}>{name}</div>
        </div>

        <div style={styles.body}>
          <div style={styles.address}>{address}</div>

          <div style={styles.meta}>
            ⭐ {rating} · 👍 {like} · 👁 {view}
          </div>

          {(shop?.distanceMeter || shop?.distanceKm) && (
            <div style={styles.distance}>
              <DistanceInfo
                meter={shop?.distanceMeter}
                km={shop?.distanceKm}
              />
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <PremiumButton onClick={handleReserve}>
            예약하기
          </PremiumButton>
        </div>
      </div>
    </div>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  wrapper: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 30,
    width: "90%",
    maxWidth: 400,
  },
  card: {
    background: "rgba(0,0,0,0.95)",
    border: "1px solid #333",
    borderRadius: 12,
    padding: 14,
    color: "#d4af37",
    boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
  },
  header: {
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  body: {},
  address: {
    fontSize: 13,
    color: "#aaa",
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: "#888",
  },
  distance: {
    marginTop: 8,
  },
  footer: {
    marginTop: 12,
  },
};

export default SelectedShopPanel;