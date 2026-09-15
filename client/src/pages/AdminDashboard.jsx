"use strict";

import React, {
  useEffect,
  useRef,
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
import TermsAdminPage from "./admin/TermsAdminPage";
import shopApi from "../services/shop.api";
import userApi from "../services/user.api";

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
      totalShopUsers: 0,
      totalAdmins: 0,
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

const DASHBOARD_CACHE_KEY =
  "nora_admin_dashboard_cache";

const DASHBOARD_REQUEST_CACHE_MS =
  5000;

const DASHBOARD_SYNC_DEBOUNCE_MS =
  0;

const DASHBOARD_LOAD_RELEASE_MS =
  800;

const dashboardRequestCache =
  new Map();

const shopSnapshotRequestCache =
  new Map();

function clearDashboardRequestCaches() {
  dashboardRequestCache.clear();
  shopSnapshotRequestCache.clear();
}

function getDashboardCacheKey(category) {
  const normalizedCategory =
    normalizeDashboardCategory(category) ||
    getDashboardCategory();

  return normalizedCategory
    ? `${DASHBOARD_CACHE_KEY}_${normalizedCategory}`
    : DASHBOARD_CACHE_KEY;
}

function getCachedDashboardData(category) {
  try {
    if (
      typeof window === "undefined" ||
      !window.localStorage
    ) {
      return EMPTY_DASHBOARD_DATA;
    }

    const cached =
      window.localStorage.getItem(
        getDashboardCacheKey(category)
      ) ||
      window.localStorage.getItem(
        DASHBOARD_CACHE_KEY
      );

    const parsed =
      parseStoredJson(cached);

    if (
      parsed &&
      parsed.summary &&
      parsed.recent
    ) {
      return {
        ...parsed,
        summary: {
          ...parsed.summary,
          totalShops: 0,
        },
        recent: {
          ...parsed.recent,
          shops: [],
        },
      };
    }

    return EMPTY_DASHBOARD_DATA;
  } catch {
    return EMPTY_DASHBOARD_DATA;
  }
}

function setCachedDashboardData(value, category) {
  try {
    if (
      typeof window === "undefined" ||
      !window.localStorage ||
      !value
    ) {
      return;
    }

    const normalizedCategory =
      normalizeDashboardCategory(category) ||
      getDashboardCategory();

    window.localStorage.setItem(
      getDashboardCacheKey(normalizedCategory),
      JSON.stringify(value)
    );

    if (!normalizedCategory) {
      window.localStorage.setItem(
        DASHBOARD_CACHE_KEY,
        JSON.stringify(value)
      );
    }
  } catch {
    return;
  }
}

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

function hasDashboardShopData(value) {
  return (
    value &&
    value.summary &&
    (
      toNumber(value.summary.totalShops, 0) > 0 ||
      toArray(value.recent?.shops).length > 0
    )
  );
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

    if (
      path === "/admin/dashboard" ||
      path === "/admin/dashboard/"
    ) {
      return "massage";
    }

    return "";
  } catch (e) {
    console.warn(
      "ADMIN DASHBOARD CATEGORY ERROR:",
      e.message
    );

    return "";
  }
}

