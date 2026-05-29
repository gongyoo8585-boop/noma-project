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
  images: [],
  representativeImage: "",
  intro: "",
  description: "",
  shopIntro: "",
  coursePricing: cloneCoursePricing(),
};

const LOCAL_SHOP_KEY = "noma_admin_shops";
const LOCAL_PUBLIC_SHOP_KEY = "noma_local_shops";
const LOCAL_SHOP_IMAGE_BANK_KEY = "noma_admin_shop_image_bank";
const LOCAL_SHOP_BACKUP_KEY = "noma_admin_shop_backup";
const DELETED_SHOP_KEY = "noma_deleted_shop_ids";
const MAX_LOCAL_IMAGE_COUNT = Number.POSITIVE_INFINITY;
const MAX_LOCAL_IMAGE_LENGTH = Number.POSITIVE_INFINITY;
const MAX_MIRROR_STORAGE_LENGTH = 250000;

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

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
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

  if (typeof window !== "undefined") {
    try {
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

      if (!isKaraokeAdminPath && currentAdminCategory === "massage" && urlCategory !== "massage") {
        params.set("category", "massage");
        params.set("shopCategory", "massage");
        params.set("serviceType", "massage");
        params.set("businessType", "massage");
        params.set("adminCategory", "massage");

        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${params.toString()}`
        );
      }

      localStorage.setItem("noma_admin_category", currentAdminCategory);
      sessionStorage.setItem("noma_admin_category", currentAdminCategory);
    } catch (e) {
      console.warn("SHOP ADMIN CATEGORY SYNC SKIP:", e.message);
    }
  }

  const currentAdminCategoryParams = {
    category: currentAdminCategory,
    shopCategory: currentAdminCategory,
    serviceType: currentAdminCategory,
    businessType: currentAdminCategory,
    adminCategory: currentAdminCategory,
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
  const LOCAL_SHOP_BACKUP_KEY = `noma_admin_shop_backup_${currentAdminCategory}`;
  const DELETED_SHOP_KEY = `noma_deleted_shop_ids_${currentAdminCategory}`;

  const [stats, setStats] = useState([]);
  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState("");

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s/g, "")
      .trim();

  const getShopCategory = (shop) => {
    if (!shop || typeof shop !== "object") {
      return currentAdminCategory;
    }

    return (
      normalizeShopCategory(shop.category) ||
      normalizeShopCategory(shop.shopCategory) ||
      normalizeShopCategory(shop.type) ||
      normalizeShopCategory(shop.serviceType) ||
      normalizeShopCategory(shop.businessType) ||
      normalizeShopCategory(shop.adminCategory) ||
      ""
    );
  };

  const isCurrentCategoryShop = (shop) => {
    const shopCategory = getShopCategory(shop);

    if (currentAdminCategory === "karaoke") {
      return shopCategory === "karaoke";
    }

    return shopCategory !== "karaoke";
  };

  const filterCurrentCategoryShops = (items) =>
    (Array.isArray(items) ? items : []).filter((item) =>
      isCurrentCategoryShop(item)
    );

  const normalizePremiumType = (value) => {
    if (value && typeof value === "object") {
      if (value.premiumType !== undefined) {
        return normalizePremiumType(value.premiumType);
      }

      if (value.premium === true || value.isPremium === true || value.premiumActive === true) {
        return "premium";
      }

      if (value.premium === false || value.isPremium === false || value.premiumActive === false) {
        return "normal";
      }

      return "normal";
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
      text === "on"
    ) {
      return "premium";
    }

    return "normal";
  };

  const hasPremiumField = (value) => {
    if (!value || typeof value !== "object") {
      return false;
    }

    return (
      Object.prototype.hasOwnProperty.call(value, "premium") ||
      Object.prototype.hasOwnProperty.call(value, "isPremium") ||
      Object.prototype.hasOwnProperty.call(value, "premiumActive") ||
      Object.prototype.hasOwnProperty.call(value, "premiumType")
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

  const normalizeImageSrc = (value) => {
    const text = String(value || "").trim();

    if (!text) {
      return "";
    }

    if (text === "undefined" || text === "null" || text === "[object Object]") {
      return "";
    }

    if (text.includes("[object Object]")) {
      return "";
    }

    if (text.startsWith("data:image/")) {
      return text.includes(";base64,") ? text : "";
    }

    if (text.startsWith("blob:")) {
      return text;
    }

    if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("/")) {
      if (isBareBase64Image(text)) {
        return `data:image/jpeg;base64,${text}`;
      }

      return text;
    }

    if (isBareBase64Image(text)) {
      return `data:image/jpeg;base64,${text}`;
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

    return result.filter((item, index, array) => array.indexOf(item) === index);
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

    const arrayImages = [
      ...makeSafeArray(shop?.images),
      ...makeSafeArray(shop?.photos),
      ...makeSafeArray(shop?.imageUrls),
      ...makeSafeArray(shop?.gallery),
      ...makeSafeArray(shop?.pictures),
      ...makeSafeArray(shop?.files),
    ];

    const singleImages = [
      ...makeSafeArray(shop?.representativeImage),
      ...makeSafeArray(shop?.mainImage),
      ...makeSafeArray(shop?.thumbnail),
      ...makeSafeArray(shop?.coverImage),
      ...makeSafeArray(shop?.image),
      ...makeSafeArray(shop?.imageUrl),
      ...makeSafeArray(shop?.photo),
      ...makeSafeArray(shop?.picture),
    ];

    const safeArrayImages = Array.from(
      new Set(arrayImages.map((image) => normalizeImageSrc(image)).filter(Boolean))
    );

    const safeSingleImages = Array.from(
      new Set(singleImages.map((image) => normalizeImageSrc(image)).filter(Boolean))
    );

    const rawImages =
      safeArrayImages.length > 1
        ? [...safeArrayImages, ...safeSingleImages]
        : [...safeSingleImages, ...safeArrayImages];

    return Array.from(new Set(rawImages.map((image) => normalizeImageSrc(image)).filter(Boolean)));
  };

  const getStorageSafeImages = (shop) => {
    return makeSafeImages(shop)
      .filter((image) => {
        const text = String(image || "");

        if (!text) {
          return false;
        }

        if (text.startsWith("blob:")) {
          return false;
        }

        if (text.length > MAX_LOCAL_IMAGE_LENGTH) {
          return false;
        }

        return true;
      })
      .slice(0, MAX_LOCAL_IMAGE_COUNT);
  };

  const hasImageField = (value) => {
    if (!value || typeof value !== "object") {
      return false;
    }

    return makeSafeImages(value).length > 0;
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
      return [];
    }

    return Array.from(
      new Set(
        [
          shop._id,
          shop.id,
          shop.shopId,
          shop.name && shop.address ? `${normalizeText(shop.name)}::${normalizeText(shop.address)}` : "",
        ]
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    );
  };

  const readDeletedShopIds = () => {
    try {
      const localSaved = JSON.parse(localStorage.getItem(DELETED_SHOP_KEY) || "[]");
      const sessionSaved = JSON.parse(sessionStorage.getItem(DELETED_SHOP_KEY) || "[]");

      return Array.from(
        new Set([
          ...(Array.isArray(localSaved) ? localSaved : []),
          ...(Array.isArray(sessionSaved) ? sessionSaved : []),
        ].map((item) => String(item || "").trim()).filter(Boolean))
      );
    } catch (e) {
      return [];
    }
  };

  const writeDeletedShopIds = (ids) => {
    try {
      const safeIds = Array.from(
        new Set((Array.isArray(ids) ? ids : []).map((item) => String(item || "").trim()).filter(Boolean))
      );

      const storageText = JSON.stringify(safeIds);

      localStorage.setItem(DELETED_SHOP_KEY, storageText);
      sessionStorage.setItem(DELETED_SHOP_KEY, storageText);
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

  const hasSafeText = (value) => String(value || "").trim().length > 0;

  const pickStableText = (baseValue, nextValue) => {
    if (hasSafeText(nextValue)) {
      return nextValue;
    }

    return baseValue || "";
  };

  const mergeShopRecord = (baseShop, nextShop) => {
    const base = baseShop || {};
    const next = nextShop || {};

    const baseArrayImages = Array.from(
      new Set(
        [
          ...makeSafeArray(base?.images),
          ...makeSafeArray(base?.photos),
          ...makeSafeArray(base?.imageUrls),
          ...makeSafeArray(base?.gallery),
          ...makeSafeArray(base?.pictures),
        ]
          .map((image) => normalizeImageSrc(image))
          .filter(Boolean)
      )
    );

    const nextArrayImages = Array.from(
      new Set(
        [
          ...makeSafeArray(next?.images),
          ...makeSafeArray(next?.photos),
          ...makeSafeArray(next?.imageUrls),
          ...makeSafeArray(next?.gallery),
          ...makeSafeArray(next?.pictures),
        ]
          .map((image) => normalizeImageSrc(image))
          .filter(Boolean)
      )
    );

    const baseImages = baseArrayImages.length ? baseArrayImages : makeSafeImages(base);
    const nextImages = nextArrayImages.length ? nextArrayImages : makeSafeImages(next);

    const replaceImages = next?.__replaceImages === true;

    const preferredImages = replaceImages
      ? nextImages
      : baseImages.length >= nextImages.length
      ? baseImages
      : nextImages;

    const fallbackImages = replaceImages
      ? nextImages.map((image) => normalizeImageSrc(image)).filter(Boolean)
      : Array.from(
          new Set(
            [
              ...preferredImages,
              ...baseImages,
              ...nextImages,
            ]
              .map((image) => normalizeImageSrc(image))
              .filter(Boolean)
          )
        );

    const fixedImages = preferredImages.length
      ? preferredImages.map((image) => normalizeImageSrc(image)).filter(Boolean)
      : fallbackImages;

    const baseCourses = makeSafeCourses(base);
    const nextCourses = makeSafeCourses(next);
    const mergedCourses = nextCourses.length ? nextCourses : baseCourses;

    const basePrice = makeSafePrice(base);
    const nextPrice = makeSafePrice(next);
    const mergedPrice = nextPrice.length ? nextPrice : basePrice;

    const baseCoursePricing = makeSafeCoursePricing(base);
    const nextCoursePricing = makeSafeCoursePricing(next);
    const mergedCoursePricing =
      next?.coursePricing ||
      next?.priceTable ||
      next?.pricing ||
      next?.courseSections ||
      next?.menuPrices ||
      next?.menus ||
      next?.courseMenus
        ? nextCoursePricing
        : baseCoursePricing;

    const representativeCandidate = normalizeImageSrc(
      base.representativeImage ||
        base.mainImage ||
        base.thumbnail ||
        base.coverImage ||
        next.representativeImage ||
        next.mainImage ||
        next.thumbnail ||
        next.coverImage ||
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
    const premium = hasPremiumField(next)
      ? normalizePremiumType(next)
      : normalizePremiumType(base);

    return normalizeShopForList({
      ...base,
      ...next,
      _id: nextId || baseId,
      id: nextId || baseId,
      name: pickStableText(base.name, next.name),
      address: pickStableText(base.address, next.address || next.roadAddress || next.fullAddress),
      roadAddress: pickStableText(base.roadAddress || base.address, next.roadAddress || next.address || next.fullAddress),
      fullAddress: pickStableText(base.fullAddress || base.address, next.fullAddress || next.address || next.roadAddress),
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

  const getShopImageBankKey = (shop) => {
    if (!shop || typeof shop !== "object") {
      return "";
    }

    const id = String(shop._id || shop.id || shop.shopId || "").trim();
    const name = normalizeText(shop.name);
    const address = normalizeText(shop.address || shop.roadAddress || shop.fullAddress);

    return id || (name && address ? `${name}::${address}` : "");
  };

  const getShopImageBankKeys = (shop) => {
    if (!shop || typeof shop !== "object") {
      return [];
    }

    const id = String(shop._id || shop.id || shop.shopId || "").trim();
    const name = normalizeText(shop.name);
    const address = normalizeText(shop.address || shop.roadAddress || shop.fullAddress);
    const nameAddressKey = name && address ? `${name}::${address}` : "";

    return Array.from(new Set([id, nameAddressKey].filter(Boolean)));
  };

  const readShopImageBank = () => {
    try {
      const localSaved = JSON.parse(localStorage.getItem(LOCAL_SHOP_IMAGE_BANK_KEY) || "{}");
      const sessionSaved = JSON.parse(sessionStorage.getItem(LOCAL_SHOP_IMAGE_BANK_KEY) || "{}");

      return {
        ...(localSaved && typeof localSaved === "object" && !Array.isArray(localSaved) ? localSaved : {}),
        ...(sessionSaved && typeof sessionSaved === "object" && !Array.isArray(sessionSaved) ? sessionSaved : {}),
      };
    } catch (e) {
      return {};
    }
  };

  const writeShopImageBank = (items, options = {}) => {
    try {
      const currentBank = readShopImageBank();
      const replace =
        options?.replace === true ||
        (Array.isArray(items) ? items : []).some((item) => item?.__replaceImages === true);
      const nextBank = replace ? { ...currentBank } : {};

      (Array.isArray(items) ? items : []).forEach((item) => {
        const normalized = item && typeof item === "object" ? item : null;

        if (!normalized) {
          return;
        }

        const keys = getShopImageBankKeys(normalized);
        const images = makeSafeImages(normalized).filter((image) => !String(image || "").startsWith("blob:"));

        if (!keys.length || !images.length) {
          return;
        }

        keys.forEach((key) => {
          const currentImages = !replace && Array.isArray(nextBank[key]) ? nextBank[key] : [];
          const fixedImages = replace
            ? images.map((image) => normalizeImageSrc(image)).filter(Boolean)
            : Array.from(
                new Set([...currentImages, ...images].map((image) => normalizeImageSrc(image)).filter(Boolean))
              );

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
            ? nextImages.map((image) => normalizeImageSrc(image)).filter(Boolean)
            : Array.from(
                new Set([...nextImages, ...currentImages].map((image) => normalizeImageSrc(image)).filter(Boolean))
              );
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
    const keys = getShopImageBankKeys(shop);
    const bankImages = Array.from(
      new Set(
        keys
          .flatMap((key) => (Array.isArray(bank[key]) ? bank[key] : []))
          .map((image) => normalizeImageSrc(image))
          .filter(Boolean)
      )
    );

    const currentImages = makeSafeImages(shop);
    const fixedImages = shop?.__replaceImages === true
      ? currentImages.map((image) => normalizeImageSrc(image)).filter(Boolean)
      : Array.from(
          new Set([...bankImages, ...currentImages].map((image) => normalizeImageSrc(image)).filter(Boolean))
        );

    if (!fixedImages.length) {
      return shop;
    }

    const representativeImage = normalizeImageSrc(
      shop.representativeImage ||
        shop.mainImage ||
        shop.thumbnail ||
        shop.coverImage ||
        fixedImages[0] ||
        ""
    );

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
          ]).map((item) => applyShopImageBank(item))
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

    return {
      ...normalized,
      images: [],
      photos: [],
      imageUrls: [],
      gallery: [],
      pictures: [],
      files: [],
      image: "",
      imageUrl: "",
      photo: "",
      picture: "",
      representativeImage: "",
      mainImage: "",
      thumbnail: "",
      coverImage: "",
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

      return filterCurrentCategoryShops(
        filterDeletedShops(
          mergeShopList([
            ...parseStorageItems(localStorage, LOCAL_SHOP_BACKUP_KEY),
            ...parseStorageItems(sessionStorage, LOCAL_SHOP_BACKUP_KEY),
            ...parseStorageItems(localStorage, `nora_admin_shop_backup_${currentAdminCategory}`),
            ...parseStorageItems(sessionStorage, `nora_admin_shop_backup_${currentAdminCategory}`),
          ]).map((item) => applyShopImageBank(item))
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
        mirrorKeys.push(
          `nora_admin_shop_image_bank_${currentAdminCategory}`,
          `noma_admin_shop_image_bank_${currentAdminCategory}`
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

  const dispatchShopStorageEvent = (shops) => {
    try {
      window.setTimeout(() => {
        try {
          window.dispatchEvent(
            new CustomEvent("shops-updated", {
              detail: {
                shops,
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
                  deleted: DELETED_SHOP_KEY,
                },
              },
            })
          );

          window.dispatchEvent(
            new CustomEvent("karaoke-shops-updated", {
              detail: {
                shops,
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
                  deleted: DELETED_SHOP_KEY,
                },
              },
            })
          );

          window.dispatchEvent(new Event("storage"));
        } catch (e) {
          console.warn("SHOP STORAGE EVENT SKIP:", e.message);
        }
      }, 0);
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

      writeShopImageBank(normalizedItems);
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

  const normalizeShopForList = (shop) => {
    if (!shop || typeof shop !== "object") {
      return null;
    }

    const arrayImages = Array.from(
      new Set(
        [
          ...makeSafeArray(shop?.images),
          ...makeSafeArray(shop?.photos),
          ...makeSafeArray(shop?.imageUrls),
          ...makeSafeArray(shop?.gallery),
          ...makeSafeArray(shop?.pictures),
          ...makeSafeArray(shop?.files),
        ]
          .map((image) => normalizeImageSrc(image))
          .filter(Boolean)
      )
    );

    const singleImages = Array.from(
      new Set(
        [
          ...makeSafeArray(shop?.representativeImage),
          ...makeSafeArray(shop?.mainImage),
          ...makeSafeArray(shop?.thumbnail),
          ...makeSafeArray(shop?.coverImage),
          ...makeSafeArray(shop?.image),
          ...makeSafeArray(shop?.imageUrl),
          ...makeSafeArray(shop?.photo),
          ...makeSafeArray(shop?.picture),
        ]
          .map((image) => normalizeImageSrc(image))
          .filter(Boolean)
      )
    );

    const images =
      arrayImages.length > 1
        ? arrayImages
        : Array.from(new Set([...arrayImages, ...singleImages].map((image) => normalizeImageSrc(image)).filter(Boolean)));

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
      ? images.map((image) => normalizeImageSrc(image)).filter(Boolean)
      : representativeImage
      ? [representativeImage]
      : [];

    const id =
      shop._id ||
      shop.id ||
      shop.shopId ||
      `local-shop-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const premium = normalizePremiumType(shop);
    const coursePricing = filterCompleteCoursePricing(makeSafeCoursePricing(shop));

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
      address: shop.address || shop.roadAddress || shop.fullAddress || "주소 없음",
      roadAddress: shop.roadAddress || shop.address || shop.fullAddress || "주소 없음",
      fullAddress: shop.fullAddress || shop.address || shop.roadAddress || "주소 없음",
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
      premium,
      premiumType: premium,
      isPremium: premium !== "normal",
      premiumActive: premium !== "normal",
      visible: shop.visible === false ? false : true,
      approved: shop.approved === false ? false : true,
      isReservable: shop.isReservable === false ? false : true,
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

  const compressImageFile = (file) =>
    new Promise((resolve) => {
      try {
        const reader = new FileReader();

        reader.onload = () => {
          try {
            const img = new Image();

            img.onload = () => {
              try {
                const maxSize = 640;
                const width = Number(img.width || 0);
                const height = Number(img.height || 0);
                const ratio = width && height ? Math.min(1, maxSize / Math.max(width, height)) : 1;
                const canvas = document.createElement("canvas");

                canvas.width = Math.max(1, Math.round(width * ratio));
                canvas.height = Math.max(1, Math.round(height * ratio));

                const ctx = canvas.getContext("2d");

                if (!ctx) {
                  resolve(normalizeImageSrc(String(reader.result || "")));
                  return;
                }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const compressed = canvas.toDataURL("image/jpeg", 0.52);
                const safeCompressed = normalizeImageSrc(compressed);
                const original = normalizeImageSrc(String(reader.result || ""));

                resolve(safeCompressed || original);
              } catch (e) {
                resolve(normalizeImageSrc(String(reader.result || "")));
              }
            };

            img.onerror = () => {
              resolve(normalizeImageSrc(String(reader.result || "")));
            };

            img.src = String(reader.result || "");
          } catch (e) {
            resolve(normalizeImageSrc(String(reader.result || "")));
          }
        };

        reader.onerror = () => {
          resolve("");
        };

        reader.readAsDataURL(file);
      } catch (e) {
        resolve("");
      }
    });

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
    try {
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
          }, 1200);
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

    const fixedImages = representativeImage
      ? Array.from(new Set([representativeImage, ...form.images].map((image) => normalizeImageSrc(image)).filter(Boolean)))
      : form.images.map((image) => normalizeImageSrc(image)).filter(Boolean);

    const premiumType = normalizePremiumType(form.premium);
    const premiumBoolean = premiumType !== "normal";
    const coursePricing = completeCoursePricing;

    return {
      category: currentAdminCategory,
      shopCategory: currentAdminCategory,
      serviceType: currentAdminCategory,
      businessType: currentAdminCategory,
      adminCategory: currentAdminCategory,
      name: form.name,
      address: form.address,
      roadAddress: form.address,
      fullAddress: form.address,
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
      isPremium: premiumBoolean,
      premiumActive: premiumBoolean,
      visible: true,
      approved: true,
      isReservable: true,
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
    const images = makeSafeImages(shop);

    const representativeImage =
      normalizeImageSrc(
        shop?.representativeImage ||
          shop?.mainImage ||
          shop?.thumbnail ||
          shop?.coverImage ||
          images[0] ||
          ""
      );

    const fixedImages = representativeImage
      ? Array.from(new Set([representativeImage, ...images].map((image) => normalizeImageSrc(image)).filter(Boolean)))
      : images.map((image) => normalizeImageSrc(image)).filter(Boolean);

    const premium = normalizePremiumType(shop);
    const coursePricing = filterCompleteCoursePricing(makeSafeCoursePricing(shop));

    return {
      ...shop,
      category: getShopCategory(shop) || currentAdminCategory,
      shopCategory: getShopCategory(shop) || currentAdminCategory,
      serviceType: getShopCategory(shop) || currentAdminCategory,
      businessType: getShopCategory(shop) || currentAdminCategory,
      adminCategory: getShopCategory(shop) || currentAdminCategory,
      status,
      premium,
      premiumType: premium,
      isPremium: premium !== "normal",
      premiumActive: premium !== "normal",
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

    return filterCurrentCategoryShops(list).filter((shop) => {
      const name = normalizeText(shop?.name);
      const address = normalizeText(shop?.address);
      const phone = normalizeText(shop?.phone);
      const businessHours = normalizeText(shop?.businessHours);
      const shopRegion = normalizeText(shop?.region);
      const shopDistrict = normalizeText(shop?.district);
      const roadAddress = normalizeText(shop?.roadAddress);

      const searchTarget = `${name}${address}${phone}${businessHours}${shopRegion}${shopDistrict}${roadAddress}`;

      const keywordOk = !safeKeyword || searchTarget.includes(safeKeyword);

      const regionOk =
        !safeRegion ||
        shopRegion.includes(safeRegion) ||
        address.includes(safeRegion) ||
        roadAddress.includes(safeRegion) ||
        (!!safeDistrict && (address.includes(safeDistrict) || roadAddress.includes(safeDistrict) || shopDistrict.includes(safeDistrict)));

      const districtOk =
        !safeDistrict ||
        shopDistrict.includes(safeDistrict) ||
        address.includes(safeDistrict) ||
        roadAddress.includes(safeDistrict);

      return keywordOk && regionOk && districtOk;
    });
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const localItems = filterDeletedShops(mergeShopList([
        ...readBackupShops(),
        ...readLocalShops(),
      ]));

      if (localItems.length) {
        setList(localItems);
      }

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            items: localItems,
          });
        }, 2500);
      });

      const res = await Promise.race([shopApi.getList(currentAdminCategoryParams), timeoutPromise]);
      const rawApiItems = filterCurrentCategoryShops(filterDeletedShops(extractShopItems(res))).map((item) => applyShopImageBank(item));

      const apiItems = rawApiItems.map((apiItem) => {
        const apiId = String(apiItem?._id || apiItem?.id || apiItem?.shopId || "");
        const apiNameAddressKey = `${normalizeText(apiItem?.name)}::${normalizeText(apiItem?.address || apiItem?.roadAddress || apiItem?.fullAddress)}`;

        const localMatch = localItems.find((localItem) => {
          const localId = String(localItem?._id || localItem?.id || localItem?.shopId || "");
          const localNameAddressKey = `${normalizeText(localItem?.name)}::${normalizeText(localItem?.address || localItem?.roadAddress || localItem?.fullAddress)}`;

          return (
            (apiId && localId && apiId === localId) ||
            (apiNameAddressKey && localNameAddressKey && apiNameAddressKey === localNameAddressKey)
          );
        });

        const localImages = localMatch ? makeSafeImages(localMatch) : [];

        if (!localMatch || !localImages.length) {
          return applyShopImageBank(apiItem);
        }

        const representativeImage = normalizeImageSrc(
          localMatch.representativeImage ||
            localMatch.mainImage ||
            localMatch.thumbnail ||
            localMatch.coverImage ||
            localImages[0] ||
            ""
        );

        const fixedImages = representativeImage
          ? Array.from(new Set([representativeImage, ...localImages].map((image) => normalizeImageSrc(image)).filter(Boolean)))
          : localImages.map((image) => normalizeImageSrc(image)).filter(Boolean);

        return {
          ...apiItem,
          images: fixedImages,
          photos: fixedImages,
          imageUrls: fixedImages,
          gallery: fixedImages,
          pictures: fixedImages,
          files: [],
          representativeImage,
          mainImage: representativeImage,
          thumbnail: representativeImage,
          coverImage: representativeImage,
          image: representativeImage,
          imageUrl: representativeImage,
          photo: representativeImage,
          picture: representativeImage,
        };
      });

      const nextList = filterDeletedShops(
        mergeShopList([
          ...localItems,
          ...apiItems,
        ])
      );

      if (nextList.length) {
        saveLocalShops(nextList);
        setList(nextList);
      } else {
        const backupItems = readBackupShops();

        if (backupItems.length) {
          saveLocalShops(backupItems);
          setList(backupItems);
        } else {
          setList(localItems);
        }
      }

      loadStats();
    } catch (e) {
      console.error("SHOP LOAD ERROR:", e.message);
      setError(e.message || "업체 목록 로딩 실패");

      const localItems = filterDeletedShops(mergeShopList([
        ...readBackupShops(),
        ...readLocalShops(),
      ]));

      if (localItems.length) {
        saveLocalShops(localItems);
      }

      setList(localItems);
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
  }, [initialized, currentAdminCategory]);

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

      const localItems = mergeShopList([
        ...readBackupShops(),
        ...readLocalShops(),
      ]);

      const res = await Promise.race([
        shopApi.getList(currentAdminCategoryParams),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              items: localItems,
            });
          }, 2500);
        }),
      ]);

      const items = filterCurrentCategoryShops(filterDeletedShops(extractShopItems(res))).map((item) => applyShopImageBank(item));

      setList((prev) => {
        const nextList = filterDeletedShops(mergeShopList([
          ...prev,
          ...items,
          ...localItems,
        ]));

        if (nextList.length) {
          saveLocalShops(nextList);
        }

        return nextList;
      });

      loadStats();
    } catch (e) {
      const localItems = mergeShopList([
        ...readBackupShops(),
        ...readLocalShops(),
      ]);

      setList((prev) => mergeShopList([...prev, ...localItems]));

      if (!localItems.length) {
        setError(e.message || "업체 검색 실패");
      }
    } finally {
      setLoading(false);
    }
  };

  const onAddImages = async (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) {
      return;
    }

    const imageFiles = files.filter((file) => {
      return file && String(file.type || "").startsWith("image/");
    });

    if (!imageFiles.length) {
      e.target.value = "";
      return;
    }

    const compressedImages = [];

    for (const file of imageFiles.slice(0, MAX_LOCAL_IMAGE_COUNT)) {
      const image = await compressImageFile(file);

      if (image) {
        compressedImages.push(image);
      }
    }

    if (compressedImages.length) {
      setForm((prev) => {
        const nextImages = Array.from(new Set([...prev.images, ...compressedImages].map((image) => normalizeImageSrc(image)).filter(Boolean))).slice(0, MAX_LOCAL_IMAGE_COUNT);

        return {
          ...prev,
          images: nextImages,
          representativeImage: prev.representativeImage || nextImages[0] || "",
        };
      });
    }

    e.target.value = "";
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

  const onCreate = () => {
    try {
      if (!form.name.trim()) {
        alert("업체명 필요");
        return;
      }

      if (!form.address.trim()) {
        alert("주소 필요");
        return;
      }

      setError("");

      const payload = getSubmitPayload();

      const tempId = `local-${currentAdminCategory}-shop-${Date.now()}`;

      const optimisticShop = normalizeShopForList({
        ...payload,
        _id: tempId,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      writeShopImageBank([optimisticShop]);
      saveBackupShops([optimisticShop]);

      forgetDeletedShop(optimisticShop);

      setList((prev) => {
        const nextList = mergeShopList(prev, optimisticShop);

        saveLocalShops(nextList);

        return nextList;
      });

      setForm({
        ...EMPTY_FORM,
        coursePricing: cloneCoursePricing(),
      });
      setSubmitting(false);
      setLoading(false);

      alert("업체 생성 완료");

      Promise.resolve()
        .then(async () => {
          try {
            const res = await shopApi.create(payload);

            const serverShop =
              res?.shop ||
              res?.item ||
              (res?.data && !Array.isArray(res.data) ? res.data : null) ||
              {};

            const createdShop = mergeShopRecord(
              optimisticShop,
              {
                ...serverShop,
                ...payload,
                _id: serverShop?._id || serverShop?.id || optimisticShop._id,
                id: serverShop?._id || serverShop?.id || optimisticShop.id,
                name: payload.name,
                address: payload.address,
                roadAddress: payload.address,
                fullAddress: payload.address,
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
                isPremium: payload.isPremium,
                premiumActive: payload.premiumActive,
              }
            );

            setList((prev) => {
              const withoutTemp = prev.filter((item) => {
                const itemId = String(item?._id || item?.id || "");

                return itemId !== String(tempId);
              });

              const nextList = mergeShopList(withoutTemp, createdShop);

              saveLocalShops(nextList);

              return nextList;
            });
          } catch (e) {
            console.warn("SHOP CREATE BACKGROUND SAVE SKIP:", e.message);

            setList((prev) => {
              const nextList = mergeShopList(prev, optimisticShop);

              saveLocalShops(nextList);

              return nextList;
            });
          }

          loadStats();
        });
    } catch (e) {
      setError(e.message || "업체 생성 실패");
      setSubmitting(false);
      setLoading(false);
    }
  };

  const onEdit = (shop) => {
    const images = makeSafeImages(shop);

    const representativeImage =
      normalizeImageSrc(
        shop?.representativeImage ||
          shop?.mainImage ||
          shop?.thumbnail ||
          shop?.coverImage ||
          images[0] ||
          ""
      );

    setEditingId(shop?._id || shop?.id || "");

    setForm({
      name: shop?.name || "",
      address: shop?.address || "",
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
      images: images.slice(0, MAX_LOCAL_IMAGE_COUNT),
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

      const payload = getSubmitPayload();

      const currentShop =
        list.find((item) => String(item?._id || item?.id || "") === String(editingId)) ||
        readLocalShops().find((item) => String(item?._id || item?.id || "") === String(editingId)) ||
        {};

      const optimisticUpdatedShop = normalizeShopForList({
        ...currentShop,
        ...payload,
        __replaceImages: true,
        _id: currentShop?._id || editingId,
        id: currentShop?.id || editingId,
        address: payload.address,
        roadAddress: payload.address,
        fullAddress: payload.address,
        updatedAt: new Date().toISOString(),
      });

      writeShopImageBank([optimisticUpdatedShop], { replace: true });

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

      const res = await shopApi.update(editingId, payload, currentAdminCategoryParams);

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
          _id: serverUpdatedShop?._id || serverUpdatedShop?.id || optimisticUpdatedShop._id || editingId,
          id: serverUpdatedShop?._id || serverUpdatedShop?.id || optimisticUpdatedShop.id || editingId,
          name: payload.name,
          address: payload.address,
          roadAddress: payload.address,
          fullAddress: payload.address,
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
          isPremium: payload.isPremium,
          premiumActive: payload.premiumActive,
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

      setTimeout(async () => {
        try {
          const localItems = mergeShopList([
        ...readBackupShops(),
        ...readLocalShops(),
      ]);

          const listRes = await Promise.race([
            shopApi.getList(currentAdminCategoryParams),
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  items: localItems,
                });
              }, 900);
            }),
          ]);

          const loadedItems = filterCurrentCategoryShops(filterDeletedShops(extractShopItems(listRes))).map((item) => applyShopImageBank(item));

          setList((prev) => {
            const nextList = filterDeletedShops(
              mergeShopList([
                ...loadedItems.filter((item) => String(item?._id || item?.id || "") !== String(editingId)),
                ...prev.filter((item) => String(item?._id || item?.id || "") !== String(editingId)),
                ...localItems.filter((item) => String(item?._id || item?.id || "") !== String(editingId)),
                updatedShop,
              ])
            );

            writeShopImageBank([updatedShop], { replace: true });
            saveLocalShops(nextList);

            return nextList;
          });
        } catch (e) {
          console.warn("SHOP UPDATE RELOAD SKIP:", e.message);

          setList((prev) => {
            const nextList = filterDeletedShops(
              mergeShopList([
                ...prev.filter((item) => String(item?._id || item?.id || "") !== String(editingId)),
                ...readLocalShops().filter((item) => String(item?._id || item?.id || "") !== String(editingId)),
                updatedShop,
              ])
            );

            writeShopImageBank([updatedShop], { replace: true });
            saveLocalShops(nextList);

            return nextList;
          });
        }

        loadStats();
      }, 50);
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

      const beforeList = filterDeletedShops(mergeShopList([...list, ...readLocalShops()]));
      const targetShop =
        beforeList.find((item) => String(item?._id || item?.id || "") === deleteId) ||
        null;

      rememberDeletedShop(targetShop || deleteId);

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

      setTimeout(async () => {
        try {
          const localItems = mergeShopList([
        ...readBackupShops(),
        ...readLocalShops(),
      ]);

          if (isLocalShopId(deleteId)) {
            setList((prev) => {
              const filtered = filterDeletedShops(mergeShopList([...prev, ...localItems])).filter((item) => {
                const itemId = String(item?._id || item?.id || "");

                return itemId !== deleteId;
              });

              saveLocalShops(filtered);

              return filtered;
            });

            loadStats();
            return;
          }

          const listRes = await Promise.race([
            shopApi.getList(currentAdminCategoryParams),
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  items: localItems,
                });
              }, 2500);
            }),
          ]);

          const loadedItems = filterCurrentCategoryShops(filterDeletedShops(extractShopItems(listRes))).map((item) => applyShopImageBank(item)).filter((item) => {
            const itemId = String(item?._id || item?.id || item?.shopId || "");

            return itemId !== deleteId;
          });

          setList((prev) => {
            const filtered = filterDeletedShops(mergeShopList([...prev, ...loadedItems, ...localItems])).filter((item) => {
              const itemId = String(item?._id || item?.id || "");

              return itemId !== deleteId;
            });

            saveLocalShops(filtered);

            return filtered;
          });
        } catch (e) {
          console.warn("SHOP DELETE RELOAD SKIP:", e.message);

          setList((prev) => {
            const filtered = filterDeletedShops(mergeShopList([...prev, ...readLocalShops()])).filter((item) => {
              const itemId = String(item?._id || item?.id || "");

              return itemId !== deleteId;
            });

            saveLocalShops(filtered);

            return filtered;
          });
        }

        loadStats();
      }, 50);

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
          premium: payload.premium,
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

  if (loading) {
    return <Loading message="업체 목록 로딩 중..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={load} />;
  }

  return (
    <AdminLayout title={pageTitle}>
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
              사진 장수 제한 없음 / 원본 사이즈 저장 / 아래 미리보기에서 대표 사진 선택
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
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
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

          {!!form.courses.length && (
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

          {!!form.price.length && (
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
            name="status"
            value={form.status}
            onChange={onChange}
            style={styles.input}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
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
              const bankFixedShop = applyShopImageBank(shop);
              const shopImages = Array.from(
                new Set(
                  makeSafeImages(bankFixedShop)
                    .map((image) => normalizeImageSrc(image))
                    .filter(Boolean)
                )
              );

              const representativeImage =
                normalizeImageSrc(
                  bankFixedShop?.representativeImage ||
                    bankFixedShop?.mainImage ||
                    bankFixedShop?.thumbnail ||
                    bankFixedShop?.coverImage ||
                    shopImages[0] ||
                    ""
                );

              const orderedImages = representativeImage
                ? [
                    representativeImage,
                    ...shopImages.filter((image) => image !== representativeImage),
                  ]
                : shopImages;

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

              return (
                <div key={shop?._id || shop?.id || shop?.name}>
                  <div style={{ ...styles.card, ...(!businessOpen ? styles.closedShopCard : {}) }}>
                    {!!orderedImages.length && (
                      <div style={styles.cardImages}>
                        {orderedImages.map((image, index) => {
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
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />

                              {index === 0 && (
                                <div style={styles.cardRepresentativeBadge}>
                                  대표
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
                          {shop?.address || "주소 없음"}
                        </div>
                      </div>

                      <div
                        style={{
                          ...styles.status,
                          color:
                            shop?.status === "inactive"
                              ? "#ff9800"
                              : "#4caf50",
                        }}
                      >
                        {shop?.status || "active"}
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

                    <div style={styles.section}>
                      <strong>추가 코스:</strong>{" "}
                      {form.courses.length || makeSafeCourses(shop).length
                        ? makeSafeCourses(shop).join(", ")
                        : "-"}
                    </div>

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

                      <button
                        style={styles.statusBtn}
                        onClick={() =>
                          onStatus(
                            shop?._id || shop?.id,
                            shop?.status === "active" ? "inactive" : "active",
                            shop
                          )
                        }
                        disabled={submitting}
                      >
                        {shop?.status === "active" ? "비활성화" : "활성화"}
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
    </AdminLayout>
  );
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
