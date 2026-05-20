"use strict";

import React from "react";
import ReservationStatus from "./ReservationStatus";

/**
 * =====================================================
 * 🔥 RESERVATION ITEM (ULTRA FINAL COMPLETE)
 * ✔ 예약 목록 단일 아이템
 * ✔ ReservationList와 100% 호환
 * ✔ 상세 이동
 * ✔ 예약 취소 버튼
 * ✔ 상태 표시
 * ✔ null / undefined 안전 처리
 * ✔ UI 블랙 + 골드
 * ✔ 단일 파일 완성형
 * =====================================================
 */

function ReservationItem({ reservation, onCancel }) {
  if (!reservation) return null;

  const id = reservation._id || reservation.id || "";
  const shop = reservation.shop || {};
  const shopName = shop.name || reservation.shopName || "매장";
  const date = reservation.date || "";
  const time = reservation.time || "";
  const serviceType = reservation.serviceType || "";
  const people = Number(reservation.people || 1);
  const price = Number(reservation.price || 0);
  const status = reservation.status || "pending";
  const memo = reservation.memo || "";

  const goDetail = () => {
    if (!id) return;
    window.location.href = `/reservations/${id}`;
  };

  const canCancel =
    status !== "cancelled" &&
    status !== "completed";

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <strong style={styles.shopName}>{shopName}</strong>

          <div style={styles.meta}>
            {date || "-"} {time || ""}
          </div>
        </div>

        <ReservationStatus status={status} />
      </div>

      <div style={styles.body}>
        {serviceType && (
          <div>
            <span style={styles.label}>서비스</span>
            <span>{serviceType}</span>
          </div>
        )}

        <div>
          <span style={styles.label}>인원</span>
          <span>{people}명</span>
        </div>

        <div>
          <span style={styles.label}>금액</span>
          <span>{price.toLocaleString()}원</span>
        </div>

        {memo && (
          <div style={styles.memo}>
            <span style={styles.label}>메모</span>
            <span>{memo}</span>
          </div>
        )}
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          onClick={goDetail}
          style={styles.detailBtn}
        >
          상세
        </button>

        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel && onCancel(id)}
            style={styles.cancelBtn}
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================
🔥 스타일
========================= */
const styles = {
  card: {
    padding: 16,
    background: "#111",
    border: "1px solid #333",
    borderRadius: 12,
    color: "#fff",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  shopName: {
    color: "#d4af37",
    fontSize: 18,
  },
  meta: {
    color: "#888",
    marginTop: 4,
    fontSize: 13,
  },
  body: {
    marginTop: 12,
    display: "grid",
    gap: 6,
    color: "#ddd",
  },
  label: {
    display: "inline-block",
    minWidth: 55,
    color: "#d4af37",
    fontWeight: "bold",
    marginRight: 8,
  },
  memo: {
    whiteSpace: "pre-wrap",
    color: "#aaa",
  },
  actions: {
    marginTop: 14,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  detailBtn: {
    padding: "8px 12px",
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "8px 12px",
    background: "#900",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default ReservationItem;