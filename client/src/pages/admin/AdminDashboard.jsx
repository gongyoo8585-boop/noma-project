"use strict";

import React, {
  useEffect,
  useState,
} from "react";

import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

import AdminLayout from "../components/admin/AdminLayout";

import ShopAdminPage from "./admin/ShopAdminPage";
import UserAdminPage from "./admin/UserAdminPage";
import ReservationAdminPage from "./admin/ReservationAdminPage";
import PaymentAdminPage from "./admin/PaymentAdminPage";
import ReviewAdminPage from "./admin/ReviewAdminPage";
import ReportAdminPage from "./admin/ReportAdminPage";
import AdminAnalyticsPage from "./AdminAnalyticsPage";

import shopApi from "../services/shop.api";

const API_BASE_RAW =
  (
    typeof window !== "undefined" &&
    window.__ENV__ &&
    window.__ENV__.API_BASE_URL
  ) ||
  (
    typeof import.meta !==
      "undefined" &&
    import.meta.env &&
    (
      import.meta.env
        .VITE_API_URL ||
      import.meta.env
        .VITE_API_BASE_URL
    )
  ) ||
  "https://api.nora365.co.kr/api";

const API_BASE = String(API_BASE_RAW)
  .replace("/api/api", "/api")
  .replace(/\/+$/, "");

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

function toNumber(value, fallback = 0) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function toArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeDashboardCategory(value) {
  const text =
    String(value || "")
      .toLowerCase()
      .trim();

  if (
    text.includes("/admin/karaoke") ||
    text.includes("category=karaoke") ||
    text.includes("shopcategory=karaoke") ||
    text.includes("servicetype=karaoke") ||
    text.includes("businesstype=karaoke") ||
    text.includes("admincategory=karaoke") ||
    text.includes("karaoke") ||
    text.includes("노래방") ||
    text.includes("가라오케") ||
    text.includes("코인")
  ) {
    return "karaoke";
  }

  if (
    text.includes("/admin/massage") ||
    text.includes("category=massage") ||
    text.includes("shopcategory=massage") ||
    text.includes("servicetype=massage") ||
    text.includes("businesstype=massage") ||
    text.includes("admincategory=massage") ||
    text.includes("massage") ||
    text.includes("마사지") ||
    text.includes("테라피") ||
    text.includes("아로마") ||
    text.includes("스웨디시")
  ) {
    return "massage";
  }

  return "";
}

function getDashboardCategory() {
  try {
    const path =
      String(
        window.location.pathname || ""
      ).toLowerCase();

    const pathCategory =
      normalizeDashboardCategory(path);

    if (pathCategory) {
      return pathCategory;
    }

    const params =
      new URLSearchParams(
        window.location.search || ""
      );

    const queryCategory =
      normalizeDashboardCategory(
        params.get("category")
      ) ||
      normalizeDashboardCategory(
        params.get("shopCategory")
      ) ||
      normalizeDashboardCategory(
        params.get("serviceType")
      ) ||
      normalizeDashboardCategory(
        params.get("businessType")
      ) ||
      normalizeDashboardCategory(
        params.get("adminCategory")
      ) ||
      normalizeDashboardCategory(
        window.location.search
      );

    if (queryCategory) {
      return queryCategory;
    }

    return "massage";
  } catch (e) {
    console.warn(
      "ADMIN DASHBOARD CATEGORY ERROR:",
      e.message
    );

    return "massage";
  }
}

function createDashboardUrl(category) {
  const query =
    new URLSearchParams({
      category:
        normalizeDashboardCategory(category) ||
        "massage",
      shopCategory:
        normalizeDashboardCategory(category) ||
        "massage",
      serviceType:
        normalizeDashboardCategory(category) ||
        "massage",
      businessType:
        normalizeDashboardCategory(category) ||
        "massage",
      adminCategory:
        normalizeDashboardCategory(category) ||
        "massage",
      _t: String(Date.now()),
    });

  return `${API_BASE}/admin/dashboard?${query.toString()}`;
}

function getAdminToken() {
  try {
    return (
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
      ""
    );
  } catch (e) {
    console.warn(
      "ADMIN TOKEN READ ERROR:",
      e.message
    );

    return "";
  }
}

function parseStoredJson(value) {
  try {
    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch {
    return null;
  }
}

function collectArrayFromStoredValue(value) {
  const parsed =
    parseStoredJson(value);

  if (!parsed) {
    return [];
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.shops)) {
    return parsed.shops;
  }

  if (Array.isArray(parsed.items)) {
    return parsed.items;
  }

  if (Array.isArray(parsed.list)) {
    return parsed.list;
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }

  if (
    parsed.data &&
    Array.isArray(parsed.data.shops)
  ) {
    return parsed.data.shops;
  }

  if (
    parsed.data &&
    Array.isArray(parsed.data.items)
  ) {
    return parsed.data.items;
  }

  return [];
}

