"use strict";

function normalizeShopApiResponse(response) {
  const responseObject =
    response && typeof response === "object" && !Array.isArray(response)
      ? response
      : {};

  const nestedDataObject =
    responseObject?.data &&
    typeof responseObject.data === "object" &&
    !Array.isArray(responseObject.data)
      ? responseObject.data
      : {};

  const payload =
    Object.keys(responseObject).length > 0
      ? responseObject
      : nestedDataObject;

  const rawShops =
    Array.isArray(responseObject?.shops)
      ? responseObject.shops
      : Array.isArray(responseObject?.items)
      ? responseObject.items
      : Array.isArray(responseObject?.list)
      ? responseObject.list
      : Array.isArray(responseObject?.data)
      ? responseObject.data
      : Array.isArray(nestedDataObject?.shops)
      ? nestedDataObject.shops
      : Array.isArray(nestedDataObject?.items)
      ? nestedDataObject.items
      : Array.isArray(nestedDataObject?.list)
      ? nestedDataObject.list
      : Array.isArray(response)
      ? response
      : [];

  const shops = Array.isArray(rawShops)
    ? rawShops
    : [];

  return {
    ...payload,
    shops,
    items: Array.isArray(responseObject?.items)
      ? responseObject.items
      : Array.isArray(nestedDataObject?.items)
      ? nestedDataObject.items
      : shops,
    list: Array.isArray(responseObject?.list)
      ? responseObject.list
      : Array.isArray(nestedDataObject?.list)
      ? nestedDataObject.list
      : shops,
    data: Array.isArray(responseObject?.data)
      ? responseObject.data
      : Array.isArray(nestedDataObject?.data)
      ? nestedDataObject.data
      : shops,
    total: Number(
      responseObject?.total ??
      nestedDataObject?.total ??
      shops.length
    ),
  };
}

/**
 * =====================================================
 * SHOP API SERVICE
 * =====================================================
 */

const DEFAULT_API_BASE = "https://api.nora365.co.kr/api";
const LOCAL_DEFAULT_API_BASE = "http://localhost:10000/api";

function isBrowserLocalHost(hostname = "") {
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(
    String(hostname || "").toLowerCase()
  );
}

function isBrowserProductionHost(hostname = "") {
  const host = String(hostname || "").toLowerCase().trim();

  return (
    host === "nora365.co.kr" ||
    host === "www.nora365.co.kr" ||
    host === "m.nora365.co.kr" ||
    host.endsWith(".nora365.co.kr")
  );
}

function getCurrentHostname() {
  return typeof window !== "undefined" && window.location
    ? window.location.hostname
    : "";
}

function normalizeApiBaseUrl(value) {
  const rawValue = String(value || "").trim();
  const currentHostname = getCurrentHostname();

  if (isBrowserProductionHost(currentHostname)) {
    return DEFAULT_API_BASE;
  }

  const fallbackBase = isBrowserLocalHost(currentHostname)
    ? LOCAL_DEFAULT_API_BASE
    : DEFAULT_API_BASE;

  if (!rawValue || rawValue === "undefined" || rawValue === "null") {
    return fallbackBase;
  }

  if (isBrowserLocalHost(currentHostname) && rawValue === DEFAULT_API_BASE) {
    return LOCAL_DEFAULT_API_BASE;
  }

  if (rawValue.startsWith("/")) {
    return rawValue.replace(/\/api\/api\/?$/, "/api").replace(/\/+$/, "") || fallbackBase;
  }

  try {
    const url = new URL(
      rawValue,
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : DEFAULT_API_BASE
    );

    if (
      currentHostname &&
      !isBrowserLocalHost(currentHostname) &&
      isBrowserLocalHost(url.hostname)
    ) {
      return DEFAULT_API_BASE;
    }

    const fixedPathname = String(url.pathname || "")
      .replace(/\/api\/api\/?$/, "/api")
      .replace(/\/+$/, "");

    return `${url.origin}${fixedPathname || "/api"}`.replace("/api/api", "/api");
  } catch (e) {
    if (!isBrowserLocalHost(currentHostname)) {
      return DEFAULT_API_BASE;
    }

    return rawValue.replace("/api/api", "/api").replace(/\/+$/, "") || fallbackBase;
  }
}

const API_BASE_RAW =
  (typeof window !== "undefined" && window.__ENV__?.API_BASE_URL) ||
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) ||
  DEFAULT_API_BASE;

const API_BASE = normalizeApiBaseUrl(API_BASE_RAW);

function getRuntimeImageBaseCandidates() {
  const apiOrigin = getRuntimeApiBase().replace(/\/api\/?$/, "").replace(/\/+$/, "");
  const explicitCandidates = [
    String(typeof window !== "undefined" && window.__ENV__?.CDN_URL ? window.__ENV__.CDN_URL : "").trim(),
    String(typeof window !== "undefined" && window.__ENV__?.VITE_CDN_URL ? window.__ENV__.VITE_CDN_URL : "").trim(),
    String(typeof window !== "undefined" && window.__ENV__?.IMAGE_URL ? window.__ENV__.IMAGE_URL : "").trim(),
    String(typeof window !== "undefined" && window.__ENV__?.VITE_IMAGE_URL ? window.__ENV__.VITE_IMAGE_URL : "").trim(),
    String(typeof window !== "undefined" && window.__ENV__?.UPLOAD_URL ? window.__ENV__.UPLOAD_URL : "").trim(),
    String(typeof window !== "undefined" && window.__ENV__?.VITE_UPLOAD_URL ? window.__ENV__.VITE_UPLOAD_URL : "").trim(),
    String(typeof import.meta !== "undefined" && import.meta.env?.VITE_CDN_URL ? import.meta.env.VITE_CDN_URL : "").trim(),
    String(typeof import.meta !== "undefined" && import.meta.env?.VITE_IMAGE_URL ? import.meta.env.VITE_IMAGE_URL : "").trim(),
    String(typeof import.meta !== "undefined" && import.meta.env?.VITE_UPLOAD_URL ? import.meta.env.VITE_UPLOAD_URL : "").trim(),
  ]
    .map((item) => String(item || "").replace(/\/api\/?$/, "").replace(/\/+$/, ""))
    .filter(Boolean)
    .filter((item) => !isBrowserLocalHost(getCurrentHostname()) || !item.includes("localhost:5173"));

  return Array.from(new Set([apiOrigin, ...explicitCandidates].filter(Boolean))).slice(0, MAX_IMAGE_URL_CANDIDATES);
}
function getRuntimeApiBase() {
  const currentHostname = getCurrentHostname();

  if (isBrowserProductionHost(currentHostname)) {
    return DEFAULT_API_BASE;
  }

  return normalizeApiBaseUrl(API_BASE_RAW || API_BASE);
}

function buildApiRequestUrl(url = "") {
  const runtimeBase = getRuntimeApiBase().replace(/\/+$/, "");
  const path = String(url || "").startsWith("/")
    ? String(url || "")
    : `/${String(url || "")}`;

  return `${runtimeBase}${path}`.replace("/api/api", "/api");
}

function isApiBaseLocalHost() {
  try {
    const runtimeBase = getRuntimeApiBase();

    if (runtimeBase.startsWith("/")) {
      return isBrowserLocalHost(getCurrentHostname());
    }

    return isBrowserLocalHost(new URL(runtimeBase).hostname);
  } catch (e) {
    const runtimeBase = String(getRuntimeApiBase() || "");

    return runtimeBase.includes("localhost") || runtimeBase.includes("127.0.0.1");
  }
}

function disableProductionLocalhostServiceWorkerFallback() {
  try {
    if (
      typeof window === "undefined" ||
      !isBrowserProductionHost(getCurrentHostname()) ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().catch(() => {});
      });
    }).catch(() => {});

    if (window.caches && typeof window.caches.keys === "function") {
      window.caches.keys().then((keys) => {
        keys
          .filter((key) => String(key || "").toLowerCase().includes("localhost"))
          .forEach((key) => window.caches.delete(key).catch(() => {}));
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("SHOP API SERVICE WORKER CLEANUP ERROR:", e.message);
  }
}

disableProductionLocalhostServiceWorkerFallback();

const LOCAL_SHOP_STORAGE_KEY = "nora_local_shops";
const LOCAL_ADMIN_SHOP_STORAGE_KEY = "nora_admin_shops";
const LOCAL_SHOP_IMAGE_BANK_KEY = "nora_admin_shop_image_bank";
const LEGACY_NOMA_SHOP_IMAGE_BANK_KEY = "noma_admin_shop_image_bank";
const LOCAL_SHOP_PREMIUM_BANK_KEY = "nora_admin_shop_premium_bank";
const LEGACY_NOMA_SHOP_PREMIUM_BANK_KEY = "noma_admin_shop_premium_bank";
const SHOP_PREMIUM_BANK_STORAGE_KEYS = [
  LEGACY_NOMA_SHOP_PREMIUM_BANK_KEY,
  LOCAL_SHOP_PREMIUM_BANK_KEY,
  "noma_admin_shop_premium_bank_massage",
  "nora_admin_shop_premium_bank_massage",
  "noma_admin_shop_premium_bank_karaoke",
  "nora_admin_shop_premium_bank_karaoke",
];
const DELETED_SHOP_STORAGE_KEY = "nora_deleted_shop_ids";
const MUTATION_TIMEOUT_MS = 3000;
const SHOP_QUERY_TIMEOUT_MS = 3000;
const MAX_STORED_IMAGE_LENGTH = Number.POSITIVE_INFINITY;
const MAX_STORED_SHOPS = 80;
const MAX_SAFE_SHOP_IMAGE_COUNT = 12;
const KARAOKE_SHOP_IMAGE_COUNT = 4;
const SHOP_RATE_LIMIT_STORAGE_KEY = "nora_shop_api_rate_limit_cache";
const SHOP_RATE_LIMIT_CACHE_TTL_MS = 15000;
const MAX_IMAGE_URL_CANDIDATES = 1;

const FALLBACK_SHOPS = [];

const FALLBACK_STATS = {
  shops: FALLBACK_SHOPS.length,
  shopCount: FALLBACK_SHOPS.length,
  totalShops: FALLBACK_SHOPS.length,
  activeShops: FALLBACK_SHOPS.filter((shop) => shop.status === "active").length,
  inactiveShops: FALLBACK_SHOPS.filter((shop) => shop.status !== "active").length,
  users: 0,
  userCount: 0,
  reservations: 0,
  reservationCount: 0,
  payments: 0,
  paymentCount: 0,
  reviews: 0,
  reviewCount: 0,
  totalRevenue: 0,
  revenue: 0,
  sales: 0,
  totalSales: 0,
  monthly: [],
  items: [],
  list: [],
  data: [],
};

let AUTH_ALERT_LOCK = false;
let AUTH_REDIRECT_LOCK = false;
let LOCAL_SHOP_MEMORY = [];
let SHOP_EVENT_TIMER = null;
let SHOP_EVENT_KEY = "";

const SHOP_EVENT_THROTTLE_MS = 800;
const SHOP_GET_CACHE_TTL_MS = 5000;
const SHOP_REQUEST_CACHE_TTL_MS = 10000;
const SHOP_LIST_IN_FLIGHT = new Map();
const SHOP_LIST_CACHE = new Map();
const SHOP_REQUEST_IN_FLIGHT = new Map();
const SHOP_REQUEST_CACHE = new Map();
const SHOP_STATS_CACHE_TTL_MS = 10000;
const SHOP_STATS_IN_FLIGHT = new Map();
const SHOP_STATS_CACHE = new Map();

function getStableObjectKey(value = {}) {
  try {
    return JSON.stringify(
      Object.keys(value || {})
        .sort()
        .reduce((acc, key) => {
          const item = value[key];

          if (
            item !== undefined &&
            item !== null &&
            item !== "" &&
            key !== "_t" &&
            key !== "cacheBust" &&
            key !== "timestamp"
          ) {
            acc[key] = item;
          }

          return acc;
        }, {})
    );
  } catch (e) {
    return String(Date.now());
  }
}

function getStableRequestCacheKey(url = "", options = {}) {
  try {
    const method = String(options?.method || "GET").toUpperCase();
    const [path, queryText = ""] = String(url || "").split("?");
    const query = new URLSearchParams(queryText);

    ["_t", "cacheBust", "timestamp"].forEach((key) => {
      query.delete(key);
    });

    const normalizedQuery = Array.from(query.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    return `${method}:${path}${normalizedQuery ? `?${normalizedQuery}` : ""}:${getStableObjectKey(options?.categoryParams || {})}`;
  } catch (e) {
    return `${String(options?.method || "GET").toUpperCase()}:${String(url || "")}`;
  }
}

function getCachedMapValue(map, key, ttl) {
  const cached = map.get(key);

  if (!cached) {
    return null;
  }

  if (Date.now() - Number(cached.time || 0) > ttl) {
    map.delete(key);
    return null;
  }

  return cached.value;
}

function setCachedMapValue(map, key, value) {
  map.set(key, {
    time: Date.now(),
    value,
  });
}

function cleanupLimitedMap(map, maxSize = 30) {
  if (!map || map.size <= maxSize) {
    return;
  }

  Array.from(map.keys())
    .slice(0, Math.max(0, map.size - maxSize))
    .forEach((key) => map.delete(key));
}

function clearShopApiCaches() {
  try {
    SHOP_LIST_CACHE.clear();
    SHOP_REQUEST_CACHE.clear();
    SHOP_LIST_IN_FLIGHT.clear();
    SHOP_REQUEST_IN_FLIGHT.clear();
    SHOP_STATS_CACHE.clear();
    SHOP_STATS_IN_FLIGHT.clear();
    SHOP_EVENT_KEY = "";
  } catch (e) {
    console.warn("SHOP API CACHE CLEAR ERROR:", e.message);
  }
}

function isShopApiDebugEnabled() {
  try {
    return (
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.DEV === true
    );
  } catch (e) {
    return false;
  }
}

function logShopApiDebug(...args) {
  if (!isShopApiDebugEnabled()) {
    return;
  }

  console.log(...args);
}

function normalizeTextKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s/g, "")
    .trim();
}

function normalizeShopCategory(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();

  if (
    text === "karaoke" ||
    text === "노래방" ||
    text === "nora-karaoke" ||
    text === "nora_karaoke"
  ) {
    return "karaoke";
  }

  if (
    text === "massage" ||
    text === "마사지" ||
    text === "shop" ||
    text === "nora-massage" ||
    text === "nora_massage"
  ) {
    return "massage";
  }

  return "";
}

function getShopImageLimit(shop = {}, params = {}) {
  const category =
    normalizeShopCategory(shop.category) ||
    normalizeShopCategory(shop.shopCategory) ||
    normalizeShopCategory(shop.serviceType) ||
    normalizeShopCategory(shop.businessType) ||
    normalizeShopCategory(shop.adminCategory) ||
    normalizeShopCategory(params.category) ||
    normalizeShopCategory(params.shopCategory) ||
    normalizeShopCategory(params.serviceType) ||
    normalizeShopCategory(params.businessType) ||
    normalizeShopCategory(params.adminCategory) ||
    "massage";

  return category === "karaoke"
    ? KARAOKE_SHOP_IMAGE_COUNT
    : MAX_SAFE_SHOP_IMAGE_COUNT;
}

function getCategoryFromUrl(url = "") {
  try {
    const queryText = String(url || "").includes("?")
      ? String(url || "").split("?").slice(1).join("?")
      : "";

    if (!queryText) {
      return "";
    }

    const params = new URLSearchParams(queryText);

    return (
      normalizeShopCategory(params.get("category")) ||
      normalizeShopCategory(params.get("shopCategory")) ||
      normalizeShopCategory(params.get("serviceType")) ||
      normalizeShopCategory(params.get("businessType")) ||
      normalizeShopCategory(params.get("adminCategory")) ||
      ""
    );
  } catch (e) {
    return "";
  }
}

function getCategoryFromShop(shop = {}) {
  if (!shop || typeof shop !== "object") {
    return "";
  }

  const identityText = [
    shop?.name,
    shop?.title,
    shop?.slug,
    shop?.shopName,
    shop?.businessName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim();

  if (
    identityText.includes("노래방") ||
    identityText.includes("가라오케") ||
    identityText.includes("karaoke")
  ) {
    return "karaoke";
  }

  return (
    normalizeShopCategory(shop.category) ||
    normalizeShopCategory(shop.shopCategory) ||
    normalizeShopCategory(shop.serviceType) ||
    normalizeShopCategory(shop.businessType) ||
    normalizeShopCategory(shop.adminCategory) ||
    normalizeShopCategory(shop.type) ||
    ""
  );
}

function getCategoryFromParams(params = {}) {
  if (!params || typeof params !== "object") {
    return "";
  }

  return (
    normalizeShopCategory(params.category) ||
    normalizeShopCategory(params.shopCategory) ||
    normalizeShopCategory(params.serviceType) ||
    normalizeShopCategory(params.businessType) ||
    normalizeShopCategory(params.adminCategory) ||
    normalizeShopCategory(params.type) ||
    ""
  );
}

function getRuntimeAdminCategory() {
  try {
    if (typeof window === "undefined" || !window.location) {
      return "";
    }

    const pathname = String(window.location.pathname || "").toLowerCase();
    const search = String(window.location.search || "");

    const queryCategory = getCategoryFromUrl(search);

    if (queryCategory) {
      return queryCategory;
    }

    if (
      pathname.startsWith("/admin/karaoke") ||
      pathname.includes("/karaoke")
    ) {
      return "karaoke";
    }

    if (
      pathname.startsWith("/admin/massage") ||
      pathname.includes("/massage")
    ) {
      return "massage";
    }

    if (pathname === "/admin/shops") {
      return "massage";
    }

    return "";
  } catch (e) {
    return "";
  }
}

function getEffectiveCategory(params = {}) {
  return (
    getCategoryFromParams(params) ||
    getCategoryFromUrl(params?.url || "") ||
    getRuntimeAdminCategory()
  );
}

function hasCategoryScope(params = {}) {
  return !!getEffectiveCategory(params);
}

function makeCategoryParams(params = {}) {
  const category = getEffectiveCategory(params);

  if (!category) {
    return {};
  }

  return {
    category,
    shopCategory: category,
    serviceType: category,
    businessType: category,
    adminCategory: category,
  };
}

function getPathOnly(url = "") {
  return String(url || "").split("?")[0];
}

function appendCategoryQuery(url = "", params = {}) {
  const categoryParams = makeCategoryParams(params);

  if (!Object.keys(categoryParams).length) {
    return url;
  }

  const [path, queryText = ""] = String(url || "").split("?");
  const query = new URLSearchParams(queryText);

  Object.entries(categoryParams).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const nextQuery = query.toString();

  return nextQuery ? `${path}?${nextQuery}` : path;
}

function getScopedStorageKey(baseKey, params = {}) {
  const category = getEffectiveCategory(params);

  if (!category) {
    return baseKey;
  }

  return `${baseKey}_${category}`;
}

function isSameShopCategory(shop = {}, params = {}) {
  const category = getEffectiveCategory(params);

  if (!category) {
    if (params?.admin === "true" || params?.adminMode === "true" || params?.adminList === "true" || params?.management === "true") {
      return true;
    }

    if (isAdminRuntimePath()) {
      return true;
    }

    return true;
  }

  if (
    category === "massage" &&
    typeof window !== "undefined" &&
    String(window.location?.pathname || "").toLowerCase() === "/admin/shops"
  ) {
    const identityText = [
      shop?.name,
      shop?.title,
      shop?.slug,
      shop?.shopName,
      shop?.businessName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .trim();

    return !(
      identityText.includes("노래방") ||
      identityText.includes("가라오케") ||
      identityText.includes("karaoke")
    );
  }

  const shopCategory = getCategoryFromShop(shop);

  if (!shopCategory) {
    return category === "massage";
  }

  return shopCategory === category;
}

function filterShopsByCategory(items = [], params = {}) {
  return (Array.isArray(items) ? items : []).filter((shop) =>
    isSameShopCategory(shop, params)
  );
}

function normalizeShopCategoryPayload(payload = {}, params = {}) {
  const category =
    getCategoryFromParams(payload) ||
    getEffectiveCategory(params);

  if (!category) {
    return {
      ...payload,
    };
  }

  return {
    ...payload,
    category,
    shopCategory: category,
    serviceType: category,
    businessType: category,
    adminCategory: category,
  };
}


function normalizeShopCourseDataFields(source = {}, fallback = {}) {
  const safeSource = source && typeof source === "object" && !Array.isArray(source)
    ? source
    : {};
  const safeFallback = fallback && typeof fallback === "object" && !Array.isArray(fallback)
    ? fallback
    : {};

  const pickValue = (key, defaultValue) => {
    const sourceValue = safeSource[key];
    const fallbackValue = safeFallback[key];

    if (sourceValue !== undefined && sourceValue !== null) {
      return sourceValue;
    }

    if (fallbackValue !== undefined && fallbackValue !== null) {
      return fallbackValue;
    }

    return defaultValue;
  };

  return {
    courses: Array.isArray(pickValue("courses", [])) ? pickValue("courses", []) : [],
    price: Array.isArray(pickValue("price", [])) ? pickValue("price", []) : [],
    originalPrice: pickValue("originalPrice", ""),
    priceOriginal: pickValue("priceOriginal", 0),
    priceDiscount: pickValue("priceDiscount", 0),
    discountRate: pickValue("discountRate", 0),
    coursePricing: Array.isArray(pickValue("coursePricing", [])) ? pickValue("coursePricing", []) : [],
    pricing: pickValue("pricing", []),
    priceTable: pickValue("priceTable", []),
    courseSections: Array.isArray(pickValue("courseSections", [])) ? pickValue("courseSections", []) : [],
    menuPrices: Array.isArray(pickValue("menuPrices", [])) ? pickValue("menuPrices", []) : [],
    menus: Array.isArray(pickValue("menus", [])) ? pickValue("menus", []) : [],
    courseMenus: Array.isArray(pickValue("courseMenus", [])) ? pickValue("courseMenus", []) : [],
  };
}

function getPremiumSourceValue(value = {}, fallbackValue = undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value !== undefined ? value : fallbackValue;
  }

  const candidates = [
    value.premiumType,
    value.premiumLevel,
    value.membership,
    value.membershipType,
    value.subscriptionType,
    value.shopPlan,
    value.servicePlan,
    value.plan,
    value.planType,
    value.level,
    value.tier,
    value.rank,
    value.listingType,
    value.shopGrade,
    value.imageGrade,
    value.photoGrade,
    value.packageType,
    value.productType,
    value.grade,
    value.badge,
    value.typeLabel,
    value.label,
    value.premium,
    value.isPremium,
    value.premiumActive,
    value.featured,
    value.isFeatured,
    value.vip,
    value.isVip,
    value.isVIP,
    value.vipActive,
    value.vvip,
    value.isVvip,
    value.isVVIP,
    value.vvipActive,
    fallbackValue,
  ];

  return candidates.find((item) => item !== undefined && item !== null && item !== "");
}

function normalizePremiumValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizePremiumValue(getPremiumSourceValue(value, false));
  }

  if (typeof value === "string") {
    const text = value.toLowerCase().replace(/[\s_-]+/g, "").trim();

    if (
      [
        "normal",
        "basic",
        "free",
        "false",
        "0",
        "no",
        "n",
        "off",
        "inactive",
        "disabled",
        "disable",
        "none",
        "일반",
        "노멀",
        "기본",
        "무료",
        "미사용",
        "해제",
        "비활성",
      ].includes(text)
    ) {
      return false;
    }

    return (
      text === "true" ||
      text === "premium" ||
      text === "prem" ||
      text === "prime" ||
      text === "프리미엄" ||
      text === "프리미움" ||
      text === "프리미어" ||
      text === "vip" ||
      text === "vvip" ||
      text === "브이아이피" ||
      text === "뷔아이피" ||
      text === "1" ||
      text === "yes" ||
      text === "y" ||
      text === "active" ||
      text === "enabled" ||
      text === "featured" ||
      text === "best" ||
      text === "gold" ||
      text === "paid" ||
      text === "유료" ||
      text === "상위" ||
      text === "우선" ||
      text === "광고" ||
      text === "추천" ||
      text === "노출"
    );
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  return value === true;
}

