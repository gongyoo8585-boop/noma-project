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
 * 🔥 COMMON HEADER
 * ✔ 공통 헤더
 * ✔ 관리자 / 사용자 공용
 * ✔ 블랙 / 골드 테마
 * ✔ 현재 페이지 표시
 * ✔ 로그인 상태 표시
 * ✔ 실시간 시간 표시
 * ✔ 반응형 지원
 * ✔ 새로고침 없는 이동
 * ✔ 상단 메뉴
 * ✔ 로그인 / 회원가입 버튼
 * ✔ gold neon UI
 * ✔ 기존 프로젝트 구조 충돌 없음
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

export default function Header({
  title = "노라",
  subTitle = "NORA MASSAGE PLATFORM",
  showBackButton = false,
  backPath = "/",
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

  const currentPage =
    useMemo(() => {
      const pathname =
        location?.pathname ||
        "";

      if (
        pathname === "/"
      ) {
        return "홈";
      }

      if (
        pathname.includes(
          "/map"
        )
      ) {
        return "지도";
      }

      if (
        pathname.includes(
          "/shop"
        )
      ) {
        return "업체";
      }

      if (
        pathname.includes(
          "/reservation"
        )
      ) {
        return "예약";
      }

      if (
        pathname.includes(
          "/payment"
        )
      ) {
        return "결제";
      }

      if (
        pathname.includes(
          "/review"
        )
      ) {
        return "리뷰";
      }

      if (
        pathname.includes(
          "/mypage"
        )
      ) {
        return "마이페이지";
      }

      if (
        pathname.includes(
          "/admin"
        )
      ) {
        return "관리자";
      }

      if (
        pathname.includes(
          "/signup"
        )
      ) {
        return "회원가입";
      }

      if (
        pathname.includes(
          "/login"
        )
      ) {
        return "로그인";
      }

      return "노라";
    }, [location]);

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
          "HEADER EVENT ERROR:",
          e.message
        );
      }
    } catch (e) {
      console.error(
        "HEADER MOVE ERROR:",
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
        "HEADER LOGOUT ERROR:",
        e
      );
    }
  };

  return (
    <header
      className="common-header"
      style={styles.wrapper}
    >
      <div style={styles.left}>
        {showBackButton && (
          <button
            type="button"
            onClick={() =>
              movePage(
                backPath
              )
            }
            style={
              styles.backBtn
            }
          >
            ←
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            movePage("/")
          }
          style={styles.logoBtn}
        >
          노라
        </button>
      </div>

      <nav style={styles.center}>
        <button
          type="button"
          onClick={() =>
            movePage("/map")
          }
          style={styles.menuBtn}
        >
          지도
        </button>

        <button
          type="button"
          onClick={() =>
            movePage("/reviews")
          }
          style={styles.menuBtn}
        >
          리뷰
        </button>

        <button
          type="button"
          onClick={() =>
            movePage("/reservations")
          }
          style={styles.menuBtn}
        >
          예약
        </button>

        <button
          type="button"
          onClick={() =>
            movePage("/admin")
          }
          style={styles.menuBtn}
        >
          관리자
        </button>

        <button
          type="button"
          onClick={() =>
            movePage("/inquiry")
          }
          style={styles.menuBtn}
        >
          제휴 문의
        </button>
      </nav>

      <div style={styles.right}>
        <div style={styles.pageBadge}>
          {currentPage}
        </div>

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
                  : "#ff4d4f",
            }}
          >
            {isLoggedIn
              ? "ONLINE"
              : "OFFLINE"}
          </div>
        </div>

        <div style={styles.timeBox}>
          {currentTime}
        </div>

        {!isLoggedIn ? (
          <>
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

            <button
              type="button"
              onClick={() =>
                movePage(
                  "/signup"
                )
              }
              style={
                styles.signupBtn
              }
            >
              회원가입
            </button>
          </>
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
      </div>
    </header>
  );
}

const GOLD = "#ffd400";
const GOLD_DARK = "#a77c00";

