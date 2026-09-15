"use strict";

import React, {
  useEffect,
} from "react";

import AdminDashboard from "../../AdminDashboard";

/**
 * =====================================================
 * 🔥 KARAOKE DASHBOARD PAGE
 * ✔ 노래방 전용 관리자 대시보드
 * ✔ 기존 관리자 대시보드 100% 재사용
 * ✔ 기존 디자인 / 색상 / 기능 유지
 * ✔ 기존 AdminDashboard 구조 변경 없음
 * ✔ 기존 API 호출 방식 변경 없음
 * ✔ 기존 state / props 변경 없음
 * ✔ /admin/karaoke/dashboard 전용 페이지
 * ✔ category=karaoke 렌더 전 동기화
 * =====================================================
 */

function syncKaraokeDashboardRoute() {
  try {
    if (
      typeof window === "undefined" ||
      !window.location
    ) {
      return;
    }

    if (
      window.location.pathname ===
        "/admin/karaoke/dashboard" &&
      window.location.search !==
        "?category=karaoke"
    ) {
      window.history.replaceState(
        {},
        "",
        "/admin/karaoke/dashboard?category=karaoke"
      );
    }
  } catch (e) {
    console.warn(
      "KARAOKE DASHBOARD ROUTE SYNC ERROR:",
      e.message
    );
  }
}

export default function KaraokeDashboardPage() {
  syncKaraokeDashboardRoute();

  useEffect(() => {
    syncKaraokeDashboardRoute();
  }, []);

  return (
    <AdminDashboard
      category="karaoke"
      dashboardCategory="karaoke"
    />
  );
}