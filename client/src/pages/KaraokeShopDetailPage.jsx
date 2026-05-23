"use strict";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

const GOLD = "#ffd400";
const GOLD_DARK = "#a77c00";
const PINK = "#ff006e";

const LOCAL_SHOP_KEY = "noma_admin_shops";
const LOCAL_PUBLIC_SHOP_KEY = "noma_local_shops";
const LOCAL_KARAOKE_ADMIN_SHOP_KEY = "noma_admin_shops_karaoke";
const LOCAL_KARAOKE_PUBLIC_SHOP_KEY = "noma_local_shops_karaoke";
const LOCAL_ADMIN_KARAOKE_SHOP_KEY = "noma_admin_karaoke_shops";
const LOCAL_PUBLIC_KARAOKE_SHOP_KEY = "noma_public_karaoke_shops";
const SELECTED_SHOP_KEY = "noma_selected_shop";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000";

function getImageValue(value) {
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
}

function isBareBase64Image(value) {
  const text = String(value || "").trim();

  if (!text) {
    return false;
  }

  if (text.startsWith("data:image/")) {
    return false;
  }

  return (
    text.startsWith("/9j/") ||
    text.startsWith("iVBORw0KGgo") ||
    text.startsWith("R0lGOD") ||
    text.startsWith("UklGR")
  );
}

