"use strict";

import React, { useLayoutEffect, useState } from "react";
import ShopAdminPage from "./ShopAdminPage";

/**
 * =====================================================
 * 🔥 KARAOKE ADMIN PAGE
 * ✔ 노래방 관리자 페이지
 * ✔ 마사지 관리자와 노래방 관리자 분리
 * ✔ 노래방 데이터만 관리
 * ✔ 기존 ShopAdminPage 기능 / 디자인 / 색상 유지
 * ✔ 기존 API 호출 방식 유지
 * ✔ 기존 state / props 구조 변경 없음
 * ✔ /admin/karaoke 전용
 * ✔ category=karaoke 강제 고정
 * ✔ ShopAdminPage 렌더 전 category 동기화
 * =====================================================
 */

function syncKaraokeCategory() {
  try {
    if (typeof window === "undefined") {
      return true;
    }

    const currentPath = window.location.pathname || "/admin/karaoke";
    const currentSearch = window.location.search || "";
    const searchParams = new URLSearchParams(currentSearch);

    const currentCategory = String(
      searchParams.get("category") ||
        searchParams.get("shopCategory") ||
        searchParams.get("serviceType") ||
        searchParams.get("businessType") ||
        searchParams.get("adminCategory") ||
        ""
    )
      .toLowerCase()
      .trim();

    if (currentCategory !== "karaoke") {
      searchParams.set("category", "karaoke");
      searchParams.set("shopCategory", "karaoke");
      searchParams.set("serviceType", "karaoke");
      searchParams.set("businessType", "karaoke");
      searchParams.set("adminCategory", "karaoke");

      window.history.replaceState(
        {},
        "",
        `${currentPath}?${searchParams.toString()}`
      );
    }

    try {
      localStorage.setItem("noma_admin_category", "karaoke");
      sessionStorage.setItem("noma_admin_category", "karaoke");
    } catch (storageError) {
      console.warn(
        "KARAOKE ADMIN CATEGORY STORAGE ERROR:",
        storageError.message
      );
    }

    try {
      window.dispatchEvent(
        new CustomEvent("admin-category-updated", {
          detail: {
            category: "karaoke",
            shopCategory: "karaoke",
            serviceType: "karaoke",
            businessType: "karaoke",
            adminCategory: "karaoke",
          },
        })
      );
    } catch (eventError) {
      console.warn(
        "KARAOKE ADMIN CATEGORY EVENT ERROR:",
        eventError.message
      );
    }

    return true;
  } catch (e) {
    console.warn(
      "KARAOKE ADMIN PAGE ROUTE SYNC ERROR:",
      e.message
    );

    return true;
  }
}

export default function KaraokeAdminPage() {
  const [ready, setReady] = useState(() => syncKaraokeCategory());

  useLayoutEffect(() => {
    syncKaraokeCategory();

    if (!ready) {
      setReady(true);
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ShopAdminPage />
  );
}
