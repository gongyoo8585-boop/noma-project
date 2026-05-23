"use strict";

import React from "react";
import ReservationStatus from "./ReservationStatus";

/* 🔥 추가 */
import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 RESERVATION DETAIL (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ EmptyState 최소 추가 (기존 empty UI 대체)
 * ✔ 기존 흐름 유지
 * =====================================================
 */

function ReservationDetail({ reservation, onCancel }) {
  if (!reservation) {
    return <EmptyState message="예약 정보가 없습니다." />;
  }

  const id = reservation._id || reservation.id || "";
  const shop = reservation.shop || {};
  const user = reservation.user || {};
  const payment = reservation.payment || {};

  const status = reservation.status || "pending";
  const price = Number(reservation.price || 0);
  const people = Number(reservation.people || 1);

  const canCancel =
    status !== "cancelled" &&
    status !== "completed";

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            {shop.name || reservation.shopName || "예약 상세"}
          </h2>

          {shop.address && (
            <div style={styles.subText}>{shop.address}</div>
          )}
        </div>

        <ReservationStatus status={status} />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>예약 정보</h3>

        <InfoRow label="예약 ID" value={id || "-"} />
        <InfoRow label="날짜" value={reservation.date || "-"} />
        <InfoRow label="시간" value={reservation.time || "-"} />
        <InfoRow label="서비스" value={reservation.serviceType || "-"} />
        <InfoRow label="인원" value={`${people}명`} />
        <InfoRow label="금액" value={`${price.toLocaleString()}원`} />
        <InfoRow label="상태" value={status} />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>매장 정보</h3>

        <InfoRow label="매장명" value={shop.name || "-"} />
        <InfoRow label="주소" value={shop.address || "-"} />
        <InfoRow label="전화" value={shop.phone || "-"} />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>사용자 정보</h3>

        <InfoRow label="이름" value={user.name || "-"} />
        <InfoRow label="이메일" value={user.email || "-"} />
        <InfoRow label="전화" value={user.phone || "-"} />
      </div>

      {reservation.memo && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>메모</h3>
          <div style={styles.memo}>{reservation.memo}</div>
        </div>
      )}

      {(payment._id || payment.status || reservation.payment) && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>결제 정보</h3>

          <InfoRow label="결제 ID" value={payment._id || "-"} />
          <InfoRow label="결제 상태" value={payment.status || "-"} />
          <InfoRow
            label="결제 금액"
            value={`${Number(payment.amount || price || 0).toLocaleString()}원`}
          />
        </div>
      )}

      {reservation.cancelReason && (
        <div style={styles.cancelBox}>
          취소 사유: {reservation.cancelReason}
        </div>
      )}

      <div style={styles.actions}>
        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel && onCancel(id)}
            style={styles.cancelBtn}
          >
            예약 취소
          </button>
        )}

        <button
          type="button"
          onClick={() => window.history.back()}
          style={styles.backBtn}
        >
          뒤로가기
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

/* =========================
🔥 스타일
========================= */
const styles = {
  card: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  title: {
    margin: 0,
    color: "#d4af37",
    fontSize: 24,
  },
  subText: {
    marginTop: 6,
    color: "#888",
    fontSize: 13,
  },
  section: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1px solid #333",
  },
  sectionTitle: {
    margin: "0 0 10px",
    color: "#d4af37",
    fontSize: 16,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "7px 0",
    borderBottom: "1px solid #222",
  },
  infoLabel: {
    color: "#d4af37",
    fontWeight: "bold",
    minWidth: 80,
  },
  infoValue: {
    color: "#fff",
    textAlign: "right",
    wordBreak: "break-word",
  },
  memo: {
    padding: 12,
    background: "#000",
    border: "1px solid #333",
    borderRadius: 8,
    color: "#ddd",
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  },
  cancelBox: {
    marginTop: 16,
    padding: 12,
    background: "#220000",
    color: "#ff6b6b",
    border: "1px solid #550000",
    borderRadius: 8,
  },
  actions: {
    marginTop: 18,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  cancelBtn: {
    padding: "10px 14px",
    background: "#900",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
  backBtn: {
    padding: "10px 14px",
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default ReservationDetail;