function getBareBase64MimeType(value) {
  const text = String(value || "").trim();

  if (text.startsWith("iVBORw0KGgo")) {
    return "image/png";
  }

  if (text.startsWith("R0lGOD")) {
    return "image/gif";
  }

  if (text.startsWith("UklGR")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function normalizeImageUrl(value) {
  const imageValue = String(getImageValue(value) || "").trim();

  if (!imageValue) {
    return "";
  }

  const lower = imageValue.toLowerCase();

  if (
    lower === "null" ||
    lower === "undefined" ||
    lower === "[object object]" ||
    lower === "false" ||
    lower === "true" ||
    lower.includes("/undefined") ||
    lower.includes("/null")
  ) {
    return "";
  }

  if (imageValue.startsWith("data:image/")) {
    return imageValue;
  }

  if (isBareBase64Image(imageValue)) {
    return `data:${getBareBase64MimeType(imageValue)};base64,${imageValue}`;
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

  return imageValue;
}

function normalizeImageArray(value) {
  const normalizeOne = (item) => {
    if (!item) {
      return [];
    }

    if (Array.isArray(item)) {
      return item.flatMap((child) => normalizeOne(child));
    }

    if (typeof item === "object") {
      return normalizeOne(getImageValue(item));
    }

    if (typeof item === "string") {
      const text = item.trim();

      if (!text) {
        return [];
      }

      if (text.startsWith("data:image/") || isBareBase64Image(text)) {
        return [normalizeImageUrl(text)].filter(Boolean);
      }

      return text
        .split(",")
        .map((child) => normalizeImageUrl(child))
        .filter(Boolean);
    }

    return [];
  };

  return normalizeOne(value);
}

function uniqueImages(items = []) {
  return items
    .map((item) => normalizeImageUrl(item))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function getShopImages(shop) {
  const adminImages = uniqueImages([
    ...normalizeImageArray(shop?.images),
    ...normalizeImageArray(shop?.photos),
    ...normalizeImageArray(shop?.imageUrls),
  ]).slice(0, 2);

  if (adminImages.length > 0) {
    return adminImages;
  }

  return uniqueImages([
    ...normalizeImageArray(shop?.representativeImage),
    ...normalizeImageArray(shop?.mainImage),
  ]).slice(0, 2);
}

function isKaraokeShop(shop) {
  const typeText = String(
    shop?.type ||
      shop?.category ||
      shop?.businessType ||
      shop?.serviceType ||
      shop?.shopCategory ||
      ""
  )
    .toLowerCase()
    .replace(/\s/g, "");

  const titleText = String(
    shop?.title ||
      shop?.name ||
      shop?.shopName ||
      ""
  )
    .toLowerCase()
    .replace(/\s/g, "");

  return (
    typeText.includes("karaoke") ||
    typeText.includes("노래") ||
    typeText.includes("가라오케") ||
    titleText.includes("노래") ||
    titleText.includes("가라오케") ||
    titleText.includes("파티룸")
  );
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "number") {
    return value > 0 ? `${value.toLocaleString("ko-KR")}원` : "-";
  }

  const text = String(value || "").trim();

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
}

function parseMoney(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue = Number(String(value).replace(/[^\d.-]/g, ""));

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatDiscount(value, original, sale) {
  if (value !== null && value !== undefined && value !== "") {
    const text = String(value || "").trim();

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
}

function getFirstFilledValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return "";
}

function getNestedValue(source, keys = []) {
  if (!source || typeof source !== "object") {
    return "";
  }

  for (const key of keys) {
    if (source[key] !== null && source[key] !== undefined && source[key] !== "") {
      return source[key];
    }
  }

  return "";
}

function normalizeCourse(course = {}) {
  const dayData = course?.day && typeof course.day === "object" ? course.day : {};
  const nightData = course?.night && typeof course.night === "object" ? course.night : {};

  const dayOriginal = getFirstFilledValue(
    course?.dayOriginal,
    course?.dayOriginalPrice,
    course?.dayNormalPrice,
    course?.originalDayPrice,
    getNestedValue(dayData, ["original", "originalPrice", "normalPrice", "regularPrice"]),
    course?.originalPrice,
    course?.normalPrice,
    course?.regularPrice
  );

  const dayPrice = getFirstFilledValue(
    course?.dayPrice,
    course?.daySalePrice,
    course?.dayDiscountPrice,
    course?.salePrice,
    course?.discountPrice,
    getNestedValue(dayData, ["price", "salePrice", "discountPrice", "finalPrice"]),
    course?.price
  );

  const nightOriginal = getFirstFilledValue(
    course?.nightOriginal,
    course?.nightOriginalPrice,
    course?.nightNormalPrice,
    course?.originalNightPrice,
    getNestedValue(nightData, ["original", "originalPrice", "normalPrice", "regularPrice"]),
    course?.originalPrice,
    course?.normalPrice,
    course?.regularPrice
  );

  const nightPrice = getFirstFilledValue(
    course?.nightPrice,
    course?.nightSalePrice,
    course?.nightDiscountPrice,
    getNestedValue(nightData, ["price", "salePrice", "discountPrice", "finalPrice"]),
    course?.salePrice,
    course?.discountPrice,
    course?.price
  );

  return {
    title:
      course?.title ||
      course?.name ||
      course?.courseName ||
      course?.category ||
      "프리미엄 룸",
    duration:
      course?.duration ||
      course?.time ||
      course?.minute ||
      course?.minutes ||
      course?.courseTime ||
      "60분",
    dayPrice:
      formatMoney(dayPrice || "80,000원"),
    nightPrice:
      formatMoney(nightPrice || dayPrice || "90,000원"),
    originalDayPrice:
      formatMoney(dayOriginal || "100,000원"),
    originalNightPrice:
      formatMoney(nightOriginal || dayOriginal || "100,000원"),
    dayDiscount:
      formatDiscount(
        getFirstFilledValue(course?.dayDiscount, course?.dayDiscountRate, course?.discount, course?.discountRate),
        dayOriginal,
        dayPrice
      ) || "20%",
    nightDiscount:
      formatDiscount(
        getFirstFilledValue(course?.nightDiscount, course?.nightDiscountRate, course?.discount, course?.discountRate),
        nightOriginal || dayOriginal,
        nightPrice || dayPrice
      ) || "10%",
  };
}

function normalizeCourseList(shop = {}) {
  const normalizeTitleKey = (value) =>
    String(value || "")
      .replace(/\s+/g, "")
      .replace(/주간/g, "")
      .replace(/야간/g, "")
      .replace(/낮/g, "")
      .replace(/밤/g, "")
      .trim();

  const sourceCourses = Array.isArray(shop?.courses) ? shop.courses : [];

  if (sourceCourses.length > 0) {
    const objectCourses = sourceCourses.filter(
      (item) => item && typeof item === "object"
    );

    if (objectCourses.length > 0) {
      const map = new Map();

      objectCourses.forEach((item, index) => {
        const normalized = normalizeCourse(item);
        const key = normalizeTitleKey(normalized.title) || `course-${index}`;

        if (!map.has(key)) {
          map.set(key, normalized);
          return;
        }

        const saved = map.get(key);

        map.set(key, {
          ...saved,
          dayPrice:
            saved.dayPrice !== "-" ? saved.dayPrice : normalized.dayPrice,
          nightPrice:
            saved.nightPrice !== "-" ? saved.nightPrice : normalized.nightPrice,
          originalDayPrice:
            saved.originalDayPrice !== "-" ? saved.originalDayPrice : normalized.originalDayPrice,
          originalNightPrice:
            saved.originalNightPrice !== "-" ? saved.originalNightPrice : normalized.originalNightPrice,
          dayDiscount:
            saved.dayDiscount || normalized.dayDiscount,
          nightDiscount:
            saved.nightDiscount || normalized.nightDiscount,
        });
      });

      return Array.from(map.values());
    }

    const stringCourses = sourceCourses
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    if (stringCourses.length > 0) {
      const firstCourse = stringCourses[0];
      const sameCourseGroup = stringCourses.every(
        (item) => normalizeTitleKey(item) === normalizeTitleKey(firstCourse)
      );

      if (sameCourseGroup || stringCourses.length <= 2) {
        return [
          normalizeCourse({
            title: firstCourse,
            duration: firstCourse,
            dayPrice: Array.isArray(shop?.dayPrice) ? shop.dayPrice[0] : shop?.dayPrice,
            nightPrice: Array.isArray(shop?.nightPrice) ? shop.nightPrice[0] : shop?.nightPrice,
            price: Array.isArray(shop?.price) ? shop.price[0] : shop?.price,
            dayOriginal: Array.isArray(shop?.dayOriginal) ? shop.dayOriginal[0] : shop?.dayOriginal,
            nightOriginal: Array.isArray(shop?.nightOriginal) ? shop.nightOriginal[0] : shop?.nightOriginal,
            originalPrice: Array.isArray(shop?.originalPrice)
              ? shop.originalPrice[0]
              : shop?.originalPrice,
          }),
        ];
      }

      return stringCourses.map((item) =>
        normalizeCourse({
          title: item,
          duration: item,
          price: Array.isArray(shop?.price) ? shop.price[0] : shop?.price,
          originalPrice: Array.isArray(shop?.originalPrice)
            ? shop.originalPrice[0]
            : shop?.originalPrice,
        })
      );
    }
  }

  const priceSources = [
    shop?.coursePricing,
    shop?.pricing,
    shop?.priceTable,
    shop?.courseSections,
    shop?.menuPrices,
    shop?.menus,
    shop?.courseMenus,
  ];

  for (const source of priceSources) {
    if (Array.isArray(source) && source.length > 0) {
      const mapped = source.flatMap((item) => {
        if (!item || typeof item !== "object") {
          return [];
        }

        if (Array.isArray(item.rows) && item.rows.length > 0) {
          return [
            normalizeCourse({
              ...item.rows[0],
              title:
                item.title ||
                item.name ||
                item.courseName ||
                item.rows[0]?.title ||
                item.rows[0]?.name,
            }),
          ];
        }

        if (Array.isArray(item.items) && item.items.length > 0) {
          return [
            normalizeCourse({
              ...item.items[0],
              title:
                item.title ||
                item.name ||
                item.courseName ||
                item.items[0]?.title ||
                item.items[0]?.name,
            }),
          ];
        }

        if (Array.isArray(item.prices) && item.prices.length > 0) {
          return [
            normalizeCourse({
              ...item.prices[0],
              title:
                item.title ||
                item.name ||
                item.courseName ||
                item.prices[0]?.title ||
                item.prices[0]?.name,
            }),
          ];
        }

        return [normalizeCourse(item)];
      });

      if (mapped.length > 0) {
        return mapped;
      }
    }
  }

  if (shop?.extraCourse || shop?.extraCourses || shop?.additionalCourse) {
    return [
      normalizeCourse({
        title:
          shop?.extraCourse ||
          shop?.extraCourses ||
          shop?.additionalCourse,
        price:
          shop?.extraPrice ||
          shop?.extraAmount ||
          shop?.additionalPrice,
        originalPrice:
          shop?.extraOriginalPrice ||
          shop?.originalPrice,
      }),
    ];
  }

  return [];
}

function normalizeShop(shop = {}) {
  const images = getShopImages(shop);

  const mainImage = images[0] || "";

  const address =
    shop?.address ||
    shop?.locationText ||
    shop?.fullAddress ||
    shop?.roadAddress ||
    shop?.roadAddr ||
    shop?.road_address_name ||
    "경상남도 김해시 삼계동 1479-2";

  const roadAddress =
    shop?.roadAddress ||
    shop?.roadAddr ||
    shop?.road_address_name ||
    shop?.fullAddress ||
    shop?.address ||
    shop?.locationText ||
    address;

  const roadInfoText =
    shop?.roadInfo ||
    shop?.access ||
    shop?.direction ||
    "";

  const normalizedRoadInfo =
    roadInfoText && String(roadInfoText).trim()
      ? String(roadInfoText).trim()
      : `장신대역 인근 · ${roadAddress}`;

  return {
    ...shop,
    _id:
      shop?._id ||
      shop?.id ||
      shop?.shopId ||
      "",
    id:
      shop?._id ||
      shop?.id ||
      shop?.shopId ||
      "",
    title:
      shop?.title ||
      shop?.name ||
      shop?.shopName ||
      "노래방 업체",
    name:
      shop?.name ||
      shop?.shopName ||
      shop?.title ||
      "노래방 업체",
    address,
    roadAddress,
    roadInfo:
      normalizedRoadInfo,
    businessHours:
      shop?.businessHours ||
      shop?.openingHours ||
      shop?.hours ||
      "12:00~20:00",
    phone:
      shop?.phone ||
      shop?.phoneNumber ||
      shop?.tel ||
      "01012341234",
    description:
      shop?.description ||
      shop?.intro ||
      shop?.content ||
      "-",
    premium:
      shop?.premium === true ||
      shop?.isPremium === true,
    rating:
      shop?.rating ||
      "5.0",
    review:
      shop?.review ||
      shop?.reviewCount ||
      "0",
    lat:
      Number(
        shop?.lat ||
          shop?.latitude
      ) || 35.2613,
    lng:
      Number(
        shop?.lng ||
          shop?.longitude
      ) || 128.871,
    mainImage,
    image: mainImage,
    representativeImage: mainImage,
    thumbnail: mainImage,
    coverImage: mainImage,
    images,
    photos: images,
    imageUrls: images,
    courses:
      normalizeCourseList(shop),
  };
}

function readLocalStorageArray(storage, key) {
  try {
    const saved = JSON.parse(
      storage.getItem(key) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    return [];
  }
}

function readLocalShops() {
  try {
    const keys = [
      LOCAL_KARAOKE_ADMIN_SHOP_KEY,
      LOCAL_KARAOKE_PUBLIC_SHOP_KEY,
      LOCAL_ADMIN_KARAOKE_SHOP_KEY,
      LOCAL_PUBLIC_KARAOKE_SHOP_KEY,
      LOCAL_SHOP_KEY,
      LOCAL_PUBLIC_SHOP_KEY,
    ];

    const merged = keys.flatMap((key) => [
      ...readLocalStorageArray(localStorage, key),
      ...readLocalStorageArray(sessionStorage, key),
    ]);

    const uniqueMap = new Map();

    merged.forEach((item, index) => {
      if (!isKaraokeShop(item)) {
        return;
      }

      const key = String(
        item?._id ||
          item?.id ||
          item?.shopId ||
          item?.title ||
          item?.name ||
          item?.shopName ||
          `karaoke-shop-${index}`
      );

      const normalizedItem = normalizeShop(item);
      const savedItem = uniqueMap.get(key);

      if (!savedItem) {
        uniqueMap.set(key, normalizedItem);
        return;
      }

      const savedImages = getShopImages(savedItem);
      const nextImages = getShopImages(normalizedItem);

      if (nextImages.length >= savedImages.length) {
        uniqueMap.set(key, normalizedItem);
      }
    });

    return Array.from(uniqueMap.values());
  } catch (e) {
    return [];
  }
}

function KaraokeShopDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [loading] = useState(false);
  const [error] = useState("");

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [shop, setShop] = useState(null);
  const [activeTab, setActiveTab] = useState("price");

  useEffect(() => {
    try {
      const targetId = String(params?.id || "");
      const allShops = readLocalShops();

      const matchedShop = allShops.find((item) => {
        const itemId = String(
          item?._id ||
            item?.id ||
            item?.shopId ||
            ""
        );

        return itemId === targetId;
      });

      if (matchedShop) {
        setShop(normalizeShop(matchedShop));
        setSelectedImageIndex(0);
        return;
      }

      const stateShop = location?.state?.shop;

      if (stateShop && isKaraokeShop(stateShop)) {
        setShop(normalizeShop(stateShop));
        setSelectedImageIndex(0);
        return;
      }

      const localSelected = JSON.parse(
        localStorage.getItem(SELECTED_SHOP_KEY) || "null"
      );

      const sessionSelected = JSON.parse(
        sessionStorage.getItem(SELECTED_SHOP_KEY) || "null"
      );

      const selectedList = [localSelected, sessionSelected].filter(Boolean);

      const selectedMatched = selectedList.find((item) => {
        const itemId = String(item?._id || item?.id || item?.shopId || "");

        return isKaraokeShop(item) && (!targetId || itemId === targetId);
      });

      if (selectedMatched) {
        setShop(normalizeShop(selectedMatched));
        setSelectedImageIndex(0);
        return;
      }

      setShop(null);
    } catch (e) {
      setShop(null);
    }
  }, [location, params]);

  const images = useMemo(() => {
    return Array.isArray(shop?.images)
      ? shop.images.filter(Boolean).slice(0, 2)
      : [];
  }, [shop]);

  useEffect(() => {
    if (selectedImageIndex > images.length - 1) {
      setSelectedImageIndex(0);
    }
  }, [images, selectedImageIndex]);

  const selectedImage = images[selectedImageIndex] || images[0] || "";

  const goReservation = () => {
    if (!shop) return;

    navigate(
      "/karaoke/reservations/create",
      {
        state: {
          shop,
          type: "karaoke",
        },
      }
    );
  };

  const goPayment = () => {
    if (!shop) return;

    navigate(
      "/karaoke/payment",
      {
        state: {
          shop,
          type: "karaoke",
        },
      }
    );
  };

  const copyAddress = () => {
    if (!shop?.address) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shop.address);
    }
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => {
      if (!Array.isArray(images) || images.length <= 1) {
        return 0;
      }

      return prev <= 0 ? images.length - 1 : prev - 1;
    });
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => {
      if (!Array.isArray(images) || images.length <= 1) {
        return 0;
      }

      return prev >= images.length - 1 ? 0 : prev + 1;
    });
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
      />
    );
  }

  if (!shop) {
    return (
      <EmptyState
        message="노래방 업체 정보를 찾을 수 없습니다."
      />
    );
  }

  if (!Array.isArray(images) || images.length === 0) {
    return (
      <EmptyState
        message="등록된 이미지가 없습니다."
      />
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={styles.logo}
        >
          노라
        </button>

        <nav style={styles.nav}>
          <button type="button" style={styles.navButton}>커뮤니티</button>
          <button type="button" style={styles.navButton}>로그인</button>
          <button type="button" style={styles.navButton}>회원가입</button>
          <button type="button" style={styles.navButton}>제휴 문의</button>
        </nav>
      </header>

      <main style={styles.main}>
        <section style={styles.topSection}>
          <div style={styles.gallerySection}>
            <div style={styles.mainImageWrap}>
              {!!selectedImage && (
                <img
                  src={selectedImage}
                  alt={shop.title}
                  style={styles.mainImage}
                />
              )}

              <div style={styles.imageCount}>
                {images.length > 0 ? selectedImageIndex + 1 : 0}/{images.length}
              </div>
            </div>

            <div style={styles.thumbnailRow}>
              <button
                type="button"
                onClick={prevImage}
                style={styles.arrowButton}
              >
                ‹
              </button>

              {images.slice(0, 5).map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  style={{
                    ...styles.thumbnailButton,
                    ...(selectedImageIndex === index ? styles.thumbnailButtonActive : {}),
                  }}
                >
                  <img
                    src={image}
                    alt={`${shop.title}-${index}`}
                    style={styles.thumbnailImage}
                    onError={(e) => {
                      if (e?.currentTarget?.parentElement) {
                        e.currentTarget.parentElement.style.display = "none";
                      }
                    }}
                  />
                </button>
              ))}

              <button
                type="button"
                onClick={nextImage}
                style={styles.arrowButton}
              >
                ›
              </button>
            </div>
          </div>

          <div style={styles.infoSection}>
            {shop.premium && (
              <div style={styles.premiumBadge}>
                PREMIUM
              </div>
            )}

            <h1 style={styles.shopTitle}>
              {shop.title}
            </h1>

            <div style={styles.infoTable}>
              <div style={styles.infoRow}>
                <div style={styles.infoLabel}>주소</div>
                <div style={styles.infoValue}>{shop.address}</div>
                <button
                  type="button"
                  style={styles.copyButton}
                  onClick={copyAddress}
                >
                  ⧉ 복사
                </button>
              </div>

              <div style={styles.infoRow}>
                <div style={styles.infoLabel}>도로시간</div>
                <div style={styles.infoValue}>{shop.roadInfo || shop.roadAddress}</div>
              </div>

              <div style={styles.infoRow}>
                <div style={styles.infoLabel}>영업시간</div>
                <div style={styles.infoValue}>{shop.businessHours}</div>
                <div style={styles.openBadge}>ⓘ 영업중 입니다.</div>
              </div>

              <div style={styles.infoRow}>
                <div style={styles.infoLabel}>전화번호</div>
                <div style={styles.infoValue}>{shop.phone}</div>
              </div>
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={goPayment}
                style={styles.paymentButton}
              >
                ▣ 바로결제
              </button>

              <button
                type="button"
                onClick={goReservation}
                style={styles.reserveButton}
              >
                ☎ 예약하기
              </button>
            </div>
          </div>
        </section>

        <section style={styles.tabSection}>
          <div style={styles.tabRow}>
            <button
              type="button"
              onClick={() => setActiveTab("price")}
              style={activeTab === "price" ? styles.activeTab : styles.tab}
            >
              가격 / 예약
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("info")}
              style={activeTab === "info" ? styles.activeTab : styles.tab}
            >
              업소정보
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("intro")}
              style={activeTab === "intro" ? styles.activeTab : styles.tab}
            >
              업체소개
            </button>
          </div>

          {activeTab === "price" && (
            <div style={styles.courseWrap}>
              {(!Array.isArray(shop.courses) || shop.courses.length === 0) && (
                <EmptyState message="등록된 코스 가격 정보가 없습니다." />
              )}

              {Array.isArray(shop.courses) && shop.courses.map((course, index) => (
                <div
                  key={`${course.title}-${index}`}
                  style={styles.courseCard}
                >
                  <h3 style={styles.courseTitle}>{course.title}</h3>

                  <div style={styles.priceGrid}>
                    <div style={styles.priceColumn}>
                      <div style={styles.timeLabel}>주간</div>
                      <div style={styles.priceRow}>
                        <span style={styles.duration}>{course.duration}</span>
                        <span style={styles.discount}>{course.dayDiscount}</span>
                        <span style={styles.originalPrice}>{course.originalDayPrice}</span>
                        <strong style={styles.salePrice}>{course.dayPrice}</strong>
                      </div>
                    </div>

                    <div style={styles.divider} />

                    <div style={styles.priceColumn}>
                      <div style={styles.timeLabel}>야간</div>
                      <div style={styles.priceRow}>
                        <span style={styles.duration}>{course.duration}</span>
                        <span style={styles.discount}>{course.nightDiscount}</span>
                        <span style={styles.originalPrice}>{course.originalNightPrice}</span>
                        <strong style={styles.salePrice}>{course.nightPrice}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "info" && (
            <div style={styles.infoContent}>
              <div style={styles.infoContentRow}>
                <strong style={styles.infoContentLabel}>주소</strong>
                <span style={styles.infoContentValue}>{shop.address}</span>
              </div>
              <div style={styles.infoContentRow}>
                <strong style={styles.infoContentLabel}>도로시간</strong>
                <span style={styles.infoContentValue}>{shop.roadInfo || shop.roadAddress}</span>
              </div>
              <div style={styles.infoContentRow}>
                <strong style={styles.infoContentLabel}>영업시간</strong>
                <span style={styles.infoContentValue}>{shop.businessHours}</span>
              </div>
              <div style={styles.infoContentRow}>
                <strong style={styles.infoContentLabel}>전화번호</strong>
                <span style={styles.infoContentValue}>{shop.phone}</span>
              </div>
            </div>
          )}

          {activeTab === "intro" && (
            <div style={styles.introContent}>
              {shop.description}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: {
    width: "100vw",
    minWidth: 1280,
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    overflowX: "hidden",
    fontFamily:
      "Pretendard, Noto Sans KR, -apple-system, BlinkMacSystemFont, system-ui, Segoe UI, sans-serif",
  },

  header: {
    height: 76,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px 0 22px",
    borderBottom: `1px solid rgba(167, 124, 0, 0.6)`,
    background: "#000",
    boxSizing: "border-box",
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
  },

  main: {
    width: "calc(100vw - 44px)",
    margin: "0 auto",
    padding: "18px 0 28px",
    boxSizing: "border-box",
  },

  topSection: {
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

  gallerySection: {
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
    minWidth: "auto",
    height: "auto",
    borderRadius: 14,
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 400,
    display: "block",
  },

  thumbnailRow: {
    height: 70,
    display: "grid",
    gridTemplateColumns: "24px repeat(5, 1fr) 24px",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    overflow: "hidden",
    paddingBottom: 0,
  },

  arrowButton: {
    border: "none",
    background: "transparent",
    color: GOLD,
    fontSize: 40,
    lineHeight: "40px",
    cursor: "pointer",
  },

  thumbnailButton: {
    height: 62,
    padding: 0,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 6,
    overflow: "hidden",
    background: "#050505",
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: "0 0 7px rgba(255, 212, 0, 0.25)",
  },

  thumbnailButtonActive: {
    border: `2px solid ${GOLD}`,
    boxShadow: "0 0 12px rgba(255, 212, 0, 0.7)",
  },

  thumbnailImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  infoSection: {
    minWidth: 0,
    padding: "8px 14px 0",
  },

  premiumBadge: {
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
    lineHeight: "40px",
    fontWeight: 400,
    letterSpacing: "-1.2px",
  },

  infoTable: {
    borderTop: "none",
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
    fontWeight: 500,
    lineHeight: "22px",
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
    fontWeight: 500,
  },

  openBadge: {
    color: GOLD,
    fontSize: 16,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },

  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 28,
  },

  paymentButton: {
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

  reserveButton: {
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

  tabSection: {
    marginTop: 12,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 8,
    overflow: "hidden",
    background: "#000",
    boxShadow:
      "0 0 8px rgba(255, 212, 0, 0.24), inset 0 0 10px rgba(255, 212, 0, 0.03)",
  },

  tabRow: {
    height: 54,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    borderBottom: `1px solid ${GOLD_DARK}`,
  },

  activeTab: {
    border: "none",
    borderRight: `1px solid ${GOLD_DARK}`,
    background: "linear-gradient(180deg, rgba(12,12,12,1), rgba(0,0,0,1))",
    color: GOLD,
    fontSize: 18,
    fontWeight: 500,
    cursor: "pointer",
  },

  tab: {
    border: "none",
    borderRight: `1px solid ${GOLD_DARK}`,
    background: "#050505",
    color: "#fff",
    fontSize: 18,
    fontWeight: 400,
    cursor: "pointer",
  },

  courseWrap: {
    padding: "16px 18px 18px",
    background: "#000",
  },

  courseCard: {
    border: `1px solid rgba(167, 124, 0, 0.75)`,
    borderRadius: 7,
    padding: "18px 22px",
    marginBottom: 12,
    background: "#030303",
  },

  courseTitle: {
    margin: "0 0 12px",
    color: GOLD,
    fontSize: 22,
    lineHeight: "28px",
    fontWeight: 500,
  },

  priceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1px 1fr",
    gap: 14,
    marginTop: 14,
    alignItems: "stretch",
  },

  divider: {
    width: 1,
    background: "rgba(167, 124, 0, 0.9)",
  },

  priceColumn: {
    minWidth: 0,
  },

  timeLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: 400,
    textAlign: "center",
    marginBottom: 8,
  },

  duration: {
    color: "#fff",
    fontSize: 22,
    fontWeight: 400,
  },

  priceRow: {
    height: 32,
    display: "grid",
    gridTemplateColumns: "1fr 70px 110px 130px",
    alignItems: "center",
    gap: 0,
    borderBottom: `1px solid rgba(167, 124, 0, 0.35)`,
  },

  discount: {
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

  originalPrice: {
    color: "#9a9a9a",
    fontSize: 16,
    textDecoration: "line-through",
  },

  salePrice: {
    justifySelf: "end",
    marginLeft: 0,
    color: "#fff",
    fontSize: 22,
    fontWeight: 500,
  },

  infoContent: {
    padding: "26px 32px 34px",
    minHeight: 260,
    background: "#000",
  },

  infoContentRow: {
    minHeight: 44,
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    alignItems: "center",
    borderBottom: `1px solid rgba(167, 124, 0, 0.35)`,
  },

  infoContentLabel: {
    color: GOLD,
    fontSize: 18,
    fontWeight: 500,
  },

  infoContentValue: {
    color: "#ddd",
    fontSize: 18,
    fontWeight: 400,
  },

  introContent: {
    padding: "26px 32px 34px",
    minHeight: 260,
    background: "#000",
    color: "#ddd",
    fontSize: 18,
    fontWeight: 400,
    lineHeight: "30px",
  },
};

export default KaraokeShopDetailPage;