function createDashboardUrl(category) {
  const normalizedCategory =
    normalizeDashboardCategory(category);

  if (!normalizedCategory) {
    return `${API_BASE}/admin/dashboard`;
  }

  const query =
    new URLSearchParams({
      category: normalizedCategory,
      shopCategory: normalizedCategory,
      serviceType: normalizedCategory,
      businessType: normalizedCategory,
      adminCategory: normalizedCategory,
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

function getShopIdentity(item = {}) {
  const name = normalizeDeletedShopIdentity(
    item.name ||
      item.shopName ||
      item.title ||
      ""
  );

  const address = normalizeDeletedShopIdentity(
    item.address ||
      item.roadAddress ||
      item.fullAddress ||
      ""
  );

  const nameAddressKey =
    name && address
      ? `name-address:${name}:${address}`
      : "";

  return String(
    item._id ||
      item.id ||
      item.shopId ||
      item.uuid ||
      item.slug ||
      nameAddressKey ||
      JSON.stringify(item)
  );
}

function getDashboardDeletedShopKeys(category) {
  const normalizedCategory =
    normalizeDashboardCategory(category);

  const keys = [
    "nora_deleted_shop_ids",
    "noma_deleted_shop_ids",
  ];

  if (normalizedCategory) {
    keys.push(
      `nora_deleted_shop_ids_${normalizedCategory}`,
      `noma_deleted_shop_ids_${normalizedCategory}`
    );
  }

  return keys;
}

function normalizeDeletedShopIdentity(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s/g, "")
    .trim();
}

function isSafeDashboardDeletedShopIdentityValue(value) {
  const text =
    String(value || "").trim();

  if (!text) {
    return false;
  }

  if (
    text.startsWith("name:") ||
    text.startsWith("phone:") ||
    text.startsWith("address:") ||
    text.startsWith("name-address:") ||
    text.startsWith("nameAddress:") ||
    text.includes("::")
  ) {
    return false;
  }

  if (/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(text)) {
    return false;
  }

  const plainText =
    text
      .replace(/^id:/, "")
      .replace(/^shopId:/, "")
      .replace(/^uuid:/, "")
      .trim();

  if (
    plainText.startsWith("local-shop-") ||
    plainText.startsWith("local-noma-") ||
    plainText.startsWith("local-nora-") ||
    plainText.startsWith("local-massage-shop-") ||
    plainText.startsWith("local-karaoke-shop-")
  ) {
    return true;
  }

  if (/^[a-f0-9]{24}$/i.test(plainText)) {
    return true;
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plainText)) {
    return true;
  }

  return false;
}

function readDashboardDeletedShopIds(category) {
  try {
    if (
      typeof window === "undefined" ||
      !window.localStorage
    ) {
      return [];
    }

    const values = [];

    getDashboardDeletedShopKeys(category).forEach((key) => {
      [window.localStorage, window.sessionStorage].forEach((storage) => {
        if (!storage) {
          return;
        }

        const parsed =
          parseStoredJson(
            storage.getItem(key)
          );

        if (Array.isArray(parsed)) {
          values.push(...parsed);
        }
      });
    });

    return Array.from(
      new Set(
        values
          .filter((item) =>
            isSafeDashboardDeletedShopIdentityValue(item)
          )
          .flatMap((item) => [
            String(item || "").trim(),
            normalizeDeletedShopIdentity(item),
          ])
          .filter(Boolean)
      )
    );
  } catch {
    return [];
  }
}

function getDashboardShopDeleteIdentityValues(item = {}) {
  const id =
    String(item?._id || item?.id || "").trim();

  const shopId =
    String(item?.shopId || "").trim();

  const uuid =
    String(item?.uuid || "").trim();

  return Array.from(
    new Set(
      [
        id,
        id ? `id:${id}` : "",
        shopId,
        shopId ? `shopId:${shopId}` : "",
        uuid,
        uuid ? `uuid:${uuid}` : "",
      ]
        .flatMap((value) => [
          String(value || "").trim(),
          normalizeDeletedShopIdentity(value),
        ])
        .filter(Boolean)
    )
  );
}

function isDeletedShop(item = {}, category = "") {
  if (
    item.isDeleted === true ||
    item.deleted === true ||
    item.removed === true
  ) {
    return true;
  }

  const deletedIds =
    readDashboardDeletedShopIds(category);

  if (!deletedIds.length) {
    return false;
  }

  const deletedSet =
    new Set(deletedIds);

  return getDashboardShopDeleteIdentityValues(item)
    .some((value) => deletedSet.has(value));
}

const HIDDEN_DASHBOARD_SHOP_NAMES = [];

function normalizeDashboardShopName(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[()\[\]{}"'`~!@#$%^&*_=+\\|;:,./?<>-]/g, "")
    .toLowerCase()
    .trim();
}

function getDashboardItemText(item = {}) {
  if (
    typeof item === "string" ||
    typeof item === "number"
  ) {
    return String(item);
  }

  if (
    !item ||
    typeof item !== "object"
  ) {
    return "";
  }

  return (
    item?.name ||
    item?.shopName ||
    item?.title ||
    item?.displayName ||
    item?.label ||
    item?.storeName ||
    item?.businessName ||
    item?.companyName ||
    item?.shop?.name ||
    item?.shop?.shopName ||
    item?.data?.name ||
    item?.data?.shopName ||
    item?.email ||
    item?._id ||
    ""
  );
}

function isHiddenDashboardShop(item = {}) {
  const text =
    normalizeDashboardShopName(
      getDashboardItemText(item)
    );

  if (!text) {
    return false;
  }

  return HIDDEN_DASHBOARD_SHOP_NAMES
    .map((name) =>
      normalizeDashboardShopName(name)
    )
    .some(
      (hiddenName) =>
        text === hiddenName ||
        text.includes(hiddenName) ||
        hiddenName.includes(text)
    );
}

function getDashboardShopCategory(item = {}) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return "";
  }

  const identityCategory =
    normalizeDashboardCategory(
      getDashboardItemText(item)
    );

  if (identityCategory === "karaoke") {
    return "karaoke";
  }

  return (
    normalizeDashboardCategory(item.category) ||
    normalizeDashboardCategory(item.shopCategory) ||
    normalizeDashboardCategory(item.serviceType) ||
    normalizeDashboardCategory(item.businessType) ||
    normalizeDashboardCategory(item.adminCategory) ||
    normalizeDashboardCategory(item.type) ||
    normalizeDashboardCategory(item.categoryGroup) ||
    normalizeDashboardCategory(item.shop?.category) ||
    normalizeDashboardCategory(item.shop?.shopCategory) ||
    normalizeDashboardCategory(item.data?.category) ||
    normalizeDashboardCategory(item.data?.shopCategory) ||
    identityCategory ||
    ""
  );
}

