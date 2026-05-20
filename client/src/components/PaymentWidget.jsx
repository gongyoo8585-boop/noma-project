"use strict";

import React, { useEffect, useState } from "react";
import paymentApi from "../services/payment.api";

/**
 * =====================================================
 * 🔥 PAYMENT WIDGET (ULTRA FINAL)
 * ✔ 기존 기능 100% 유지
 * ✔ 카카오 결제 요청 / 리다이렉트 유지
 * ✔ 승인 처리 자동화 추가
 * ✔ 실패 / 취소 상태 처리 추가
 * ✔ 중복 결제 방지
 * ✔ 다크(블랙/골드) UI 적용
 * =====================================================
 */

function PaymentWidget({
  reservationId,
  amount,
  itemName = "예약 결제",
  onSuccess = () => {},
  onFail = () => {},
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  /* =========================
  🔥 결제 승인 처리 (추가)
  ========================= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pgToken = params.get("pg_token");
    const urlStatus = params.get("status");

    if (urlStatus === "cancel") {
      setStatus("결제 취소됨");
      onFail({ message: "cancel" });
      return;
    }

    if (urlStatus === "fail") {
      setStatus("결제 실패");
      onFail({ message: "fail" });
      return;
    }

    if (!pgToken || !reservationId) return;

    approvePayment(pgToken);
  }, []);

  /* =========================
  🔥 결제 승인
  ========================= */
  const approvePayment = async (pgToken) => {
    try {
      setLoading(true);

      const tid = localStorage.getItem(
        `kakao_tid_${reservationId}`
      );

      if (!tid) {
        throw new Error("TID 없음");
      }

      const res = await paymentApi.kakaoApprove({
        reservationId,
        tid,
        pgToken,
      });

      setStatus("결제 완료");
      onSuccess(res);

      /* 중복 승인 방지 */
      localStorage.removeItem(`kakao_tid_${reservationId}`);

    } catch (e) {
      setStatus("결제 승인 실패");
      onFail(e);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
  🔥 결제 요청
  ========================= */
  const requestPayment = async () => {
    if (!reservationId) {
      alert("예약 ID 없음");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      const res = await paymentApi.kakaoReady({
        reservationId,
        amount,
        itemName,
        successUrl: `${window.location.origin}/payment?reservationId=${reservationId}`,
        cancelUrl: `${window.location.origin}/payment?reservationId=${reservationId}&status=cancel`,
        failUrl: `${window.location.origin}/payment?reservationId=${reservationId}&status=fail`,
      });

      const nextUrl =
        res.next_redirect_pc_url ||
        res.nextRedirectPcUrl ||
        res.url ||
        res.data?.next_redirect_pc_url;

      const tid = res.tid || res.data?.tid;

      if (tid) {
        localStorage.setItem(`kakao_tid_${reservationId}`, tid);
      }

      if (!nextUrl) {
        throw new Error("결제 URL 없음");
      }

      window.location.href = nextUrl;

    } catch (e) {
      alert(e.message || "결제 요청 실패");
      onFail(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrapper}>
      <div style={priceBox}>
        <span>결제 금액</span>
        <strong>{Number(amount || 0).toLocaleString()}원</strong>
      </div>

      {status && (
        <div style={statusBox}>
          {status}
        </div>
      )}

      <button
        onClick={requestPayment}
        disabled={loading}
        style={{
          ...btn,
          background: loading ? "#444" : "#d4af37",
          color: loading ? "#999" : "#000",
        }}
      >
        {loading ? "결제 처리 중..." : "카카오페이 결제"}
      </button>
    </div>
  );
}

/* =========================
STYLE (블랙/골드)
========================= */

const wrapper = {
  padding: 20,
  border: "1px solid #333",
  borderRadius: 12,
  background: "#000",
  color: "#d4af37",
};

const priceBox = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 15,
  fontSize: 16,
};

const statusBox = {
  marginBottom: 10,
  color: "#fff",
};

const btn = {
  width: "100%",
  padding: 14,
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

export default PaymentWidget;