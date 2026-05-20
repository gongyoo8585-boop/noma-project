"use strict";

import { useState } from "react";
import paymentApi from "../services/payment.api";

/**
 * =====================================================
 * 🔥 USE PAYMENT HOOK (ULTRA FINAL COMPLETE)
 * ✔ kakaoReady / approve / verify 통합
 * ✔ 상태 관리 (loading / error / payment)
 * ✔ 결제 흐름 단일 훅으로 처리
 * ✔ 기존 API 구조 100% 유지
 * ✔ 재사용 가능
 * =====================================================
 */

function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null);

  /* =========================
  🔥 결제 시작 (ready)
  ========================= */
  const startPayment = async ({ reservationId, amount, orderName }) => {
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

      window.location.href = redirectUrl;

    } catch (e) {
      setError(e.message || "결제 시작 실패");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
  🔥 결제 승인
  ========================= */
  const approvePayment = async ({ pgToken, tid, orderId }) => {
    try {
      setLoading(true);
      setError("");

      const res = await paymentApi.kakaoApprove({
        pgToken,
        tid,
        orderId,
      });

      const paymentId =
        res?.paymentId ||
        res?.data?.paymentId ||
        res?._id;

      if (!paymentId) {
        throw new Error("결제 승인 실패");
      }

      return paymentId;

    } catch (e) {
      setError(e.message || "결제 승인 실패");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
  🔥 결제 검증
  ========================= */
  const verifyPayment = async (paymentId) => {
    try {
      setLoading(true);
      setError("");

      const res = await paymentApi.verify({
        paymentId,
      });

      setPayment(res?.data || res || null);

      return res;

    } catch (e) {
      setError(e.message || "결제 검증 실패");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
  🔥 결제 조회
  ========================= */
  const fetchPayment = async (id) => {
    try {
      setLoading(true);
      setError("");

      const res = await paymentApi.getDetail(id);
      const data = res?.data || res;

      setPayment(data || null);

      return data;

    } catch (e) {
      setError(e.message || "결제 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
  🔥 초기화
  ========================= */
  const reset = () => {
    setError("");
    setPayment(null);
    setLoading(false);
  };

  return {
    loading,
    error,
    payment,
    startPayment,
    approvePayment,
    verifyPayment,
    fetchPayment,
    reset,
  };
}

export default usePayment;