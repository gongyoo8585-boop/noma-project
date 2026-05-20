"use strict";

import React from "react";
import ReservationForm from "../components/reservation/ReservationForm";

/**
 * =====================================================
 * 🔥 RESERVATION CREATE PAGE (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ Error / EmptyState 최소 추가 (구조 유지)
 * ✔ 기존 흐름 유지
 * ✔ 컴포넌트 체크 로직 안정화 (최소 수정)
 * =====================================================
 */

/* 🔥 추가 */
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

function ReservationCreatePage() {
  const handleCreated = (res) => {
    const id =
      res?.reservation?._id ||
      res?.data?._id ||
      res?._id ||
      res?.reservation?.id ||
      res?.data?.id ||
      res?.id ||
      null;

    if (id) {
      window.location.href = `/reservations/${id}`;
    } else {
      window.location.href = "/reservations";
    }
  };

  /* 🔥 최소 수정: 안전한 컴포넌트 체크 */
  const isValidComponent = typeof ReservationForm === "function";

  /* 🔥 최소 추가: 런타임 에러 방어 */
  try {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>예약 생성</h1>

        {/* 🔥 폼 자체가 없는 경우 대비 */}
        {!isValidComponent && (
          <EmptyState message="예약 폼을 불러올 수 없습니다." />
        )}

        {/* 🔥 정상 렌더 */}
        {isValidComponent && (
          <ReservationForm onCreated={handleCreated} />
        )}
      </div>
    );
  } catch (e) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>예약 생성</h1>
        <ErrorMessage message="예약 페이지 오류 발생" />
      </div>
    );
  }
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
};

export default ReservationCreatePage;