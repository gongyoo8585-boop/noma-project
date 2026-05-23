"use strict";

import React, {
  useEffect,
  useState,
} from "react";

import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/* 🔥 최소 추가 */
import AdminLayout from "../components/admin/AdminLayout";

import ShopAdminPage from "./admin/ShopAdminPage";
import UserAdminPage from "./admin/UserAdminPage";
import ReservationAdminPage from "./admin/ReservationAdminPage";
import PaymentAdminPage from "./admin/PaymentAdminPage";
import ReviewAdminPage from "./admin/ReviewAdminPage";
import ReportAdminPage from "./admin/ReportAdminPage";
import AdminAnalyticsPage from "./AdminAnalyticsPage";

/**
 * =====================================================
 * 🔥 ADMIN DASHBOARD PAGE
 * ✔ Router 충돌 제거 유지
 * ✔ 관리자 통합 유지
 * ✔ dashboard fetch 안전 처리
 * ✔ 기존 구조 유지
 * ✔ 기존 기능 유지
 * ✔ 🔥 무한 로딩 방지 최소 수정
 * ✔ 🔥 AUTH_TOKEN_REQUIRED 수정
 * ✔ 🔥 로그인 안된 경우 /login 이동
 * ✔ 🔥 관리자 페이지 중첩 렌더링 충돌 제거
 * =====================================================
 */

const API_BASE =
  window.__ENV__?.API_BASE_URL ||
  (typeof import.meta !==
    "undefined" &&
    import.meta.env &&
    import.meta.env
      .VITE_API_URL) ||
  "http://localhost:10000/api";

const EMPTY_DASHBOARD_DATA =
  {
    summary: {
      totalShops: 0,
      totalUsers: 0,
      totalReservations: 0,
      totalPayments: 0,
      totalRevenue: 0,
    },

    recent: {
      shops: [],
      users: [],
      reservations: [],
    },
  };

function getAdminToken() {

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
    localStorage.getItem(
      "authToken"
    ) ||
    localStorage.getItem(
      "jwt"
    ) ||
    ""
  );
}

/* =========================
API
========================= */
async function fetchDashboard() {

  try {

    const token =
      getAdminToken();

    /**
     * 🔥 핵심 수정
     * 로그인 안된 경우
     */
    if (!token) {

      return {
        authRequired: true,
      };
    }

    const headers = {
      "Content-Type":
        "application/json",

      Authorization:
        `Bearer ${token}`,
    };

    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 2500);

    const res = await fetch(
      `${API_BASE}/admin/dashboard`,
      {
        method: "GET",
        headers,
        credentials:
          "include",
        cache: "no-store",
        signal:
          controller.signal,
      }
    );

    clearTimeout(timeout);

    let data = {};

    try {

      data =
        await res.json();

    } catch {

      data = {};
    }

    /**
     * 🔥 인증 오류 처리
     */
    if (
      res.status === 401 ||
      data?.msg ===
        "AUTH_TOKEN_REQUIRED" ||
      data?.msg ===
        "INVALID_TOKEN"
    ) {

      return {
        authRequired: true,
      };
    }

    if (
      !res.ok ||
      data.ok === false
    ) {

      if (
        res.status >= 500 ||
        res.status === 404
      ) {

        return EMPTY_DASHBOARD_DATA;
      }

      throw new Error(
        data.msg ||
          data.message ||
          "DASHBOARD_ERROR"
      );
    }

    return data;

  } catch (e) {

    console.error(
      "ADMIN DASHBOARD FETCH ERROR:",
      e.message
    );

    return EMPTY_DASHBOARD_DATA;
  }
}

