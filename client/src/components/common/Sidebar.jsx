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
 * 🔥 COMMON SIDEBAR
 * ✔ 공통 사이드바
 * ✔ 관리자 / 사용자 공용 지원
 * ✔ 블랙 / 골드 테마
 * ✔ 반응형 지원
 * ✔ 현재 경로 active 처리
 * ✔ 새로고침 없는 이동
 * ✔ 단독 사용 가능
 * ✔ 기존 프로젝트 구조 충돌 없음
 * ✔ 메뉴 커스텀 지원
 * =====================================================
 */

export default function Sidebar({
  title = "NOMA",
  subTitle = "MASSAGE PLATFORM",
  menus = [],
  width = 240,
  showFooter = true,
}) {
  const location =
    useLocation();

  const [hovered, setHovered] =
    useState("");

  const defaultMenus =
    useMemo(
      () => [
        {
          label: "홈",
          path: "/",
          icon: "🏠",
        },
        {
          label: "지도",
          path: "/map",
          icon: "🗺️",
        },
        {
          label: "예약",
          path:
            "/reservations",
          icon: "📅",
        },
        {
          label: "결제",
          path: "/payments",
          icon: "💳",
        },
        {
          label: "리뷰",
          path: "/reviews",
          icon: "⭐",
        },
        {
          label: "마이페이지",
          path: "/mypage",
          icon: "👤",
        },
      ],
      []
    );

  const menuList =
    menus.length > 0
      ? menus
      : defaultMenus;

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
          "SIDEBAR EVENT ERROR:",
          e.message
        );
      }
    } catch (e) {
      console.error(
        "SIDEBAR MOVE ERROR:",
        e
      );

      window.location.href =
        path;
    }
  };

  return (
    <aside
      className="common-sidebar"
      style={{
        ...styles.wrapper,
        width,
        minWidth: width,
      }}
    >
      {/* =========================
      HEADER
      ========================= */}
      <div style={styles.header}>
        <button
          type="button"
          onClick={() =>
            movePage("/")
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
      MENU
      ========================= */}
      <nav style={styles.nav}>
        {menuList.map(
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
                  {menu.icon ||
                    "•"}
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
      {showFooter && (
        <div
          style={
            styles.footer
          }
        >
          <div>
            NOMA MASSAGE
          </div>

          <div
            style={{
              marginTop: 6,
            }}
          >
            PREMIUM PLATFORM
          </div>
        </div>
      )}
    </aside>
  );
}

const styles = {
  wrapper: {
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
    fontSize: 22,
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