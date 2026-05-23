"use strict";

import React, { useEffect, useState } from "react";
import reservationApi from "../services/reservation.api";
import ReservationDetail from "../components/reservation/ReservationDetail";

/* 🔥 추가 */
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 RESERVATION DETAIL PAGE (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ Loading / Error / EmptyState 적용
 * ✔ 기존 흐름 유지
 * ✔ 에러 시 하위 UI 차단 (중복 렌더 방지 - 최소 수정)
 * =====================================================
 */

function ReservationDetailPage() {
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useTx, setUseTx] = useState(true);

  const getId = () => {
    const pathname = window?.location?.pathname || "";
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const id = getId();
      if (!id) throw new Error("reservationId 필요");

      const res = await reservationApi.getDetail(id);

      const data =
        res?.reservation ||
        res?.data ||
        res?.item ||
        res ||
        null;

      setReservation(data);
    } catch (e) {
      setError(e.message || "예약 상세 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!id) return;
    if (!window.confirm("예약을 취소하시겠습니까?")) return;

    try {
      setLoading(true);

      if (useTx) {
        await reservationApi.cancelTx(id);
      } else {
        await reservationApi.cancel(id);
      }

      await load();
      alert("예약 취소 완료");
    } catch (e) {
      alert(e.message || "예약 취소 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>예약 상세</h1>

      <label style={styles.checkRow}>
        <input
          type="checkbox"
          checked={useTx}
          onChange={(e) => setUseTx(e.target.checked)}
        />
        트랜잭션 취소 사용
      </label>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={load}
        />
      )}

      {/* 🔥 에러 시 하위 UI 차단 유지 */}
      {!error && loading && (
        <Loading message="예약 상세 불러오는 중..." />
      )}

      {!loading && !error && !reservation && (
        <EmptyState message="예약 정보를 찾을 수 없습니다." />
      )}

      {!loading && !error && reservation && (
        <ReservationDetail
          reservation={reservation}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#d4af37",
    padding: 20,
  },
  title: {
    marginBottom: 20,
    fontSize: 24,
  },
  checkRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 15,
    color: "#fff",
  },
};

export default ReservationDetailPage;