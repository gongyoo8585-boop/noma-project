"use strict";

import axios from "axios";

/**
 * =========================================================
 * 🔥 NORA MAP API SERVICE
 * ---------------------------------------------------------
 * ✔ 카카오맵 연동
 * ✔ 매장 리스트 조회
 * ✔ 내 주변 검색
 * ✔ 지도 영역 검색
 * ✔ 키워드 검색
 * ✔ 지역 필터 검색
 * ✔ 마커 데이터 변환
 * ✔ 거리 계산
 * ✔ 런타임 에러 방지
 * ✔ axios 에러 처리
 * ✔ timeout 처리
 * ✔ 안전한 응답 구조
 * ✔ 100% 완성형
 * =========================================================
 */

const API_TIMEOUT = 15000;
const DEFAULT_API_BASE = "https://api.nora365.co.kr/api";

const getRuntimeEnvValue = (key) => {
  try {
    if (
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env[key]
    ) {
      return import.meta.env[key];
    }
  } catch (error) {
    return "";
  }

  try {
    if (
      typeof process !== "undefined" &&
      process.env &&
      process.env[key]
    ) {
      return process.env[key];
    }
  } catch (error) {
    return "";
  }

  return "";
};

const isLocalHost = (hostname = "") => {
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(
    String(hostname || "").toLowerCase()
  );
};

const isProductionHost = (hostname = "") => {
  const host = String(hostname || "").toLowerCase().trim();

  return (
    host === "nora365.co.kr" ||
    host === "www.nora365.co.kr" ||
    host === "m.nora365.co.kr" ||
    host.endsWith(".nora365.co.kr")
  );
};

const getCurrentHostname = () => {
  return typeof window !== "undefined" && window.location
    ? window.location.hostname
    : "";
};

const normalizeApiBaseUrl = (value) => {
  const rawValue = String(value || "").trim();
  const currentHostname = getCurrentHostname();

  if (isProductionHost(currentHostname)) {
    return DEFAULT_API_BASE;
  }

  if (!rawValue || rawValue === "undefined" || rawValue === "null") {
    return DEFAULT_API_BASE;
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
      !isLocalHost(currentHostname) &&
      isLocalHost(url.hostname)
    ) {
      return DEFAULT_API_BASE;
    }

    if (isLocalHost(currentHostname) && isLocalHost(url.hostname)) {
      return DEFAULT_API_BASE;
    }

    const fixedPathname = String(url.pathname || "")
      .replace(/\/api\/api\/?$/, "/api")
      .replace(/\/+$/, "");

    return `${url.origin}${fixedPathname || "/api"}`.replace(
      "/api/api",
      "/api"
    );
  } catch (error) {
    return DEFAULT_API_BASE;
  }
};

const BASE_URL = normalizeApiBaseUrl(
  getRuntimeEnvValue("VITE_API_URL") ||
    getRuntimeEnvValue("REACT_APP_API_URL") ||
    DEFAULT_API_BASE
);

const MAP_ENDPOINT = `${BASE_URL}/map`;
const SHOP_ENDPOINT = `${BASE_URL}/shops`;

const api = axios.create({
  baseURL: BASE_URL,

  timeout: API_TIMEOUT,

  headers: {
    "Content-Type": "application/json",
  },
});

/* =========================================================
🔥 RESPONSE SAFE HANDLER
========================================================= */