const styles = {
  wrapper: {
    width: "100%",
    minHeight: 76,
    background:
      "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(5,5,5,0.98) 100%)",
    borderBottom:
      "1px solid rgba(255,212,0,0.42)",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    padding:
      "12px 20px",
    boxSizing:
      "border-box",
    gap: 18,
    flexWrap: "wrap",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow:
      "0 0 0 1px rgba(255,212,0,0.06), 0 0 16px rgba(255,212,0,0.18), 0 10px 28px rgba(0,0,0,0.88)",
  },

  left: {
    display: "flex",
    alignItems:
      "center",
    gap: 14,
    flexShrink: 0,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    border:
      "1px solid rgba(255,212,0,0.58)",
    background:
      "rgba(0,0,0,0.92)",
    color: GOLD,
    fontSize: 20,
    cursor: "pointer",
    boxShadow:
      "0 0 10px rgba(255,212,0,0.22)",
  },

  logoBtn: {
    minWidth: 96,
    height: 52,
    borderRadius: 6,
    border:
      "1px solid rgba(255,212,0,0.82)",
    background:
      "linear-gradient(180deg, rgba(8,8,8,0.98), rgba(0,0,0,1))",
    color: "#fff",
    fontWeight: 400,
    fontSize: 36,
    lineHeight: "46px",
    cursor: "pointer",
    boxShadow:
      "0 0 8px rgba(255,212,0,0.40), inset 0 0 10px rgba(255,212,0,0.06)",
    flexShrink: 0,
    letterSpacing: "-2px",
    textShadow:
      "0 0 3px #fff, 0 0 8px #ff006f, 0 0 18px #ff006f, 0 0 30px rgba(255,0,110,0.78)",
  },

  center: {
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    gap: 10,
    flex: 1,
    minWidth: 320,
    flexWrap: "wrap",
  },

  menuBtn: {
    height: 46,
    minWidth: 104,
    padding:
      "0 18px",
    borderRadius: 6,
    border:
      `1px solid ${GOLD_DARK}`,
    background:
      "linear-gradient(180deg, rgba(8,8,8,0.98), rgba(0,0,0,1))",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow:
      "0 0 8px rgba(255,212,0,0.30), inset 0 0 10px rgba(255,212,0,0.05)",
    textShadow:
      "0 0 7px rgba(255,255,255,0.18)",
  },

  right: {
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "flex-end",
    gap: 10,
    flexWrap: "wrap",
    flexShrink: 0,
  },

  pageBadge: {
    height: 40,
    padding:
      "0 16px",
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    borderRadius: 999,
    border:
      "1px solid rgba(255,212,0,0.72)",
    background:
      "rgba(255,212,0,0.08)",
    color: GOLD,
    fontWeight: 900,
    fontSize: 14,
    whiteSpace:
      "nowrap",
    boxShadow:
      "0 0 10px rgba(255,212,0,0.18)",
  },

  infoBox: {
    minWidth: 82,
    background:
      "rgba(9,9,9,0.98)",
    border:
      "1px solid rgba(255,212,0,0.22)",
    borderRadius: 8,
    padding:
      "7px 10px",
    boxSizing:
      "border-box",
    boxShadow:
      "inset 0 0 8px rgba(255,212,0,0.03)",
  },

  infoLabel: {
    fontSize: 10,
    color:
      "rgba(255,255,255,0.46)",
    marginBottom: 3,
    fontWeight: 700,
  },

  infoValue: {
    fontSize: 12,
    color: "#fff",
    fontWeight: 900,
    whiteSpace:
      "nowrap",
  },

  timeBox: {
    height: 40,
    display: "flex",
    alignItems:
      "center",
    padding:
      "0 12px",
    border:
      "1px solid rgba(255,212,0,0.22)",
    borderRadius: 8,
    color: GOLD,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace:
      "nowrap",
    background:
      "rgba(9,9,9,0.98)",
  },

  authBtn: {
    height: 44,
    border:
      "1px solid rgba(255,212,0,0.88)",
    background:
      "linear-gradient(180deg, #ffd400, #b98900)",
    color: "#000",
    fontWeight: 950,
    borderRadius: 8,
    padding:
      "0 18px",
    cursor: "pointer",
    boxShadow:
      "0 0 12px rgba(255,212,0,0.38)",
  },

  signupBtn: {
    height: 44,
    border:
      "1px solid rgba(255,0,111,0.82)",
    background:
      "linear-gradient(180deg, #ff006f, #d60052)",
    color: "#fff",
    fontWeight: 950,
    borderRadius: 8,
    padding:
      "0 18px",
    cursor: "pointer",
    boxShadow:
      "0 0 12px rgba(255,0,111,0.38)",
  },

  logoutBtn: {
    height: 44,
    border:
      "1px solid rgba(255,77,79,0.82)",
    background:
      "linear-gradient(180deg, #ff4d4f, #c9181b)",
    color: "#fff",
    fontWeight: 950,
    borderRadius: 8,
    padding:
      "0 18px",
    cursor: "pointer",
    boxShadow:
      "0 0 12px rgba(255,77,79,0.32)",
  },
};