function hasExplicitPremiumValue(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return [
    "premium",
    "isPremium",
    "premiumActive",
    "premiumType",
    "premiumLevel",
    "membership",
    "membershipType",
    "subscriptionType",
    "shopPlan",
    "servicePlan",
    "plan",
    "planType",
    "level",
    "tier",
    "rank",
    "listingType",
    "shopGrade",
    "imageGrade",
    "photoGrade",
    "packageType",
    "productType",
    "grade",
    "badge",
    "typeLabel",
    "label",
    "featured",
    "isFeatured",
    "vip",
    "isVip",
    "isVIP",
    "vipActive",
    "vvip",
    "isVvip",
    "isVVIP",
    "vvipActive",
  ].some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function normalizePremiumType(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizePremiumType(getPremiumSourceValue(value, ""));
  }

  if (typeof value === "string") {
    const text = value.toLowerCase().replace(/[\s_-]+/g, "").trim();

    if (
      [
        "normal",
        "basic",
        "free",
        "false",
        "0",
        "no",
        "n",
        "off",
        "inactive",
        "disabled",
        "disable",
        "none",
        "일반",
        "노멀",
        "기본",
        "무료",
        "미사용",
        "해제",
        "비활성",
      ].includes(text)
    ) {
      return "normal";
    }

    if (
      text === "vip" ||
      text === "vvip" ||
      text === "브이아이피" ||
      text === "뷔아이피"
    ) {
      return "vip";
    }

    if (
      text === "premium" ||
      text === "prem" ||
      text === "prime" ||
      text === "프리미엄" ||
      text === "프리미움" ||
      text === "프리미어" ||
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "y" ||
      text === "active" ||
      text === "enabled" ||
      text === "featured" ||
      text === "best" ||
      text === "gold" ||
      text === "paid" ||
      text === "유료" ||
      text === "상위" ||
      text === "우선" ||
      text === "광고" ||
      text === "추천" ||
      text === "노출"
    ) {
      return "premium";
    }
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? "premium" : "normal";
  }

  return value === true ? "premium" : "normal";
}

function hasDirectPaymentField(value = {}) {
  return !!(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, "directPaymentEnabled")
  );
}

function normalizeDirectPaymentEnabled(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizeDirectPaymentEnabled(value.directPaymentEnabled);
  }

  if (typeof value === "string") {
    const text = value.toLowerCase().replace(/[\s_-]+/g, "").trim();

    return (
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "y" ||
      text === "on" ||
      text === "active" ||
      text === "enabled" ||
      text === "enable" ||
      text === "directpaymentenabled" ||
      text === "바로결제" ||
      text === "활성화"
    );
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  return value === true;
}

function pickDirectPaymentEnabled(base = {}, next = {}) {
  if (hasDirectPaymentField(next)) {
    return normalizeDirectPaymentEnabled(next.directPaymentEnabled);
  }

  if (hasDirectPaymentField(base)) {
    return normalizeDirectPaymentEnabled(base.directPaymentEnabled);
  }

  return false;
}

function isBareBase64Image(value) {
  const text = String(value || "").trim();

  if (!text || text.includes(" ") || text.includes("\n") || text.includes("\r")) {
    return false;
  }

  if (
    text.startsWith("/9j/") ||
    text.startsWith("iVBOR") ||
    text.startsWith("R0lGOD") ||
    text.startsWith("UklGR")
  ) {
    return true;
  }

  return /^[A-Za-z0-9+/]{120,}={0,2}$/.test(text);
}

function normalizeImageValue(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  if (text === "undefined" || text === "null" || text === "[object Object]") {
    return "";
  }

  if (text.includes("undefined") || text.includes("[object Object]")) {
    return "";
  }

  if (text === "data:" || text === "data:," || text.startsWith("data:,")) {
    return "";
  }

  if (text.startsWith("data:image/")) {
    return text.includes(";base64,") ? text : "";
  }

  if (text.startsWith("blob:")) {
    return "";
  }

  if (isBareBase64Image(text)) {
    return `data:image/jpeg;base64,${text}`;
  }

  if (text.startsWith("http://") || text.startsWith("https://")) {
    return text;
  }

  if (text.startsWith("//")) {
    return text;
  }

  if (text.startsWith("/")) {
    return text;
  }

  const cleanText = text.split("?")[0].split("#")[0].toLowerCase();

  if (
    text.startsWith("uploads/") ||
    text.startsWith("upload/") ||
    text.startsWith("files/") ||
    text.startsWith("file/") ||
    text.startsWith("images/") ||
    text.startsWith("image/") ||
    text.startsWith("media/") ||
    text.startsWith("static/") ||
    text.startsWith("assets/") ||
    text.startsWith("public/") ||
    cleanText.endsWith(".jpg") ||
    cleanText.endsWith(".jpeg") ||
    cleanText.endsWith(".png") ||
    cleanText.endsWith(".webp") ||
    cleanText.endsWith(".gif") ||
    cleanText.endsWith(".avif") ||
    cleanText.endsWith(".svg")
  ) {
    return text.replace(/^\/+/, "");
  }

  return "";
}


function normalizeUploadImagePath(value) {
  const rawText = String(value || "").trim();
  const normalizedText = normalizeImageValue(rawText);

  if (!normalizedText) {
    return "";
  }

  if (normalizedText.startsWith("data:image/")) {
    return normalizedText;
  }

  if (normalizedText.startsWith("blob:")) {
    return "";
  }

  const fixPath = (path = "") => {
    const source = String(path || "").trim().replace(/\\/g, "/");
    const match = source.match(/^([^?#]*)([?#].*)?$/);
    const pathOnly = match ? match[1] || "" : source;
    const suffix = match ? match[2] || "" : "";
    const cleanPath = String(pathOnly || "").replace(/^\/+/, "");

    if (!cleanPath) {
      return "";
    }

    const lowerPath = cleanPath.toLowerCase();

    if (lowerPath.startsWith("api/shops/uploads/")) {
      return `/api/uploads/${cleanPath.slice("api/shops/uploads/".length)}${suffix}`;
    }

    if (lowerPath.startsWith("shops/uploads/")) {
      return `/api/uploads/${cleanPath.slice("shops/uploads/".length)}${suffix}`;
    }

    if (lowerPath.startsWith("api/shop/uploads/")) {
      return `/api/uploads/${cleanPath.slice("api/shop/uploads/".length)}${suffix}`;
    }

    if (lowerPath.startsWith("shop/uploads/")) {
      return `/api/uploads/${cleanPath.slice("shop/uploads/".length)}${suffix}`;
    }

    if (lowerPath.startsWith("api/uploads/")) {
      return `/${cleanPath}${suffix}`;
    }

    if (lowerPath.startsWith("uploads/")) {
      return `/api/${cleanPath}${suffix}`;
    }

    return source.startsWith("/") ? `${pathOnly}${suffix}` : `${cleanPath}${suffix}`;
  };

  if (normalizedText.startsWith("http://") || normalizedText.startsWith("https://")) {
    try {
      const url = new URL(normalizedText);
      const fixedPath = fixPath(`${url.pathname}${url.search}${url.hash}`);
      const runtimePath = fixedPath || `${url.pathname}${url.search}${url.hash}`;

      if (
        isBrowserProductionHost(getCurrentHostname()) &&
        isBrowserLocalHost(url.hostname)
      ) {
        const productionOrigin = DEFAULT_API_BASE.replace(/\/api\/?$/, "");
        const productionPath = runtimePath.startsWith("/")
          ? runtimePath
          : `/${runtimePath}`;

        return `${productionOrigin}${productionPath}`;
      }

      if (fixedPath && fixedPath !== `${url.pathname}${url.search}${url.hash}`) {
        return `${url.origin}${fixedPath}`;
      }

      return normalizedText;
    } catch (e) {
      return normalizedText;
    }
  }

  if (normalizedText.startsWith("//")) {
    return normalizedText.replace("/api/shops/uploads/", "/api/uploads/");
  }

  return fixPath(normalizedText);
}

function normalizeNetworkImageValue(value) {
  const normalizedValue = normalizeUploadImagePath(value);

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.startsWith("data:image/")) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith("http://") || normalizedValue.startsWith("https://")) {
    try {
      const url = new URL(normalizedValue);

      if (isBrowserLocalHost(url.hostname)) {
        const relativePath = `${url.pathname}${url.search}${url.hash}`;

        return normalizeUploadImagePath(relativePath) || relativePath;
      }
    } catch (e) {}
  }

  if (normalizedValue.startsWith("//")) {
    try {
      const url = new URL(`http:${normalizedValue}`);

      if (isBrowserLocalHost(url.hostname)) {
        const relativePath = `${url.pathname}${url.search}${url.hash}`;

        return normalizeUploadImagePath(relativePath) || relativePath;
      }
    } catch (e) {}
  }

  return normalizedValue;
}

function normalizeUploadImageList(value, options = {}) {
  return Array.from(
    new Set(
      normalizeImageList(value, options)
        .map((image) => normalizeUploadImagePath(image))
        .filter((image) => isSafeImageValue(image, options))
    )
  ).slice(0, Number(options.maxCount || MAX_SAFE_SHOP_IMAGE_COUNT));
}

function limitImageUrlList(images = [], maxCount = MAX_SAFE_SHOP_IMAGE_COUNT) {
  const source = Array.isArray(images) ? images : [images];

  return Array.from(
    new Set(
      source
        .flat()
        .map((image) => normalizeUploadImagePath(image) || normalizeImageValue(image))
        .filter((image) =>
          isSafeImageValue(image, {
            allowDataImage: true,
            allowBlob: false,
            maxLength: MAX_STORED_IMAGE_LENGTH,
          })
        )
    )
  ).slice(0, maxCount);
}

function getImageUrlCandidates(value) {
  const normalizedValue = normalizeUploadImagePath(value);

  if (!normalizedValue) {
    return [];
  }

  if (normalizedValue.startsWith("data:image/")) {
    return [normalizedValue];
  }

  if (normalizedValue.startsWith("http://") || normalizedValue.startsWith("https://")) {
    const fixedValue = normalizeUploadImagePath(normalizedValue);
    return [fixedValue || normalizedValue].filter(Boolean).slice(0, 1);
  }

  if (normalizedValue.startsWith("//")) {
    const protocol = typeof window !== "undefined" && window.location ? window.location.protocol : "https:";
    return [`${protocol}${normalizedValue}`].slice(0, 1);
  }

  const apiOrigin = getRuntimeApiBase().replace(/\/api\/?$/, "");
  const cleanValue = normalizedValue.replace(/^\/+/, "");
  const lowerCleanValue = cleanValue.toLowerCase();

  if (
    lowerCleanValue.startsWith("api/uploads/") ||
    lowerCleanValue.startsWith("uploads/") ||
    lowerCleanValue.startsWith("upload/")
  ) {
    const uploadPath = lowerCleanValue.startsWith("api/uploads/")
      ? `/${cleanValue}`
      : `/api/${cleanValue}`;

    return [
      normalizeUploadImagePath(`${apiOrigin}${uploadPath}`) || `${apiOrigin}${uploadPath}`,
    ].filter(Boolean).slice(0, 1);
  }

  const paths = normalizedValue.startsWith("/")
    ? [normalizedValue]
    : [`/${cleanValue}`];

  return getRuntimeImageBaseCandidates()
    .flatMap((baseUrl) =>
      paths.map((path) =>
        path.startsWith("/")
          ? `${baseUrl}${path}`
          : `${baseUrl}/${path}`
      )
    )
    .map((url) => normalizeUploadImagePath(url) || url)
    .filter(Boolean)
    .filter((item) => !String(item || "").includes("/api/shops/uploads/"))
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, MAX_IMAGE_URL_CANDIDATES);
}

function getDeepImageValues(source, depth = 0, visited = new Set()) {
  if (!source || depth > 5) {
    return [];
  }

  if (typeof source === "string") {
    return [source];
  }

  if (Array.isArray(source)) {
    return source.flatMap((item) => getDeepImageValues(item, depth + 1, visited));
  }

  if (typeof source !== "object") {
    return [];
  }

  if (visited.has(source)) {
    return [];
  }

  visited.add(source);

  const imageKeyPattern =
    /(image|img|photo|picture|thumb|thumbnail|gallery|galleries|media|file|files|attachment|attachments|banner|cover|logo|cdn|url|path|src|key|filename|originalname)/i;

  return Object.entries(source).flatMap(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return [];
    }

    if (typeof value === "string") {
      return imageKeyPattern.test(key) || !!normalizeImageValue(value) ? [value] : [];
    }

    if (Array.isArray(value)) {
      return imageKeyPattern.test(key)
        ? value.flatMap((item) => getDeepImageValues(item, depth + 1, visited))
        : [];
    }

    if (typeof value === "object") {
      return imageKeyPattern.test(key)
        ? getDeepImageValues(value, depth + 1, visited)
        : [];
    }

    return [];
  });
}

function getImageValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return normalizeImageValue(value);
  }

  if (typeof value === "object") {
    return normalizeImageValue(
      value.url ||
        value.src ||
        value.path ||
        value.location ||
        value.image ||
        value.imageUrl ||
        value.imageURL ||
        value.imagePath ||
        value.thumbnail ||
        value.thumbnailUrl ||
        value.thumbnailURL ||
        value.thumbnailPath ||
        value.thumb ||
        value.thumbUrl ||
        value.mainImage ||
        value.mainImageUrl ||
        value.mainImageURL ||
        value.mainImagePath ||
        value.representativeImage ||
        value.representativeImageUrl ||
        value.representativeImageURL ||
        value.representativeImagePath ||
        value.coverImage ||
        value.coverImageUrl ||
        value.coverImageURL ||
        value.coverImagePath ||
        value.photo ||
        value.photoUrl ||
        value.photoURL ||
        value.photoPath ||
        value.picture ||
        value.pictureUrl ||
        value.pictureURL ||
        value.profileImage ||
        value.profileImageUrl ||
        value.logo ||
        value.logoUrl ||
        value.banner ||
        value.bannerUrl ||
        value.file ||
        value.fileUrl ||
        value.fileURL ||
        value.filePath ||
        value.filename ||
        value.originalname ||
        value.key ||
        value.cdnUrl ||
        value.cdnURL ||
        value.publicUrl ||
        value.publicURL ||
        value.secureUrl ||
        value.secureURL ||
        value.downloadUrl ||
        value.downloadURL ||
        ""
    );
  }

  return "";
}

function isSafeImageValue(value, options = {}) {
  const text = normalizeImageValue(value);
  const allowDataImage = options.allowDataImage !== false;
  const allowBlob = options.allowBlob === true;
  const maxLength = Number(options.maxLength || MAX_STORED_IMAGE_LENGTH);

  if (!text) return false;
  if (text.startsWith("blob:")) return allowBlob;

  if (text.startsWith("data:image/")) {
    if (!allowDataImage) return false;
    if (!text.includes(";base64,")) return false;
    if (Number.isFinite(maxLength) && text.length > maxLength) return false;
    return true;
  }

  if (
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.startsWith("//") ||
    text.startsWith("/") ||
    text.startsWith("uploads/") ||
    text.startsWith("upload/") ||
    text.startsWith("files/") ||
    text.startsWith("file/") ||
    text.startsWith("images/") ||
    text.startsWith("image/") ||
    text.startsWith("media/") ||
    text.startsWith("static/") ||
    text.startsWith("assets/") ||
    text.startsWith("public/")
  ) {
    return true;
  }

  const cleanText = text.split("?")[0].split("#")[0].toLowerCase();

  return (
    cleanText.endsWith(".jpg") ||
    cleanText.endsWith(".jpeg") ||
    cleanText.endsWith(".png") ||
    cleanText.endsWith(".webp") ||
    cleanText.endsWith(".gif") ||
    cleanText.endsWith(".avif") ||
    cleanText.endsWith(".svg")
  );
}

