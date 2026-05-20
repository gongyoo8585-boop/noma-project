"use strict";

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import paymentApi from "../services/payment.api";

/* 🔥 추가 */
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 PAYMENT SUCCESS PAGE (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ Loading / Error / EmptyState 적용
 * ✔ 기존 흐름 유지
 * ✔ 에러 시 로딩 중복 방지 (최소 수정)
 * =====================================================
 */

const PaymentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getPaymentId = () => {
    const params = new URLSearchParams(location.search);
    return params.get("paymentId");
  };

  const fetchPayment = async () => {
    const paymentId = getPaymentId();

    if (!paymentId) {
      setError("paymentId 없음");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await paymentApi.getDetail(paymentId);
      const data = res?.data || res;

      setPayment(data || null);

    } catch (e) {
      setError(e.message || "결제 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
  }, []);

  return (
    <div style={wrap}>
      <h1 style={title}>결제 완료</h1>

      {/* 🔥 에러 시 로딩 차단 */}
      {!error && loading && (
        <Loading message="결제 정보 확인 중..." />
      )}

      {error && (
        <ErrorMessage message={error} onRetry={fetchPayment} />
      )}

      {!loading && !error && !payment && (
        <EmptyState message="결제 정보를 찾을 수 없습니다." />
      )}

      {!loading && !error && payment && (
        <div style={card}>
          <InfoRow label="결제 ID" value={payment._id || payment.id} />
          <InfoRow label="상태" value={payment.status} />
          <InfoRow
            label="금액"
            value={`${Number(payment.amount || 0).toLocaleString()}원`}
          />

          {payment.approvedAt && (
            <InfoRow
              label="승인 시간"
              value={new Date(payment.approvedAt).toLocaleString()}
            />
          )}
        </div>
      )}

      <div style={actions}>
        <button onClick={() => navigate("/")} style={btn}>
          홈으로
        </button>

        <button onClick={() => navigate("/reservations")} style={goldBtn}>
          예약 보기
        </button>
      </div>
    </div>
  );
};

function InfoRow({ label, value }) {
  return (
    <div style={row}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value || "-"}</span>
    </div>
  );
}

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
  marginTop: 20,
  background: "#111",
  border: "1px solid #333",
  borderRadius: 12,
  padding: 16,
  width: "100%",
  maxWidth: 400,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 10,
};

const labelStyle = {
  color: "#FFD700",
};

const valueStyle = {
  color: "#fff",
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

export default PaymentSuccessPage;