/* =====================================================
🔥 COMPONENT
===================================================== */
function AdminDashboard() {

  const [data, setData] =
    useState(
      EMPTY_DASHBOARD_DATA
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [initialized, setInitialized] =
    useState(false);

  /* 🔥 최소 추가 */
  const [activeTab, setActiveTab] =
    useState("dashboard");

  /* =========================
  LOAD
  ========================= */
  const load = async () => {

    try {

      setLoading(true);
      setError("");

      const res =
        await fetchDashboard();

      /**
       * 🔥 로그인 필요
       */
      if (
        res?.authRequired
      ) {

        alert(
          "로그인이 필요합니다."
        );

        window.location.replace(
          "/login"
        );

        return;
      }

      const normalized =
        res?.data || res;

      setData({
        summary: {
          ...EMPTY_DASHBOARD_DATA.summary,
          ...(normalized?.summary ||
            {}),
        },

        recent: {
          ...EMPTY_DASHBOARD_DATA.recent,
          ...(normalized?.recent ||
            {}),
        },
      });

    } catch (e) {

      console.error(
        "ADMIN DASHBOARD LOAD ERROR:",
        e.message
      );

      setError(
        e.message ||
          "대시보드 로딩 실패"
      );

    } finally {

      setInitialized(true);

      setLoading(false);
    }
  };

  /* =========================
  INIT
  ========================= */
  useEffect(() => {

    if (initialized) {
      return;
    }

    load();

  }, [initialized]);

  /* =========================
  UI STATES
  ========================= */
  if (loading) {

    return (
      <Loading message="대시보드 로딩 중..." />
    );
  }

  if (error) {

    return (
      <ErrorMessage
        message={error}
        onRetry={load}
      />
    );
  }

  if (
    !data ||
    !data.summary
  ) {

    return (
      <EmptyState message="데이터가 없습니다." />
    );
  }

  const { summary, recent } =
    data;

  const safeRecent = {
    shops:
      recent?.shops || [],
    users:
      recent?.users || [],
    reservations:
      recent?.reservations ||
      [],
  };

  return (
    <AdminLayout title="통합 관리자 시스템">

      <div style={styles.page}>
        <h2 style={styles.title}>
          📊 관리자 대시보드
        </h2>

        {/* 🔥 최소 추가 */}
        <div style={styles.tabWrap}>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "dashboard"
              )
            }
            style={{
              ...styles.tabBtn,
              background:
                activeTab ===
                "dashboard"
                  ? "#d4af37"
                  : "#111",
              color:
                activeTab ===
                "dashboard"
                  ? "#000"
                  : "#fff",
            }}
          >
            대시보드
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "shop"
              )
            }
            style={{
              ...styles.tabBtn,
              background:
                activeTab ===
                "shop"
                  ? "#d4af37"
                  : "#111",
              color:
                activeTab ===
                "shop"
                  ? "#000"
                  : "#fff",
            }}
          >
            업체관리
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "user"
              )
            }
            style={{
              ...styles.tabBtn,
              background:
                activeTab ===
                "user"
                  ? "#d4af37"
                  : "#111",
              color:
                activeTab ===
                "user"
                  ? "#000"
                  : "#fff",
            }}
          >
            회원관리
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "reservation"
              )
            }
            style={{
              ...styles.tabBtn,
              background:
                activeTab ===
                "reservation"
                  ? "#d4af37"
                  : "#111",
              color:
                activeTab ===
                "reservation"
                  ? "#000"
                  : "#fff",
            }}
          >
            예약관리
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "payment"
              )
            }
            style={{
              ...styles.tabBtn,
              background:
                activeTab ===
                "payment"
                  ? "#d4af37"
                  : "#111",
              color:
                activeTab ===
                "payment"
                  ? "#000"
                  : "#fff",
            }}
          >
            결제관리
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "review"
              )
            }
            style={{
              ...styles.tabBtn,
              background:
                activeTab ===
                "review"
                  ? "#d4af37"
                  : "#111",
              color:
                activeTab ===
                "review"
                  ? "#000"
                  : "#fff",
            }}
          >
            리뷰관리
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "report"
              )
            }
            style={{
              ...styles.tabBtn,
              background:
                activeTab ===
                "report"
                  ? "#d4af37"
                  : "#111",
              color:
                activeTab ===
                "report"
                  ? "#000"
                  : "#fff",
            }}
          >
            신고관리
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "analytics"
              )
            }
            style={{
              ...styles.tabBtn,
              background:
                activeTab ===
                "analytics"
                  ? "#d4af37"
                  : "#111",
              color:
                activeTab ===
                "analytics"
                  ? "#000"
                  : "#fff",
            }}
          >
            분석
          </button>

        </div>

        {activeTab ===
          "dashboard" && (
          <>
            <div style={styles.grid}>
              <Card
                title="매장 수"
                value={
                  summary.totalShops
                }
              />

              <Card
                title="유저 수"
                value={
                  summary.totalUsers
                }
              />

              <Card
                title="예약 수"
                value={
                  summary.totalReservations
                }
              />

              <Card
                title="결제 수"
                value={
                  summary.totalPayments
                }
              />

              <Card
                title="총 매출"
                value={
                  summary.totalRevenue
                }
              />
            </div>

            <div style={styles.section}>
              <h3>최근 매장</h3>

              <List
                items={
                  safeRecent.shops
                }
              />
            </div>

            <div style={styles.section}>
              <h3>최근 유저</h3>

              <List
                items={
                  safeRecent.users
                }
              />
            </div>

            <div style={styles.section}>
              <h3>최근 예약</h3>

              <List
                items={
                  safeRecent.reservations
                }
              />
            </div>
          </>
        )}

        {activeTab ===
          "shop" && (
          <div
            style={
              styles.adminSection
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              🏪 업체 관리
            </div>

            <ShopAdminPage />
          </div>
        )}

        {activeTab ===
          "user" && (
          <div
            style={
              styles.adminSection
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              👤 회원 관리
            </div>

            <UserAdminPage />
          </div>
        )}

        {activeTab ===
          "reservation" && (
          <div
            style={
              styles.adminSection
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              📅 예약 관리
            </div>

            <ReservationAdminPage />
          </div>
        )}

        {activeTab ===
          "payment" && (
          <div
            style={
              styles.adminSection
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              💳 결제 관리
            </div>

            <PaymentAdminPage />
          </div>
        )}

        {activeTab ===
          "review" && (
          <div
            style={
              styles.adminSection
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              ⭐ 리뷰 관리
            </div>

            <ReviewAdminPage />
          </div>
        )}

        {activeTab ===
          "report" && (
          <div
            style={
              styles.adminSection
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              🚨 신고 관리
            </div>

            <ReportAdminPage />
          </div>
        )}

        {activeTab ===
          "analytics" && (
          <div
            style={
              styles.adminSection
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              📈 분석 / 통계
            </div>

            <AdminAnalyticsPage />
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

/* =========================
CARD
========================= */
function Card({
  title,
  value,
}) {

  return (
    <div style={styles.card}>
      <div
        style={
          styles.cardTitle
        }
      >
        {title}
      </div>

      <div
        style={
          styles.cardValue
        }
      >
        {value ?? 0}
      </div>
    </div>
  );
}

/* =========================
LIST
========================= */
function List({
  items,
}) {

  if (
    !items ||
    items.length === 0
  ) {

    return (
      <EmptyState message="데이터 없음" />
    );
  }

  return (
    <div style={styles.list}>
      {items.map(
        (item, idx) => (
          <div
            key={idx}
            style={
              styles.item
            }
          >
            {item?.name ||
              item?.email ||
              item?._id ||
              "데이터"}
          </div>
        )
      )}
    </div>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  page: {
    padding: 20,
    background: "#000",
    color: "#d4af37",
    minHeight: "100vh",
    boxSizing:
      "border-box",
  },

  title: {
    marginBottom: 20,
  },

  tabWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },

  tabBtn: {
    padding: "12px 16px",
    borderRadius: 10,
    border:
      "1px solid #333",
    cursor: "pointer",
    fontWeight: 700,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 30,
  },

  card: {
    background: "#111",
    padding: 15,
    borderRadius: 8,
    border:
      "1px solid #333",
  },

  cardTitle: {
    fontSize: 12,
    color: "#888",
  },

  cardValue: {
    fontSize: 22,
    marginTop: 6,
    color: "#fff",
  },

  section: {
    marginBottom: 25,
  },

  list: {
    display: "grid",
    gap: 6,
  },

  item: {
    padding: 10,
    background: "#111",
    borderRadius: 6,
    border:
      "1px solid #333",
  },

  adminSection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 20,
    background: "#0b0b0b",
    border:
      "1px solid #222",
    borderRadius: 12,
  },

  sectionTitle: {
    fontSize: 22,
    color: "#d4af37",
    marginBottom: 20,
    fontWeight: 700,
  },
};

export default AdminDashboard;