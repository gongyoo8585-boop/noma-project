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
 * 🔥 ADMIN HEADER
 * ✔ 관리자 헤더
 * ✔ 현재 페이지 표시
 * ✔ 실시간 시간 표시
 * ✔ 관리자 상태 표시
 * ✔ 로그아웃 기능
 * ✔ 블랙 / 골드 테마
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

function getAdminName() {
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
      "ADMIN"
    );
  } catch (e) {
    return "ADMIN";
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

export default function AdminHeader({
  title = "NOMA ADMIN",
  subTitle = "MASSAGE PLATFORM",
}) {
  const location =
    useLocation();

  const [currentTime, setCurrentTime] =
    useState(
      getCurrentTime()
    );

  const [adminName] =
    useState(
      getAdminName()
    );

  const [online, setOnline] =
    useState(
      !!getToken()
    );

  useEffect(() => {
    const timer =
      setInterval(() => {
        setCurrentTime(
          getCurrentTime()
        );

        setOnline(
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
        pathname.includes(
          "/shops"
        )
      ) {
        return "업체 관리";
      }

      if (
        pathname.includes(
          "/users"
        )
      ) {
        return "회원 관리";
      }

      if (
        pathname.includes(
          "/reservations"
        )
      ) {
        return "예약 관리";
      }

      if (
        pathname.includes(
          "/payments"
        )
      ) {
        return "결제 관리";
      }

      if (
        pathname.includes(
          "/reviews"
        )
      ) {
        return "리뷰 관리";
      }

      if (
        pathname.includes(
          "/reports"
        )
      ) {
        return "신고 관리";
      }

      if (
        pathname.includes(
          "/analytics"
        )
      ) {
        return "분석";
      }

      if (
        pathname.includes(
          "/dashboard"
        )
      ) {
        return "대시보드";
      }

      return "통합 관리자";
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
          "ADMIN HEADER EVENT ERROR:",
          e.message
        );
      }
    } catch (e) {
      console.error(
        "ADMIN HEADER MOVE ERROR:",
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

      setOnline(false);

      alert(
        "로그아웃 되었습니다."
      );

      movePage(
        "/login"
      );
    } catch (e) {
      console.error(
        "ADMIN HEADER LOGOUT ERROR:",
        e
      );
    }
  };

  return (
    <header
      className="admin-header"
      style={styles.wrapper}
    >
      {/* LEFT */}
      <div style={styles.left}>
        <button
          type="button"
          onClick={() =>
            movePage(
              "/admin/dashboard"
            )
          }
          style={
            styles.logoBtn
          }
        >
          N
        </button>

        <div>
          <div
            style={
              styles.title
            }
          >
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

      {/* CENTER */}
      <div style={styles.center}>
        <div
          style={
            styles.pageBadge
          }
        >
          {currentPage}
        </div>
      </div>

      {/* RIGHT */}
      <div style={styles.right}>
        <div style={styles.statusBox}>
          <div
            style={
              styles.statusLabel
            }
          >
            관리자
          </div>

          <div
            style={
              styles.statusValue
            }
          >
            {adminName}
          </div>
        </div>

        <div style={styles.statusBox}>
          <div
            style={
              styles.statusLabel
            }
          >
            상태
          </div>

          <div
            style={{
              ...styles.statusValue,
              color: online
                ? "#4caf50"
                : "#f44336",
            }}
          >
            {online
              ? "ONLINE"
              : "OFFLINE"}
          </div>
        </div>

        <div style={styles.statusBox}>
          <div
            style={
              styles.statusLabel
            }
          >
            시간
          </div>

          <div
            style={
              styles.time
            }
          >
            {currentTime}
          </div>
        </div>

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
      </div>
    </header>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    minHeight: 76,
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

  center: {
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    flex: 1,
  },

  pageBadge: {
    padding:
      "10px 18px",
    borderRadius: 999,
    border:
      "1px solid #d4af37",
    background:
      "rgba(212,175,55,0.12)",
    color: "#d4af37",
    fontWeight: 700,
    fontSize: 14,
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

  statusBox: {
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

  statusLabel: {
    fontSize: 11,
    color: "#777",
    marginBottom: 4,
  },

  statusValue: {
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

  logoutBtn: {
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
    transition:
      "all 0.2s ease",
  },
};