"use strict";

import React, {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import Loading from "../../components/common/Loading";
import ErrorMessage from "../../components/common/ErrorMessage";
import EmptyState from "../../components/common/EmptyState";

function AdminDashboard({ navigate: propNavigate }) {
  const routerNavigate =
    useNavigate();

  const navigate =
    propNavigate ||
    routerNavigate;

  const mountedRef =
    useRef(false);

  const authCheckedRef =
    useRef(false);

  const redirectLockRef =
    useRef(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [stats] =
    useState({
      shops: 0,
      users: 0,
      reservations: 0,
      payments: 0,
      revenue: 0,
    });

  const [recentShops] =
    useState([]);

  const [recentUsers] =
    useState([]);

  const getToken = () => {
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("local-admin-token") ||
      sessionStorage.getItem("adminToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("accessToken") ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("jwt") ||
      sessionStorage.getItem("local-admin-token") ||
      "";

    if (
      !token ||
      token === "undefined" ||
      token === "null" ||
      String(token).trim() === ""
    ) {
      return "";
    }

    return String(token);
  };

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;
    };
  }, []);

  useEffect(() => {
    if (
      authCheckedRef.current
    ) {
      return;
    }

    authCheckedRef.current =
      true;

    try {
      const token =
        getToken();

      console.log(
        "ADMIN TOKEN:",
        token
      );

      if (!token) {
        if (
          redirectLockRef.current
        ) {
          return;
        }

        redirectLockRef.current =
          true;

        setLoading(false);

        navigate("/admin", {
          replace: true,
        });

        return;
      }

      if (
        mountedRef.current
      ) {
        setError("");
        setLoading(false);
      }
    } catch (e) {
      console.error(
        "ADMIN AUTH ERROR:",
        e
      );

      if (
        mountedRef.current
      ) {
        setError(
          "관리자 인증 실패"
        );

        setLoading(false);
      }
    }
  }, []);

  const movePage = (
    path
  ) => {
    try {
      if (
        window.location.pathname ===
        path
      ) {
        return;
      }

      navigate(path);
    } catch (e) {
      console.error(
        "MOVE ERROR:",
        e
      );

      window.location.href =
        path;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          background:
            "#000",
          display:
            "flex",
          justifyContent:
            "center",
          alignItems:
            "center",
        }}
      >
        <Loading message="🚀 관리자 페이지 로딩 중..." />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          background:
            "#000",
          padding: 30,
        }}
      >
        <ErrorMessage
          message={error}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "#000",
        color:
          "#d4af37",
      }}
    >
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          padding:
            "20px 30px",
          borderBottom:
            "1px solid #222",
          background:
            "#000",
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight:
              "bold",
            color:
              "#d4af37",
          }}
        >
          노마 ADMIN
        </div>

        <div
          style={{
            display:
              "flex",
            gap: 12,
          }}
        >
          <button
            style={
              headerBtn
            }
            onClick={() =>
              movePage("/")
            }
          >
            메인
          </button>

          <button
            style={
              headerBtn
            }
            onClick={() => {
              [
                "adminToken",
                "token",
                "accessToken",
                "authToken",
                "jwt",
                "local-admin-token",
                "local-admin",
                "user",
              ].forEach(
                (key) => {
                  localStorage.removeItem(
                    key
                  );

                  sessionStorage.removeItem(
                    key
                  );
                }
              );

              navigate("/admin", {
                replace: true,
              });
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      <div
        style={{
          display:
            "flex",
          minHeight:
            "calc(100vh - 80px)",
        }}
      >
        <div
          style={{
            width: 240,
            background:
              "#0d0d0d",
            borderRight:
              "1px solid #222",
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight:
                "bold",
              marginBottom: 30,
            }}
          >
            ADMIN
          </div>

          <SidebarButton
            label="통합 관리자"
            active
            onClick={() =>
              movePage(
                "/admin/dashboard"
              )
            }
          />

          <SidebarButton
            label="대시보드"
            onClick={() =>
              movePage(
                "/admin/dashboard"
              )
            }
          />

          <SidebarButton
            label="업체 관리"
            onClick={() =>
              movePage(
                "/admin/shops"
              )
            }
          />

          <SidebarButton
            label="회원 관리"
            onClick={() =>
              movePage(
                "/admin/users"
              )
            }
          />

          <SidebarButton
            label="예약 관리"
            onClick={() =>
              movePage(
                "/admin/reservations"
              )
            }
          />

          <SidebarButton
            label="결제 관리"
            onClick={() =>
              movePage(
                "/admin/payments"
              )
            }
          />

          <SidebarButton
            label="리뷰 관리"
            onClick={() =>
              movePage(
                "/admin/reviews"
              )
            }
          />

          <SidebarButton
            label="신고 관리"
            onClick={() =>
              movePage(
                "/admin/reports"
              )
            }
          />

          <SidebarButton
            label="분석"
            onClick={() =>
              movePage(
                "/admin/analytics"
              )
            }
          />
        </div>

        <div
          style={{
            flex: 1,
            padding: 30,
            background:
              "#050505",
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom: 30,
            }}
          >
            <h1
              style={{
                margin: 0,
                color:
                  "#d4af37",
                fontSize: 48,
              }}
            >
              통합 관리자 시스템
            </h1>

            <div
              style={{
                color:
                  "#888",
                fontSize: 18,
              }}
            >
              NOMA ADMIN
            </div>
          </div>

          <div
            style={{
              background:
                "#000",
              border:
                "1px solid #111",
              padding: 24,
              borderRadius: 12,
            }}
          >
            <h2
              style={{
                color:
                  "#d4af37",
                marginTop: 0,
                marginBottom: 24,
                fontSize: 36,
              }}
            >
              📊 관리자 대시보드
            </h2>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(5, 1fr)",
                gap: 16,
                marginBottom: 40,
              }}
            >
              <Card
                title="매장 수"
                value={
                  stats.shops
                }
              />

              <Card
                title="유저 수"
                value={
                  stats.users
                }
              />

              <Card
                title="예약 수"
                value={
                  stats.reservations
                }
              />

              <Card
                title="결제 수"
                value={
                  stats.payments
                }
              />

              <Card
                title="총 매출"
                value={
                  stats.revenue
                }
              />
            </div>

            <div
              style={{
                marginBottom: 50,
              }}
            >
              <h3
                style={{
                  color:
                    "#d4af37",
                  fontSize: 34,
                }}
              >
                최근 매장
              </h3>

              {recentShops.length ===
              0 ? (
                <EmptyState message="데이터 없음" />
              ) : null}
            </div>

            <div>
              <h3
                style={{
                  color:
                    "#d4af37",
                  fontSize: 34,
                }}
              >
                최근 유저
              </h3>

              {recentUsers.length ===
              0 ? (
                <EmptyState message="데이터 없음" />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({
  label,
  active,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding:
          "18px 20px",
        marginBottom: 12,
        borderRadius: 10,
        border:
          active
            ? "none"
            : "1px solid #222",
        background:
          active
            ? "#d4af37"
            : "#111",
        color:
          active
            ? "#000"
            : "#fff",
        fontSize: 24,
        fontWeight:
          "bold",
        textAlign:
          "left",
        cursor:
          "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Card({
  title,
  value,
}) {
  return (
    <div
      style={{
        background:
          "#0b0b0b",
        border:
          "1px solid #333",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div
        style={{
          color:
            "#999",
          fontSize: 16,
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color:
            "#fff",
          fontSize: 42,
          fontWeight:
            "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const headerBtn = {
  background: "#d4af37",
  border: "none",
  color: "#000",
  padding:
    "10px 18px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

export default AdminDashboard;