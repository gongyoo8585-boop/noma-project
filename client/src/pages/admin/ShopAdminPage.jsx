"use strict";

import React, { useEffect, useRef, useState } from "react";

import shopApi from "../../services/shop.api";

/* 🔥 최소 추가 */
import AdminLayout from "../../components/admin/AdminLayout";

import Loading from "../../components/common/Loading";
import ErrorMessage from "../../components/common/ErrorMessage";
import EmptyState from "../../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 SHOP ADMIN PAGE (ULTRA FINAL COMPLETE)
 * =====================================================
 */

const REGION_MAP = {
  지역: ["구"],
  서울: ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"],
  부산: ["강서구", "금정구", "기장군", "남구", "동구", "동래구", "부산진구", "북구", "사상구", "사하구", "서구", "수영구", "연제구", "영도구", "중구", "해운대구"],
  대구: ["군위군", "남구", "달서구", "달성군", "동구", "북구", "서구", "수성구", "중구"],
  인천: ["강화군", "계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "옹진군", "중구"],
  광주: ["광산구", "남구", "동구", "북구", "서구"],
  대전: ["대덕구", "동구", "서구", "유성구", "중구"],
  울산: ["남구", "동구", "북구", "울주군", "중구"],
  세종: ["세종"],
  경기: ["가평군", "고양시", "과천시", "광명시", "광주시", "구리시", "군포시", "김포시", "남양주시", "동두천시", "부천시", "성남시", "수원시", "시흥시", "안산시", "안성시", "안양시", "양주시", "양평군", "여주시", "연천군", "오산시", "용인시", "의왕시", "의정부시", "이천시", "파주시", "평택시", "포천시", "하남시", "화성시"],
  강원: ["강릉시", "고성군", "동해시", "삼척시", "속초시", "양구군", "양양군", "영월군", "원주시", "인제군", "정선군", "철원군", "춘천시", "태백시", "평창군", "홍천군", "화천군", "횡성군"],
  충북: ["괴산군", "단양군", "보은군", "영동군", "옥천군", "음성군", "제천시", "증평군", "진천군", "청주시", "충주시"],
  충남: ["계룡시", "공주시", "금산군", "논산시", "당진시", "보령시", "부여군", "서산시", "서천군", "아산시", "예산군", "천안시", "청양군", "태안군", "홍성군"],
  전북: ["고창군", "군산시", "김제시", "남원시", "무주군", "부안군", "순창군", "완주군", "익산시", "임실군", "장수군", "전주시", "정읍시", "진안군"],
  전남: ["강진군", "고흥군", "곡성군", "광양시", "구례군", "나주시", "담양군", "목포시", "무안군", "보성군", "순천시", "신안군", "여수시", "영광군", "영암군", "완도군", "장성군", "장흥군", "진도군", "함평군", "해남군", "화순군"],
  경북: ["경산시", "경주시", "고령군", "구미시", "김천시", "문경시", "봉화군", "상주시", "성주군", "안동시", "영덕군", "영양군", "영주시", "영천시", "예천군", "울릉군", "울진군", "의성군", "청도군", "청송군", "칠곡군", "포항시"],
  경남: ["거제시", "거창군", "고성군", "김해시", "남해군", "밀양시", "사천시", "산청군", "양산시", "의령군", "진주시", "창녕군", "창원시", "통영시", "하동군", "함안군", "함양군", "합천군"],
  제주: ["서귀포시", "제주시"],
};

const DEFAULT_COURSE_PRICING = [
  {
    title: "",
    dayStartTime: "12:00",
    dayEndTime: "17:00",
    nightStartTime: "17:00",
    nightEndTime: "04:00",
    day: [
      { duration: "", originalPrice: 0, salePrice: 0 },
    ],
    night: [
      { duration: "", originalPrice: 0, salePrice: 0 },
    ],
  },
];

const cloneCoursePricing = (value = DEFAULT_COURSE_PRICING) =>
  JSON.parse(JSON.stringify(value));

const EMPTY_FORM = {
  name: "",
  address: "",
  phone: "",
  businessHours: "",
  courses: [],
  courseInput: "",
  price: [],
  priceInput: "",
  status: "active",
  premium: "normal",
  directPaymentEnabled: false,
  lat: 0,
  lng: 0,
  latitude: 0,
  longitude: 0,
  images: [],
  representativeImage: "",
  intro: "",
  description: "",
  shopIntro: "",
  coursePricing: cloneCoursePricing(),
};

const MAX_LOCAL_IMAGE_COUNT = 12;
const MAX_CARD_RENDER_IMAGE_COUNT = MAX_LOCAL_IMAGE_COUNT;
const KARAOKE_SHOP_IMAGE_COUNT = 4;
const DASHBOARD_SYNC_CACHE_TTL_MS = 15000;
const MAX_LOCAL_IMAGE_LENGTH = 2048;
const MAX_MIRROR_STORAGE_LENGTH = 50000;

const SHOP_IMAGE_FALLBACK_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180"><rect width="240" height="180" fill="#111"/><rect x="1" y="1" width="238" height="178" fill="none" stroke="#333" stroke-width="2"/><text x="120" y="82" fill="#d4af37" font-size="15" font-family="Arial, sans-serif" text-anchor="middle" font-weight="700">이미지 로드 실패</text><text x="120" y="108" fill="#999" font-size="12" font-family="Arial, sans-serif" text-anchor="middle">사진 URL을 확인해주세요</text></svg>'
  );


const isStorageQuotaError = (error) => {
  const name = String(error?.name || "");
  const message = String(error?.message || "").toLowerCase();

  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    message.includes("quota") ||
    message.includes("exceeded")
  );
};

const shouldSkipMirrorStorage = (value) => {
  return String(value || "").length > MAX_MIRROR_STORAGE_LENGTH;
};

const normalizeShopCategory = (value) => {
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
};

