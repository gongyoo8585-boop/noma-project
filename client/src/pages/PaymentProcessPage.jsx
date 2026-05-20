"use strict";

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import paymentApi from "../services/payment.api";

/* 🔥 추가 */
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";

/**
 * =====================================================
 * 🔥 PAYMENT PROCESS PAGE (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ Loading / ErrorMessage 적용 (최소 추가)
 * ✔ 기존 흐름 유지
 * ✔ 에러 시 로딩 중복 표시 방지 (최소 수정)
 * =====================================================
 */

const PaymentProcessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getQuery = () => {
    const params = new URLSearchParams(location.search);
    return {
      pgToken: params.get("pg_token"),
      tid: params.get("tid"),
      orderId: params.get("orderId"),
    };
  };

  const processPayment = async () => {
    const { pgToken, tid, orderId } = getQuery();

    if (!pgToken) {
      setError("pg_token 없음");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const approveRes = await paymentApi.kakaoApprove({
        pgToken,
        tid,
        orderId,
      });

      const paymentId =
        approveRes?.paymentId ||
        approveRes?.data?.paymentId ||
        approveRes?._id ||
        approveRes?.id;

      if (!paymentId) {
        throw new Error("결제 승인 실패 (ID 없음)");
      }

      await paymentApi.verify({
        paymentId,
      });

      navigate(`/payments/success?paymentId=${paymentId}`);

    } catch (e) {
      setError(e.message || "결제 처리 실패");

      setTimeout(() => {
        navigate("/payments/fail");
      }, 1500);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    processPayment();
  }, []);

  return (
    <div style={wrap}>
      <h1 style={title}>결제 처리 중</h1>

      {/* 🔥 에러 시 로딩 차단 */}
      {!error && loading && (
        <Loading message="결제를 확인하는 중..." />
      )}

      {error && (
        <ErrorMessage message={error} />
      )}
    </div>
  );
};

const wrap = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const title = {
  fontSize: 26,
  color: "#FFD700",
  marginBottom: 20,
};

export default PaymentProcessPage;