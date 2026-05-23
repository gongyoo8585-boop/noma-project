"use strict";

import React, { useEffect } from "react";
import ReservationAdminPage from "../ReservationAdminPage";

/**
 * =====================================================
 * 🔥 KARAOKE RESERVATION ADMIN PAGE
 * ✔ 노래방 전용 예약 관리자 페이지
 * ✔ 기존 관리자 시스템 유지
 * ✔ 기존 ReservationAdminPage 100% 재사용
 * ✔ 기존 디자인 / 색상 / 기능 유지
 * ✔ 기존 API 호출 방식 유지
 * ✔ 기존 state / props 구조 유지
 * ✔ 기존 예약관리 기능 전체 유지
 * ✔ 노래방 전용 query 동기화
 * ✔ /admin/karaoke/reservations 전용
 * =====================================================
 */

export default function KaraokeReservationAdminPage() {

  useEffect(() => {

    try {

      if (
        window.location.pathname === "/admin/karaoke/reservations" &&
        window.location.search !== "?category=karaoke"
      ) {

        window.history.replaceState(
          {},
          "",
          "/admin/karaoke/reservations?category=karaoke"
        );
      }

    } catch (e) {

      console.warn(
        "KARAOKE RESERVATION ADMIN ROUTE SYNC ERROR:",
        e.message
      );
    }

  }, []);

  return (
    <ReservationAdminPage />
  );
}