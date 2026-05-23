"use strict";

import React, { useEffect } from "react";
import ReportAdminPage from "../ReportAdminPage";

/**
 * =====================================================
 * 🔥 KARAOKE REPORT ADMIN PAGE
 * ✔ 노래방 전용 신고 관리자 페이지
 * ✔ 기존 관리자 시스템 유지
 * ✔ 기존 ReportAdminPage 100% 재사용
 * ✔ 기존 디자인 / 색상 / 기능 유지
 * ✔ 기존 API 호출 방식 유지
 * ✔ 기존 state / props 구조 유지
 * ✔ 기존 신고관리 기능 전체 유지
 * ✔ 노래방 전용 query 동기화
 * ✔ /admin/karaoke/reports 전용
 * =====================================================
 */

export default function KaraokeReportAdminPage() {

  useEffect(() => {

    try {

      if (
        window.location.pathname === "/admin/karaoke/reports" &&
        window.location.search !== "?category=karaoke"
      ) {

        window.history.replaceState(
          {},
          "",
          "/admin/karaoke/reports?category=karaoke"
        );
      }

    } catch (e) {

      console.warn(
        "KARAOKE REPORT ADMIN ROUTE SYNC ERROR:",
        e.message
      );
    }

  }, []);

  return (
    <ReportAdminPage />
  );
}