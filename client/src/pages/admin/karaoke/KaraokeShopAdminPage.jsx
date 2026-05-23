"use strict";

import React, { useEffect } from "react";
import ShopAdminPage from "../ShopAdminPage";

/**
 * =====================================================
 * 🔥 KARAOKE SHOP ADMIN PAGE
 * ✔ 노래방 전용 업체 관리자 페이지
 * ✔ 기존 관리자 시스템 유지
 * ✔ 기존 ShopAdminPage 100% 재사용
 * ✔ 기존 디자인 / 색상 / 기능 유지
 * ✔ 기존 API 호출 방식 유지
 * ✔ 기존 state / props 구조 유지
 * ✔ 기존 업체관리 기능 전체 유지
 * ✔ 노래방 전용 query 동기화
 * ✔ 노래방 전용 storage category 동기화
 * ✔ /admin/karaoke/shops 전용
 * =====================================================
 */

export default function KaraokeShopAdminPage() {
  useEffect(() => {
    try {
      if (window.location.pathname === "/admin/karaoke/shops") {
        const params = new URLSearchParams(window.location.search || "");

        params.set("category", "karaoke");
        params.set("shopCategory", "karaoke");
        params.set("serviceType", "karaoke");
        params.set("businessType", "karaoke");
        params.set("adminCategory", "karaoke");

        window.history.replaceState(
          {},
          "",
          `/admin/karaoke/shops?${params.toString()}`
        );

        localStorage.setItem("noma_admin_category", "karaoke");
        sessionStorage.setItem("noma_admin_category", "karaoke");
      }
    } catch (e) {
      console.warn(
        "KARAOKE SHOP ADMIN ROUTE SYNC ERROR:",
        e.message
      );
    }
  }, []);

  return <ShopAdminPage />;
}