const normalizeResponsePayload = (payload, fallback = []) => {
  try {
    if (payload === null || payload === undefined) {
      return fallback;
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.shops)) {
      return payload.shops;
    }

    if (Array.isArray(payload?.items)) {
      return payload.items;
    }

    if (Array.isArray(payload?.list)) {
      return payload.list;
    }

    if (Array.isArray(payload?.result)) {
      return payload.result;
    }

    if (Array.isArray(payload?.results)) {
      return payload.results;
    }

    if (Array.isArray(payload?.markers)) {
      return payload.markers;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.data?.shops)) {
      return payload.data.shops;
    }

    if (Array.isArray(payload?.data?.items)) {
      return payload.data.items;
    }

    if (Array.isArray(payload?.data?.list)) {
      return payload.data.list;
    }

    if (Array.isArray(payload?.data?.result)) {
      return payload.data.result;
    }

    if (Array.isArray(payload?.data?.results)) {
      return payload.data.results;
    }

    if (Array.isArray(payload?.data?.markers)) {
      return payload.data.markers;
    }

    if (
      payload?.shop &&
      typeof payload.shop === "object" &&
      !Array.isArray(payload.shop)
    ) {
      return [payload.shop];
    }

    if (
      payload?.item &&
      typeof payload.item === "object" &&
      !Array.isArray(payload.item)
    ) {
      return [payload.item];
    }

    if (
      payload?.marker &&
      typeof payload.marker === "object" &&
      !Array.isArray(payload.marker)
    ) {
      return [payload.marker];
    }

    if (
      payload?.data &&
      typeof payload.data === "object" &&
      !Array.isArray(payload.data)
    ) {
      if (
        payload.data.shop &&
        typeof payload.data.shop === "object" &&
        !Array.isArray(payload.data.shop)
      ) {
        return [payload.data.shop];
      }

      if (
        payload.data.item &&
        typeof payload.data.item === "object" &&
        !Array.isArray(payload.data.item)
      ) {
        return [payload.data.item];
      }
    }

    return fallback;
  } catch (error) {
    console.error("normalizeResponsePayload Error:", error);

    return fallback;
  }
};

const safeResponse = (response, fallback = []) => {
  try {
    if (!response) {
      return fallback;
    }

    return normalizeResponsePayload(response.data, fallback);
  } catch (error) {
    console.error("safeResponse Error:", error);

    return fallback;
  }
};

const normalizeShopList = (shops = []) => {
  if (!Array.isArray(shops)) {
    return [];
  }

  return shops
    .map(normalizeShop)
    .filter((shop) => shop && shop.hasValidCoordinate);
};

/* =========================================================
🔥 ERROR HANDLER
========================================================= */

const handleApiError = (error, fallback = []) => {
  console.error("Map API Error:", error);

  return {
    success: false,

    data: fallback,

    error:
      error?.response?.data?.message ||
      error?.response?.data?.msg ||
      error?.response?.data?.error ||
      error?.message ||
      "지도 데이터를 불러오지 못했습니다.",
  };
};

/* =========================================================
🔥 SHOP NORMALIZER
========================================================= */

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(String(value).replaceAll(",", "").trim());

  return Number.isFinite(number) ? number : null;
};

const getCoordinateValue = (shop = {}, type = "lat") => {
  if (type === "lat") {
    return normalizeNumber(
      shop?.lat ??
        shop?.latitude ??
        shop?.y ??
        shop?.location?.lat ??
        shop?.location?.latitude ??
        shop?.geo?.coordinates?.[1] ??
        shop?.coordinates?.lat ??
        shop?.coordinates?.latitude
    );
  }

  return normalizeNumber(
    shop?.lng ??
      shop?.lon ??
      shop?.long ??
      shop?.longitude ??
      shop?.x ??
      shop?.location?.lng ??
      shop?.location?.lon ??
      shop?.location?.longitude ??
      shop?.geo?.coordinates?.[0] ??
      shop?.coordinates?.lng ??
      shop?.coordinates?.lon ??
      shop?.coordinates?.longitude
  );
};

const normalizeImage = (shop = {}) => {
  const image =
    shop?.image ||
    shop?.thumbnail ||
    shop?.imageUrl ||
    shop?.mainImage ||
    shop?.representativeImage ||
    shop?.coverImage ||
    shop?.photos?.[0] ||
    shop?.images?.[0] ||
    shop?.imageUrls?.[0] ||
    "";

  return typeof image === "string" ? image : image?.url || image?.src || "";
};

const normalizePrice = (value) => {
  if (Array.isArray(value)) {
    const numbers = value
      .map((item) => normalizeNumber(item))
      .filter((item) => item !== null);

    return numbers[0] || 0;
  }

  return normalizeNumber(value) || 0;
};

