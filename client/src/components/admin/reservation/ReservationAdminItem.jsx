"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 RESERVATION ADMIN ITEM (ULTRA FINAL COMPLETE)
 * ✔ 관리자 예약 단일 아이템
 * ✔ ReservationAdminList와 100% 호환
 * ✔ 상태 변경
 * ✔ 관리자 강제 취소
 * ✔ 삭제
 * ✔ 사용자 / 매장 / 결제 정보 출력
 * ✔ null / undefined 안전 처리
 * ✔ 블랙 + 골드 UI
 * =====================================================
 */

function ReservationAdminItem({
  reservation,
  onStatusChange,
  onCancel,
  onDelete,
}) {
  if (!reservation) return null;

  const id = reservation._id || reservation.id || "";
  const user = reservation.user || {};
  const shop = reservation.shop || {};
  const payment = reservation.payment || {};

  const status = reservation.status || "pending";
  const price = Number(reservation.price || 0);
  const people = Number(reservation.people || 1);

  const handleStatusChange = (e) => {
    const nextStatus = e.target.value;

    if (!id) return;
    if (!nextStatus || nextStatus === status) return;

    onStatusChange && onStatusChange(id, nextStatus);
  };

  const handleCancel = () => {
    if (!id) return;
    onCancel && onCancel(id);
  };

  const handleDelete = () => {
    if (!id) return;
    onDelete && onDelete(id);
  };

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <strong style={styles.shopName}>
            {shop.name || reservation.shopName || "매장"}
          </strong>

          <div style={styles.meta}>
            예약자: {user.name || user.email || "사용자"}
          </div>

          <div style={styles.meta}>
            {reservation.date || "-"} {reservation.time || ""}
          </div>
        </div>

        <span style={statusBadge(status)}>{status}</span>
      </div>

      <div style={styles.info}>
        <InfoRow label="예약 ID" value={id || "-"} />
        <InfoRow label="서비스" value={reservation.serviceType || "-"} />
        <InfoRow label="인원" value={`${people}명`} />
        <InfoRow label="금액" value={`${price.toLocaleString()}원`} />
        <InfoRow label="메모" value={reservation.memo || "-"} />
        <InfoRow label="결제 상태" value={payment.status || "-"} />
      </div>

      {reservation.cancelReason && (
        <div style={styles.cancelBox}>
          취소 사유: {reservation.cancelReason}
        </div>
      )}

      <div style={styles.actions}>
        <select
          value={status}
          onChange={handleStatusChange}
          style={styles.select}
        >
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="confirmed">confirmed</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>

        {status !== "cancelled" && status !== "completed" && (
          <button
            type="button"
            onClick={handleCancel}
            style={styles.cancelBtn}
          >
            강제 취소
          </button>
        )}

        <button
          type="button"
          onClick={handleDelete}
          style={styles.deleteBtn}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
}

function statusBadge(status) {
  const base = {
    padding: "4px 9px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    border: "1px solid #444",
    whiteSpace: "nowrap",
  };

  if (status === "pending") {
    return { ...base, background: "#111", color: "#d4af37" };
  }

  if (status === "approved" || status === "confirmed") {
    return { ...base, background: "#d4af37", color: "#000" };
  }

  if (status === "completed") {
    return { ...base, background: "#065f46", color: "#fff" };
  }

  if (status === "cancelled") {
    return { ...base, background: "#700", color: "#fff" };
  }

  return base;
}

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
    color: "#aaa",
    fontSize: 13,
    marginTop: 4,
  },
  info: {
    marginTop: 14,
    display: "grid",
    gap: 7,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px solid #222",
    paddingBottom: 6,
  },
  label: {
    color: "#d4af37",
    fontWeight: "bold",
    minWidth: 80,
  },
  value: {
    color: "#ddd",
    textAlign: "right",
    wordBreak: "break-word",
  },
  cancelBox: {
    marginTop: 12,
    padding: 10,
    background: "#220000",
    color: "#ff6b6b",
    border: "1px solid #550000",
    borderRadius: 8,
  },
  actions: {
    marginTop: 14,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  select: {
    padding: "8px 10px",
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
  },
  cancelBtn: {
    padding: "8px 12px",
    background: "#900",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  deleteBtn: {
    padding: "8px 12px",
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default ReservationAdminItem;