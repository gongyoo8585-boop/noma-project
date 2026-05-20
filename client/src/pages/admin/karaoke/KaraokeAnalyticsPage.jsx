"use strict";

import React, { useEffect } from "react";
import AdminDashboard from "../../AdminDashboard";

/**
 * =====================================================
 * 🔥 KARAOKE ANALYTICS PAGE
 * ✔ 노래방 전용 분석 관리자 페이지
 * ✔ 기존 관리자 시스템 유지
 * ✔ 기존 AdminDashboard 100% 재사용
 * ✔ 기존 디자인 / 색상 / 기능 유지
 * ✔ 기존 API 호출 방식 유지
 * ✔ 기존 state / props 구조 유지
 * ✔ 기존 분석 기능 전체 유지
 * ✔ 노래방 전용 query 동기화
 * ✔ /admin/karaoke/analytics 전용
 * =====================================================
 */

export default function KaraokeAnalyticsPage() {

  useEffect(() => {

    try {

      if (
        window.location.pathname === "/admin/karaoke/analytics" &&
        window.location.search !== "?category=karaoke"
      ) {

        window.history.replaceState(
          {},
          "",
          "/admin/karaoke/analytics?category=karaoke"
        );
      }

    } catch (e) {

      console.warn(
        "KARAOKE ANALYTICS ROUTE SYNC ERROR:",
        e.message
      );
    }

  }, []);

  return (
    <AdminDashboard />
  );
}