const normalizeShop = (shop = {}) => {
  const lat = getCoordinateValue(shop, "lat");
  const lng = getCoordinateValue(shop, "lng");
  const hasValidCoordinate =
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  return {
    id: shop?.id || shop?._id || shop?.shopId || "",

    name: shop?.name || shop?.shopName || shop?.title || "노라 마사지",

    lat: hasValidCoordinate ? lat : null,

    lng: hasValidCoordinate ? lng : null,

    latitude: hasValidCoordinate ? lat : null,

    longitude: hasValidCoordinate ? lng : null,

    address:
      shop?.address ||
      shop?.roadAddress ||
      shop?.fullAddress ||
      shop?.jibunAddress ||
      "경상남도 김해시",

    distance: shop?.distance || shop?.distanceText || "",

    image: normalizeImage(shop),

    rating: normalizeNumber(shop?.rating) || 5.0,

    reviewCount: normalizeNumber(shop?.reviewCount) || 0,

    favoriteCount:
      normalizeNumber(shop?.favoriteCount) || normalizeNumber(shop?.likeCount) || 0,

    discountRate:
      normalizeNumber(shop?.discountRate) ||
      normalizeNumber(shop?.discount) ||
      normalizeNumber(shop?.saleRate) ||
      0,

    price:
      normalizePrice(shop?.priceDiscount) ||
      normalizePrice(shop?.discountPrice) ||
      normalizePrice(shop?.price) ||
      0,

    originalPrice:
      normalizePrice(shop?.priceOriginal) ||
      normalizePrice(shop?.originalPrice) ||
      normalizePrice(shop?.originPrice) ||
      0,

    category: shop?.category || shop?.shopCategory || shop?.serviceType || "마사지",

    badge: shop?.badge || shop?.premiumType || (shop?.premium ? "PREMIUM" : "BEST"),

    premium: shop?.premium === true || shop?.isPremium === true,

    isPremium: shop?.isPremium === true || shop?.premium === true,

    status: shop?.status || "active",

    visible: shop?.visible !== false,

    approved: shop?.approved !== false,

    hasValidCoordinate,

    location: {
      ...(shop?.location || {}),
      lat: hasValidCoordinate ? lat : null,
      lng: hasValidCoordinate ? lng : null,
    },

    raw: shop,
  };
};

/* =========================================================
🔥 GET ALL SHOPS
========================================================= */

export const getMapShops = async (params = {}) => {
  try {
    const response = await api.get(`${MAP_ENDPOINT}/shops`, {
      params,
    });

    const shops = safeResponse(response, []);

    return {
      success: true,

      data: normalizeShopList(shops),
    };
  } catch (error) {
    return handleApiError(error, []);
  }
};

/* =========================================================
🔥 GET NEARBY SHOPS
========================================================= */

export const getNearbyShops = async ({ lat, lng, radius = 3000 } = {}) => {
  try {
    const response = await api.get(`${MAP_ENDPOINT}/nearby`, {
      params: {
        lat,
        lng,
        radius,
      },
    });

    const shops = safeResponse(response, []);

    return {
      success: true,

      data: normalizeShopList(shops),
    };
  } catch (error) {
    return handleApiError(error, []);
  }
};

/* =========================================================
🔥 SEARCH SHOPS
========================================================= */

export const searchMapShops = async ({
  keyword = "",
  region = "",
  district = "",
  category = "",
} = {}) => {
  try {
    const response = await api.get(`${SHOP_ENDPOINT}/search`, {
      params: {
        keyword,
        region,
        district,
        category,
      },
    });

    const shops = safeResponse(response, []);

    return {
      success: true,

      data: normalizeShopList(shops),
    };
  } catch (error) {
    return handleApiError(error, []);
  }
};

/* =========================================================
🔥 GET REGION SHOPS
========================================================= */

export const getRegionShops = async ({
  region = "",
  district = "",
  category = "",
} = {}) => {
  try {
    const response = await api.get(`${MAP_ENDPOINT}/region`, {
      params: {
        region,
        district,
        category,
      },
    });

    const shops = safeResponse(response, []);

    return {
      success: true,

      data: normalizeShopList(shops),
    };
  } catch (error) {
    return handleApiError(error, []);
  }
};