function isSameDashboardShopCategory(item = {}, category = "") {
  const normalizedCategory =
    normalizeDashboardCategory(category) ||
    getDashboardCategory();

  if (!normalizedCategory) {
    return true;
  }

  const shopCategory =
    getDashboardShopCategory(item);

  if (shopCategory) {
    return shopCategory === normalizedCategory;
  }

  const textCategory =
    normalizeDashboardCategory(
      getDashboardItemText(item)
    );

  if (textCategory) {
    return textCategory === normalizedCategory;
  }

  return normalizedCategory === "massage";
}

function sanitizeRecentDashboardShops(items, category = "") {
  const uniqueMap =
    new Map();

  toArray(items).forEach((item) => {
    if (
      item &&
      typeof item === "object" &&
      isSameDashboardShopCategory(item, category) &&
      item.isDeleted !== true &&
      item.deleted !== true &&
      item.removed !== true &&
      !isHiddenDashboardShop(item)
    ) {
      uniqueMap.set(
        getShopIdentity(item),
        item
      );
    }
  });

  return Array.from(
    uniqueMap.values()
  );
}

function buildAdminShopParams(category) {
  const normalizedCategory =
    normalizeDashboardCategory(category);

  return {
    ...(normalizedCategory
      ? {
          category: normalizedCategory,
          shopCategory: normalizedCategory,
          serviceType: normalizedCategory,
          businessType: normalizedCategory,
          adminCategory: normalizedCategory,
        }
      : {}),
    admin: "true",
    adminMode: "true",
    adminList: "true",
    forAdmin: "true",
    fromAdmin: "true",
    management: "true",
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

function normalizeDashboardUsersResponse(response) {
  const payload =
    response &&
    typeof response === "object" &&
    !Array.isArray(response)
      ? response
      : {};

  const nestedPayload =
    payload?.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
      ? payload.data
      : {};

  const users =
    Array.isArray(payload.users)
      ? payload.users
      : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.list)
      ? payload.list
      : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(nestedPayload.users)
      ? nestedPayload.users
      : Array.isArray(nestedPayload.items)
      ? nestedPayload.items
      : Array.isArray(nestedPayload.list)
      ? nestedPayload.list
      : Array.isArray(nestedPayload.data)
      ? nestedPayload.data
      : Array.isArray(response)
      ? response
      : [];

  return {
    ...payload,
    users,
    total: toNumber(
      payload.total ??
        payload.userCount ??
        payload.totalUsers ??
        payload.count ??
        nestedPayload.total ??
        nestedPayload.userCount ??
        nestedPayload.totalUsers ??
        nestedPayload.count,
      users.length
    ),
  };
}

function getDashboardUserIdentity(item = {}) {
  return String(
    item._id ||
      item.id ||
      item.userId ||
      item.email ||
      item.phone ||
      item.nickname ||
      item.name ||
      JSON.stringify(item)
  );
}

function getDashboardUserText(item = {}) {
  if (
    typeof item === "string" ||
    typeof item === "number"
  ) {
    return String(item);
  }

  if (
    !item ||
    typeof item !== "object"
  ) {
    return "";
  }

  return (
    item.nickname ||
    item.name ||
    item.email ||
    item.phone ||
    item.id ||
    item._id ||
    ""
  );
}

function sanitizeRecentDashboardUsers(items) {
  const uniqueMap =
    new Map();

  toArray(items).forEach((item) => {
    if (
      item &&
      typeof item === "object"
    ) {
      uniqueMap.set(
        getDashboardUserIdentity(item),
        item
      );
    }
  });

  return Array.from(
    uniqueMap.values()
  );
}

async function fetchUserDashboardSnapshot(
  category = getDashboardCategory()
) {
  try {
    if (
      !userApi ||
      typeof userApi.getList !== "function"
    ) {
      return {
        ok: false,
        totalUsers: 0,
        totalShopUsers: 0,
        totalAdmins: 0,
        users: [],
      };
    }

    const response =
      await userApi.getList();

    const normalized =
      normalizeDashboardUsersResponse(
        response
      );

    const users =
      sanitizeRecentDashboardUsers(
        normalized.users
      );

    const normalizedCategory =
      normalizeDashboardCategory(
        category
      ) ||
      getDashboardCategory();

    const getUserRole = (user = {}) =>
      String(
        user?.role ||
          user?.userRole ||
          user?.type ||
          "user"
      )
        .trim()
        .toLowerCase();

    const getUserServiceType = (user = {}) =>
      String(
        user?.serviceType ||
          "general"
      )
        .trim()
        .toLowerCase();

    const dashboardUsers =
      users.filter((user) => {
        if (
          getUserRole(user) !== "user"
        ) {
          return false;
        }

        const serviceType =
          getUserServiceType(user);

        if (
          normalizedCategory ===
          "karaoke"
        ) {
          return (
            serviceType ===
            "karaoke"
          );
        }

        if (
          normalizedCategory ===
          "massage"
        ) {
          return (
            serviceType !==
            "karaoke"
          );
        }

        return true;
      });

    const totalUsers =
      dashboardUsers.length;

    const totalShopUsers =
      users.filter((user) => {
        if (
          getUserRole(user) !== "shop"
        ) {
          return false;
        }

        const serviceType =
          getUserServiceType(user);

        if (
          normalizedCategory ===
          "karaoke"
        ) {
          return (
            serviceType ===
            "karaoke"
          );
        }

        if (
          normalizedCategory ===
          "massage"
        ) {
          return (
            serviceType !==
            "karaoke"
          );
        }

        return true;
      }).length;

    const totalAdmins =
      users.filter((user) => {
        const role =
          getUserRole(user);

        const isAdminRole =
          role === "admin" ||
          role === "superadmin" ||
          role === "super_admin";

        if (!isAdminRole) {
          return false;
        }

        const serviceType =
          getUserServiceType(user);

        if (
          normalizedCategory ===
          "karaoke"
        ) {
          return (
            serviceType ===
            "karaoke"
          );
        }

        if (
          normalizedCategory ===
          "massage"
        ) {
          return (
            serviceType !==
            "karaoke"
          );
        }

        return true;
      }).length;

    return {
      ok: true,
      totalUsers,
      totalShopUsers,
      totalAdmins,
      users:
        dashboardUsers,
    };
  } catch (e) {
    const message =
      String(e?.message || "");

    if (
      e?.name !== "AbortError" &&
      !message.toLowerCase().includes("aborted")
    ) {
      console.error(
        "ADMIN USER SNAPSHOT ERROR:",
        e.message
      );
    }

    return {
      ok: false,
      totalUsers: 0,
      totalShopUsers: 0,
      totalAdmins: 0,
      users: [],
    };
  }
}

function mergeUserSnapshotIntoDashboard(dashboardData, userSnapshot) {
  const safeDashboard =
    dashboardData ||
    EMPTY_DASHBOARD_DATA;

  const snapshotUsers =
    sanitizeRecentDashboardUsers(
      toArray(userSnapshot?.users)
    );

  const currentUsers =
    sanitizeRecentDashboardUsers(
      toArray(safeDashboard?.recent?.users)
    );

  const nextUsers =
    userSnapshot?.ok === true
      ? snapshotUsers
      : snapshotUsers.length > 0
        ? snapshotUsers
        : currentUsers;

  const nextTotalUsers =
    userSnapshot?.ok === true
      ? toNumber(
          userSnapshot.totalUsers,
          0
        )
      : toNumber(
          safeDashboard?.summary?.totalUsers,
          0
        );

  const nextTotalShopUsers =
    userSnapshot?.ok === true
      ? toNumber(
          userSnapshot.totalShopUsers,
          0
        )
      : toNumber(
          safeDashboard?.summary?.totalShopUsers,
          0
        );

  const nextTotalAdmins =
    userSnapshot?.ok === true
      ? toNumber(
          userSnapshot.totalAdmins,
          0
        )
      : toNumber(
          safeDashboard?.summary?.totalAdmins,
          0
        );

  return {
    ...safeDashboard,
    summary: {
      ...EMPTY_DASHBOARD_DATA.summary,
      ...(safeDashboard.summary || {}),
      totalUsers:
        nextTotalUsers,
      totalShopUsers:
        nextTotalShopUsers,
      totalAdmins:
        nextTotalAdmins,
    },
    recent: {
      ...EMPTY_DASHBOARD_DATA.recent,
      ...(safeDashboard.recent || {}),
      users:
        nextUsers,
    },
  };
}

function getDashboardRequestCacheKey(prefix, category) {
  return [
    prefix,
    normalizeDashboardCategory(category) ||
      "all",
  ].join("|");
}

function getCachedRequest(map, key) {
  const cached =
    map.get(key);

  if (
    cached &&
    cached.promise &&
    Date.now() - cached.time <
      DASHBOARD_REQUEST_CACHE_MS
  ) {
    return cached.promise;
  }

  if (cached) {
    map.delete(key);
  }

  return null;
}

function setCachedRequest(map, key, promise) {
  map.set(key, {
    promise,
    time: Date.now(),
  });

  promise.finally(() => {
    const cached =
      map.get(key);

    if (
      cached &&
      cached.promise === promise &&
      Date.now() - cached.time >=
        DASHBOARD_REQUEST_CACHE_MS
    ) {
      map.delete(key);
    }
  });

  return promise;
}

async function fetchShopDashboardSnapshot(category) {
  const cacheKey =
    getDashboardRequestCacheKey(
      "shops",
      category
    );

  const cachedRequest =
    getCachedRequest(
      shopSnapshotRequestCache,
      cacheKey
    );

  if (cachedRequest) {
    return cachedRequest;
  }

  const requestPromise =
    (async () => {
      try {
        if (
          !shopApi ||
          typeof shopApi.getList !== "function"
        ) {
          return {
            ok: false,
            totalShops: 0,
            shops: [],
          };
        }

        const response =
          await shopApi.getList(
            buildAdminShopParams(category)
          );

        const normalized =
          normalizeShopSnapshotResponse(
            response
          );

        const shops =
          sanitizeRecentDashboardShops(
            [
              ...toArray(normalized.shops),
              ...toArray(normalized.items),
              ...toArray(normalized.list),
              ...toArray(normalized.data),
            ],
            category
          );

        return {
          ok: true,
          totalShops:
            shops.length,
          shops,
        };
      } catch (e) {
        const message =
          String(e?.message || "");

        if (
          e?.name !== "AbortError" &&
          !message.toLowerCase().includes("aborted")
        ) {
          console.error(
            "ADMIN SHOP SNAPSHOT ERROR:",
            e.message
          );
        }

        return {
          ok: false,
          totalShops: 0,
          shops: [],
        };
      }
    })();

  return setCachedRequest(
    shopSnapshotRequestCache,
    cacheKey,
    requestPromise
  );
}

function mergeShopSnapshotIntoDashboard(dashboardData, shopSnapshot) {
  const safeDashboard =
    dashboardData ||
    EMPTY_DASHBOARD_DATA;

  const snapshotShops =
    sanitizeRecentDashboardShops(
      toArray(shopSnapshot?.shops),
      getDashboardCategory()
    );

  const hasSnapshot =
    shopSnapshot?.ok === true &&
    Array.isArray(shopSnapshot.shops) &&
    snapshotShops.length > 0;

  const nextShops =
    hasSnapshot
      ? snapshotShops
      : sanitizeRecentDashboardShops(
          toArray(safeDashboard?.recent?.shops),
          getDashboardCategory()
        );

  return {
    ...safeDashboard,
    summary: {
      ...EMPTY_DASHBOARD_DATA.summary,
      ...(safeDashboard.summary || {}),
      totalShops:
        nextShops.length,
    },
    recent: {
      ...EMPTY_DASHBOARD_DATA.recent,
      ...(safeDashboard.recent || {}),
      shops:
        nextShops,
    },
  };
}

function readDashboardStorageArray(storage, key) {
  try {
    if (!storage || !key) {
      return [];
    }

    const parsed =
      parseStoredJson(
        storage.getItem(key)
      );

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function getDashboardShopStorageKeys(category) {
  const normalizedCategory =
    normalizeDashboardCategory(category) ||
    getDashboardCategory();

  const baseKeys = [
    "nora_admin_shops",
    "nora_local_shops",
    "nora_admin_shop_backup",
    "noma_admin_shops",
    "noma_local_shops",
    "noma_admin_shop_backup",
  ];

  if (!normalizedCategory) {
    return Array.from(
      new Set([
        ...baseKeys,
        "nora_admin_shops_massage",
        "nora_local_shops_massage",
        "nora_admin_shop_backup_massage",
        "noma_admin_shops_massage",
        "noma_local_shops_massage",
        "noma_admin_shop_backup_massage",
        "nora_admin_shops_karaoke",
        "nora_local_shops_karaoke",
        "nora_admin_shop_backup_karaoke",
        "noma_admin_shops_karaoke",
        "noma_local_shops_karaoke",
        "noma_admin_shop_backup_karaoke",
      ])
    );
  }

  return Array.from(
    new Set([
      ...baseKeys,
      `nora_admin_shops_${normalizedCategory}`,
      `nora_local_shops_${normalizedCategory}`,
      `nora_admin_shop_backup_${normalizedCategory}`,
      `noma_admin_shops_${normalizedCategory}`,
      `noma_local_shops_${normalizedCategory}`,
      `noma_admin_shop_backup_${normalizedCategory}`,
    ])
  );
}

function getDashboardStoredShopItems(category) {
  try {
    if (
      typeof window === "undefined" ||
      !window.localStorage
    ) {
      return [];
    }

    return sanitizeRecentDashboardShops(
      getDashboardShopStorageKeys(category)
        .flatMap((key) => [
          ...readDashboardStorageArray(
            window.localStorage,
            key
          ),
          ...readDashboardStorageArray(
            window.sessionStorage,
            key
          ),
        ]),
      category
    );
  } catch {
    return [];
  }
}

function buildDashboardWithShops(dashboardData, shops, category) {
  const safeDashboard =
    dashboardData ||
    EMPTY_DASHBOARD_DATA;

  const nextShops =
    sanitizeRecentDashboardShops(
      shops,
      category
    );

  return {
    ...safeDashboard,
    summary: {
      ...EMPTY_DASHBOARD_DATA.summary,
      ...(safeDashboard.summary || {}),
      totalShops:
        nextShops.length,
    },
    recent: {
      ...EMPTY_DASHBOARD_DATA.recent,
      ...(safeDashboard.recent || {}),
      shops:
        nextShops,
    },
  };
}

async function fetchDashboard(category) {
  const cacheKey =
    getDashboardRequestCacheKey(
      "dashboard",
      category
    );

  const cachedRequest =
    getCachedRequest(
      dashboardRequestCache,
      cacheKey
    );

  if (cachedRequest) {
    return cachedRequest;
  }

  const requestPromise =
    (async () => {
      let timeout = null;

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

        timeout =
          setTimeout(() => {
            controller.abort();
          }, 1500);

        const res = await fetch(
          createDashboardUrl(category),
          {
            method: "GET",
            headers,
            credentials:
              "include",
            cache: "default",
            signal:
              controller.signal,
          }
        );

        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }

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
            res.status === 404 ||
            res.status === 429
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
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }

        const message =
          String(e?.message || "");

        if (
          e?.name === "AbortError" ||
          message.toLowerCase().includes("aborted")
        ) {
          return EMPTY_DASHBOARD_DATA;
        }

        console.error(
          "ADMIN DASHBOARD FETCH ERROR:",
          e.message
        );

        const fallbackSnapshot =
          await fetchShopDashboardSnapshot(
            category
          );

        return mergeShopSnapshotIntoDashboard(
          EMPTY_DASHBOARD_DATA,
          fallbackSnapshot
        );
      }
    })();

  return setCachedRequest(
    dashboardRequestCache,
    cacheKey,
    requestPromise
  );
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

  const serverRecentShops =
    sanitizeRecentDashboardShops(
      toArray(
        recent.shops ||
          normalized.recentShops ||
          normalized.shops ||
          normalized.items ||
          normalized.list ||
          normalized.data?.shops ||
          normalized.data?.items ||
          normalized.data?.list
      ),
      category
    );

  const effectiveTotalShops =
    serverRecentShops.length;

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
            stats.totalUsers ??
            normalized.totalUsers ??
            normalized.users,
          EMPTY_DASHBOARD_DATA.summary.totalUsers
        ),

      totalReservations:
        toNumber(
          summary.totalReservations ??
            stats.reservations ??
            stats.totalReservations ??
            normalized.totalReservations ??
            normalized.reservations,
          EMPTY_DASHBOARD_DATA.summary.totalReservations
        ),

      totalPayments:
        toNumber(
          summary.totalPayments ??
            stats.payments ??
            stats.totalPayments ??
            normalized.totalPayments ??
            normalized.payments,
          EMPTY_DASHBOARD_DATA.summary.totalPayments
        ),

      totalRevenue:
        toNumber(
          summary.totalRevenue ??
            stats.revenue ??
            stats.totalRevenue ??
            normalized.totalRevenue ??
            normalized.revenue,
          EMPTY_DASHBOARD_DATA.summary.totalRevenue
        ),
    },

    recent: {
      ...EMPTY_DASHBOARD_DATA.recent,
      ...recent,

      shops:
        serverRecentShops,
    },
  };
}

