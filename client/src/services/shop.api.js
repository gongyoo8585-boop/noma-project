
function normalizeShopApiResponse(response) {
  const payload =
    response?.data ||
    response ||
    {};

  const rawShops =
    payload?.shops ||
    payload?.items ||
    payload?.list ||
    payload?.data ||
    [];

  const shops = Array.isArray(rawShops)
    ? rawShops
    : [];

  return {
    ...payload,
    shops,
    items: Array.isArray(payload?.items) ? payload.items : shops,
    list: Array.isArray(payload?.list) ? payload.list : shops,
    data: Array.isArray(payload?.data) ? payload.data : shops,
    total: Number(payload?.total ?? shops.length),
  };
}

"use strict";

/**
 * =====================================================
 * SHOP API SERVICE
 * =====================================================
 */

const DEFAULT_API_BASE = "https://api.nora365.co.kr/api";
const LOCAL_DEFAULT_API_BASE = "/api";
const BLOCKED_LOCAL_API_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];

function isBrowserLocalHost(hostname = "") {
  return BLOCKED_LOCAL_API_HOSTS.includes(
    String(hostname || "").toLowerCase()
  );
}

function isLocalhostApiUrl(value = "") {
  try {
    const url = new URL(
      String(value || ""),
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : DEFAULT_API_BASE
    );

    return isBrowserLocalHost(url.hostname);
  } catch (e) {
    const text = String(value || "").toLowerCase();

    return (
      text.includes("localhost:10000") ||
      text.includes("127.0.0.1:10000") ||
      text.includes("0.0.0.0:10000")
    );
  }
}