function normalizeImageList(value, options = {}) {
  const result = [];

  const pushValue = (item) => {
    if (item === null || item === undefined || item === "") {
      return;
    }

    if (Array.isArray(item)) {
      item.forEach((child) => pushValue(child));
      return;
    }

    if (typeof item === "string") {
      const text = item.trim();

      if (!text) {
        return;
      }

      const normalizedText = normalizeImageValue(text);

      if (normalizedText && isSafeImageValue(normalizedText, options)) {
        result.push(normalizedText);
        return;
      }

      if (
        text.startsWith("data:image/") ||
        text.startsWith("blob:") ||
        text.startsWith("http://") ||
        text.startsWith("https://") ||
        text.startsWith("/")
      ) {
        return;
      }

      text
        .split(",")
        .map((part) => normalizeImageValue(part))
        .filter((part) => isSafeImageValue(part, options))
        .forEach((part) => result.push(part));

      return;
    }

    const image = getImageValue(item);

    if (isSafeImageValue(image, options)) {
      result.push(image);
    }
  };

  pushValue(value);

  return Array.from(new Set(result));
}

function collectImages(shop = {}, options = {}) {
  const images = [];
  const maxCount = Number(options.maxCount || getShopImageLimit(shop));
  const pushImage = (value) => {
    normalizeImageList(value, options).forEach((image) => {
      const normalizedImage = normalizeImageValue(image);

      if (
        normalizedImage &&
        isSafeImageValue(normalizedImage, options) &&
        !images.includes(normalizedImage)
      ) {
        images.push(normalizedImage);
      }
    });
  };

  if (options?.canonicalOnly === true) {
    const canonicalSources = [
      shop.images,
      shop.photos,
      shop.imageUrls,
      shop.gallery,
      shop.pictures,
      shop.files,
    ];

    // Authoritative admin data must use one field only.  Combining aliases
    // reintroduced old four-photo sets and made every karaoke card show 12.
    for (const source of canonicalSources) {
      const sourceImages = normalizeImageList(source, options);

      if (!sourceImages.length) {
        continue;
      }

      const representativeCandidate = normalizeImageValue(
        shop.representativeImage ||
          shop.mainImage ||
          shop.thumbnail ||
          shop.coverImage ||
          shop.image ||
          ""
      );
      const representativeIndex = sourceImages.findIndex(
        (image) => normalizeImageValue(image) === representativeCandidate
      );
      const groupStart =
        representativeIndex >= 0
          ? Math.floor(representativeIndex / maxCount) * maxCount
          : 0;

      pushImage(sourceImages.slice(groupStart, groupStart + maxCount));
      break;
    }

    return images.slice(0, maxCount);
  }

  pushImage(shop.images);
  pushImage(shop.photos);
  pushImage(shop.imageUrls);
  pushImage(shop.imageURLs);
  pushImage(shop.gallery);
  pushImage(shop.galleries);
  pushImage(shop.pictures);
  pushImage(shop.shopImages);
  pushImage(shop.shopImage);
  pushImage(shop.businessImages);
  pushImage(shop.businessImage);
  pushImage(shop.storeImages);
  pushImage(shop.storeImage);
  pushImage(shop.files);
  pushImage(shop.attachments);
  pushImage(shop.media);

  [
    shop.representativeImage,
    shop.representativeImageUrl,
    shop.representativeImageURL,
    shop.representativeImagePath,
    shop.mainImage,
    shop.mainImageUrl,
    shop.mainImageURL,
    shop.mainImagePath,
    shop.thumbnail,
    shop.thumbnailUrl,
    shop.thumbnailURL,
    shop.thumbnailPath,
    shop.thumb,
    shop.thumbUrl,
    shop.coverImage,
    shop.coverImageUrl,
    shop.coverImageURL,
    shop.coverImagePath,
    shop.image,
    shop.imageUrl,
    shop.imageURL,
    shop.imagePath,
    shop.photo,
    shop.photoUrl,
    shop.photoURL,
    shop.photoPath,
    shop.picture,
    shop.pictureUrl,
    shop.pictureURL,
    shop.profileImage,
    shop.profileImageUrl,
    shop.logo,
    shop.logoUrl,
    shop.banner,
    shop.bannerUrl,
    shop.file,
    shop.fileUrl,
    shop.fileURL,
    shop.filePath,
    shop.cdnUrl,
    shop.cdnURL,
    shop.publicUrl,
    shop.publicURL,
    shop.secureUrl,
    shop.secureURL,
    shop.downloadUrl,
    shop.downloadURL,
    ...getDeepImageValues(shop),
  ].forEach((image) => {
    const normalizedImage = normalizeImageValue(image);

    if (
      normalizedImage &&
      isSafeImageValue(normalizedImage, options) &&
      !images.includes(normalizedImage)
    ) {
      images.push(normalizedImage);
    }
  });

  return images;
}

function hasExplicitImageArrayPayload(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return [
    "images",
    "photos",
    "imageUrls",
    "gallery",
    "pictures",
    "files",
  ].some((key) => Array.isArray(payload[key]));
}

function shouldReplaceShopImages(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return hasExplicitImageArrayPayload(payload);
}

function getShopIdentityKeys(shop = {}) {
  const id = String(shop._id || shop.id || shop.shopId || "").trim();
  const name = normalizeTextKey(shop.name);
  const address = normalizeTextKey(shop.address || shop.roadAddress || shop.fullAddress);
  const phone = normalizeTextKey(shop.phone || shop.tel || shop.virtualPhone || shop.fakePhone || shop.callNumber);

  return {
    id,
    name,
    address,
    phone,
    nameKey: name ? `name:${name}` : "",
    nameAddressKey: name && address ? `name-address:${name}:${address}` : "",
    phoneKey: phone ? `phone:${phone}` : "",
  };
}

function getShopImageBankKeys(shop = {}) {
  const keys = getShopIdentityKeys(shop);

  return Array.from(
    new Set(
      [
        keys.id,
        keys.id ? `id:${keys.id}` : "",
        keys.id ? `shopId:${keys.id}` : "",
        keys.nameKey,
        keys.nameAddressKey,
        keys.name && keys.address ? `nameAddress:${keys.name}:${keys.address}` : "",
        keys.name && keys.address ? `${keys.name}::${keys.address}` : "",
        keys.name && keys.address ? `${keys.name}_${keys.address}` : "",
        keys.phoneKey,
        keys.phone ? `tel:${keys.phone}` : "",
        keys.phone,
      ].filter(Boolean)
    )
  );
}

function getShopPremiumBankKeys(shop = {}) {
  return getShopImageBankKeys(shop);
}

function parseImageBankStorage(storage, key = LOCAL_SHOP_IMAGE_BANK_KEY) {
  try {
    const value = JSON.parse(storage.getItem(key) || "{}");

    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (e) {
    return {};
  }
}

function readShopImageBank() {
  try {
    return {
      ...parseImageBankStorage(localStorage, LEGACY_NOMA_SHOP_IMAGE_BANK_KEY),
      ...parseImageBankStorage(sessionStorage, LEGACY_NOMA_SHOP_IMAGE_BANK_KEY),
      ...parseImageBankStorage(localStorage, LOCAL_SHOP_IMAGE_BANK_KEY),
      ...parseImageBankStorage(sessionStorage, LOCAL_SHOP_IMAGE_BANK_KEY),
    };
  } catch (e) {
    return {};
  }
}

function safeWriteImageBank(bank) {
  try {
    const storageText = JSON.stringify(bank || {});

    safeSetStorage(localStorage, LOCAL_SHOP_IMAGE_BANK_KEY, storageText);
    safeSetStorage(sessionStorage, LOCAL_SHOP_IMAGE_BANK_KEY, storageText);
    safeSetStorage(localStorage, LEGACY_NOMA_SHOP_IMAGE_BANK_KEY, storageText);
    safeSetStorage(sessionStorage, LEGACY_NOMA_SHOP_IMAGE_BANK_KEY, storageText);
  } catch (e) {
    console.warn("SHOP IMAGE BANK SAVE ERROR:", e.message);
  }
}

function normalizePremiumBankValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const premiumSource = getPremiumSourceValue(value, false);
    const premium = normalizePremiumValue(premiumSource);
    const premiumType = normalizePremiumType(premiumSource);

    return {
      ...value,
      premium,
      premiumType,
      isPremium: premium,
      premiumActive: premium,
      premiumLevel:
        value.premiumLevel ||
        value.level ||
        value.tier ||
        value.rank ||
        premiumType,
      membership:
        value.membership ||
        value.membershipType ||
        value.subscriptionType ||
        value.plan ||
        value.shopPlan ||
        value.servicePlan ||
        premiumType,
      membershipType:
        value.membershipType ||
        value.membership ||
        value.subscriptionType ||
        value.plan ||
        value.shopPlan ||
        value.servicePlan ||
        premiumType,
      listingType: value.listingType || premiumType,
      shopGrade: value.shopGrade || premiumType,
      imageGrade: value.imageGrade || value.photoGrade || premiumType,
      photoGrade: value.photoGrade || value.imageGrade || premiumType,
      updatedAt: value.updatedAt || value.modifiedAt || new Date().toISOString(),
      __premiumBankApplied: true,
    };
  }

  const premium = normalizePremiumValue(value);
  const premiumType = normalizePremiumType(value);

  return {
    premium,
    premiumType,
    premiumLevel: premiumType,
    membership: premiumType,
    membershipType: premiumType,
    listingType: premiumType,
    shopGrade: premiumType,
    imageGrade: premiumType,
    photoGrade: premiumType,
    isPremium: premium,
    premiumActive: premium,
    updatedAt: new Date().toISOString(),
    __premiumBankApplied: true,
  };
}

function parsePremiumBankStorage(storage, key = LOCAL_SHOP_PREMIUM_BANK_KEY) {
  try {
    const value = JSON.parse(storage.getItem(key) || "{}");

    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (e) {
    return {};
  }
}

function readShopPremiumBank() {
  try {
    return SHOP_PREMIUM_BANK_STORAGE_KEYS.reduce((result, key) => {
      const localBank = parsePremiumBankStorage(localStorage, key);
      const sessionBank = parsePremiumBankStorage(sessionStorage, key);

      return {
        ...result,
        ...localBank,
        ...sessionBank,
      };
    }, {});
  } catch (e) {
    return {};
  }
}

function readShopPremiumBankEntries(shop = {}) {
  try {
    const keys = getShopPremiumBankKeys(shop);
    const values = [];

    SHOP_PREMIUM_BANK_STORAGE_KEYS.forEach((storageKey) => {
      [localStorage, sessionStorage].forEach((storage) => {
        const bank = parsePremiumBankStorage(storage, storageKey);

        keys.forEach((key) => {
          const value = bank[key];

          if (value === undefined || value === null || value === "") {
            return;
          }

          values.push({
            storageKey,
            key,
            value: normalizePremiumBankValue(value),
          });
        });
      });
    });

    return values;
  } catch (e) {
    return [];
  }
}

function safeWritePremiumBank(bank) {
  try {
    const storageText = JSON.stringify(bank || {});

    safeSetStorage(localStorage, LOCAL_SHOP_PREMIUM_BANK_KEY, storageText);
    safeSetStorage(sessionStorage, LOCAL_SHOP_PREMIUM_BANK_KEY, storageText);
    safeSetStorage(localStorage, LEGACY_NOMA_SHOP_PREMIUM_BANK_KEY, storageText);
    safeSetStorage(sessionStorage, LEGACY_NOMA_SHOP_PREMIUM_BANK_KEY, storageText);
  } catch (e) {
    console.warn("SHOP PREMIUM BANK SAVE ERROR:", e.message);
  }
}

function writeShopPremiumBank(items = []) {
  try {
    const currentBank = {
      ...parsePremiumBankStorage(localStorage, LEGACY_NOMA_SHOP_PREMIUM_BANK_KEY),
      ...parsePremiumBankStorage(sessionStorage, LEGACY_NOMA_SHOP_PREMIUM_BANK_KEY),
      ...parsePremiumBankStorage(localStorage, LOCAL_SHOP_PREMIUM_BANK_KEY),
      ...parsePremiumBankStorage(sessionStorage, LOCAL_SHOP_PREMIUM_BANK_KEY),
    };
    const nextBank = { ...currentBank };

    (Array.isArray(items) ? items : []).forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const keys = getShopPremiumBankKeys(item);
      const premiumValue = normalizePremiumBankValue(item);
      const incomingIsExplicitAdminUpdate = item.__premiumUpdated === true;

      if (!keys.length) {
        return;
      }

      keys.forEach((key) => {
        const currentValue =
          nextBank[key] !== undefined && nextBank[key] !== null && nextBank[key] !== ""
            ? normalizePremiumBankValue(nextBank[key])
            : null;

        if (
          currentValue &&
          currentValue.__premiumUpdated === true &&
          !incomingIsExplicitAdminUpdate
        ) {
          return;
        }

        nextBank[key] = {
          ...premiumValue,
          ...(incomingIsExplicitAdminUpdate ? { __premiumUpdated: true } : {}),
        };
      });
    });

    safeWritePremiumBank(nextBank);
  } catch (e) {
    console.warn("SHOP PREMIUM BANK WRITE ERROR:", e.message);
  }
}

function getShopPremiumBankValue(shop = {}) {
  const entries = readShopPremiumBankEntries(shop);

  if (!entries.length) {
    return null;
  }

  const getTime = (value) => {
    const time = Date.parse(String(value?.updatedAt || value?.modifiedAt || ""));
    return Number.isFinite(time) ? time : 0;
  };

  const explicitAdminEntries = entries
    .filter((entry) => entry?.value?.__premiumUpdated === true)
    .sort((a, b) => getTime(b.value) - getTime(a.value));

  if (explicitAdminEntries.length) {
    return explicitAdminEntries[0].value;
  }

  const ordinaryEntries = entries
    .slice()
    .sort((a, b) => getTime(b.value) - getTime(a.value));

  return ordinaryEntries[0]?.value || null;
}

function applyShopPremiumBank(shop = {}) {
  if (!shop || typeof shop !== "object") {
    return shop;
  }

  if (hasExplicitPremiumValue(shop)) {
    return shop;
  }

  const bankValue = getShopPremiumBankValue(shop);

  if (!bankValue) {
    return shop;
  }

  const bankIsExplicitAdminUpdate = bankValue.__premiumUpdated === true;

  return {
    ...shop,
    premium: bankValue.premium,
    premiumType: bankValue.premiumType,
    premiumLevel: bankValue.premiumLevel || bankValue.premiumType,
    isPremium: bankValue.isPremium,
    premiumActive: bankValue.premiumActive,
    membership: bankValue.membership || bankValue.membershipType || bankValue.premiumType,
    membershipType: bankValue.membershipType || bankValue.membership || bankValue.premiumType,
    listingType: bankValue.listingType || bankValue.premiumType,
    shopGrade: bankValue.shopGrade || bankValue.premiumType,
    imageGrade: bankValue.imageGrade || bankValue.photoGrade || bankValue.premiumType,
    photoGrade: bankValue.photoGrade || bankValue.imageGrade || bankValue.premiumType,
    updatedAt: bankValue.updatedAt || shop.updatedAt || shop.modifiedAt || "",
    ...(bankIsExplicitAdminUpdate ? { __premiumUpdated: true } : {}),
    __premiumBankApplied: true,
  };
}

function getImageBankImages(shop = {}) {
  const bank = readShopImageBank();
  const keys = getShopImageBankKeys(shop);

  return Array.from(
    new Set(
      keys
        .flatMap((key) => (Array.isArray(bank[key]) ? bank[key] : []))
        .map((image) => normalizeImageValue(image))
        .filter((image) =>
          isSafeImageValue(image, {
            allowDataImage: true,
            allowBlob: false,
            maxLength: MAX_STORED_IMAGE_LENGTH,
          })
        )
    )
  ).slice(0, MAX_SAFE_SHOP_IMAGE_COUNT);
}

function writeShopImageBank(items = [], options = {}) {
  try {
    const replace = options?.replace === true || (Array.isArray(items) ? items : []).some((item) => item?.__replaceImages === true);
    const currentBank = readShopImageBank();
    const nextBank = { ...currentBank };

    (Array.isArray(items) ? items : []).forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const keys = getShopImageBankKeys(item);
      const images = collectImages(item, {
        allowDataImage: true,
        allowBlob: false,
        maxLength: MAX_STORED_IMAGE_LENGTH,
      });

      if (!keys.length || !images.length) {
        return;
      }

      keys.forEach((key) => {
        const currentImages = !replace && Array.isArray(nextBank[key]) ? nextBank[key] : [];
        const fixedImages = replace
          ? images.map((image) => normalizeImageValue(image)).filter(Boolean)
          : Array.from(
              new Set([...currentImages, ...images].map((image) => normalizeImageValue(image)).filter(Boolean))
            );

        nextBank[key] = limitImageUrlList(fixedImages);
      });
    });

    safeWriteImageBank(nextBank);
  } catch (e) {
    console.warn("SHOP IMAGE BANK WRITE ERROR:", e.message);
  }
}

function applyShopImageBank(shop = {}) {
  if (!shop || typeof shop !== "object") {
    return shop;
  }

  const bankImages = getImageBankImages(shop);
  const currentImages = collectImages(shop, {
    allowDataImage: true,
    allowBlob: false,
    maxLength: MAX_STORED_IMAGE_LENGTH,
  });

  const fixedImages = shop?.__replaceImages === true
    ? currentImages
    : bankImages.length
    ? bankImages
    : currentImages;

  const expandedFixedImages = Array.from(
    new Set(
      fixedImages
        .flatMap((image) => getImageUrlCandidates(image))
        .filter(Boolean)
    )
  );

  if (!fixedImages.length && !expandedFixedImages.length) {
    return shop;
  }

  const finalImages = limitImageUrlList(expandedFixedImages.length ? expandedFixedImages : fixedImages);

  const representativeImage =
    getImageUrlCandidates(shop.representativeImage)[0] ||
    getImageUrlCandidates(shop.mainImage)[0] ||
    getImageUrlCandidates(shop.thumbnail)[0] ||
    getImageUrlCandidates(shop.coverImage)[0] ||
    finalImages[0] ||
    "";

  const mainImage =
    getImageUrlCandidates(shop.mainImage)[0] ||
    representativeImage ||
    finalImages[0] ||
    "";

  const thumbnail =
    getImageUrlCandidates(shop.thumbnail)[0] ||
    representativeImage ||
    finalImages[0] ||
    "";

  const coverImage =
    getImageUrlCandidates(shop.coverImage)[0] ||
    representativeImage ||
    finalImages[0] ||
    "";

  return {
    ...shop,
    images: finalImages,
    photos: finalImages,
    imageUrls: finalImages,
    gallery: finalImages,
    pictures: finalImages,
    files: [],
    image: getImageUrlCandidates(shop.image)[0] || representativeImage,
    imageUrl: getImageUrlCandidates(shop.imageUrl)[0] || representativeImage,
    photo: getImageUrlCandidates(shop.photo)[0] || representativeImage,
    picture: getImageUrlCandidates(shop.picture)[0] || representativeImage,
    representativeImage,
    mainImage,
    thumbnail,
    coverImage,
  };
}

