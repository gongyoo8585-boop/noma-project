"use strict";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom"; // 🔥 최소 추가
import paymentApi from "../services/payment.api";
import reservationApi from "../services/reservation.api";
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 PAYMENT PAGE (ULTRA FINAL - FIXED)
 * =====================================================
 */

function PaymentPage({ navigate: propNavigate }) {
  const navigateHook = useNavigate(); // 🔥 최소 추가
  const navigate = propNavigate || navigateHook; // 🔥 최소 추가

  const params = new URLSearchParams(window.location.search);

  const reservationId = params.get("reservationId");
  const pgToken = params.get("pg_token");
  const status = params.get("status");

  const [reservation, setReservation] = useState(null);
  const [payment, setPayment] = useState(null);

  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [approving, setApproving] = useState(false);

  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const amount = useMemo(() => {
    return (
      reservation?.totalAmount ||
      reservation?.amount ||
      reservation?.price ||
      reservation?.shop?.priceDiscount ||
      reservation?.shop?.priceOriginal ||
      0
    );
  }, [reservation]);

  useEffect(() => {
    if (!reservationId) {
      setError("예약 ID가 없습니다.");
      return;
    }

    loadReservation();
  }, [reservationId]);

  useEffect(() => {
    if (reservationId && pgToken) {
      approveKakaoPayment();
    }
  }, [reservationId, pgToken]);

  const loadReservation = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await reservationApi.getDetail(reservationId);
      const data = res?.reservation || res?.item || res?.data || res;

      setReservation(data);
    } catch (e) {
      setError("예약 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const requestKakaoPayment = async () => {
    try {
      setPaying(true);

      const res = await paymentApi.kakaoReady({
        reservationId,
        amount,
        itemName:
          reservation?.shop?.name ||
          "마사지 예약 결제",
        successUrl: `${window.location.origin}/payment?reservationId=${reservationId}`,
        cancelUrl: `${window.location.origin}/payment?reservationId=${reservationId}&status=cancel`,
        failUrl: `${window.location.origin}/payment?reservationId=${reservationId}&status=fail`,
      });

      const nextUrl =
        res?.next_redirect_pc_url ||
        res?.nextRedirectPcUrl ||
        res?.redirectUrl ||
        res?.url ||
        res?.data?.next_redirect_pc_url;

      const tid = res?.tid || res?.data?.tid;

      if (tid) {
        localStorage.setItem(`kakao_tid_${reservationId}`, tid);
      }

      if (!nextUrl) {
        setError("결제 URL 없음");
        return;
      }

      window.location.href = nextUrl;

    } catch (e) {
      setError(e.message || "결제 요청 실패");
    } finally {
      setPaying(false);
    }
  };

  const approveKakaoPayment = async () => {
    try {
      setApproving(true);
      setError("");

      const tid = localStorage.getItem(`kakao_tid_${reservationId}`);

      const res = await paymentApi.kakaoApprove({
        reservationId,
        pgToken,
        tid,
      });

      setPayment(res?.payment || res?.data || res);
      setDone(true);

      localStorage.removeItem(`kakao_tid_${reservationId}`);
    } catch (e) {
      setError(e.message || "결제 승인 실패");
    } finally {
      setApproving(false);
    }
  };

  const cancelReservation = async () => {
    if (!window.confirm("예약 취소하시겠습니까?")) return;

    try {
      await reservationApi.cancel(reservationId);
      alert("예약 취소 완료");
      navigate("/map");
    } catch (e) {
      alert(e.message || "취소 실패");
    }
  };

  /* =========================
  UI 상태 처리
  ========================= */

  if (loading) return <Loading />;
  if (approving) return <Loading message="결제 승인 중..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadReservation} />;
  if (!reservation) return <EmptyState message="예약 데이터 없음" />;

  if (status === "cancel") {
    return <ResultBox title="결제 취소" button="지도 이동" onClick={() => navigate("/map")} />;
  }

  if (status === "fail") {
    return <ResultBox title="결제 실패" button="다시 결제" onClick={requestKakaoPayment} />;
  }

  if (done) {
    return <ResultBox title="결제 완료" button="마이페이지" onClick={() => navigate("/mypage")} />;
  }

  return (
    <div style={container}>
      <h2>결제하기</h2>

      <section style={card}>
        <InfoRow label="예약번호" value={reservationId} />
        <InfoRow label="매장" value={reservation?.shop?.name} />
        <InfoRow label="날짜" value={reservation?.date} />
        <InfoRow label="시간" value={reservation?.time} />
        <InfoRow label="인원" value={`${reservation?.people || 1}명`} />
      </section>

      <section style={card}>
        <h3>{Number(amount).toLocaleString()}원</h3>
      </section>

      <button onClick={requestKakaoPayment} style={payBtn}>
        {paying ? "결제중..." : "카카오페이 결제"}
      </button>

      <button onClick={cancelReservation} style={cancelBtn}>
        예약 취소
      </button>
    </div>
  );
}

/* =========================
UI 컴포넌트
========================= */
function InfoRow({ label, value }) {
  return (
    <div style={row}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultBox({ title, button, onClick }) {
  return (
    <div style={container}>
      <h2>{title}</h2>
      <button onClick={onClick} style={payBtn}>
        {button}
      </button>
    </div>
  );
}

/* =========================
스타일
========================= */
const container = {
  maxWidth: 720,
  margin: "0 auto",
  padding: 20,
  background: "#000",
  color: "#d4af37",
  minHeight: "100vh",
};

const card = {
  padding: 15,
  border: "1px solid #333",
  borderRadius: 10,
  marginBottom: 15,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
};

const payBtn = {
  width: "100%",
  padding: 15,
  background: "#d4af37",
  border: "none",
  borderRadius: 10,
  color: "#000",
  fontWeight: "bold",
  marginBottom: 10,
};

const cancelBtn = {
  width: "100%",
  padding: 15,
  background: "#111",
  border: "1px solid #444",
  borderRadius: 10,
  color: "#fff",
};

export default PaymentPage;