/* =========================================================
🔥 GET MAP BOUNDS SHOPS
========================================================= */

export const getBoundsShops = async ({ swLat, swLng, neLat, neLng } = {}) => {
  try {
    const response = await api.get(`${MAP_ENDPOINT}/bounds`, {
      params: {
        swLat,
        swLng,
        neLat,
        neLng,
      },
    });

    const shops = safeResponse(response, []);

    return {
      success: true,

      data: normalizeShopList(shops),
    };
  } catch (error) {
    return handleApiError(error, []);
  }
};

/* =========================================================
🔥 GET SHOP DETAIL
========================================================= */

export const getMapShopDetail = async (shopId) => {
  try {
    if (!shopId) {
      return {
        success: false,

        data: null,

        error: "매장 ID가 없습니다.",
      };
    }

    const response = await api.get(`${SHOP_ENDPOINT}/${shopId}`);

    const shop = safeResponse(response, null);
    const targetShop = Array.isArray(shop) ? shop[0] : shop;

    return {
      success: true,

      data: targetShop ? normalizeShop(targetShop) : null,
    };
  } catch (error) {
    return handleApiError(error, null);
  }
};

/* =========================================================
🔥 CURRENT LOCATION
========================================================= */

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("위치 서비스를 지원하지 않습니다."));

        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,

            lng: position.coords.longitude,
          });
        },

        (error) => {
          reject(error);
        },

        {
          enableHighAccuracy: true,

          timeout: 10000,

          maximumAge: 0,
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

/* =========================================================
🔥 LOAD KAKAO MAP SCRIPT
========================================================= */

export const loadKakaoMap = () => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === "undefined" || typeof document === "undefined") {
        reject(new Error("브라우저 환경에서만 지도를 불러올 수 있습니다."));

        return;
      }

      if (window.kakao && window.kakao.maps) {
        resolve(window.kakao);

        return;
      }

      const existingScript = document.getElementById("kakao-map-script");

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => {
              resolve(window.kakao);
            });
          } else {
            reject(new Error("카카오맵 스크립트 로드 실패"));
          }
        });

        existingScript.addEventListener("error", reject);

        return;
      }

      const kakaoMapKey =
        getRuntimeEnvValue("VITE_KAKAO_MAP_KEY") ||
        getRuntimeEnvValue("REACT_APP_KAKAO_MAP_KEY");

      if (!kakaoMapKey) {
        reject(new Error("카카오맵 키가 없습니다."));

        return;
      }

      const script = document.createElement("script");

      script.id = "kakao-map-script";

      script.async = true;

      script.defer = true;

      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&autoload=false&libraries=services,clusterer,drawing`;

      script.onload = () => {
        window.kakao.maps.load(() => {
          resolve(window.kakao);
        });
      };

      script.onerror = (error) => {
        reject(error);
      };

      document.body.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
};

/* =========================================================
🔥 DISTANCE CALCULATOR
========================================================= */

export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  try {
    const fixedLat1 = normalizeNumber(lat1);
    const fixedLng1 = normalizeNumber(lng1);
    const fixedLat2 = normalizeNumber(lat2);
    const fixedLng2 = normalizeNumber(lng2);

    if (
      fixedLat1 === null ||
      fixedLng1 === null ||
      fixedLat2 === null ||
      fixedLng2 === null
    ) {
      return "";
    }

    const R = 6371;

    const dLat = ((fixedLat2 - fixedLat1) * Math.PI) / 180;

    const dLng = ((fixedLng2 - fixedLng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((fixedLat1 * Math.PI) / 180) *
        Math.cos((fixedLat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }

    return `${distance.toFixed(1)}km`;
  } catch (error) {
    console.error("Distance Error:", error);

    return "";
  }
};

/* =========================================================
🔥 DEFAULT EXPORT
========================================================= */

const mapApi = {
  getMapShops,

  getNearbyShops,

  searchMapShops,

  getRegionShops,

  getBoundsShops,

  getMapShopDetail,

  getCurrentLocation,

  loadKakaoMap,

  calculateDistance,
};

export default mapApi;