function getShopCategoryFromItem(item = {}, fallbackCategory = "") {
  const direct =
    normalizeDashboardCategory(item.category) ||
    normalizeDashboardCategory(item.shopCategory) ||
    normalizeDashboardCategory(item.serviceType) ||
    normalizeDashboardCategory(item.businessType) ||
    normalizeDashboardCategory(item.adminCategory) ||
    normalizeDashboardCategory(item.type) ||
    normalizeDashboardCategory(item.categoryGroup) ||
    normalizeDashboardCategory(item.shopType) ||
    normalizeDashboardCategory(item.mainCategory) ||
    normalizeDashboardCategory(item.service);

  if (direct) {
    return direct;
  }

  const joined =
    [
      item.name,
      item.shopName,
      item.title,
      item.description,
      item.address,
      item.course,
      item.courses,
      item.tags,
      fallbackCategory,
    ]
      .map((value) => {
        if (Array.isArray(value)) {
          return value.join(" ");
        }

        return String(value || "");
      })
      .join(" ")
      .toLowerCase();

  return (
    normalizeDashboardCategory(joined) ||
    normalizeDashboardCategory(fallbackCategory)
  );
}

function getShopIdentity(item = {}) {
  return String(
    item._id ||
      item.id ||
      item.shopId ||
      item.name ||
      item.shopName ||
      item.title ||
      item.phone ||
      item.address ||
      JSON.stringify(item)
  );
}

function isDeletedShop(item = {}) {
  return (
    item.isDeleted === true ||
    item.deleted === true ||
    item.removed === true
  );
}