function sanitizeApiBaseForRuntime(value = "") {
  const currentHostname = getCurrentHostname();

  if (isBrowserProductionHost(currentHostname)) {
    return DEFAULT_API_BASE;
  }

  if (isLocalhostApiUrl(value) && !isBrowserLocalHost(currentHostname)) {
    return DEFAULT_API_BASE;
  }

  return value;
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
  const rawValue = String(sanitizeApiBaseForRuntime(value) || "").trim();
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

  if (isBrowserLocalHost(currentHostname)) {
    try {
      const localUrl = new URL(rawValue, window.location.origin);

      if (isBrowserLocalHost(localUrl.hostname)) {
        return LOCAL_DEFAULT_API_BASE;
      }
    } catch (e) {
      // keep existing fallback handling below
    }
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

const API_BASE = normalizeApiBaseUrl(sanitizeApiBaseForRuntime(API_BASE_RAW));

function getRuntimeApiBase() {
  const currentHostname = getCurrentHostname();

  if (isBrowserProductionHost(currentHostname)) {
    return DEFAULT_API_BASE;
  }

  return normalizeApiBaseUrl(sanitizeApiBaseForRuntime(API_BASE_RAW || API_BASE));
}

function buildApiRequestUrl(url = "") {
  const runtimeBase = getRuntimeApiBase().replace(/\/+$/, "");
  const safeRuntimeBase =
    isBrowserProductionHost(getCurrentHostname()) || isLocalhostApiUrl(runtimeBase)
      ? DEFAULT_API_BASE
      : runtimeBase;

  const path = String(url || "").startsWith("/")
    ? String(url || "")
    : `/${String(url || "")}`;

  const requestUrl = `${safeRuntimeBase}${path}`.replace("/api/api", "/api");

  if (isBrowserProductionHost(getCurrentHostname()) && isLocalhostApiUrl(requestUrl)) {
    return buildProductionDirectApiRequestUrl(path);
  }

  return requestUrl;
}


function buildProductionDirectApiRequestUrl(url = "") {
  const path = String(url || "").startsWith("/")
    ? String(url || "")
    : `/${String(url || "")}`;

  return `${DEFAULT_API_BASE}${path}`.replace("/api/api", "/api");
}

function shouldUseProductionDirectApi() {
  return isBrowserProductionHost(getCurrentHostname());
}

async function fetchJsonDirect(url = "", options = {}) {
  const requestUrl = shouldUseProductionDirectApi()
    ? buildProductionDirectApiRequestUrl(url)
    : buildApiRequestUrl(url);

  const res = await fetch(requestUrl, {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
    ...(options.body !== undefined ? { body: options.body } : {}),
  });

  if (!res.ok) {
    throw new Error(`DIRECT_SHOP_API_${res.status}`);
  }

  return await res.json();
}

function getAllShopItemsFromResponse(response, params = {}) {
  return normalizeShopResponseShape(response, params).items || [];
}

function makeBroadShopParams(params = {}) {
  const categoryParams = makeCategoryParams(params);

  return {
    ...categoryParams,
    limit: params.limit || 300,
    page: params.page || 1,
  };
}

function makeMapSafeShopParams(params = {}) {
  const categoryParams = makeCategoryParams(params);

  const safeParams = {
    ...params,
    ...categoryParams,
    limit: params.limit || 300,
  };

  delete safeParams.undefined;
  delete safeParams.null;

  return Object.fromEntries(
    Object.entries(safeParams).filter(([_, value]) => value !== undefined && value !== null && value !== "")
  );
}

async function loadProductionMapSafeShops(params = {}) {
  const safeParams = makeMapSafeShopParams(params);
  const broadParams = makeBroadShopParams(params);

  const queries = Array.from(
    new Set(
      [
        new URLSearchParams(safeParams).toString(),
        new URLSearchParams(broadParams).toString(),
        new URLSearchParams(makeCategoryParams(params)).toString(),
      ].filter(Boolean)
    )
  );

  const endpoints = queries.length
    ? queries.map((query) => `/shops?${query}`)
    : ["/shops"];

  const results = await Promise.allSettled(
    endpoints.map((endpoint) => fetchJsonDirect(endpoint))
  );

  return mergeShopArrays(
    results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => getAllShopItemsFromResponse(result.value, params))
      .map((shop) => normalizeShopResponseItem(shop, params))
  );
}


function getLocalDirectApiBase() {
  const currentHostname = getCurrentHostname();

  if (!isBrowserLocalHost(currentHostname) || isBrowserProductionHost(currentHostname)) {
    return "";
  }

  return "http://localhost:10000/api";
}

function buildLocalDirectApiRequestUrl(url = "") {
  const localBase = getLocalDirectApiBase();

  if (!localBase) {
    return "";
  }

  const path = String(url || "").startsWith("/")
    ? String(url || "")
    : `/${String(url || "")}`;

  return `${localBase}${path}`.replace("/api/api", "/api");
}

function shouldRetryLocalDirectApi(url = "", options = {}, response = null) {
  const method = String(options.method || "GET").toUpperCase();

  if (method === "GET") {
    return false;
  }

  if (!isBrowserLocalHost(getCurrentHostname())) {
    return false;
  }

  if (!String(url || "").startsWith("/shops")) {
    return false;
  }

  if (!response) {
    return true;
  }

  return response.status === 404 || response.status === 502 || response.status === 503;
}

async function retryLocalDirectApi(url = "", fetchOptions = {}, options = {}) {
  const directUrl = buildLocalDirectApiRequestUrl(url);

  if (!directUrl) {
    return null;
  }

  console.warn("SHOP API LOCAL DIRECT RETRY:", directUrl);

  return await fetchWithTimeout(
    directUrl,
    fetchOptions,
    Number(options.timeout || MUTATION_TIMEOUT_MS)
  );
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
const DELETED_SHOP_STORAGE_KEY = "nora_deleted_shop_ids";
const MUTATION_TIMEOUT_MS = 5000;
const MAX_STORED_IMAGE_LENGTH = Number.POSITIVE_INFINITY;
const MAX_STORED_SHOPS = 80;

const FALLBACK_SHOPS = [
  {
    _id: "local-nora-gimhae-main",
    id: "local-nora-gimhae-main",
    name: "더 스크럽 테라피",
    address: "경상남도 김해시 삼계동 1479-2",
    region: "경상남도",
    district: "김해시",
    phone: "010-0000-0001",
    virtualPhone: "0507-0000-0001",
    fakePhone: "0507-0000-0001",
    callNumber: "0507-0000-0001",
    businessHours: "24시간",
    openingHours: "24시간",
    hours: "24시간",
    description: "노라 마사지 플랫폼 등록 업체",
    category: "massage",
    lat: 35.2613,
    lng: 128.871,
    location: { lat: 35.2613, lng: 128.871 },
    geo: { type: "Point", coordinates: [128.871, 35.2613] },
    courses: ["건식 관리 60분", "아로마 관리 90분"],
    price: [45000, 50000],
    originalPrice: [80000, 82000],
    priceOriginal: 80000,
    priceDiscount: 45000,
    distance: "0.1km",
    rating: 5.0,
    reviewCount: 125,
    status: "active",
    visible: true,
    approved: true,
    premium: true,
    premiumType: "premium",
    isPremium: true,
    isReservable: true,
    tags: ["노라", "마사지", "김해", "삼계동"],
    serviceTypes: ["건식", "아로마"],
    images: [],
    photos: [],
    imageUrls: [],
    representativeImage: "",
    mainImage: "",
    thumbnail: "",
    coverImage: "",
    distanceKm: 0.1,
  },
  {
    _id: "local-nora-jangyu",
    id: "local-nora-jangyu",
    name: "가나다라 마사지",
    address: "경상남도 김해시 삼계동",
    region: "경상남도",
    district: "김해시",
    phone: "010-0000-0002",
    virtualPhone: "0507-0000-0002",
    fakePhone: "0507-0000-0002",
    callNumber: "0507-0000-0002",
    businessHours: "10:00 - 03:00",
    openingHours: "10:00 - 03:00",
    hours: "10:00 - 03:00",
    description: "노라 마사지 플랫폼 등록 업체",
    category: "massage",
    lat: 35.2638,
    lng: 128.8732,
    location: { lat: 35.2638, lng: 128.8732 },
    geo: { type: "Point", coordinates: [128.8732, 35.2638] },
    courses: ["아로마 관리 90분", "프리미엄 관리 90분"],
    price: [50000, 90000],
    originalPrice: [82000, 150000],
    priceOriginal: 82000,
    priceDiscount: 50000,
    distance: "0.1km",
    rating: 4.9,
    reviewCount: 256,
    status: "active",
    visible: true,
    approved: true,
    premium: false,
    premiumType: "normal",
    isPremium: false,
    isReservable: true,
    tags: ["노라", "마사지", "삼계동"],
    serviceTypes: ["아로마", "프리미엄"],
    images: [],
    photos: [],
    imageUrls: [],
    representativeImage: "",
    mainImage: "",
    thumbnail: "",
    coverImage: "",
    distanceKm: 0.1,
  },
  {
    _id: "local-nora-gimhae-003",
    id: "local-nora-gimhae-003",
    name: "황제 마사지",
    address: "경상남도 김해시 내동 1123-4",
    region: "경상남도",
    district: "김해시",
    phone: "010-0000-0003",
    virtualPhone: "0507-0000-0003",
    fakePhone: "0507-0000-0003",
    callNumber: "0507-0000-0003",
    businessHours: "11:00 - 04:00",
    openingHours: "11:00 - 04:00",
    hours: "11:00 - 04:00",
    description: "노라 마사지 플랫폼 등록 업체",
    category: "massage",
    lat: 35.2584,
    lng: 128.8662,
    location: { lat: 35.2584, lng: 128.8662 },
    geo: { type: "Point", coordinates: [128.8662, 35.2584] },
    courses: ["타이 관리 60분", "아로마 관리 90분"],
    price: [55000, 85000],
    originalPrice: [100000, 140000],
    priceOriginal: 100000,
    priceDiscount: 55000,
    distance: "0.2km",
    rating: 4.8,
    reviewCount: 189,
    status: "active",
    visible: true,
    approved: true,
    premium: true,
    premiumType: "premium",
    isPremium: true,
    isReservable: true,
    tags: ["노라", "마사지", "내동"],
    serviceTypes: ["타이", "아로마"],
    images: [],
    photos: [],
    imageUrls: [],
    representativeImage: "",
    mainImage: "",
    thumbnail: "",
    coverImage: "",
    distanceKm: 0.2,
  },
];

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

function normalizeTextKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s/g, "")
    .trim();
}


