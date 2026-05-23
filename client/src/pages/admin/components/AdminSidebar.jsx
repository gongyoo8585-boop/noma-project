"use strict";

import React, {
  useMemo,
  useState,
} from "react";

import {
  useLocation,
} from "react-router-dom";

/**
 * =====================================================
 * 🔥 PAGE ADMIN SIDEBAR
 * ✔ 관리자 전용 사이드바
 * ✔ 블랙 / 골드 테마
 * ✔ 현재 메뉴 active 처리
 * ✔ 새로고침 없는 이동
 * ✔ 반응형 대응
 * ✔ 기존 프로젝트 구조 충돌 없음
 * ✔ 단독 사용 가능
 * ✔ 관리자 페이지 공통 메뉴
 * =====================================================
 */

export default function AdminSidebar({
  title = "NOMA ADMIN",
  subTitle = "MASSAGE PLATFORM",
}) {
  const location =
    useLocation();

  const [hovered, setHovered] =
    useState("");

  const menus = useMemo(
    () => [
      {
        label: "통합 관리자",
        path: "/admin",
        icon: "🛡️",
      },
      {
        label: "대시보드",
        path: "/admin/dashboard",
        icon: "📊",
      },
      {
        label: "업체 관리",
        path: "/admin/shops",
        icon: "🏪",
      },
      {
        label: "회원 관리",
        path: "/admin/users",
        icon: "👤",
      },
      {
        label: "예약 관리",
        path:
          "/admin/reservations",
        icon: "📅",
      },
      {
        label: "결제 관리",
        path:
          "/admin/payments",
        icon: "💳",
      },
      {
        label: "리뷰 관리",
        path:
          "/admin/reviews",
        icon: "⭐",
      },
      {
        label: "신고 관리",
        path:
          "/admin/reports",
        icon: "🚨",
      },
      {
        label: "분석",
        path:
          "/admin/analytics",
        icon: "📈",
      },
    ],
    []
  );

  const isActive = (
    path
  ) => {
    return (
      location.pathname ===
      path
    );
  };

  const movePage = (
    path
  ) => {
    try {
      if (
        !path ||
        window.location
          .pathname ===
          path
      ) {
        return;
      }

      window.history.pushState(
        {},
        "",
        path
      );

      window.dispatchEvent(
        new PopStateEvent(
          "popstate"
        )
      );

      try {
        window.dispatchEvent(
          new Event(
            "auth-updated"
          )
        );
      } catch (e) {
        console.warn(
          "PAGE ADMIN SIDEBAR EVENT ERROR:",
          e.message
        );
      }
    } catch (e) {
      console.error(
        "PAGE ADMIN SIDEBAR MOVE ERROR:",
        e
      );

      window.location.href =
        path;
    }
  };

  return (
    <aside
      className="page-admin-sidebar"
      style={styles.wrapper}
    >
      {/* =========================
      HEADER
      ========================= */}
      <div style={styles.header}>
        <button
          type="button"
          onClick={() =>
            movePage(
              "/admin/dashboard"
            )
          }
          style={styles.logoBtn}
        >
          N
        </button>

        <div>
          <div style={styles.title}>
            {title}
          </div>

          <div
            style={
              styles.subTitle
            }
          >
            {subTitle}
          </div>
        </div>
      </div>

      {/* =========================
      MENUS
      ========================= */}
      <nav style={styles.nav}>
        {menus.map(
          (menu) => {
            const active =
              isActive(
                menu.path
              );

            const hover =
              hovered ===
              menu.path;

            return (
              <button
                key={
                  menu.path
                }
                type="button"
                onClick={() =>
                  movePage(
                    menu.path
                  )
                }
                onMouseEnter={() =>
                  setHovered(
                    menu.path
                  )
                }
                onMouseLeave={() =>
                  setHovered("")
                }
                style={{
                  ...styles.menuBtn,

                  background:
                    active
                      ? "#d4af37"
                      : hover
                      ? "#1d1d1d"
                      : "#111",

                  color: active
                    ? "#000"
                    : "#fff",

                  border:
                    active
                      ? "1px solid #d4af37"
                      : "1px solid #222",

                  boxShadow:
                    active
                      ? "0 0 16px rgba(212,175,55,0.24)"
                      : "none",
                }}
              >
                <span
                  style={
                    styles.icon
                  }
                >
                  {menu.icon}
                </span>

                <span>
                  {menu.label}
                </span>
              </button>
            );
          }
        )}
      </nav>

      {/* =========================
      FOOTER
      ========================= */}
      <div style={styles.footer}>
        <div>
          NOMA MASSAGE
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

const styles = {
  wrapper: {
    width: 240,
    minWidth: 240,
    minHeight: "100vh",
    background: "#000",
    borderRight:
      "1px solid #222",
    padding: 20,
    boxSizing:
      "border-box",
    overflowY: "auto",
    display: "flex",
    flexDirection:
      "column",
    color: "#fff",
  },

  header: {
    display: "flex",
    alignItems:
      "center",
    gap: 14,
    marginBottom: 30,
  },

  logoBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    border: "none",
    background:
      "#d4af37",
    color: "#000",
    fontWeight: 900,
    fontSize: 26,
    cursor: "pointer",
    boxShadow:
      "0 0 16px rgba(212,175,55,0.24)",
    flexShrink: 0,
  },

  title: {
    color: "#d4af37",
    fontWeight: 900,
    fontSize: 20,
    lineHeight: 1.2,
  },

  subTitle: {
    marginTop: 4,
    color: "#777",
    fontSize: 11,
    letterSpacing: 1,
  },

  nav: {
    display: "flex",
    flexDirection:
      "column",
    gap: 10,
    flex: 1,
  },

  menuBtn: {
    minHeight: 50,
    padding:
      "12px 14px",
    borderRadius: 12,
    display: "flex",
    alignItems:
      "center",
    gap: 10,
    cursor: "pointer",
    transition:
      "all 0.2s ease",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "left",
    wordBreak:
      "keep-all",
  },

  icon: {
    fontSize: 18,
    minWidth: 22,
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center",
  },

  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop:
      "1px solid #222",
    fontSize: 12,
    color: "#777",
  },
};