function AdminDashboard() {
  const dashboardLoadKeyRef =
    useRef("");

  const dashboardLoadRunningRef =
    useRef(false);

  const dashboardSyncTimerRef =
    useRef(null);

  const [data, setData] =
    useState(() =>
      getCachedDashboardData()
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [initialized, setInitialized] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("dashboard");

  const dashboardLocationKey =
    typeof window !== "undefined"
      ? [
          window.location.pathname || "",
          window.location.search || "",
          getDashboardCategory(),
        ].join("|")
      : "server";

  const applyDashboardShopsNow = (shops, category = getDashboardCategory()) => {
    const nextShops =
      sanitizeRecentDashboardShops(
        shops,
        category
      );

    setData((prevData) => {
      const safeData =
        prevData ||
        getCachedDashboardData(category) ||
        EMPTY_DASHBOARD_DATA;

      const currentShops =
        sanitizeRecentDashboardShops(
          safeData?.recent?.shops,
          category
        );

      const finalShops =
        nextShops.length > 0 ||
        currentShops.length === 0
          ? nextShops
          : currentShops;

      const nextDashboard =
        buildDashboardWithShops(
          safeData,
          finalShops,
          category
        );

      setCachedDashboardData(
        nextDashboard,
        category
      );

      return nextDashboard;
    });

    setInitialized(true);
    setLoading(false);
    setError("");

    return nextShops.length;
  };

  const refreshDashboardShopsNow = async () => {
    const dashboardCategory =
      getDashboardCategory();

    clearDashboardRequestCaches();

    try {
      const shopSnapshot =
        await fetchShopDashboardSnapshot(
          dashboardCategory
        );

      if (
        shopSnapshot?.ok === true &&
        Array.isArray(shopSnapshot.shops)
      ) {
        applyDashboardShopsNow(
          shopSnapshot.shops,
          dashboardCategory
        );
      }

      const userSnapshot =
        await fetchUserDashboardSnapshot(
          dashboardCategory
        );

      if (
        userSnapshot?.ok === true &&
        Array.isArray(userSnapshot.users)
      ) {
        setData((prevData) => {
          const nextDashboard =
            mergeUserSnapshotIntoDashboard(
              prevData ||
                getCachedDashboardData(
                  dashboardCategory
                ),
              userSnapshot
            );

          setCachedDashboardData(
            nextDashboard,
            dashboardCategory
          );

          return nextDashboard;
        });
      }
    } catch (e) {
      const message =
        String(e?.message || "");

      if (
        e?.name !== "AbortError" &&
        !message.toLowerCase().includes("aborted")
      ) {
        console.error(
          "ADMIN DASHBOARD IMMEDIATE SHOP SYNC ERROR:",
          e.message
        );
      }
    }
  };

  const openDashboardTab = () => {
    setActiveTab(
      "dashboard"
    );

    refreshDashboardShopsNow();
  };

  const load = async () => {
    if (
      dashboardLoadRunningRef.current
    ) {
      return;
    }

    dashboardLoadRunningRef.current =
      true;

    try {
      setError("");

      const dashboardCategory =
        getDashboardCategory();

      const cachedDashboard =
        getCachedDashboardData(
          dashboardCategory
        );

      if (
        hasDashboardShopData(
          cachedDashboard
        ) ||
        initialized
      ) {
        setData(
          cachedDashboard
        );
      }

      setInitialized(true);

      setLoading(
        !hasDashboardShopData(
          cachedDashboard
        )
      );

      fetchShopDashboardSnapshot(
        dashboardCategory
      )
        .then((shopSnapshot) => {
          const shopDashboard =
            mergeShopSnapshotIntoDashboard(
              getCachedDashboardData(
                dashboardCategory
              ),
              shopSnapshot
            );

          setData(
            shopDashboard
          );

          setLoading(false);

          setCachedDashboardData(
            shopDashboard,
            dashboardCategory
          );

          return Promise.all([
            fetchDashboard(
              dashboardCategory
            ),
            fetchUserDashboardSnapshot(
              dashboardCategory
            ),
          ]).then(([res, userSnapshot]) => ({
            res,
            shopSnapshot,
            userSnapshot,
          }));
        })
        .then(({ res, shopSnapshot, userSnapshot }) => {
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

          const shopMergedDashboard =
            mergeShopSnapshotIntoDashboard(
              normalizedDashboard,
              shopSnapshot
            );

          const mergedDashboard =
            mergeUserSnapshotIntoDashboard(
              shopMergedDashboard,
              userSnapshot
            );

          setData(
            mergedDashboard
          );

          setLoading(false);

          setCachedDashboardData(
            mergedDashboard,
            dashboardCategory
          );
        })
        .catch((e) => {
          const message =
            String(e?.message || "");

          if (
            e?.name !== "AbortError" &&
            !message.toLowerCase().includes("aborted")
          ) {
            console.error(
              "ADMIN DASHBOARD BACKGROUND LOAD ERROR:",
              e.message
            );
          }
        })
        .finally(() => {
          if (typeof window !== "undefined") {
            window.setTimeout(() => {
              dashboardLoadRunningRef.current =
                false;
            }, DASHBOARD_LOAD_RELEASE_MS);
          } else {
            dashboardLoadRunningRef.current =
              false;
          }
        });
    } catch (e) {
      dashboardLoadRunningRef.current =
        false;

      const message =
        String(e?.message || "");

      if (
        e?.name !== "AbortError" &&
        !message.toLowerCase().includes("aborted")
      ) {
        console.error(
          "ADMIN DASHBOARD LOAD ERROR:",
          e.message
        );
      }

      setData(
        getCachedDashboardData(
          getDashboardCategory()
        )
      );

      setInitialized(true);

      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      dashboardLoadKeyRef.current ===
        dashboardLocationKey &&
      initialized
    ) {
      return;
    }

    dashboardLoadKeyRef.current =
      dashboardLocationKey;

    load();
  }, [initialized, dashboardLocationKey]);

  useEffect(() => {
    if (
      typeof window === "undefined"
    ) {
      return undefined;
    }

    const getEventCategory = (event) => {
      const detail =
        event?.detail ||
        {};

      return (
        normalizeDashboardCategory(
          detail.category
        ) ||
        normalizeDashboardCategory(
          detail.shopCategory
        ) ||
        normalizeDashboardCategory(
          detail.serviceType
        ) ||
        normalizeDashboardCategory(
          detail.businessType
        ) ||
        normalizeDashboardCategory(
          detail.adminCategory
        ) ||
        getDashboardCategory()
      );
    };

    const getEventShops = (event) => {
      const detail =
        event?.detail ||
        {};

      if (Array.isArray(detail.shops)) {
        return detail.shops;
      }

      if (Array.isArray(detail.items)) {
        return detail.items;
      }

      if (Array.isArray(detail.list)) {
        return detail.list;
      }

      if (Array.isArray(detail.data)) {
        return detail.data;
      }

      return null;
    };

    const applyDashboardShopEvent = (event) => {
      const eventShops =
        getEventShops(event);

      if (!Array.isArray(eventShops)) {
        return false;
      }

      const currentCategory =
        getDashboardCategory();

      const eventCategory =
        getEventCategory(event);

      if (
        eventCategory &&
        currentCategory &&
        eventCategory !== currentCategory
      ) {
        return false;
      }

      applyDashboardShopsNow(
        eventShops,
        currentCategory
      );

      return true;
    };

    const scheduleDashboardShopSync = (delay = DASHBOARD_SYNC_DEBOUNCE_MS) => {
      clearDashboardRequestCaches();

      if (dashboardSyncTimerRef.current) {
        window.clearTimeout(
          dashboardSyncTimerRef.current
        );
      }

      dashboardSyncTimerRef.current =
        window.setTimeout(() => {
          dashboardSyncTimerRef.current =
            null;

          refreshDashboardShopsNow();
        }, delay);
    };

    const handleDashboardShopSync = (event) => {
      const applied =
        applyDashboardShopEvent(event);

      scheduleDashboardShopSync(
        applied
          ? 0
          : 50
      );
    };

    const handleDashboardStorageSync = (event) => {
      const key =
        String(event?.key || "");

      if (
        !key ||
        (
          !key.includes("shop") &&
          !key.includes("deleted") &&
          !key.includes("dashboard")
        )
      ) {
        return;
      }

      scheduleDashboardShopSync(50);
    };

    window.addEventListener(
      "shops-updated",
      handleDashboardShopSync
    );

    window.addEventListener(
      "karaoke-shops-updated",
      handleDashboardShopSync
    );

    window.addEventListener(
      "storage",
      handleDashboardStorageSync
    );

    return () => {
      if (dashboardSyncTimerRef.current) {
        window.clearTimeout(
          dashboardSyncTimerRef.current
        );
      }

      window.removeEventListener(
        "shops-updated",
        handleDashboardShopSync
      );

      window.removeEventListener(
        "karaoke-shops-updated",
        handleDashboardShopSync
      );

      window.removeEventListener(
        "storage",
        handleDashboardStorageSync
      );
    };
  }, []);

  useEffect(() => {
    if (
      activeTab !== "dashboard"
    ) {
      return;
    }

    refreshDashboardShopsNow();
  }, [activeTab, dashboardLocationKey]);

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
      sanitizeRecentDashboardShops(
        recent?.shops,
        getDashboardCategory()
      ),
    users:
      sanitizeRecentDashboardUsers(
        recent?.users
      ),
    reservations:
      recent?.reservations ||
      [],
  };

  const safeSummary = {
    ...summary,
    totalShops:
      safeRecent.shops.length,
    totalUsers:
      toNumber(
        summary?.totalUsers,
        0
      ),
    totalShopUsers:
      toNumber(
        summary?.totalShopUsers,
        0
      ),
    totalAdmins:
      toNumber(
        summary?.totalAdmins,
        0
      ),
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
            onClick={openDashboardTab}
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

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "terms"
              )
            }
            style={{
              ...styles.tabBtn,
              background:
                activeTab ===
                "terms"
                  ? "#d4af37"
                  : "#111",
              color:
                activeTab ===
                "terms"
                  ? "#000"
                  : "#fff",
            }}
          >
            약관관리
          </button>

        </div>

        {activeTab ===
          "dashboard" && (
          <>
            <div style={styles.grid}>
              <Card
                title="매장 수"
                value={
                  safeSummary.totalShops
                }
              />

              <Card
                title="유저 수"
                value={
                  safeSummary.totalUsers
                }
              />

              <Card
                title="업체 수"
                value={
                  safeSummary.totalShopUsers
                }
              />

              <Card
                title="관리자 수"
                value={
                  safeSummary.totalAdmins
                }
              />

              <Card
                title="예약 수"
                value={
                  safeSummary.totalReservations
                }
              />

              <Card
                title="결제 수"
                value={
                  safeSummary.totalPayments
                }
              />

              <Card
                title="총 매출"
                value={
                  safeSummary.totalRevenue
                }
              />
            </div>

            <div style={styles.section}>
              <h3>최근 매장</h3>

              <List
                items={
                  safeRecent.shops
                }
                category={
                  getDashboardCategory()
                }
                type="shops"
              />
            </div>

            <div style={styles.section}>
              <h3>최근 유저</h3>

              <List
                items={
                  safeRecent.users
                }
                category={
                  getDashboardCategory()
                }
                type="users"
              />
            </div>

            <div style={styles.section}>
              <h3>최근 예약</h3>

              <List
                items={
                  safeRecent.reservations
                }
                category={
                  getDashboardCategory()
                }
                type="reservations"
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

        {activeTab ===
          "terms" && (
          <div style={styles.adminSection}>
            <div style={styles.sectionTitle}>
              📜 약관 관리
            </div>

            <TermsAdminPage />
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
  category = "",
  type = "shops",
}) {
  const visibleItems =
    toArray(items).filter(
      (item) => {
        if (type === "users") {
          return !!item;
        }

        if (type === "reservations") {
          return !!item;
        }

        return (
          isSameDashboardShopCategory(item, category) &&
          item?.isDeleted !== true &&
          item?.deleted !== true &&
          item?.removed !== true &&
          !isHiddenDashboardShop(item)
        );
      }
    );

  if (
    !visibleItems ||
    visibleItems.length === 0
  ) {
    return (
      <EmptyState message="데이터 없음" />
    );
  }

  return (
    <div style={styles.list}>
      {visibleItems.map(
        (item, idx) => {
          const displayText =
            type === "users"
              ? getDashboardUserText(item) ||
                getDashboardItemText(item) ||
                "데이터"
              : getDashboardItemText(item) ||
                "데이터";

          if (
            type === "shops" &&
            isHiddenDashboardShop(item)
          ) {
            return null;
          }

          return (
            <div
              key={
                item?._id ||
                item?.id ||
                item?.shopId ||
                displayText ||
                idx
              }
              style={styles.item}
            >
              {displayText}
            </div>
          );
        }
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