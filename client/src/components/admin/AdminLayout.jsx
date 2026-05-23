"use strict";

import React from "react";
import {
  useLocation,
} from "react-router-dom";

/* 🔥 최소 추가 */
import ErrorMessage from "../common/ErrorMessage";

/**
 * =====================================================
 * 🔥 ADMIN LAYOUT (SAFE FINAL PATCH)
 * ✔ 관리자 공통 레이아웃
 * ✔ 관리자 기능 통합 메뉴
 * ✔ 현재 경로 active 처리
 * ✔ children 안전 처리
 * ✔ Router context crash 제거
 * ✔ 기존 구조 영향 없음
 * ✔ 기존 기능 유지
 * ✔ 🔥 무한 로딩 루프 제거
 * ✔ 🔥 관리자 루트 redirect loop 제거
 * ✔ 🔥 sidebar Link 라우팅 충돌 제거
 * ✔ 🔥 /admin/report 오타를 /admin/reports로 수정
 * ✔ 🔥 노래방 / 마사지 메뉴 추가
 * ✔ 🔥 기존 관리자 시스템 유지
 * ✔ 🔥 노래방 관리자 시스템 별도 라우트 지원
 * =====================================================
 */

export default function AdminLayout({
  title = "관리자",
  children,
}) {

  /* =====================================================
  🔥 핵심 수정
  useLocation 안전 처리
  ===================================================== */
  let location = {
    pathname: "/admin",
    search: "",
  };

  try {

    const currentLocation =
      useLocation();

    if (
      currentLocation &&
      currentLocation.pathname
    ) {
      location =
        currentLocation;
    }

  } catch (e) {

    console.warn(
      "ADMIN LAYOUT LOCATION ERROR:",
      e.message
    );
  }

  const isKaraokeAdmin =
    location.pathname.startsWith(
      "/admin/karaoke"
    );

  const moveAdminPath = (path) => {
    try {
      if (
        !path ||
        `${window.location.pathname}${window.location.search}` === path
      ) {
        return;
      }

      window.history.pushState(
        {},
        "",
        path
      );

      window.dispatchEvent(
        new PopStateEvent("popstate")
      );

      try {
        window.dispatchEvent(
          new Event("auth-updated")
        );
      } catch (e) {
        console.warn(
          "ADMIN AUTH EVENT ERROR:",
          e.message
        );
      }
    } catch (e) {
      console.error(
        "ADMIN NAVIGATION ERROR:",
        e
      );

      window.location.href =
        path;
    }
  };

  /* =====================================================
  🔥 최소 추가: 통합 관리자 메뉴
  ===================================================== */
  const menus = isKaraokeAdmin
    ? [
        {
          label: "대시보드",
          path: "/admin/karaoke/dashboard",
        },
        {
          label: "업체 관리",
          path: "/admin/karaoke/shops",
        },
        {
          label: "노래방",
          path: "/admin/karaoke",
        },
        {
          label: "마사지",
          path: "/admin/shops?category=massage",
        },
        {
          label: "회원 관리",
          path: "/admin/karaoke/users",
        },
        {
          label: "예약 관리",
          path: "/admin/karaoke/reservations",
        },
        {
          label: "결제 관리",
          path: "/admin/karaoke/payments",
        },
        {
          label: "리뷰 관리",
          path: "/admin/karaoke/reviews",
        },
        {
          label: "신고 관리",
          path: "/admin/karaoke/reports",
        },
        {
          label: "분석",
          path: "/admin/karaoke/analytics",
        },
      ]
    : [
        {
          label: "통합 관리자",
          path: "/admin/dashboard",
        },
        {
          label: "대시보드",
          path: "/admin/dashboard",
        },
        {
          label: "업체 관리",
          path: "/admin/shops",
        },
        {
          label: "노래방",
          path: "/admin/karaoke",
        },
        {
          label: "마사지",
          path: "/admin/shops?category=massage",
        },
        {
          label: "회원 관리",
          path: "/admin/users",
        },
        {
          label: "예약 관리",
          path: "/admin/reservations",
        },
        {
          label: "결제 관리",
          path: "/admin/payments",
        },
        {
          label: "리뷰 관리",
          path: "/admin/reviews",
        },
        {
          label: "신고 관리",
          path: "/admin/reports",
        },
        {
          label: "분석",
          path: "/admin/analytics",
        },
      ];

  /* =====================================================
  🔥 핵심 수정
  children 무한 loading 방지
  ===================================================== */
  if (
    children === undefined ||
    children === null
  ) {

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111",
          color: "#fff",
          padding: 24,
        }}
      >
        <ErrorMessage message="관리자 페이지 내용을 불러올 수 없습니다." />
      </div>
    );
  }

  return (
    <div
      className="admin-layout"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#111",
        color: "#fff",
      }}
    >
      {/* =========================
      SIDEBAR
      ========================= */}
      <aside
        style={{
          width: 240,
          background: "#000",
          borderRight:
            "1px solid #222",
          padding: 20,
          boxSizing:
            "border-box",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            marginBottom: 30,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#d4af37",
            }}
          >
            ADMIN
          </h2>
        </div>

        <nav
          style={{
            display: "flex",
            flexDirection:
              "column",
            gap: 10,
          }}
        >
          {menus.map((menu) => {

            const active =
              `${location.pathname}${location.search || ""}` ===
              menu.path ||
              (
                menu.path === "/admin/karaoke" &&
                location.pathname === "/admin/karaoke"
              );

            return (
              <button
                key={`${menu.label}-${menu.path}`}
                type="button"
                onClick={() =>
                  moveAdminPath(
                    menu.path
                  )
                }
                style={{
                  padding:
                    "12px 14px",
                  borderRadius: 8,
                  textDecoration:
                    "none",
                  background:
                    active
                      ? "#d4af37"
                      : "#181818",
                  color: active
                    ? "#000"
                    : "#fff",
                  fontWeight:
                    active
                      ? "700"
                      : "400",
                  transition:
                    "all 0.2s ease",
                  wordBreak:
                    "break-word",
                  border:
                    "1px solid #222",
                  textAlign:
                    "left",
                  cursor:
                    "pointer",
                  fontSize: 14,
                }}
              >
                {menu.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* =========================
      CONTENT
      ========================= */}
      <main
        style={{
          flex: 1,
          padding: 24,
          boxSizing:
            "border-box",
          overflowX: "auto",
          overflowY: "auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              color: "#d4af37",
            }}
          >
            {title}
          </h1>

          <div
            style={{
              fontSize: 13,
              color: "#999",
            }}
          >
            NOMA ADMIN
          </div>
        </div>

        {/* BODY */}
        <div>
          {children}
        </div>
      </main>
    </div>
  );
}