function normalizeRegionName(value) {
  const text = String(value || "").trim();

  if (!text) return "";
  if (text === "경남" || text === "경상남도") return "경상남도";
  if (text === "경북" || text === "경상북도") return "경상북도";
  if (text === "전남" || text === "전라남도") return "전라남도";
  if (text === "전북" || text === "전라북도" || text === "전북특별자치도") return "전라북도";
  if (text === "충남" || text === "충청남도") return "충청남도";
  if (text === "충북" || text === "충청북도") return "충청북도";
  if (text === "경기" || text === "경기도") return "경기도";
  if (text === "강원" || text === "강원도" || text === "강원특별자치도") return "강원도";
  if (text === "제주" || text === "제주도" || text === "제주특별자치도") return "제주도";

  return text;
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

function makeCategoryParams(params = {}) {
  const category = getCategoryFromParams(params) || getCategoryFromUrl(params?.url || "");

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
  const category = getCategoryFromParams(params) || getCategoryFromUrl(params?.url || "");

  if (!category) {
    return baseKey;
  }

  return `${baseKey}_${category}`;
}

function isSameShopCategory(shop = {}, params = {}) {
  const category = getCategoryFromParams(params) || getCategoryFromUrl(params?.url || "");

  if (!category) {
    return true;
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
    getCategoryFromParams(params) ||
    getCategoryFromUrl(params?.url || "");

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

function normalizePremiumValue(value) {
  if (typeof value === "string") {
    const text = value.toLowerCase().trim();
    return text === "true" || text === "premium" || text === "vip" || text === "1" || text === "yes";
  }

  return value === true;
}

function normalizePremiumType(value) {
  if (typeof value === "string") {
    const text = value.toLowerCase().trim();

    if (text === "vip") {
      return "vip";
    }

    if (text === "premium" || text === "true" || text === "1" || text === "yes") {
      return "premium";
    }
  }

  return value === true ? "premium" : "normal";
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

  if (text.startsWith("/")) {
    return text;
  }

  return "";
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
        value.thumbnail ||
        value.thumbnailUrl ||
        value.mainImage ||
        value.representativeImage ||
        value.coverImage ||
        value.photo ||
        value.picture ||
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

  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("/")) {
    return true;
  }

  return false;
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

  pushImage(shop.images);
  pushImage(shop.photos);
  pushImage(shop.imageUrls);
  pushImage(shop.gallery);
  pushImage(shop.pictures);
  pushImage(shop.files);

  [
    shop.representativeImage,
    shop.mainImage,
    shop.thumbnail,
    shop.coverImage,
    shop.image,
    shop.imageUrl,
    shop.photo,
    shop.picture,
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

function isBase64Image(value) {
  const text = normalizeImageValue(value);
  return text.startsWith("data:image/") && text.includes(";base64,");
}

function isLargeLocalImage(value) {
  const text = normalizeImageValue(value);

  if (!isBase64Image(text)) {
    return false;
  }

  if (!Number.isFinite(MAX_STORED_IMAGE_LENGTH)) {
    return false;
  }

  return text.length > MAX_STORED_IMAGE_LENGTH;
}

function isNetworkUnsafeImage(value) {
  const text = String(value || "").trim();
  return text.startsWith("blob:");
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
        keys.id ? `id:${keys.id}` : "",
        keys.nameAddressKey,
        keys.phoneKey,
      ].filter(Boolean)
    )
  );
}

function parseImageBankStorage(storage) {
  try {
    const value = JSON.parse(storage.getItem(LOCAL_SHOP_IMAGE_BANK_KEY) || "{}");

    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (e) {
    return {};
  }
}

function readShopImageBank() {
  try {
    return {
      ...parseImageBankStorage(localStorage),
      ...parseImageBankStorage(sessionStorage),
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
  } catch (e) {
    console.warn("SHOP IMAGE BANK SAVE ERROR:", e.message);
  }
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
  );
}

function writeShopImageBank(items = [], options = {}) {
  try {
    const replace = options?.replace === true || (Array.isArray(items) ? items : []).some((item) => item?.__replaceImages === true);
    const currentBank = readShopImageBank();
    const nextBank = replace ? { ...currentBank } : {};

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

        nextBank[key] = fixedImages;
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

  if (!fixedImages.length) {
    return shop;
  }

  const representativeImage =
    fixedImages.find((image) => image === normalizeImageValue(shop.representativeImage)) ||
    fixedImages[0] ||
    "";

  return {
    ...shop,
    images: fixedImages,
    photos: fixedImages,
    imageUrls: fixedImages,
    gallery: fixedImages,
    pictures: fixedImages,
    files: [],
    image: representativeImage,
    imageUrl: representativeImage,
    photo: representativeImage,
    picture: representativeImage,
    representativeImage,
    mainImage: representativeImage,
    thumbnail: representativeImage,
    coverImage: representativeImage,
  };
}

function mergeShopObjects(base = {}, next = {}) {
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

  const addressChanged =
    next.address &&
    base.address &&
    normalizeTextKey(next.address) !== normalizeTextKey(base.address);

  const nextHasCoord =
    next.lat ||
    next.lng ||
    next.location?.lat ||
    next.location?.lng;

  const premiumSource =
    next.premium !== undefined
      ? next.premium
      : next.isPremium !== undefined
      ? next.isPremium
      : next.premiumType !== undefined
      ? next.premiumType
      : base.premium !== undefined
      ? base.premium
      : base.isPremium !== undefined
      ? base.isPremium
      : base.premiumType;

  const premium = normalizePremiumValue(premiumSource);
  const premiumType = normalizePremiumType(premiumSource);

  return {
    ...base,
    ...next,
    _id: next._id || next.id || base._id || base.id,
    id: next.id || next._id || base.id || base._id,
    address: next.address || next.roadAddress || next.fullAddress || base.address || "",
    roadAddress: next.roadAddress || next.address || next.fullAddress || base.roadAddress || base.address || "",
    fullAddress: next.fullAddress || next.address || next.roadAddress || base.fullAddress || base.address || "",
    businessHours: next.businessHours || next.openingHours || next.hours || base.businessHours || base.openingHours || base.hours || "",
    openingHours: next.openingHours || next.businessHours || next.hours || base.openingHours || base.businessHours || base.hours || "",
    hours: next.hours || next.businessHours || next.openingHours || base.hours || base.businessHours || base.openingHours || "",
    region: normalizeRegionName(
      next.region ||
        next.sido ||
        next.province ||
        base.region ||
        base.sido ||
        base.province ||
        getShopAddressRegion(next.address || next.roadAddress || next.fullAddress || base.address || base.roadAddress || base.fullAddress || "")
    ),
    sido: normalizeRegionName(next.sido || next.region || base.sido || base.region || ""),
    province: normalizeRegionName(next.province || next.region || base.province || base.region || ""),
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
    isPremium: premium,
    images: fixedImages,
    photos: fixedImages,
    imageUrls: fixedImages,
    representativeImage,
    mainImage: representativeImage,
    thumbnail: representativeImage,
    coverImage: representativeImage,
    updatedAt: next.updatedAt || base.updatedAt || new Date().toISOString(),
  };
}

function mergeShopArrays(items = []) {
  const map = new Map();
  const aliasMap = new Map();

  const getPrimaryKey = (shop) => {
    const keys = getShopIdentityKeys(shop);

    return keys.id
      ? `id:${keys.id}`
      : keys.nameAddressKey || keys.phoneKey || keys.nameKey || `local:${Date.now()}:${Math.random()}`;
  };

  const getAliases = (shop) => {
    const keys = getShopIdentityKeys(shop);

    return [
      keys.id ? `id:${keys.id}` : "",
      keys.nameAddressKey,
      keys.phoneKey,
      keys.nameKey,
    ].filter(Boolean);
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

  if (text.includes("서울")) return "서울";
  if (text.includes("부산")) return "부산";
  if (text.includes("대구")) return "대구";
  if (text.includes("인천")) return "인천";
  if (text.includes("광주")) return "광주";
  if (text.includes("대전")) return "대전";
  if (text.includes("울산")) return "울산";
  if (text.includes("세종")) return "세종";
  if (text.includes("경기")) return "경기도";
  if (text.includes("강원")) return "강원도";
  if (text.includes("충북") || text.includes("충청북도")) return "충청북도";
  if (text.includes("충남") || text.includes("충청남도")) return "충청남도";
  if (text.includes("전북") || text.includes("전라북도") || text.includes("전북특별자치도")) return "전라북도";
  if (text.includes("전남") || text.includes("전라남도")) return "전라남도";
  if (text.includes("경북") || text.includes("경상북도")) return "경상북도";
  if (text.includes("경남") || text.includes("경상남도")) return "경상남도";
  if (text.includes("제주")) return "제주도";

  if (text.includes("김해시")) return "경상남도";

  return "";
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

  const region =
    shop.region ||
    shop.sido ||
    shop.province ||
    shop.state ||
    shop.area ||
    getShopAddressRegion(address) ||
    getShopAddressRegion(locationText);

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

  return {
    ...categoryPayload,
    address,
    roadAddress: shop.roadAddress || shop.address || shop.fullAddress || locationText || address,
    fullAddress: shop.fullAddress || shop.address || shop.roadAddress || locationText || address,
    locationText: shop.locationText || locationText || address,
    region: normalizeRegionName(region),
    sido: normalizeRegionName(shop.sido || shop.region || region),
    province: normalizeRegionName(shop.province || shop.region || region),
    district,
    dong,
    lat,
    lng,
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
    const categoryFilteredItems = filterShopsByCategory(normalizedItems, params);
    const sourceItems =
      categoryFilteredItems.length > 0
        ? categoryFilteredItems
        : shouldUseProductionDirectApi() && getCategoryFromParams(params) === "massage"
        ? normalizedItems
        : categoryFilteredItems;

    const mergedItems = filterShopsByCategory(
      filterDeletedShops(
        mergeShopArrays([
          ...sourceItems,
        ])
      ),
      params
    );

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const finalItems =
        mergedItems.length > 0
          ? mergedItems
          : shouldUseProductionDirectApi() && getCategoryFromParams(params) === "massage"
          ? filterDeletedShops(mergeShopArrays(sourceItems))
          : mergedItems;

      return {
        ...data,
        ok: data.ok !== false,
        shops: finalItems,
        list: finalItems,
        items: finalItems,
        data: finalItems,
        total: Number(data.total ?? data.count ?? finalItems.length),
        count: Number(data.count ?? data.total ?? finalItems.length),
      };
    }

    const finalItems =
      mergedItems.length > 0
        ? mergedItems
        : shouldUseProductionDirectApi() && getCategoryFromParams(params) === "massage"
        ? filterDeletedShops(mergeShopArrays(sourceItems))
        : mergedItems;

    return {
      ok: true,
      shops: finalItems,
      list: finalItems,
      items: finalItems,
      data: finalItems,
      total: finalItems.length,
      count: finalItems.length,
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

  const premiumSource =
    shop.premium !== undefined
      ? shop.premium
      : shop.isPremium !== undefined
      ? shop.isPremium
      : shop.premiumType;

  const premium = normalizePremiumValue(premiumSource);
  const premiumType = normalizePremiumType(premiumSource);

  return {
    ...shop,
    premium,
    premiumType,
    isPremium: premium,
    images: finalImages,
    photos: finalImages,
    imageUrls: finalImages,
    representativeImage,
    mainImage: representativeImage,
    thumbnail: representativeImage,
    coverImage: representativeImage,
  };
}

function getNetworkSafeShop(shop = {}) {
  const images = collectImages(shop, { allowDataImage: true, allowBlob: false })
    .map((value) => normalizeImageValue(value))
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((value) =>
      isSafeImageValue(value, {
        allowDataImage: true,
        allowBlob: false,
        maxLength: MAX_STORED_IMAGE_LENGTH,
      })
    )
    .slice(0, 5);

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
    mainImage: representativeImage,
    thumbnail: representativeImage,
    coverImage: representativeImage,
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

function getDeletedShopIds() {
  try {
    const values = [
      ...parseStorageStringArray(localStorage, DELETED_SHOP_STORAGE_KEY),
      ...parseStorageStringArray(sessionStorage, DELETED_SHOP_STORAGE_KEY),
    ];

    return Array.from(
      new Set(
        values
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
  const keys = getShopIdentityKeys(shop);

  const rawValues = [
    shop._id,
    shop.id,
    shop.shopId,
    shop.uuid,
    shop.slug,
    keys.id,
    keys.nameKey,
    keys.nameAddressKey,
    keys.phoneKey,
    keys.name,
    keys.address,
    keys.phone,
    shop.name,
    shop.title,
    shop.shopName,
    shop.address,
    shop.roadAddress,
    shop.fullAddress,
    shop.phone,
    shop.tel,
    shop.virtualPhone,
    shop.fakePhone,
    shop.callNumber,
    keys.name && keys.address ? `${keys.name}::${keys.address}` : "",
    keys.name && keys.address ? `${keys.name}_${keys.address}` : "",
    shop.name && (shop.address || shop.roadAddress || shop.fullAddress)
      ? `${shop.name}_${shop.address || shop.roadAddress || shop.fullAddress}`
      : "",
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
    if (
      shouldUseProductionDirectApi() &&
      shop &&
      typeof shop === "object" &&
      (shop._id || shop.id) &&
      !isLocalShopId(shop._id || shop.id)
    ) {
      return false;
    }

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

function rememberDeletedShop(shopOrId) {
  try {
    const values =
      shopOrId && typeof shopOrId === "object"
        ? getDeletedShopIdentityValues(shopOrId)
        : [String(shopOrId || "").trim()].filter(Boolean);

    if (!values.length) {
      return;
    }

    const nextIds = Array.from(new Set([...getDeletedShopIds(), ...values]));
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

    if (!values.length) {
      return;
    }

    const nextIds = getDeletedShopIds().filter((item) => !values.includes(item));
    const storageText = JSON.stringify(nextIds);

    localStorage.setItem(DELETED_SHOP_STORAGE_KEY, storageText);
    sessionStorage.setItem(DELETED_SHOP_STORAGE_KEY, storageText);
  } catch (e) {
    console.warn("DELETED SHOP REMOVE ERROR:", e.message);
  }
}

function getLocalShops(params = {}) {
  try {
    const localPublicKey = getScopedStorageKey(LOCAL_SHOP_STORAGE_KEY, params);
    const localAdminKey = getScopedStorageKey(LOCAL_ADMIN_SHOP_STORAGE_KEY, params);

    const savedPublic = parseStorageArray(localStorage, localPublicKey);
    const savedAdmin = parseStorageArray(localStorage, localAdminKey);
    const sessionPublic = parseStorageArray(sessionStorage, localPublicKey);
    const sessionAdmin = parseStorageArray(sessionStorage, localAdminKey);

    const legacySavedPublic = parseStorageArray(localStorage, LOCAL_SHOP_STORAGE_KEY);
    const legacySavedAdmin = parseStorageArray(localStorage, LOCAL_ADMIN_SHOP_STORAGE_KEY);
    const legacySessionPublic = parseStorageArray(sessionStorage, LOCAL_SHOP_STORAGE_KEY);
    const legacySessionAdmin = parseStorageArray(sessionStorage, LOCAL_ADMIN_SHOP_STORAGE_KEY);

    return filterShopsByCategory(
      filterDeletedShops(
        mergeShopArrays([
          ...filterShopsByCategory(LOCAL_SHOP_MEMORY, params),
          ...savedPublic,
          ...sessionPublic,
          ...savedAdmin,
          ...sessionAdmin,
          ...legacySavedPublic,
          ...legacySessionPublic,
          ...legacySavedAdmin,
          ...legacySessionAdmin,
        ]).map((shop) => applyShopImageBank(shop))
      ),
      params
    );
  } catch (e) {
    return Array.isArray(LOCAL_SHOP_MEMORY)
      ? filterShopsByCategory(
          filterDeletedShops(
            mergeShopArrays(LOCAL_SHOP_MEMORY).map((shop) => applyShopImageBank(shop))
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

function dispatchShopStorageEvent(shops) {
  try {
    window.setTimeout(() => {
      try {
        window.dispatchEvent(
          new CustomEvent("shops-updated", {
            detail: {
              shops,
            },
          })
        );
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.warn("SHOP EVENT DISPATCH ERROR:", e.message);
      }
    }, 0);
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

  LOCAL_SHOP_MEMORY = mergeShopArrays([
    ...filterShopsByCategory(LOCAL_SHOP_MEMORY, categoryParams.category ? { category: categoryParams.category === "karaoke" ? "massage" : "karaoke" } : {}),
    ...memoryItems,
  ]);

  const storageItems = filterShopsByCategory(
    filterDeletedShops(memoryItems.map((shop) => getStorageSafeShop(applyShopImageBank(shop)))),
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
        dispatchShopStorageEvent(storageItems);
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
          mainImage: representativeImage,
          thumbnail: representativeImage,
          coverImage: representativeImage,
        };
      });

      const compactStorageText = JSON.stringify(compactItems);
      const compactSessionPublicOk = safeSetStorage(sessionStorage, localPublicKey, compactStorageText);
      const compactSessionAdminOk = safeSetStorage(sessionStorage, localAdminKey, compactStorageText);

      if (compactSessionPublicOk && compactSessionAdminOk) {
        dispatchShopStorageEvent(compactItems);
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
          image: representativeImage,
          imageUrl: representativeImage,
          photo: representativeImage,
          picture: representativeImage,
          representativeImage,
          mainImage: representativeImage,
          thumbnail: representativeImage,
          coverImage: representativeImage,
        };
      });

      clearShopStorage(categoryParams);

      const textOnlyStorageText = JSON.stringify(textOnlyItems);

      safeSetStorage(localStorage, localPublicKey, textOnlyStorageText);
      safeSetStorage(localStorage, localAdminKey, textOnlyStorageText);
      safeSetStorage(sessionStorage, localPublicKey, textOnlyStorageText);
      safeSetStorage(sessionStorage, localAdminKey, textOnlyStorageText);

      dispatchShopStorageEvent(textOnlyItems);
      return;
    }

    dispatchShopStorageEvent(storageItems);
  } catch (e) {
    console.warn("LOCAL SHOP SAVE ERROR:", e.message);
  }
}

function getFallbackShops(params = {}) {
  const saved = getLocalShops(params);
  const deletedIds = getDeletedShopIds();
  const fallbackItems = deletedIds.length && !saved.length ? [] : FALLBACK_SHOPS;

  return filterShopsByCategory(
    filterDeletedShops(mergeShopArrays([...fallbackItems, ...saved])),
    params
  );
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

function getFallbackByUrl(url, params = {}) {
  const shops = getFallbackShops({ ...params, url });

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


function normalizeCreatedShopResult(result = {}, fallbackShop = {}, params = {}) {
  const rawShop =
    result?.shop ||
    result?.data ||
    result?.item ||
    (Array.isArray(result?.shops) ? result.shops[0] : null) ||
    (Array.isArray(result?.items) ? result.items[0] : null) ||
    (Array.isArray(result?.list) ? result.list[0] : null) ||
    fallbackShop ||
    {};

  const shop = mergeShopObjects(
    normalizeShopPayload(fallbackShop || {}),
    normalizeShopPayload(rawShop || {})
  );

  const categoryParams =
    Object.keys(makeCategoryParams(shop)).length
      ? makeCategoryParams(shop)
      : makeCategoryParams(params);

  const saved = mergeShopArrays([
    ...getLocalShops(categoryParams),
    shop,
  ]);

  LOCAL_SHOP_MEMORY = saved;
  saveLocalShops(saved, categoryParams);

  return {
    ok: true,
    ...(result && typeof result === "object" && !Array.isArray(result) ? result : {}),
    shop,
    data: shop,
    item: shop,
    shops: saved,
    list: saved,
    items: saved,
    total: saved.length,
    count: saved.length,
  };
}

function makeMutationFallbackResult(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const localMutation = handleLocalMutation(url, options);

    if (localMutation) {
      return localMutation;
    }
  }

  return null;
}

function shouldUseShopFallback(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();

  if (method !== "GET") return false;

  return (
    url === "/shops" ||
    url.startsWith("/shops?") ||
    url.startsWith("/shops/list") ||
    url.startsWith("/shops/all") ||
    url.startsWith("/shops/search") ||
    url.startsWith("/shops/near") ||
    url.startsWith("/shops/nearby") ||
    url.startsWith("/shops/top") ||
    url.startsWith("/shops/recent") ||
    url.startsWith("/shops/random") ||
    url.startsWith("/shops/ranking") ||
    url.startsWith("/shops/cache") ||
    url.startsWith("/shops/recommend") ||
    url.startsWith("/shops/price") ||
    url.startsWith("/shops/admin/stats") ||
    url.startsWith("/shops/admin/dashboard-stats") ||
    url.startsWith("/shops/admin/monthly-stats")
  );
}

function shouldUseLocalMutation(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();

  if (!isApiBaseLocalHost()) return false;
  const path = getPathOnly(url);

  if (path === "/shops" && method === "POST") return true;
  if (/^\/shops\/[^/]+$/.test(path) && ["PUT", "PATCH", "DELETE"].includes(method)) return true;

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
      ...normalized,
      __replaceImages: true,
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
        ...normalized,
        __replaceImages: true,
        _id: fallbackItem?._id || id,
        id: fallbackItem?.id || id,
        updatedAt: new Date().toISOString(),
      });

      LOCAL_SHOP_MEMORY = mergeShopArrays([...saved, updatedFallback]);

      saveLocalShops(LOCAL_SHOP_MEMORY, normalized);

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
          ...normalized,
          __replaceImages: true,
          updatedAt: new Date().toISOString(),
        },
      ]);

  saveLocalShops(LOCAL_SHOP_MEMORY, normalized);

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
  try {
    if (isStatsUrl(url)) {
      return getFallbackByUrl(url, options.categoryParams || {});
    }

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

    const builtRequestUrl = buildApiRequestUrl(url);
    const requestUrl =
      isBrowserProductionHost(getCurrentHostname()) && isLocalhostApiUrl(builtRequestUrl)
        ? buildProductionDirectApiRequestUrl(url)
        : builtRequestUrl;

    console.log("SHOP API REQUEST:", requestUrl);

    const method = String(fetchOptions.method || "GET").toUpperCase();
    const isMutation = method !== "GET";

    let res = isMutation
      ? await fetchWithTimeout(requestUrl, fetchOptions, MUTATION_TIMEOUT_MS)
      : await fetch(requestUrl, fetchOptions);

    if (shouldRetryLocalDirectApi(url, options, res)) {
      try {
        const directRes = await retryLocalDirectApi(url, fetchOptions, options);

        if (directRes) {
          res = directRes;
        }
      } catch (directError) {
        console.warn("SHOP API LOCAL DIRECT RETRY FAIL:", directError?.message || directError);
      }
    }

    let data = {};

    try {
      data = await res.json();
    } catch (e) {
      const mutationFallback = makeMutationFallbackResult(url, options);

      if (mutationFallback) {
        console.warn("SHOP API NON JSON MUTATION FALLBACK");
        return mutationFallback;
      }

      if (shouldUseShopFallback(url, options)) {
        console.warn("SHOP API NON JSON FALLBACK");
        return getFallbackByUrl(url, options.categoryParams || makeCategoryParams({ url }));
      }

      data = {};
    }

    console.log("SHOP API RESPONSE:", data);

    try {
      const nextToken = extractToken(data);
      if (nextToken) saveToken(nextToken);
    } catch (e) {
      console.warn("TOKEN AUTO SAVE ERROR:", e.message);
    }

    if (res.status === 429 && shouldUseShopFallback(url, options)) {
      console.warn("SHOP API 429 FALLBACK");
      return getFallbackByUrl(url, options.categoryParams || {});
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
        return handleLocalMutation(url, options);
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
      const mutationFallback = makeMutationFallbackResult(url, options);

      if (mutationFallback) {
        return mutationFallback;
      }

      if (shouldUseShopFallback(url, options)) {
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
        saveLocalShops(
          mergeShopArrays([
            ...getLocalShops(requestCategoryParams),
            ...nextResult.items,
          ]),
          requestCategoryParams
        );

        return nextResult;
      }

      if (shouldUseProductionDirectApi() && (url === "/shops" || url.startsWith("/shops?"))) {
        try {
          const directItems = await loadProductionMapSafeShops(requestCategoryParams);

          if (Array.isArray(directItems) && directItems.length > 0) {
            const directResult = normalizeShopResponseShape(
              {
                ok: true,
                items: directItems,
                shops: directItems,
                list: directItems,
                data: directItems,
                total: directItems.length,
                count: directItems.length,
              },
              requestCategoryParams
            );

            saveLocalShops(directResult.items, requestCategoryParams);

            return directResult;
          }
        } catch (directError) {
          console.warn("SHOP API PRODUCTION DIRECT LIST RETRY FAIL:", directError?.message || directError);
        }
      }

      return getFallbackByUrl(url, requestCategoryParams);
    }

    return data && typeof data === "object" && !Array.isArray(data)
      ? data
      : normalized;
  } catch (err) {
    const method = String(options.method || "GET").toUpperCase();

    if (shouldRetryLocalDirectApi(url, options, null)) {
      try {
        const token = getToken();

        const headers = {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        };

        if (token && isValidTokenValue(token) && !isLocalFallbackToken(token)) {
          headers.Authorization = `Bearer ${token}`;
        }

        const directRes = await retryLocalDirectApi(
          url,
          {
            method,
            credentials: "include",
            headers,
            ...(options.body !== undefined
              ? {
                  body: options.body,
                }
              : {}),
          },
          options
        );

        if (directRes) {
          const directData = await directRes.json().catch(() => ({}));

          if (directRes.ok && directData?.ok !== false) {
            return directData;
          }
        }
      } catch (directError) {
        console.warn("SHOP API LOCAL DIRECT CATCH RETRY FAIL:", directError?.message || directError);
      }
    }

    if (shouldUseShopFallback(url, options)) {
      console.warn("SHOP API FALLBACK:", err?.message || err);
      return getFallbackByUrl(url, options.categoryParams || makeCategoryParams({ url }));
    }

    console.error("SHOP API ERROR:", err);

    const mutationFallback = makeMutationFallbackResult(url, options);

    if (mutationFallback) {
      return mutationFallback;
    }

    if (shouldUseShopFallback(url, options)) {
      return getFallbackByUrl(url, options.categoryParams || {});
    }

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

  nextPayload.region = normalizeRegionName(
    nextPayload.region ||
      nextPayload.sido ||
      nextPayload.province ||
      nextPayload.state ||
      nextPayload.area ||
      getShopAddressRegion(nextPayload.address) ||
      getShopAddressRegion(nextPayload.locationText)
  );
  nextPayload.sido = normalizeRegionName(nextPayload.sido || nextPayload.region);
  nextPayload.province = normalizeRegionName(nextPayload.province || nextPayload.region);

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

  nextPayload.images = normalizedImages;
  nextPayload.photos = normalizedImages;
  nextPayload.imageUrls = normalizedImages;
  nextPayload.gallery = normalizedImages;
  nextPayload.pictures = normalizedImages;
  nextPayload.files = [];
  nextPayload.image = normalizedImages[0] || "";
  nextPayload.imageUrl = normalizedImages[0] || "";
  nextPayload.photo = normalizedImages[0] || "";
  nextPayload.picture = normalizedImages[0] || "";

  const representativeCandidate =
    normalizeImageValue(nextPayload.representativeImage) ||
    normalizeImageValue(nextPayload.mainImage) ||
    normalizeImageValue(nextPayload.thumbnail) ||
    normalizeImageValue(nextPayload.coverImage) ||
    normalizedImages[0] ||
    "";

  const representativeImage =
    normalizedImages.find((image) => image === representativeCandidate) ||
    (isSafeImageValue(representativeCandidate, {
      allowDataImage: true,
      allowBlob: false,
      maxLength: MAX_STORED_IMAGE_LENGTH,
    })
      ? normalizeImageValue(representativeCandidate)
      : "") ||
    normalizedImages[0] ||
    "";

  nextPayload.representativeImage = representativeImage;
  nextPayload.mainImage = representativeImage;
  nextPayload.thumbnail = representativeImage;
  nextPayload.coverImage = representativeImage;

  const lat = nextPayload.lat || nextPayload.location?.lat || "";
  const lng = nextPayload.lng || nextPayload.location?.lng || "";

  nextPayload.lat = lat;
  nextPayload.lng = lng;
  nextPayload.location = {
    ...(nextPayload.location || {}),
    lat,
    lng,
  };

  const premiumSource =
    nextPayload.premium !== undefined
      ? nextPayload.premium
      : nextPayload.isPremium !== undefined
      ? nextPayload.isPremium
      : nextPayload.premiumType;

  const premium = normalizePremiumValue(premiumSource);
  const premiumType = normalizePremiumType(premiumSource);

  nextPayload.premium = premium;
  nextPayload.premiumType = premiumType;
  nextPayload.isPremium = premium;

  return nextPayload;
}

export const shopApi = {
  getList: async (params = {}) => {
    const cleanParams = makeMapSafeShopParams(
      Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
      )
    );

    const query = new URLSearchParams(cleanParams).toString();

    const res = await request(query ? `/shops?${query}` : `/shops`, {
      categoryParams: cleanParams,
    });

    const primaryResult = normalizeShopResponseShape(res, cleanParams);

    if (shouldUseProductionDirectApi()) {
      try {
        const directItems = await loadProductionMapSafeShops(cleanParams);
        const mergedItems = mergeShopArrays([
          ...directItems,
          ...(Array.isArray(primaryResult.items) ? primaryResult.items : []),
        ]);

        if (mergedItems.length > 0) {
          const finalResult = normalizeShopResponseShape(
            {
              ...primaryResult,
              items: mergedItems,
              shops: mergedItems,
              list: mergedItems,
              data: mergedItems,
              total: mergedItems.length,
              count: mergedItems.length,
            },
            cleanParams
          );

          saveLocalShops(finalResult.items, cleanParams);

          return finalResult;
        }
      } catch (directError) {
        console.warn("SHOP API PRODUCTION DIRECT GETLIST FAIL:", directError?.message || directError);
      }
    }

    return primaryResult;
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

    const normalized = filterShopsByCategory(normalizeResponseData(res), categoryParams);

    if (Array.isArray(normalized) && normalized.length === 0) {
      return getFallbackShops(categoryParams);
    }

    return filterShopsByCategory(
      filterDeletedShops(
        mergeShopArrays(Array.isArray(normalized) ? normalized : getFallbackShops(categoryParams))
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
    const categoryParams =
      Object.keys(makeCategoryParams(normalizedPayload)).length
        ? makeCategoryParams(normalizedPayload)
        : makeCategoryParams({
            ...normalizedPayload,
            category: "massage",
          });

    const createPayload = {
      ...normalizedPayload,
      ...categoryParams,
      name:
        normalizedPayload.name ||
        normalizedPayload.shopName ||
        normalizedPayload.title ||
        `노라 등록 업체 ${new Date().toLocaleString("ko-KR")}`,
      address:
        normalizedPayload.address ||
        normalizedPayload.roadAddress ||
        normalizedPayload.fullAddress ||
        normalizedPayload.locationText ||
        "주소 없음",
      lat: normalizedPayload.lat || normalizedPayload.location?.lat || 0,
      lng: normalizedPayload.lng || normalizedPayload.location?.lng || 0,
      visible: normalizedPayload.visible !== false,
      approved: normalizedPayload.approved !== false,
      isReservable: normalizedPayload.isReservable !== false,
      status: normalizedPayload.status || "active",
    };

    createPayload.shopName = createPayload.shopName || createPayload.name;
    createPayload.title = createPayload.title || createPayload.name;
    createPayload.roadAddress = createPayload.roadAddress || createPayload.address;
    createPayload.fullAddress = createPayload.fullAddress || createPayload.address;
    createPayload.location = {
      ...(createPayload.location || {}),
      lat: createPayload.lat,
      lng: createPayload.lng,
    };

    const localResult = createLocalShop(createPayload, categoryParams);
    const networkPayload = getNetworkSafeShop(createPayload);
    const requestUrl = appendCategoryQuery("/shops", categoryParams);

    try {
      const res = await request(requestUrl, {
        method: "POST",
        body: JSON.stringify(networkPayload),
        categoryParams,
      });

      return normalizeCreatedShopResult(res, localResult?.shop || networkPayload, categoryParams);
    } catch (e) {
      console.warn("SHOP CREATE SERVER SYNC SKIP:", e.message);

      return normalizeCreatedShopResult(localResult, localResult?.shop || networkPayload, categoryParams);
    }
  },

  update: async (id, payload, params = {}) => {
    const normalizedPayload = {
      ...normalizeShopCategoryPayload(normalizeShopPayload(payload), params),
      __replaceImages: true,
    };
    const categoryParams = Object.keys(makeCategoryParams(normalizedPayload)).length ? makeCategoryParams(normalizedPayload) : makeCategoryParams(params);
    const localResult = updateLocalShop(id, normalizedPayload, categoryParams);
    const networkPayload = getNetworkSafeShop(normalizedPayload);
    const requestUrl = appendCategoryQuery(`/shops/${id}`, categoryParams);

    request(requestUrl, {
      method: "PATCH",
      body: JSON.stringify(networkPayload),
      categoryParams,
    })
      .then((res) => {
        const updatedShop =
          res?.shop ||
          res?.data ||
          res?.item ||
          networkPayload;

        updateLocalShop(
          id,
          {
            ...updatedShop,
            ...normalizedPayload,
            _id: updatedShop?._id || updatedShop?.id || id,
            id: updatedShop?.id || updatedShop?._id || id,
          },
          categoryParams
        );
      })
      .catch((e) => {
        console.warn("SHOP UPDATE SERVER SYNC SKIP:", e.message);
      });

    return localResult;
  },

  remove: async (id, params = {}) => {
    const categoryParams = makeCategoryParams(params);
    const localResult = removeLocalShop(id, categoryParams);
    const requestUrl = appendCategoryQuery(`/shops/${id}`, categoryParams);

    request(requestUrl, {
      method: "DELETE",
      categoryParams,
    }).catch((e) => {
      console.warn("SHOP DELETE SERVER SYNC SKIP:", e.message);
    });

    return localResult;
  },

  getStats: (params = {}) => {
    return Promise.resolve(getFallbackByUrl("/shops/admin/stats", params));
  },

  getDashboardStats: (shopId, startDate, endDate, params = {}) => {
    const categoryParams = makeCategoryParams(params);

    return Promise.resolve(getFallbackByUrl("/shops/admin/dashboard-stats", categoryParams));
  },

  getMonthlyStats: (shopId, startDate, endDate, params = {}) => {
    const categoryParams = makeCategoryParams(params);

    return Promise.resolve(getFallbackByUrl("/shops/admin/monthly-stats", categoryParams));
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
