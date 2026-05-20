"use strict";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
} from "react-router-dom";

/**
 * =====================================================
 * 🔥 COMMON NAVBAR
 * ✔ 공통 상단 네비게이션
 * ✔ 관리자 / 사용자 공용
 * ✔ 블랙 / 골드 테마
 * ✔ 현재 페이지 active 표시
 * ✔ 로그인 상태 표시
 * ✔ 실시간 시간 표시
 * ✔ 반응형 지원
 * ✔ 새로고침 없는 이동
 * ✔ 기존 구조 충돌 없음
 * ✔ 단독 사용 가능
 * =====================================================
 */

function getCurrentTime() {
  try {
    return new Date().toLocaleString(
      "ko-KR",
      {
        hour12: false,
      }
    );
  } catch (e) {
    return "";
  }
}

function getUserName() {
  try {
    return (
      localStorage.getItem(
        "adminName"
      ) ||
      localStorage.getItem(
        "userName"
      ) ||
      localStorage.getItem(
        "nickname"
      ) ||
      "GUEST"
    );
  } catch (e) {
    return "GUEST";
  }
}

function getToken() {
  try {
    return (
      localStorage.getItem(
        "adminToken"
      ) ||
      localStorage.getItem(
        "token"
      ) ||
      localStorage.getItem(
        "accessToken"
      ) ||
      ""
    );
  } catch (e) {
    return "";
  }
}

export default function Navbar({
  title = "NOMA",
  subTitle = "MASSAGE PLATFORM",
  menus = [],
  showAuth = true,
}) {
  const location =
    useLocation();

  const [currentTime, setCurrentTime] =
    useState(
      getCurrentTime()
    );

  const [userName] =
    useState(
      getUserName()
    );

  const [isLoggedIn, setIsLoggedIn] =
    useState(
      !!getToken()
    );

  const defaultMenus =
    useMemo(
      () => [
        {
          label: "홈",
          path: "/",
        },
        {
          label: "지도",
          path: "/map",
        },
        {
          label: "예약",
          path:
            "/reservations",
        },
        {
          label: "리뷰",
          path: "/reviews",
        },
        {
          label: "관리자",
          path: "/admin",
        },
      ],
      []
    );

  const menuList =
    menus.length > 0
      ? menus
      : defaultMenus;

  useEffect(() => {
    const timer =
      setInterval(() => {
        setCurrentTime(
          getCurrentTime()
        );

        setIsLoggedIn(
          !!getToken()
        );
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

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
          "NAVBAR EVENT ERROR:",
          e.message
        );
      }
    } catch (e) {
      console.error(
        "NAVBAR MOVE ERROR:",
        e
      );

      window.location.href =
        path;
    }
  };

  const onLogout = () => {
    try {
      localStorage.removeItem(
        "adminToken"
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "accessToken"
      );

      localStorage.removeItem(
        "authToken"
      );

      localStorage.removeItem(
        "jwt"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "admin"
      );

      setIsLoggedIn(
        false
      );

      alert(
        "로그아웃 되었습니다."
      );

      movePage(
        "/login"
      );
    } catch (e) {
      console.error(
        "NAVBAR LOGOUT ERROR:",
        e
      );
    }
  };

  return (
    <header
      className="common-navbar"
      style={styles.wrapper}
    >
      {/* =========================
      LEFT
      ========================= */}
      <div style={styles.left}>
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
      CENTER
      ========================= */}
      <nav style={styles.center}>
        {menuList.map(
          (menu) => {
            const active =
              location.pathname ===
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
                style={{
                  ...styles.menuBtn,

                  background:
                    active
                      ? "#d4af37"
                      : "transparent",

                  color: active
                    ? "#000"
                    : "#fff",

                  border:
                    active
                      ? "1px solid #d4af37"
                      : "1px solid transparent",
                }}
              >
                {menu.label}
              </button>
            );
          }
        )}
      </nav>

      {/* =========================
      RIGHT
      ========================= */}
      <div style={styles.right}>
        <div style={styles.infoBox}>
          <div
            style={
              styles.infoLabel
            }
          >
            USER
          </div>

          <div
            style={
              styles.infoValue
            }
          >
            {userName}
          </div>
        </div>

        <div style={styles.infoBox}>
          <div
            style={
              styles.infoLabel
            }
          >
            STATUS
          </div>

          <div
            style={{
              ...styles.infoValue,
              color:
                isLoggedIn
                  ? "#4caf50"
                  : "#f44336",
            }}
          >
            {isLoggedIn
              ? "ONLINE"
              : "OFFLINE"}
          </div>
        </div>

        <div style={styles.infoBox}>
          <div
            style={
              styles.infoLabel
            }
          >
            TIME
          </div>

          <div style={styles.time}>
            {currentTime}
          </div>
        </div>

        {showAuth && (
          <>
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={() =>
                  movePage(
                    "/login"
                  )
                }
                style={
                  styles.authBtn
                }
              >
                로그인
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  onLogout
                }
                style={
                  styles.logoutBtn
                }
              >
                로그아웃
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    minHeight: 74,
    background: "#000",
    borderBottom:
      "1px solid #222",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    padding:
      "14px 20px",
    boxSizing:
      "border-box",
    gap: 20,
    flexWrap: "wrap",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },

  left: {
    display: "flex",
    alignItems:
      "center",
    gap: 14,
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

  center: {
    display: "flex",
    alignItems:
      "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent:
      "center",
    flex: 1,
  },

  menuBtn: {
    padding:
      "10px 16px",
    borderRadius: 999,
    cursor: "pointer",
    transition:
      "all 0.2s ease",
    fontSize: 14,
    fontWeight: 700,
    whiteSpace:
      "nowrap",
  },

  right: {
    display: "flex",
    alignItems:
      "center",
    gap: 12,
    flexWrap: "wrap",
  },

  infoBox: {
    minWidth: 90,
    background: "#111",
    border:
      "1px solid #222",
    borderRadius: 10,
    padding:
      "8px 12px",
    boxSizing:
      "border-box",
  },

  infoLabel: {
    fontSize: 11,
    color: "#777",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 13,
    color: "#fff",
    fontWeight: 700,
  },

  time: {
    fontSize: 12,
    color: "#d4af37",
    fontWeight: 700,
    whiteSpace:
      "nowrap",
  },

  authBtn: {
    border:
      "1px solid #d4af37",
    background:
      "#d4af37",
    color: "#000",
    fontWeight: 800,
    borderRadius: 10,
    padding:
      "12px 16px",
    cursor: "pointer",
  },

  logoutBtn: {
    border:
      "1px solid #ff4d4f",
    background:
      "#ff4d4f",
    color: "#fff",
    fontWeight: 800,
    borderRadius: 10,
    padding:
      "12px 16px",
    cursor: "pointer",
  },
};