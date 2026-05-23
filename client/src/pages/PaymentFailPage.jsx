"use strict";

import React from "react";
import { useNavigate } from "react-router-dom";

/* 🔥 추가 */
import ErrorMessage from "../components/common/ErrorMessage";

/**
 * =====================================================
 * 🔥 PAYMENT FAIL PAGE (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ ErrorMessage UI 최소 추가
 * ✔ 기존 흐름 유지
 * ✔ 중복 메시지 최소화 (최소 수정)
 * =====================================================
 */

const PaymentFailPage = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div style={wrap}>
      <h1 style={title}>결제 실패</h1>

      {/* 🔥 에러 공통 UI */}
      <ErrorMessage message="결제 처리 중 문제가 발생했습니다." />

      <div style={card}>
        <p style={message}>
          다시 시도하거나 다른 결제 방법을 이용해주세요.
        </p>
      </div>

      <div style={actions}>
        <button onClick={handleRetry} style={btn}>
          다시 시도
        </button>

        <button onClick={() => navigate("/")} style={goldBtn}>
          홈으로
        </button>
      </div>
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
  padding: 20,
};

const title = {
  fontSize: 28,
  color: "#FFD700",
  marginBottom: 20,
};

const card = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: 12,
  padding: 20,
  textAlign: "center",
  maxWidth: 400,
};

const message = {
  fontSize: 16,
};

const actions = {
  marginTop: 20,
  display: "flex",
  gap: 10,
};

const btn = {
  padding: "10px 14px",
  background: "#000",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: 8,
  cursor: "pointer",
};

const goldBtn = {
  ...btn,
  background: "#FFD700",
  color: "#000",
  fontWeight: "bold",
};

export default PaymentFailPage;