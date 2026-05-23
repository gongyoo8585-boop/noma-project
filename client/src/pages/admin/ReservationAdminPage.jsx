"use strict";

import React from "react";

import ReservationAdminList from "../../components/admin/reservation/ReservationAdminList";

/* 🔥 추가 */
import AdminLayout from "../../components/admin/AdminLayout";

import EmptyState from "../../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 RESERVATION ADMIN PAGE
 * (ULTRA FINAL - ADMIN LAYOUT PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ AdminLayout 최소 추가
 * ✔ EmptyState 유지
 * ✔ 기존 흐름 유지
 * ✔ null 안전성 최소 보강
 * =====================================================
 */

function ReservationAdminPage() {
  /* 🔥 최소 추가 */
  const hasReservationAdminList =
    typeof ReservationAdminList === "function" ||
    typeof ReservationAdminList === "object";

  return (
    <AdminLayout title="예약 관리">
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>예약 관리</h1>

          <p style={styles.desc}>
            전체 예약 목록, 상태 변경, 취소 처리를 관리합니다.
          </p>
        </div>

        {/* 🔥 컴포넌트 방어 */}
        {!hasReservationAdminList && (
          <EmptyState message="예약 목록을 불러올 수 없습니다." />
        )}

        {hasReservationAdminList && (
          <ReservationAdminList />
        )}
      </div>
    </AdminLayout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    padding: 20,
    boxSizing: "border-box",
  },

  header: {
    marginBottom: 20,
  },

  title: {
    margin: 0,
    color: "#d4af37",
    fontSize: 28,
  },

  desc: {
    marginTop: 8,
    color: "#aaa",
    fontSize: 14,
    lineHeight: 1.5,
  },
};

export default ReservationAdminPage;