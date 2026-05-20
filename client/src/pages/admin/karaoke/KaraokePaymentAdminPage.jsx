"use strict";

import React, { useEffect } from "react";
import PaymentAdminPage from "../PaymentAdminPage";

/**
 * =====================================================
 * 🔥 KARAOKE PAYMENT ADMIN PAGE
 * ✔ 노래방 전용 결제 관리자 페이지
 * ✔ 기존 관리자 시스템 유지
 * ✔ 기존 PaymentAdminPage 100% 재사용
 * ✔ 기존 디자인 / 색상 / 기능 유지
 * ✔ 기존 API 호출 방식 유지
 * ✔ 기존 state / props 구조 유지
 * ✔ 기존 결제관리 기능 전체 유지
 * ✔ 노래방 전용 query 동기화
 * ✔ /admin/karaoke/payments 전용
 * =====================================================
 */

export default function KaraokePaymentAdminPage() {

  useEffect(() => {

    try {

      if (
        window.location.pathname === "/admin/karaoke/payments" &&
        window.location.search !== "?category=karaoke"
      ) {

        window.history.replaceState(
          {},
          "",
          "/admin/karaoke/payments?category=karaoke"
        );
      }

    } catch (e) {

      console.warn(
        "KARAOKE PAYMENT ADMIN ROUTE SYNC ERROR:",
        e.message
      );
    }

  }, []);

  return (
    <PaymentAdminPage />
  );
}