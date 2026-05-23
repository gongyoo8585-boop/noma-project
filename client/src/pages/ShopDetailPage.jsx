"use strict";

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import shopApi from "../services/shop.api";
import reviewApi from "../services/review.api";

import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

const GOLD = "#ffd400";
const GOLD_DARK = "#a77c00";
const PINK = "#ff006e";

const LOCAL_SHOP_KEY = "noma_admin_shops";
const LOCAL_PUBLIC_SHOP_KEY = "noma_local_shops";
const LOCAL_SHOP_IMAGE_BANK_KEY = "noma_admin_shop_image_bank";
const SELECTED_SHOP_KEY = "noma_selected_shop";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000";

const FALLBACK_SHOP = {
  _id: "local-noma-detail",
  id: "local-noma-detail",
  name: "오로라타이테라피 (김해)",
  address: "경상남도 김해시 내외중앙로 27",
  roadAddress: "경상남도 김해시 내외중앙로 27",
  locationText: "경상남도 김해시 내외중앙로 27",
  phone: "0507-1858-6182",
  virtualPhone: "0507-1858-6182",
  businessHours: "오전 11시 ~ 다음날 새벽 4시 영업",
  roadInfo: "수로왕릉역 1번 출구 도보 8분",
  status: "active",
  premium: false,
  isPremium: false,
  rating: 4.8,
  reviewCount: 467,
  distance: "3.2km",
  courses: ["타이 관리 60분", "타이 관리 90분", "타이 관리 120분", "아로마 관리 60분", "아로마 관리 90분", "아로마 관리 120분"],
  price: [35000, 45000, 0, 45000, 55000, 100000],
  originalPrice: [60000, 80000, 0, 80000, 100000, 160000],
  images: [],
  photos: [],
  imageUrls: [],
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80",
];

