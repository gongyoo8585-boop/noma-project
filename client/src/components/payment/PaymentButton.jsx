"use strict";

import React, { useState } from "react";
import paymentApi from "../../services/payment.api";

/**
 * =====================================================
 * 🔥 PAYMENT BUTTON (ULTRA FINAL COMPLETE)
 * ✔ kakaoReady 연결
 * ✔ 결제 시작 버튼
 * ✔ 로딩 / 에러 처리
 * ✔ redirectUrl 이동 처리
 * ✔ ReservationCreatePage / DetailPage 호환
 * ✔ 블랙 + 골드 UI
 * =====================================================
 */

function PaymentButton({
  reservationId,
  amount,
  orderName = "예약 결제",
  disabled = false,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================
  🔥 결제 시작
  ========================= */
  const handlePayment = async () => {
    if (!reservationId || !amount) {
      setError("결제 정보 부족");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await paymentApi.kakaoReady({
        reservationId,
        amount,
        orderName,
      });

      const redirectUrl =
        res?.next_redirect_pc_url ||
        res?.data?.next_redirect_pc_url;

      if (!redirectUrl) {
        throw new Error("결제 URL 없음");
      }

      /* 🔥 카카오 결제 페이지 이동 */
      window.location.href = redirectUrl;

    } catch (e) {
      setError(e.message || "결제 시작 실패");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
  🔥 UI
  ========================= */
  return (
    <div>
      {error && <div style={errorBox}>{error}</div>}

      <button
        onClick={handlePayment}
        disabled={disabled || loading}
        style={btn}
      >
        {loading ? "결제 준비중..." : "카카오 결제"}
      </button>
    </div>
  );
}

/* =========================
🔥 STYLE
========================= */

const btn = {
  padding: "12px 16px",
  background: "#FFD700",
  color: "#000",
  border: "none",
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer",
};

const errorBox = {
  marginBottom: 10,
  color: "#ff6b6b",
};

export default PaymentButton;