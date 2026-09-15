"use strict";

import React from "react";
import {
  useLocation,
} from "react-router-dom";

import ErrorMessage from "../common/ErrorMessage";

export default function AdminLayout({
  title = "관리자",
  children,
}) {
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
          label: "업체 페이지",
          path: "/admin/karaoke/users/shop",
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
        {
          label: "약관 관리",
          path: "/admin/terms",
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
          label: "회원가입 페이지",
          path: "/admin/signup",
        },
        {
          label: "회원 관리",
          path: "/admin/users",
        },
        {
          label: "업체 페이지",
          path: "/admin/users/shop",
        },
        {
          label: "관리자 페이지",
          path: "/admin/users/admin",
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
        {
          label: "약관 관리",
          path: "/admin/terms",
        },
      ];

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
        <ErrorMessage message="관리자 페이지 콘텐츠를 불러올 수 없습니다." />
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

        <div>
          {children}
        </div>
      </main>
    </div>
  );
}
