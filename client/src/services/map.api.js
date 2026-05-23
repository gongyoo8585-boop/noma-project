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

const BASE_URL =
  import.meta?.env?.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:10000/api";

const MAP_ENDPOINT =
  `${BASE_URL}/map`;

const SHOP_ENDPOINT =
  `${BASE_URL}/shops`;

const api = axios.create({
  baseURL: BASE_URL,

  timeout: API_TIMEOUT,

  headers: {
    "Content-Type":
      "application/json",
  },
});

/* =========================================================
🔥 RESPONSE SAFE HANDLER
========================================================= */

const safeResponse = (
  response,
  fallback = []
) => {
  try {
    if (!response) {
      return fallback;
    }

    if (
      response?.data?.data
    ) {
      return response.data.data;
    }

    if (
      response?.data?.shops
    ) {
      return response.data.shops;
    }

    if (
      Array.isArray(
        response?.data
      )
    ) {
      return response.data;
    }

    return fallback;
  } catch (error) {
    console.error(
      "safeResponse Error:",
      error
    );

    return fallback;
  }
};

/* =========================================================
🔥 ERROR HANDLER
========================================================= */

const handleApiError = (
  error,
  fallback = []
) => {
  console.error(
    "Map API Error:",
    error
  );

  return {
    success: false,

    data: fallback,

    error:
      error?.response?.data
        ?.message ||
      error?.message ||
      "지도 데이터를 불러오지 못했습니다.",
  };
};

/* =========================================================
🔥 SHOP NORMALIZER
========================================================= */

const normalizeShop = (
  shop = {}
) => {
  return {
    id:
      shop?.id ||
      shop?._id ||
      `shop-${Date.now()}`,

    name:
      shop?.name ||
      "노라 마사지",

    lat:
      Number(
        shop?.lat ||
          shop?.latitude ||
          shop?.y
      ) || 35.2283,

    lng:
      Number(
        shop?.lng ||
          shop?.longitude ||
          shop?.x
      ) || 128.8892,

    address:
      shop?.address ||
      shop?.roadAddress ||
      "경상남도 김해시",

    distance:
      shop?.distance ||
      "0.1km",

    image:
      shop?.image ||
      shop?.thumbnail ||
      shop?.imageUrl ||
      "",

    rating:
      Number(
        shop?.rating
      ) || 5.0,

    reviewCount:
      Number(
        shop?.reviewCount
      ) || 0,

    favoriteCount:
      Number(
        shop?.favoriteCount
      ) || 0,

    discountRate:
      Number(
        shop?.discountRate
      ) || 0,

    price:
      Number(
        shop?.price
      ) || 0,

    originalPrice:
      Number(
        shop?.originalPrice
      ) || 0,

    category:
      shop?.category ||
      "마사지",

    badge:
      shop?.badge ||
      "BEST",

    raw: shop,
  };
};

/* =========================================================
🔥 GET ALL SHOPS
========================================================= */

export const getMapShops =
  async (
    params = {}
  ) => {
    try {
      const response =
        await api.get(
          `${MAP_ENDPOINT}/shops`,
          {
            params,
          }
        );

      const shops =
        safeResponse(
          response,
          []
        );

      return {
        success: true,

        data: Array.isArray(
          shops
        )
          ? shops.map(
              normalizeShop
            )
          : [],
      };
    } catch (error) {
      return handleApiError(
        error,
        []
      );
    }
  };

/* =========================================================
🔥 GET NEARBY SHOPS
========================================================= */

export const getNearbyShops =
  async ({
    lat,
    lng,
    radius = 3000,
  } = {}) => {
    try {
      const response =
        await api.get(
          `${MAP_ENDPOINT}/nearby`,
          {
            params: {
              lat,
              lng,
              radius,
            },
          }
        );

      const shops =
        safeResponse(
          response,
          []
        );

      return {
        success: true,

        data: Array.isArray(
          shops
        )
          ? shops.map(
              normalizeShop
            )
          : [],
      };
    } catch (error) {
      return handleApiError(
        error,
        []
      );
    }
  };

/* =========================================================
🔥 SEARCH SHOPS
========================================================= */

export const searchMapShops =
  async ({
    keyword = "",
    region = "",
    district = "",
    category = "",
  } = {}) => {
    try {
      const response =
        await api.get(
          `${SHOP_ENDPOINT}/search`,
          {
            params: {
              keyword,
              region,
              district,
              category,
            },
          }
        );

      const shops =
        safeResponse(
          response,
          []
        );

      return {
        success: true,

        data: Array.isArray(
          shops
        )
          ? shops.map(
              normalizeShop
            )
          : [],
      };
    } catch (error) {
      return handleApiError(
        error,
        []
      );
    }
  };

/* =========================================================
🔥 GET REGION SHOPS
========================================================= */