function mergeShopObjects(base = {}, next = {}) {
  base = applyShopPremiumBank(base || {});
  next = applyShopPremiumBank(next || {});

  const replaceImages = next?.__replaceImages === true;

  const baseImages = collectImages(base, { allowDataImage: true, allowBlob: false })
    .map((image) => normalizeImageValue(image))
    .filter((image) =>
      isSafeImageValue(image, { allowDataImage: true, allowBlob: false })
    );

  const nextImages = collectImages(next, { allowDataImage: true, allowBlob: false })
    .map((image) => normalizeImageValue(image))
    .filter((image) =>
      isSafeImageValue(image, { allowDataImage: true, allowBlob: false })
    );

  const images = [];
  const pushImage = (image) => {
    const normalizedImage = normalizeImageValue(image);

    if (
      normalizedImage &&
      isSafeImageValue(normalizedImage, { allowDataImage: true, allowBlob: false }) &&
      !images.includes(normalizedImage)
    ) {
      images.push(normalizedImage);
    }
  };

  if (!replaceImages) {
    baseImages.forEach(pushImage);
  }

  nextImages.forEach(pushImage);

  const representativeCandidate =
    normalizeImageValue(next.representativeImage) ||
    normalizeImageValue(next.mainImage) ||
    normalizeImageValue(next.thumbnail) ||
    normalizeImageValue(next.coverImage) ||
    (!replaceImages
      ? normalizeImageValue(base.representativeImage) ||
        normalizeImageValue(base.mainImage) ||
        normalizeImageValue(base.thumbnail) ||
        normalizeImageValue(base.coverImage)
      : "") ||
    images[0] ||
    "";

  const representativeImage =
    images.find((image) => image === representativeCandidate) ||
    (isSafeImageValue(representativeCandidate, {
      allowDataImage: true,
      allowBlob: false,
    })
      ? representativeCandidate
      : "") ||
    images[0] ||
    "";

  const fixedImages = images.length
    ? images
    : representativeImage
    ? [representativeImage]
    : [];

  const expandedFixedImages = Array.from(
    new Set(
      fixedImages
        .flatMap((image) => getImageUrlCandidates(image))
        .filter(Boolean)
    )
  );
  const finalImages = limitImageUrlList(expandedFixedImages.length ? expandedFixedImages : fixedImages);
  const finalRepresentativeImage =
    getImageUrlCandidates(representativeImage)[0] ||
    finalImages[0] ||
    representativeImage ||
    "";

  const addressChanged =
    next.address &&
    base.address &&
    normalizeTextKey(next.address) !== normalizeTextKey(base.address);

  const nextHasCoord =
    next.lat ||
    next.lng ||
    next.location?.lat ||
    next.location?.lng;

  const premiumSource = getPremiumSourceValue(
    next,
    getPremiumSourceValue(base, false)
  );

  const premium = normalizePremiumValue(premiumSource);
  const premiumType = normalizePremiumType(premiumSource);
  const directPaymentEnabled = pickDirectPaymentEnabled(base, next);

  return {
    ...base,
    ...next,
    ...normalizeShopCourseDataFields(next, base),
    _id: next._id || next.id || base._id || base.id,
    id: next.id || next._id || base.id || base._id,
    address: next.address || next.roadAddress || next.fullAddress || base.address || "",
    roadAddress: next.roadAddress || next.address || next.fullAddress || base.roadAddress || base.address || "",
    fullAddress: next.fullAddress || next.address || next.roadAddress || base.fullAddress || base.address || "",
    businessHours: next.businessHours || next.openingHours || next.hours || base.businessHours || base.openingHours || base.hours || "",
    openingHours: next.openingHours || next.businessHours || next.hours || base.openingHours || base.businessHours || base.hours || "",
    hours: next.hours || next.businessHours || next.openingHours || base.hours || base.businessHours || base.openingHours || "",
    region: normalizeShopRegionName(
      next.region ||
        next.sido ||
        next.province ||
        base.region ||
        base.sido ||
        base.province ||
        getShopAddressRegion(next.address || next.roadAddress || next.fullAddress || base.address || base.roadAddress || base.fullAddress || ""),
      next.address || next.roadAddress || next.fullAddress || base.address || base.roadAddress || base.fullAddress || ""
    ),
    district:
      next.district ||
      next.sigungu ||
      next.city ||
      base.district ||
      base.sigungu ||
      base.city ||
      getShopAddressDistrict(next.address || next.roadAddress || next.fullAddress || base.address || base.roadAddress || base.fullAddress || ""),
    dong:
      next.dong ||
      next.neighborhood ||
      next.town ||
      base.dong ||
      base.neighborhood ||
      base.town ||
      getShopAddressDong(next.address || next.roadAddress || next.fullAddress || base.address || base.roadAddress || base.fullAddress || ""),
    lat: addressChanged && !nextHasCoord ? "" : next.lat || next.location?.lat || base.lat || base.location?.lat || "",
    lng: addressChanged && !nextHasCoord ? "" : next.lng || next.location?.lng || base.lng || base.location?.lng || "",
    location:
      addressChanged && !nextHasCoord
        ? { lat: "", lng: "" }
        : next.location || {
            lat: next.lat || base.lat || base.location?.lat || "",
            lng: next.lng || base.lng || base.location?.lng || "",
          },
    geo: addressChanged && !nextHasCoord ? undefined : next.geo || base.geo,
    premium,
    premiumType,
    premiumLevel: next.premiumLevel || next.level || next.tier || next.rank || base.premiumLevel || base.level || base.tier || base.rank || premiumType,
    membership: next.membership || next.membershipType || next.subscriptionType || next.plan || next.shopPlan || next.servicePlan || base.membership || base.membershipType || base.subscriptionType || base.plan || base.shopPlan || base.servicePlan || premiumType,
    membershipType: next.membershipType || next.membership || next.subscriptionType || next.plan || next.shopPlan || next.servicePlan || base.membershipType || base.membership || base.subscriptionType || base.plan || base.shopPlan || base.servicePlan || premiumType,
    listingType: next.listingType || base.listingType || premiumType,
    shopGrade: next.shopGrade || base.shopGrade || premiumType,
    imageGrade: next.imageGrade || next.photoGrade || base.imageGrade || base.photoGrade || premiumType,
    photoGrade: next.photoGrade || next.imageGrade || base.photoGrade || base.imageGrade || premiumType,
    isPremium: premium,
    premiumActive: premium,
    directPaymentEnabled,
    images: finalImages,
    photos: finalImages,
    imageUrls: finalImages,
    representativeImage: finalRepresentativeImage,
    mainImage:
      getImageUrlCandidates(next.mainImage)[0] ||
      getImageUrlCandidates(base.mainImage)[0] ||
      finalRepresentativeImage,
    thumbnail:
      getImageUrlCandidates(next.thumbnail)[0] ||
      getImageUrlCandidates(base.thumbnail)[0] ||
      finalRepresentativeImage,
    coverImage:
      getImageUrlCandidates(next.coverImage)[0] ||
      getImageUrlCandidates(base.coverImage)[0] ||
      finalRepresentativeImage,
    updatedAt: next.updatedAt || base.updatedAt || new Date().toISOString(),
  };
}

function mergeShopArrays(items = []) {
  const map = new Map();
  const aliasMap = new Map();

  const isTemporaryId = (value) => {
    const text = String(value || "").trim().toLowerCase();

    return (
      text.startsWith("local-") ||
      text.startsWith("local_shop") ||
      text.startsWith("local-shop") ||
      text.startsWith("temp-") ||
      text.startsWith("temporary-")
    );
  };

  const getPrimaryKey = (shop) => {
    const keys = getShopIdentityKeys(shop);

    if (keys.id && !isTemporaryId(keys.id)) {
      return `id:${keys.id}`;
    }

    return (
      keys.nameAddressKey ||
      keys.phoneKey ||
      keys.nameKey ||
      (keys.id ? `id:${keys.id}` : "") ||
      `local:${Date.now()}:${Math.random()}`
    );
  };

  const getAliases = (shop) => {
    const keys = getShopIdentityKeys(shop);
    const idKey = keys.id ? `id:${keys.id}` : "";
    const semanticKeys = [
      keys.nameAddressKey,
      keys.phoneKey,
      keys.nameKey,
    ].filter(Boolean);

    if (keys.id && !isTemporaryId(keys.id)) {
      return idKey ? [idKey] : [];
    }

    return Array.from(
      new Set([...semanticKeys, idKey].filter(Boolean))
    );
  };

  items
    .filter((shop) => shop && typeof shop === "object")
    .forEach((shop) => {
      const aliases = getAliases(shop);
      const primaryKey = getPrimaryKey(shop);
      const aliasKey = aliases.find((key) => aliasMap.has(key));
      const key = aliasKey ? aliasMap.get(aliasKey) : primaryKey;
      const current = map.get(key);
      const merged = current ? mergeShopObjects(current, shop) : mergeShopObjects({}, shop);

      map.set(key, merged);

      getAliases(merged).forEach((alias) => {
        aliasMap.set(alias, key);
      });
    });

  return Array.from(map.values());
}
async function fetchWithTimeout(url, options = {}, timeout = MUTATION_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function getUserObject() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (e) {
    return {};
  }
}

function parseJwt(token) {
  try {
    if (!token) return null;
    const base64 = token.split(".")[1];
    if (!base64) return null;
    return JSON.parse(atob(base64));
  } catch (e) {
    return null;
  }
}

function isLocalFallbackToken(token) {
  const value = String(token || "").trim();
  return value.startsWith("local-admin-") || value.startsWith("local-fallback-");
}

function isValidTokenValue(token) {
  if (!token || token === "undefined" || token === "null") return false;

  const value = String(token).trim();
  if (!value) return false;
  if (isLocalFallbackToken(value)) return true;
  if (value.split(".").length !== 3) return false;

  const payload = parseJwt(value);
  if (!payload) return false;
  if (payload?.exp && Date.now() >= payload.exp * 1000) return false;

  return true;
}

function clearInvalidTokens() {
  try {
    const keys = ["token", "accessToken", "authToken", "jwt", "adminToken"];

    keys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (!isValidTokenValue(value)) localStorage.removeItem(key);
    });

    const user = getUserObject();

    if (user && typeof user === "object") {
      const nextUser = { ...user };

      keys.forEach((key) => {
        if (!isValidTokenValue(nextUser[key])) delete nextUser[key];
      });

      localStorage.setItem("user", JSON.stringify(nextUser));
    }
  } catch (e) {
    console.warn("INVALID TOKEN CLEAR ERROR:", e.message);
  }
}

function clearAllAuthTokens() {
  try {
    ["token", "accessToken", "authToken", "jwt", "adminToken"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    const user = getUserObject();

    if (user && typeof user === "object") {
      const nextUser = { ...user };

      ["token", "accessToken", "authToken", "jwt", "adminToken"].forEach((key) => {
        delete nextUser[key];
      });

      localStorage.setItem("user", JSON.stringify(nextUser));
    }
  } catch (e) {
    console.warn("AUTH TOKEN CLEAR ERROR:", e.message);
  }
}

function syncUserToken(token) {
  if (!token || !isValidTokenValue(token)) return;

  try {
    const user = getUserObject();
    const payload = parseJwt(token);

    const nextUser = {
      ...user,
      token,
      accessToken: token,
      adminToken: token,
      jwt: token,
      authToken: token,
    };

    if (payload?.role) nextUser.role = payload.role;
    if (payload?.isAdmin !== undefined) nextUser.isAdmin = payload.isAdmin;

    if (isLocalFallbackToken(token)) {
      nextUser.role = nextUser.role || "admin";
      nextUser.userRole = nextUser.userRole || "admin";
      nextUser.type = nextUser.type || "admin";
      nextUser.isAdmin = true;
      nextUser.localFallback = true;
    }

    localStorage.setItem("user", JSON.stringify(nextUser));
  } catch (e) {
    console.warn("USER TOKEN SYNC ERROR:", e.message);
  }
}

function saveToken(token) {
  if (!token || !isValidTokenValue(token)) return;

  try {
    localStorage.setItem("token", token);
    localStorage.setItem("accessToken", token);
    localStorage.setItem("adminToken", token);
    localStorage.setItem("jwt", token);
    localStorage.setItem("authToken", token);

    sessionStorage.setItem("token", token);
    sessionStorage.setItem("accessToken", token);
    sessionStorage.setItem("adminToken", token);
    sessionStorage.setItem("jwt", token);
    sessionStorage.setItem("authToken", token);

    syncUserToken(token);
  } catch (e) {
    console.warn("SHOP TOKEN SAVE ERROR:", e.message);
  }
}

function getToken() {
  clearInvalidTokens();

  const user = getUserObject();

  const candidates = [
    localStorage.getItem("adminToken"),
    localStorage.getItem("token"),
    localStorage.getItem("accessToken"),
    localStorage.getItem("authToken"),
    localStorage.getItem("jwt"),
    localStorage.getItem("local-admin-token"),
    sessionStorage.getItem("adminToken"),
    sessionStorage.getItem("token"),
    sessionStorage.getItem("accessToken"),
    sessionStorage.getItem("authToken"),
    sessionStorage.getItem("jwt"),
    sessionStorage.getItem("local-admin-token"),
    user?.adminToken,
    user?.token,
    user?.accessToken,
    user?.authToken,
    user?.jwt,
  ];

  const token = candidates.find((v) => isValidTokenValue(v)) || "";

  if (!token) {
    clearInvalidTokens();
    return "";
  }

  return token;
}

function extractToken(data = {}) {
  const token =
    data?.token ||
    data?.accessToken ||
    data?.access_token ||
    data?.authToken ||
    data?.jwt ||
    data?.adminToken ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.access_token ||
    data?.data?.authToken ||
    data?.data?.jwt ||
    data?.data?.adminToken ||
    "";

  if (!token || token === "undefined" || token === "null") return "";

  return token;
}

function normalizeSearchKeyword(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "");
}

function normalizeResponseData(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  const queue = [data];
  const visited = new Set();
  const emptyArrays = [];
  const objectItems = [];
  const directKeys = [
    "shops",
    "items",
    "list",
    "rows",
    "docs",
    "result",
    "results",
    "payload",
    "body",
    "data",
  ];
  const singleKeys = ["shop", "item"];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    if (Array.isArray(current)) {
      if (current.length > 0) {
        return current;
      }

      emptyArrays.push(current);
      continue;
    }

    if (typeof current !== "object") {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const key of singleKeys) {
      const item = current[key];

      if (item && typeof item === "object" && !Array.isArray(item)) {
        objectItems.push(item);
      }
    }

    if (
      current._id ||
      current.id ||
      current.name ||
      current.shopName ||
      current.title
    ) {
      objectItems.push(current);
    }

    for (const key of directKeys) {
      const value = current[key];

      if (Array.isArray(value)) {
        if (value.length > 0) {
          return value;
        }

        emptyArrays.push(value);
      }
    }

    for (const key of directKeys) {
      const value = current[key];

      if (value && typeof value === "object" && !Array.isArray(value)) {
        queue.push(value);
      }
    }
  }

  if (objectItems.length > 0) {
    return objectItems;
  }

  return emptyArrays.length > 0 ? emptyArrays[0] : [];
}

function getShopAddressRegion(address = "") {
  const text = String(address || "");

  if (text.includes("서울")) return "서울특별시";
  if (text.includes("부산")) return "부산광역시";
  if (text.includes("대구")) return "대구광역시";
  if (text.includes("인천")) return "인천광역시";
  if (text.includes("광주")) return "광주광역시";
  if (text.includes("대전")) return "대전광역시";
  if (text.includes("울산")) return "울산광역시";
  if (text.includes("세종")) return "세종특별자치시";
  if (text.includes("경기")) return "경기도";
  if (text.includes("강원")) return "강원도";
  if (text.includes("충북") || text.includes("충청북도")) return "충청북도";
  if (text.includes("충남") || text.includes("충청남도")) return "충청남도";
  if (text.includes("전북") || text.includes("전라북도") || text.includes("전북특별자치도")) return "전라북도";
  if (text.includes("전남") || text.includes("전라남도")) return "전라남도";
  if (text.includes("경북") || text.includes("경상북도")) return "경상북도";
  if (text.includes("경남") || text.includes("경상남도")) return "경상남도";
  if (text.includes("제주")) return "제주특별자치도";

  if (text.includes("김해시")) return "경상남도";

  return "";
}

function normalizeShopRegionName(region = "", address = "") {
  const source = String(region || "").trim();
  const fromAddress = getShopAddressRegion(address);

  if (!source) return fromAddress;
  if (source === "서울") return "서울특별시";
  if (source === "부산") return "부산광역시";
  if (source === "대구") return "대구광역시";
  if (source === "인천") return "인천광역시";
  if (source === "광주") return "광주광역시";
  if (source === "대전") return "대전광역시";
  if (source === "울산") return "울산광역시";
  if (source === "세종") return "세종특별자치시";
  if (source === "경기") return "경기도";
  if (source === "강원") return "강원도";
  if (source === "충북") return "충청북도";
  if (source === "충남") return "충청남도";
  if (source === "전북") return "전라북도";
  if (source === "전남") return "전라남도";
  if (source === "경북") return "경상북도";
  if (source === "경남") return "경상남도";
  if (source === "제주") return "제주특별자치도";

  return source || fromAddress;
}

function getShopAddressDistrict(address = "") {
  const text = String(address || "");
  const match = text.match(/[가-힣]+(시|군|구)/);

  return match ? match[0] : "";
}

function getShopAddressDong(address = "") {
  const text = String(address || "");
  const match = text.match(/[가-힣]+(동|읍|면)/);

  return match ? match[0] : "";
}


function normalizeShopResponseItem(shop = {}, params = {}) {
  if (!shop || typeof shop !== "object" || Array.isArray(shop)) {
    return shop;
  }

  if (!isAuthoritativeAdminShopListRequest(params)) {
    shop = applyShopPremiumBank(shop);
  }

  const locationText =
    typeof shop.location === "string"
      ? shop.location
      : shop.locationText ||
        shop.addressText ||
        shop.addressName ||
        shop.road_address_name ||
        shop.jibunAddress ||
        shop.addr ||
        shop.location?.address ||
        shop.location?.addressName ||
        shop.location?.address_name ||
        shop.location?.roadAddress ||
        shop.location?.road_address_name ||
        shop.location?.jibunAddress ||
        shop.location?.addr ||
        shop.roadAddress ||
        shop.fullAddress ||
        shop.address ||
        "";

  const address =
    shop.address ||
    shop.roadAddress ||
    shop.fullAddress ||
    shop.jibunAddress ||
    shop.addr ||
    locationText ||
    "";

  const lat =
    shop.lat ||
    shop.latitude ||
    shop.y ||
    (shop.location && typeof shop.location === "object" ? shop.location.lat || shop.location.y : "") ||
    shop.geo?.coordinates?.[1] ||
    "";

  const lng =
    shop.lng ||
    shop.longitude ||
    shop.x ||
    (shop.location && typeof shop.location === "object" ? shop.location.lng || shop.location.x : "") ||
    shop.geo?.coordinates?.[0] ||
    "";

  const categoryPayload = normalizeShopCategoryPayload(shop, params);

  const region = normalizeShopRegionName(
    shop.region ||
      shop.sido ||
      shop.province ||
      shop.state ||
      shop.area ||
      getShopAddressRegion(address) ||
      getShopAddressRegion(locationText),
    address || locationText
  );

  const district =
    shop.district ||
    shop.sigungu ||
    shop.city ||
    shop.gu ||
    shop.county ||
    getShopAddressDistrict(address) ||
    getShopAddressDistrict(locationText);

  const dong =
    shop.dong ||
    shop.neighborhood ||
    shop.town ||
    shop.eupmyeondong ||
    shop.areaDong ||
    getShopAddressDong(address) ||
    getShopAddressDong(locationText);

  const images = collectImages(shop, {
    allowDataImage: true,
    allowBlob: false,
    maxLength: MAX_STORED_IMAGE_LENGTH,
    canonicalOnly: isAuthoritativeAdminShopListRequest(params),
    maxCount: getShopImageLimit(shop, params),
  });

  const representativeImage =
    normalizeImageValue(shop.representativeImage) ||
    normalizeImageValue(shop.mainImage) ||
    normalizeImageValue(shop.thumbnail) ||
    normalizeImageValue(shop.coverImage) ||
    images[0] ||
    "";

  const mainImage =
    normalizeImageValue(shop.mainImage) ||
    representativeImage;

  const thumbnail =
    normalizeImageValue(shop.thumbnail) ||
    representativeImage;

  const coverImage =
    normalizeImageValue(shop.coverImage) ||
    representativeImage;

  const fixedImages = images.length
    ? images
    : representativeImage
    ? [representativeImage]
    : [];

  const expandedFixedImages = Array.from(
    new Set(
      fixedImages
        .flatMap((image) => getImageUrlCandidates(image))
        .filter(Boolean)
    )
  );
  const finalImages = limitImageUrlList(
    expandedFixedImages.length ? expandedFixedImages : fixedImages,
    getShopImageLimit(shop, params)
  );
  const representativeCandidate =
    getImageUrlCandidates(representativeImage)[0] ||
    representativeImage ||
    "";
  const finalRepresentativeImage =
    finalImages.find((image) => image === representativeCandidate) ||
    finalImages[0] ||
    representativeCandidate ||
    "";

  const premium = normalizePremiumValue(shop);
  const premiumType = normalizePremiumType(shop);

  return {
    ...categoryPayload,
    ...normalizeShopCourseDataFields(shop),
    premium,
    premiumType,
    premiumLevel: shop.premiumLevel || shop.level || shop.tier || shop.rank || premiumType,
    membership: shop.membership || shop.membershipType || shop.subscriptionType || shop.plan || shop.shopPlan || shop.servicePlan || premiumType,
    membershipType: shop.membershipType || shop.membership || shop.subscriptionType || shop.plan || shop.shopPlan || shop.servicePlan || premiumType,
    listingType: shop.listingType || premiumType,
    shopGrade: shop.shopGrade || premiumType,
    imageGrade: shop.imageGrade || shop.photoGrade || premiumType,
    photoGrade: shop.photoGrade || shop.imageGrade || premiumType,
    isPremium: premium,
    premiumActive: premium,
    directPaymentEnabled: normalizeDirectPaymentEnabled(shop.directPaymentEnabled),
    address,
    roadAddress: shop.roadAddress || shop.address || shop.fullAddress || locationText || address,
    fullAddress: shop.fullAddress || shop.address || shop.roadAddress || locationText || address,
    locationText: shop.locationText || locationText || address,
    region,
    district,
    dong,
    lat,
    lng,
    images: finalImages,
    photos: finalImages,
    imageUrls: finalImages,
    gallery: finalImages,
    pictures: finalImages,
    image: getImageUrlCandidates(shop.image)[0] || finalRepresentativeImage,
    imageUrl: getImageUrlCandidates(shop.imageUrl)[0] || finalRepresentativeImage,
    photo: getImageUrlCandidates(shop.photo)[0] || finalRepresentativeImage,
    picture: getImageUrlCandidates(shop.picture)[0] || finalRepresentativeImage,
    representativeImage: finalRepresentativeImage,
    mainImage:
      getImageUrlCandidates(mainImage)[0] ||
      finalRepresentativeImage,
    thumbnail:
      getImageUrlCandidates(thumbnail)[0] ||
      finalRepresentativeImage,
    coverImage:
      getImageUrlCandidates(coverImage)[0] ||
      finalRepresentativeImage,
    location:
      shop.location && typeof shop.location === "object"
        ? {
            ...shop.location,
            lat: lat || shop.location.lat || shop.location.y || "",
            lng: lng || shop.location.lng || shop.location.x || "",
          }
        : {
            lat,
            lng,
          },
  };
}

