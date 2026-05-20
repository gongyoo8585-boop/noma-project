"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 PAYMENT ADMIN ITEM (ULTRA FINAL COMPLETE)
 * ✔ 관리자 결제 단일 아이템
 * ✔ PaymentAdminList와 100% 호환
 * ✔ 환불 / 상태 조회 / 상세 이동
 * ✔ 결제 / 예약 / 유저 정보 표시
 * ✔ null / undefined 안전 처리
 * ✔ 블랙 + 골드 UI
 * =====================================================
 */

function PaymentAdminItem({
  payment,
  onRefund,
  onRefreshStatus,
  onDetail,
}) {
  if (!payment) return null;

  const id = payment._id || payment.id || "";
  const user = payment.user || {};
  const reservation = payment.reservation || {};

  const amount = Number(payment.amount || 0);
  const status = payment.status || "ready";

  const handleRefund = () => {
    if (!id) return;
    onRefund && onRefund(id);
  };

  const handleRefresh = () => {
    if (!id) return;
    onRefreshStatus && onRefreshStatus(id);
  };

  const handleDetail = () => {
    if (!id) return;
    onDetail && onDetail(id);
  };

  return (
    <div style={styles.card}>
      {/* 상단 */}
      <div style={styles.top}>
        <div>
          <strong style={styles.title}>
            결제 #{id.slice(-6)}
          </strong>

          <div style={styles.meta}>
            사용자: {user.name || user.email || "사용자"}
          </div>

          <div style={styles.meta}>
            예약: {reservation._id || "-"}
          </div>
        </div>

        <span style={statusBadge(status)}>
          {status}
        </span>
      </div>

      {/* 정보 */}
      <div style={styles.info}>
        <InfoRow label="금액" value={`${amount.toLocaleString()}원`} />
        <InfoRow label="통화" value={payment.currency || "KRW"} />
        <InfoRow label="TID" value={payment.tid || "-"} />
        <InfoRow label="결제 시간" value={formatDate(payment.approvedAt)} />
        <InfoRow label="취소 시간" value={formatDate(payment.cancelledAt)} />
        <InfoRow label="실패 사유" value={payment.failReason || "-"} />
      </div>

      {/* 액션 */}
      <div style={styles.actions}>
        <button onClick={handleRefresh} style={styles.btn}>
          상태 조회
        </button>

        {status === "paid" && (
          <button onClick={handleRefund} style={styles.dangerBtn}>
            환불
          </button>
        )}

        <button onClick={handleDetail} style={styles.goldBtn}>
          상세
        </button>
      </div>
    </div>
  );
}

/* =========================
🔥 공통 Row
========================= */
function InfoRow({ label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
}

/* =========================
🔥 UTIL
========================= */
function formatDate(date) {
  if (!date) return "-";

  try {
    return new Date(date).toLocaleString();
  } catch {
    return "-";
  }
}

function statusBadge(status) {
  const base = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    border: "1px solid #444",
  };

  if (status === "ready") {
    return { ...base, background: "#111", color: "#d4af37" };
  }

  if (status === "paid") {
    return { ...base, background: "#d4af37", color: "#000" };
  }

  if (status === "cancelled") {
    return { ...base, background: "#700", color: "#fff" };
  }

  if (status === "fail") {
    return { ...base, background: "#444", color: "#fff" };
  }

  return base;
}

/* =========================
🔥 STYLE
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
    gap: 10,
  },
  title: {
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
    gap: 6,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #222",
    paddingBottom: 5,
  },
  label: {
    color: "#d4af37",
    fontWeight: "bold",
  },
  value: {
    color: "#ddd",
  },
  actions: {
    marginTop: 14,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  btn: {
    padding: "8px 12px",
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
    cursor: "pointer",
  },
  goldBtn: {
    padding: "8px 12px",
    background: "#d4af37",
    color: "#000",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
  dangerBtn: {
    padding: "8px 12px",
    background: "#900",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default PaymentAdminItem;