function ShopDetailPage({ shopId, navigate }) {
  const params = useParams();
  const location = useLocation();
  const routerNavigate = useNavigate();

  const finalNavigate = navigate || routerNavigate;
  const finalShopId = shopId || params.id || params.shopId || "";

  const [shop, setShop] = useState(location?.state?.shop || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("price");

  const getImageValue = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object") {
      return (
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
  };

  const normalizeImageUrl = (value) => {
    const imageValue = getImageValue(value);

    if (!imageValue) {
      return "";
    }

    if (
      imageValue.startsWith("http://") ||
      imageValue.startsWith("https://") ||
      imageValue.startsWith("data:") ||
      imageValue.startsWith("blob:")
    ) {
      return imageValue;
    }

    if (imageValue.startsWith("//")) {
      return `${window.location.protocol}${imageValue}`;
    }

    if (imageValue.startsWith("/")) {
      return `${API_BASE_URL}${imageValue}`;
    }

    return `${API_BASE_URL}/${imageValue}`;
  };

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s/g, "")
      .trim();

  const isKaraokeShop = (value = {}) => {
    const typeText = String(
      value?.type ||
        value?.category ||
        value?.businessType ||
        value?.serviceType ||
        ""
    )
      .toLowerCase()
      .replace(/\s/g, "")
      .trim();

    const titleText = normalizeText(
      value?.name ||
        value?.shopName ||
        value?.title ||
        ""
    );

    return (
      typeText.includes("karaoke") ||
      typeText.includes("노래") ||
      typeText.includes("가라오케") ||
      titleText.includes("노래") ||
      titleText.includes("가라오케") ||
      titleText.includes("파티룸")
    );
  };

  const isMassageShop = (value = {}) => !isKaraokeShop(value);

  const getShopIdentityKeys = (value = {}) => {
    const id = String(value?._id || value?.id || value?.shopId || "").trim();
    const name = normalizeText(value?.name || value?.shopName || value?.title);
    const address = normalizeText(value?.address || value?.roadAddress || value?.fullAddress || value?.locationText);
    const nameAddressKey = name && address ? `${name}::${address}` : "";

    return Array.from(new Set([id, nameAddressKey].filter(Boolean)));
  };

  const getFixedRoadInfo = (value = {}) => {
    const id = String(value?._id || value?.id || value?.shopId || "").trim();
    const address = normalizeText(
      value?.address ||
        value?.roadAddress ||
        value?.fullAddress ||
        value?.locationText
    );

    if (
      id === "local-shop-1779096584552" ||
      address.includes("김해시삼계동1479-2") ||
      address.includes("경상남도김해시삼계동1479-2")
    ) {
      return "장신대역 인근 · 김해시 삼계동 1479-2";
    }

    return (
      value.roadInfo ||
      value.access ||
      value.direction ||
      FALLBACK_SHOP.roadInfo
    );
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

  const collectShopImages = (value = {}) => {
    const arrayCandidates = [];
    const singleCandidates = [];

    const pushImageValue = (target, item) => {
      if (!item) return;

      if (Array.isArray(item)) {
        item.forEach((child) => pushImageValue(target, child));
        return;
      }

      target.push(getImageValue(item));
    };

    pushImageValue(arrayCandidates, value?.images);
    pushImageValue(arrayCandidates, value?.photos);
    pushImageValue(arrayCandidates, value?.imageUrls);
    pushImageValue(arrayCandidates, value?.gallery);
    pushImageValue(arrayCandidates, value?.pictures);
    pushImageValue(arrayCandidates, value?.files);

    pushImageValue(singleCandidates, value?.representativeImage);
    pushImageValue(singleCandidates, value?.mainImage);
    pushImageValue(singleCandidates, value?.thumbnail);
    pushImageValue(singleCandidates, value?.thumbnailUrl);
    pushImageValue(singleCandidates, value?.coverImage);
    pushImageValue(singleCandidates, value?.image);
    pushImageValue(singleCandidates, value?.imageUrl);
    pushImageValue(singleCandidates, value?.photo);
    pushImageValue(singleCandidates, value?.picture);

    const arrayImages = arrayCandidates
      .map((item) => normalizeImageUrl(item))
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);

    const singleImages = singleCandidates
      .map((item) => normalizeImageUrl(item))
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);

    const mergedImages =
      arrayImages.length > 1
        ? arrayImages
        : [...arrayImages, ...singleImages];

    return mergedImages
      .map((item) => normalizeImageUrl(item))
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);
  };

  const getShopImageBankImages = (value = {}) => {
    const bank = readShopImageBank();
    const keys = getShopIdentityKeys(value);

    return keys
      .flatMap((key) => (Array.isArray(bank[key]) ? bank[key] : []))
      .map((item) => normalizeImageUrl(item))
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);
  };

  const getPreferredShopImages = (value = {}) => {
    const bankImages = getShopImageBankImages(value);
    const directImages = collectShopImages(value);

    if (bankImages.length) {
      return bankImages;
    }

    return directImages;
  };

  const makeImageStableShop = (value = {}, images = getPreferredShopImages(value)) => {
    const fixedImages = images
      .map((item) => normalizeImageUrl(item))
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);

    const representativeImage =
      normalizeImageUrl(
        value?.representativeImage ||
          value?.mainImage ||
          value?.thumbnail ||
          value?.coverImage ||
          fixedImages[0] ||
          ""
      ) || fixedImages[0] || "";

    return {
      ...value,
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

  const mergeLocalShopList = (items) => {
    const map = new Map();

    (Array.isArray(items) ? items : []).filter(Boolean).forEach((item) => {
      const stableItem = makeImageStableShop(item);
      const keys = getShopIdentityKeys(stableItem);
      const mapKey = keys.find((key) => map.has(key)) || keys[0] || String(map.size);

      if (!map.has(mapKey)) {
        keys.forEach((key) => {
          if (key) {
            map.set(key, stableItem);
          }
        });
      }
    });

    return Array.from(new Set(Array.from(map.values())));
  };

  const readLocalShops = () => {
    try {
      const adminSaved = JSON.parse(localStorage.getItem(LOCAL_SHOP_KEY) || "[]");
      const publicSaved = JSON.parse(localStorage.getItem(LOCAL_PUBLIC_SHOP_KEY) || "[]");
      const adminSession = JSON.parse(sessionStorage.getItem(LOCAL_SHOP_KEY) || "[]");
      const publicSession = JSON.parse(sessionStorage.getItem(LOCAL_PUBLIC_SHOP_KEY) || "[]");
      const selectedSaved = JSON.parse(localStorage.getItem(SELECTED_SHOP_KEY) || "null");
      const selectedSession = JSON.parse(sessionStorage.getItem(SELECTED_SHOP_KEY) || "null");

      return mergeLocalShopList([
        ...(Array.isArray(publicSaved) ? publicSaved : []),
        ...(Array.isArray(publicSession) ? publicSession : []),
        ...(Array.isArray(adminSaved) ? adminSaved : []),
        ...(Array.isArray(adminSession) ? adminSession : []),
        selectedSaved,
        selectedSession,
      ]).filter((item) => isMassageShop(item));
    } catch (e) {
      return [];
    }
  };

  const saveSelectedShop = (value) => {
    try {
      if (!value) return;

      if (!isMassageShop(value)) return;

      const stableValue = makeImageStableShop(normalizeShop(value));

      localStorage.setItem(SELECTED_SHOP_KEY, JSON.stringify(stableValue));
      sessionStorage.setItem(SELECTED_SHOP_KEY, JSON.stringify(stableValue));
    } catch (e) {
      console.warn("SHOP DETAIL SELECTED SAVE ERROR:", e.message);
    }
  };

  const normalizeShop = (value) => {
    const data = value || FALLBACK_SHOP;

    const normalizedImages = getPreferredShopImages(data);
    const premiumValue =
      data.premium === true ||
      data.isPremium === true ||
      data.grade === "premium" ||
      data.badge === "premium";

    return {
      ...FALLBACK_SHOP,
      ...data,
      _id: data._id || data.id || FALLBACK_SHOP._id,
      id: data.id || data._id || FALLBACK_SHOP.id,
      name: data.name || data.shopName || data.title || FALLBACK_SHOP.name,
      address:
        data.roadAddress ||
        data.address ||
        data.locationText ||
        data.road_address_name ||
        FALLBACK_SHOP.address,
      roadAddress:
        data.roadAddress ||
        data.address ||
        data.road_address_name ||
        FALLBACK_SHOP.roadAddress,
      phone:
        data.virtualPhone ||
        data.phone ||
        data.tel ||
        FALLBACK_SHOP.phone,
      virtualPhone:
        data.virtualPhone ||
        data.phone ||
        data.tel ||
        FALLBACK_SHOP.virtualPhone,
      businessHours:
        data.businessHours ||
        data.openingHours ||
        FALLBACK_SHOP.businessHours,
      intro:
        data.intro ||
        data.description ||
        data.shopIntro ||
        "",
      description:
        data.description ||
        data.intro ||
        data.shopIntro ||
        "",
      shopIntro:
        data.shopIntro ||
        data.intro ||
        data.description ||
        "",
      roadInfo: getFixedRoadInfo(data),
      premium: premiumValue,
      isPremium: premiumValue,
      rating:
        Number(data.rating || data.avgRating || data.averageRating || FALLBACK_SHOP.rating),
      reviewCount:
        Number(data.reviewCount || data.reviewsCount || data.reviewTotal || FALLBACK_SHOP.reviewCount),
      distance: data.distance || FALLBACK_SHOP.distance,
      images: normalizedImages.length ? normalizedImages : FALLBACK_IMAGES,
      photos: normalizedImages.length ? normalizedImages : FALLBACK_IMAGES,
      imageUrls: normalizedImages.length ? normalizedImages : FALLBACK_IMAGES,
    };
  };

  const loadLocalDetail = () => {
    const localList = readLocalShops();
    const found = localList.find((item) => {
      const id = item?._id || item?.id;
      return finalShopId && String(id) === String(finalShopId);
    });

    const stateShop =
      location?.state?.shop && isMassageShop(location.state.shop)
        ? location.state.shop
        : null;

    return found ? normalizeShop(makeImageStableShop(found)) : normalizeShop(stateShop || FALLBACK_SHOP);
  };

  useEffect(() => {
    loadDetail();
  }, [finalShopId]);

  useEffect(() => {
    const handleShopStorageUpdate = (event) => {
      const eventShops = Array.isArray(event?.detail?.shops) ? event.detail.shops : [];
      const localList = eventShops.length ? mergeLocalShopList(eventShops) : readLocalShops();
      const found = localList.find((item) => {
        const id = item?._id || item?.id;
        const keys = getShopIdentityKeys(item);

        return (
          (finalShopId && String(id) === String(finalShopId)) ||
          keys.includes(String(finalShopId || ""))
        );
      });

      if (found) {
        const normalized = normalizeShop(makeImageStableShop(found));

        setShop(normalized);
        saveSelectedShop(normalized);
        setActiveImageIndex(0);
      }
    };

    window.addEventListener("shops-updated", handleShopStorageUpdate);
    window.addEventListener("storage", handleShopStorageUpdate);

    return () => {
      window.removeEventListener("shops-updated", handleShopStorageUpdate);
      window.removeEventListener("storage", handleShopStorageUpdate);
    };
  }, [finalShopId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError("");

      const localDetail = loadLocalDetail();
      setShop(localDetail);
      saveSelectedShop(localDetail);

      if (!finalShopId || !shopApi || typeof shopApi.getDetail !== "function") {
        loadReviews(localDetail?._id || localDetail?.id || finalShopId);
        return;
      }

      const res = await Promise.race([
        shopApi.getDetail(finalShopId),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              shop: localDetail,
            });
          }, 2000);
        }),
      ]);

      const rawData = res?.shop || res?.data || res?.item || localDetail;
      const data = isMassageShop(rawData) ? rawData : localDetail;
      const localImages = getPreferredShopImages(localDetail);
      const dataImages = getPreferredShopImages(data);
      const fixedImages = localImages.length ? localImages : dataImages;
      const normalized = normalizeShop(
        makeImageStableShop(
          {
            ...localDetail,
            ...data,
          },
          fixedImages
        )
      );

      setShop(normalized);
      saveSelectedShop(normalized);
      loadReviews(normalized?._id || normalized?.id || finalShopId);
    } catch (e) {
      const localDetail = loadLocalDetail();

      setShop(localDetail);
      saveSelectedShop(localDetail);
      setError("");
      loadReviews(localDetail?._id || localDetail?.id || finalShopId);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (id) => {
    try {
      setReviewLoading(true);

      if (!reviewApi || typeof reviewApi.getByShop !== "function" || !id) {
        setReviews([]);
        return;
      }

      const res = await reviewApi.getByShop(id);

      const list = res?.list || res?.data || res?.items || [];
      setReviews(Array.isArray(list) ? list : []);
    } catch (e) {
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  };

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    if (typeof value === "number") {
      return value > 0 ? `${value.toLocaleString("ko-KR")}원` : "-";
    }

    const text = String(value).trim();

    if (!text || text === "-") {
      return "-";
    }

    if (text.includes("원")) {
      return text;
    }

    const numberValue = Number(text.replace(/[^\d.-]/g, ""));

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return text || "-";
    }

    return `${numberValue.toLocaleString("ko-KR")}원`;
  };

  const parseMoney = (value) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const numberValue = Number(String(value).replace(/[^\d.-]/g, ""));

    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const formatDiscount = (discount, original, sale) => {
    if (discount !== null && discount !== undefined && discount !== "") {
      const text = String(discount).trim();

      if (!text || text === "-") {
        return "";
      }

      return text.includes("%") ? text : `${text}%`;
    }

    const originalValue = parseMoney(original);
    const saleValue = parseMoney(sale);

    if (originalValue > 0 && saleValue > 0 && originalValue > saleValue) {
      return `${Math.round(((originalValue - saleValue) / originalValue) * 100)}%`;
    }

    return "";
  };

  const getFirstFilledValue = (...values) => {
    for (const value of values) {
      if (value !== null && value !== undefined && value !== "") {
        return value;
      }
    }

    return "";
  };

  const getNestedValue = (source, keys = []) => {
    if (!source || typeof source !== "object") {
      return "";
    }

    for (const key of keys) {
      if (source[key] !== null && source[key] !== undefined && source[key] !== "") {
        return source[key];
      }
    }

    return "";
  };

  const getRowTime = (row = {}) =>
    getFirstFilledValue(
      row.time,
      row.duration,
      row.minute,
      row.minutes,
      row.name,
      row.title,
      row.courseTime,
      row.label
    );

  const normalizeCourseRow = (row = {}, mode = "") => {
    const dayData = row.day && typeof row.day === "object" ? row.day : {};
    const nightData = row.night && typeof row.night === "object" ? row.night : {};
    const time = getRowTime(row);

    const dayOriginal = getFirstFilledValue(
      row.dayOriginal,
      row.dayOriginalPrice,
      row.dayNormalPrice,
      row.dayRegularPrice,
      getNestedValue(dayData, ["original", "originalPrice", "normalPrice", "regularPrice", "priceBeforeDiscount"]),
      mode === "day" ? row.originalPrice : "",
      mode === "day" ? row.normalPrice : "",
      row.originalPrice,
      row.normalPrice
    );

    const dayPrice = getFirstFilledValue(
      row.dayPrice,
      row.daySalePrice,
      row.dayDiscountPrice,
      row.dayFinalPrice,
      getNestedValue(dayData, ["price", "salePrice", "discountPrice", "finalPrice"]),
      mode === "day" ? row.price : "",
      mode === "day" ? row.salePrice : "",
      row.salePrice,
      row.discountPrice,
      row.price
    );

    const nightOriginal = getFirstFilledValue(
      row.nightOriginal,
      row.nightOriginalPrice,
      row.nightNormalPrice,
      row.nightRegularPrice,
      getNestedValue(nightData, ["original", "originalPrice", "normalPrice", "regularPrice", "priceBeforeDiscount"]),
      mode === "night" ? row.originalPrice : "",
      mode === "night" ? row.normalPrice : ""
    );

    const nightPrice = getFirstFilledValue(
      row.nightPrice,
      row.nightSalePrice,
      row.nightDiscountPrice,
      row.nightFinalPrice,
      getNestedValue(nightData, ["price", "salePrice", "discountPrice", "finalPrice"]),
      mode === "night" ? row.price : "",
      mode === "night" ? row.salePrice : ""
    );

    return {
      time: String(time || "").trim(),
      dayDiscount: formatDiscount(
        getFirstFilledValue(row.dayDiscount, row.dayDiscountRate, getNestedValue(dayData, ["discount", "discountRate"])),
        dayOriginal,
        dayPrice
      ),
      dayOriginal: formatMoney(dayOriginal),
      dayPrice: formatMoney(dayPrice),
      nightDiscount: formatDiscount(
        getFirstFilledValue(row.nightDiscount, row.nightDiscountRate, getNestedValue(nightData, ["discount", "discountRate"])),
        nightOriginal,
        nightPrice
      ),
      nightOriginal: formatMoney(nightOriginal),
      nightPrice: formatMoney(nightPrice),
    };
  };

  const mergeDayNightRows = (dayRows = [], nightRows = []) => {
    const map = new Map();

    dayRows.forEach((row) => {
      const normalized = normalizeCourseRow(row, "day");
      const key = normalized.time || String(map.size);

      map.set(key, {
        time: normalized.time,
        dayDiscount: normalized.dayDiscount,
        dayOriginal: normalized.dayOriginal,
        dayPrice: normalized.dayPrice,
        nightDiscount: "",
        nightOriginal: "-",
        nightPrice: "-",
      });
    });

    nightRows.forEach((row) => {
      const normalized = normalizeCourseRow(row, "night");
      const key = normalized.time || String(map.size);
      const saved = map.get(key) || {
        time: normalized.time,
        dayDiscount: "",
        dayOriginal: "-",
        dayPrice: "-",
        nightDiscount: "",
        nightOriginal: "-",
        nightPrice: "-",
      };

      map.set(key, {
        ...saved,
        nightDiscount: normalized.nightDiscount,
        nightOriginal: normalized.nightOriginal,
        nightPrice: normalized.nightPrice,
      });
    });

    return Array.from(map.values()).filter((row) => row.time);
  };

  const normalizeCourseGroup = (group = {}, fallbackTitle = "관리") => {
    const title = String(
      getFirstFilledValue(
        group.title,
        group.name,
        group.courseName,
        group.category,
        group.categoryName,
        group.groupName,
        fallbackTitle
      )
    ).trim();

    let rows = [];

    if (Array.isArray(group.rows)) {
      rows = group.rows.map((row) => normalizeCourseRow(row));
    } else if (Array.isArray(group.items)) {
      rows = group.items.map((row) => normalizeCourseRow(row));
    } else if (Array.isArray(group.courses)) {
      rows = group.courses.map((row) => normalizeCourseRow(row));
    } else if (Array.isArray(group.prices)) {
      rows = group.prices.map((row) => normalizeCourseRow(row));
    } else if (Array.isArray(group.day) || Array.isArray(group.night)) {
      rows = mergeDayNightRows(
        Array.isArray(group.day) ? group.day : [],
        Array.isArray(group.night) ? group.night : []
      );
    } else {
      const row = normalizeCourseRow(group);
      rows = row.time ? [row] : [];
    }

    const cleanRows = rows.filter(
      (row) =>
        row.time &&
        (row.dayPrice !== "-" ||
          row.nightPrice !== "-" ||
          row.dayOriginal !== "-" ||
          row.nightOriginal !== "-")
    );

    return cleanRows.length
      ? {
          title: title || fallbackTitle,
          rows: cleanRows,
        }
      : null;
  };

  const normalizeCourseGroupsFromValue = (value) => {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((group, index) => normalizeCourseGroup(group, `관리 ${index + 1}`))
        .filter(Boolean);
    }

    if (typeof value === "object") {
      const groupArrays = [
        value.courseSections,
        value.sections,
        value.groups,
        value.categories,
        value.items,
        value.rows,
        value.courses,
        value.prices,
      ].find((item) => Array.isArray(item) && item.length);

      if (groupArrays) {
        return groupArrays
          .map((group, index) => normalizeCourseGroup(group, `관리 ${index + 1}`))
          .filter(Boolean);
      }

      const objectGroups = Object.entries(value)
        .filter(([, item]) => Array.isArray(item) || (item && typeof item === "object"))
        .map(([title, item]) => {
          if (Array.isArray(item)) {
            return normalizeCourseGroup({ title, rows: item }, title);
          }

          return normalizeCourseGroup({ title, ...item }, title);
        })
        .filter(Boolean);

      if (objectGroups.length) {
        return objectGroups;
      }

      const singleGroup = normalizeCourseGroup(value);

      return singleGroup ? [singleGroup] : [];
    }

    return [];
  };

  const getShopPriceGroups = (value = {}) => {
    const sources = [
      value.coursePricing,
      value.pricing,
      value.priceTable,
      value.courseSections,
    ];

    for (const source of sources) {
      const groups = normalizeCourseGroupsFromValue(source);

      if (groups.length) {
        return groups;
      }
    }

    return [];
  };


  const getMinutesFromKoreanTime = (value) => {
    const text = String(value || "").trim();

    if (!text) {
      return null;
    }

    const match = text.match(/(오전|오후)?\s*(\d{1,2})\s*(?::\s*(\d{1,2}))?\s*시?/);

    if (!match) {
      return null;
    }

    const meridiem = match[1] || "";
    let hour = Number(match[2]);
    const minute = Number(match[3] || 0);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }

    if (meridiem === "오후" && hour < 12) {
      hour += 12;
    }

    if (meridiem === "오전" && hour === 12) {
      hour = 0;
    }

    return hour * 60 + minute;
  };

  const getBusinessOpenState = (businessHours = "") => {
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

    const startMinutes = getMinutesFromKoreanTime(parts[0]);
    const endMinutes = getMinutesFromKoreanTime(parts[1]);

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

  const normalizedShop = useMemo(() => normalizeShop(shop), [shop]);
  const isBusinessOpen = useMemo(
    () => getBusinessOpenState(normalizedShop.businessHours),
    [normalizedShop.businessHours]
  );
  const detailPriceGroups = useMemo(() => getShopPriceGroups(normalizedShop), [normalizedShop]);
  const introLines = useMemo(() => {
    const introText = String(
      normalizedShop.intro ||
        normalizedShop.description ||
        normalizedShop.shopIntro ||
        ""
    ).trim();

    if (introText) {
      return introText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    }

    return [
      "노라는 편안하고 고급스러운 휴식 경험을 제공하는 프리미엄 관리 공간입니다.",
      "깔끔한 시설, 친절한 응대, 합리적인 가격으로 만족도 높은 예약 서비스를 제공합니다.",
    ];
  }, [normalizedShop.intro, normalizedShop.description, normalizedShop.shopIntro]);

  useEffect(() => {
    if (activeImageIndex > normalizedShop.images.length - 1) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, normalizedShop.images]);

  const images = normalizedShop.images && normalizedShop.images.length
    ? normalizedShop.images
    : FALLBACK_IMAGES;

  const activeImage = images[activeImageIndex] || images[0];

  const goReservation = () => {
    const id = normalizedShop?._id || normalizedShop?.id || finalShopId;

    if (!id) return;

    saveSelectedShop(normalizedShop);

    finalNavigate(`/massage/reservations/create?shopId=${id}`, {
      state: {
        shop: normalizedShop,
      },
    });
  };

  const goPayment = () => {
    const id = normalizedShop?._id || normalizedShop?.id || finalShopId;

    if (!id) return;

    saveSelectedShop(normalizedShop);

    finalNavigate(`/massage/payment?shopId=${id}`, {
      state: {
        shop: normalizedShop,
      },
    });
  };

  const copyAddress = async () => {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("clipboard unsupported");
      }

      await navigator.clipboard.writeText(normalizedShop.address || "");
      alert("주소가 복사되었습니다.");
    } catch (e) {
      alert("주소 복사에 실패했습니다.");
    }
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => {
      if (prev <= 0) return images.length - 1;
      return prev - 1;
    });
  };

  const nextImage = () => {
    setActiveImageIndex((prev) => {
      if (prev >= images.length - 1) return 0;
      return prev + 1;
    });
  };

  if (loading && !shop) {
    return (
      <div style={styles.statePage}>
        <Loading message="매장 상세정보를 불러오는 중..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.statePage}>
        <ErrorMessage message={error} onRetry={loadDetail} />
      </div>
    );
  }

  if (!normalizedShop) {
    return (
      <div style={styles.statePage}>
        <EmptyState message="매장 정보가 없습니다." />
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, ...(!isBusinessOpen ? styles.closedPage : {}) }}>
      <header style={styles.header}>
        <button
          type="button"
          onClick={() => finalNavigate("/")}
          style={styles.logo}
        >
          노라
        </button>

        <nav style={styles.nav}>
          <button type="button" style={styles.navButton}>커뮤니티</button>
          <button type="button" style={styles.navButton} onClick={() => finalNavigate("/login")}>로그인</button>
          <button type="button" style={styles.navButton} onClick={() => finalNavigate("/signup")}>회원가입</button>
          <button type="button" style={styles.navButton}>제휴 문의</button>
        </nav>
      </header>

      <main style={styles.container}>
        <section style={{ ...styles.heroPanel, ...(!isBusinessOpen ? styles.closedHeroPanel : {}) }}>
          <div style={styles.gallery}>
            <div style={styles.mainImageWrap}>
              <img src={activeImage} alt={normalizedShop.name} style={{ ...styles.mainImage, ...(!isBusinessOpen ? styles.closedMainImage : {}) }} />
              <div style={styles.imageCount}>
                {activeImageIndex + 1}/{images.length}
              </div>
            </div>

            <div style={styles.thumbRow}>
              <button type="button" onClick={prevImage} style={styles.arrowButton}>‹</button>

              {images.slice(0, 5).map((item, index) => (
                <button
                  type="button"
                  key={`${item}-${index}`}
                  onClick={() => setActiveImageIndex(index)}
                  style={{
                    ...styles.thumbButton,
                    ...(activeImageIndex === index ? styles.thumbButtonActive : {}),
                  }}
                >
                  <img src={item} alt={`${normalizedShop.name}-${index}`} style={styles.thumbImage} />
                </button>
              ))}

              <button type="button" onClick={nextImage} style={styles.arrowButton}>›</button>
            </div>
          </div>

          <div style={styles.infoBox}>
            <span style={styles.bestBadge}>
              {normalizedShop.premium ? "PREMIUM" : "BEST"}
            </span>

            <h1 style={styles.shopTitle}>{normalizedShop.name}</h1>

            <div style={styles.infoRows}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>주소</span>
                <span style={styles.infoValue}>{normalizedShop.address}</span>
                <button type="button" onClick={copyAddress} style={styles.copyButton}>▣ 복사</button>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>도로시간</span>
                <span style={styles.infoValue}>{normalizedShop.roadInfo}</span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>영업시간</span>
                <span style={styles.infoValue}>{normalizedShop.businessHours}</span>
                <span style={isBusinessOpen ? styles.openText : styles.closedText}>
                  {isBusinessOpen ? "ⓘ 영업시간입니다." : "ⓘ 영업 준비중입니다."}
                </span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>전화번호</span>
                <span style={styles.infoValue}>{normalizedShop.virtualPhone || normalizedShop.phone}</span>
              </div>
            </div>

            <div style={styles.actionRow}>
              <button type="button" onClick={goPayment} style={styles.actionButton}>
                ▭ 바로결제
              </button>
              <button type="button" onClick={goReservation} style={styles.actionButton}>
                ☎ 전화예약
              </button>
            </div>
          </div>
        </section>

        <section style={styles.tabWrap}>
          <div style={styles.tabs}>
            <button
              type="button"
              onClick={() => setActiveTab("price")}
              style={{
                ...styles.tabButton,
                ...(activeTab === "price" ? styles.tabButtonActive : {}),
              }}
            >
              가격 / 예약
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              style={{
                ...styles.tabButton,
                ...(activeTab === "info" ? styles.tabButtonActive : {}),
              }}
            >
              업소정보
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("intro")}
              style={{
                ...styles.tabButton,
                ...(activeTab === "intro" ? styles.tabButtonActive : {}),
              }}
            >
              업체소개
            </button>
          </div>

          {activeTab === "price" && (
            <div style={styles.priceContent}>
              {detailPriceGroups.length === 0 && (
                <div style={styles.reviewStateWrap}>
                  <EmptyState message="등록된 코스 가격 정보가 없습니다." />
                </div>
              )}

              {detailPriceGroups.map((group) => (
                <div key={group.title} style={styles.priceGroup}>
                  <h3 style={styles.groupTitle}>{group.title}</h3>

                  <div style={styles.priceGrid}>
                    <div style={styles.priceColumn}>
                      <div style={styles.columnTitle}>주간</div>

                      {group.rows.map((row) => (
                        <div key={`${group.title}-day-${row.time}`} style={styles.priceRow}>
                          <span style={styles.timeCell}>{row.time}</span>
                          <span style={row.dayDiscount ? styles.discountBadge : styles.emptyDiscount}>
                            {row.dayDiscount}
                          </span>
                          <span style={styles.originalPrice}>{row.dayOriginal}</span>
                          <strong style={styles.salePrice}>{row.dayPrice}</strong>
                        </div>
                      ))}
                    </div>

                    <div style={styles.priceColumn}>
                      <div style={styles.columnTitle}>야간</div>

                      {group.rows.map((row) => (
                        <div key={`${group.title}-night-${row.time}`} style={styles.priceRow}>
                          <span style={styles.timeCell}>{row.time}</span>
                          <span style={row.nightDiscount ? styles.discountBadge : styles.emptyDiscount}>
                            {row.nightDiscount}
                          </span>
                          <span style={styles.originalPrice}>{row.nightOriginal}</span>
                          <strong style={styles.salePrice}>{row.nightPrice}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "info" && (
            <div style={styles.textPanel}>
              <h3 style={styles.groupTitle}>업소정보</h3>
              <p style={styles.textLine}>주소: {normalizedShop.address}</p>
              <p style={styles.textLine}>영업시간: {normalizedShop.businessHours}</p>
              <p style={styles.textLine}>전화번호: {normalizedShop.virtualPhone || normalizedShop.phone}</p>
              <p style={styles.textLine}>프리미엄: {normalizedShop.premium ? "활성화" : "비활성화"}</p>

            </div>
          )}

          {activeTab === "intro" && (
            <div style={styles.textPanel}>
              <h3 style={styles.groupTitle}>업체소개</h3>
              {introLines.map((line, index) => (
                <p key={`intro-line-${index}`} style={styles.textLine}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  statePage: {
    width: "100vw",
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      "Pretendard, Noto Sans KR, -apple-system, BlinkMacSystemFont, system-ui, Segoe UI, sans-serif",
  },

  page: {
    width: "100vw",
    minWidth: 1280,
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    fontFamily:
      "Pretendard, Noto Sans KR, -apple-system, BlinkMacSystemFont, system-ui, Segoe UI, sans-serif",
    overflowX: "hidden",
  },

  closedPage: {
    background: "#000",
  },

  closedHeroPanel: {
    opacity: 0.72,
    filter: "brightness(0.72)",
  },

  closedMainImage: {
    filter: "contrast(1.02) saturate(0.82) brightness(0.48)",
  },

  header: {
    height: 76,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px 0 22px",
    borderBottom: `1px solid rgba(167, 124, 0, 0.6)`,
    background: "#000",
  },

  logo: {
    border: "none",
    background: "transparent",
    color: "#fff",
    fontSize: 50,
    lineHeight: "52px",
    fontWeight: 400,
    letterSpacing: "-3px",
    cursor: "pointer",
    textShadow:
      `0 0 3px #fff, 0 0 8px ${PINK}, 0 0 18px ${PINK}, 0 0 30px rgba(255, 0, 110, 0.88)`,
  },

  nav: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  navButton: {
    height: 52,
    minWidth: 118,
    padding: "0 23px",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 6,
    background: "linear-gradient(180deg, rgba(8, 8, 8, 0.98), rgba(0, 0, 0, 1))",
    color: "#fff",
    fontSize: 19,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow:
      "0 0 8px rgba(255, 212, 0, 0.48), inset 0 0 10px rgba(255, 212, 0, 0.1)",
    textShadow: "0 0 7px rgba(255, 255, 255, 0.35)",
  },

  container: {
    width: "calc(100vw - 44px)",
    margin: "0 auto",
    padding: "18px 0 28px",
  },

  heroPanel: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    gap: 28,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 8,
    padding: 14,
    boxSizing: "border-box",
    background: "rgba(0,0,0,0.96)",
    boxShadow:
      "0 0 10px rgba(255, 212, 0, 0.25), inset 0 0 14px rgba(255, 212, 0, 0.04)",
  },

  gallery: {
    minWidth: 0,
  },

  mainImageWrap: {
    position: "relative",
    width: "100%",
    height: 450,
    overflow: "hidden",
    borderRadius: 8,
    border: `1px solid ${GOLD_DARK}`,
    background: "#050505",
  },

  mainImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    filter: "contrast(1.16) saturate(1.18) brightness(0.82)",
  },

  imageCount: {
    position: "absolute",
    right: 14,
    bottom: 14,
    padding: "4px 10px",
    borderRadius: 14,
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontSize: 15,
  },

  thumbRow: {
    height: 70,
    display: "grid",
    gridTemplateColumns: "24px repeat(5, 1fr) 24px",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },

  arrowButton: {
    border: "none",
    background: "transparent",
    color: GOLD,
    fontSize: 40,
    lineHeight: "40px",
    cursor: "pointer",
    textShadow: "0 0 10px rgba(255, 212, 0, 0.75)",
  },

  thumbButton: {
    height: 62,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 6,
    padding: 0,
    overflow: "hidden",
    background: "#050505",
    cursor: "pointer",
    boxShadow: "0 0 7px rgba(255, 212, 0, 0.25)",
  },

  thumbButtonActive: {
    border: `2px solid ${GOLD}`,
    boxShadow: "0 0 12px rgba(255, 212, 0, 0.7)",
  },

  thumbImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  infoBox: {
    minWidth: 0,
    padding: "8px 14px 0",
  },

  bestBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 24,
    padding: "0 12px",
    borderRadius: 4,
    background: PINK,
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    boxShadow: `0 0 9px rgba(255, 0, 110, 0.75)`,
  },

  shopTitle: {
    margin: "15px 0 18px",
    paddingBottom: 18,
    borderBottom: `1px solid rgba(167, 124, 0, 0.72)`,
    color: "#fff",
    fontSize: 31,
    fontWeight: 400,
    letterSpacing: "-1.2px",
    textShadow: "0 0 8px rgba(255,255,255,0.16)",
  },

  infoRows: {
    borderBottom: `1px solid rgba(167, 124, 0, 0.72)`,
  },

  infoRow: {
    minHeight: 50,
    display: "grid",
    gridTemplateColumns: "110px 1fr auto",
    alignItems: "center",
    gap: 12,
    borderBottom: `1px solid rgba(167, 124, 0, 0.45)`,
  },

  infoLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: 500,
  },

  infoValue: {
    color: "#fff",
    fontSize: 16,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  copyButton: {
    height: 34,
    padding: "0 12px",
    border: "1px solid rgba(255,255,255,0.45)",
    borderRadius: 5,
    background: "rgba(0,0,0,0.65)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },

  openText: {
    color: GOLD,
    fontSize: 16,
    whiteSpace: "nowrap",
    textShadow: "0 0 8px rgba(255, 212, 0, 0.55)",
  },

  closedText: {
    color: "#ff0000",
    fontSize: 16,
    whiteSpace: "nowrap",
  },

  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 28,
  },

  actionButton: {
    height: 64,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 6,
    background: "#020202",
    color: GOLD,
    fontSize: 22,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow:
      "0 0 9px rgba(255, 212, 0, 0.32), inset 0 0 8px rgba(255, 212, 0, 0.04)",
  },

  tabWrap: {
    marginTop: 12,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 8,
    background: "#000",
    boxShadow:
      "0 0 8px rgba(255, 212, 0, 0.24), inset 0 0 10px rgba(255, 212, 0, 0.03)",
  },

  tabs: {
    height: 54,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    borderBottom: `1px solid ${GOLD_DARK}`,
  },

  tabButton: {
    border: "none",
    borderRight: `1px solid ${GOLD_DARK}`,
    background: "#050505",
    color: "#fff",
    fontSize: 18,
    cursor: "pointer",
  },

  tabButtonActive: {
    color: GOLD,
    background: "linear-gradient(180deg, rgba(12,12,12,1), rgba(0,0,0,1))",
    boxShadow: "inset 0 0 12px rgba(255, 212, 0, 0.08)",
  },

  priceContent: {
    padding: "16px 18px 18px",
  },

  priceGroup: {
    border: `1px solid rgba(167, 124, 0, 0.75)`,
    borderRadius: 7,
    padding: "18px 22px",
    marginBottom: 12,
    background: "#030303",
  },

  groupTitle: {
    margin: "0 0 12px",
    color: GOLD,
    fontSize: 22,
    fontWeight: 500,
  },

  priceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 28,
    background:
      "linear-gradient(to right, transparent calc(50% - 1px), rgba(167, 124, 0, 0.9) calc(50% - 1px), rgba(167, 124, 0, 0.9) calc(50% + 1px), transparent calc(50% + 1px))",
  },

  priceColumn: {
    minWidth: 0,
  },

  columnTitle: {
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
  },

  priceRow: {
    height: 32,
    display: "grid",
    gridTemplateColumns: "1fr 70px 110px 130px",
    alignItems: "center",
    borderBottom: `1px solid rgba(167, 124, 0, 0.35)`,
  },

  timeCell: {
    color: "#fff",
    fontSize: 22,
  },

  discountBadge: {
    justifySelf: "center",
    minWidth: 44,
    height: 25,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 3,
    background: "#c80052",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
  },

  emptyDiscount: {
    minWidth: 44,
    height: 25,
  },

  originalPrice: {
    color: "#9a9a9a",
    fontSize: 16,
    textDecoration: "line-through",
  },

  salePrice: {
    color: "#fff",
    fontSize: 22,
    fontWeight: 500,
    textShadow: "0 0 8px rgba(255,255,255,0.22)",
  },

  textPanel: {
    padding: "26px 32px 34px",
    minHeight: 260,
  },

  textLine: {
    margin: "12px 0",
    color: "#ddd",
    fontSize: 18,
    lineHeight: "30px",
  },

  reviewStateWrap: {
    marginTop: 16,
  },
};

export default ShopDetailPage;