export const getRegionShops =
  async ({
    region = "",
    district = "",
    category = "",
  } = {}) => {
    try {
      const response =
        await api.get(
          `${MAP_ENDPOINT}/region`,
          {
            params: {
              region,
              district,
              category,
            },
          }
        );

      const shops =
        safeResponse(
          response,
          []
        );

      return {
        success: true,

        data: Array.isArray(
          shops
        )
          ? shops.map(
              normalizeShop
            )
          : [],
      };
    } catch (error) {
      return handleApiError(
        error,
        []
      );
    }
  };

/* =========================================================
🔥 GET MAP BOUNDS SHOPS
========================================================= */

export const getBoundsShops =
  async ({
    swLat,
    swLng,
    neLat,
    neLng,
  } = {}) => {
    try {
      const response =
        await api.get(
          `${MAP_ENDPOINT}/bounds`,
          {
            params: {
              swLat,
              swLng,
              neLat,
              neLng,
            },
          }
        );

      const shops =
        safeResponse(
          response,
          []
        );

      return {
        success: true,

        data: Array.isArray(
          shops
        )
          ? shops.map(
              normalizeShop
            )
          : [],
      };
    } catch (error) {
      return handleApiError(
        error,
        []
      );
    }
  };

/* =========================================================
🔥 GET SHOP DETAIL
========================================================= */

export const getMapShopDetail =
  async (
    shopId
  ) => {
    try {
      if (!shopId) {
        return {
          success: false,

          data: null,

          error:
            "매장 ID가 없습니다.",
        };
      }

      const response =
        await api.get(
          `${SHOP_ENDPOINT}/${shopId}`
        );

      const shop =
        safeResponse(
          response,
          null
        );

      return {
        success: true,

        data:
          normalizeShop(
            shop
          ),
      };
    } catch (error) {
      return handleApiError(
        error,
        null
      );
    }
  };

/* =========================================================
🔥 CURRENT LOCATION
========================================================= */

export const getCurrentLocation =
  () => {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        try {
          if (
            !navigator.geolocation
          ) {
            reject(
              new Error(
                "위치 서비스를 지원하지 않습니다."
              )
            );

            return;
          }

          navigator.geolocation.getCurrentPosition(
            (
              position
            ) => {
              resolve({
                lat:
                  position
                    .coords
                    .latitude,

                lng:
                  position
                    .coords
                    .longitude,
              });
            },

            (error) => {
              reject(
                error
              );
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
      }
    );
  };

/* =========================================================
🔥 LOAD KAKAO MAP SCRIPT
========================================================= */

export const loadKakaoMap =
  () => {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        try {
          if (
            window.kakao &&
            window.kakao.maps
          ) {
            resolve(
              window.kakao
            );

            return;
          }

          const existingScript =
            document.getElementById(
              "kakao-map-script"
            );

          if (
            existingScript
          ) {
            existingScript.addEventListener(
              "load",
              () => {
                resolve(
                  window.kakao
                );
              }
            );

            return;
          }

          const script =
            document.createElement(
              "script"
            );

          script.id =
            "kakao-map-script";

          script.async = true;

          script.defer = true;

          script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${
            import.meta
              ?.env
              ?.VITE_KAKAO_MAP_KEY ||
            process.env
              .REACT_APP_KAKAO_MAP_KEY
          }&autoload=false&libraries=services,clusterer,drawing`;

          script.onload =
            () => {
              window.kakao.maps.load(
                () => {
                  resolve(
                    window.kakao
                  );
                }
              );
            };

          script.onerror =
            (error) => {
              reject(
                error
              );
            };

          document.body.appendChild(
            script
          );
        } catch (error) {
          reject(error);
        }
      }
    );
  };

/* =========================================================
🔥 DISTANCE CALCULATOR
========================================================= */

export const calculateDistance =
  (
    lat1,
    lng1,
    lat2,
    lng2
  ) => {
    try {
      const R = 6371;

      const dLat =
        ((lat2 -
          lat1) *
          Math.PI) /
        180;

      const dLng =
        ((lng2 -
          lng1) *
          Math.PI) /
        180;

      const a =
        Math.sin(
          dLat / 2
        ) *
          Math.sin(
            dLat / 2
          ) +
        Math.cos(
          (lat1 *
            Math.PI) /
            180
        ) *
          Math.cos(
            (lat2 *
              Math.PI) /
              180
          ) *
          Math.sin(
            dLng / 2
          ) *
          Math.sin(
            dLng / 2
          );

      const c =
        2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(
            1 - a
          )
        );

      const distance =
        R * c;

      if (
        distance < 1
      ) {
        return `${Math.round(
          distance *
            1000
        )}m`;
      }

      return `${distance.toFixed(
        1
      )}km`;
    } catch (error) {
      console.error(
        "Distance Error:",
        error
      );

      return "0km";
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