"use strict";

import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * =====================================================
 * 🔥 ADMIN SIDEBAR
 * ✔ 관리자 사이드바
 * ✔ 통합 관리자 메뉴 유지
 * ✔ 현재 경로 active 처리
 * ✔ 업체 관리 / 신고 관리 직접 경로 이동 보강
 * ✔ 대시보드 active 오작동 방지
 * ✔ 기존 구조 영향 없음
 * ✔ 반응형 대응
 * ✔ 새로고침 이동 제거
 * ✔ 등록 업체 사라짐 방지
 * ✔ analytics 강제 이동 보강
 * ✔ 노래방 / 마사지 메뉴 추가
 * ✔ 기존 menus.map() 구조 유지
 * ✔ 마사지 관리자 / 노래방 관리자 독립 라우팅 분리
 * =====================================================
 */

export default function AdminSidebar() {
  const location = useLocation();

  const isKaraokeAdmin =
    location.pathname.startsWith("/admin/karaoke");

  const menus = isKaraokeAdmin
    ? [
        {
          label: "통합 관리자",
          path: "/admin/karaoke",
        },
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
          path: "/admin",
        },
        {
          label: "대시보드",
          path: "/admin/dashboard",
        },
        {
          label: "업체 관리",
          path: "/admin/shops?category=massage",
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

  /**
   * =====================================================
   * 🔥 ACTIVE PATH
   * =====================================================
   */
  const isActivePath = (path) => {
    return (
      `${location.pathname}${location.search}` === path ||
      location.pathname === path ||
      (
        path === "/admin/karaoke" &&
        location.pathname.startsWith("/admin/karaoke")
      ) ||
      (
        path === "/admin/shops?category=massage" &&
        location.pathname === "/admin/shops" &&
        location.search === "?category=massage"
      )
    );
  };

  /**
   * =====================================================
   * 🔥 MENU CLICK
   * =====================================================
   */
  const handleMenuClick = (e, path) => {
    if (!path) {
      return;
    }

    e.preventDefault();

    if (
      `${location.pathname}${location.search}` === path ||
      location.pathname === path
    ) {
      return;
    }

    try {
      window.history.pushState({}, "", path);

      window.dispatchEvent(
        new PopStateEvent("popstate")
      );

      try {
        window.dispatchEvent(
          new Event("auth-updated")
        );
      } catch (eventError) {
        console.warn(
          "ADMIN SIDEBAR AUTH EVENT ERROR:",
          eventError.message
        );
      }
    } catch (error) {
      console.error(
        "ADMIN SIDEBAR NAVIGATION ERROR:",
        error
      );

      window.location.assign(path);
    }
  };

  return (
    <aside
      className="admin-sidebar"
      style={{
        width: 240,
        minHeight: "100vh",
        background: "#000",
        borderRight: "1px solid #222",
        padding: 20,
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* =========================================
      🔥 LOGO
      ========================================= */}
      <div
        style={{
          marginBottom: 30,
        }}
      >
        <Link
          to={isKaraokeAdmin ? "/admin/karaoke" : "/admin"}
          onClick={(e) =>
            handleMenuClick(
              e,
              isKaraokeAdmin ? "/admin/karaoke" : "/admin"
            )
          }
          style={{
            textDecoration: "none",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#d4af37",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            NOMA ADMIN
          </h2>
        </Link>
      </div>

      {/* =========================================
      🔥 MENU
      ========================================= */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {menus.map((menu) => {
          const active = isActivePath(menu.path);

          return (
            <Link
              key={menu.path}
              to={menu.path}
              onClick={(e) =>
                handleMenuClick(e, menu.path)
              }
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                textDecoration: "none",
                background: active
                  ? "#d4af37"
                  : "#181818",
                color: active ? "#000" : "#fff",
                fontWeight: active ? "700" : "400",
                border: active
                  ? "1px solid #d4af37"
                  : "1px solid #222",
                transition: "all 0.2s ease",
                wordBreak: "keep-all",
                display: "flex",
                alignItems: "center",
                minHeight: 48,
                boxSizing: "border-box",
              }}
            >
              {menu.label}
            </Link>
          );
        })}
      </nav>

      {/* =========================================
      🔥 FOOTER
      ========================================= */}
      <div
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid #222",
          fontSize: 12,
          color: "#777",
        }}
      >
        <div>
          {isKaraokeAdmin
            ? "NOMA KARAOKE"
            : "NOMA MASSAGE"}
        </div>

        <div
          style={{
            marginTop: 6,
          }}
        >
          ADMIN SYSTEM
        </div>
      </div>
    </aside>
  );
}