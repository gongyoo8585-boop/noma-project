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
 * 🔥 ADMIN NAVBAR
 * ✔ 관리자 상단 네비게이션
 * ✔ 현재 경로 active 표시
 * ✔ 관리자 상태 표시
 * ✔ 로그아웃 지원
 * ✔ 반응형 지원
 * ✔ 블랙 / 골드 테마
 * ✔ 기존 구조 충돌 없음
 * ✔ 단독 사용 가능
 * ✔ 에러 0% 대응
 * =====================================================
 */

function getCurrentTime() {
  try {
    return new Date().toLocaleString("ko-KR", {
      hour12: false,
    });
  } catch (e) {
    return "";
  }
}

function getAdminName() {
  try {
    return (
      localStorage.getItem("adminName") ||
      localStorage.getItem("userName") ||
      localStorage.getItem("nickname") ||
      "ADMIN"
    );
  } catch (e) {
    return "ADMIN";
  }
}

function getToken() {
  try {
    return (
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  } catch (e) {
    return "";
  }
}

export default function AdminNavbar({
  title = "NOMA ADMIN",
}) {
  const location = useLocation();

  const [currentTime, setCurrentTime] =
    useState(getCurrentTime());

  const [adminName] =
    useState(getAdminName());

  const [isLoggedIn, setIsLoggedIn] =
    useState(!!getToken());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());

      setIsLoggedIn(!!getToken());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const currentMenu = useMemo(() => {
    const pathname =
      location?.pathname || "";

    if (
      pathname.includes("/shops")
    ) {
      return "업체 관리";
    }

    if (
      pathname.includes("/users")
    ) {
      return "회원 관리";
    }

    if (
      pathname.includes("/reservations")
    ) {
      return "예약 관리";
    }

    if (
      pathname.includes("/payments")
    ) {
      return "결제 관리";
    }

    if (
      pathname.includes("/reviews")
    ) {
      return "리뷰 관리";
    }

    if (
      pathname.includes("/reports")
    ) {
      return "신고 관리";
    }

    if (
      pathname.includes("/analytics")
    ) {
      return "분석";
    }

    if (
      pathname.includes("/dashboard")
    ) {
      return "대시보드";
    }

    return "통합 관리자";
  }, [location]);

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
        new PopStateEvent("popstate")
      );

      try {
        window.dispatchEvent(
          new Event("auth-updated")
        );
      } catch (e) {
        console.warn(
          "ADMIN NAVBAR AUTH EVENT ERROR:",
          e.message
        );
      }
    } catch (e) {
      console.error(
        "ADMIN NAVBAR MOVE ERROR:",
        e
      );

      window.location.href = path;
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

      setIsLoggedIn(false);

      alert("로그아웃 되었습니다.");

      movePage("/login");
    } catch (e) {
      console.error(
        "ADMIN LOGOUT ERROR:",
        e
      );
    }
  };

  return (
    <header
      className="admin-navbar"
      style={styles.wrapper}
    >
      {/* LEFT */}
      <div style={styles.left}>
        <div style={styles.logoBox}>
          <div style={styles.logo}>
            N
          </div>

          <div>
            <div style={styles.title}>
              {title}
            </div>

            <div style={styles.subTitle}>
              {currentMenu}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div style={styles.right}>
        <div style={styles.infoBox}>
          <div style={styles.infoLabel}>
            관리자
          </div>

          <div style={styles.infoValue}>
            {adminName}
          </div>
        </div>

        <div style={styles.infoBox}>
          <div style={styles.infoLabel}>
            상태
          </div>

          <div
            style={{
              ...styles.infoValue,
              color: isLoggedIn
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
          <div style={styles.infoLabel}>
            시간
          </div>

          <div style={styles.time}>
            {currentTime}
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          style={styles.logoutBtn}
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
    minHeight: 74,
    background: "#000",
    borderBottom: "1px solid #222",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    boxSizing: "border-box",
    gap: 20,
    flexWrap: "wrap",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  logoBox: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#d4af37",
    color: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 900,
    fontSize: 24,
    boxShadow:
      "0 0 16px rgba(212,175,55,0.25)",
  },

  title: {
    color: "#d4af37",
    fontSize: 20,
    fontWeight: 800,
    lineHeight: 1.2,
  },

  subTitle: {
    marginTop: 4,
    color: "#999",
    fontSize: 12,
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  infoBox: {
    minWidth: 90,
    background: "#111",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "8px 12px",
    boxSizing: "border-box",
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
    whiteSpace: "nowrap",
  },

  logoutBtn: {
    border: "1px solid #d4af37",
    background: "#d4af37",
    color: "#000",
    fontWeight: 800,
    borderRadius: 10,
    padding: "12px 16px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};