function ShopAdminPage() {
  const formRef = useRef(null);
  const categorySyncKeyRef = useRef("");
  const loadSyncKeyRef = useRef("");
  const dashboardCacheRef = useRef({
    category: "",
    items: [],
  });
  const dashboardCacheTimeRef = useRef(0);
  const dashboardRequestRef = useRef(null);
  const loadRunningRef = useRef(false);
  const statsRunningRef = useRef(false);
  const statsTimerRef = useRef(null);
  const storageEventTimerRef = useRef(null);
  const storageEventKeyRef = useRef("");

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("지역");
  const [district, setDistrict] = useState("구");

  const currentLocation = (() => {
    if (typeof window === "undefined") {
      return {
        pathname: "",
        search: "",
        href: "",
      };
    }

    return {
      pathname: window.location.pathname || "",
      search: window.location.search || "",
      href: window.location.href || "",
    };
  })();

  const currentPath = currentLocation.pathname;
  const currentSearch = currentLocation.search;

  const isAdminDashboardEmbeddedRoute =
    currentPath === "/admin" ||
    currentPath === "/admin/dashboard" ||
    currentPath.startsWith("/admin/dashboard/");

  const isShopAdminRoute =
    isAdminDashboardEmbeddedRoute ||
    currentPath === "/admin/shops" ||
    currentPath.startsWith("/admin/shops/") ||
    currentPath === "/admin/shop" ||
    currentPath.startsWith("/admin/shop/") ||
    currentPath === "/admin/karaoke" ||
    currentPath.startsWith("/admin/karaoke/");

  const shouldWrapAdminLayout =
    !isAdminDashboardEmbeddedRoute;

  const isKaraokeAdminPath =
    currentPath.startsWith("/admin/karaoke") ||
    currentPath.includes("/admin/karaoke/") ||
    currentLocation.href.includes("/admin/karaoke");

  const currentSearchCategory = (() => {
    try {
      const params = new URLSearchParams(currentSearch);

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
  })();

  const currentAdminCategory =
    isKaraokeAdminPath || currentSearchCategory === "karaoke"
      ? "karaoke"
      : "massage";

  const currentShopImageLimit =
    currentAdminCategory === "karaoke"
      ? KARAOKE_SHOP_IMAGE_COUNT
      : MAX_LOCAL_IMAGE_COUNT;


  const currentAdminCategoryParams = {
    category: currentAdminCategory,
    shopCategory: currentAdminCategory,
    serviceType: currentAdminCategory,
    businessType: currentAdminCategory,
    adminCategory: currentAdminCategory,
    admin: "true",
    adminMode: "true",
    adminList: "true",
    forAdmin: "true",
    fromAdmin: "true",
    management: "true",
  };

  const pageTitle =
    currentAdminCategory === "karaoke"
      ? "노래방 업체 관리"
      : "업체 관리";

  const pageDescription =
    currentAdminCategory === "karaoke"
      ? "노래방 업체명 / 주소 / 전화번호 / 영업시간 / 코스 / 금액 / 상태 / 사진 / 대표사진 관리"
      : "업체명 / 주소 / 전화번호 / 영업시간 / 코스 / 금액 / 상태 / 사진 / 대표사진 관리";

  const LOCAL_SHOP_KEY = `noma_admin_shops_${currentAdminCategory}`;
  const LOCAL_PUBLIC_SHOP_KEY = `noma_local_shops_${currentAdminCategory}`;
  const LOCAL_SHOP_IMAGE_BANK_KEY = `noma_admin_shop_image_bank_${currentAdminCategory}`;
  const LOCAL_SHOP_PREMIUM_BANK_KEY = `noma_admin_shop_premium_bank_${currentAdminCategory}`;
  const NORA_LOCAL_SHOP_PREMIUM_BANK_KEY = `nora_admin_shop_premium_bank_${currentAdminCategory}`;
  const LEGACY_LOCAL_SHOP_PREMIUM_BANK_KEY = "noma_admin_shop_premium_bank";
  const LEGACY_NORA_SHOP_PREMIUM_BANK_KEY = "nora_admin_shop_premium_bank";
  const LOCAL_SHOP_BACKUP_KEY = `noma_admin_shop_backup_${currentAdminCategory}`;
  const DELETED_SHOP_KEY = `noma_deleted_shop_ids_${currentAdminCategory}`;

  const [stats, setStats] = useState([]);
  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !isShopAdminRoute) {
      return;
    }

    const syncKey = [
      currentPath,
      currentSearch,
      currentAdminCategory,
      isKaraokeAdminPath ? "karaoke" : "massage",
    ].join("|");

    if (categorySyncKeyRef.current === syncKey) {
      return;
    }

    categorySyncKeyRef.current = syncKey;

    try {
      purgeUnsafeImageStorage();

      if (currentAdminCategory === "karaoke") {
        [window.localStorage, window.sessionStorage]
          .filter(Boolean)
          .forEach((storage) => {
            [
              LOCAL_SHOP_IMAGE_BANK_KEY,
              "nora_admin_shop_image_bank_karaoke",
            ].forEach((key) => storage.removeItem(key));
          });
      }

      dashboardCacheRef.current = {
        category: "",
        items: [],
      };
      dashboardCacheTimeRef.current = 0;

      const params = new URLSearchParams(window.location.search || "");
      const urlCategory =
        normalizeShopCategory(params.get("category")) ||
        normalizeShopCategory(params.get("shopCategory")) ||
        normalizeShopCategory(params.get("serviceType")) ||
        normalizeShopCategory(params.get("businessType")) ||
        normalizeShopCategory(params.get("adminCategory")) ||
        "";

      if (isKaraokeAdminPath && urlCategory !== "karaoke") {
        params.set("category", "karaoke");
        params.set("shopCategory", "karaoke");
        params.set("serviceType", "karaoke");
        params.set("businessType", "karaoke");
        params.set("adminCategory", "karaoke");

        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${params.toString()}`
        );
      }

      if (!isKaraokeAdminPath && currentAdminCategory === "massage") {
        ["category", "shopCategory", "serviceType", "businessType", "adminCategory"].forEach((key) => {
          params.delete(key);
        });

        const nextQuery = params.toString();

        window.history.replaceState(
          {},
          "",
          nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname
        );
      }

      localStorage.setItem("noma_admin_category", currentAdminCategory);
      sessionStorage.setItem("noma_admin_category", currentAdminCategory);
    } catch (e) {
      console.warn("SHOP ADMIN CATEGORY SYNC SKIP:", e.message);
    }
  }, [
    currentPath,
    currentSearch,
    currentAdminCategory,
    isKaraokeAdminPath,
    isShopAdminRoute,
  ]);

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s/g, "")
      .trim();

  const getShopCategory = (shop) => {
    if (!shop || typeof shop !== "object") {
      return currentAdminCategory;
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

    if (currentAdminCategory === "massage") {
      return "massage";
    }

    return (
      normalizeShopCategory(shop.category) ||
      normalizeShopCategory(shop.shopCategory) ||
      normalizeShopCategory(shop.type) ||
      normalizeShopCategory(shop.serviceType) ||
      normalizeShopCategory(shop.businessType) ||
      normalizeShopCategory(shop.adminCategory) ||
      currentAdminCategory
    );
  };

  const isCurrentCategoryShop = (shop) => {
    const shopCategory = getShopCategory(shop);

    if (currentAdminCategory === "karaoke") {
      return shopCategory === "karaoke";
    }

    return shopCategory !== "karaoke";
  };

  const filterCurrentCategoryShops = (items) => {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems.filter((item) => isCurrentCategoryShop(item));
  };

  const getAdminVisibleShops = (items) => {
    const safeItems = Array.isArray(items) ? items : [];

    return filterCurrentCategoryShops(safeItems);
  };

  const normalizePremiumType = (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const objectValue =
        value.premiumType !== undefined
          ? value.premiumType
          : value.premiumLevel !== undefined
          ? value.premiumLevel
          : value.membershipType !== undefined
          ? value.membershipType
          : value.membership !== undefined
          ? value.membership
          : value.listingType !== undefined
          ? value.listingType
          : value.shopGrade !== undefined
          ? value.shopGrade
          : value.imageGrade !== undefined
          ? value.imageGrade
          : value.photoGrade !== undefined
          ? value.photoGrade
          : value.grade !== undefined
          ? value.grade
          : value.badge !== undefined
          ? value.badge
          : value.premium !== undefined
          ? value.premium
          : value.isPremium !== undefined
          ? value.isPremium
          : value.premiumActive !== undefined
          ? value.premiumActive
          : "";

      return normalizePremiumType(objectValue);
    }

    const text = String(value || "")
      .toLowerCase()
      .trim();

    if (text === "vip" || text === "vvip") {
      return "vip";
    }

    if (
      text === "premium" ||
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "on" ||
      text === "active" ||
      text === "enabled"
    ) {
      return "premium";
    }

    return value === true ? "premium" : "normal";
  };

  const normalizeDirectPaymentEnabled = (value) => {
    return (
      value === true ||
      value === "true" ||
      value === 1 ||
      value === "1" ||
      String(value || "").toLowerCase().trim() === "enabled" ||
      String(value || "").toLowerCase().trim() === "active" ||
      String(value || "").toLowerCase().trim() === "on"
    );
  };

  const hasDirectPaymentField = (value) => {
    if (!value || typeof value !== "object") {
      return false;
    }

    return Object.prototype.hasOwnProperty.call(value, "directPaymentEnabled");
  };

  const pickDirectPaymentEnabled = (baseValue, nextValue) => {
    if (
      baseValue?.__directPaymentUpdated === true &&
      nextValue?.__directPaymentUpdated !== true
    ) {
      return normalizeDirectPaymentEnabled(baseValue.directPaymentEnabled);
    }

    if (hasDirectPaymentField(nextValue) || nextValue?.__directPaymentUpdated === true) {
      return normalizeDirectPaymentEnabled(nextValue.directPaymentEnabled);
    }

    return normalizeDirectPaymentEnabled(baseValue?.directPaymentEnabled);
  };

  const hasPremiumField = (value) => {
    if (!value || typeof value !== "object") {
      return false;
    }

    return (
      Object.prototype.hasOwnProperty.call(value, "premium") ||
      Object.prototype.hasOwnProperty.call(value, "isPremium") ||
      Object.prototype.hasOwnProperty.call(value, "premiumActive") ||
      Object.prototype.hasOwnProperty.call(value, "premiumType") ||
      Object.prototype.hasOwnProperty.call(value, "premiumLevel") ||
      Object.prototype.hasOwnProperty.call(value, "membershipType") ||
      Object.prototype.hasOwnProperty.call(value, "membership") ||
      Object.prototype.hasOwnProperty.call(value, "listingType") ||
      Object.prototype.hasOwnProperty.call(value, "shopGrade") ||
      Object.prototype.hasOwnProperty.call(value, "imageGrade") ||
      Object.prototype.hasOwnProperty.call(value, "photoGrade") ||
      Object.prototype.hasOwnProperty.call(value, "grade") ||
      Object.prototype.hasOwnProperty.call(value, "badge")
    );
  };

  const getImageValue = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value.trim();
    }

    if (typeof value === "object") {
      return String(
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
      ).trim();
    }

    return "";
  };

  const isBareBase64Image = (value) => {
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
  };

  const isDataOrBlobImage = (value) => {
    const text = String(value || "").trim();

    return (
      text.startsWith("data:image/") ||
      text.startsWith("blob:")
    );
  };

  const hasImageFileExtension = (value) => {
    const text = String(value || "").split("?")[0].split("#")[0].toLowerCase().trim();

    return /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(text);
  };

  const cleanImageUrlCandidate = (value) => {
    return String(value || "")
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[),.;]+$/g, "");
  };

  const isServerImageUrl = (value) => {
    const text = String(value || "").trim();

    if (!text) {
      return false;
    }

    if (
      text === "undefined" ||
      text === "null" ||
      text === "[object Object]" ||
      text.includes("[object Object]")
    ) {
      return false;
    }

    if (isDataOrBlobImage(text) || isBareBase64Image(text)) {
      return false;
    }

    return (
      text.startsWith("http://") ||
      text.startsWith("https://") ||
      text.startsWith("//") ||
      text.startsWith("/")
    );
  };

  const getImageDedupKey = (value) => {
    const normalized = normalizeImageSrc(value);
    const text = String(normalized || "").trim();

    if (!text) {
      return "";
    }

    try {
      const url = text.startsWith("http://") || text.startsWith("https://")
        ? new URL(text)
        : new URL(text, getApiOrigin());

      const path = url.pathname
        .replace(/\\/g, "/")
        .replace(/^\/api\/shops\/uploads\//i, "/uploads/")
        .replace(/^\/api\/shops\/upload\//i, "/uploads/")
        .replace(/^\/shops\/uploads\//i, "/uploads/")
        .replace(/^\/shops\/upload\//i, "/uploads/")
        .replace(/^\/api\/uploads\//i, "/uploads/")
        .replace(/^\/api\/upload\//i, "/uploads/")
        .replace(/^\/uploads\//i, "/uploads/")
        .replace(/^\/upload\//i, "/uploads/")
        .replace(/\/+/g, "/")
        .toLowerCase();

      return `${path}${url.search || ""}`.trim();
    } catch (e) {
      return text
        .replace(/\\/g, "/")
        .replace(/^https?:\/\/[^/]+/i, "")
        .replace(/^\/api\/shops\/uploads\//i, "/uploads/")
        .replace(/^\/api\/shops\/upload\//i, "/uploads/")
        .replace(/^\/shops\/uploads\//i, "/uploads/")
        .replace(/^\/shops\/upload\//i, "/uploads/")
        .replace(/^\/api\/uploads\//i, "/uploads/")
        .replace(/^\/api\/upload\//i, "/uploads/")
        .replace(/^\/uploads\//i, "/uploads/")
        .replace(/^\/upload\//i, "/uploads/")
        .replace(/\/+/g, "/")
        .toLowerCase()
        .trim();
    }
  };

  const makeUniqueImageList = (images, limit = MAX_LOCAL_IMAGE_COUNT) => {
    const result = [];
    const seen = new Set();

    (Array.isArray(images) ? images : [])
      .map((image) => normalizeImageSrc(image))
      .filter((image) => image && isServerImageUrl(image))
      .forEach((image) => {
        const key = getImageDedupKey(image);

        if (!key || seen.has(key)) {
          return;
        }

        seen.add(key);
        result.push(image);
      });

    return result.slice(0, limit);
  };

  const normalizeImageSrc = (value) => {
    const text = String(value || "").trim();

    if (!text) {
      return "";
    }

    if (
      text === "undefined" ||
      text === "null" ||
      text === "[object Object]" ||
      text.includes("[object Object]")
    ) {
      return "";
    }

    if (isDataOrBlobImage(text) || isBareBase64Image(text)) {
      return "";
    }

    const normalizeUploadPath = (pathValue) =>
      String(pathValue || "")
        .replace(/\\/g, "/")
        .replace(/^\/api\/shops\/upload\//i, "/api/shops/uploads/")
        .replace(/^\/shops\/uploads\//i, "/api/shops/uploads/")
        .replace(/^\/shops\/upload\//i, "/api/shops/uploads/")
        .replace(/^\/api\/uploads\//i, "/api/uploads/")
        .replace(/^\/api\/upload\//i, "/api/uploads/")
        .replace(/^\/upload\//i, "/uploads/")
        .replace(/\/+/g, "/");

    if (text.startsWith("//")) {
      const protocol =
        typeof window !== "undefined" && window.location?.protocol
          ? window.location.protocol
          : "https:";

      return normalizeImageSrc(`${protocol}${text}`);
    }

    if (text.startsWith("http://") || text.startsWith("https://")) {
      try {
        const url = new URL(text);
        const normalizedPath = normalizeUploadPath(url.pathname);

        return `${url.origin}${normalizedPath}${url.search || ""}${url.hash || ""}`;
      } catch (e) {
        return text;
      }
    }

    if (
      text.startsWith("/api/shops/uploads/") ||
      text.startsWith("/api/shops/upload/") ||
      text.startsWith("/shops/uploads/") ||
      text.startsWith("/shops/upload/") ||
      text.startsWith("/uploads/") ||
      text.startsWith("/upload/")
    ) {
      return `${getApiOrigin()}${normalizeUploadPath(text)}`;
    }

    if (text.startsWith("/api/")) {
      return `${getApiOrigin()}${normalizeUploadPath(text)}`;
    }

    if (text.startsWith("/")) {
      return normalizeUploadPath(text);
    }

    if (
      text.startsWith("api/shops/uploads/") ||
      text.startsWith("api/shops/upload/") ||
      text.startsWith("shops/uploads/") ||
      text.startsWith("shops/upload/") ||
      text.startsWith("api/uploads/") ||
      text.startsWith("api/upload/") ||
      text.startsWith("uploads/") ||
      text.startsWith("upload/")
    ) {
      return `${getApiOrigin()}${normalizeUploadPath(`/${text.replace(/^\/+/, "")}`)}`;
    }

    if (text.startsWith("shops/")) {
      return `${getApiBaseUrl()}/${text.replace(/^\/+/, "")}`;
    }

    if (hasImageFileExtension(text)) {
      return `${getApiOrigin()}/uploads/${text.replace(/^\/+/, "")}`;
    }

    return "";
  };

  const makeSafeArray = (value) => {
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

        const normalizedImage = normalizeImageSrc(text);

        if (normalizedImage) {
          result.push(normalizedImage);
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
          .map((itemText) => normalizeImageSrc(itemText))
          .filter(Boolean)
          .forEach((itemText) => result.push(itemText));

        return;
      }

      const imageValue = normalizeImageSrc(getImageValue(item));

      if (imageValue) {
        result.push(imageValue);
      }
    };

    pushValue(value);

    return result
      .map((item) => normalizeImageSrc(item))
      .filter(Boolean);
  };

  const toNumber = (value) => {
    const number = Number(
      String(value || "")
        .replaceAll(",", "")
        .replaceAll("원", "")
        .trim()
    );

    return Number.isNaN(number) ? 0 : number;
  };

  const getDiscountRate = (originalPrice, salePrice) => {
    const original = toNumber(originalPrice);
    const sale = toNumber(salePrice);

    if (!original || !sale || original <= sale) {
      return 0;
    }

    return Math.round(((original - sale) / original) * 100);
  };

  const getMinutesFromBusinessTimeText = (value) => {
    const text = String(value || "")
      .replace(/다음날/g, "")
      .replace(/영업/g, "")
      .trim();

    if (!text) {
      return null;
    }

    const timeMatch = text.match(/(\d{1,2})\s*:\s*(\d{1,2})/);

    if (timeMatch) {
      const hour = Number(timeMatch[1]);
      const minute = Number(timeMatch[2]);

      if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return null;
      }

      return hour * 60 + minute;
    }

    const koreanMatch = text.match(/(오전|오후|새벽)?\s*(\d{1,2})\s*(?::\s*(\d{1,2}))?\s*시?/);

    if (!koreanMatch) {
      return null;
    }

    const meridiem = koreanMatch[1] || "";
    let hour = Number(koreanMatch[2]);
    const minute = Number(koreanMatch[3] || 0);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }

    if (meridiem === "오후" && hour < 12) {
      hour += 12;
    }

    if ((meridiem === "오전" || meridiem === "새벽") && hour === 12) {
      hour = 0;
    }

    return hour * 60 + minute;
  };

  const minutesToTimerValue = (minutes) => {
    if (minutes === null || minutes === undefined || !Number.isFinite(Number(minutes))) {
      return "";
    }

    const total = Number(minutes);
    const hour = Math.floor(total / 60) % 24;
    const minute = total % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const timerValueToKoreanText = (value) => {
    const [rawHour, rawMinute] = String(value || "").split(":");
    const hour = Number(rawHour);
    const minute = Number(rawMinute || 0);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return "";
    }

    const meridiem = hour < 12 ? "오전" : "오후";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const minuteText = minute > 0 ? ` ${minute}분` : "";

    return `${meridiem} ${displayHour}시${minuteText}`;
  };

  const getBusinessTimerValue = (businessHours = "") => {
    const text = String(businessHours || "").replace(/\s+/g, "");

    if (!text || text.includes("24시간")) {
      return {
        start: "",
        end: "",
      };
    }

    const parts = text.split(/~|-|–|—/).filter(Boolean);
    const startMinutes = getMinutesFromBusinessTimeText(parts[0]);
    const endMinutes = getMinutesFromBusinessTimeText(parts[1]);

    return {
      start: minutesToTimerValue(startMinutes),
      end: minutesToTimerValue(endMinutes),
    };
  };

  const setBusinessTimerValue = (field, value) => {
    const current = getBusinessTimerValue(form.businessHours);
    const next = {
      ...current,
      [field]: value,
    };

    const startText = timerValueToKoreanText(next.start);
    const endText = timerValueToKoreanText(next.end);

    setForm((prev) => ({
      ...prev,
      businessHours:
        startText && endText
          ? `${startText}~${endText}`
          : prev.businessHours,
    }));
  };

  const isShopBusinessOpen = (businessHours = "") => {
    const text = String(businessHours || "").replace(/\s+/g, "");

    if (!text) {
      return true;
    }

    if (text.includes("24시간")) {
      return true;
    }

    const parts = text.split(/~|-|–|—/).filter(Boolean);

    if (parts.length < 2) {
      return true;
    }

    const startMinutes = getMinutesFromBusinessTimeText(parts[0]);
    const endMinutes = getMinutesFromBusinessTimeText(parts[1]);

    if (startMinutes === null || endMinutes === null) {
      return true;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (startMinutes === endMinutes) {
      return true;
    }

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  };

  const isCompletePricingRow = (row) => {
    const duration = String(row?.duration || row?.time || "").trim();
    const originalPrice = toNumber(row?.originalPrice || row?.originPrice || row?.regularPrice);
    const salePrice = toNumber(row?.salePrice || row?.discountPrice || row?.price || row?.amount);

    return !!duration && originalPrice > 0 && salePrice > 0;
  };

  const filterCompleteCoursePricing = (coursePricing) =>
    normalizeCoursePricing(coursePricing)
      .map((section) => ({
        ...section,
        title: String(section?.title || "").trim(),
        dayStartTime: section?.dayStartTime || "",
        dayEndTime: section?.dayEndTime || "",
        nightStartTime: section?.nightStartTime || "",
        nightEndTime: section?.nightEndTime || "",
        day: (Array.isArray(section?.day) ? section.day : []).filter((row) =>
          isCompletePricingRow(row)
        ),
        night: (Array.isArray(section?.night) ? section.night : []).filter((row) =>
          isCompletePricingRow(row)
        ),
      }))
      .filter((section) => section.title && (section.day.length || section.night.length));

  const normalizePricingRow = (row, duration) => {
    const originalPrice = toNumber(row?.originalPrice || row?.originPrice || row?.regularPrice);
    const salePrice = toNumber(row?.salePrice || row?.discountPrice || row?.price || row?.amount);

    return {
      duration:
        row?.duration !== undefined
          ? row.duration
          : row?.time !== undefined
          ? row.time
          : duration || "",
      originalPrice,
      salePrice,
      discountRate: getDiscountRate(originalPrice, salePrice),
    };
  };

  const normalizeCoursePricing = (value) => {
    let source = Array.isArray(value) ? value : [];

    if (!source.length && value && typeof value === "object") {
      const nestedSource =
        value.coursePricing ||
        value.pricing ||
        value.priceTable ||
        value.courseSections ||
        value.sections ||
        value.groups ||
        value.categories ||
        value.items ||
        value.courses ||
        value.prices ||
        null;

      if (Array.isArray(nestedSource)) {
        source = nestedSource;
      } else {
        source = Object.entries(value)
          .filter(([, item]) => Array.isArray(item) || (item && typeof item === "object"))
          .map(([title, item]) => {
            if (Array.isArray(item)) {
              return {
                title,
                rows: item,
              };
            }

            return {
              title,
              ...item,
            };
          });
      }
    }

    if (!source.length) {
      source = cloneCoursePricing();
    }

    return source.map((section, sectionIndex) => {
      const defaultSection = DEFAULT_COURSE_PRICING[sectionIndex] || DEFAULT_COURSE_PRICING[0];
      const sectionRows = Array.isArray(section?.rows) ? section.rows : [];

      const dayRows =
        Array.isArray(section?.day)
          ? section.day
          : Array.isArray(section?.daytime)
          ? section.daytime
          : Array.isArray(section?.주간)
          ? section.주간
          : sectionRows.length
          ? sectionRows
              .map((row) => ({
                duration: row?.duration || row?.time || row?.minute || row?.minutes || "",
                originalPrice:
                  row?.dayOriginal ||
                  row?.dayOriginalPrice ||
                  row?.dayNormalPrice ||
                  row?.originalPrice ||
                  row?.normalPrice ||
                  row?.regularPrice ||
                  0,
                salePrice:
                  row?.dayPrice ||
                  row?.daySalePrice ||
                  row?.dayDiscountPrice ||
                  row?.salePrice ||
                  row?.discountPrice ||
                  row?.price ||
                  0,
              }))
              .filter((row) => String(row.duration || "").trim())
          : defaultSection.day;

      const nightRows =
        Array.isArray(section?.night)
          ? section.night
          : Array.isArray(section?.nighttime)
          ? section.nighttime
          : Array.isArray(section?.야간)
          ? section.야간
          : sectionRows.length
          ? sectionRows
              .map((row) => ({
                duration: row?.duration || row?.time || row?.minute || row?.minutes || "",
                originalPrice:
                  row?.nightOriginal ||
                  row?.nightOriginalPrice ||
                  row?.nightNormalPrice ||
                  row?.originalPrice ||
                  row?.normalPrice ||
                  row?.regularPrice ||
                  0,
                salePrice:
                  row?.nightPrice ||
                  row?.nightSalePrice ||
                  row?.nightDiscountPrice ||
                  0,
              }))
              .filter((row) => String(row.duration || "").trim())
          : defaultSection.night;

      return {
        title:
          section?.title !== undefined
            ? section.title
            : section?.name || section?.courseName || section?.category || section?.categoryName || defaultSection.title,
        dayStartTime:
          section?.dayStartTime ||
          section?.dayStart ||
          section?.dayOpenTime ||
          section?.dayFrom ||
          defaultSection.dayStartTime ||
          "",
        dayEndTime:
          section?.dayEndTime ||
          section?.dayEnd ||
          section?.dayCloseTime ||
          section?.dayTo ||
          defaultSection.dayEndTime ||
          "",
        nightStartTime:
          section?.nightStartTime ||
          section?.nightStart ||
          section?.nightOpenTime ||
          section?.nightFrom ||
          defaultSection.nightStartTime ||
          "",
        nightEndTime:
          section?.nightEndTime ||
          section?.nightEnd ||
          section?.nightCloseTime ||
          section?.nightTo ||
          defaultSection.nightEndTime ||
          "",
        day: dayRows.map((row, index) =>
          normalizePricingRow(row, defaultSection.day[index]?.duration || "")
        ),
        night: nightRows.map((row, index) =>
          normalizePricingRow(row, defaultSection.night[index]?.duration || "")
        ),
      };
    });
  };

  const makeSafeCoursePricing = (shop) => {
    const source =
      shop?.coursePricing ||
      shop?.priceTable ||
      shop?.pricing ||
      shop?.courseSections ||
      shop?.menuPrices ||
      shop?.menus ||
      shop?.courseMenus ||
      null;

    if (!source || (Array.isArray(source) && source.length === 0)) {
      return [];
    }

    return normalizeCoursePricing(source);
  };

  const flattenCoursePricing = (coursePricing) => {
    const sections = normalizeCoursePricing(coursePricing);
    const courses = [];
    const price = [];

    sections.forEach((section) => {
      ["day", "night"].forEach((period) => {
        section[period].forEach((row) => {
          if (isCompletePricingRow(row)) {
            courses.push(`${section.title} ${period === "day" ? "주간" : "야간"} ${row.duration}`);
            price.push(row.salePrice);
          }
        });
      });
    });

    return {
      courses,
      price,
    };
  };

  const makeSafeImages = (shop) => {
    if (!shop || typeof shop !== "object") {
      return [];
    }

    const arraySources = [
      shop?.images,
      shop?.photos,
      shop?.imageUrls,
      shop?.gallery,
      shop?.pictures,
      shop?.files,
    ];

    const scalarSources = [
      shop?.representativeImage,
      shop?.mainImage,
      shop?.thumbnail,
      shop?.coverImage,
      shop?.image,
      shop?.imageUrl,
      shop?.photo,
      shop?.picture,
    ];

    if (currentAdminCategory === "karaoke") {
      const representativeImage = normalizeImageSrc(
        shop?.representativeImage ||
          shop?.mainImage ||
          shop?.thumbnail ||
          shop?.coverImage ||
          shop?.image ||
          ""
      );
      const representativeKey = getImageDedupKey(representativeImage);
      const normalizedArraySources = arraySources
        .map((source) => makeUniqueImageList(makeSafeArray(source)))
        .filter((source) => source.length > 0);
      const canonicalSource =
        normalizedArraySources.find((source) =>
          representativeKey
            ? source.some((image) => getImageDedupKey(image) === representativeKey)
            : false
        ) ||
        normalizedArraySources[0] ||
        makeUniqueImageList(
          scalarSources.flatMap((source) => makeSafeArray(source))
        );
      const representativeIndex = representativeKey
        ? canonicalSource.findIndex(
            (image) => getImageDedupKey(image) === representativeKey
          )
        : -1;
      const groupStart =
        representativeIndex >= 0
          ? Math.floor(representativeIndex / currentShopImageLimit) * currentShopImageLimit
          : 0;

      return makeUniqueImageList(
        canonicalSource.slice(groupStart, groupStart + currentShopImageLimit),
        currentShopImageLimit
      );
    }

    return makeUniqueImageList([
      ...arraySources.flatMap((source) => makeSafeArray(source)),
      ...scalarSources.flatMap((source) => makeSafeArray(source)),
    ]);
  };

  const makeImageListWithRepresentative = (images, representativeImage) => {
    const normalizedImages = makeUniqueImageList(images);
    const safeRepresentativeImage = normalizeImageSrc(
      representativeImage || normalizedImages[0] || ""
    );
    const representativeKey = getImageDedupKey(safeRepresentativeImage);

    if (!safeRepresentativeImage || !representativeKey) {
      return normalizedImages;
    }

    const representativeItem =
      normalizedImages.find((image) => getImageDedupKey(image) === representativeKey) ||
      safeRepresentativeImage;

    return makeUniqueImageList([
      representativeItem,
      ...normalizedImages.filter((image) => getImageDedupKey(image) !== representativeKey),
    ]);
  };

  const getStorageSafeImages = (shop) => {
    return makeUniqueImageList(makeSafeImages(shop))
      .filter((image) => String(image || "").length <= MAX_LOCAL_IMAGE_LENGTH)
      .slice(0, currentShopImageLimit);
  };

  const makeSafeCourses = (shop) => {
    const rawCourses = Array.isArray(shop?.courses)
      ? shop.courses
      : Array.isArray(shop?.course)
      ? shop.course
      : [];

    return rawCourses.filter((item) => item !== null && item !== undefined && item !== "");
  };

  const makeSafePrice = (shop) => {
    const rawPrice = Array.isArray(shop?.price)
      ? shop.price
      : Array.isArray(shop?.prices)
      ? shop.prices
      : shop?.price
      ? [shop.price]
      : [];

    return rawPrice.filter((item) => item !== null && item !== undefined && item !== "");
  };

  const isLocalShopId = (value) => {
    const id = String(value || "");

    return (
      id.startsWith("local-shop-") ||
      id.startsWith("local-noma-") ||
      id.startsWith("local-nora-") ||
      id.startsWith("local-massage-shop-") ||
      id.startsWith("local-karaoke-shop-")
    );
  };

  const getShopIdentityValues = (shop) => {
    if (!shop || typeof shop !== "object") {
      const text = String(shop || "").trim();

      return text ? [text, `id:${text}`] : [];
    }

    const id = String(shop._id || shop.id || "").trim();
    const shopId = String(shop.shopId || "").trim();

    return Array.from(
      new Set(
        [
          id,
          id ? `id:${id}` : "",
          shopId,
          shopId ? `shopId:${shopId}` : "",
        ]
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    );
  };

  const isSafeDeletedIdentityValue = (value) => {
    const text = String(value || "").trim();

    if (!text) {
      return false;
    }

    if (
      text.startsWith("phone:") ||
      text.startsWith("name:") ||
      text.startsWith("address:") ||
      text.startsWith("nameAddress:") ||
      text.includes("::")
    ) {
      return false;
    }

    if (/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(text)) {
      return false;
    }

    if (text.startsWith("id:")) {
      const idText = text.replace(/^id:/, "").trim();

      return (
        isLocalShopId(idText) ||
        /^[a-f0-9]{24}$/i.test(idText) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idText)
      );
    }

    if (text.startsWith("shopId:")) {
      const shopIdText = text.replace(/^shopId:/, "").trim();

      return (
        isLocalShopId(shopIdText) ||
        /^[a-f0-9]{24}$/i.test(shopIdText) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopIdText)
      );
    }

    if (isLocalShopId(text)) {
      return true;
    }

    if (/^[a-f0-9]{24}$/i.test(text)) {
      return true;
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
      return true;
    }

    return false;
  };

  const getDeletedShopStorageKeys = () => [
    DELETED_SHOP_KEY,
    `nora_deleted_shop_ids_${currentAdminCategory}`,
    `noma_deleted_shop_ids_${currentAdminCategory}`,
  ];

  const readDeletedShopIds = () => {
    try {
      const readStorageItems = (storage, key) => {
        try {
          const value = JSON.parse(storage.getItem(key) || "[]");

          return Array.isArray(value) ? value : [];
        } catch (e) {
          return [];
        }
      };

      return Array.from(
        new Set(
          getDeletedShopStorageKeys()
            .flatMap((key) => [
              ...readStorageItems(localStorage, key),
              ...readStorageItems(sessionStorage, key),
            ])
            .map((item) => String(item || "").trim())
            .filter((item) => isSafeDeletedIdentityValue(item))
        )
      );
    } catch (e) {
      return [];
    }
  };

  const writeDeletedShopIds = (ids) => {
    try {
      const safeIds = Array.from(
        new Set(
          (Array.isArray(ids) ? ids : [])
            .map((item) => String(item || "").trim())
            .filter((item) => isSafeDeletedIdentityValue(item))
        )
      );

      const storageText = JSON.stringify(safeIds);

      getDeletedShopStorageKeys().forEach((key) => {
        localStorage.setItem(key, storageText);
        sessionStorage.setItem(key, storageText);
      });
    } catch (e) {
      console.warn("SHOP DELETE STORAGE SAVE SKIP:", e.message);
    }
  };

  const rememberDeletedShop = (shopOrId) => {
    const ids = typeof shopOrId === "object" ? getShopIdentityValues(shopOrId) : [String(shopOrId || "").trim()];
    const nextIds = Array.from(new Set([...readDeletedShopIds(), ...ids.filter(Boolean)]));

    writeDeletedShopIds(nextIds);

    return nextIds;
  };

  const forgetDeletedShop = (shopOrId) => {
    const values = typeof shopOrId === "object" ? getShopIdentityValues(shopOrId) : [String(shopOrId || "").trim()];

    if (!values.length) {
      return;
    }

    writeDeletedShopIds(readDeletedShopIds().filter((item) => !values.includes(item)));
  };

  const isDeletedShop = (shop) => {
    const deletedIds = readDeletedShopIds();

    if (!deletedIds.length) {
      return false;
    }

    const values = typeof shop === "object" ? getShopIdentityValues(shop) : [String(shop || "").trim()];

    return values.some((value) => deletedIds.includes(value));
  };

  const filterDeletedShops = (items) => {
    return (Array.isArray(items) ? items : []).filter((item) => !isDeletedShop(item));
  };

  const normalizeAddressValue = (value) => {
    const text = String(value || "").trim();

    if (!text || text === "주소 없음") {
      return "";
    }

    return text;
  };

  const normalizeCoordinateValue = (value) => {
    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
  };

  const getShopCoordinates = (shop) => {
    if (!shop || typeof shop !== "object") {
      return { lat: 0, lng: 0 };
    }

    const isUsableCoordinatePair = (lat, lng) => {
      const safeLat = normalizeCoordinateValue(lat);
      const safeLng = normalizeCoordinateValue(lng);

      return (
        Number.isFinite(safeLat) &&
        Number.isFinite(safeLng) &&
        safeLat >= -90 &&
        safeLat <= 90 &&
        safeLng >= -180 &&
        safeLng <= 180 &&
        !(safeLat === 0 && safeLng === 0)
      );
    };

    const candidates = [
      [shop?.lat, shop?.lng],
      [shop?.latitude, shop?.longitude],
      [shop?.location?.lat, shop?.location?.lng],
      [shop?.location?.latitude, shop?.location?.longitude],
      [shop?.coordinates?.lat, shop?.coordinates?.lng],
      [shop?.coordinates?.latitude, shop?.coordinates?.longitude],
      [
        Array.isArray(shop?.location?.coordinates)
          ? shop.location.coordinates[1]
          : undefined,
        Array.isArray(shop?.location?.coordinates)
          ? shop.location.coordinates[0]
          : undefined,
      ],
    ];

    for (const [latValue, lngValue] of candidates) {
      if (!isUsableCoordinatePair(latValue, lngValue)) {
        continue;
      }

      return {
        lat: normalizeCoordinateValue(latValue),
        lng: normalizeCoordinateValue(lngValue),
      };
    }

    return { lat: 0, lng: 0 };
  };

  const geocodeAddress = (address) => {
    const safeAddress = normalizeAddressValue(address)
      .replace(/\s+/g, " ")
      .trim();

    if (!safeAddress) {
      return Promise.resolve({ lat: 0, lng: 0 });
    }

    const normalizeAddressCandidate = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    const makeAddressCandidates = () => {
      const candidates = [
        safeAddress,
      ];

      if (/^서울\s+/.test(safeAddress)) {
        candidates.push(safeAddress.replace(/^서울\s+/, "서울특별시 "));
      }

      if (/^부산\s+/.test(safeAddress)) {
        candidates.push(safeAddress.replace(/^부산\s+/, "부산광역시 "));
      }

      if (/^대구\s+/.test(safeAddress)) {
        candidates.push(safeAddress.replace(/^대구\s+/, "대구광역시 "));
      }

      if (/^인천\s+/.test(safeAddress)) {
        candidates.push(safeAddress.replace(/^인천\s+/, "인천광역시 "));
      }

      if (/^광주\s+/.test(safeAddress)) {
        candidates.push(safeAddress.replace(/^광주\s+/, "광주광역시 "));
      }

      if (/^대전\s+/.test(safeAddress)) {
        candidates.push(safeAddress.replace(/^대전\s+/, "대전광역시 "));
      }

      if (/^울산\s+/.test(safeAddress)) {
        candidates.push(safeAddress.replace(/^울산\s+/, "울산광역시 "));
      }

      if (/^세종\s+/.test(safeAddress)) {
        candidates.push(safeAddress.replace(/^세종\s+/, "세종특별자치시 "));
      }

      if (/^김해시\s+/.test(safeAddress)) {
        candidates.push(`경상남도 ${safeAddress}`);
      }

      if (/^창원시\s+/.test(safeAddress)) {
        candidates.push(`경상남도 ${safeAddress}`);
      }

      if (/^양산시\s+/.test(safeAddress)) {
        candidates.push(`경상남도 ${safeAddress}`);
      }

      if (/^진주시\s+/.test(safeAddress)) {
        candidates.push(`경상남도 ${safeAddress}`);
      }

      const withoutDetail = safeAddress
        .replace(/\s+\d+(?:-\d+)?(?:번지)?\s*$/i, "")
        .trim();

      if (withoutDetail && withoutDetail !== safeAddress) {
        candidates.push(withoutDetail);

        if (/^김해시\s+/.test(withoutDetail)) {
          candidates.push(`경상남도 ${withoutDetail}`);
        }
      }

      return Array.from(
        new Set(
          candidates
            .map((item) => normalizeAddressCandidate(item))
            .filter(Boolean)
        )
      );
    };

    const addressCandidates = makeAddressCandidates();

    return new Promise((resolve, reject) => {
      let finished = false;
      let retryCount = 0;
      const maxRetryCount = 50;

      const finishResolve = (value) => {
        if (finished) {
          return;
        }

        finished = true;
        resolve(value);
      };

      const finishReject = (error) => {
        if (finished) {
          return;
        }

        finished = true;
        reject(error);
      };

      const isUsableCoordinate = (lat, lng) => {
        const safeLat = Number(lat);
        const safeLng = Number(lng);

        return (
          Number.isFinite(safeLat) &&
          Number.isFinite(safeLng) &&
          safeLat >= -90 &&
          safeLat <= 90 &&
          safeLng >= -180 &&
          safeLng <= 180 &&
          !(safeLat === 0 && safeLng === 0)
        );
      };

      const tryKeywordSearch = (services) => {
        if (!services?.Places) {
          finishReject(new Error(`주소 좌표 변환 실패: ${safeAddress}`));
          return;
        }

        try {
          const places = new services.Places();
          let keywordIndex = 0;

          const searchNextKeyword = () => {
            if (keywordIndex >= addressCandidates.length) {
              finishReject(new Error(`주소 좌표 변환 실패: ${safeAddress}`));
              return;
            }

            const candidate = addressCandidates[keywordIndex];
            keywordIndex += 1;

            places.keywordSearch(candidate, (result, status) => {
              if (
                status === services.Status.OK &&
                Array.isArray(result) &&
                result.length
              ) {
                const lat = normalizeCoordinateValue(result[0]?.y);
                const lng = normalizeCoordinateValue(result[0]?.x);

                if (isUsableCoordinate(lat, lng)) {
                  finishResolve({ lat, lng });
                  return;
                }
              }

              searchNextKeyword();
            });
          };

          searchNextKeyword();
        } catch (e) {
          finishReject(e);
        }
      };

      const executeGeocode = () => {
        try {
          const kakaoMaps = window?.kakao?.maps;
          const services = kakaoMaps?.services;
          const Geocoder = services?.Geocoder;

          if (!kakaoMaps || !services || !Geocoder || !services?.Status) {
            retryCount += 1;

            if (retryCount >= maxRetryCount) {
              finishReject(
                new Error("카카오 주소 좌표 변환 서비스를 사용할 수 없습니다.")
              );
              return;
            }

            window.setTimeout(runWhenKakaoReady, 100);
            return;
          }

          const geocoder = new Geocoder();
          let addressIndex = 0;

          const searchNextAddress = () => {
            if (addressIndex >= addressCandidates.length) {
              tryKeywordSearch(services);
              return;
            }

            const candidate = addressCandidates[addressIndex];
            addressIndex += 1;

            geocoder.addressSearch(candidate, (result, status) => {
              if (
                status === services.Status.OK &&
                Array.isArray(result) &&
                result.length
              ) {
                const lat = normalizeCoordinateValue(result[0]?.y);
                const lng = normalizeCoordinateValue(result[0]?.x);

                if (isUsableCoordinate(lat, lng)) {
                  finishResolve({ lat, lng });
                  return;
                }
              }

              searchNextAddress();
            });
          };

          searchNextAddress();
        } catch (e) {
          finishReject(e);
        }
      };

      const runWhenKakaoReady = () => {
        try {
          const kakaoMaps = window?.kakao?.maps;

          if (!kakaoMaps) {
            retryCount += 1;

            if (retryCount >= maxRetryCount) {
              finishReject(
                new Error("카카오 주소 좌표 변환 서비스를 사용할 수 없습니다.")
              );
              return;
            }

            window.setTimeout(runWhenKakaoReady, 100);
            return;
          }

          if (typeof kakaoMaps.load === "function") {
            kakaoMaps.load(executeGeocode);
            return;
          }

          executeGeocode();
        } catch (e) {
          finishReject(e);
        }
      };

      runWhenKakaoReady();
    });
  };

  const hasSafeText = (value) => String(value || "").trim().length > 0;

  const pickStableText = (baseValue, nextValue) => {
    if (hasSafeText(nextValue)) {
      return nextValue;
    }

    return baseValue || "";
  };

  const pickStableAddress = (...values) => {
    for (const value of values) {
      const address = normalizeAddressValue(value);

      if (address) {
        return address;
      }
    }

    return "";
  };

  const mergeShopRecord = (baseShop, nextShop) => {
    const base = baseShop || {};
    const next = nextShop || {};

    const baseImages = makeSafeImages(base);
    const nextImages = makeSafeImages(next);
    const baseReplaceImages = base?.__replaceImages === true;
    const nextReplaceImages = next?.__replaceImages === true;
    const replaceImages = baseReplaceImages || nextReplaceImages;

    const fixedImages = nextReplaceImages
      ? makeUniqueImageList(nextImages)
      : baseReplaceImages && baseImages.length
      ? makeUniqueImageList(baseImages)
      : baseReplaceImages && !baseImages.length && nextImages.length
      ? makeUniqueImageList(nextImages)
      : nextImages.length >= baseImages.length
      ? makeUniqueImageList(nextImages)
      : makeUniqueImageList(baseImages);

    const baseCourses = makeSafeCourses(base);
    const nextCourses = makeSafeCourses(next);
    const mergedCourses = nextCourses.length ? nextCourses : baseCourses;

    const basePrice = makeSafePrice(base);
    const nextPrice = makeSafePrice(next);
    const mergedPrice = nextPrice.length ? nextPrice : basePrice;

    const baseCoursePricing = makeSafeCoursePricing(base);
    const nextCoursePricing = makeSafeCoursePricing(next);
    const baseCompleteCoursePricing = filterCompleteCoursePricing(baseCoursePricing);
    const nextCompleteCoursePricing = filterCompleteCoursePricing(nextCoursePricing);
    const nextHasCoursePricingSource = !!(
      next?.coursePricing ||
      next?.priceTable ||
      next?.pricing ||
      next?.courseSections ||
      next?.menuPrices ||
      next?.menus ||
      next?.courseMenus
    );
    const nextIsSubmitPayload = next?.__fromSubmitPayload === true;
    const mergedCoursePricing = nextIsSubmitPayload
      ? nextCompleteCoursePricing
      : nextCompleteCoursePricing.length > 0
      ? nextCompleteCoursePricing
      : baseCompleteCoursePricing.length > 0
      ? baseCompleteCoursePricing
      : nextHasCoursePricingSource && nextCoursePricing.length > 0
      ? nextCoursePricing
      : baseCoursePricing;

    const representativeCandidate = normalizeImageSrc(
      nextReplaceImages
        ? next.representativeImage ||
            next.mainImage ||
            next.thumbnail ||
            next.coverImage ||
            fixedImages[0] ||
            ""
        : baseReplaceImages
        ? base.representativeImage ||
            base.mainImage ||
            base.thumbnail ||
            base.coverImage ||
            fixedImages[0] ||
            ""
        : next.representativeImage ||
            next.mainImage ||
            next.thumbnail ||
            next.coverImage ||
            base.representativeImage ||
            base.mainImage ||
            base.thumbnail ||
            base.coverImage ||
            fixedImages[0] ||
            ""
    );

    const representativeImage =
      fixedImages.find((image) => image === representativeCandidate) ||
      fixedImages[0] ||
      representativeCandidate ||
      "";

    const baseId = base._id || base.id || "";
    const nextId = next._id || next.id || next.shopId || "";
    const resolvedAddress = pickStableAddress(
      next.address,
      next.roadAddress,
      next.fullAddress,
      next.locationText,
      base.address,
      base.roadAddress,
      base.fullAddress,
      base.locationText
    );
    const basePremium = normalizePremiumType(base);
    const nextPremium = normalizePremiumType(next);
    const nextHasPremiumField = hasPremiumField(next);
    const premium = nextHasPremiumField ? nextPremium : basePremium;
    const directPaymentEnabled = pickDirectPaymentEnabled(base, next);
    const baseCoordinates = getShopCoordinates(base);
    const nextCoordinates = getShopCoordinates(next);
    const lat = nextCoordinates.lat || baseCoordinates.lat || 0;
    const lng = nextCoordinates.lng || baseCoordinates.lng || 0;

    return normalizeShopForList({
      ...base,
      ...next,
      _id: nextId || baseId,
      id: nextId || baseId,
      name: pickStableText(base.name, next.name),
      address: resolvedAddress,
      roadAddress: resolvedAddress,
      fullAddress: resolvedAddress,
      locationText: resolvedAddress,
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      phone: pickStableText(base.phone || base.tel, next.phone || next.tel),
      businessHours: pickStableText(base.businessHours || base.openingHours || base.hours, next.businessHours || next.openingHours || next.hours),
      openingHours: pickStableText(base.openingHours || base.businessHours || base.hours, next.openingHours || next.businessHours || next.hours),
      hours: pickStableText(base.hours || base.businessHours || base.openingHours, next.hours || next.businessHours || next.openingHours),
      intro: pickStableText(base.intro || base.description || base.shopIntro, next.intro || next.description || next.shopIntro),
      description: pickStableText(base.description || base.intro || base.shopIntro, next.description || next.intro || next.shopIntro),
      shopIntro: pickStableText(base.shopIntro || base.intro || base.description, next.shopIntro || next.intro || next.description),
      courses: mergedCourses,
      price: mergedPrice,
      coursePricing: mergedCoursePricing,
      pricing: mergedCoursePricing,
      priceTable: mergedCoursePricing,
      courseSections: mergedCoursePricing,
      status: next.status || base.status || "active",
      directPaymentEnabled,
      __directPaymentUpdated:
        next.__directPaymentUpdated === true ||
        base.__directPaymentUpdated === true ||
        hasDirectPaymentField(next) ||
        hasDirectPaymentField(base),
      __replaceImages: replaceImages,
      __imageReplaceLocked: next.__imageReplaceLocked === true || base.__imageReplaceLocked === true,
      premium,
      premiumType: premium,
      isPremium: premium !== "normal",
      premiumActive: premium !== "normal",
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
    });
  };

  const getShopImageBankAliasKeys = (shop) => {
    if (!shop || typeof shop !== "object") {
      return [];
    }

    const id = String(shop._id || shop.id || shop.shopId || "").trim();
    const name = normalizeText(shop.name);
    const address = normalizeText(shop.address || shop.roadAddress || shop.fullAddress);
    const nameAddressKey = name && address ? `${name}::${address}` : "";

    return Array.from(new Set([id, nameAddressKey].filter(Boolean)));
  };

  const getShopImageBankKeys = (shop) => {
    if (!shop || typeof shop !== "object") {
      return [];
    }

    const id = String(shop._id || shop.id || shop.shopId || "").trim();

    if (id) {
      return [id];
    }

    const name = normalizeText(shop.name);
    const address = normalizeText(shop.address || shop.roadAddress || shop.fullAddress);
    const nameAddressKey = name && address ? `${name}::${address}` : "";

    return nameAddressKey ? [nameAddressKey] : [];
  };

  const getShopPremiumBankKeys = (shop) => {
    if (!shop || typeof shop !== "object") {
      return [];
    }

    const id = String(shop._id || shop.id || shop.shopId || "").trim();
    const name = normalizeText(shop.name || shop.shopName || shop.title);
    const address = normalizeText(
      shop.address || shop.roadAddress || shop.fullAddress || shop.locationText
    );
    const phone = normalizeText(
      shop.phone || shop.tel || shop.virtualPhone || shop.fakePhone || shop.callNumber
    );
    const rawNameAddressKey = name && address ? `${name}::${address}` : "";
    const dashedNameAddressKey = name && address ? `name-address:${name}:${address}` : "";

    return Array.from(
      new Set([
        ...getShopImageBankKeys(shop),
        ...getShopImageBankAliasKeys(shop),
        ...getShopIdentityValues(shop),
        id,
        id ? `id:${id}` : "",
        name ? `name:${name}` : "",
        rawNameAddressKey,
        dashedNameAddressKey,
        phone ? `phone:${phone}` : "",
      ].map((key) => String(key || "").trim()).filter(Boolean))
    );
  };

  const readShopPremiumBank = () => {
    return {};
  };

  const writeShopPremiumBank = (items) => {
    return Array.isArray(items) ? items : [];
  };

  const removeShopPremiumBank = (shopOrId) => {
    return shopOrId;
  };

  const hasExplicitPremiumValue = (shop) => {
    if (!shop || typeof shop !== "object") {
      return false;
    }

    return hasPremiumField(shop);
  };

  const normalizeShopPremiumFields = (shop) => {
    if (!shop || typeof shop !== "object") {
      return shop;
    }

    const premiumType = normalizePremiumType(shop);
    const premiumBoolean = premiumType !== "normal";

    return {
      ...shop,
      premium: premiumBoolean,
      premiumType,
      premiumLevel: premiumType,
      membershipType: premiumType,
      listingType: premiumType,
      shopGrade: premiumType,
      imageGrade: premiumType,
      photoGrade: premiumType,
      isPremium: premiumBoolean,
      premiumActive: premiumBoolean,
    };
  };

  const applyShopPremiumBank = (shop) => {
    if (!shop || typeof shop !== "object") {
      return shop;
    }

    if (hasExplicitPremiumValue(shop)) {
      return normalizeShopPremiumFields(shop);
    }

    return shop;
  };

  const readShopImageBank = () => {
    try {
      const localSaved = JSON.parse(localStorage.getItem(LOCAL_SHOP_IMAGE_BANK_KEY) || "{}");
      const sessionSaved = JSON.parse(sessionStorage.getItem(LOCAL_SHOP_IMAGE_BANK_KEY) || "{}");

      const mergedBank = {
        ...(localSaved && typeof localSaved === "object" && !Array.isArray(localSaved) ? localSaved : {}),
        ...(sessionSaved && typeof sessionSaved === "object" && !Array.isArray(sessionSaved) ? sessionSaved : {}),
      };

      return Object.fromEntries(
        Object.entries(mergedBank)
          .map(([key, value]) => [
            key,
            Array.isArray(value)
              ? value
                  .map((image) => normalizeImageSrc(image))
                  .filter(Boolean)
                  .slice(0, currentShopImageLimit)
              : [],
          ])
      );
    } catch (e) {
      return {};
    }
  };

  const removeShopImageBank = (shopOrId) => {
    try {
      const currentBank = readShopImageBank();
      const target =
        shopOrId && typeof shopOrId === "object"
          ? shopOrId
          : {
              _id: shopOrId,
              id: shopOrId,
            };
      const keys = Array.from(
        new Set([
          ...getShopImageBankAliasKeys(target),
          ...getShopImageBankKeys(target),
          ...getShopIdentityValues(target),
        ].map((key) => String(key || "").trim()).filter(Boolean))
      );

      if (!keys.length) {
        return;
      }

      const nextBank = { ...currentBank };

      keys.forEach((key) => {
        delete nextBank[key];
      });

      const storageText = JSON.stringify(nextBank);

      writeStorageSafe(LOCAL_SHOP_IMAGE_BANK_KEY, storageText, localStorage);
      writeStorageSafe(LOCAL_SHOP_IMAGE_BANK_KEY, storageText, sessionStorage);
    } catch (e) {
      console.warn("SHOP IMAGE BANK REMOVE SKIP:", e.message);
    }
  };

  const writeShopImageBank = (items, options = {}) => {
    try {
      const currentBank = readShopImageBank();
      const replace =
        options?.replace === true ||
        (Array.isArray(items) ? items : []).some((item) => item?.__replaceImages === true);
      const nextBank = { ...currentBank };

      (Array.isArray(items) ? items : []).forEach((item) => {
        const normalized = item && typeof item === "object" ? item : null;

        if (!normalized) {
          return;
        }

        const keys = replace
          ? Array.from(
              new Set([
                ...getShopImageBankKeys(normalized),
                ...getShopImageBankAliasKeys(normalized),
                ...getShopIdentityValues(normalized),
              ].map((key) => String(key || "").trim()).filter(Boolean))
            )
          : getShopImageBankKeys(normalized);

        const images = makeUniqueImageList(makeSafeImages(normalized));

        if (!keys.length) {
          return;
        }

        if (replace) {
          keys.forEach((key) => {
            delete nextBank[key];
          });

          Object.keys(nextBank).forEach((key) => {
            if (keys.includes(key)) {
              delete nextBank[key];
            }
          });
        }

        keys.forEach((key) => {
          const currentImages = Array.isArray(nextBank[key]) ? nextBank[key] : [];
          const fixedImages = replace
            ? makeUniqueImageList(images)
            : images.length
            ? makeUniqueImageList(images)
            : makeUniqueImageList(currentImages);

          nextBank[key] = fixedImages;
        });
      });

      const storageText = JSON.stringify(nextBank);

      const localOk = writeStorageSafe(LOCAL_SHOP_IMAGE_BANK_KEY, storageText, localStorage);
      const sessionOk = writeStorageSafe(LOCAL_SHOP_IMAGE_BANK_KEY, storageText, sessionStorage);

      if (!localOk || !sessionOk) {
        const fallbackBank = { ...currentBank };

        Object.keys(nextBank).forEach((key) => {
          const nextImages = Array.isArray(nextBank[key]) ? nextBank[key] : [];
          const currentImages = Array.isArray(fallbackBank[key]) ? fallbackBank[key] : [];

          fallbackBank[key] = replace
            ? makeUniqueImageList(nextImages)
            : nextImages.length
            ? makeUniqueImageList(nextImages)
            : makeUniqueImageList(currentImages);
        });

        const fallbackText = JSON.stringify(fallbackBank);

        if (!localOk) {
          writeStorageSafe(LOCAL_SHOP_IMAGE_BANK_KEY, fallbackText, localStorage);
        }

        if (!sessionOk) {
          writeStorageSafe(LOCAL_SHOP_IMAGE_BANK_KEY, fallbackText, sessionStorage);
        }
      }
    } catch (e) {
      console.warn("SHOP IMAGE BANK SAVE SKIP:", e.message);
    }
  };

  const applyShopImageBank = (shop) => {
    if (!shop || typeof shop !== "object") {
      return shop;
    }

    const bank = readShopImageBank();
    const keys = Array.from(
      new Set([
        ...getShopImageBankKeys(shop),
        ...getShopImageBankAliasKeys(shop),
        ...getShopIdentityValues(shop),
      ].map((key) => String(key || "").trim()).filter(Boolean))
    );
    const hasBankRecord = keys.some((key) =>
      Object.prototype.hasOwnProperty.call(bank, key)
    );
    const bankImages = makeUniqueImageList(
      keys.flatMap((key) => (Array.isArray(bank[key]) ? bank[key] : []))
    );

    const currentImages = makeUniqueImageList(makeSafeImages(shop));

    const hasExplicitImageArray =
      Array.isArray(shop.images) ||
      Array.isArray(shop.photos) ||
      Array.isArray(shop.imageUrls) ||
      Array.isArray(shop.gallery) ||
      Array.isArray(shop.pictures) ||
      Array.isArray(shop.files);

    const hasReplaceImageMarker = shop.__replaceImages === true;
    const hasReplaceLockedMarker = shop.__imageReplaceLocked === true;

    const shouldUseBankImages =
      !hasReplaceLockedMarker &&
      hasBankRecord &&
      (
        !hasExplicitImageArray ||
        !currentImages.length ||
        bankImages.length > currentImages.length ||
        (hasReplaceImageMarker && !currentImages.length)
      );

    const fixedImages = shouldUseBankImages
      ? bankImages
      : currentImages;

    const representativeImage = normalizeImageSrc(
      shop.representativeImage ||
        shop.mainImage ||
        shop.thumbnail ||
        shop.coverImage ||
        fixedImages[0] ||
        ""
    );

    const nextRepresentativeImage =
      fixedImages.find((image) => image === representativeImage) ||
      fixedImages[0] ||
      representativeImage ||
      "";

    return {
      ...shop,
      images: fixedImages,
      photos: fixedImages,
      imageUrls: fixedImages,
      gallery: fixedImages,
      pictures: fixedImages,
      files: [],
      image: nextRepresentativeImage,
      imageUrl: nextRepresentativeImage,
      photo: nextRepresentativeImage,
      picture: nextRepresentativeImage,
      representativeImage: nextRepresentativeImage,
      mainImage: nextRepresentativeImage,
      thumbnail: nextRepresentativeImage,
      coverImage: nextRepresentativeImage,
    };
  };

  const applyFreshShopFromServer = (shop) => {
    if (!shop || typeof shop !== "object") {
      return shop;
    }

    const imageFixedShop =
      currentAdminCategory === "karaoke"
        ? shop
        : applyShopImageBank(shop);

    if (hasExplicitPremiumValue(imageFixedShop)) {
      return normalizeShopPremiumFields(imageFixedShop);
    }

    return imageFixedShop;
  };

  const readLocalShops = () => {
    try {
      const parseStorageItems = (storage, key) => {
        try {
          const value = JSON.parse(storage.getItem(key) || "[]");

          return Array.isArray(value) ? value : [];
        } catch (e) {
          return [];
        }
      };

      const legacyMassageItems =
        currentAdminCategory === "massage"
          ? [
              ...parseStorageItems(localStorage, "noma_admin_shop_backup"),
              ...parseStorageItems(sessionStorage, "noma_admin_shop_backup"),
              ...parseStorageItems(localStorage, "nora_admin_shop_backup"),
              ...parseStorageItems(sessionStorage, "nora_admin_shop_backup"),
              ...parseStorageItems(localStorage, "noma_admin_shops"),
              ...parseStorageItems(sessionStorage, "noma_admin_shops"),
              ...parseStorageItems(localStorage, "noma_local_shops"),
              ...parseStorageItems(sessionStorage, "noma_local_shops"),
              ...parseStorageItems(localStorage, "nora_admin_shops"),
              ...parseStorageItems(sessionStorage, "nora_admin_shops"),
              ...parseStorageItems(localStorage, "nora_local_shops"),
              ...parseStorageItems(sessionStorage, "nora_local_shops"),
            ]
          : [];

      return filterCurrentCategoryShops(
        filterDeletedShops(
          mergeShopList([
            ...parseStorageItems(localStorage, LOCAL_SHOP_BACKUP_KEY),
            ...parseStorageItems(sessionStorage, LOCAL_SHOP_BACKUP_KEY),
            ...parseStorageItems(localStorage, LOCAL_SHOP_KEY),
            ...parseStorageItems(localStorage, LOCAL_PUBLIC_SHOP_KEY),
            ...parseStorageItems(sessionStorage, LOCAL_SHOP_KEY),
            ...parseStorageItems(sessionStorage, LOCAL_PUBLIC_SHOP_KEY),
            ...parseStorageItems(localStorage, `nora_admin_shop_backup_${currentAdminCategory}`),
            ...parseStorageItems(sessionStorage, `nora_admin_shop_backup_${currentAdminCategory}`),
            ...parseStorageItems(localStorage, `nora_admin_shops_${currentAdminCategory}`),
            ...parseStorageItems(localStorage, `nora_local_shops_${currentAdminCategory}`),
            ...parseStorageItems(sessionStorage, `nora_admin_shops_${currentAdminCategory}`),
            ...parseStorageItems(sessionStorage, `nora_local_shops_${currentAdminCategory}`),
            ...legacyMassageItems,
          ]).map((item) => applyShopPremiumBank(applyShopImageBank(item)))
        )
      );
    } catch (e) {
      return [];
    }
  };

  const makeStorageShop = (shop) => {
    const normalized = normalizeShopForList(shop);

    if (!normalized) {
      return null;
    }

    const images = getStorageSafeImages(normalized);
    const representativeImage =
      images.includes(normalized.representativeImage)
        ? normalized.representativeImage
        : images[0] || "";

    return {
      ...normalized,
      __replaceImages: normalized.__replaceImages === true,
      __imageReplaceLocked: normalized.__imageReplaceLocked === true,
      __directPaymentUpdated: normalized.__directPaymentUpdated === true,
      directPaymentEnabled: normalizeDirectPaymentEnabled(normalized.directPaymentEnabled),
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
      coursePricing: filterCompleteCoursePricing(makeSafeCoursePricing(normalized)),
      pricing: filterCompleteCoursePricing(makeSafeCoursePricing(normalized)),
      priceTable: filterCompleteCoursePricing(makeSafeCoursePricing(normalized)),
      courseSections: filterCompleteCoursePricing(makeSafeCoursePricing(normalized)),
    };
  };

  const makeBackupShop = (shop) => {
    const normalized = normalizeShopForList(shop);

    if (!normalized) {
      return null;
    }

    const coursePricing = filterCompleteCoursePricing(makeSafeCoursePricing(normalized));
    const images = getStorageSafeImages(normalized);
    const representativeImage =
      images.includes(normalized.representativeImage)
        ? normalized.representativeImage
        : images[0] || "";

    return {
      ...normalized,
      __replaceImages: normalized.__replaceImages === true,
      __imageReplaceLocked: normalized.__imageReplaceLocked === true,
      __directPaymentUpdated: normalized.__directPaymentUpdated === true,
      directPaymentEnabled: normalizeDirectPaymentEnabled(normalized.directPaymentEnabled),
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
      coursePricing,
      pricing: coursePricing,
      priceTable: coursePricing,
      courseSections: coursePricing,
    };
  };

  const readBackupShops = () => {
    try {
      const parseStorageItems = (storage, key) => {
        try {
          const value = JSON.parse(storage.getItem(key) || "[]");

          return Array.isArray(value) ? value : [];
        } catch (e) {
          return [];
        }
      };

      const legacyMassageBackupItems =
        currentAdminCategory === "massage"
          ? [
              ...parseStorageItems(localStorage, "noma_admin_shop_backup"),
              ...parseStorageItems(sessionStorage, "noma_admin_shop_backup"),
              ...parseStorageItems(localStorage, "nora_admin_shop_backup"),
              ...parseStorageItems(sessionStorage, "nora_admin_shop_backup"),
            ]
          : [];

      return filterCurrentCategoryShops(
        filterDeletedShops(
          mergeShopList([
            ...parseStorageItems(localStorage, LOCAL_SHOP_BACKUP_KEY),
            ...parseStorageItems(sessionStorage, LOCAL_SHOP_BACKUP_KEY),
            ...parseStorageItems(localStorage, `nora_admin_shop_backup_${currentAdminCategory}`),
            ...parseStorageItems(sessionStorage, `nora_admin_shop_backup_${currentAdminCategory}`),
            ...legacyMassageBackupItems,
          ]).map((item) => applyShopPremiumBank(applyShopImageBank(item)))
        )
      );
    } catch (e) {
      return [];
    }
  };

  const saveBackupShops = (items) => {
    try {
      const backupItems = filterCurrentCategoryShops(filterDeletedShops(mergeShopList(items)))
        .map((item) => makeBackupShop(item))
        .filter(Boolean);

      const storageText = JSON.stringify(backupItems);

      writeStorageSafe(LOCAL_SHOP_BACKUP_KEY, storageText, localStorage);
      writeStorageSafe(LOCAL_SHOP_BACKUP_KEY, storageText, sessionStorage);

      return backupItems;
    } catch (e) {
      console.warn("SHOP BACKUP SAVE SKIP:", e.message);
      return [];
    }
  };

  const writeStorageSafe = (key, value, storage) => {
    try {
      storage.setItem(key, value);

      const mirrorKeys = [];

      if (key === LOCAL_SHOP_KEY) {
        mirrorKeys.push(
          `nora_admin_shops_${currentAdminCategory}`,
          `noma_admin_shops_${currentAdminCategory}`
        );
      }

      if (key === LOCAL_PUBLIC_SHOP_KEY) {
        mirrorKeys.push(
          `nora_local_shops_${currentAdminCategory}`,
          `noma_local_shops_${currentAdminCategory}`
        );
      }

      if (key === LOCAL_SHOP_BACKUP_KEY) {
        mirrorKeys.push(
          `nora_admin_shop_backup_${currentAdminCategory}`,
          `noma_admin_shop_backup_${currentAdminCategory}`
        );
      }

      if (key === LOCAL_SHOP_IMAGE_BANK_KEY) {
        // 이미지 bank는 중복 mirror 저장을 하지 않습니다.
      }

      if (
        key === LOCAL_SHOP_PREMIUM_BANK_KEY ||
        key === NORA_LOCAL_SHOP_PREMIUM_BANK_KEY ||
        key === LEGACY_LOCAL_SHOP_PREMIUM_BANK_KEY ||
        key === LEGACY_NORA_SHOP_PREMIUM_BANK_KEY
      ) {
        mirrorKeys.push(
          `nora_admin_shop_premium_bank_${currentAdminCategory}`,
          `noma_admin_shop_premium_bank_${currentAdminCategory}`,
          "nora_admin_shop_premium_bank",
          "noma_admin_shop_premium_bank"
        );
      }

      if (key === DELETED_SHOP_KEY) {
        mirrorKeys.push(
          `nora_deleted_shop_ids_${currentAdminCategory}`,
          `noma_deleted_shop_ids_${currentAdminCategory}`
        );
      }

      Array.from(new Set(mirrorKeys))
        .filter((mirrorKey) => mirrorKey && mirrorKey !== key)
        .forEach((mirrorKey) => {
          if (shouldSkipMirrorStorage(value)) {
            return;
          }

          try {
            storage.setItem(mirrorKey, value);
          } catch (e) {
            if (!isStorageQuotaError(e)) {
              console.warn("SHOP MIRROR STORAGE SAVE SKIP:", mirrorKey, e.message);
            }
          }
        });

      return true;
    } catch (e) {
      return false;
    }
  };

  const sanitizeImageStorageValue = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => sanitizeImageStorageValue(item))
        .filter((item) => item !== "" && item !== null && item !== undefined);
    }

    if (value && typeof value === "object") {
      const nextValue = { ...value };
      const imageKeys = [
        "images",
        "photos",
        "imageUrls",
        "gallery",
        "pictures",
        "files",
      ];
      const scalarImageKeys = [
        "image",
        "imageUrl",
        "photo",
        "picture",
        "representativeImage",
        "mainImage",
        "thumbnail",
        "coverImage",
      ];

      imageKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(nextValue, key)) {
          nextValue[key] = makeSafeArray(nextValue[key])
            .map((image) => normalizeImageSrc(image))
            .filter(Boolean)
            .slice(0, currentShopImageLimit);
        }
      });

      scalarImageKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(nextValue, key)) {
          nextValue[key] = normalizeImageSrc(nextValue[key]);
        }
      });

      return nextValue;
    }

    if (typeof value === "string") {
      return normalizeImageSrc(value);
    }

    return value;
  };

  const purgeUnsafeImageStorage = () => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const unsafePattern = /(data:image\/|blob:|\/9j\/|iVBOR|R0lGOD|UklGR)/;
      const storages = [window.localStorage, window.sessionStorage].filter(Boolean);

      storages.forEach((storage) => {
        Object.keys(storage)
          .filter((key) =>
            key.includes("shop") ||
            key.includes("image") ||
            key.includes("backup") ||
            key.includes("karaoke")
          )
          .forEach((key) => {
            try {
              const raw = storage.getItem(key) || "";

              if (!raw || !unsafePattern.test(raw)) {
                return;
              }

              const parsed = JSON.parse(raw);
              const sanitized = sanitizeImageStorageValue(parsed);
              const text = JSON.stringify(sanitized);

              if (text.length > MAX_MIRROR_STORAGE_LENGTH && key.includes("image_bank")) {
                storage.removeItem(key);
                return;
              }

              storage.setItem(key, text);
            } catch (e) {
              if (key.includes("image_bank")) {
                try {
                  storage.removeItem(key);
                } catch (removeError) {
                  return;
                }
              }
            }
          });
      });
    } catch (e) {
      console.warn("SHOP UNSAFE IMAGE STORAGE PURGE SKIP:", e.message);
    }
  };

  const dispatchShopStorageEvent = (shops) => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const safeShops = Array.isArray(shops) ? shops : [];
      const eventKey = [
        currentAdminCategory,
        safeShops.length,
        safeShops
          .slice(0, 50)
          .map((shop) =>
            [
              String(shop?._id || shop?.id || shop?.shopId || shop?.name || ""),
              normalizePremiumType(shop),
              String(shop?.premiumType || ""),
              String(shop?.premium || ""),
              String(shop?.isPremium || ""),
              String(shop?.premiumActive || ""),
              String(shop?.directPaymentEnabled || ""),
              String(shop?.__directPaymentUpdated || ""),
              String(shop?.updatedAt || ""),
            ].join(":")
          )
          .join(","),
      ].join("|");

      if (storageEventKeyRef.current === eventKey && storageEventTimerRef.current) {
        return;
      }

      storageEventKeyRef.current = eventKey;

      if (storageEventTimerRef.current) {
        window.clearTimeout(storageEventTimerRef.current);
      }

      storageEventTimerRef.current = window.setTimeout(() => {
        try {
          storageEventTimerRef.current = null;

          window.dispatchEvent(
            new CustomEvent("shops-updated", {
              detail: {
                shops: safeShops,
                category: currentAdminCategory,
                shopCategory: currentAdminCategory,
                serviceType: currentAdminCategory,
                businessType: currentAdminCategory,
                adminCategory: currentAdminCategory,
                storageKeys: {
                  admin: LOCAL_SHOP_KEY,
                  public: LOCAL_PUBLIC_SHOP_KEY,
                  backup: LOCAL_SHOP_BACKUP_KEY,
                  imageBank: LOCAL_SHOP_IMAGE_BANK_KEY,
                  premiumBank: LOCAL_SHOP_PREMIUM_BANK_KEY,
                  noraPremiumBank: NORA_LOCAL_SHOP_PREMIUM_BANK_KEY,
                  legacyPremiumBank: LEGACY_LOCAL_SHOP_PREMIUM_BANK_KEY,
                  legacyNoraPremiumBank: LEGACY_NORA_SHOP_PREMIUM_BANK_KEY,
                  deleted: DELETED_SHOP_KEY,
                },
              },
            })
          );

          window.dispatchEvent(
            new CustomEvent("karaoke-shops-updated", {
              detail: {
                shops: safeShops,
                category: currentAdminCategory,
                shopCategory: currentAdminCategory,
                serviceType: currentAdminCategory,
                businessType: currentAdminCategory,
                adminCategory: currentAdminCategory,
                storageKeys: {
                  admin: LOCAL_SHOP_KEY,
                  public: LOCAL_PUBLIC_SHOP_KEY,
                  backup: LOCAL_SHOP_BACKUP_KEY,
                  imageBank: LOCAL_SHOP_IMAGE_BANK_KEY,
                  premiumBank: LOCAL_SHOP_PREMIUM_BANK_KEY,
                  noraPremiumBank: NORA_LOCAL_SHOP_PREMIUM_BANK_KEY,
                  legacyPremiumBank: LEGACY_LOCAL_SHOP_PREMIUM_BANK_KEY,
                  legacyNoraPremiumBank: LEGACY_NORA_SHOP_PREMIUM_BANK_KEY,
                  deleted: DELETED_SHOP_KEY,
                },
              },
            })
          );
        } catch (e) {
          console.warn("SHOP STORAGE EVENT SKIP:", e.message);
        }
      }, 200);
    } catch (e) {
      console.warn("SHOP STORAGE EVENT TIMER SKIP:", e.message);
    }
  };

  const saveLocalShops = (items) => {
    try {
      const replaceImageItems = (Array.isArray(items) ? items : []).filter((item) => item?.__replaceImages === true);
      const normalizedItems = filterCurrentCategoryShops(filterDeletedShops(mergeShopList(items)))
        .map((item) => {
          const matchedReplaceItem = replaceImageItems.find((replaceItem) => {
            const itemId = String(item?._id || item?.id || item?.shopId || "");
            const replaceId = String(replaceItem?._id || replaceItem?.id || replaceItem?.shopId || "");
            const itemNameAddressKey = `${normalizeText(item?.name)}::${normalizeText(item?.address || item?.roadAddress || item?.fullAddress)}`;
            const replaceNameAddressKey = `${normalizeText(replaceItem?.name)}::${normalizeText(replaceItem?.address || replaceItem?.roadAddress || replaceItem?.fullAddress)}`;

            return (
              (itemId && replaceId && itemId === replaceId) ||
              (itemNameAddressKey && replaceNameAddressKey && itemNameAddressKey === replaceNameAddressKey)
            );
          });

          return makeStorageShop(matchedReplaceItem || item);
        })
        .filter(Boolean);

      if (replaceImageItems.length > 0) {
        const replaceStorageItems = normalizedItems.filter((item) => {
          return replaceImageItems.some((replaceItem) => {
            const itemId = String(item?._id || item?.id || item?.shopId || "");
            const replaceId = String(replaceItem?._id || replaceItem?.id || replaceItem?.shopId || "");
            const itemNameAddressKey = `${normalizeText(item?.name)}::${normalizeText(item?.address || item?.roadAddress || item?.fullAddress)}`;
            const replaceNameAddressKey = `${normalizeText(replaceItem?.name)}::${normalizeText(replaceItem?.address || replaceItem?.roadAddress || replaceItem?.fullAddress)}`;

            return (
              (itemId && replaceId && itemId === replaceId) ||
              (itemNameAddressKey && replaceNameAddressKey && itemNameAddressKey === replaceNameAddressKey)
            );
          });
        });
        const keepStorageItems = normalizedItems.filter((item) => !replaceStorageItems.includes(item));

        writeShopImageBank(replaceStorageItems, { replace: true });
        writeShopImageBank(keepStorageItems, { replace: false });
      } else {
        writeShopImageBank(normalizedItems, { replace: false });
      }
      saveBackupShops(normalizedItems);

      let storageText = JSON.stringify(normalizedItems);

      const localOk1 = writeStorageSafe(LOCAL_SHOP_KEY, storageText, localStorage);
      const localOk2 = writeStorageSafe(LOCAL_PUBLIC_SHOP_KEY, storageText, localStorage);
      const sessionOk1 = writeStorageSafe(LOCAL_SHOP_KEY, storageText, sessionStorage);
      const sessionOk2 = writeStorageSafe(LOCAL_PUBLIC_SHOP_KEY, storageText, sessionStorage);

      if (currentAdminCategory === "karaoke") {
        writeStorageSafe("noma_admin_karaoke_shops", storageText, localStorage);
        writeStorageSafe("noma_public_karaoke_shops", storageText, localStorage);
        writeStorageSafe("noma_admin_karaoke_shops", storageText, sessionStorage);
        writeStorageSafe("noma_public_karaoke_shops", storageText, sessionStorage);
      }

      if (!localOk1 || !localOk2) {
        if (sessionOk1 && sessionOk2) {
          dispatchShopStorageEvent(normalizedItems);
          return;
        }
        const compactItems = normalizedItems.map((item) => {
          const images = getStorageSafeImages(item);
          const representativeImage = images[0] || "";

          return {
            ...item,
            __replaceImages: item.__replaceImages === true,
            __imageReplaceLocked: item.__imageReplaceLocked === true,
            __directPaymentUpdated: item.__directPaymentUpdated === true,
            directPaymentEnabled: normalizeDirectPaymentEnabled(item.directPaymentEnabled),
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
            coursePricing: filterCompleteCoursePricing(makeSafeCoursePricing(item)),
            pricing: filterCompleteCoursePricing(makeSafeCoursePricing(item)),
            priceTable: filterCompleteCoursePricing(makeSafeCoursePricing(item)),
            courseSections: filterCompleteCoursePricing(makeSafeCoursePricing(item)),
          };
        });

        storageText = JSON.stringify(compactItems);

        try {
          localStorage.removeItem(LOCAL_SHOP_KEY);
          localStorage.removeItem(LOCAL_PUBLIC_SHOP_KEY);
          sessionStorage.removeItem(LOCAL_SHOP_KEY);
          sessionStorage.removeItem(LOCAL_PUBLIC_SHOP_KEY);
        } catch (e) {
          console.warn("SHOP STORAGE CLEAN SKIP:", e.message);
        }

        const retryOk1 = writeStorageSafe(LOCAL_SHOP_KEY, storageText, localStorage);
        const retryOk2 = writeStorageSafe(LOCAL_PUBLIC_SHOP_KEY, storageText, localStorage);
        const retrySessionOk1 = writeStorageSafe(LOCAL_SHOP_KEY, storageText, sessionStorage);
        const retrySessionOk2 = writeStorageSafe(LOCAL_PUBLIC_SHOP_KEY, storageText, sessionStorage);

        if (!retryOk1 || !retryOk2) {
          if (retrySessionOk1 && retrySessionOk2) {
            dispatchShopStorageEvent(compactItems);
            return;
          }
          const textOnlyItems = compactItems.map((item) => {
            const images = getStorageSafeImages(item);
            const representativeImage = normalizeImageSrc(item.representativeImage || item.mainImage || item.thumbnail || item.coverImage || images[0] || "");

            return {
              ...item,
              __directPaymentUpdated: item.__directPaymentUpdated === true,
              directPaymentEnabled: normalizeDirectPaymentEnabled(item.directPaymentEnabled),
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
              coursePricing: filterCompleteCoursePricing(makeSafeCoursePricing(item)),
              pricing: filterCompleteCoursePricing(makeSafeCoursePricing(item)),
              priceTable: filterCompleteCoursePricing(makeSafeCoursePricing(item)),
              courseSections: filterCompleteCoursePricing(makeSafeCoursePricing(item)),
            };
          });

          storageText = JSON.stringify(textOnlyItems);

          localStorage.removeItem(LOCAL_SHOP_KEY);
          localStorage.removeItem(LOCAL_PUBLIC_SHOP_KEY);
          sessionStorage.removeItem(LOCAL_SHOP_KEY);
          sessionStorage.removeItem(LOCAL_PUBLIC_SHOP_KEY);

          writeStorageSafe(LOCAL_SHOP_KEY, storageText, localStorage);
          writeStorageSafe(LOCAL_PUBLIC_SHOP_KEY, storageText, localStorage);
          writeStorageSafe(LOCAL_SHOP_KEY, storageText, sessionStorage);
          writeStorageSafe(LOCAL_PUBLIC_SHOP_KEY, storageText, sessionStorage);

          if (currentAdminCategory === "karaoke") {
            writeStorageSafe("noma_admin_karaoke_shops", storageText, localStorage);
            writeStorageSafe("noma_public_karaoke_shops", storageText, localStorage);
            writeStorageSafe("noma_admin_karaoke_shops", storageText, sessionStorage);
            writeStorageSafe("noma_public_karaoke_shops", storageText, sessionStorage);
          }
          saveBackupShops(textOnlyItems);

          dispatchShopStorageEvent(textOnlyItems);
          return;
        }

        dispatchShopStorageEvent(compactItems);
        return;
      }

      dispatchShopStorageEvent(normalizedItems);
    } catch (e) {
      console.warn("SHOP LOCAL SAVE ERROR:", e.message);
    }
  };

  const getDefaultMonthRange = () => {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    );

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  };

  const sumObjectValues = (value) => {
    if (!value || typeof value !== "object") {
      return 0;
    }

    return Object.values(value).reduce(
      (sum, item) => sum + Number(item || 0),
      0
    );
  };

  const extractShopItems = (res) => {
    if (!res) {
      return [];
    }

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.shops)) {
      return res.shops;
    }

    if (Array.isArray(res.items)) {
      return res.items;
    }

    if (Array.isArray(res.list)) {
      return res.list;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if (Array.isArray(res.data?.shops)) {
      return res.data.shops;
    }

    if (Array.isArray(res.data?.items)) {
      return res.data.items;
    }

    if (Array.isArray(res.data?.list)) {
      return res.data.list;
    }

    if (Array.isArray(res.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res.data?.data?.shops)) {
      return res.data.data.shops;
    }

    if (Array.isArray(res.data?.data?.items)) {
      return res.data.data.items;
    }

    if (res.shop && typeof res.shop === "object" && !Array.isArray(res.shop)) {
      return [res.shop];
    }

    if (res.item && typeof res.item === "object" && !Array.isArray(res.item)) {
      return [res.item];
    }

    if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
      return [res.data];
    }

    return [];
  };

  const getAdminAuthToken = () => {
    try {
      return (
        localStorage.getItem("adminToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("adminToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken") ||
        ""
      );
    } catch (e) {
      return "";
    }
  };

  const getApiBaseUrl = () => {
    try {
      const env = import.meta.env || {};
      const envBase =
        env.VITE_API_BASE_URL ||
        env.VITE_API_URL ||
        env.VITE_API_SERVER_URL ||
        "";

      if (envBase) {
        const base = String(envBase).replace(/\/+$/, "");

        return base.endsWith("/api") ? base : `${base}/api`;
      }

      if (
        typeof window !== "undefined" &&
        (
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
        )
      ) {
        return "http://localhost:10000/api";
      }

      return "https://api.nora365.co.kr/api";
    } catch (e) {
      return "https://api.nora365.co.kr/api";
    }
  };

  const getApiOrigin = () => {
    try {
      return getApiBaseUrl().replace(/\/api\/?$/, "");
    } catch (e) {
      return "https://api.nora365.co.kr";
    }
  };

  const extractUploadedImageUrls = (value) => {
    const result = [];

    const pushValue = (item) => {
      if (!item) {
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

        if (
          (text.startsWith("{") && text.endsWith("}")) ||
          (text.startsWith("[") && text.endsWith("]"))
        ) {
          try {
            pushValue(JSON.parse(text));
            return;
          } catch (e) {
            // JSON 문자열이 아니면 일반 URL 검사로 계속 진행
          }
        }

        const embeddedCandidates = text.match(
          /(?:https?:\/\/|\/\/|\/api\/|\/uploads\/|\/upload\/|api\/uploads\/|api\/upload\/|uploads\/|upload\/|shops\/)[^\s"'`<>),]+/gi
        ) || [];

        embeddedCandidates
          .map((candidate) => normalizeImageSrc(cleanImageUrlCandidate(candidate)))
          .filter((candidate) => candidate && isServerImageUrl(candidate))
          .forEach((candidate) => result.push(candidate));

        const image = normalizeImageSrc(cleanImageUrlCandidate(text));

        if (image && isServerImageUrl(image)) {
          result.push(image);
        }

        return;
      }

      if (typeof item === "object") {
        [
          item.url,
          item.src,
          item.path,
          item.location,
          item.href,
          item.link,
          item.image,
          item.imageUrl,
          item.imageURL,
          item.fileUrl,
          item.fileURL,
          item.publicUrl,
          item.publicURL,
          item.cdnUrl,
          item.cdnURL,
          item.secure_url,
          item.secureUrl,
          item.uploadedUrl,
          item.uploadedURL,
          item.uploadUrl,
          item.uploadURL,
          item.thumbnail,
          item.thumbnailUrl,
          item.thumbnailURL,
          item.mainImage,
          item.representativeImage,
          item.coverImage,
          item.photo,
          item.picture,
          item.data,
          item.payload,
          item.body,
          item.response,
          item.file,
          item.files,
          item.images,
          item.imageUrls,
          item.imageURLs,
          item.urls,
          item.result,
          item.results,
          item.asset,
          item.assets,
          item.media,
          item.medias,
          item.object,
          item.objects,
          item.resource,
          item.resources,
        ].forEach((child) => pushValue(child));

        const fileName =
          item.filename ||
          item.fileName ||
          item.originalname ||
          item.originalName ||
          item.key ||
          item.Key ||
          item.name ||
          "";

        const directory =
          item.destination ||
          item.dest ||
          item.folder ||
          item.dir ||
          item.directory ||
          item.uploadDir ||
          item.basePath ||
          item.pathPrefix ||
          "";

        if (fileName && hasImageFileExtension(fileName)) {
          if (directory) {
            pushValue(`${String(directory).replace(/\/+$/, "")}/${fileName}`);
          }

          pushValue(`/uploads/${fileName}`);
        }
      }
    };

    pushValue(value);

    return Array.from(
      new Set(
        result
          .map((image) => normalizeImageSrc(image))
          .filter((image) => isServerImageUrl(image))
      )
    ).slice(0, currentShopImageLimit);
  };

  const uploadShopImageFileDirect = async (file, uploadParams = {}) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      return [];
    }

    if (typeof fetch !== "function" || typeof FormData === "undefined") {
      return [];
    }

    const token = getAdminAuthToken();
    const formData = new FormData();

    formData.append("image", file, file.name || "shop-image.jpg");

    Object.entries(uploadParams || {}).forEach(([key, itemValue]) => {
      if (itemValue !== undefined && itemValue !== null) {
        formData.append(key, String(itemValue));
      }
    });

    try {
      const response = await fetch(`${getApiBaseUrl()}/shops/upload`, {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        body: formData,
      });

      const headerUrls = [
        response.headers.get("location"),
        response.headers.get("x-image-url"),
        response.headers.get("x-file-url"),
        response.headers.get("x-upload-url"),
      ].filter(Boolean);

      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      const responseData = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      const urls = extractUploadedImageUrls([
        ...headerUrls,
        responseData,
      ]);

      if (response.ok && urls.length) {
        return urls;
      }

      if (!response.ok) {
        throw new Error(
          typeof responseData === "string"
            ? responseData || `UPLOAD_HTTP_${response.status}`
            : responseData?.message || responseData?.msg || responseData?.error || `UPLOAD_HTTP_${response.status}`
        );
      }

      throw new Error("서버 업로드 응답에서 이미지 URL을 찾지 못했습니다.");
    } catch (e) {
      console.warn("SHOP DIRECT IMAGE UPLOAD SKIP:", e.message || e);
      return [];
    }
  };

  const uploadShopImageFile = async (file) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      return [];
    }

    const uploadParams = {
      category: currentAdminCategory,
      shopCategory: currentAdminCategory,
      serviceType: currentAdminCategory,
      businessType: currentAdminCategory,
      adminCategory: currentAdminCategory,
      admin: "true",
      adminMode: "true",
      management: "true",
    };

    const uploadFunctionCandidates = [
      shopApi?.uploadImage,
      shopApi?.uploadShopImage,
      shopApi?.uploadImages,
      shopApi?.uploadShopImages,
    ].filter((fn) => typeof fn === "function");

    const uploadFunctions = Array.from(new Set(uploadFunctionCandidates));

    if (!uploadFunctions.length) {
      const directUrls = await uploadShopImageFileDirect(file, uploadParams);

      if (directUrls.length) {
        return directUrls;
      }

      throw new Error("이미지 업로드 API 함수가 확인되지 않았습니다. /client/src/services/shop.api.js 확인 필요");
    }

    let lastError = null;

    for (const uploadFunction of uploadFunctions) {
      try {
        const data = await uploadFunction.call(shopApi, file, uploadParams);
        const urls = extractUploadedImageUrls(data);

        if (urls.length) {
          return urls;
        }

        lastError = new Error("서버 업로드 응답에서 이미지 URL을 찾지 못했습니다.");
      } catch (e) {
        lastError = e;

        const message = String(e?.message || "").toLowerCase();

        if (
          message.includes("too many requests") ||
          message.includes("429") ||
          message.includes("rate limit")
        ) {
          break;
        }
      }
    }

    throw lastError || new Error("이미지 업로드 실패");
  };


  const updateShopDirect = async (id, payload, params = {}) => {
    const shopId = String(id || "").trim();

    if (!shopId) {
      throw new Error("수정 대상 없음");
    }

    const query = new URLSearchParams({
      ...(params || {}),
      category: currentAdminCategory,
      shopCategory: currentAdminCategory,
      serviceType: currentAdminCategory,
      businessType: currentAdminCategory,
      adminCategory: currentAdminCategory,
      admin: "true",
      adminMode: "true",
      adminList: "true",
      forAdmin: "true",
      fromAdmin: "true",
      management: "true",
    }).toString();

    const token = getAdminAuthToken();
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${getApiBaseUrl()}/shops/${encodeURIComponent(shopId)}${query ? `?${query}` : ""}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          ...payload,
          directPaymentEnabled: normalizeDirectPaymentEnabled(payload.directPaymentEnabled),
          __directPaymentUpdated: true,
        }),
      }
    );

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(
        typeof data === "string"
          ? data || `SHOP_UPDATE_HTTP_${response.status}`
          : data?.message || data?.msg || data?.error || `SHOP_UPDATE_HTTP_${response.status}`
      );
    }

    return data;
  };

  const extractDashboardShopItems = (res) => {
    if (!res) {
      return [];
    }

    if (Array.isArray(res)) {
      return res;
    }

    const normalized =
      res.data ||
      res ||
      {};

    const recent =
      normalized.recent ||
      normalized.data?.recent ||
      {};

    if (Array.isArray(recent.shops)) {
      return recent.shops;
    }

    if (Array.isArray(normalized.recentShops)) {
      return normalized.recentShops;
    }

    if (Array.isArray(normalized.shops)) {
      return normalized.shops;
    }

    if (Array.isArray(normalized.items)) {
      return normalized.items;
    }

    if (Array.isArray(normalized.list)) {
      return normalized.list;
    }

    if (Array.isArray(normalized.data?.shops)) {
      return normalized.data.shops;
    }

    if (Array.isArray(normalized.data?.items)) {
      return normalized.data.items;
    }

    if (Array.isArray(normalized.data?.list)) {
      return normalized.data.list;
    }

    return [];
  };

  const loadAdminDashboardShops = async () => {
    if (!isShopAdminRoute) {
      return [];
    }

    const cachedDashboard = dashboardCacheRef.current;
    const cacheAge = Date.now() - Number(dashboardCacheTimeRef.current || 0);
    const hasFreshCache =
      cachedDashboard?.category === currentAdminCategory &&
      Array.isArray(cachedDashboard.items) &&
      Number(dashboardCacheTimeRef.current || 0) > 0 &&
      cacheAge >= 0 &&
      cacheAge < DASHBOARD_SYNC_CACHE_TTL_MS;

    if (hasFreshCache) {
      return cachedDashboard.items;
    }

    if (dashboardRequestRef.current) {
      return dashboardRequestRef.current;
    }

    const requestPromise = (async () => {
      let timer = null;

      try {
        const params = new URLSearchParams({
          ...currentAdminCategoryParams,
          category: currentAdminCategory,
          shopCategory: currentAdminCategory,
          serviceType: currentAdminCategory,
          businessType: currentAdminCategory,
          adminCategory: currentAdminCategory,
        });

        const token = getAdminAuthToken();
        const controller = new AbortController();

        timer = window.setTimeout(() => {
          controller.abort();
        }, 250);

        const response = await fetch(
          `${getApiBaseUrl()}/admin/dashboard?${params.toString()}`,
          {
            method: "GET",
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {},
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          dashboardCacheRef.current = {
            category: currentAdminCategory,
            items: Array.isArray(cachedDashboard?.items) ? cachedDashboard.items : [],
          };
          dashboardCacheTimeRef.current = Date.now();

          return dashboardCacheRef.current.items;
        }

        const data = await response.json();

        const dashboardItems = getAdminVisibleShops(
          extractDashboardShopItems(data)
        ).map((item) => applyFreshShopFromServer(item));

        dashboardCacheRef.current = {
          category: currentAdminCategory,
          items: dashboardItems,
        };
        dashboardCacheTimeRef.current = Date.now();

        return dashboardItems;
      } catch (e) {
        const nextCachedDashboard = dashboardCacheRef.current;

        if (
          nextCachedDashboard?.category === currentAdminCategory &&
          Array.isArray(nextCachedDashboard.items)
        ) {
          dashboardCacheTimeRef.current = Date.now();
          return nextCachedDashboard.items;
        }

        console.warn("SHOP DASHBOARD SYNC SKIP:", e.message);
        return [];
      } finally {
        if (timer) {
          window.clearTimeout(timer);
        }

        dashboardRequestRef.current = null;
      }
    })();

    dashboardRequestRef.current = requestPromise;

    return requestPromise;
  };

  const normalizeShopForList = (shop) => {
    if (!shop || typeof shop !== "object") {
      return null;
    }

    const replaceImages = shop.__replaceImages === true;
    const explicitArrayImages =
      currentAdminCategory === "karaoke"
        ? makeSafeImages(shop)
        : makeUniqueImageList([
            shop?.images,
            shop?.photos,
            shop?.imageUrls,
            shop?.gallery,
            shop?.pictures,
            shop?.files,
          ].flatMap((source) => makeSafeArray(source)));

    const images = replaceImages
      ? explicitArrayImages
      : makeUniqueImageList(makeSafeImages(shop));

    const representativeCandidate = normalizeImageSrc(
      shop.representativeImage ||
        shop.mainImage ||
        shop.thumbnail ||
        shop.coverImage ||
        images[0] ||
        ""
    );

    const representativeImage =
      images.find((image) => image === representativeCandidate) ||
      images[0] ||
      representativeCandidate ||
      "";

    const fixedImages = images.length
      ? makeImageListWithRepresentative(images, representativeImage)
      : representativeImage
      ? makeUniqueImageList([representativeImage])
      : [];

    const id =
      shop._id ||
      shop.id ||
      shop.shopId ||
      `local-shop-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const premium = normalizePremiumType(shop);
    const coursePricing = filterCompleteCoursePricing(makeSafeCoursePricing(shop));
    const resolvedAddress = pickStableAddress(
      shop.address,
      shop.roadAddress,
      shop.fullAddress,
      shop.locationText
    );
    const coordinates = getShopCoordinates(shop);

    return {
      ...shop,
      _id: id,
      id,
      category:
        getShopCategory(shop) ||
        currentAdminCategory,
      shopCategory:
        getShopCategory(shop) ||
        currentAdminCategory,
      serviceType:
        getShopCategory(shop) ||
        currentAdminCategory,
      businessType:
        getShopCategory(shop) ||
        currentAdminCategory,
      adminCategory:
        getShopCategory(shop) ||
        currentAdminCategory,
      name: shop.name || "업체명 없음",
      address: resolvedAddress || "주소 없음",
      roadAddress: resolvedAddress || "주소 없음",
      fullAddress: resolvedAddress || "주소 없음",
      locationText: resolvedAddress || "",
      lat: coordinates.lat,
      lng: coordinates.lng,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      phone: shop.phone || shop.tel || "",
      businessHours: shop.businessHours || shop.openingHours || shop.hours || "",
      openingHours: shop.openingHours || shop.businessHours || shop.hours || "",
      hours: shop.hours || shop.businessHours || shop.openingHours || "",
      intro: shop.intro || shop.description || shop.shopIntro || "",
      description: shop.description || shop.intro || shop.shopIntro || "",
      shopIntro: shop.shopIntro || shop.intro || shop.description || "",
      courses: makeSafeCourses(shop),
      price: makeSafePrice(shop),
      coursePricing,
      pricing: coursePricing,
      priceTable: coursePricing,
      courseSections: coursePricing,
      menuPrices: coursePricing,
      menus: coursePricing,
      courseMenus: coursePricing,
      status: shop.status || "active",
      __replaceImages: shop.__replaceImages === true,
      __imageReplaceLocked: shop.__imageReplaceLocked === true,
      premium,
      premiumType: premium,
      premiumLevel: premium,
      membershipType: premium,
      listingType: premium,
      shopGrade: premium,
      imageGrade: premium,
      photoGrade: premium,
      isPremium: premium !== "normal",
      premiumActive: premium !== "normal",
      visible: shop.visible === false ? false : true,
      approved: shop.approved === false ? false : true,
      isReservable: shop.isReservable === false ? false : true,
      directPaymentEnabled: normalizeDirectPaymentEnabled(shop.directPaymentEnabled),
      __directPaymentUpdated:
        shop.__directPaymentUpdated === true ||
        hasDirectPaymentField(shop),
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
  };

  const mergeShopList = (items, extraShop) => {
    const map = new Map();

    const addToMap = (item) => {
      const normalizedItem = normalizeShopForList(item);

      if (!normalizedItem) {
        return;
      }

      if (isDeletedShop(normalizedItem)) {
        return;
      }

      if (!isCurrentCategoryShop(normalizedItem)) {
        return;
      }

      const idKey = String(normalizedItem._id || normalizedItem.id || "");
      const nameAddressKey = `${normalizeText(normalizedItem.name)}::${normalizeText(normalizedItem.address)}`;

      let existingKey = idKey;

      if (!map.has(existingKey)) {
        for (const [key, value] of map.entries()) {
          const currentNameAddressKey = `${normalizeText(value.name)}::${normalizeText(value.address)}`;

          if (
            nameAddressKey &&
            currentNameAddressKey &&
            nameAddressKey === currentNameAddressKey
          ) {
            existingKey = key;
            break;
          }
        }
      }

      if (!map.has(existingKey)) {
        for (const [key, value] of map.entries()) {
          const currentNameKey = normalizeText(value.name);
          const nextNameKey = normalizeText(normalizedItem.name);
          const currentId = String(value._id || value.id || "");
          const nextId = String(normalizedItem._id || normalizedItem.id || "");

          if (
            currentNameKey &&
            nextNameKey &&
            currentNameKey === nextNameKey &&
            (isLocalShopId(currentId) || isLocalShopId(nextId))
          ) {
            existingKey = key;
            break;
          }
        }
      }

      if (map.has(existingKey)) {
        map.set(existingKey, mergeShopRecord(map.get(existingKey), normalizedItem));
      } else {
        map.set(existingKey, normalizedItem);
      }
    };

    if (extraShop) {
      addToMap(extraShop);
    }

    (Array.isArray(items) ? items : []).forEach((item) => {
      addToMap(item);
    });

    return Array.from(map.values());
  };

  const compressImageFile = async (file) => {
    const uploadedUrls = await uploadShopImageFile(file);

    return uploadedUrls[0] || "";
  };

  const getShopStats = (shop) => {
    const shopId = String(shop?._id || shop?.id || "");

    return (
      stats.find(
        (item) =>
          String(
            item.shopId ||
              item._id ||
              item.id ||
              ""
          ) === shopId
      ) || {}
    );
  };

  const getDateRangeRows = (shop, shopStats) => {
    const range = getDefaultMonthRange();

    const startDate =
      statsStartDate || range.start;

    const endDate =
      statsEndDate || range.end;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return [];
    }

    const dailyCalls =
      shopStats.dailyCalls ||
      shop.dailyCalls ||
      {};

    const dailyClicks =
      shopStats.dailyClicks ||
      shop.dailyClicks ||
      {};

    const dailyConversions =
      shopStats.dailyConversions ||
      shop.dailyConversions ||
      {};

    const dailyReviews =
      shopStats.dailyReviews ||
      shop.dailyReviews ||
      {};

    const rows = [];
    const current = new Date(start);

    while (current <= end) {
      const key =
        current
          .toISOString()
          .slice(0, 10);

      rows.push({
        date: key,
        calls: Number(dailyCalls[key] || 0),
        clicks: Number(dailyClicks[key] || 0),
        conversions: Number(dailyConversions[key] || 0),
        reviews: Number(dailyReviews[key] || 0),
      });

      current.setDate(current.getDate() + 1);
    }

    return rows;
  };

  const loadStats = async () => {
    if (statsRunningRef.current) {
      return;
    }

    statsRunningRef.current = true;

    try {
      if (!isShopAdminRoute) {
        setStats([]);
        return;
      }

      if (typeof shopApi.getStats !== "function") {
        setStats([]);
        return;
      }

      const params = {
        category: currentAdminCategory,
        shopCategory: currentAdminCategory,
        serviceType: currentAdminCategory,
        businessType: currentAdminCategory,
        adminCategory: currentAdminCategory,
        admin: "true",
        adminMode: "true",
        adminList: "true",
        management: "true",
      };

      if (statsStartDate) {
        params.startDate = statsStartDate;
      }

      if (statsEndDate) {
        params.endDate = statsEndDate;
      }

      const res = await Promise.race([
        shopApi.getStats(params),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              items: [],
              list: [],
              shopStats: [],
            });
          }, 150);
        }),
      ]);

      const items =
        res?.shopStats ||
        res?.items ||
        res?.list ||
        [];

      setStats(Array.isArray(items) ? items : []);
    } catch (e) {
      setStats([]);
    } finally {
      statsRunningRef.current = false;
    }
  };

  const scheduleLoadStats = () => {
    try {
      if (statsRunningRef.current || statsTimerRef.current) {
        return;
      }

      statsTimerRef.current = window.setTimeout(() => {
        statsTimerRef.current = null;

        if (!statsRunningRef.current) {
          loadStats();
        }
      }, 500);
    } catch (e) {
      if (!statsRunningRef.current) {
        loadStats();
      }
    }
  };

  const getSubmitPayload = () => {
    const courseInput = String(form.courseInput || "").trim();
    const priceInput = String(form.priceInput || "").trim();

    const completeCoursePricing = filterCompleteCoursePricing(form.coursePricing);
    const pricingResult = flattenCoursePricing(completeCoursePricing);

    const nextCourses = courseInput
      ? [...pricingResult.courses, ...form.courses, courseInput]
      : [...pricingResult.courses, ...form.courses];

    const priceValue = Number(
      priceInput.replaceAll(",", "").replaceAll("원", "").trim()
    );

    const nextPrice =
      priceInput && !Number.isNaN(priceValue)
        ? [...pricingResult.price, ...form.price, priceValue]
        : [...pricingResult.price, ...form.price];

    const representativeImage =
      normalizeImageSrc(form.representativeImage || form.images[0] || "");

    const normalizedFormImages = makeUniqueImageList(form.images);

    const fixedImages = makeImageListWithRepresentative(
      normalizedFormImages,
      representativeImage
    )
      .filter((image) => isServerImageUrl(image))
      .slice(0, currentShopImageLimit);

    const premiumType = normalizePremiumType(form.premium);
    const premiumBoolean = premiumType !== "normal";
    const coursePricing = completeCoursePricing;
    const addressValue = normalizeAddressValue(form.address);

    return {
      category: currentAdminCategory,
      shopCategory: currentAdminCategory,
      serviceType: currentAdminCategory,
      businessType: currentAdminCategory,
      adminCategory: currentAdminCategory,
      name: form.name,
      address: addressValue,
      roadAddress: addressValue,
      fullAddress: addressValue,
      locationText: addressValue,
      lat: normalizeCoordinateValue(form.lat),
      lng: normalizeCoordinateValue(form.lng),
      latitude: normalizeCoordinateValue(form.latitude || form.lat),
      longitude: normalizeCoordinateValue(form.longitude || form.lng),
      phone: form.phone,
      businessHours: form.businessHours,
      openingHours: form.businessHours,
      hours: form.businessHours,
      intro: form.intro,
      description: form.description || form.intro || form.shopIntro,
      shopIntro: form.shopIntro || form.intro || form.description,
      courses: Array.from(new Set(nextCourses.filter(Boolean))),
      price: nextPrice,
      coursePricing,
      pricing: coursePricing,
      priceTable: coursePricing,
      courseSections: coursePricing,
      menuPrices: coursePricing,
      menus: coursePricing,
      courseMenus: coursePricing,
      status: form.status,
      premium: premiumBoolean,
      premiumType,
      premiumLevel: premiumType,
      membershipType: premiumType,
      listingType: premiumType,
      shopGrade: premiumType,
      imageGrade: premiumType,
      photoGrade: premiumType,
      isPremium: premiumBoolean,
      premiumActive: premiumBoolean,
      visible: true,
      approved: true,
      isReservable: true,
      directPaymentEnabled: normalizeDirectPaymentEnabled(form.directPaymentEnabled),
      __directPaymentUpdated: true,
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
  };

  const getStatusPayload = (shop, status) => {
    const images = makeUniqueImageList(makeSafeImages(shop));
    const representativeImage =
      normalizeImageSrc(
        shop?.representativeImage ||
          shop?.mainImage ||
          shop?.thumbnail ||
          shop?.coverImage ||
          images[0] ||
          ""
      );

    const normalizedImages = makeUniqueImageList(images);

    const fixedImages = makeImageListWithRepresentative(
      normalizedImages,
      representativeImage
    )
      .filter((image) => isServerImageUrl(image))
      .slice(0, currentShopImageLimit);

    const premiumType = normalizePremiumType(shop);
    const premiumBoolean = premiumType !== "normal";
    const coursePricing = filterCompleteCoursePricing(makeSafeCoursePricing(shop));

    return {
      ...shop,
      category: getShopCategory(shop) || currentAdminCategory,
      shopCategory: getShopCategory(shop) || currentAdminCategory,
      serviceType: getShopCategory(shop) || currentAdminCategory,
      businessType: getShopCategory(shop) || currentAdminCategory,
      adminCategory: getShopCategory(shop) || currentAdminCategory,
      status,
      directPaymentEnabled: normalizeDirectPaymentEnabled(shop?.directPaymentEnabled),
      __directPaymentUpdated: shop?.__directPaymentUpdated === true || hasDirectPaymentField(shop),
      premium: premiumBoolean,
      premiumType,
      premiumLevel: premiumType,
      membershipType: premiumType,
      listingType: premiumType,
      shopGrade: premiumType,
      imageGrade: premiumType,
      photoGrade: premiumType,
      isPremium: premiumBoolean,
      premiumActive: premiumBoolean,
      coursePricing,
      pricing: coursePricing,
      priceTable: coursePricing,
      courseSections: coursePricing,
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
  };

  const getFilteredList = () => {
    const safeKeyword = normalizeText(keyword);
    const safeRegion = region === "지역" ? "" : normalizeText(region);
    const safeDistrict = district === "구" ? "" : normalizeText(district);

    return getAdminVisibleShops(list).filter((shop) => {
      const name = normalizeText(shop?.name);
      const address = normalizeText(shop?.address);
      const phone = normalizeText(shop?.phone);
      const businessHours = normalizeText(shop?.businessHours);
      const shopRegion = normalizeText(shop?.region);
      const shopDistrict = normalizeText(shop?.district);
      const roadAddress = normalizeText(shop?.roadAddress);
      const fullAddress = normalizeText(shop?.fullAddress);
      const locationText = normalizeText(shop?.locationText);

      const searchTarget = `${name}${address}${phone}${businessHours}${shopRegion}${shopDistrict}${roadAddress}${fullAddress}${locationText}`;

      const keywordOk = !safeKeyword || searchTarget.includes(safeKeyword);

      const regionOk =
        !safeRegion ||
        shopRegion.includes(safeRegion) ||
        address.includes(safeRegion) ||
        roadAddress.includes(safeRegion) ||
        fullAddress.includes(safeRegion) ||
        locationText.includes(safeRegion) ||
        (!!safeDistrict && (address.includes(safeDistrict) || roadAddress.includes(safeDistrict) || fullAddress.includes(safeDistrict) || locationText.includes(safeDistrict) || shopDistrict.includes(safeDistrict)));

      const districtOk =
        !safeDistrict ||
        shopDistrict.includes(safeDistrict) ||
        address.includes(safeDistrict) ||
        roadAddress.includes(safeDistrict) ||
        fullAddress.includes(safeDistrict) ||
        locationText.includes(safeDistrict);

      return keywordOk && regionOk && districtOk;
    });
  };

  const getSavedImageReplacementItems = () => {
    try {
      return filterCurrentCategoryShops(
        filterDeletedShops([
          ...readBackupShops(),
          ...readLocalShops(),
        ])
      ).filter(
        (item) =>
          item?.__replaceImages === true ||
          item?.__imageReplaceLocked === true
      );
    } catch (e) {
      return [];
    }
  };

  const getShopRecordUpdatedTime = (shop) => {
    const time = Date.parse(
      String(
        shop?.updatedAt ||
          shop?.modifiedAt ||
          shop?.createdAt ||
          ""
      )
    );

    return Number.isFinite(time) ? time : 0;
  };

  const findSavedImageReplacementShop = (shop, savedItems = []) => {
    if (!shop || typeof shop !== "object") {
      return null;
    }

    const targetId = String(
      shop?._id ||
        shop?.id ||
        shop?.shopId ||
        ""
    ).trim();

    const targetNameAddressKey = `${normalizeText(
      shop?.name || shop?.title || shop?.shopName
    )}::${normalizeText(
      shop?.address ||
        shop?.roadAddress ||
        shop?.fullAddress ||
        shop?.locationText
    )}`;

    const matches = (Array.isArray(savedItems) ? savedItems : [])
      .filter((savedItem) => {
        if (
          !savedItem ||
          (
            savedItem?.__replaceImages !== true &&
            savedItem?.__imageReplaceLocked !== true
          )
        ) {
          return false;
        }

        const savedId = String(
          savedItem?._id ||
            savedItem?.id ||
            savedItem?.shopId ||
            ""
        ).trim();

        if (
          targetId &&
          savedId &&
          targetId === savedId
        ) {
          return true;
        }

        const savedNameAddressKey = `${normalizeText(
          savedItem?.name ||
            savedItem?.title ||
            savedItem?.shopName
        )}::${normalizeText(
          savedItem?.address ||
            savedItem?.roadAddress ||
            savedItem?.fullAddress ||
            savedItem?.locationText
        )}`;

        return (
          !!targetNameAddressKey &&
          targetNameAddressKey !== "::" &&
          !!savedNameAddressKey &&
          savedNameAddressKey !== "::" &&
          targetNameAddressKey === savedNameAddressKey
        );
      })
      .sort(
        (a, b) =>
          getShopRecordUpdatedTime(b) -
          getShopRecordUpdatedTime(a)
      );

    return matches[0] || null;
  };

  const applySavedImageReplacementToApiItem = (
    shop,
    savedItems = []
  ) => {
    const apiItem = normalizeShopForList(
      applyFreshShopFromServer(shop)
    );

    if (!apiItem) {
      return null;
    }

    if (currentAdminCategory === "karaoke") {
      return apiItem;
    }

    const savedItem = findSavedImageReplacementShop(
      apiItem,
      savedItems
    );

    if (!savedItem) {
      return apiItem;
    }

    const imageArrayKeys = [
      "images",
      "photos",
      "imageUrls",
      "gallery",
      "pictures",
      "files",
    ];

    const hasExplicitReplacementArray = imageArrayKeys.some(
      (key) => Array.isArray(savedItem?.[key])
    );

    const savedImages = hasExplicitReplacementArray
      ? makeUniqueImageList(
          imageArrayKeys.flatMap((key) =>
            makeSafeArray(savedItem?.[key])
          )
        )
      : makeUniqueImageList(makeSafeImages(savedItem));

    const savedRepresentativeImage = normalizeImageSrc(
      savedItem?.representativeImage ||
        savedItem?.mainImage ||
        savedItem?.thumbnail ||
        savedItem?.coverImage ||
        savedImages[0] ||
        ""
    );

    const representativeImage =
      savedImages.find(
        (image) => image === savedRepresentativeImage
      ) ||
      savedImages[0] ||
      "";

    return normalizeShopForList({
      ...apiItem,
      __replaceImages: true,
      __imageReplaceLocked: true,
      images: savedImages,
      photos: savedImages,
      imageUrls: savedImages,
      gallery: savedImages,
      pictures: savedImages,
      files: [],
      image: representativeImage,
      imageUrl: representativeImage,
      photo: representativeImage,
      picture: representativeImage,
      representativeImage,
      mainImage: representativeImage,
      thumbnail: representativeImage,
      coverImage: representativeImage,
    });
  };

  const load = async () => {
    if (loadRunningRef.current) {
      return;
    }

    loadRunningRef.current = true;

    try {
      if (!isShopAdminRoute) {
        setInitialized(true);
        setLoading(false);
        setError("");
        loadRunningRef.current = false;
        return;
      }

      setLoading(true);
      setError("");

      const res = await shopApi.getList(currentAdminCategoryParams);
      const savedImageReplacementItems = getSavedImageReplacementItems();

      const apiItems = getAdminVisibleShops(
        extractShopItems(res)
      )
        .map((item) =>
          applySavedImageReplacementToApiItem(
            item,
            savedImageReplacementItems
          )
        )
        .filter(Boolean);

      setList(apiItems);
      setInitialized(true);

      if (apiItems.length && !stats.length) {
        scheduleLoadStats();
      }
    } catch (e) {
      console.warn("SHOP LOAD ERROR:", e.message);
      setList([]);
      setError(e.message || "업체 목록 조회 실패");
      setInitialized(true);
    } finally {
      setLoading(false);
      loadRunningRef.current = false;
    }
  };

  useEffect(() => {
    const loadSyncKey = [
      currentPath,
      currentSearch,
      currentAdminCategory,
      isShopAdminRoute ? "shop-admin" : "not-shop-admin",
    ].join("|");

    if (!isShopAdminRoute) {
      loadSyncKeyRef.current = loadSyncKey;

      if (!initialized) {
        setInitialized(true);
      }

      setLoading(false);
      setError("");
      return;
    }

    if (loadSyncKeyRef.current === loadSyncKey && initialized) {
      return;
    }

    loadSyncKeyRef.current = loadSyncKey;
    load();
  }, [
    initialized,
    currentPath,
    currentSearch,
    currentAdminCategory,
    isShopAdminRoute,
  ]);

  const onChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onCoursePricingChange = (sectionIndex, period, rowIndex, field, value) => {
    setForm((prev) => {
      const nextCoursePricing = normalizeCoursePricing(prev.coursePricing).map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) {
          return section;
        }

        return {
          ...section,
          [period]: section[period].map((row, currentRowIndex) => {
            if (currentRowIndex !== rowIndex) {
              return row;
            }

            const nextRow = {
              ...row,
              [field]: field === "duration" ? value : toNumber(value),
            };

            return {
              ...nextRow,
              discountRate: getDiscountRate(nextRow.originalPrice, nextRow.salePrice),
            };
          }),
        };
      });

      return {
        ...prev,
        coursePricing: nextCoursePricing,
      };
    });
  };

  const onCourseSectionTitleChange = (sectionIndex, value) => {
    setForm((prev) => ({
      ...prev,
      coursePricing: normalizeCoursePricing(prev.coursePricing).map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? {
              ...section,
              title: value,
            }
          : section
      ),
    }));
  };

  const onCourseSectionTimeChange = (sectionIndex, field, value) => {
    setForm((prev) => ({
      ...prev,
      coursePricing: normalizeCoursePricing(prev.coursePricing).map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? {
              ...section,
              [field]: value,
            }
          : section
      ),
    }));
  };

  const onAddCoursePricingRow = (sectionIndex, period) => {
    setForm((prev) => ({
      ...prev,
      coursePricing: normalizeCoursePricing(prev.coursePricing).map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) {
          return section;
        }

        return {
          ...section,
          [period]: [
            ...section[period],
            {
              duration: "",
              originalPrice: 0,
              salePrice: 0,
              discountRate: 0,
            },
          ],
        };
      }),
    }));
  };

  const onRemoveCoursePricingRow = (sectionIndex, period, rowIndex) => {
    setForm((prev) => ({
      ...prev,
      coursePricing: normalizeCoursePricing(prev.coursePricing).map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) {
          return section;
        }

        const nextRows = section[period].filter((_, currentRowIndex) => currentRowIndex !== rowIndex);

        return {
          ...section,
          [period]: nextRows.length
            ? nextRows
            : [
                {
                  duration: "",
                  originalPrice: 0,
                  salePrice: 0,
                  discountRate: 0,
                },
              ],
        };
      }),
    }));
  };

  const onRemoveCoursePricingSection = (sectionIndex) => {
    setForm((prev) => ({
      ...prev,
      coursePricing: normalizeCoursePricing(prev.coursePricing).filter((_, currentSectionIndex) => currentSectionIndex !== sectionIndex),
    }));
  };

  const onAddCoursePricingSection = () => {
    const title = String(form.courseInput || "").trim();

    setForm((prev) => ({
      ...prev,
      coursePricing: [
        ...normalizeCoursePricing(prev.coursePricing),
        {
          title,
          dayStartTime: "12:00",
          dayEndTime: "17:00",
          nightStartTime: "17:00",
          nightEndTime: "04:00",
          day: [
            {
              duration: "",
              originalPrice: 0,
              salePrice: 0,
              discountRate: 0,
            },
          ],
          night: [
            {
              duration: "",
              originalPrice: 0,
              salePrice: 0,
              discountRate: 0,
            },
          ],
        },
      ],
      courseInput: "",
    }));
  };

  const onResetCoursePricing = () => {
    setForm((prev) => ({
      ...prev,
      coursePricing: cloneCoursePricing(),
    }));
  };

  const onSearch = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await shopApi.getList(currentAdminCategoryParams);
      const savedImageReplacementItems = getSavedImageReplacementItems();

      const items = getAdminVisibleShops(
        extractShopItems(res)
      )
        .map((item) =>
          applySavedImageReplacementToApiItem(
            item,
            savedImageReplacementItems
          )
        )
        .filter(Boolean);

      setList(items);

      if (items.length) {
        scheduleLoadStats();
      }
    } catch (e) {
      setList([]);
      setError(e.message || "업체 검색 실패");
    } finally {
      setLoading(false);
    }
  };

  const onAddImages = async (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) {
      return;
    }

    const imageFiles = files
      .filter((file) => file && String(file.type || "").startsWith("image/"))
      .slice(0, currentShopImageLimit);

    if (!imageFiles.length) {
      e.target.value = "";
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const uploadedImages = [];

      for (const file of imageFiles) {
        const uploadedImage = await compressImageFile(file);

        if (uploadedImage && isServerImageUrl(uploadedImage)) {
          uploadedImages.push(uploadedImage);
        }
      }

      const uniqueUploadedImages = makeUniqueImageList(
        uploadedImages,
        currentShopImageLimit
      );

      if (!uniqueUploadedImages.length) {
        throw new Error("서버 업로드 응답에서 이미지 URL을 찾지 못했습니다.");
      }

      setForm((prev) => {
        const nextImages = makeUniqueImageList(
          [
            ...prev.images,
            ...uniqueUploadedImages,
          ],
          currentShopImageLimit
        );

        return {
          ...prev,
          images: nextImages,
          representativeImage:
            prev.representativeImage && nextImages.includes(prev.representativeImage)
              ? prev.representativeImage
              : nextImages[0] || "",
        };
      });
    } catch (error) {
      console.error("SHOP IMAGE UPLOAD ERROR:", error);
      setError(error?.message || "이미지 업로드 실패");
      alert(error?.message || "이미지 업로드 실패");
    } finally {
      setSubmitting(false);
      e.target.value = "";
    }
  };

  const onSelectRepresentativeImage = (image) => {
    const safeImage = normalizeImageSrc(image);

    if (!safeImage) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      representativeImage: safeImage,
    }));
  };

  const onRemoveImage = (index) => {
    setForm((prev) => {
      const removed = prev.images[index];
      const nextImages = prev.images.filter((_, i) => i !== index);

      return {
        ...prev,
        images: nextImages,
        representativeImage:
          prev.representativeImage === removed
            ? nextImages[0] || ""
            : prev.representativeImage,
      };
    });
  };

  const onAddCourse = () => {
    onAddCoursePricingSection();
  };

  const onRemoveCourse = (index) => {
    setForm((prev) => ({
      ...prev,
      courses: prev.courses.filter((_, i) => i !== index),
    }));
  };

  const onAddPrice = () => {
    const value = Number(
      String(form.priceInput || "")
        .replaceAll(",", "")
        .replaceAll("원", "")
        .trim()
    );

    if (Number.isNaN(value)) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      price: [...prev.price, value],
      priceInput: "",
    }));
  };

  const onRemovePrice = (index) => {
    setForm((prev) => ({
      ...prev,
      price: prev.price.filter((_, i) => i !== index),
    }));
  };

  const resetDashboardShopSyncCache = () => {
    try {
      dashboardCacheRef.current = {
        category: "",
        items: [],
      };
      dashboardCacheTimeRef.current = 0;

      if (typeof window === "undefined") {
        return;
      }

      [window.localStorage, window.sessionStorage]
        .filter(Boolean)
        .forEach((storage) => {
          [
            "nora_admin_dashboard_cache",
            `nora_admin_dashboard_cache_${currentAdminCategory}`,
          ].forEach((key) => {
            try {
              storage.removeItem(key);
            } catch (e) {
              return;
            }
          });
        });
    } catch (e) {
      console.warn("SHOP DASHBOARD CACHE CLEAR SKIP:", e.message);
    }
  };

  const onCreate = async () => {
    try {
      if (submitting) {
        return;
      }

      if (!form.name.trim()) {
        alert("업체명 필요");
        return;
      }

      if (!form.address.trim()) {
        alert("주소 필요");
        return;
      }

      setSubmitting(true);
      setError("");

      const coordinates = await geocodeAddress(form.address);
      const payload = {
        ...getSubmitPayload(),
        __replaceImages: true,
        __imageReplaceLocked: true,
        lat: coordinates.lat,
        lng: coordinates.lng,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        location: {
          lat: coordinates.lat,
          lng: coordinates.lng,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        },
      };

      resetDashboardShopSyncCache();

      const res = await shopApi.create(payload);

      const serverShop =
        res?.shop ||
        res?.item ||
        (res?.data && !Array.isArray(res.data) ? res.data : null) ||
        {};

      const createdId =
        serverShop?._id ||
        serverShop?.id ||
        serverShop?.shopId ||
        `local-${currentAdminCategory}-shop-${Date.now()}`;

      const createdShop = mergeShopRecord(
        {},
        {
          ...serverShop,
          ...payload,
          __fromSubmitPayload: true,
          __premiumUpdated: true,
          _id: createdId,
          id: createdId,
          name: payload.name,
          address: payload.address,
          roadAddress: payload.address,
          fullAddress: payload.address,
          lat: payload.lat,
          lng: payload.lng,
          latitude: payload.latitude,
          longitude: payload.longitude,
          location: {
            ...(serverShop?.location && typeof serverShop.location === "object"
              ? serverShop.location
              : {}),
            lat: payload.lat,
            lng: payload.lng,
            latitude: payload.latitude,
            longitude: payload.longitude,
          },
          phone: payload.phone,
          businessHours: payload.businessHours,
          openingHours: payload.businessHours,
          hours: payload.businessHours,
          intro: payload.intro,
          description: payload.description,
          shopIntro: payload.shopIntro,
          coursePricing: payload.coursePricing,
          pricing: payload.pricing,
          priceTable: payload.priceTable,
          courseSections: payload.courseSections,
          premium: payload.premium,
          premiumType: payload.premiumType,
          premiumLevel: payload.premiumType,
          membershipType: payload.premiumType,
          listingType: payload.premiumType,
          shopGrade: payload.premiumType,
          imageGrade: payload.premiumType,
          photoGrade: payload.premiumType,
          isPremium: payload.isPremium,
          premiumActive: payload.premiumActive,
          directPaymentEnabled: payload.directPaymentEnabled,
          __directPaymentUpdated: true,
          createdAt:
            serverShop?.createdAt ||
            new Date().toISOString(),
          updatedAt:
            serverShop?.updatedAt ||
            new Date().toISOString(),
        }
      );

      writeShopImageBank([createdShop], { replace: true });
      saveBackupShops([createdShop]);
      forgetDeletedShop(createdShop);

      const optimisticList = filterDeletedShops(
        mergeShopList([
          ...list,
          createdShop,
        ])
      );

      setList(optimisticList);

      let nextList = optimisticList;

      try {
        const listRes = await shopApi.getList(currentAdminCategoryParams);
        const savedImageReplacementItems = getSavedImageReplacementItems();

        const serverItems = getAdminVisibleShops(
          extractShopItems(listRes)
        )
          .map((item) =>
            applySavedImageReplacementToApiItem(
              item,
              savedImageReplacementItems
            )
          )
          .filter(Boolean);

        if (serverItems.length) {
          nextList = serverItems;
        }
      } catch (listSyncError) {
        console.warn(
          "SHOP CREATE LIST SYNC SKIP:",
          listSyncError.message
        );
      }

      saveLocalShops(nextList);
      dispatchShopStorageEvent(nextList);
      setList(nextList);

      setForm({
        ...EMPTY_FORM,
        coursePricing: cloneCoursePricing(),
      });

      resetDashboardShopSyncCache();
      scheduleLoadStats();

      alert("업체 생성 완료");
    } catch (e) {
      console.warn(
        "SHOP CREATE ERROR:",
        e.message
      );

      setError(e.message || "업체 생성 실패");
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const onEdit = (shop) => {
    const images = makeUniqueImageList(makeSafeImages(shop));

    const representativeImage =
      normalizeImageSrc(
        shop?.representativeImage ||
          shop?.mainImage ||
          shop?.thumbnail ||
          shop?.coverImage ||
          images[0] ||
          ""
      );

    const coordinates = getShopCoordinates(shop);

    setEditingId(shop?._id || shop?.id || "");

    setForm({
      name: shop?.name || "",
      address: pickStableAddress(
        shop?.address,
        shop?.roadAddress,
        shop?.fullAddress,
        shop?.locationText
      ),
      phone: shop?.phone || shop?.tel || "",
      businessHours: shop?.businessHours || shop?.openingHours || shop?.hours || "",
      intro: shop?.intro || shop?.description || shop?.shopIntro || "",
      description: shop?.description || shop?.intro || shop?.shopIntro || "",
      shopIntro: shop?.shopIntro || shop?.intro || shop?.description || "",
      courses: makeSafeCourses(shop),
      courseInput: "",
      price: makeSafePrice(shop),
      priceInput: "",
      status: shop?.status || "active",
      premium: normalizePremiumType(shop),
      directPaymentEnabled: normalizeDirectPaymentEnabled(shop?.directPaymentEnabled),
      lat: coordinates.lat,
      lng: coordinates.lng,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      images: images.slice(0, currentShopImageLimit),
      representativeImage,
      coursePricing: makeSafeCoursePricing(shop),
    });

    window.setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 0);
  };

  const onUpdate = async () => {
    try {
      if (submitting) {
        return;
      }

      if (!editingId) {
        alert("수정 대상 없음");
        return;
      }

      if (!form.name.trim()) {
        alert("업체명 필요");
        return;
      }

      if (!form.address.trim()) {
        alert("주소 필요");
        return;
      }

      setSubmitting(true);
      setError("");

      const coordinates = await geocodeAddress(form.address);
      const basePayload = {
        ...getSubmitPayload(),
        lat: coordinates.lat,
        lng: coordinates.lng,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        location: {
          lat: coordinates.lat,
          lng: coordinates.lng,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        },
      };
      const fixedPayloadImages = makeImageListWithRepresentative(
        makeUniqueImageList(form.images),
        basePayload.representativeImage || form.representativeImage || form.images[0] || ""
      )
        .filter((image) => isServerImageUrl(image))
        .slice(0, currentShopImageLimit);
      const fixedPayloadRepresentativeImage = normalizeImageSrc(
        basePayload.representativeImage || fixedPayloadImages[0] || ""
      );

      const payload = {
        ...basePayload,
        __replaceImages: true,
        __imageReplaceLocked: true,
        images: fixedPayloadImages,
        photos: fixedPayloadImages,
        imageUrls: fixedPayloadImages,
        gallery: fixedPayloadImages,
        pictures: fixedPayloadImages,
        files: [],
        image: fixedPayloadRepresentativeImage,
        imageUrl: fixedPayloadRepresentativeImage,
        photo: fixedPayloadRepresentativeImage,
        picture: fixedPayloadRepresentativeImage,
        representativeImage: fixedPayloadRepresentativeImage,
        mainImage: fixedPayloadRepresentativeImage,
        thumbnail: fixedPayloadRepresentativeImage,
        coverImage: fixedPayloadRepresentativeImage,
      };

      const currentShop =
        list.find((item) => String(item?._id || item?.id || "") === String(editingId)) ||
        readLocalShops().find((item) => String(item?._id || item?.id || "") === String(editingId)) ||
        {};

      const optimisticUpdatedShop = normalizeShopForList({
        ...currentShop,
        ...payload,
        __replaceImages: true,
        __imageReplaceLocked: true,
        __fromSubmitPayload: true,
        __premiumUpdated: true,
        __directPaymentUpdated: true,
        directPaymentEnabled: payload.directPaymentEnabled,
        _id: currentShop?._id || editingId,
        id: currentShop?.id || editingId,
        address: payload.address,
        roadAddress: payload.address,
        fullAddress: payload.address,
        lat: payload.lat,
        lng: payload.lng,
        latitude: payload.latitude,
        longitude: payload.longitude,
        location: {
          ...(currentShop?.location && typeof currentShop.location === "object"
            ? currentShop.location
            : {}),
          lat: payload.lat,
          lng: payload.lng,
          latitude: payload.latitude,
          longitude: payload.longitude,
        },
        updatedAt: new Date().toISOString(),
      });

      writeShopImageBank([optimisticUpdatedShop], { replace: true });
      dispatchShopStorageEvent([optimisticUpdatedShop]);

      setList((prev) => {
        const nextList = filterDeletedShops(
          prev.map((item) => {
            const itemId = item?._id || item?.id;

            if (itemId && String(itemId) === String(editingId)) {
              return optimisticUpdatedShop;
            }

            return item;
          })
        );

        saveLocalShops(nextList);

        return nextList;
      });

      let res = null;

      try {
        res = await updateShopDirect(editingId, payload, currentAdminCategoryParams);
      } catch (directError) {
        console.warn("SHOP DIRECT UPDATE FALLBACK:", directError.message || directError);

        if (typeof shopApi.update !== "function") {
          throw directError;
        }

        res = await shopApi.update(editingId, payload, currentAdminCategoryParams);
      }

      const serverUpdatedShop =
        res?.shop ||
        res?.item ||
        (res?.data && !Array.isArray(res.data) ? res.data : null) ||
        {};

      const updatedShop = mergeShopRecord(
        optimisticUpdatedShop,
        {
          ...serverUpdatedShop,
          ...payload,
          __replaceImages: true,
          __imageReplaceLocked: true,
          __fromSubmitPayload: true,
          __premiumUpdated: true,
          _id: serverUpdatedShop?._id || serverUpdatedShop?.id || optimisticUpdatedShop._id || editingId,
          id: serverUpdatedShop?._id || serverUpdatedShop?.id || optimisticUpdatedShop.id || editingId,
          name: payload.name,
          address: payload.address,
          roadAddress: payload.address,
          fullAddress: payload.address,
          lat: payload.lat,
          lng: payload.lng,
          latitude: payload.latitude,
          longitude: payload.longitude,
          phone: payload.phone,
          businessHours: payload.businessHours,
          openingHours: payload.businessHours,
          hours: payload.businessHours,
          intro: payload.intro,
          description: payload.description,
          shopIntro: payload.shopIntro,
          courses: payload.courses,
          price: payload.price,
          coursePricing: payload.coursePricing,
          pricing: payload.pricing,
          priceTable: payload.priceTable,
          courseSections: payload.courseSections,
          premium: payload.premium,
          premiumType: payload.premiumType,
          premiumLevel: payload.premiumType,
          membershipType: payload.premiumType,
          listingType: payload.premiumType,
          shopGrade: payload.premiumType,
          imageGrade: payload.premiumType,
          photoGrade: payload.premiumType,
          isPremium: payload.isPremium,
          premiumActive: payload.premiumActive,
          directPaymentEnabled: payload.directPaymentEnabled,
          __directPaymentUpdated: true,
          images: payload.images,
          photos: payload.photos,
          imageUrls: payload.imageUrls,
          representativeImage: payload.representativeImage,
          mainImage: payload.mainImage,
          thumbnail: payload.thumbnail,
          coverImage: payload.coverImage,
        }
      );

      writeShopImageBank([updatedShop], { replace: true });
      dispatchShopStorageEvent([updatedShop]);

      setList((prev) => {
        const nextList = filterDeletedShops(
          prev.map((item) => {
            const itemId = item?._id || item?.id;

            if (itemId && String(itemId) === String(editingId)) {
              return updatedShop;
            }

            return item;
          })
        );

        saveLocalShops(nextList);

        return nextList;
      });

      setEditingId("");
      setForm({
        ...EMPTY_FORM,
        coursePricing: cloneCoursePricing(),
      });

      setSubmitting(false);
      setLoading(false);

      alert("업체 수정 완료");

      scheduleLoadStats();
    } catch (e) {
      setError(e.message || "업체 수정 실패");
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const onDelete = async (id) => {
    try {
      if (!window.confirm("삭제하시겠습니까?")) {
        return;
      }

      const deleteId = String(id || "");

      if (!deleteId) {
        setError("삭제 대상 없음");
        return;
      }

      setSubmitting(true);
      setError("");

      const beforeList = filterDeletedShops(
        getAdminVisibleShops(Array.isArray(list) ? list : [])
      );
      const targetShop =
        beforeList.find((item) => String(item?._id || item?.id || "") === deleteId) ||
        null;

      const deleteTarget = targetShop || {
        _id: deleteId,
        id: deleteId,
      };

      rememberDeletedShop(deleteTarget);
      removeShopImageBank(deleteTarget);
      removeShopPremiumBank(deleteTarget);
      dashboardCacheRef.current = {
        category: "",
        items: [],
      };
      dashboardCacheTimeRef.current = 0;

      const nextList = beforeList.filter((item) => {
        const itemId = String(item?._id || item?.id || "");

        return itemId !== deleteId;
      });

      setList(nextList);
      saveLocalShops(nextList);

      if (editingId && String(editingId) === deleteId) {
        setEditingId("");
        setForm({
          ...EMPTY_FORM,
          coursePricing: cloneCoursePricing(),
        });
      }

      if (!isLocalShopId(deleteId) && typeof shopApi.remove === "function") {
        try {
          await shopApi.remove(deleteId, currentAdminCategoryParams);
        } catch (e) {
          console.warn("SHOP DELETE API SKIP:", e.message);
        }
      }

      scheduleLoadStats();

      if (!targetShop || nextList.length !== beforeList.length) {
        alert("삭제 완료");
      } else {
        alert("삭제 완료");
      }
    } catch (e) {
      setError(e.message || "삭제 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const onStatus = async (id, status, shop) => {
    const payload = getStatusPayload(shop, status);

    try {
      if (submitting) {
        return;
      }

      setSubmitting(true);
      setError("");

      setList((prev) => {
        const nextList = prev.map((item) => {
          const itemId = item?._id || item?.id;

          if (itemId && id && String(itemId) === String(id)) {
            return mergeShopRecord(item, payload);
          }

          return item;
        });

        saveLocalShops(nextList);

        return nextList;
      });

      if (editingId && String(editingId) === String(id)) {
        setForm((prev) => ({
          ...prev,
          status,
          premium: payload.premiumType,
          images: payload.images,
          representativeImage: payload.representativeImage,
          coursePricing: makeSafeCoursePricing(payload),
        }));
      }

      let res = null;

      if (typeof shopApi.updateStatus === "function") {
        res = await shopApi.updateStatus(id, status, currentAdminCategoryParams);
      } else if (typeof shopApi.update === "function") {
        res = await shopApi.update(id, payload, currentAdminCategoryParams);
      }

      const updatedShop = res?.shop || res?.data || res?.item || null;

      if (updatedShop) {
        const nextPayload = getStatusPayload(
          mergeShopRecord(shop, updatedShop),
          updatedShop.status || status
        );

        setList((prev) => {
          const nextList = prev.map((item) => {
            const itemId = item?._id || item?.id;

            if (itemId && id && String(itemId) === String(id)) {
              return mergeShopRecord(item, nextPayload);
            }

            return item;
          });

          saveLocalShops(nextList);

          return nextList;
        });
      }

      alert(
        status === "active"
          ? "업체 상태가 active로 변경되었습니다."
          : "업체 상태가 inactive로 변경되었습니다."
      );
    } catch (e) {
      setList((prev) => {
        const nextList = prev.map((item) => {
          const itemId = item?._id || item?.id;

          if (itemId && id && String(itemId) === String(id)) {
            return mergeShopRecord(item, shop);
          }

          return item;
        });

        saveLocalShops(nextList);

        return nextList;
      });

      setError(e.message || "상태 변경 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredList = getFilteredList();

  if (!isShopAdminRoute) {
    return null;
  }

  if (loading) {
    return <Loading message="업체 목록 로딩 중..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={load} />;
  }

  const pageContent = (
    <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>{pageTitle}</h1>

          <p style={styles.desc}>
            {pageDescription}
          </p>
        </div>

        <div style={styles.searchPanel}>
          <div style={styles.regionRow}>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setDistrict("구");
              }}
              style={styles.regionSelect}
            >
              {Object.keys(REGION_MAP).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              style={styles.regionSelect}
            >
              {(REGION_MAP[region] || ["구"]).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.searchRow}>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSearch();
                }
              }}
              placeholder="지역 / 업체명 / 전화번호 / 영업시간을 입력해주세요."
              style={styles.searchInput}
            />

            <button
              type="button"
              onClick={onSearch}
              style={styles.searchBtn}
            >
              검색
            </button>

            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setRegion("지역");
                setDistrict("구");
                load();
              }}
              style={styles.resetBtn}
            >
              초기화
            </button>
          </div>
        </div>

        <div ref={formRef} style={styles.form}>
          <input
            name="name"
            placeholder="업체명"
            value={form.name}
            onChange={onChange}
            style={styles.input}
          />

          <input
            name="address"
            placeholder="주소"
            value={form.address}
            onChange={onChange}
            style={styles.input}
          />

          <div style={styles.inlineRow}>
            <input
              name="phone"
              placeholder="전화번호 예: 010-0000-0000"
              value={form.phone}
              onChange={onChange}
              style={styles.flexInput}
            />
          </div>

          <input
            name="businessHours"
            placeholder="영업시간 예: 24시간 / 10:00 - 03:00"
            value={form.businessHours}
            onChange={onChange}
            style={styles.input}
          />

          <div style={styles.businessTimerPanel}>
            <div style={styles.businessTimerTitle}>영업시간 타이머 설정</div>

            <div style={styles.businessTimerRow}>
              <label style={styles.businessTimerLabel}>
                시작시간
                <input
                  type="time"
                  value={getBusinessTimerValue(form.businessHours).start}
                  onChange={(e) => setBusinessTimerValue("start", e.target.value)}
                  style={styles.businessTimerInput}
                />
              </label>

              <label style={styles.businessTimerLabel}>
                종료시간
                <input
                  type="time"
                  value={getBusinessTimerValue(form.businessHours).end}
                  onChange={(e) => setBusinessTimerValue("end", e.target.value)}
                  style={styles.businessTimerInput}
                />
              </label>

              <div style={isShopBusinessOpen(form.businessHours) ? styles.businessOpenBadge : styles.businessReadyBadge}>
                {isShopBusinessOpen(form.businessHours) ? "ⓘ 영업시간입니다." : "ⓘ 영업 준비중입니다."}
              </div>
            </div>
          </div>

          <textarea
            name="intro"
            placeholder="업체소개 글을 입력해주세요."
            value={form.intro}
            onChange={(e) => {
              const value = e.target.value;

              setForm((prev) => ({
                ...prev,
                intro: value,
                description: value,
                shopIntro: value,
              }));
            }}
            style={styles.textarea}
          />

          <div style={styles.imageBox}>
            <label style={styles.imageLabel}>
              사진 등록
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onAddImages}
                style={styles.fileInput}
              />
            </label>

            <select
              name="premium"
              value={form.premium}
              onChange={onChange}
              style={styles.premiumSelect}
            >
              <option value="normal">NORMAL</option>
              <option value="premium">PREMIUM</option>
              <option value="vip">VIP</option>
            </select>

            <div style={styles.imageHelp}>
              사진은 서버 업로드 후 URL만 저장 / base64·blob 저장 금지 / 최대 {currentShopImageLimit}장
            </div>
          </div>

          {!!form.images.length && (
            <div style={styles.previewWrap}>
              {form.images.map((image, index) => {
                const safeImage = normalizeImageSrc(image);
                const isRepresentative =
                  form.representativeImage === safeImage ||
                  (!form.representativeImage && index === 0);

                if (!safeImage) {
                  return null;
                }

                return (
                  <div
                    key={`${safeImage}-${index}`}
                    style={{
                      ...styles.previewItem,
                      border: isRepresentative
                        ? "2px solid #d4af37"
                        : "1px solid #333",
                    }}
                  >
                    <img
                      src={safeImage}
                      alt={`shop-${index}`}
                      style={styles.previewImage}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = SHOP_IMAGE_FALLBACK_SRC;
                        e.currentTarget.style.display = "block";
                        e.currentTarget.style.opacity = "1";
                      }}
                    />

                    {isRepresentative && (
                      <div style={styles.representativeBadge}>대표</div>
                    )}

                    <button
                      type="button"
                      style={styles.representativeBtn}
                      onClick={() => onSelectRepresentativeImage(safeImage)}
                    >
                      대표 선택
                    </button>

                    <button
                      type="button"
                      style={styles.imageRemoveBtn}
                      onClick={() => onRemoveImage(index)}
                    >
                      X
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={styles.coursePricingPanel}>
            <div style={styles.coursePricingHeader}>
              <div>
                <h3 style={styles.coursePricingTitle}>상세 코스 / 가격 관리</h3>
                <p style={styles.coursePricingDesc}>
                  상세페이지의 타이 관리 / 아로마 관리 / 주간 / 야간 / 시간별 가격표와 연결됩니다.
                </p>
              </div>

              <button
                type="button"
                onClick={onResetCoursePricing}
                style={styles.resetCourseBtn}
              >
                기본값 복구
              </button>
            </div>

            {normalizeCoursePricing(form.coursePricing).map((section, sectionIndex) => (
              <div key={`course-section-${sectionIndex}`} style={styles.courseSectionBox}>
                <div style={styles.courseSectionTop}>
                  <input
                    value={section.title}
                    onChange={(e) => onCourseSectionTitleChange(sectionIndex, e.target.value)}
                    style={styles.courseSectionTitleInput}
                    placeholder="제목(코스 이름)"
                  />

                  <button
                    type="button"
                    onClick={() => onRemoveCoursePricingSection(sectionIndex)}
                    style={styles.courseSectionDeleteBtn}
                  >
                    삭제
                  </button>
                </div>

                <div style={styles.courseTimeGrid}>
                  <label style={styles.courseTimeLabel}>
                    주간 시작시간
                    <input
                      type="time"
                      value={section.dayStartTime || ""}
                      onChange={(e) => onCourseSectionTimeChange(sectionIndex, "dayStartTime", e.target.value)}
                      style={styles.courseTimeInput}
                    />
                  </label>

                  <label style={styles.courseTimeLabel}>
                    주간 종료시간
                    <input
                      type="time"
                      value={section.dayEndTime || ""}
                      onChange={(e) => onCourseSectionTimeChange(sectionIndex, "dayEndTime", e.target.value)}
                      style={styles.courseTimeInput}
                    />
                  </label>

                  <label style={styles.courseTimeLabel}>
                    야간 시작시간
                    <input
                      type="time"
                      value={section.nightStartTime || ""}
                      onChange={(e) => onCourseSectionTimeChange(sectionIndex, "nightStartTime", e.target.value)}
                      style={styles.courseTimeInput}
                    />
                  </label>

                  <label style={styles.courseTimeLabel}>
                    야간 종료시간
                    <input
                      type="time"
                      value={section.nightEndTime || ""}
                      onChange={(e) => onCourseSectionTimeChange(sectionIndex, "nightEndTime", e.target.value)}
                      style={styles.courseTimeInput}
                    />
                  </label>
                </div>

                <div style={styles.coursePeriodGrid}>
                  {[
                    { key: "day", label: "주간" },
                    { key: "night", label: "야간" },
                  ].map((period) => (
                    <div key={period.key} style={styles.coursePeriodBox}>
                      <div style={styles.coursePeriodTop}>
                        <div style={styles.coursePeriodTitle}>{period.label}</div>

                        <button
                          type="button"
                          onClick={() => onAddCoursePricingRow(sectionIndex, period.key)}
                          style={styles.courseRowAddBtn}
                        >
                          등록
                        </button>
                      </div>

                      <div style={styles.courseTableHeader}>
                        <span>시간</span>
                        <span>정상가</span>
                        <span>할인가</span>
                        <span>할인율</span>
                        <span>삭제</span>
                      </div>

                      {section[period.key].map((row, rowIndex) => (
                        <div key={`${period.key}-${rowIndex}`} style={styles.courseTableRow}>
                          <input
                            value={row.duration}
                            onChange={(e) =>
                              onCoursePricingChange(sectionIndex, period.key, rowIndex, "duration", e.target.value)
                            }
                            style={styles.courseSmallInput}
                            placeholder="시간"
                          />

                          <input
                            value={row.originalPrice ? row.originalPrice : ""}
                            onChange={(e) =>
                              onCoursePricingChange(sectionIndex, period.key, rowIndex, "originalPrice", e.target.value)
                            }
                            style={styles.coursePriceInput}
                            placeholder="정상가"
                          />

                          <input
                            value={row.salePrice ? row.salePrice : ""}
                            onChange={(e) =>
                              onCoursePricingChange(sectionIndex, period.key, rowIndex, "salePrice", e.target.value)
                            }
                            style={styles.coursePriceInput}
                            placeholder="할인가"
                          />

                          <div style={styles.discountBadge}>
                            {getDiscountRate(row.originalPrice, row.salePrice)}%
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveCoursePricingRow(sectionIndex, period.key, rowIndex)}
                            style={styles.courseRowRemoveBtn}
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.inlineRow}>
            <input
              name="courseInput"
              placeholder="제목(코스 이름) 입력 후 코스 등록"
              value={form.courseInput}
              onChange={onChange}
              style={styles.flexInput}
            />

            <button
              type="button"
              onClick={onAddCourse}
              style={styles.addBtn}
            >
              코스 등록
            </button>
          </div>

          {false && !!form.courses.length && (
            <div style={styles.tagWrap}>
              {form.courses.map((course, index) => (
                <div key={`${course}-${index}`} style={styles.tag}>
                  <span>{course}</span>

                  <button
                    type="button"
                    style={styles.removeBtn}
                    onClick={() => onRemoveCourse(index)}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={styles.inlineRow}>
            <input
              name="priceInput"
              placeholder="추가 금액 입력"
              value={form.priceInput}
              onChange={onChange}
              style={styles.flexInput}
            />

            <button
              type="button"
              onClick={onAddPrice}
              style={styles.addBtn}
            >
              금액 등록
            </button>
          </div>

          {false && !!form.price.length && (
            <div style={styles.tagWrap}>
              {form.price.map((price, index) => (
                <div key={`${price}-${index}`} style={styles.tag}>
                  <span>{Number(price).toLocaleString()}원</span>

                  <button
                    type="button"
                    style={styles.removeBtn}
                    onClick={() => onRemovePrice(index)}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}

          <select
            name="directPaymentEnabled"
            value={form.directPaymentEnabled ? "true" : "false"}
            onChange={(e) => {
              const value = e.target.value === "true";

              setForm((prev) => ({
                ...prev,
                directPaymentEnabled: value,
              }));
            }}
            style={styles.input}
          >
            <option value="false">바로결제 비활성화</option>
            <option value="true">바로결제 활성화</option>
          </select>

          {!editingId ? (
            <button
              style={styles.createBtn}
              onClick={onCreate}
            >
              업체 생성
            </button>
          ) : (
            <button
              style={styles.updateBtn}
              onClick={onUpdate}
              disabled={submitting}
            >
              {submitting ? "처리 중..." : "업체 수정"}
            </button>
          )}
        </div>

        {!filteredList.length ? (
          <EmptyState message="등록된 업체가 없습니다." />
        ) : (
          <div style={styles.list}>
            {filteredList.map((shop) => {
              const bankFixedShop = shop;
              const shopImages = makeSafeImages(bankFixedShop)
                .map((image) => normalizeImageSrc(image))
                .filter(Boolean);

              const representativeImage =
                normalizeImageSrc(
                  bankFixedShop?.representativeImage ||
                    bankFixedShop?.mainImage ||
                    bankFixedShop?.thumbnail ||
                    bankFixedShop?.coverImage ||
                    shopImages[0] ||
                    ""
                );

              const orderedImages = makeImageListWithRepresentative(
                shopImages,
                representativeImage
              );
              const visibleOrderedImages = orderedImages.slice(0, currentShopImageLimit);

              const shopStats =
                getShopStats(shop);

              const monthlyRows =
                getDateRangeRows(
                  shop,
                  shopStats
                );

              const callCount =
                Number(
                  shopStats.callCount ||
                    shop.callCount ||
                    shop.stats?.callCount ||
                    0
                ) ||
                sumObjectValues(
                  shopStats.dailyCalls ||
                    shop.dailyCalls
                );

              const clickCount =
                Number(
                  shopStats.clickCount ||
                    shop.clickCount ||
                    shop.viewCount ||
                    shop.stats?.clickCount ||
                    0
                ) ||
                sumObjectValues(
                  shopStats.dailyClicks ||
                    shop.dailyClicks
                );

              const conversionCount =
                Number(
                  shopStats.conversionCount ||
                    shop.conversionCount ||
                    shop.stats?.conversionCount ||
                    shop.stats?.reservationCount ||
                    0
                ) ||
                sumObjectValues(
                  shopStats.dailyConversions ||
                    shop.dailyConversions
                );

              const reviewCount =
                Number(
                  shopStats.reviewCount ||
                    shop.reviewCount ||
                    shop.rating?.count ||
                    shop.stats?.reviewCount ||
                    0
                ) ||
                sumObjectValues(
                  shopStats.dailyReviews ||
                    shop.dailyReviews
                );

              const premium = normalizePremiumType(shop);
              const shopCoursePricing = filterCompleteCoursePricing(makeSafeCoursePricing(shop));
              const businessOpen = isShopBusinessOpen(shop?.businessHours || shop?.openingHours || shop?.hours || "");
              const directPaymentActive = normalizeDirectPaymentEnabled(shop?.directPaymentEnabled);

              return (
                <div key={shop?._id || shop?.id || shop?.name}>
                  <div style={{ ...styles.card, ...(!businessOpen ? styles.closedShopCard : {}) }}>
                    {!!visibleOrderedImages.length && (
                      <div style={styles.cardImages}>
                        {visibleOrderedImages.map((image, index) => {
                          const safeImage = normalizeImageSrc(image);

                          if (!safeImage) {
                            return null;
                          }

                          return (
                            <div
                              key={`${safeImage}-${index}`}
                              style={styles.cardImageBox}
                            >
                              <img
                                src={safeImage}
                                alt={`shop-card-${index}`}
                                style={styles.cardImage}
                                loading={index === 0 ? "eager" : "lazy"}
                                decoding="async"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = SHOP_IMAGE_FALLBACK_SRC;
                                  e.currentTarget.style.display = "block";
                                  e.currentTarget.style.opacity = "1";
                                }}
                              />

                              {index === 0 && (
                                <div style={styles.cardRepresentativeBadge}>
                                  대표
                                </div>
                              )}

                              {directPaymentActive && (
                                <div style={styles.cardDirectPaymentBadge}>
                                  바로결제
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={styles.cardTop}>
                      <div>
                        <div style={styles.shopNameRow}>
                          <div style={styles.shopName}>
                            {shop?.name || "업체명 없음"}
                          </div>

                          {premium !== "normal" && (
                            <div style={premium === "vip" ? styles.vipBadge : styles.premiumBadge}>
                              {premium === "vip" ? "VIP" : "PREMIUM"}
                            </div>
                          )}
                        </div>

                        <div style={styles.address}>
                          {pickStableAddress(shop?.address, shop?.roadAddress, shop?.fullAddress, shop?.locationText) || "주소 없음"}
                        </div>
                      </div>

                    </div>

                    <div style={styles.section}>
                      <strong>전화번호:</strong>{" "}
                      {shop?.phone || "-"}
                    </div>

                    <div style={styles.section}>
                      <strong>영업시간:</strong>{" "}
                      {shop?.businessHours || shop?.openingHours || shop?.hours || "-"}
                      <span style={businessOpen ? styles.businessOpenListText : styles.businessReadyListText}>
                        {businessOpen ? " ⓘ 영업시간입니다." : " ⓘ 영업 준비중입니다."}
                      </span>
                    </div>

                    <div style={styles.section}>
                      <strong>프리미엄:</strong>{" "}
                      {premium === "normal" ? "NORMAL" : String(premium || "normal").toUpperCase()}
                    </div>

                    <div style={styles.section}>
                      <strong>바로결제:</strong>{" "}
                      {directPaymentActive ? "활성화" : "비활성화"}
                    </div>

                    <div style={styles.section}>
                      <strong>업체소개:</strong>{" "}
                      {shop?.intro || shop?.description || shop?.shopIntro || "-"}
                    </div>

                    <div style={styles.adminCourseSummary}>
                      {shopCoursePricing.map((section, sectionIndex) => (
                        <div key={`${section.title}-${sectionIndex}`} style={styles.adminCourseSummaryBox}>
                          <strong style={styles.adminCourseSummaryTitle}>{section.title}</strong>

                          <div style={styles.adminCourseSummaryGrid}>
                            {[
                              { key: "day", label: "주간" },
                              { key: "night", label: "야간" },
                            ].map((period) => (
                              <div key={period.key}>
                                <div style={styles.adminCourseSummaryPeriod}>
                                  {period.label}
                                  <span style={styles.adminCourseSummaryTime}>
                                    {period.key === "day"
                                      ? ` ${section.dayStartTime || "-"} ~ ${section.dayEndTime || "-"}`
                                      : ` ${section.nightStartTime || "-"} ~ ${section.nightEndTime || "-"}`}
                                  </span>
                                </div>

                                {section[period.key].filter((row) => isCompletePricingRow(row)).map((row, rowIndex) => (
                                  <div key={`${period.key}-${rowIndex}`} style={styles.adminCourseSummaryRow}>
                                    <span>{row.duration}</span>
                                    <span>{row.originalPrice ? `${Number(row.originalPrice).toLocaleString()}원` : "-"}</span>
                                    <span>{row.salePrice ? `${Number(row.salePrice).toLocaleString()}원` : "-"}</span>
                                    <span>{getDiscountRate(row.originalPrice, row.salePrice)}%</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {false && (
                      <div style={styles.section}>
                        <strong>추가 코스:</strong>{" "}
                        {makeSafeCourses(shop).length
                          ? makeSafeCourses(shop).join(", ")
                          : "-"}
                      </div>
                    )}

                    {false && (
                      <div style={styles.section}>
                        <strong>추가 금액:</strong>{" "}
                        {makeSafePrice(shop).length
                          ? Array.from(
                              new Set(
                                makeSafePrice(shop)
                                  .map((v) => Number(v))
                                  .filter((v) => Number.isFinite(v) && v > 0)
                              )
                            )
                              .map((v) => `${v.toLocaleString()}원`)
                              .join(", ")
                          : "-"}
                      </div>
                    )}

                    <div style={styles.actions}>
                      <button
                        style={styles.editBtn}
                        onClick={() => onEdit(shop)}
                        disabled={submitting}
                      >
                        수정
                      </button>

                      <button
                        style={styles.deleteBtn}
                        onClick={() => onDelete(shop?._id || shop?.id)}
                        disabled={submitting}
                      >
                        삭제
                      </button>

                    </div>
                  </div>

                  <div style={styles.shopStatsPanel}>
                    <div style={styles.shopStatsTitle}>
                      <strong>
                        {shop?.name || "업체"} 통계
                      </strong>

                      <span>
                        {(statsStartDate || getDefaultMonthRange().start)} ~ {(statsEndDate || getDefaultMonthRange().end)}
                      </span>
                    </div>

                    <div style={styles.statsFilterRow}>
                      <input
                        type="date"
                        value={statsStartDate}
                        onChange={(e) => setStatsStartDate(e.target.value)}
                        onClick={(e) => {
                          if (typeof e.currentTarget.showPicker === "function") {
                            e.currentTarget.showPicker();
                          }
                        }}
                        style={styles.statsDateInput}
                      />

                      <input
                        type="date"
                        value={statsEndDate}
                        onChange={(e) => setStatsEndDate(e.target.value)}
                        onClick={(e) => {
                          if (typeof e.currentTarget.showPicker === "function") {
                            e.currentTarget.showPicker();
                          }
                        }}
                        style={styles.statsDateInput}
                      />

                      <button
                        type="button"
                        onClick={loadStats}
                        style={styles.statsSearchBtn}
                      >
                        월간 기간설정 조회
                      </button>
                    </div>

                    <div style={styles.statGrid}>
                      <div style={styles.statCard}>
                        <span style={styles.statLabel}>일일 콜수</span>
                        <strong style={styles.statValue}>{callCount}</strong>
                      </div>

                      <div style={styles.statCard}>
                        <span style={styles.statLabel}>일일 클릭수</span>
                        <strong style={styles.statValue}>{clickCount}</strong>
                      </div>

                      <div style={styles.statCard}>
                        <span style={styles.statLabel}>일일 전환수</span>
                        <strong style={styles.statValue}>{conversionCount}</strong>
                      </div>

                      <div style={styles.statCard}>
                        <span style={styles.statLabel}>일일 리뷰수</span>
                        <strong style={styles.statValue}>{reviewCount}</strong>
                      </div>
                    </div>

                    <div style={styles.monthlyStatsBox}>
                      <div style={styles.monthlyStatsHeader}>
                        <strong>월간 기간별 일일 통계</strong>
                      </div>

                      <div style={styles.monthlyStatsGrid}>
                        <div style={styles.monthlyStatsHead}>날짜</div>
                        <div style={styles.monthlyStatsHead}>콜수</div>
                        <div style={styles.monthlyStatsHead}>클릭수</div>
                        <div style={styles.monthlyStatsHead}>전환수</div>
                        <div style={styles.monthlyStatsHead}>리뷰수</div>

                        {monthlyRows.map((row) => (
                          <React.Fragment key={`${shop?._id || shop?.id}-${row.date}`}>
                            <div style={styles.monthlyStatsCell}>{row.date}</div>
                            <div style={styles.monthlyStatsCell}>{row.calls}</div>
                            <div style={styles.monthlyStatsCell}>{row.clicks}</div>
                            <div style={styles.monthlyStatsCell}>{row.conversions}</div>
                            <div style={styles.monthlyStatsCell}>{row.reviews}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );

  return shouldWrapAdminLayout ? (
    <AdminLayout title={pageTitle}>
      {pageContent}
    </AdminLayout>
  ) : pageContent;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    margin: 0,
    color: "#d4af37",
    fontSize: 28,
  },
  desc: {
    marginTop: 8,
    color: "#999",
  },
  searchPanel: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  regionRow: {
    display: "flex",
    gap: 10,
    marginBottom: 10,
  },
  regionSelect: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    border: "1px solid #444",
    background: "#000",
    color: "#d4af37",
    fontWeight: "bold",
    outline: "none",
  },
  searchRow: {
    display: "flex",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
    outline: "none",
  },
  searchBtn: {
    padding: "12px 18px",
    borderRadius: 8,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
  },
  resetBtn: {
    padding: "12px 18px",
    borderRadius: 8,
    border: "1px solid #444",
    background: "#222",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  form: {
    display: "grid",
    gap: 10,
    marginBottom: 30,
    background: "#111",
    border: "1px solid #333",
    padding: 16,
    borderRadius: 10,
    scrollMarginTop: 24,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
  },
  textarea: {
    minHeight: 140,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
    resize: "vertical",
    lineHeight: "24px",
    fontFamily: "inherit",
    outline: "none",
  },
  inlineRow: {
    display: "flex",
    gap: 10,
  },
  flexInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
  },
  addBtn: {
    padding: "12px 16px",
    borderRadius: 8,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
  },
  businessTimerPanel: {
    display: "grid",
    gap: 8,
    padding: 12,
    border: "1px solid #333",
    borderRadius: 8,
    background: "#050505",
  },
  businessTimerTitle: {
    color: "#d4af37",
    fontSize: 14,
    fontWeight: "bold",
  },
  businessTimerRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: 10,
    alignItems: "end",
  },
  businessTimerLabel: {
    display: "grid",
    gap: 6,
    color: "#aaa",
    fontSize: 12,
    fontWeight: "bold",
  },
  businessTimerInput: {
    padding: 11,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
    colorScheme: "dark",
    outline: "none",
  },
  businessOpenBadge: {
    padding: "11px 14px",
    borderRadius: 8,
    border: "1px solid #d4af37",
    color: "#d4af37",
    background: "rgba(212, 175, 55, 0.08)",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  businessReadyBadge: {
    padding: "11px 14px",
    borderRadius: 8,
    border: "1px solid #f44336",
    color: "#ff4d4d",
    background: "rgba(244, 67, 54, 0.08)",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  imageBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  imageLabel: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    borderRadius: 8,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
  },
  premiumSelect: {
    minWidth: 150,
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid #d4af37",
    background: "#000",
    color: "#d4af37",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  fileInput: {
    display: "none",
  },
  imageHelp: {
    color: "#aaa",
    fontSize: 13,
  },
  previewWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  previewItem: {
    width: 150,
    height: 120,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    background: "#000",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center",
    display: "block",
  },
  representativeBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    background: "#d4af37",
    color: "#000",
    fontSize: 11,
    fontWeight: "bold",
    padding: "3px 6px",
    borderRadius: 4,
  },
  representativeBtn: {
    position: "absolute",
    left: 6,
    bottom: 6,
    border: "none",
    background: "#d4af37",
    color: "#000",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 11,
    padding: "4px 6px",
  },
  imageRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    border: "none",
    background: "#f44336",
    color: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: "bold",
  },
  coursePricingPanel: {
    display: "grid",
    gap: 12,
    padding: 14,
    border: "1px solid #d4af37",
    borderRadius: 10,
    background: "#050505",
  },
  coursePricingHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  coursePricingTitle: {
    margin: 0,
    color: "#d4af37",
    fontSize: 18,
  },
  coursePricingDesc: {
    margin: "5px 0 0",
    color: "#aaa",
    fontSize: 13,
  },
  resetCourseBtn: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d4af37",
    background: "#000",
    color: "#d4af37",
    fontWeight: "bold",
    cursor: "pointer",
  },
  courseSectionBox: {
    border: "1px solid #333",
    borderRadius: 10,
    padding: 12,
    background: "#111",
  },
  courseSectionTop: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  courseSectionTitleInput: {
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d4af37",
    background: "#000",
    color: "#d4af37",
    fontWeight: "bold",
  },
  courseSectionDeleteBtn: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "none",
    background: "#f44336",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  courseTimeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    marginBottom: 10,
  },
  courseTimeLabel: {
    display: "grid",
    gap: 6,
    color: "#d4af37",
    fontSize: 12,
    fontWeight: "bold",
  },
  courseTimeInput: {
    minWidth: 0,
    padding: 9,
    borderRadius: 6,
    border: "1px solid #333",
    background: "#050505",
    color: "#fff",
    colorScheme: "dark",
    outline: "none",
  },
  coursePeriodGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  coursePeriodBox: {
    border: "1px solid #333",
    borderRadius: 8,
    padding: 10,
    background: "#000",
  },
  coursePeriodTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  coursePeriodTitle: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  courseRowAddBtn: {
    padding: "7px 10px",
    borderRadius: 6,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 12,
  },
  courseTableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr 1.2fr 70px 48px",
    gap: 6,
    color: "#d4af37",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  courseTableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr 1.2fr 70px 48px",
    gap: 6,
    marginBottom: 6,
    alignItems: "center",
  },
  courseSmallInput: {
    minWidth: 0,
    padding: 9,
    borderRadius: 6,
    border: "1px solid #333",
    background: "#050505",
    color: "#fff",
  },
  coursePriceInput: {
    minWidth: 0,
    padding: 9,
    borderRadius: 6,
    border: "1px solid #333",
    background: "#050505",
    color: "#fff",
  },
  discountBadge: {
    padding: "8px 6px",
    borderRadius: 6,
    background: "#e0005a",
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  courseRowRemoveBtn: {
    padding: "8px 6px",
    borderRadius: 6,
    border: "none",
    background: "#f44336",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  adminCourseSummary: {
    marginTop: 12,
    display: "grid",
    gap: 10,
  },
  adminCourseSummaryBox: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#050505",
  },
  adminCourseSummaryTitle: {
    color: "#d4af37",
    display: "block",
    marginBottom: 8,
  },
  adminCourseSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  adminCourseSummaryPeriod: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  adminCourseSummaryTime: {
    color: "#d4af37",
    fontSize: 11,
    marginLeft: 6,
    fontWeight: "bold",
  },
  adminCourseSummaryRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 50px",
    gap: 6,
    fontSize: 12,
    color: "#ddd",
    padding: "5px 0",
    borderBottom: "1px solid #222",
  },
  tagWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    background: "#222",
    border: "1px solid #444",
    borderRadius: 8,
  },
  removeBtn: {
    border: "none",
    background: "transparent",
    color: "#f44336",
    cursor: "pointer",
    fontWeight: "bold",
  },
  createBtn: {
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: "#d4af37",
    color: "#000",
    cursor: "pointer",
    fontWeight: "bold",
  },
  updateBtn: {
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: "#4caf50",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
  list: {
    display: "grid",
    gap: 14,
  },
  card: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 10,
    padding: 16,
  },
  closedShopCard: {
    opacity: 0.62,
    filter: "brightness(0.65) saturate(0.75)",
  },
  cardImages: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    marginBottom: 12,
  },
  cardImageBox: {
    position: "relative",
    width: 120,
    height: 90,
    borderRadius: 8,
    border: "1px solid #333",
    flexShrink: 0,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center",
    display: "block",
  },
  cardRepresentativeBadge: {
    position: "absolute",
    left: 5,
    top: 5,
    background: "#d4af37",
    color: "#000",
    fontSize: 10,
    fontWeight: "bold",
    padding: "2px 5px",
    borderRadius: 4,
  },
  cardDirectPaymentBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textShadow: "0 1px 4px rgba(0, 0, 0, 0.95)",
    letterSpacing: 0.2,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  shopNameRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  shopName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#d4af37",
  },
  premiumBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#d4af37",
    color: "#000",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  vipBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "linear-gradient(135deg, #d4af37, #fff1a8, #d4af37)",
    color: "#000",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
    boxShadow: "0 0 10px rgba(212, 175, 55, 0.65)",
  },
  address: {
    marginTop: 4,
    color: "#aaa",
    fontSize: 13,
  },
  status: {
    fontSize: 12,
  },
  section: {
    marginTop: 8,
    color: "#ddd",
  },
  businessOpenListText: {
    color: "#d4af37",
    fontWeight: "bold",
    marginLeft: 8,
  },
  businessReadyListText: {
    color: "#ff4d4d",
    fontWeight: "bold",
    marginLeft: 8,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
  },
  editBtn: {
    padding: "10px 14px",
    background: "#2196f3",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  deleteBtn: {
    padding: "10px 14px",
    background: "#f44336",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  statusBtn: {
    padding: "10px 14px",
    background: "#ff9800",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  shopStatsPanel: {
    marginTop: 8,
    background: "#050505",
    border: "1px solid #d4af37",
    borderRadius: 10,
    padding: 16,
  },
  shopStatsTitle: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    color: "#d4af37",
    fontSize: 14,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  statsFilterRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: 8,
    marginBottom: 12,
  },
  statsDateInput: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
    colorScheme: "dark",
    minHeight: 42,
    cursor: "pointer",
  },
  statsSearchBtn: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  statLabel: {
    color: "#aaa",
    fontSize: 12,
  },
  statValue: {
    color: "#d4af37",
    fontSize: 20,
  },
  monthlyStatsBox: {
    marginTop: 10,
    padding: 12,
    border: "1px solid #333",
    borderRadius: 10,
    background: "#000",
  },
  monthlyStatsHeader: {
    color: "#d4af37",
    fontSize: 13,
    marginBottom: 10,
  },
  monthlyStatsGrid: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr",
    gap: 1,
    background: "#222",
    border: "1px solid #222",
    maxHeight: 220,
    overflowY: "auto",
  },
  monthlyStatsHead: {
    background: "#111",
    color: "#d4af37",
    fontSize: 11,
    fontWeight: "bold",
    padding: "8px 6px",
    textAlign: "center",
  },
  monthlyStatsCell: {
    background: "#000",
    color: "#fff",
    fontSize: 11,
    padding: "7px 6px",
    textAlign: "center",
  },
};

export default ShopAdminPage;
