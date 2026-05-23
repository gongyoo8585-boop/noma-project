"use strict";

import React, { useEffect } from "react";
import UserAdminPage from "../UserAdminPage";

/**
 * =====================================================
 * 🔥 KARAOKE USER ADMIN PAGE
 * ✔ 노래방 전용 회원 관리자 페이지
 * ✔ 기존 관리자 시스템 유지
 * ✔ 기존 UserAdminPage 100% 재사용
 * ✔ 기존 디자인 / 색상 / 기능 유지
 * ✔ 기존 API 호출 방식 유지
 * ✔ 기존 state / props 구조 유지
 * ✔ 기존 회원관리 기능 전체 유지
 * ✔ 노래방 전용 query 동기화
 * ✔ /admin/karaoke/users 전용
 * =====================================================
 */

export default function KaraokeUserAdminPage() {

  useEffect(() => {

    try {

      if (
        window.location.pathname === "/admin/karaoke/users" &&
        window.location.search !== "?category=karaoke"
      ) {

        window.history.replaceState(
          {},
          "",
          "/admin/karaoke/users?category=karaoke"
        );
      }

    } catch (e) {

      console.warn(
        "KARAOKE USER ADMIN ROUTE SYNC ERROR:",
        e.message
      );
    }

  }, []);

  return (
    <UserAdminPage />
  );
}