function normalizeShopResponseShape(data, params = {}) {
  const items = normalizeResponseData(data);

  if (Array.isArray(items)) {
    const normalizedItems = items.map((shop) => normalizeShopResponseItem(shop, params));
    const hasScope = hasCategoryScope(params);
    const isAdminListParams =
      !hasScope &&
      (
        params?.admin === "true" ||
        params?.adminMode === "true" ||
        params?.adminList === "true" ||
        params?.management === "true" ||
        isAdminRuntimePath()
      );

    const authoritativeAdminShopRequest =
      isAuthoritativeAdminShopRequest(params);

    const mergedItems = authoritativeAdminShopRequest
      ? filterShopsByCategory(
          filterServerDeletedShops(
            filterShopsByCategory(normalizedItems, params)
          ),
          params
        )
      : isAdminListParams
      ? filterDeletedShops(mergeShopArrays(normalizedItems))
      : filterShopsByCategory(
          filterDeletedShops(
            mergeShopArrays([
              ...filterShopsByCategory(normalizedItems, params),
            ])
          ),
          params
        );

    if (data && typeof data === "object" && !Array.isArray(data)) {
      return {
        ...data,
        ok: data.ok !== false,
        shops: mergedItems,
        list: mergedItems,
        items: mergedItems,
        data: mergedItems,
        total: mergedItems.length,
        count: mergedItems.length,
      };
    }

    return {
      ok: true,
      shops: mergedItems,
      list: mergedItems,
      items: mergedItems,
      data: mergedItems,
      total: mergedItems.length,
      count: mergedItems.length,
    };
  }

  return {
    ok: data?.ok !== false,
    shops: [],
    list: [],
    items: [],
    data: [],
    total: 0,
    count: 0,
  };
}

function getStorageSafeShop(shop = {}) {
  const images = [];
  const pushImage = (value) => {
    const normalizedValue = normalizeImageValue(value);

    if (
      normalizedValue &&
      !images.includes(normalizedValue) &&
      isSafeImageValue(normalizedValue, {
        allowDataImage: true,
        allowBlob: false,
        maxLength: MAX_STORED_IMAGE_LENGTH,
      })
    ) {
      images.push(normalizedValue);
    }
  };

  collectImages(shop, { allowDataImage: true, allowBlob: false }).forEach(pushImage);

  const representativeCandidate =
    normalizeImageValue(shop.representativeImage) ||
    normalizeImageValue(shop.mainImage) ||
    normalizeImageValue(shop.thumbnail) ||
    normalizeImageValue(shop.coverImage) ||
    images[0] ||
    "";

  const representativeImage =
    images.find((image) => image === representativeCandidate) ||
    (isSafeImageValue(representativeCandidate, {
      allowDataImage: true,
      allowBlob: false,
      maxLength: MAX_STORED_IMAGE_LENGTH,
    })
      ? representativeCandidate
      : "") ||
    images[0] ||
    "";

  const finalImages = images.length
    ? images
    : representativeImage
    ? [representativeImage]
    : [];

  const premiumSource = getPremiumSourceValue(shop, false);

  const premium = normalizePremiumValue(premiumSource);
  const premiumType = normalizePremiumType(premiumSource);
  const storageImages = limitImageUrlList(
    finalImages.flatMap((image) => getImageUrlCandidates(image)).filter(Boolean)
  );

  return {
    ...shop,
    region: normalizeShopRegionName(shop.region || shop.sido || shop.province || "", shop.address || shop.roadAddress || shop.fullAddress || ""),
    premium,
    premiumType,
    premiumLevel: shop.premiumLevel || shop.level || shop.tier || shop.rank || premiumType,
    membership: shop.membership || shop.membershipType || shop.subscriptionType || shop.plan || shop.shopPlan || shop.servicePlan || premiumType,
    membershipType: shop.membershipType || shop.membership || shop.subscriptionType || shop.plan || shop.shopPlan || shop.servicePlan || premiumType,
    listingType: shop.listingType || premiumType,
    shopGrade: shop.shopGrade || premiumType,
    imageGrade: shop.imageGrade || shop.photoGrade || premiumType,
    photoGrade: shop.photoGrade || shop.imageGrade || premiumType,
    isPremium: premium,
    premiumActive: premium,
    directPaymentEnabled: normalizeDirectPaymentEnabled(shop.directPaymentEnabled),
    images: storageImages,
    photos: storageImages,
    imageUrls: storageImages,
    representativeImage:
      getImageUrlCandidates(representativeImage)[0] ||
      representativeImage,
    mainImage:
      getImageUrlCandidates(shop.mainImage)[0] ||
      getImageUrlCandidates(representativeImage)[0] ||
      representativeImage,
    thumbnail:
      getImageUrlCandidates(shop.thumbnail)[0] ||
      getImageUrlCandidates(representativeImage)[0] ||
      representativeImage,
    coverImage:
      getImageUrlCandidates(shop.coverImage)[0] ||
      getImageUrlCandidates(representativeImage)[0] ||
      representativeImage,
  };
}

function getNetworkSafeShop(shop = {}) {
  const images = collectImages(shop, { allowDataImage: true, allowBlob: false })
    .map((value) => normalizeNetworkImageValue(value))
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((value) =>
      isSafeImageValue(value, {
        allowDataImage: true,
        allowBlob: false,
        maxLength: MAX_STORED_IMAGE_LENGTH,
      })
    )
    .slice(0, MAX_SAFE_SHOP_IMAGE_COUNT);

  const representativeImage =
    normalizeNetworkImageValue(shop.representativeImage) ||
    images[0] ||
    "";

  return {
    ...shop,
    directPaymentEnabled: normalizeDirectPaymentEnabled(shop.directPaymentEnabled),
    images,
    photos: images,
    imageUrls: images,
    representativeImage,
    mainImage:
      normalizeNetworkImageValue(shop.mainImage) ||
      representativeImage,
    thumbnail:
      normalizeNetworkImageValue(shop.thumbnail) ||
      representativeImage,
    coverImage:
      normalizeNetworkImageValue(shop.coverImage) ||
      representativeImage,
  };
}

function parseStorageArray(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((shop) => shop && typeof shop === "object")
      : [];
  } catch (e) {
    return [];
  }
}

function parseStorageStringArray(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");

    return Array.isArray(value)
      ? value
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [];
  } catch (e) {
    return [];
  }
}

function normalizeDeletedShopValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s/g, "");
}

