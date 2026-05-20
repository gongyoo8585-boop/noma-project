"use strict";

import React from "react";
import ReservationList from "../components/reservation/ReservationList";

/**
 * =====================================================
 * 🔥 RESERVATION LIST PAGE (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ Error / EmptyState 최소 추가 (구조 유지)
 * ✔ 기존 흐름 유지
 * ✔ 컴포넌트 체크 로직 안정화 (최소 수정)
 * =====================================================
 */

/* 🔥 추가 */
import EmptyState from "../components/common/EmptyState";

function ReservationListPage() {
  const pathname = window?.location?.pathname || "";

  const isAdmin =
    pathname.includes("/admin") ||
    false;

  /* 🔥 최소 수정: 안전한 컴포넌트 체크 */
  const isValidComponent = typeof ReservationList === "function";

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>
        {isAdmin ? "전체 예약 목록" : "내 예약 목록"}
      </h1>

      {/* 🔥 컴포넌트 없을 경우 방어 */}
      {!isValidComponent && (
        <EmptyState message="예약 목록을 불러올 수 없습니다." />
      )}

      {isValidComponent && (
        <ReservationList admin={isAdmin} />
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
};

export default ReservationListPage;