function getStoredShopsByCategory(category) {
  try {
    if (
      typeof window === "undefined" ||
      !window.localStorage
    ) {
      return [];
    }

    const normalizedCategory =
      normalizeDashboardCategory(category) ||
      "massage";

    const storageKeys = [
      "nora_admin_shops",
      "nora_local_shops",
      "noma_admin_shops",
      "noma_local_shops",
      `nora_admin_shops_${normalizedCategory}`,
      `nora_local_shops_${normalizedCategory}`,
      `noma_admin_shops_${normalizedCategory}`,
      `noma_local_shops_${normalizedCategory}`,
    ];

    const keys = [];

    storageKeys.forEach((key) => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });

    for (
      let i = 0;
      i < window.localStorage.length;
      i += 1
    ) {
      const key =
        window.localStorage.key(i);

      if (
        key &&
        (
          key.includes("shop") ||
          key.includes("shops")
        ) &&
        !keys.includes(key)
      ) {
        keys.push(key);
      }
    }

    const collected = [];

    keys.forEach((key) => {
      const value =
        window.localStorage.getItem(key);

      const items =
        collectArrayFromStoredValue(value);

      const fallbackCategory =
        normalizeDashboardCategory(key);

      items.forEach((item) => {
        if (
          item &&
          typeof item === "object"
        ) {
          const categoryValue =
            getShopCategoryFromItem(
              item,
              fallbackCategory
            );

          if (
            categoryValue ===
              normalizedCategory &&
            !isDeletedShop(item)
          ) {
            collected.push(item);
          }
        }
      });
    });

    const uniqueMap =
      new Map();

    collected.forEach((item) => {
      const key =
        getShopIdentity(item);

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    return Array.from(
      uniqueMap.values()
    );
  } catch (e) {
    console.warn(
      "ADMIN LOCAL SHOP COUNT ERROR:",
      e.message
    );

    return [];
  }
}

async function fetchDashboard(category) {
  try {
    const token =
      getAdminToken();

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
      }, 5000);

    const res = await fetch(
      createDashboardUrl(category),
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

    if (
      res.status === 401 ||
      data?.msg ===
        "AUTH_TOKEN_REQUIRED" ||
      data?.message ===
        "인증 토큰 없음" ||
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

function normalizeDashboardResponse(response, category) {
  const normalized =
    response?.data ||
    response ||
    {};

  const summary =
    normalized.summary ||
    {};

  const stats =
    normalized.stats ||
    {};

  const recent =
    normalized.recent ||
    {};

  const serverShops =
    toArray(recent.shops).length > 0
      ? toArray(recent.shops)
      : toArray(normalized.shops);

  const normalizedCategory =
    normalizeDashboardCategory(category) ||
    "massage";

  const filteredServerShops =
    serverShops.filter((shop) => {
      if (
        !shop ||
        typeof shop !== "object" ||
        isDeletedShop(shop)
      ) {
        return false;
      }

      const shopCategory =
        getShopCategoryFromItem(
          shop,
          normalizedCategory
        );

      return shopCategory === normalizedCategory;
    });

  const uniqueServerMap =
    new Map();

  filteredServerShops.forEach((shop) => {
    uniqueServerMap.set(
      getShopIdentity(shop),
      shop
    );
  });

  const localShops =
    getStoredShopsByCategory(
      normalizedCategory
    );

  localShops.forEach((shop) => {
    if (
      shop &&
      typeof shop === "object" &&
      !isDeletedShop(shop)
    ) {
      uniqueServerMap.set(
        getShopIdentity(shop),
        shop
      );
    }
  });

  const mergedShops =
    Array.from(
      uniqueServerMap.values()
    );

  const serverTotalShops =
    toNumber(
      summary.totalShops ??
        stats.shops ??
        normalized.totalShops ??
        normalized.total ??
        normalized.count,
      mergedShops.length
    );

  const effectiveTotalShops =
    Math.max(
      serverTotalShops,
      mergedShops.length
    );

  return {
    summary: {
      ...EMPTY_DASHBOARD_DATA.summary,
      ...summary,

      totalShops:
        effectiveTotalShops,

      totalUsers:
        toNumber(
          summary.totalUsers ??
            stats.users ??
            normalized.totalUsers ??
            normalized.users,
          EMPTY_DASHBOARD_DATA.summary.totalUsers
        ),

      totalReservations:
        toNumber(
          summary.totalReservations ??
            stats.reservations ??
            normalized.totalReservations ??
            normalized.reservations,
          EMPTY_DASHBOARD_DATA.summary.totalReservations
        ),

      totalPayments:
        toNumber(
          summary.totalPayments ??
            stats.payments ??
            normalized.totalPayments ??
            normalized.payments,
          EMPTY_DASHBOARD_DATA.summary.totalPayments
        ),

      totalRevenue:
        toNumber(
          summary.totalRevenue ??
            stats.revenue ??
            normalized.totalRevenue ??
            normalized.revenue,
          EMPTY_DASHBOARD_DATA.summary.totalRevenue
        ),
    },

    recent: {
      ...EMPTY_DASHBOARD_DATA.recent,
      ...recent,

      shops:
        mergedShops,
    },
  };
}


function normalizeShopSnapshotResponse(response) {
  const payload =
    response?.data ||
    response ||
    {};

  const shops =
    Array.isArray(payload.shops)
      ? payload.shops
      : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.list)
      ? payload.list
      : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.data?.shops)
      ? payload.data.shops
      : Array.isArray(payload.data?.items)
      ? payload.data.items
      : Array.isArray(payload.data?.list)
      ? payload.data.list
      : Array.isArray(response)
      ? response
      : [];

  return {
    ...payload,
    shops,
    total: toNumber(
      payload.total ??
        payload.shopsCount ??
        payload.shopCount ??
        payload.totalShops ??
        payload.count,
      shops.length
    ),
  };
}

async function fetchShopDashboardSnapshot(category) {
  const normalizedCategory =
    normalizeDashboardCategory(category) ||
    "massage";

  const categoryParams = {
    category: normalizedCategory,
    shopCategory: normalizedCategory,
    serviceType: normalizedCategory,
    businessType: normalizedCategory,
    adminCategory: normalizedCategory,
  };

  const [statsResult, listResult] =
    await Promise.allSettled([
      shopApi.getStats(categoryParams),
      shopApi.getList(categoryParams),
    ]);

  const stats =
    statsResult.status === "fulfilled"
      ? normalizeShopSnapshotResponse(
          statsResult.value
        )
      : {
          total: 0,
          shops: [],
        };

  const list =
    listResult.status === "fulfilled"
      ? normalizeShopSnapshotResponse(
          listResult.value
        )
      : {
          total: 0,
          shops: [],
        };

  if (statsResult.status === "rejected") {
    console.error(
      "ADMIN DASHBOARD SHOP STATS ERROR:",
      statsResult.reason?.message ||
        statsResult.reason
    );
  }

  if (listResult.status === "rejected") {
    console.error(
      "ADMIN DASHBOARD SHOP LIST ERROR:",
      listResult.reason?.message ||
        listResult.reason
    );
  }

  const localShops =
    getStoredShopsByCategory(
      normalizedCategory
    );

  const mergedMap =
    new Map();

  [
    ...toArray(list.shops),
    ...toArray(stats.shops),
    ...localShops,
  ].forEach((shop) => {
    if (
      shop &&
      typeof shop === "object" &&
      !isDeletedShop(shop) &&
      getShopCategoryFromItem(
        shop,
        normalizedCategory
      ) === normalizedCategory
    ) {
      mergedMap.set(
        getShopIdentity(shop),
        shop
      );
    }
  });

  const shops =
    Array.from(
      mergedMap.values()
    );

  return {
    totalShops: Math.max(
      toNumber(stats.total, 0),
      toNumber(stats.shops, 0),
      toNumber(list.total, 0),
      shops.length
    ),
    shops,
  };
}

function mergeShopSnapshotIntoDashboard(dashboardData, shopSnapshot) {
  const safeDashboard =
    dashboardData ||
    EMPTY_DASHBOARD_DATA;

  const snapshotShops =
    toArray(shopSnapshot?.shops);

  const currentShops =
    toArray(safeDashboard?.recent?.shops);

  const mergedMap =
    new Map();

  [...currentShops, ...snapshotShops].forEach((shop) => {
    if (
      shop &&
      typeof shop === "object" &&
      !isDeletedShop(shop)
    ) {
      mergedMap.set(
        getShopIdentity(shop),
        shop
      );
    }
  });

  const mergedShops =
    Array.from(
      mergedMap.values()
    );

  return {
    ...safeDashboard,
    summary: {
      ...EMPTY_DASHBOARD_DATA.summary,
      ...(safeDashboard.summary || {}),
      totalShops: Math.max(
        toNumber(
          safeDashboard.summary?.totalShops,
          0
        ),
        toNumber(
          shopSnapshot?.totalShops,
          0
        ),
        mergedShops.length
      ),
    },
    recent: {
      ...EMPTY_DASHBOARD_DATA.recent,
      ...(safeDashboard.recent || {}),
      shops: mergedShops,
    },
  };
}

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

  const [activeTab, setActiveTab] =
    useState("dashboard");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const dashboardCategory =
        getDashboardCategory();

      const res =
        await fetchDashboard(
          dashboardCategory
        );

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

      const normalizedDashboard =
        normalizeDashboardResponse(
          res,
          dashboardCategory
        );

      const shopSnapshot =
        await fetchShopDashboardSnapshot(
          dashboardCategory
        );

      setData(
        mergeShopSnapshotIntoDashboard(
          normalizedDashboard,
          shopSnapshot
        )
      );
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

  useEffect(() => {
    if (initialized) {
      return;
    }

    load();
  }, [initialized]);

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
          📊 NORA 관리자 대시보드
        </h2>

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
          <div style={styles.adminSection}>
            <div style={styles.sectionTitle}>
              🏪 업체 관리
            </div>

            <ShopAdminPage />
          </div>
        )}

        {activeTab ===
          "user" && (
          <div style={styles.adminSection}>
            <div style={styles.sectionTitle}>
              👤 회원 관리
            </div>

            <UserAdminPage />
          </div>
        )}

        {activeTab ===
          "reservation" && (
          <div style={styles.adminSection}>
            <div style={styles.sectionTitle}>
              📅 예약 관리
            </div>

            <ReservationAdminPage />
          </div>
        )}

        {activeTab ===
          "payment" && (
          <div style={styles.adminSection}>
            <div style={styles.sectionTitle}>
              💳 결제 관리
            </div>

            <PaymentAdminPage />
          </div>
        )}

        {activeTab ===
          "review" && (
          <div style={styles.adminSection}>
            <div style={styles.sectionTitle}>
              ⭐ 리뷰 관리
            </div>

            <ReviewAdminPage />
          </div>
        )}

        {activeTab ===
          "report" && (
          <div style={styles.adminSection}>
            <div style={styles.sectionTitle}>
              🚨 신고 관리
            </div>

            <ReportAdminPage />
          </div>
        )}

        {activeTab ===
          "analytics" && (
          <div style={styles.adminSection}>
            <div style={styles.sectionTitle}>
              📈 분석 / 통계
            </div>

            <AdminAnalyticsPage />
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

function Card({
  title,
  value,
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        {title}
      </div>

      <div style={styles.cardValue}>
        {value ?? 0}
      </div>
    </div>
  );
}

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
            key={
              item?._id ||
              item?.id ||
              item?.shopId ||
              idx
            }
            style={styles.item}
          >
            {item?.name ||
              item?.shopName ||
              item?.title ||
              item?.email ||
              item?._id ||
              "데이터"}
          </div>
        )
      )}
    </div>
  );
}

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