function isSafeDeletedShopIdentityValue(value) {
  const text = String(value || "").trim();

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

  const plainText = text
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

function getDeletedShopIds() {
  try {
    const values = [
      ...parseStorageStringArray(localStorage, DELETED_SHOP_STORAGE_KEY),
      ...parseStorageStringArray(sessionStorage, DELETED_SHOP_STORAGE_KEY),
    ];

    return Array.from(
      new Set(
        values
          .filter((value) => isSafeDeletedShopIdentityValue(value))
          .flatMap((value) => [
            String(value || "").trim(),
            normalizeDeletedShopValue(value),
          ])
          .filter(Boolean)
      )
    );
  } catch (e) {
    return [];
  }
}

function getDeletedShopIdentityValues(shop = {}) {
  const id = String(shop?._id || shop?.id || "").trim();
  const shopId = String(shop?.shopId || "").trim();
  const uuid = String(shop?.uuid || "").trim();

  const rawValues = [
    id,
    id ? `id:${id}` : "",
    shopId,
    shopId ? `shopId:${shopId}` : "",
    uuid,
    uuid ? `uuid:${uuid}` : "",
  ];

  return Array.from(
    new Set(
      rawValues
        .flatMap((item) => [
          String(item || "").trim(),
          normalizeDeletedShopValue(item),
        ])
        .filter(Boolean)
    )
  );
}

function isDeletedShop(shop = {}) {
  try {
    const deletedIds = getDeletedShopIds();

    if (!deletedIds.length) {
      return false;
    }

    const deletedSet = new Set(
      deletedIds
        .flatMap((value) => [
          String(value || "").trim(),
          normalizeDeletedShopValue(value),
        ])
        .filter(Boolean)
    );

    const values = getDeletedShopIdentityValues(shop);

    return values.some((value) => deletedSet.has(value));
  } catch (e) {
    console.warn("DELETED SHOP CHECK ERROR:", e.message);

    return false;
  }
}

function filterDeletedShops(items = []) {
  return (Array.isArray(items) ? items : []).filter((shop) => !isDeletedShop(shop));
}

function isAuthoritativeAdminDashboardRequest(params = {}) {
  try {
    const pathname =
      typeof window !== "undefined" && window.location
        ? String(window.location.pathname || "").toLowerCase()
        : "";

    return (
      pathname === "/admin/dashboard" ||
      pathname === "/admin/dashboard/"
    ) && (
      params?.admin === "true" ||
      params?.adminMode === "true" ||
      params?.adminList === "true" ||
      params?.forAdmin === "true" ||
      params?.fromAdmin === "true" ||
      params?.management === "true"
    );
  } catch (e) {
    return false;
  }
}

function isAuthoritativeAdminShopListRequest(params = {}) {
  try {
    const pathname =
      typeof window !== "undefined" && window.location
        ? String(window.location.pathname || "").toLowerCase()
        : "";

    return (
      pathname === "/admin/shops" ||
      pathname === "/admin/shops/" ||
      pathname === "/admin/karaoke/shops" ||
      pathname === "/admin/karaoke/shops/"
    ) && (
      params?.admin === "true" ||
      params?.adminMode === "true" ||
      params?.adminList === "true" ||
      params?.forAdmin === "true" ||
      params?.fromAdmin === "true" ||
      params?.management === "true"
    );
  } catch (e) {
    return false;
  }
}

function isAuthoritativeKaraokeMapRequest(params = {}) {
  try {
    const pathname =
      typeof window !== "undefined" && window.location
        ? String(window.location.pathname || "").toLowerCase()
        : "";

    const category = getEffectiveCategory(params);

    return (
      (pathname === "/karaoke/map" || pathname === "/karaoke/map/") &&
      category === "karaoke" &&
      (
        params?.admin === "true" ||
        params?.adminMode === "true" ||
        params?.adminList === "true" ||
        params?.forAdmin === "true" ||
        params?.fromAdmin === "true" ||
        params?.management === "true"
      )
    );
  } catch (e) {
    return false;
  }
}

function isAuthoritativeAdminShopRequest(params = {}) {
  return (
    isAuthoritativeAdminDashboardRequest(params) ||
    isAuthoritativeAdminShopListRequest(params) ||
    isAuthoritativeKaraokeMapRequest(params)
  );
}

function isAuthoritativeAdminRuntimeShopRequest(url = "", options = {}) {
  try {
    if (typeof window === "undefined" || !window.location) {
      return false;
    }

    const pathname = String(window.location.pathname || "").toLowerCase();
    const method = String(options?.method || "GET").toUpperCase();
    const path = getPathOnly(url);

    if (
      pathname !== "/admin/shops" &&
      pathname !== "/admin/shops/" &&
      pathname !== "/admin/karaoke/shops" &&
      pathname !== "/admin/karaoke/shops/"
    ) {
      return false;
    }

    if (method !== "GET") {
      return false;
    }

    return (
      path === "/shops" ||
      path === "/shops/admin/stats" ||
      path === "/shops/admin/dashboard-stats" ||
      path === "/shops/admin/monthly-stats"
    );
  } catch (e) {
    return false;
  }
}

function filterServerDeletedShops(items = []) {
  return (Array.isArray(items) ? items : []).filter(
    (shop) =>
      shop &&
      shop.isDeleted !== true &&
      shop.deleted !== true &&
      shop.removed !== true
  );
}

function clearAuthoritativeAdminShopDeletedMarkers(items = [], params = {}) {
  try {
    if (typeof window === "undefined" || !window.location) {
      return;
    }

    const pathname = String(window.location.pathname || "").toLowerCase();
    const category = getEffectiveCategory(params);

    if (pathname !== "/admin/shops" || category !== "massage") {
      return;
    }

    const serverItems = Array.isArray(items) ? items : [];

    if (!serverItems.length) {
      return;
    }

    const serverIdentitySet = new Set(
      serverItems
        .flatMap((shop) => getDeletedShopIdentityValues(shop))
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );

    if (!serverIdentitySet.size) {
      return;
    }

    const storageKeys = Array.from(
      new Set([
        DELETED_SHOP_STORAGE_KEY,
        `nora_deleted_shop_ids_${category}`,
        `noma_deleted_shop_ids_${category}`,
      ])
    );

    [localStorage, sessionStorage].forEach((storage) => {
      storageKeys.forEach((key) => {
        const currentValues = parseStorageStringArray(storage, key);

        if (!currentValues.length) {
          return;
        }

        const nextValues = currentValues.filter((value) => {
          const rawValue = String(value || "").trim();
          const normalizedValue = normalizeDeletedShopValue(rawValue);

          return !(
            serverIdentitySet.has(rawValue) ||
            serverIdentitySet.has(normalizedValue)
          );
        });

        if (nextValues.length === currentValues.length) {
          return;
        }

        storage.setItem(key, JSON.stringify(nextValues));
      });
    });
  } catch (e) {
    console.warn("SHOP AUTHORITATIVE DELETE MARKER CLEAR SKIP:", e.message);
  }
}

function rememberDeletedShop(shopOrId) {
  try {
    const values =
      shopOrId && typeof shopOrId === "object"
        ? getDeletedShopIdentityValues(shopOrId)
        : [String(shopOrId || "").trim()].filter(Boolean);

    const safeValues = values.filter((value) => isSafeDeletedShopIdentityValue(value));

    if (!safeValues.length) {
      return;
    }

    const nextIds = Array.from(new Set([...getDeletedShopIds(), ...safeValues]));
    const storageText = JSON.stringify(nextIds);

    localStorage.setItem(DELETED_SHOP_STORAGE_KEY, storageText);
    sessionStorage.setItem(DELETED_SHOP_STORAGE_KEY, storageText);
  } catch (e) {
    console.warn("DELETED SHOP SAVE ERROR:", e.message);
  }
}

function forgetDeletedShop(shopOrId) {
  try {
    const values =
      shopOrId && typeof shopOrId === "object"
        ? getDeletedShopIdentityValues(shopOrId)
        : [String(shopOrId || "").trim()].filter(Boolean);

    const safeValues = values.filter((value) => isSafeDeletedShopIdentityValue(value));

    if (!safeValues.length) {
      return;
    }

    const nextIds = getDeletedShopIds().filter((item) => !safeValues.includes(item));
    const storageText = JSON.stringify(nextIds);

    localStorage.setItem(DELETED_SHOP_STORAGE_KEY, storageText);
    sessionStorage.setItem(DELETED_SHOP_STORAGE_KEY, storageText);
  } catch (e) {
    console.warn("DELETED SHOP REMOVE ERROR:", e.message);
  }
}

function getLocalShops(params = {}) {
  try {
    const category = getEffectiveCategory(params);
    const localPublicKey = getScopedStorageKey(LOCAL_SHOP_STORAGE_KEY, params);
    const localAdminKey = getScopedStorageKey(LOCAL_ADMIN_SHOP_STORAGE_KEY, params);

    const savedPublic = parseStorageArray(localStorage, localPublicKey);
    const savedAdmin = parseStorageArray(localStorage, localAdminKey);
    const sessionPublic = parseStorageArray(sessionStorage, localPublicKey);
    const sessionAdmin = parseStorageArray(sessionStorage, localAdminKey);

    const isMassageAdminRuntime =
      category === "massage" &&
      typeof window !== "undefined" &&
      String(window.location?.pathname || "").toLowerCase() === "/admin/shops";

    const categoryMirrorKeys = category
      ? [
          `noma_admin_shops_${category}`,
          `noma_local_shops_${category}`,
          `noma_admin_shop_backup_${category}`,
          `nora_admin_shops_${category}`,
          `nora_local_shops_${category}`,
          `nora_admin_shop_backup_${category}`,
          ...(isMassageAdminRuntime
            ? [
                LOCAL_SHOP_STORAGE_KEY,
                LOCAL_ADMIN_SHOP_STORAGE_KEY,
                "noma_admin_shops",
                "noma_local_shops",
                "noma_admin_shop_backup",
                "nora_admin_shop_backup",
                "nora_admin_shops",
                "nora_local_shops",
              ]
            : []),
        ]
      : [
          LOCAL_SHOP_STORAGE_KEY,
          LOCAL_ADMIN_SHOP_STORAGE_KEY,
          "noma_admin_shops",
          "noma_local_shops",
          "noma_admin_shop_backup",
          "nora_admin_shop_backup",
          "nora_admin_shops",
          "nora_local_shops",
        ];

    const mirrorLocalItems = categoryMirrorKeys.flatMap((key) =>
      parseStorageArray(localStorage, key)
    );
    const mirrorSessionItems = categoryMirrorKeys.flatMap((key) =>
      parseStorageArray(sessionStorage, key)
    );

    const mergedItems = filterDeletedShops(
      mergeShopArrays([
        ...filterShopsByCategory(LOCAL_SHOP_MEMORY, params),
        ...savedPublic,
        ...sessionPublic,
        ...savedAdmin,
        ...sessionAdmin,
        ...mirrorLocalItems,
        ...mirrorSessionItems,
      ]).map((shop) => applyShopImageBank(applyShopPremiumBank(shop)))
    );

    if (
      !category &&
      (
        params?.admin === "true" ||
        params?.adminMode === "true" ||
        params?.adminList === "true" ||
        params?.management === "true" ||
        isAdminRuntimePath()
      )
    ) {
      return mergedItems;
    }

    return filterShopsByCategory(mergedItems, params);
  } catch (e) {
    return Array.isArray(LOCAL_SHOP_MEMORY)
      ? filterShopsByCategory(
          filterDeletedShops(
            mergeShopArrays(LOCAL_SHOP_MEMORY).map((shop) => applyShopImageBank(applyShopPremiumBank(shop)))
          ),
          params
        )
      : [];
  }
}

function safeSetStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function clearShopStorage(params = {}) {
  try {
    const category = getCategoryFromParams(params);

    if (category) {
      localStorage.removeItem(getScopedStorageKey(LOCAL_SHOP_STORAGE_KEY, params));
      localStorage.removeItem(getScopedStorageKey(LOCAL_ADMIN_SHOP_STORAGE_KEY, params));
      sessionStorage.removeItem(getScopedStorageKey(LOCAL_SHOP_STORAGE_KEY, params));
      sessionStorage.removeItem(getScopedStorageKey(LOCAL_ADMIN_SHOP_STORAGE_KEY, params));
      return;
    }

    ["massage", "karaoke"].forEach((item) => {
      localStorage.removeItem(getScopedStorageKey(LOCAL_SHOP_STORAGE_KEY, { category: item }));
      localStorage.removeItem(getScopedStorageKey(LOCAL_ADMIN_SHOP_STORAGE_KEY, { category: item }));
      sessionStorage.removeItem(getScopedStorageKey(LOCAL_SHOP_STORAGE_KEY, { category: item }));
      sessionStorage.removeItem(getScopedStorageKey(LOCAL_ADMIN_SHOP_STORAGE_KEY, { category: item }));
    });

    localStorage.removeItem(LOCAL_SHOP_STORAGE_KEY);
    localStorage.removeItem(LOCAL_ADMIN_SHOP_STORAGE_KEY);
    sessionStorage.removeItem(LOCAL_SHOP_STORAGE_KEY);
    sessionStorage.removeItem(LOCAL_ADMIN_SHOP_STORAGE_KEY);
  } catch (e) {
    console.warn("LOCAL SHOP STORAGE CLEAR ERROR:", e.message);
  }
}

function dispatchShopStorageEvent(shops, params = {}) {
  try {
    if (typeof window === "undefined") {
      return;
    }

    const safeShops = Array.isArray(shops) ? shops : [];
    const categoryParams = makeCategoryParams(params);
    const category = categoryParams.category || getEffectiveCategory(params);
    const eventKey = [
      category || "all",
      safeShops.length,
      safeShops
        .slice(0, 20)
        .map((shop) =>
          [
            String(shop?._id || shop?.id || shop?.shopId || shop?.name || ""),
            normalizePremiumType(shop),
            normalizePremiumValue(shop) ? "1" : "0",
            normalizeDirectPaymentEnabled(shop?.directPaymentEnabled) ? "direct:1" : "direct:0",
            String(shop?.premiumLevel || shop?.membershipType || shop?.listingType || shop?.shopGrade || shop?.imageGrade || shop?.photoGrade || ""),
            String(shop?.updatedAt || shop?.modifiedAt || ""),
          ].join(":")
        )
        .join(","),
    ].join("|");

    if (SHOP_EVENT_KEY === eventKey && SHOP_EVENT_TIMER) {
      return;
    }

    SHOP_EVENT_KEY = eventKey;

    if (SHOP_EVENT_TIMER) {
      window.clearTimeout(SHOP_EVENT_TIMER);
    }

    SHOP_EVENT_TIMER = window.setTimeout(() => {
      try {
        SHOP_EVENT_TIMER = null;

        window.dispatchEvent(
          new CustomEvent("shops-updated", {
            detail: {
              shops: safeShops,
              category,
              shopCategory: category,
              serviceType: category,
              businessType: category,
              adminCategory: category,
              total: safeShops.length,
              count: safeShops.length,
              premiumBankKey: LOCAL_SHOP_PREMIUM_BANK_KEY,
              legacyPremiumBankKey: LEGACY_NOMA_SHOP_PREMIUM_BANK_KEY,
            },
          })
        );
      } catch (e) {
        console.warn("SHOP EVENT DISPATCH ERROR:", e.message);
      }
    }, SHOP_EVENT_THROTTLE_MS);
  } catch (e) {
    console.warn("SHOP EVENT TIMER ERROR:", e.message);
  }
}

function saveLocalShops(items = [], params = {}) {
  const categoryParams =
    makeCategoryParams(params).category
      ? makeCategoryParams(params)
      : makeCategoryParams((Array.isArray(items) ? items : []).find((shop) => getCategoryFromShop(shop)) || {});

  const rawItems = filterShopsByCategory(
    (Array.isArray(items) ? items : []).map((shop) =>
      normalizeShopCategoryPayload(shop, categoryParams)
    ),
    categoryParams
  );
  const replaceItems = rawItems.filter((shop) => shop?.__replaceImages === true);
  const memoryItems = filterDeletedShops(mergeShopArrays(rawItems))
    .map((shop) => {
      const matchedReplaceItem = replaceItems.find((replaceItem) => {
        const shopKeys = getShopImageBankKeys(shop);
        const replaceKeys = getShopImageBankKeys(replaceItem);

        return shopKeys.some((key) => replaceKeys.includes(key));
      });

      return matchedReplaceItem ? mergeShopObjects(shop, matchedReplaceItem) : shop;
    })
    .slice(0, MAX_STORED_SHOPS);

  writeShopImageBank(memoryItems, { replace: replaceItems.length > 0 });

  if (!isAuthoritativeAdminShopRequest(categoryParams)) {
    writeShopPremiumBank(memoryItems);
  }

  LOCAL_SHOP_MEMORY = mergeShopArrays([
    ...(
      categoryParams.category
        ? filterShopsByCategory(LOCAL_SHOP_MEMORY, categoryParams)
        : []
    ),
    ...memoryItems,
  ]);

  const storageItems = filterShopsByCategory(
    filterDeletedShops(memoryItems.map((shop) => getStorageSafeShop(applyShopImageBank(applyShopPremiumBank(shop))))),
    categoryParams
  ).slice(0, MAX_STORED_SHOPS);

  try {
    clearShopStorage(categoryParams);

    const storageText = JSON.stringify(storageItems);

    const localPublicKey = getScopedStorageKey(LOCAL_SHOP_STORAGE_KEY, categoryParams);
    const localAdminKey = getScopedStorageKey(LOCAL_ADMIN_SHOP_STORAGE_KEY, categoryParams);

    const localPublicOk = safeSetStorage(localStorage, localPublicKey, storageText);
    const localAdminOk = safeSetStorage(localStorage, localAdminKey, storageText);
    const sessionPublicOk = safeSetStorage(sessionStorage, localPublicKey, storageText);
    const sessionAdminOk = safeSetStorage(sessionStorage, localAdminKey, storageText);

    if (!localPublicOk || !localAdminOk) {
      if (sessionPublicOk && sessionAdminOk) {
        dispatchShopStorageEvent(storageItems, categoryParams);
        return;
      }

      const compactItems = storageItems.map((shop) => {
        const images = collectImages(shop, {
          allowDataImage: true,
          allowBlob: false,
          maxLength: MAX_STORED_IMAGE_LENGTH,
        });

        const representativeImage =
          images.find((image) => image === normalizeImageValue(shop.representativeImage)) ||
          images[0] ||
          "";

        return {
          ...shop,
          images,
          photos: images,
          imageUrls: images,
          representativeImage,
          mainImage:
            normalizeImageValue(shop.mainImage) ||
            representativeImage,
          thumbnail:
            normalizeImageValue(shop.thumbnail) ||
            representativeImage,
          coverImage:
            normalizeImageValue(shop.coverImage) ||
            representativeImage,
        };
      });

      const compactStorageText = JSON.stringify(compactItems);
      const compactSessionPublicOk = safeSetStorage(sessionStorage, localPublicKey, compactStorageText);
      const compactSessionAdminOk = safeSetStorage(sessionStorage, localAdminKey, compactStorageText);

      if (compactSessionPublicOk && compactSessionAdminOk) {
        dispatchShopStorageEvent(compactItems, categoryParams);
        return;
      }

      const textOnlyItems = storageItems.map((shop) => {
        const images = collectImages(shop, {
          allowDataImage: true,
          allowBlob: false,
          maxLength: MAX_STORED_IMAGE_LENGTH,
        });

        const representativeImage =
          images.find((image) => image === normalizeImageValue(shop.representativeImage)) ||
          images[0] ||
          "";

        return {
          ...shop,
          images,
          photos: images,
          imageUrls: images,
          gallery: images,
          pictures: images,
          files: [],
          image: normalizeImageValue(shop.image) || representativeImage,
          imageUrl: normalizeImageValue(shop.imageUrl) || representativeImage,
          photo: normalizeImageValue(shop.photo) || representativeImage,
          picture: normalizeImageValue(shop.picture) || representativeImage,
          representativeImage,
          mainImage:
            normalizeImageValue(shop.mainImage) ||
            representativeImage,
          thumbnail:
            normalizeImageValue(shop.thumbnail) ||
            representativeImage,
          coverImage:
            normalizeImageValue(shop.coverImage) ||
            representativeImage,
        };
      });

      clearShopStorage(categoryParams);

      const textOnlyStorageText = JSON.stringify(textOnlyItems);

      safeSetStorage(localStorage, localPublicKey, textOnlyStorageText);
      safeSetStorage(localStorage, localAdminKey, textOnlyStorageText);
      safeSetStorage(sessionStorage, localPublicKey, textOnlyStorageText);
      safeSetStorage(sessionStorage, localAdminKey, textOnlyStorageText);

      dispatchShopStorageEvent(textOnlyItems, categoryParams);
      return;
    }

    dispatchShopStorageEvent(storageItems, categoryParams);
  } catch (e) {
    console.warn("LOCAL SHOP SAVE ERROR:", e.message);
  }
}

function getFallbackShops(params = {}) {
  try {
    const hasScope = hasCategoryScope(params);
    const isAdminFallbackParams =
      !hasScope &&
      (
        params?.admin === "true" ||
        params?.adminMode === "true" ||
        params?.adminList === "true" ||
        params?.management === "true" ||
        isAdminRuntimePath()
      );

    if (!isAdminFallbackParams) {
      return [];
    }

    return filterDeletedShops(
      mergeShopArrays([
        ...getLocalShops(params),
        ...LOCAL_SHOP_MEMORY,
        ...FALLBACK_SHOPS,
      ]).map((shop) => applyShopImageBank(applyShopPremiumBank(shop)))
    );
  } catch (e) {
    const hasScope = hasCategoryScope(params);
    const isAdminFallbackParams =
      !hasScope &&
      (
        params?.admin === "true" ||
        params?.adminMode === "true" ||
        params?.adminList === "true" ||
        params?.management === "true" ||
        isAdminRuntimePath()
      );

    if (!isAdminFallbackParams) {
      return [];
    }

    return filterDeletedShops(mergeShopArrays([...LOCAL_SHOP_MEMORY, ...FALLBACK_SHOPS]));
  }
}

function isAdminRuntimePath() {
  try {
    if (typeof window === "undefined" || !window.location) {
      return false;
    }

    const pathname = String(window.location.pathname || "").toLowerCase();

    return pathname === "/admin" || pathname.startsWith("/admin/");
  } catch (e) {
    return false;
  }
}

function makeAdminListParams(params = {}) {
  if (!isAdminRuntimePath()) {
    return {
      ...params,
    };
  }

  const categoryParams = makeCategoryParams(params);

  return {
    ...categoryParams,
    ...params,
    admin: "true",
    adminMode: "true",
    adminList: "true",
    forAdmin: "true",
    fromAdmin: "true",
    management: "true",
  };
}

function isLocalShopId(value) {
  return String(value || "").trim().startsWith("local-shop-");
}

function getLocalShopDetailResult(id, params = {}) {
  const targetValue = String(id || "").trim();
  const normalizedTargetValue = normalizeDeletedShopValue(id);
  const fallbackShop = getFallbackShops(params).find((shop) => {
    const values = getDeletedShopIdentityValues(shop);

    return values.includes(targetValue) || values.includes(normalizedTargetValue);
  });

  if (fallbackShop && !isDeletedShop(fallbackShop)) {
    return {
      ok: true,
      shop: fallbackShop,
      data: fallbackShop,
      item: fallbackShop,
    };
  }

  return {
    ok: true,
    shop: null,
    data: null,
    item: null,
  };
}

function isStatsUrl(url) {
  return (
    url.startsWith("/shops/admin/stats") ||
    url.startsWith("/shops/admin/dashboard-stats") ||
    url.startsWith("/shops/admin/monthly-stats")
  );
}

function getStatsCacheKey(url = "", params = {}) {
  return getStableRequestCacheKey(url, {
    categoryParams: makeCategoryParams({
      ...params,
      url,
    }),
  });
}

async function getSharedStatsRequest(url = "", params = {}, fallbackFactory = null) {
  const categoryParams = makeCategoryParams({
    ...params,
    url,
  });
  const requestUrl = appendCategoryQuery(url, categoryParams);
  const cacheKey = getStatsCacheKey(requestUrl, categoryParams);

  const cachedStats = getCachedMapValue(
    SHOP_STATS_CACHE,
    cacheKey,
    SHOP_STATS_CACHE_TTL_MS
  );

  if (cachedStats) {
    return cachedStats;
  }

  const pendingStats = SHOP_STATS_IN_FLIGHT.get(cacheKey);

  if (pendingStats) {
    return pendingStats;
  }

  const statsPromise = (async () => {
    try {
      const result = await request(requestUrl, {
        categoryParams,
      });

      setCachedMapValue(SHOP_STATS_CACHE, cacheKey, result);
      cleanupLimitedMap(SHOP_STATS_CACHE);

      return result;
    } catch (e) {
      const fallbackResult =
        typeof fallbackFactory === "function"
          ? fallbackFactory(categoryParams, e)
          : getFallbackByUrl(requestUrl, categoryParams);

      setCachedMapValue(SHOP_STATS_CACHE, cacheKey, fallbackResult);
      cleanupLimitedMap(SHOP_STATS_CACHE);

      return fallbackResult;
    }
  })();

  SHOP_STATS_IN_FLIGHT.set(cacheKey, statsPromise);
  cleanupLimitedMap(SHOP_STATS_IN_FLIGHT);

  try {
    return await statsPromise;
  } finally {
    SHOP_STATS_IN_FLIGHT.delete(cacheKey);
  }
}

function getFallbackByUrl(url, params = {}) {
  const categoryParams = makeCategoryParams({ ...params, url });
  const shops = getFallbackShops({ ...categoryParams, ...params, url });

  if (isStatsUrl(url)) {
    return {
      ...FALLBACK_STATS,
      shops,
      shopCount: shops.length,
      totalShops: shops.length,
      activeShops: shops.filter((shop) => shop.status === "active").length,
      inactiveShops: shops.filter((shop) => shop.status !== "active").length,
      list: shops,
      items: shops,
      data: shops,
    };
  }

  return {
    ok: true,
    shops,
    list: shops,
    items: shops,
    data: shops,
    total: shops.length,
    count: shops.length,
  };
}

function shouldUseShopFallback(url, options = {}) {
  const method = String(options?.method || "GET").toUpperCase();
  const path = getPathOnly(url);

  if (isStatsUrl(path) || isStatsUrl(url)) {
    return true;
  }

  if (method === "GET" && (path === "/shops" || path.startsWith("/shops?"))) {
    return true;
  }

  if (
    method === "GET" &&
    (
      path === "/shops/top/list" ||
      path === "/shops/recent/list" ||
      path === "/shops/nearby/list" ||
      path === "/shops/premium/nearby" ||
      path === "/shops/ranking/list" ||
      path === "/shops/random/list" ||
      path === "/shops/cache/list" ||
      path === "/shops/recommend/v2"
    )
  ) {
    return true;
  }

  return false;
}

function shouldUseLocalMutation(url, options = {}) {
  const method = String(options?.method || "GET").toUpperCase();
  const path = getPathOnly(url);

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return false;
  }

  if (path === "/shops" && method === "POST") {
    return true;
  }

  if (/^\/shops\/[^/]+$/.test(path) && ["PUT", "PATCH", "DELETE"].includes(method)) {
    return true;
  }

  return false;
}

function getRequestBodyObject(options = {}) {
  try {
    if (!options.body) return {};
    if (typeof options.body === "string") return JSON.parse(options.body || "{}");
    if (typeof options.body === "object") return options.body;
    return {};
  } catch (e) {
    return {};
  }
}

function createLocalShop(payload = {}, params = {}) {
  const now = Date.now();
  const normalized = normalizeShopCategoryPayload(normalizeShopPayload(payload), params);
  forgetDeletedShop(normalized);
  const saved = getLocalShops(normalized);
  const sameShop =
    saved.find((shop) => {
      const current = getShopIdentityKeys(shop);
      const next = getShopIdentityKeys(normalized);

      return (
        (current.id && next.id && current.id === next.id) ||
        (current.nameAddressKey && next.nameAddressKey && current.nameAddressKey === next.nameAddressKey) ||
        (current.phoneKey && next.phoneKey && current.phoneKey === next.phoneKey) ||
        (current.nameKey && next.nameKey && current.nameKey === next.nameKey)
      );
    }) ||
    FALLBACK_SHOPS.find((shop) => {
      const current = getShopIdentityKeys(shop);
      const next = getShopIdentityKeys(normalized);

      return (
        (current.nameAddressKey && next.nameAddressKey && current.nameAddressKey === next.nameAddressKey) ||
        (current.phoneKey && next.phoneKey && current.phoneKey === next.phoneKey) ||
        (current.nameKey && next.nameKey && current.nameKey === next.nameKey)
      );
    });

  const id =
    normalized._id ||
    normalized.id ||
    sameShop?._id ||
    sameShop?.id ||
    `local-shop-${now}`;

  const nextShop = mergeShopObjects(sameShop || {}, {
    ...normalized,
    _id: id,
    id,
    name: normalized.name || "업체명 없음",
    address: normalized.address || "주소 없음",
    roadAddress: normalized.roadAddress || normalized.address || "주소 없음",
    fullAddress: normalized.fullAddress || normalized.address || "주소 없음",
    phone: normalized.phone || "",
    virtualPhone: normalized.virtualPhone || "",
    businessHours: normalized.businessHours || "",
    openingHours: normalized.openingHours || normalized.businessHours || "",
    hours: normalized.hours || normalized.businessHours || "",
    description: normalized.description || "",
    lat: normalized.lat || normalized.location?.lat || "",
    lng: normalized.lng || normalized.location?.lng || "",
    location: normalized.location || {
      lat: normalized.lat || "",
      lng: normalized.lng || "",
    },
    courses: Array.isArray(normalized.courses) ? normalized.courses : [],
    price: Array.isArray(normalized.price) ? normalized.price : [],
    status: normalized.status || "active",
    premium: normalized.premium,
    premiumType: normalized.premiumType,
    isPremium: normalized.isPremium,
    premiumActive: normalized.premiumActive,
    directPaymentEnabled: normalizeDirectPaymentEnabled(normalized.directPaymentEnabled),
    images: Array.isArray(normalized.images) ? normalized.images : [],
    photos: Array.isArray(normalized.photos) ? normalized.photos : [],
    imageUrls: Array.isArray(normalized.imageUrls) ? normalized.imageUrls : [],
    representativeImage: normalized.representativeImage || "",
    mainImage: normalized.mainImage || normalized.representativeImage || "",
    thumbnail: normalized.thumbnail || normalized.representativeImage || "",
    coverImage: normalized.coverImage || normalized.representativeImage || "",
    visible: normalized.visible !== false,
    approved: normalized.approved !== false,
    isReservable: normalized.isReservable !== false,
    createdAt: normalized.createdAt || sameShop?.createdAt || new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  });

  LOCAL_SHOP_MEMORY = mergeShopArrays([...saved, nextShop]);

  saveLocalShops(LOCAL_SHOP_MEMORY, normalized);
  clearShopApiCaches();

  return {
    ok: true,
    shop: nextShop,
    data: nextShop,
    item: nextShop,
    shops: LOCAL_SHOP_MEMORY,
    list: LOCAL_SHOP_MEMORY,
    items: LOCAL_SHOP_MEMORY,
    total: LOCAL_SHOP_MEMORY.length,
    count: LOCAL_SHOP_MEMORY.length,
  };
}

