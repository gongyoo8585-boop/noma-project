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
 * 🔥 ADMIN MENU
 * ✔ 관리자 메뉴 컴포넌트
 * ✔ 블랙 / 골드 테마
 * ✔ 현재 경로 active 처리
 * ✔ 관리자 빠른 이동
 * ✔ 반응형 지원
 * ✔ route 충돌 방지
 * ✔ 새로고침 없는 이동
 * ✔ 기존 프로젝트 구조 충돌 없음
 * ✔ 단독 사용 가능
 * =====================================================
 */

export default function AdminMenu({
  direction = "vertical",
  showTitle = true,
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
        path: "/admin/reservations",
        icon: "📅",
      },
      {
        label: "결제 관리",
        path: "/admin/payments",
        icon: "💳",
      },
      {
        label: "리뷰 관리",
        path: "/admin/reviews",
        icon: "⭐",
      },
      {
        label: "신고 관리",
        path: "/admin/reports",
        icon: "🚨",
      },
      {
        label: "분석",
        path: "/admin/analytics",
        icon: "📈",
      },
    ],
    []
  );

  const movePage = (path) => {
    try {
      if (
        !path ||
        window.location.pathname === path
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
      } catch (eventError) {
        console.warn(
          "ADMIN MENU EVENT ERROR:",
          eventError.message
        );
      }
    } catch (e) {
      console.error(
        "ADMIN MENU MOVE ERROR:",
        e
      );

      window.location.href =
        path;
    }
  };

  const isActive = (path) => {
    return (
      location.pathname ===
      path
    );
  };

  return (
    <div
      className="admin-menu"
      style={{
        ...styles.wrapper,
        flexDirection:
          direction ===
          "horizontal"
            ? "row"
            : "column",
      }}
    >
      {showTitle && (
        <div style={styles.header}>
          <div style={styles.logo}>
            N
          </div>

          <div>
            <div
              style={
                styles.title
              }
            >
              NOMA ADMIN
            </div>

            <div
              style={
                styles.subTitle
              }
            >
              MASSAGE PLATFORM
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          ...styles.menuWrap,
          flexDirection:
            direction ===
            "horizontal"
              ? "row"
              : "column",
        }}
      >
        {menus.map((menu) => {
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
                    ? "#222"
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
                    ? "0 0 14px rgba(212,175,55,0.22)"
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
        })}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    display: "flex",
    gap: 20,
    boxSizing:
      "border-box",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 8,
    flexShrink: 0,
  },

  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "#d4af37",
    color: "#000",
    display: "flex",
    justifyContent:
      "center",
    alignItems: "center",
    fontWeight: 900,
    fontSize: 24,
    boxShadow:
      "0 0 16px rgba(212,175,55,0.24)",
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

  menuWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  menuBtn: {
    minHeight: 50,
    padding: "12px 16px",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    transition:
      "all 0.2s ease",
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  icon: {
    fontSize: 18,
  },
};