function updateLocalShop(id, payload = {}, params = {}) {
  const saved = getLocalShops(params);
  const normalized = normalizeShopCategoryPayload(normalizeShopPayload(payload), params);
  const replaceImages = normalized?.__replaceImages === true || shouldReplaceShopImages(payload, normalized);
  const normalizedUpdatePayload = replaceImages
    ? {
        ...normalized,
        __replaceImages: true,
      }
    : {
        ...normalized,
      };
  let found = false;

  const nextItems = saved.map((shop) => {
    const shopId = String(shop?._id || shop?.id);
    const sameById = shopId === String(id);
    const sameByName =
      normalizeTextKey(shop?.name) &&
      normalizeTextKey(normalized?.name) &&
      normalizeTextKey(shop?.name) === normalizeTextKey(normalized?.name);

    if (!sameById && !sameByName) {
      return shop;
    }

    found = true;

    return mergeShopObjects(shop, {
      ...normalizedUpdatePayload,
      _id: shop?._id || id,
      id: shop?.id || id,
      updatedAt: new Date().toISOString(),
    });
  });

  if (!found) {
    const fallbackItem = FALLBACK_SHOPS.find((shop) => {
      const shopId = String(shop?._id || shop?.id);
      const sameById = shopId === String(id);
      const sameByName =
        normalizeTextKey(shop?.name) &&
        normalizeTextKey(normalized?.name) &&
        normalizeTextKey(shop?.name) === normalizeTextKey(normalized?.name);

      return sameById || sameByName;
    });

    if (fallbackItem) {
      found = true;

      const updatedFallback = mergeShopObjects(fallbackItem, {
        ...normalizedUpdatePayload,
        _id: fallbackItem?._id || id,
        id: fallbackItem?.id || id,
        updatedAt: new Date().toISOString(),
      });

      LOCAL_SHOP_MEMORY = mergeShopArrays([...saved, updatedFallback]);

      saveLocalShops(LOCAL_SHOP_MEMORY, normalizedUpdatePayload);
      clearShopApiCaches();

      return {
        ok: true,
        shop: updatedFallback,
        data: updatedFallback,
        item: updatedFallback,
        shops: LOCAL_SHOP_MEMORY,
        list: LOCAL_SHOP_MEMORY,
        items: LOCAL_SHOP_MEMORY,
        total: LOCAL_SHOP_MEMORY.length,
        count: LOCAL_SHOP_MEMORY.length,
      };
    }
  }

  LOCAL_SHOP_MEMORY = found
    ? mergeShopArrays(nextItems)
    : mergeShopArrays([
        ...saved,
        {
          _id: id,
          id,
          ...normalizedUpdatePayload,
          updatedAt: new Date().toISOString(),
        },
      ]);

  saveLocalShops(LOCAL_SHOP_MEMORY, normalizedUpdatePayload);
  clearShopApiCaches();

  const updatedItem =
    LOCAL_SHOP_MEMORY.find((shop) => String(shop?._id || shop?.id) === String(id)) ||
    LOCAL_SHOP_MEMORY.find((shop) => normalizeTextKey(shop?.name) === normalizeTextKey(normalized?.name)) || {
      _id: id,
      id,
      ...normalized,
    };

  return {
    ok: true,
    shop: updatedItem,
    data: updatedItem,
    item: updatedItem,
    shops: LOCAL_SHOP_MEMORY,
    list: LOCAL_SHOP_MEMORY,
    items: LOCAL_SHOP_MEMORY,
    total: LOCAL_SHOP_MEMORY.length,
    count: LOCAL_SHOP_MEMORY.length,
  };
}

function removeLocalShop(id, params = {}) {
  const saved = getLocalShops(params);
  const targetShop = [
    ...saved,
    ...filterShopsByCategory(FALLBACK_SHOPS, params),
  ].find((shop) => {
    const values = getDeletedShopIdentityValues(shop);
    const targetValue = String(id || "").trim();
    const normalizedTargetValue = normalizeDeletedShopValue(id);

    return values.includes(targetValue) || values.includes(normalizedTargetValue);
  });

  rememberDeletedShop(targetShop || id);

  const nextItems = saved.filter((shop) => {
    const values = getDeletedShopIdentityValues(shop);
    const targetValue = String(id || "").trim();
    const normalizedTargetValue = normalizeDeletedShopValue(id);

    return !values.includes(targetValue) && !values.includes(normalizedTargetValue);
  });

  LOCAL_SHOP_MEMORY = filterDeletedShops(nextItems);

  saveLocalShops(LOCAL_SHOP_MEMORY, params);
  clearShopApiCaches();

  return {
    ok: true,
    deleted: true,
    id,
    shops: LOCAL_SHOP_MEMORY,
    list: LOCAL_SHOP_MEMORY,
    items: LOCAL_SHOP_MEMORY,
    data: LOCAL_SHOP_MEMORY,
    total: LOCAL_SHOP_MEMORY.length,
    count: LOCAL_SHOP_MEMORY.length,
  };
}

function handleLocalMutation(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const body = getRequestBodyObject(options);

  const path = getPathOnly(url);
  const categoryParams = {
    ...makeCategoryParams(body),
    ...makeCategoryParams(options.categoryParams || {}),
    ...makeCategoryParams({ url }),
  };

  if (path === "/shops" && method === "POST") {
    return createLocalShop(body, categoryParams);
  }

  if (/^\/shops\/[^/]+$/.test(path) && ["PUT", "PATCH"].includes(method)) {
    const id = decodeURIComponent(path.split("/").filter(Boolean).pop());
    return updateLocalShop(id, body, categoryParams);
  }

  if (/^\/shops\/[^/]+$/.test(path) && method === "DELETE") {
    const id = decodeURIComponent(path.split("/").filter(Boolean).pop());
    return removeLocalShop(id, categoryParams);
  }

  return null;
}

function redirectToLogin() {
  try {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

    if (
      typeof window !== "undefined" &&
      currentPath !== "/login" &&
      !currentPath.startsWith("/login") &&
      !currentPath.startsWith("/admin") &&
      !AUTH_REDIRECT_LOCK
    ) {
      AUTH_REDIRECT_LOCK = true;
      window.location.replace("/login");
    }
  } catch (e) {
    console.warn("LOGIN REDIRECT ERROR:", e.message);
  }
}

async function request(url, options = {}) {
  const methodForShare = String(options?.method || "GET").toUpperCase();
  const canShareGetRequest =
    methodForShare === "GET" &&
    !options?.__skipInFlight &&
    shouldUseShopFallback(url, options);
  const requestCacheKeyForShare = getStableRequestCacheKey(url, options);

  if (canShareGetRequest) {
    const cachedResponse = getCachedMapValue(
      SHOP_REQUEST_CACHE,
      requestCacheKeyForShare,
      SHOP_REQUEST_CACHE_TTL_MS
    );

    if (cachedResponse) {
      return cachedResponse;
    }

    const pendingRequest = SHOP_REQUEST_IN_FLIGHT.get(requestCacheKeyForShare);

    if (pendingRequest) {
      return pendingRequest;
    }

    const sharedRequest = request(url, {
      ...options,
      __skipInFlight: true,
    }).finally(() => {
      SHOP_REQUEST_IN_FLIGHT.delete(requestCacheKeyForShare);
    });

    SHOP_REQUEST_IN_FLIGHT.set(requestCacheKeyForShare, sharedRequest);
    cleanupLimitedMap(SHOP_REQUEST_IN_FLIGHT);

    return sharedRequest;
  }

  try {
    const token = getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token && isValidTokenValue(token)) {
      if (isLocalFallbackToken(token)) {
        if (isApiBaseLocalHost()) {
          headers["x-local-admin"] = "true";
        }
      } else {
        headers.Authorization = `Bearer ${token}`;
      }

      delete headers.authorization;
      delete headers.token;
      delete headers.accesstoken;
      delete headers["access-token"];
      delete headers["x-access-token"];
      delete headers["x-auth-token"];
    }

    const fetchOptions = {
      method: options.method || "GET",
      credentials: "include",
      headers,
    };

    if (options.body !== undefined) {
      fetchOptions.body = options.body;
    }

    const requestUrl = buildApiRequestUrl(url);

    logShopApiDebug("SHOP API REQUEST:", requestUrl);

    const method = String(fetchOptions.method || "GET").toUpperCase();
    const isMutation = method !== "GET";
    const requestCacheKey = getStableRequestCacheKey(url, options);

    if (!isMutation && shouldUseShopFallback(url, options)) {
      const cachedResponse = getCachedMapValue(
        SHOP_REQUEST_CACHE,
        requestCacheKey,
        SHOP_REQUEST_CACHE_TTL_MS
      );

      if (cachedResponse) {
        return cachedResponse;
      }

    }

    const fetchPromise = fetchWithTimeout(
      requestUrl,
      fetchOptions,
      isMutation ? MUTATION_TIMEOUT_MS : SHOP_QUERY_TIMEOUT_MS
    );


    const res = await fetchPromise;


    let data = {};

    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }

    logShopApiDebug("SHOP API RESPONSE:", data);

    // 업체 API 응답은 인증 상태를 변경하지 않는다.
    // 로그인/토큰 저장은 인증 전용 흐름에서만 처리해야 한다.

    if (res.status === 429 && shouldUseShopFallback(url, options)) {
      if (isAuthoritativeAdminRuntimeShopRequest(url, options)) {
        throw new Error(
          data?.message ||
            data?.msg ||
            data?.error ||
            "Too many requests, please try again later."
        );
      }

      console.warn("SHOP API 429 FALLBACK");
      const fallbackResult = getFallbackByUrl(url, options.categoryParams || {});
      setCachedMapValue(SHOP_REQUEST_CACHE, requestCacheKey, fallbackResult);
      cleanupLimitedMap(SHOP_REQUEST_CACHE);
      return fallbackResult;
    }

    if (res.status === 401) {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";

      const isLoginPage =
        currentPath === "/login" || currentPath.startsWith("/login");

      const isAdminPage =
        currentPath === "/admin" || currentPath.startsWith("/admin/");

      if (shouldUseShopFallback(url, options)) {
        console.warn("SHOP API 401 FALLBACK");
        return getFallbackByUrl(url, options.categoryParams || {});
      }

      if (shouldUseLocalMutation(url, options)) {
        const localMutationResult = handleLocalMutation(url, options);

        if (localMutationResult) {
          return localMutationResult;
        }
      }

      if (!isLoginPage && !isAdminPage) {
        clearAllAuthTokens();
      }

      if (
        typeof window !== "undefined" &&
        !AUTH_ALERT_LOCK &&
        !isLoginPage &&
        !isAdminPage
      ) {
        AUTH_ALERT_LOCK = true;

        alert("로그인이 필요합니다.");

        setTimeout(() => {
          AUTH_ALERT_LOCK = false;
        }, 1000);
      }

      if (!isAdminPage && !isLoginPage) {
        redirectToLogin();
      }

      throw new Error(data?.message || data?.msg || data?.error || "INVALID_TOKEN");
    }

    if (!res.ok || data?.ok === false) {
      if (shouldUseLocalMutation(url, options)) {
        const localMutationResult = handleLocalMutation(url, options);

        if (localMutationResult) {
          return localMutationResult;
        }
      }

      if (shouldUseShopFallback(url, options)) {
        if (isAuthoritativeAdminRuntimeShopRequest(url, options)) {
          throw new Error(
            data?.message ||
              data?.msg ||
              data?.error ||
              `API_ERROR_${res.status}`
          );
        }

        return getFallbackByUrl(url, options.categoryParams || {});
      }

      throw new Error(data?.message || data?.msg || data?.error || `API_ERROR_${res.status}`);
    }

    const normalized = normalizeResponseData(data);

    if (shouldUseShopFallback(url, options)) {
      const requestCategoryParams =
        options.categoryParams && Object.keys(options.categoryParams).length
          ? options.categoryParams
          : makeCategoryParams({ url });

      const nextResult = normalizeShopResponseShape(data, requestCategoryParams);

      if (Array.isArray(nextResult?.items) && nextResult.items.length > 0) {
        if (
          isAdminRuntimePath() &&
          !isAuthoritativeAdminShopRequest(requestCategoryParams)
        ) {
          saveLocalShops(nextResult.items, requestCategoryParams);
        }

        setCachedMapValue(SHOP_REQUEST_CACHE, requestCacheKey, nextResult);
        cleanupLimitedMap(SHOP_REQUEST_CACHE);
        return nextResult;
      }

      setCachedMapValue(SHOP_REQUEST_CACHE, requestCacheKey, nextResult);
      cleanupLimitedMap(SHOP_REQUEST_CACHE);
      return nextResult;
    }

    return data && typeof data === "object" && !Array.isArray(data)
      ? data
      : normalized;
  } catch (err) {
    try {
      const method = String(options?.method || "GET").toUpperCase();

      if (method === "GET") {
        SHOP_REQUEST_IN_FLIGHT.delete(getStableRequestCacheKey(url, options));
      }
    } catch (e) {}

    if (shouldUseLocalMutation(url, options)) {
      const localMutationResult = handleLocalMutation(url, options);

      if (localMutationResult) {
        clearShopApiCaches();
        return localMutationResult;
      }
    }

    if (shouldUseShopFallback(url, options)) {
      if (isAuthoritativeAdminRuntimeShopRequest(url, options)) {
        throw err;
      }

      console.warn(
        "SHOP API FALLBACK:",
        err?.message || err
      );

      const fallbackResult = getFallbackByUrl(url, options.categoryParams || {});
      const fallbackCacheKey = getStableRequestCacheKey(url, options);
      setCachedMapValue(SHOP_REQUEST_CACHE, fallbackCacheKey, fallbackResult);
      cleanupLimitedMap(SHOP_REQUEST_CACHE);

      return fallbackResult;
    }

    console.error("SHOP API ERROR:", err);

    throw err;
  }
}

function normalizeShopPayload(payload = {}) {
  const nextPayload = normalizeShopCategoryPayload({
    ...payload,
  });

  const payloadLocationText =
    typeof nextPayload.location === "string"
      ? nextPayload.location
      : nextPayload.locationText ||
        nextPayload.addressText ||
        nextPayload.addressName ||
        nextPayload.road_address_name ||
        nextPayload.jibunAddress ||
        nextPayload.addr ||
        nextPayload.location?.address ||
        nextPayload.location?.addressName ||
        nextPayload.location?.address_name ||
        nextPayload.location?.roadAddress ||
        nextPayload.location?.road_address_name ||
        nextPayload.location?.jibunAddress ||
        nextPayload.location?.addr ||
        "";

  nextPayload.address =
    nextPayload.address ||
    nextPayload.roadAddress ||
    nextPayload.fullAddress ||
    nextPayload.jibunAddress ||
    nextPayload.addr ||
    payloadLocationText ||
    "";

  nextPayload.roadAddress =
    nextPayload.roadAddress ||
    nextPayload.address ||
    payloadLocationText ||
    "";

  nextPayload.fullAddress =
    nextPayload.fullAddress ||
    nextPayload.address ||
    payloadLocationText ||
    "";

  nextPayload.locationText =
    nextPayload.locationText ||
    payloadLocationText ||
    nextPayload.address ||
    "";

  nextPayload.region = normalizeShopRegionName(
    nextPayload.region ||
      nextPayload.sido ||
      nextPayload.province ||
      nextPayload.state ||
      nextPayload.area ||
      getShopAddressRegion(nextPayload.address) ||
      getShopAddressRegion(nextPayload.locationText),
    nextPayload.address || nextPayload.locationText
  );

  nextPayload.district =
    nextPayload.district ||
    nextPayload.sigungu ||
    nextPayload.city ||
    nextPayload.gu ||
    nextPayload.county ||
    getShopAddressDistrict(nextPayload.address) ||
    getShopAddressDistrict(nextPayload.locationText);

  nextPayload.dong =
    nextPayload.dong ||
    nextPayload.neighborhood ||
    nextPayload.town ||
    nextPayload.eupmyeondong ||
    nextPayload.areaDong ||
    getShopAddressDong(nextPayload.address) ||
    getShopAddressDong(nextPayload.locationText);

  nextPayload.businessHours =
    nextPayload.businessHours ||
    nextPayload.openingHours ||
    nextPayload.hours ||
    "";

  nextPayload.openingHours =
    nextPayload.openingHours ||
    nextPayload.businessHours ||
    "";

  nextPayload.hours =
    nextPayload.hours ||
    nextPayload.businessHours ||
    "";

  if (Array.isArray(nextPayload.courses)) {
    nextPayload.courses = nextPayload.courses
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  }

  if (typeof nextPayload.courses === "string") {
    nextPayload.courses = nextPayload.courses
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  if (Array.isArray(nextPayload.price)) {
    nextPayload.price = nextPayload.price
      .map((v) => Number(String(v).replaceAll(",", "").replaceAll("원", "").trim()))
      .filter((v) => !Number.isNaN(v));
  }

  if (typeof nextPayload.price === "string") {
    nextPayload.price = nextPayload.price
      .split(",")
      .map((v) => Number(String(v).replaceAll(",", "").replaceAll("원", "").trim()))
      .filter((v) => !Number.isNaN(v));
  }

  const normalizedImages = collectImages(nextPayload, {
    allowDataImage: true,
    allowBlob: false,
    maxLength: MAX_STORED_IMAGE_LENGTH,
  });

  const payloadImages = normalizeUploadImageList(normalizedImages, {
    allowDataImage: true,
    allowBlob: false,
    maxLength: MAX_STORED_IMAGE_LENGTH,
  });

  nextPayload.images = payloadImages;
  nextPayload.photos = payloadImages;
  nextPayload.imageUrls = payloadImages;
  nextPayload.gallery = payloadImages;
  nextPayload.pictures = payloadImages;
  nextPayload.files = [];
  nextPayload.image = payloadImages[0] || "";
  nextPayload.imageUrl = payloadImages[0] || "";
  nextPayload.photo = payloadImages[0] || "";
  nextPayload.picture = payloadImages[0] || "";

  const representativeCandidate =
    normalizeImageValue(nextPayload.representativeImage) ||
    normalizeImageValue(nextPayload.mainImage) ||
    normalizeImageValue(nextPayload.thumbnail) ||
    normalizeImageValue(nextPayload.coverImage) ||
    payloadImages[0] ||
    "";

  const representativeImage =
    payloadImages.find((image) => image === representativeCandidate) ||
    (isSafeImageValue(representativeCandidate, {
      allowDataImage: true,
      allowBlob: false,
      maxLength: MAX_STORED_IMAGE_LENGTH,
    })
      ? normalizeImageValue(representativeCandidate)
      : "") ||
    payloadImages[0] ||
    "";

  nextPayload.representativeImage = representativeImage;
  nextPayload.mainImage =
    normalizeImageValue(nextPayload.mainImage) ||
    representativeImage;
  nextPayload.thumbnail =
    normalizeImageValue(nextPayload.thumbnail) ||
    representativeImage;
  nextPayload.coverImage =
    normalizeImageValue(nextPayload.coverImage) ||
    representativeImage;

  const lat = nextPayload.lat || nextPayload.location?.lat || "";
  const lng = nextPayload.lng || nextPayload.location?.lng || "";

  nextPayload.lat = lat;
  nextPayload.lng = lng;
  nextPayload.location = {
    ...(nextPayload.location || {}),
    lat,
    lng,
  };

  const premiumSource = getPremiumSourceValue(nextPayload, false);

  const premium = normalizePremiumValue(premiumSource);
  const premiumType = normalizePremiumType(premiumSource);

  nextPayload.premium = premium;
  nextPayload.premiumType = premiumType;
  nextPayload.premiumLevel = nextPayload.premiumLevel || nextPayload.level || nextPayload.tier || nextPayload.rank || premiumType;
  nextPayload.membership = nextPayload.membership || nextPayload.membershipType || nextPayload.subscriptionType || nextPayload.plan || nextPayload.shopPlan || nextPayload.servicePlan || premiumType;
  nextPayload.membershipType = nextPayload.membershipType || nextPayload.membership || nextPayload.subscriptionType || nextPayload.plan || nextPayload.shopPlan || nextPayload.servicePlan || premiumType;
  nextPayload.listingType = nextPayload.listingType || premiumType;
  nextPayload.shopGrade = nextPayload.shopGrade || premiumType;
  nextPayload.imageGrade = nextPayload.imageGrade || nextPayload.photoGrade || premiumType;
  nextPayload.photoGrade = nextPayload.photoGrade || nextPayload.imageGrade || premiumType;
  nextPayload.isPremium = premium;
  nextPayload.premiumActive = premium;
  nextPayload.directPaymentEnabled = normalizeDirectPaymentEnabled(nextPayload.directPaymentEnabled);

  Object.assign(nextPayload, normalizeShopCourseDataFields(nextPayload));

  return nextPayload;
}


function getCreatedShopFromResponse(response = {}, fallbackPayload = {}) {
  if (response?.shop && typeof response.shop === "object" && !Array.isArray(response.shop)) {
    return response.shop;
  }

  if (response?.item && typeof response.item === "object" && !Array.isArray(response.item)) {
    return response.item;
  }

  if (response?.data && typeof response.data === "object" && !Array.isArray(response.data)) {
    return response.data;
  }

  if (response && typeof response === "object" && !Array.isArray(response) && (response._id || response.id || response.name)) {
    return response;
  }

  return fallbackPayload && typeof fallbackPayload === "object" ? fallbackPayload : {};
}

function syncMutationShopToLocal(response = {}, fallbackPayload = {}, categoryParams = {}) {
  try {
    const sourceShop = getCreatedShopFromResponse(response, fallbackPayload);
    const normalizedShop = normalizeShopResponseItem(
      normalizeShopCategoryPayload(
        {
          ...fallbackPayload,
          ...sourceShop,
          directPaymentEnabled: hasDirectPaymentField(sourceShop)
            ? normalizeDirectPaymentEnabled(sourceShop.directPaymentEnabled)
            : normalizeDirectPaymentEnabled(fallbackPayload.directPaymentEnabled),
        },
        categoryParams
      ),
      categoryParams
    );

    if (!normalizedShop || typeof normalizedShop !== "object") {
      return [];
    }

    const nextItems = filterShopsByCategory(
      filterDeletedShops(
        mergeShopArrays([
          ...getLocalShops(categoryParams),
          normalizedShop,
        ]).map((shop) => applyShopImageBank(applyShopPremiumBank(shop)))
      ),
      categoryParams
    );

    saveLocalShops(nextItems, categoryParams);
    clearShopApiCaches();

    return nextItems;
  } catch (e) {
    console.warn("SHOP MUTATION LOCAL SYNC ERROR:", e.message);
    return [];
  }
}

function extractUploadedImageUrlsFromResponse(response = {}) {
  const urls = [];

  const pushValue = (value) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => pushValue(item));
      return;
    }

    if (typeof value === "string") {
      const normalized = normalizeUploadImagePath(value);

      if (
        normalized &&
        isSafeImageValue(normalized, {
          allowDataImage: false,
          allowBlob: false,
          maxLength: MAX_STORED_IMAGE_LENGTH,
        })
      ) {
        getImageUrlCandidates(normalized).forEach((url) => {
          const fixedUrl = normalizeUploadImagePath(url) || url;

          if (
            fixedUrl &&
            !String(fixedUrl).startsWith("data:image/") &&
            !String(fixedUrl).startsWith("blob:") &&
            !String(fixedUrl).includes("/api/shops/uploads/") &&
            !urls.includes(fixedUrl)
          ) {
            urls.push(fixedUrl);
          }
        });
      }

      return;
    }

    if (typeof value === "object") {
      [
        value.url,
        value.src,
        value.path,
        value.location,
        value.image,
        value.imageUrl,
        value.imageURL,
        value.imagePath,
        value.file,
        value.fileUrl,
        value.fileURL,
        value.filePath,
        value.publicUrl,
        value.publicURL,
        value.secureUrl,
        value.secureURL,
        value.cdnUrl,
        value.cdnURL,
        value.downloadUrl,
        value.downloadURL,
        value.thumbnail,
        value.thumbnailUrl,
        value.thumbnailURL,
        value.mainImage,
        value.mainImageUrl,
        value.mainImageURL,
        value.representativeImage,
        value.representativeImageUrl,
        value.representativeImageURL,
        value.coverImage,
        value.coverImageUrl,
        value.coverImageURL,
        value.photo,
        value.photoUrl,
        value.photoURL,
        value.picture,
        value.pictureUrl,
        value.pictureURL,
        value.data,
        value.item,
        value.result,
        value.results,
        value.fileData,
        value.files,
        value.imageUrls,
        value.images,
        value.photos,
        value.gallery,
        value.pictures,
      ].forEach((item) => pushValue(item));
    }
  };

  pushValue(response);

  return Array.from(new Set(urls));
}

async function uploadShopImageRequest(file, params = {}) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error("IMAGE_FILE_REQUIRED");
  }

  const categoryParams = makeCategoryParams(params);
  const token = getToken();
  const formData = new FormData();

  formData.append("image", file);
  formData.append("file", file);
  formData.append("upload", file);
  formData.append("category", categoryParams.category || getEffectiveCategory(params) || "massage");
  formData.append("shopCategory", categoryParams.shopCategory || categoryParams.category || getEffectiveCategory(params) || "massage");
  formData.append("serviceType", categoryParams.serviceType || categoryParams.category || getEffectiveCategory(params) || "massage");
  formData.append("businessType", categoryParams.businessType || categoryParams.category || getEffectiveCategory(params) || "massage");
  formData.append("adminCategory", categoryParams.adminCategory || categoryParams.category || getEffectiveCategory(params) || "massage");

  const headers = {};

  if (token && isValidTokenValue(token)) {
    if (isLocalFallbackToken(token)) {
      if (isApiBaseLocalHost()) {
        headers["x-local-admin"] = "true";
      }
    } else {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const uploadUrls = [
    appendCategoryQuery("/shops/admin/upload", categoryParams),
    appendCategoryQuery("/shops/upload", categoryParams),
    appendCategoryQuery("/shops/admin/image", categoryParams),
  ];

  let lastError = null;

  for (const uploadUrl of uploadUrls) {
    try {
      const response = await fetchWithTimeout(
        buildApiRequestUrl(uploadUrl),
        {
          method: "POST",
          credentials: "include",
          headers,
          body: formData,
        },
        MUTATION_TIMEOUT_MS
      );

      let data = {};

      try {
        data = await response.json();
      } catch (e) {
        data = {};
      }

      if (!response.ok || data?.ok === false || data?.success === false) {
        lastError = new Error(data?.message || data?.msg || data?.error || `API_ERROR_${response.status}`);
        continue;
      }

      const imageUrls = extractUploadedImageUrlsFromResponse(data);

      if (imageUrls.length) {
        return {
          ...data,
          ok: data?.ok !== false,
          success: data?.success !== false,
          url: imageUrls[0],
          imageUrl: imageUrls[0],
          image: imageUrls[0],
          images: imageUrls,
          imageUrls,
          data: data?.data || {
            url: imageUrls[0],
            imageUrl: imageUrls[0],
            images: imageUrls,
          },
        };
      }

      lastError = new Error("UPLOAD_RESPONSE_URL_NOT_FOUND");
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("IMAGE_UPLOAD_ROUTE_NOT_FOUND");
}

export const shopApi = {
  getList: async (params = {}) => {
    const listParams = makeAdminListParams(params);
    const cleanParams = Object.fromEntries(
      Object.entries(listParams).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );

    const isMassageAdminListRuntime =
      typeof window !== "undefined" &&
      String(window.location?.pathname || "").toLowerCase() === "/admin/shops";

    const requestParams = cleanParams;

    const query = new URLSearchParams(requestParams).toString();
    const cacheKey = getStableRequestCacheKey(query ? `/shops?${query}` : `/shops`, {
      categoryParams: cleanParams,
    });
    const cachedList = getCachedMapValue(
      SHOP_LIST_CACHE,
      cacheKey,
      SHOP_GET_CACHE_TTL_MS
    );

    if (cachedList) {
      return cachedList;
    }

    const pendingList = SHOP_LIST_IN_FLIGHT.get(cacheKey);

    if (pendingList) {
      return pendingList;
    }

    const listPromise = (async () => {
      const res = await request(query ? `/shops?${query}` : `/shops`, {
        categoryParams: requestParams,
      });

    const responseShape = normalizeShopApiResponse(res);
    const responseParams = cleanParams;

    clearAuthoritativeAdminShopDeletedMarkers(
      Array.isArray(responseShape?.shops)
        ? responseShape.shops
        : Array.isArray(responseShape?.items)
        ? responseShape.items
        : Array.isArray(responseShape?.list)
        ? responseShape.list
        : [],
      responseParams
    );

    const normalized = normalizeShopResponseShape(responseShape, responseParams);
    const apiItems = Array.isArray(normalized?.items) ? normalized.items : [];
    const hasScope = hasCategoryScope(responseParams);
    const isAdminListParams =
      !hasScope &&
      (
        responseParams?.admin === "true" ||
        responseParams?.adminMode === "true" ||
        responseParams?.adminList === "true" ||
        responseParams?.management === "true" ||
        isAdminRuntimePath()
      );

    const authoritativeAdminShopRequest =
      isAuthoritativeAdminShopRequest(responseParams);

    const normalizedApiItems = authoritativeAdminShopRequest
      ? filterServerDeletedShops(
          apiItems.map((shop) => normalizeShopResponseItem(shop, responseParams))
        )
      : filterDeletedShops(
          mergeShopArrays(apiItems).map((shop) => applyShopImageBank(applyShopPremiumBank(shop)))
        );

    const apiItemsByScope = isAdminListParams
      ? normalizedApiItems
      : filterShopsByCategory(normalizedApiItems, responseParams);

      if (apiItemsByScope.length) {
        if (
          isAdminListParams &&
          !authoritativeAdminShopRequest
        ) {
          saveLocalShops(apiItemsByScope, responseParams);
        }

        return {
          ...normalized,
          ok: normalized?.ok !== false,
          shops: apiItemsByScope,
          list: apiItemsByScope,
          items: apiItemsByScope,
          data: apiItemsByScope,
          total: apiItemsByScope.length,
          count: apiItemsByScope.length,
        };
      }

    if (
      isAdminListParams &&
      !authoritativeAdminShopRequest
    ) {
      const localItems = getLocalShops(responseParams);
      const fallbackItems = filterDeletedShops(
        mergeShopArrays(localItems).map((shop) => applyShopImageBank(applyShopPremiumBank(shop)))
      );

      if (fallbackItems.length) {
        return {
          ...normalized,
          ok: normalized?.ok !== false,
          shops: fallbackItems,
          list: fallbackItems,
          items: fallbackItems,
          data: fallbackItems,
          total: fallbackItems.length,
          count: fallbackItems.length,
        };
      }
    }

      return {
        ...normalized,
        ok: normalized?.ok !== false,
        shops: [],
        list: [],
        items: [],
        data: [],
        total: 0,
        count: 0,
      };
    })();

    SHOP_LIST_IN_FLIGHT.set(cacheKey, listPromise);

    try {
      const result = await listPromise;

      setCachedMapValue(SHOP_LIST_CACHE, cacheKey, result);
      cleanupLimitedMap(SHOP_LIST_CACHE);

      return result;
    } finally {
      SHOP_LIST_IN_FLIGHT.delete(cacheKey);
    }
  },

  getDetail: async (id, params = {}) => {
    if (!id) {
      throw new Error("ID_REQUIRED");
    }

    const categoryParams = makeCategoryParams(params);
    const requestUrl = appendCategoryQuery(`/shops/${id}`, categoryParams);

    if (isLocalShopId(id)) {
      return getLocalShopDetailResult(id, categoryParams);
    }

    try {
      const res = await request(requestUrl, {
        categoryParams,
      });
      const detail = res?.shop || res?.data || res?.item || res;

      if (detail && typeof detail === "object" && isDeletedShop(detail)) {
        throw new Error("매장 없음");
      }

      return res;
    } catch (e) {
      const localResult = getLocalShopDetailResult(id, categoryParams);

      if (localResult.shop && !isDeletedShop(localResult.shop)) {
        return localResult;
      }

      throw e;
    }
  },

  search: async (q, params = {}) => {
    try {
      const rawKeyword = String(q || "").trim();
      const compactKeyword = normalizeSearchKeyword(rawKeyword);
      const categoryParams = makeCategoryParams(params);

      const query = new URLSearchParams({
        ...categoryParams,
        q: rawKeyword,
        keyword: rawKeyword,
        compact: compactKeyword,
        normalized: compactKeyword,
      }).toString();

      const res = await request(`/shops/search?${query}`, {
        categoryParams,
      });

      return normalizeShopResponseShape(res, categoryParams);
    } catch (e) {
      return await shopApi.getList(params);
    }
  },

  getNearby: async (lat, lng, params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const query = new URLSearchParams({
      ...categoryParams,
      lat,
      lng,
    }).toString();

    const res = await request(`/shops/nearby/list?${query}`, {
      categoryParams,
    });

    const normalizedShape = normalizeShopResponseShape(res, categoryParams);
    const normalizedItems = Array.isArray(normalizedShape?.items)
      ? normalizedShape.items
      : normalizeResponseData(res).map((shop) => normalizeShopResponseItem(shop, categoryParams));

    return filterShopsByCategory(
      filterDeletedShops(
        mergeShopArrays(Array.isArray(normalizedItems) ? normalizedItems : [])
          .map((shop) => applyShopImageBank(applyShopPremiumBank(normalizeShopResponseItem(shop, categoryParams))))
      ),
      categoryParams
    );
  },

  getTop: async (params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const res = await request(appendCategoryQuery(`/shops/top/list`, categoryParams), {
      categoryParams,
    });

    return normalizeShopResponseShape(res, categoryParams);
  },

  getRecent: async (params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const res = await request(appendCategoryQuery(`/shops/recent/list`, categoryParams), {
      categoryParams,
    });

    return normalizeShopResponseShape(res, categoryParams);
  },

  getRandom: async (params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const res = await request(appendCategoryQuery(`/shops/random/list`, categoryParams), {
      categoryParams,
    });

    return normalizeShopResponseShape(res, categoryParams);
  },

  getRanking: async (params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const res = await request(appendCategoryQuery(`/shops/ranking/list`, categoryParams), {
      categoryParams,
    });

    return normalizeShopResponseShape(res, categoryParams);
  },

  like: (id) =>
    request(`/shops/${id}/like`, {
      method: "POST",
    }),

  view: (id) => request(`/shops/${id}/view-safe`),

  create: async (payload) => {
    const normalizedPayload = normalizeShopPayload(payload);
    const categoryParams = makeCategoryParams(normalizedPayload);
    const networkPayload = getNetworkSafeShop(normalizedPayload);
    const requestUrl = appendCategoryQuery("/shops", categoryParams);

    clearShopApiCaches();

    const res = await request(requestUrl, {
      method: "POST",
      body: JSON.stringify(networkPayload),
      categoryParams,
    });

    const syncedItems = syncMutationShopToLocal(res, networkPayload, categoryParams);

    clearShopApiCaches();

    return syncedItems.length
      ? {
          ...res,
          shops: syncedItems,
          list: syncedItems,
          items: syncedItems,
          data: Array.isArray(res?.data) ? syncedItems : res?.data,
          total: syncedItems.length,
          count: syncedItems.length,
        }
      : res;
  },

  update: async (id, payload, params = {}) => {
    const normalizedBasePayload = normalizeShopCategoryPayload(normalizeShopPayload(payload), params);
    const replaceImages = normalizedBasePayload?.__replaceImages === true || shouldReplaceShopImages(payload, normalizedBasePayload);
    const normalizedPayload = replaceImages
      ? {
          ...normalizedBasePayload,
          __replaceImages: true,
        }
      : {
          ...normalizedBasePayload,
        };
    const categoryParams = Object.keys(makeCategoryParams(normalizedPayload)).length ? makeCategoryParams(normalizedPayload) : makeCategoryParams(params);
    const networkPayload = getNetworkSafeShop(normalizedPayload);
    const requestUrl = appendCategoryQuery(`/shops/${id}`, categoryParams);

    clearShopApiCaches();

    const res = await request(requestUrl, {
      method: "PATCH",
      body: JSON.stringify(networkPayload),
      categoryParams,
    });

    const syncedItems = syncMutationShopToLocal(res, networkPayload, categoryParams);

    clearShopApiCaches();

    return syncedItems.length
      ? {
          ...res,
          shops: syncedItems,
          list: syncedItems,
          items: syncedItems,
          data: Array.isArray(res?.data) ? syncedItems : res?.data,
          total: syncedItems.length,
          count: syncedItems.length,
        }
      : res;
  },

  remove: async (id, params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const requestUrl = appendCategoryQuery(`/shops/${id}`, categoryParams);

    clearShopApiCaches();

    const res = await request(requestUrl, {
      method: "DELETE",
      categoryParams,
    });

    try {
      const nextItems = filterShopsByCategory(
        filterDeletedShops(
          getLocalShops(categoryParams).filter((shop) => {
            const shopId = String(shop?._id || shop?.id || shop?.shopId || "");
            return shopId !== String(id || "");
          })
        ),
        categoryParams
      );

      saveLocalShops(nextItems, categoryParams);
    } catch (e) {
      console.warn("SHOP REMOVE LOCAL SYNC ERROR:", e.message);
    }

    clearShopApiCaches();

    return res;
  },

  getStats: async (params = {}) => {
    const categoryParams = makeCategoryParams(params);

    return getSharedStatsRequest(
      "/shops/admin/stats",
      categoryParams,
      (fallbackParams) => {
        const shops = getFallbackShops(fallbackParams);

        return {
          ...FALLBACK_STATS,
          ok: true,
          shops,
          shopStats: [],
          shopCount: shops.length,
          totalShops: shops.length,
          activeShops: shops.filter((shop) => shop.status === "active").length,
          inactiveShops: shops.filter((shop) => shop.status !== "active").length,
          list: shops,
          items: shops,
          data: shops,
          total: shops.length,
          count: shops.length,
        };
      }
    );
  },

  getDashboardStats: (shopId, startDate, endDate, params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const query = new URLSearchParams({
      ...categoryParams,
      ...(shopId ? { shopId } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    }).toString();

    return getSharedStatsRequest(
      `/shops/admin/dashboard-stats${query ? `?${query}` : ""}`,
      categoryParams
    );
  },

  getMonthlyStats: (shopId, startDate, endDate, params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const query = new URLSearchParams({
      ...categoryParams,
      ...(shopId ? { shopId } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    }).toString();

    return getSharedStatsRequest(
      `/shops/admin/monthly-stats${query ? `?${query}` : ""}`,
      categoryParams
    );
  },

  getCached: async (params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const res = await request(appendCategoryQuery(`/shops/cache/list`, categoryParams), {
      categoryParams,
    });

    return normalizeShopResponseShape(res, categoryParams);
  },

  getRecommend: async (params = {}) => {
    try {
      const categoryParams = makeCategoryParams(params);
      const res = await request(appendCategoryQuery(`/shops/recommend/v2`, categoryParams), {
        categoryParams,
      });

      return normalizeShopResponseShape(res, categoryParams);
    } catch (e) {
      return await shopApi.getList(params);
    }
  },

  filterByPrice: async (min, max, params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const query = new URLSearchParams({
      ...categoryParams,
      min,
      max,
    }).toString();

    return normalizeShopResponseShape(
      await request(`/shops/price/filter?${query}`, {
        categoryParams,
      }),
      categoryParams
    );
  },

  getTopTags: () => request(`/shops/tags/top`),

  getRegionStats: () => request(`/shops/stats/region`),

  getBoostRandom: async (params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const res = await request(appendCategoryQuery(`/shops/random/boost`, categoryParams), {
      categoryParams,
    });

    return normalizeShopResponseShape(res, categoryParams);
  },

  resetView: () =>
    request(`/shops/admin/reset-view`, {
      method: "POST",
    }),

  resetLike: () =>
    request(`/shops/admin/reset-like`, {
      method: "POST",
    }),

  uploadImage: async (file, params = {}) =>
    uploadShopImageRequest(file, params),

  uploadShopImage: async (file, params = {}) =>
    uploadShopImageRequest(file, params),

  uploadImages: async (files = [], params = {}) => {
    const fileList = Array.isArray(files) ? files : Array.from(files || []);
    const results = [];

    for (const file of fileList) {
      const result = await uploadShopImageRequest(file, params);
      results.push(result);
    }

    const imageUrls = results
      .flatMap((result) => extractUploadedImageUrlsFromResponse(result))
      .map((url) => normalizeUploadImagePath(url))
      .filter(Boolean)
      .slice(0, MAX_SAFE_SHOP_IMAGE_COUNT);

    return {
      ok: true,
      success: true,
      results,
      images: imageUrls,
      imageUrls,
      url: imageUrls[0] || "",
      imageUrl: imageUrls[0] || "",
      data: {
        results,
        images: imageUrls,
        imageUrls,
      },
    };
  },

  uploadShopImages: async (files = [], params = {}) =>
    shopApi.uploadImages(files, params),

  updateStatus: (id, status, params = {}) =>
    shopApi.update(
      id,
      {
        ...makeCategoryParams(params),
        status,
      },
      params
    ),
};

export default shopApi; 
