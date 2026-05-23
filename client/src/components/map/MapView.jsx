"use strict";

import React, { useEffect, useRef, useState } from "react";

/**
=====================================================

🔥 MAP VIEW (KAKAO) - COMPLETE

✔ Kakao 지도 로드/초기화
✔ 마커 렌더링
✔ 선택 마커 강조
✔ 지도 이동 이벤트 → onMapMove
✔ 클릭 이벤트 → onMarkerClick
✔ 주소 기반 좌표 보정
✔ 관리자 주소 수정 후 최신 위치 반영
✔ 구버전 파란 마커 차단
✔ 구버전 사각형 overlay 카드 차단
✔ 다크맵 처리
✔ 네온 마커 glow
✔ 선택 매장 premium overlay
✔ 기존 구조/props 100% 호환

=====================================================
*/

const DEFAULT_CENTER = {
  lat: 35.2613,
  lng: 128.871,
};

const BUSAN_CITY_HALL_POSITION = {
  lat: 35.1796,
  lng: 129.0756,
};

function getKakaoAppKey(appKey) {
  const key =
    appKey ||
    window.ENV?.KAKAO_MAP_KEY ||
    window.__ENV__?.KAKAO_MAP_KEY ||
    window.__ENV__?.KAKAO_KEY ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_KAKAO_MAP_KEY) ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_KAKAO_KEY) ||
    "";

  return String(key || "").trim();
}

function loadKakaoScript(appKey) {
  return new Promise((resolve, reject) => {
    if (
      window.kakao &&
      window.kakao.maps &&
      window.kakao.maps.services
    ) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("kakao-map-sdk");

    if (existingScript) {
      existingScript.onload = () => {
        if (
          window.kakao &&
          window.kakao.maps &&
          typeof window.kakao.maps.load === "function"
        ) {
          window.kakao.maps.load(() => resolve());
          return;
        }

        reject(new Error("KAKAO_MAP_LOAD_FAIL"));
      };

      existingScript.onerror = () => {
        reject(new Error("KAKAO_SCRIPT_LOAD_FAIL"));
      };

      if (
        window.kakao &&
        window.kakao.maps &&
        typeof window.kakao.maps.load === "function"
      ) {
        window.kakao.maps.load(() => resolve());
      }

      return;
    }

    const safeKey = getKakaoAppKey(appKey);

    if (!safeKey) {
      reject(new Error("KAKAO_MAP_KEY_MISSING"));
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${safeKey}&libraries=services,clusterer,drawing&autoload=false`;
    script.async = true;

    script.onload = () => {
      if (
        window.kakao &&
        window.kakao.maps &&
        typeof window.kakao.maps.load === "function"
      ) {
        window.kakao.maps.load(() => resolve());
        return;
      }

      reject(new Error("KAKAO_MAP_LOAD_FAIL"));
    };

    script.onerror = () => {
      reject(new Error("KAKAO_SCRIPT_LOAD_FAIL"));
    };

    document.head.appendChild(script);
  });
}

function MapView({
  shops = [],
  selectedShopId,
  onMarkerClick,
  onMapMove,
  center,
  height = "100%",
}) {
  const mapWrapRef = useRef(null);
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const geocodeCacheRef = useRef({});
  const lastSafeCenterRef = useRef(DEFAULT_CENTER);

  const [mapReady, setMapReady] = useState(false);
  const [resolvedShops, setResolvedShops] = useState([]);

  /* 🔥 최소 추가: 프로그램 이동 구분용 */
  const isProgrammaticMove = useRef(false);

  const isValidCoord = (lat, lng) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    return (
      Number.isFinite(latNum) &&
      Number.isFinite(lngNum) &&
      latNum !== 0 &&
      lngNum !== 0 &&
      latNum >= 33 &&
      latNum <= 39 &&
      lngNum >= 124 &&
      lngNum <= 132
    );
  };

  const isBusanCityHallCoord = (lat, lng) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return false;
    }

    return (
      Math.abs(latNum - BUSAN_CITY_HALL_POSITION.lat) < 0.002 &&
      Math.abs(lngNum - BUSAN_CITY_HALL_POSITION.lng) < 0.002
    );
  };

  const getShopId = (shop = {}, index = "") => {
    return (
      shop?._id ||
      shop?.id ||
      `${shop?.name || "shop"}-${shop?.address || "address"}-${index}`
    );
  };

  const getShopAddress = (shop = {}) => {
    return String(
      shop?.roadAddress ||
        shop?.road_address_name ||
        shop?.address ||
        shop?.locationText ||
        ""
    ).trim();
  };

  const escapeHtml = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatPrice = (value, fallback = "0") => {
    const n = Number(
      String(value ?? "")
        .replace(/,/g, "")
        .replace(/원/g, "")
        .trim()
    );

    if (!Number.isFinite(n) || n <= 0) return fallback;

    return n.toLocaleString("ko-KR");
  };

  const getShopImage = (shop = {}) => {
    const images =
      shop?.images ||
      shop?.photos ||
      shop?.imageUrls ||
      shop?.photoUrls ||
      [];

    if (Array.isArray(images) && images.length > 0) {
      const first = images.find(Boolean);
      if (typeof first === "string") return first;
      if (first?.url) return first.url;
      if (first?.src) return first.src;
      if (first?.path) return first.path;
    }

    return (
      shop?.thumbnail ||
      shop?.thumbnailUrl ||
      shop?.image ||
      shop?.imageUrl ||
      shop?.mainImage ||
      shop?.mainImageUrl ||
      ""
    );
  };

  const getShopCourse = (shop = {}) => {
    const courses = shop?.courses || shop?.courseList || shop?.menus || [];
    if (Array.isArray(courses) && courses.length > 0) {
      const first = courses[0];
      if (typeof first === "string") return first;
      return first?.name || first?.title || first?.course || "";
    }

    return shop?.course || shop?.courseName || shop?.service || shop?.description || "";
  };

  const getShopPrice = (shop = {}) => {
    const prices = shop?.prices || shop?.priceList || shop?.menus || [];
    if (Array.isArray(prices) && prices.length > 0) {
      const first = prices[0];
      if (typeof first === "number" || typeof first === "string") return first;
      return first?.price || first?.amount || first?.salePrice || "";
    }

    return shop?.price || shop?.salePrice || shop?.minPrice || shop?.amount || "";
  };

  const getShopOriginalPrice = (shop = {}) => {
    return shop?.originalPrice || shop?.originPrice || shop?.regularPrice || shop?.beforePrice || "";
  };

  const getShopDiscount = (shop = {}) => {
    return shop?.discountRate || shop?.discount || shop?.saleRate || 44;
  };

  const getShopRating = (shop = {}) => {
    const rating = Number(shop?.rating || shop?.ratingAvg || shop?.score || 5);
    return Number.isFinite(rating) ? rating.toFixed(1) : "5.0";
  };

  const getShopReviewCount = (shop = {}) => {
    const count = Number(shop?.reviewCount || shop?.reviewsCount || shop?.reviews?.length || 125);
    return Number.isFinite(count) ? count : 125;
  };

  const hideLegacyTopBadges = () => {
    try {
      if (!mapWrapRef.current) {
        return;
      }

      const mapNode = mapRef.current;
      const scopes = [
        mapWrapRef.current,
        mapWrapRef.current.parentElement,
        mapWrapRef.current.parentElement?.parentElement,
        mapWrapRef.current.parentElement?.parentElement?.parentElement,
      ].filter(Boolean);

      scopes.forEach((scope) => {
        const nodes = Array.from(
          scope.querySelectorAll("div, span, button, strong, p")
        );

        nodes.forEach((node) => {
          if (!node || node === mapWrapRef.current || node === mapNode) {
            return;
          }

          const text = String(node.textContent || "").replace(/\s/g, "");
          const isTargetText =
            text === "내주변" ||
            text === "내위치" ||
            /^매장\d+개$/.test(text) ||
            (text.includes("내위치") && text.length <= 12) ||
            (text.includes("내주변") && text.length <= 12) ||
            (/매장\d+개/.test(text) && text.length <= 12);

          if (!isTargetText) {
            return;
          }

          const closestButton = node.closest("button");
          const closestDiv = node.closest("div");

          let target = closestButton || closestDiv || node;

          if (mapNode && target && target.contains(mapNode)) {
            target = node;
          }

          if (
            !target ||
            target === mapWrapRef.current ||
            target === mapNode ||
            (mapNode && target.contains(mapNode))
          ) {
            return;
          }

          target.style.display = "none";
          target.style.visibility = "hidden";
          target.style.pointerEvents = "none";
          target.style.height = "0";
          target.style.minHeight = "0";
          target.style.maxHeight = "0";
          target.style.margin = "0";
          target.style.padding = "0";
          target.style.border = "0";
          target.style.overflow = "hidden";
          target.setAttribute("aria-hidden", "true");
        });

        Array.from(scope.children || []).forEach((child) => {
          if (!child || child === mapWrapRef.current) {
            return;
          }

          if (mapNode && child.contains(mapNode)) {
            return;
          }

          const text = String(child.textContent || "").replace(/\s/g, "");

          if (
            text === "내주변" ||
            text === "내위치" ||
            /^매장\d+개$/.test(text) ||
            (text.includes("내위치") && text.length <= 20) ||
            (text.includes("내주변") && text.length <= 20) ||
            (/매장\d+개/.test(text) && text.length <= 20)
          ) {
            child.style.display = "none";
            child.style.visibility = "hidden";
            child.style.pointerEvents = "none";
            child.style.height = "0";
            child.style.minHeight = "0";
            child.style.maxHeight = "0";
            child.style.margin = "0";
            child.style.padding = "0";
            child.style.border = "0";
            child.style.overflow = "hidden";
            child.setAttribute("aria-hidden", "true");
          }
        });
      });

      if (mapWrapRef.current.parentElement) {
        mapWrapRef.current.parentElement.style.paddingTop = "0";
        mapWrapRef.current.parentElement.style.marginTop = "0";
        mapWrapRef.current.parentElement.style.overflow = "hidden";
      }

      mapWrapRef.current.style.marginTop = "0";
      mapWrapRef.current.style.paddingTop = "0";

      if (mapObjRef.current && window.kakao && window.kakao.maps) {
        window.kakao.maps.event.trigger(mapObjRef.current, "resize");

        const safeCenter = lastSafeCenterRef.current || DEFAULT_CENTER;

        mapObjRef.current.setCenter(
          new window.kakao.maps.LatLng(safeCenter.lat, safeCenter.lng)
        );
      }
    } catch (e) {
      console.warn("MAP BADGE HIDE SKIP:", e.message);
    }
  };

  const geocodeShop = (shop) => {
    return new Promise((resolve) => {
      try {
        const address = getShopAddress(shop);

        if (
          !address ||
          !window.kakao ||
          !window.kakao.maps ||
          !window.kakao.maps.services ||
          !window.kakao.maps.services.Geocoder
        ) {
          resolve(null);
          return;
        }

        if (geocodeCacheRef.current[address]) {
          resolve(geocodeCacheRef.current[address]);
          return;
        }

        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(address, (result, status) => {
          if (
            status === window.kakao.maps.services.Status.OK &&
            Array.isArray(result) &&
            result[0]
          ) {
            const roadItem = result.find((item) => item.road_address) || result[0];

            const lat = Number(roadItem.y);
            const lng = Number(roadItem.x);

            if (
              isValidCoord(lat, lng) &&
              !isBusanCityHallCoord(lat, lng)
            ) {
              const next = {
                lat,
                lng,
              };

              geocodeCacheRef.current[address] = next;
              resolve(next);
              return;
            }
          }

          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  };

  const normalizeShopWithCoord = async (shop, index) => {
    const lat =
      shop?.lat ??
      shop?.latitude ??
      shop?.location?.lat ??
      shop?.location?.y ??
      shop?.geo?.coordinates?.[1] ??
      "";

    const lng =
      shop?.lng ??
      shop?.longitude ??
      shop?.location?.lng ??
      shop?.location?.x ??
      shop?.geo?.coordinates?.[0] ??
      "";

    const shopId = getShopId(shop, index);

    if (
      isValidCoord(lat, lng) &&
      !isBusanCityHallCoord(lat, lng)
    ) {
      return {
        ...shop,
        _id: shop?._id || shop?.id || shopId,
        id: shop?.id || shop?._id || shopId,
        lat: Number(lat),
        lng: Number(lng),
        location: {
          ...(shop?.location || {}),
          lat: Number(lat),
          lng: Number(lng),
        },
      };
    }

    const geo = await geocodeShop(shop);

    if (
      geo &&
      isValidCoord(geo.lat, geo.lng) &&
      !isBusanCityHallCoord(geo.lat, geo.lng)
    ) {
      return {
        ...shop,
        _id: shop?._id || shop?.id || shopId,
        id: shop?.id || shop?._id || shopId,
        lat: geo.lat,
        lng: geo.lng,
        location: {
          ...(shop?.location || {}),
          lat: geo.lat,
          lng: geo.lng,
        },
      };
    }

    return {
      ...shop,
      _id: shop?._id || shop?.id || shopId,
      id: shop?.id || shop?._id || shopId,
    };
  };

  const setMapCenterSafe = (lat, lng) => {
    if (!mapObjRef.current || !window.kakao || !window.kakao.maps) return;

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (
      !isValidCoord(latNum, lngNum) ||
      isBusanCityHallCoord(latNum, lngNum)
    ) {
      return;
    }

    const moveLatLon = new window.kakao.maps.LatLng(latNum, lngNum);

    isProgrammaticMove.current = true;

    mapObjRef.current.setCenter(moveLatLon);

    lastSafeCenterRef.current = {
      lat: latNum,
      lng: lngNum,
    };

    setTimeout(() => {
      isProgrammaticMove.current = false;
    }, 350);
  };

  const clearMarkers = () => {
    markersRef.current.forEach((m) => {
      if (m && typeof m.setMap === "function") {
        m.setMap(null);
      }
    });

    overlaysRef.current.forEach((m) => {
      if (m && typeof m.setMap === "function") {
        m.setMap(null);
      }
    });

    markersRef.current = [];
    overlaysRef.current = [];
  };

  const createMarkerContent = (shop = {}) => {
    const markerContent = document.createElement("button");
    markerContent.type = "button";
    markerContent.setAttribute("aria-label", shop?.name || "매장");
    markerContent.style.width = "72px";
    markerContent.style.height = "72px";
    markerContent.style.border = "none";
    markerContent.style.padding = "0";
    markerContent.style.margin = "0";
    markerContent.style.background = "transparent";
    markerContent.style.cursor = "pointer";
    markerContent.style.pointerEvents = "auto";
    markerContent.style.position = "relative";
    markerContent.style.filter = "drop-shadow(0 0 18px rgba(255,0,128,0.95))";

    markerContent.innerHTML = `
      <div
        style="
          width:72px;
          height:72px;
          position:relative;
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events:none;
        "
      >
        <div
          style="
            position:absolute;
            top:1px;
            left:50%;
            width:68px;
            height:68px;
            border-radius:50%;
            transform:translateX(-50%);
            background:radial-gradient(circle, rgba(255,0,128,0.42) 0%, rgba(255,0,128,0.18) 42%, rgba(255,0,128,0) 72%);
            filter:blur(2px);
            animation:noraMarkerPulse 1.45s infinite ease-in-out;
          "
        ></div>

        <div
          style="
            position:absolute;
            top:7px;
            left:50%;
            width:42px;
            height:42px;
            transform:translateX(-50%);
            border-radius:50% 50% 50% 0;
            background:linear-gradient(145deg, #ff4fa3 0%, #ff006f 42%, #e00058 100%);
            border:4px solid #ffd5ea;
            box-shadow:
              0 0 10px rgba(255,255,255,0.85),
              0 0 24px rgba(255,0,128,0.95),
              0 0 52px rgba(255,0,128,0.78),
              0 0 90px rgba(255,0,128,0.38);
            rotate:-45deg;
            z-index:2;
          "
        ></div>

        <div
          style="
            position:absolute;
            top:18px;
            left:50%;
            width:15px;
            height:15px;
            border-radius:50%;
            transform:translateX(-50%);
            background:#fff2f9;
            box-shadow:
              0 0 10px rgba(255,255,255,0.95),
              0 0 18px rgba(255,0,128,0.78);
            z-index:3;
          "
        ></div>

        <div
          style="
            position:absolute;
            bottom:1px;
            left:50%;
            width:14px;
            height:6px;
            transform:translateX(-50%);
            border-radius:50%;
            background:rgba(255,0,128,0.68);
            box-shadow:
              0 0 16px rgba(255,0,128,0.9),
              0 0 32px rgba(255,0,128,0.45);
          "
        ></div>
      </div>
    `;

    markerContent.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (onMarkerClick) onMarkerClick(shop);
    };

    return markerContent;
  };

  const createShopOverlayContent = (shop = {}) => {
    const shopId = shop?._id || shop?.id || "";
    const image = getShopImage(shop);
    const name = shop?.name || "노라 제휴 매장";
    const address = getShopAddress(shop) || "주소 정보 없음";
    const course = getShopCourse(shop) || "마사지 90분";
    const price = formatPrice(getShopPrice(shop), "60,000");
    const originalPrice = formatPrice(getShopOriginalPrice(shop), "106,800");
    const discount = getShopDiscount(shop);
    const rating = getShopRating(shop);
    const reviewCount = getShopReviewCount(shop);

    const overlay = document.createElement("div");
    overlay.style.width = "344px";
    overlay.style.maxWidth = "344px";
    overlay.style.position = "relative";
    overlay.style.pointerEvents = "auto";
    overlay.style.fontFamily =
      '"Pretendard", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    overlay.style.color = "#fff";

    overlay.innerHTML = `
      <style>
        @keyframes noraOverlayGlow {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(255,215,0,0.58),
              0 0 20px rgba(255,215,0,0.34),
              0 0 38px rgba(255,0,128,0.2),
              0 16px 48px rgba(0,0,0,0.86);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(255,215,0,0.86),
              0 0 28px rgba(255,215,0,0.52),
              0 0 52px rgba(255,0,128,0.34),
              0 18px 58px rgba(0,0,0,0.92);
          }
        }

        @keyframes noraMarkerPulse {
          0%, 100% {
            transform: translateX(-50%) scale(0.88);
            opacity: 0.62;
          }
          50% {
            transform: translateX(-50%) scale(1.18);
            opacity: 1;
          }
        }

        .nora-map-card-button:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
          box-shadow:
            0 0 12px rgba(255,0,128,0.75),
            0 0 28px rgba(255,0,128,0.45);
        }

        .nora-map-card-close:hover {
          transform: scale(1.08);
          color: #fff;
          text-shadow: 0 0 12px rgba(255,0,128,0.95);
        }
      </style>

      <div
        style="
          position:relative;
          width:344px;
          border:1px solid rgba(255,215,0,0.72);
          border-radius:10px;
          background:
            linear-gradient(180deg, rgba(8,8,8,0.98) 0%, rgba(0,0,0,0.96) 100%);
          overflow:hidden;
          animation:noraOverlayGlow 2.2s infinite ease-in-out;
          backdrop-filter:blur(8px);
        "
      >
        <button
          type="button"
          data-nora-close="true"
          class="nora-map-card-close"
          style="
            position:absolute;
            top:8px;
            right:8px;
            z-index:3;
            border:0;
            background:transparent;
            color:#ff314f;
            font-size:22px;
            line-height:1;
            font-weight:900;
            cursor:pointer;
            transition:all 0.16s ease;
          "
          aria-label="닫기"
        >×</button>

        <div
          style="
            position:relative;
            width:100%;
            height:118px;
            background:#060606;
            overflow:hidden;
          "
        >
          ${
            image
              ? `<img
                  src="${escapeHtml(image)}"
                  alt="${escapeHtml(name)}"
                  style="
                    width:100%;
                    height:118px;
                    object-fit:cover;
                    display:block;
                    filter:saturate(1.16) contrast(1.08);
                  "
                />`
              : `<div
                  style="
                    width:100%;
                    height:118px;
                    background:
                      radial-gradient(circle at 22% 28%, rgba(0,105,255,0.82), transparent 34%),
                      radial-gradient(circle at 82% 32%, rgba(255,0,128,0.82), transparent 36%),
                      linear-gradient(135deg, #050505 0%, #111 100%);
                  "
                ></div>`
          }

          <div
            style="
              position:absolute;
              top:8px;
              left:8px;
              padding:4px 8px;
              border-radius:3px;
              background:#ff006f;
              color:#fff;
              font-size:12px;
              line-height:1;
              font-weight:900;
              box-shadow:0 0 12px rgba(255,0,128,0.85);
            "
          >BEST</div>
        </div>

        <div style="padding:14px 14px 12px;">
          <div
            style="
              color:#fff;
              font-size:21px;
              line-height:1.2;
              font-weight:900;
              letter-spacing:-0.7px;
              margin-bottom:10px;
              text-shadow:0 0 10px rgba(255,255,255,0.18);
            "
          >${escapeHtml(name)}</div>

          <div
            style="
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:10px;
              padding-bottom:11px;
              border-bottom:1px solid rgba(255,215,0,0.18);
              margin-bottom:11px;
              color:#fff;
              font-size:13px;
              white-space:nowrap;
            "
          >
            <div style="display:flex;align-items:center;gap:7px;">
              <span style="color:#ffe600;font-size:16px;text-shadow:0 0 8px rgba(255,230,0,0.85);">★</span>
              <strong style="color:#ffd400;font-weight:900;">${escapeHtml(rating)}</strong>
              <span style="color:#e7e7e7;">(${escapeHtml(reviewCount)})</span>
              <span style="color:#ff006f;font-size:16px;margin-left:6px;">♡</span>
              <span style="color:#e7e7e7;">찜 941</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px;color:#f1f1f1;">
              <span style="color:#ffd400;text-shadow:0 0 8px rgba(255,215,0,0.75);">↕</span>
              <span>0.1km</span>
            </div>
          </div>

          <div
            style="
              color:#cfcfcf;
              font-size:12px;
              line-height:1.35;
              margin-bottom:13px;
              overflow:hidden;
              text-overflow:ellipsis;
              white-space:nowrap;
            "
          >↕ ${escapeHtml(address)}</div>

          <div
            style="
              color:#fff;
              font-size:16px;
              font-weight:800;
              margin-bottom:10px;
              overflow:hidden;
              text-overflow:ellipsis;
              white-space:nowrap;
            "
          >${escapeHtml(course)}</div>

          <div
            style="
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:12px;
              margin-bottom:14px;
            "
          >
            <div
              style="
                min-width:58px;
                height:40px;
                display:flex;
                align-items:center;
                justify-content:center;
                border:2px solid #ff006f;
                border-radius:3px;
                background:rgba(0,0,0,0.62);
                color:#fff;
                font-size:26px;
                font-weight:900;
                line-height:1;
                box-shadow:
                  inset 0 0 0 1px rgba(255,255,255,0.12),
                  0 0 14px rgba(255,0,128,0.62);
              "
            >${escapeHtml(discount)}%</div>

            <div
              style="
                margin-left:auto;
                display:flex;
                align-items:flex-end;
                justify-content:flex-end;
                gap:12px;
                min-width:0;
              "
            >
              <span
                style="
                  color:#8a8a8a;
                  font-size:13px;
                  text-decoration:line-through;
                  white-space:nowrap;
                "
              >${escapeHtml(originalPrice)}원</span>
              <strong
                style="
                  color:#fff;
                  font-size:26px;
                  font-weight:950;
                  line-height:1;
                  white-space:nowrap;
                  text-shadow:0 0 10px rgba(255,255,255,0.16);
                "
              >${escapeHtml(price)}원</strong>
            </div>
          </div>

          <button
            type="button"
            data-nora-detail="true"
            class="nora-map-card-button"
            style="
              width:100%;
              height:48px;
              border:0;
              border-radius:4px;
              background:linear-gradient(180deg, #ff006f 0%, #dd004f 100%);
              color:#fff;
              font-size:17px;
              font-weight:900;
              letter-spacing:-0.3px;
              cursor:pointer;
              transition:all 0.16s ease;
            "
          >상세보기</button>

          <div
            style="
              color:#777;
              font-size:11px;
              margin-top:8px;
            "
          >리뷰 없음</div>
        </div>
      </div>
    `;

    const closeButton = overlay.querySelector("[data-nora-close='true']");
    const detailButton = overlay.querySelector("[data-nora-detail='true']");

    if (closeButton) {
      closeButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        overlaysRef.current.forEach((item) => {
          if (item && typeof item.setMap === "function") {
            item.setMap(null);
          }
        });

        overlaysRef.current = [];
      };
    }

    if (detailButton) {
      detailButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (onMarkerClick) {
          onMarkerClick(shop);
          return;
        }

        if (shopId) {
          window.location.href = `/shops/${shopId}`;
        }
      };
    }

    return overlay;
  };

  /* =========================
  지도 초기화
  ========================= */
  useEffect(() => {
    const APP_KEY = getKakaoAppKey();

    let cancelled = false;

    async function init() {
      try {
        await loadKakaoScript(APP_KEY);

        if (cancelled) return;

        setMapReady(true);
      } catch (e) {
        console.error("KAKAO MAP SCRIPT ERROR:", e);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !mapReady ||
      !window.kakao ||
      !window.kakao.maps ||
      !mapRef.current ||
      mapObjRef.current
    ) {
      return;
    }

    const { kakao } = window;

    const lat =
      center &&
      isValidCoord(center?.lat, center?.lng) &&
      !isBusanCityHallCoord(center?.lat, center?.lng)
        ? Number(center.lat)
        : DEFAULT_CENTER.lat;

    const lng =
      center &&
      isValidCoord(center?.lat, center?.lng) &&
      !isBusanCityHallCoord(center?.lat, center?.lng)
        ? Number(center.lng)
        : DEFAULT_CENTER.lng;

    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(lat, lng),
      level: 5,
    });

    mapObjRef.current = map;

    lastSafeCenterRef.current = {
      lat,
      lng,
    };

    /* 🔥 최초 center 전달 */
    if (onMapMove) {
      onMapMove({ lat, lng });
    }

    // 지도 이동 이벤트
    kakao.maps.event.addListener(map, "idle", () => {
      /* 🔥 최소 추가: 프로그램 이동 시 무시 */
      if (isProgrammaticMove.current) {
        return;
      }

      const c = map.getCenter();
      const payload = {
        lat: c.getLat(),
        lng: c.getLng(),
      };

      if (
        isValidCoord(payload.lat, payload.lng) &&
        !isBusanCityHallCoord(payload.lat, payload.lng)
      ) {
        lastSafeCenterRef.current = payload;

        if (onMapMove) onMapMove(payload);
      }
    });

    setTimeout(() => {
      try {
        hideLegacyTopBadges();
        kakao.maps.event.trigger(map, "resize");
        map.setCenter(new kakao.maps.LatLng(lat, lng));
      } catch (e) {
        console.warn("KAKAO MAP RESIZE ERROR:", e.message);
      }
    }, 250);

    setTimeout(() => {
      try {
        hideLegacyTopBadges();
        kakao.maps.event.trigger(map, "resize");
        map.setCenter(new kakao.maps.LatLng(lat, lng));
      } catch (e) {
        console.warn("KAKAO MAP SECOND RESIZE ERROR:", e.message);
      }
    }, 650);
  }, [mapReady, center, onMapMove]);

  /* =========================
  shops 좌표 보정
  ========================= */
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!Array.isArray(shops)) {
        setResolvedShops([]);
        return;
      }

      const next = await Promise.all(
        shops.map((shop, index) => normalizeShopWithCoord(shop, index))
      );

      if (cancelled) return;

      setResolvedShops(next);
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [shops, mapReady]);

  /* =========================
  center 변경 시 이동
  ========================= */
  useEffect(() => {
    if (!mapObjRef.current || !center) return;

    const lat = Number(center.lat);
    const lng = Number(center.lng);

    if (
      !isValidCoord(lat, lng) ||
      isBusanCityHallCoord(lat, lng)
    ) {
      return;
    }

    setMapCenterSafe(lat, lng);
  }, [center]);

  /* =========================
  🔥 선택 매장 변경 시 지도 이동
  ========================= */
  useEffect(() => {
    if (!mapObjRef.current || !selectedShopId || !window.kakao) return;

    const target = resolvedShops.find(
      (s, index) => String(getShopId(s, index)) === String(selectedShopId)
    );

    if (!target) return;

    const lat = Number(target?.lat ?? target?.location?.lat);
    const lng = Number(target?.lng ?? target?.location?.lng);

    if (
      !isValidCoord(lat, lng) ||
      isBusanCityHallCoord(lat, lng)
    ) {
      return;
    }

    setMapCenterSafe(lat, lng);
  }, [selectedShopId, resolvedShops]);

  /* =========================
  마커 렌더링
  ========================= */
  useEffect(() => {
    if (!mapObjRef.current || !window.kakao) return;

    const { kakao } = window;
    const map = mapObjRef.current;

    // 기존 마커 제거
    clearMarkers();

    const validShops = Array.isArray(resolvedShops)
      ? resolvedShops.filter((shop) => {
          const lat = Number(shop?.lat ?? shop?.location?.lat);
          const lng = Number(shop?.lng ?? shop?.location?.lng);
          const shopId = shop?._id || shop?.id;

          return (
            shopId !== "my-location-marker" &&
            isValidCoord(lat, lng) &&
            !isBusanCityHallCoord(lat, lng)
          );
        })
      : [];

    validShops.forEach((shop, index) => {
      const lat = Number(shop?.lat ?? shop?.location?.lat);
      const lng = Number(shop?.lng ?? shop?.location?.lng);

      const shopId = getShopId(shop, index);

      const isSelected =
        selectedShopId
          ? String(selectedShopId) === String(shopId)
          : validShops.length === 1;

      if (!isSelected) return;

      const position = new kakao.maps.LatLng(lat, lng);

      const markerContent = createMarkerContent(shop);

      const marker = new kakao.maps.CustomOverlay({
        position,
        content: markerContent,
        map,
        zIndex: 40,
        xAnchor: 0.5,
        yAnchor: 1,
      });

      const overlayContent = createShopOverlayContent(shop);

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: overlayContent,
        map,
        zIndex: 35,
        xAnchor: 0.5,
        yAnchor: -0.18,
      });

      marker.setMap(map);
      overlay.setMap(map);

      setMapCenterSafe(lat, lng);

      markersRef.current.push(marker);
      overlaysRef.current.push(overlay);
    });

    hideLegacyTopBadges();

    return () => {
      clearMarkers();
    };
  }, [resolvedShops, selectedShopId, onMarkerClick]);

  useEffect(() => {
    hideLegacyTopBadges();

    const timer = window.setTimeout(() => {
      hideLegacyTopBadges();
    }, 300);

    const secondTimer = window.setTimeout(() => {
      hideLegacyTopBadges();
    }, 700);

    const thirdTimer = window.setTimeout(() => {
      hideLegacyTopBadges();
    }, 1200);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(secondTimer);
      window.clearTimeout(thirdTimer);
    };
  }, [shops, resolvedShops, selectedShopId, mapReady]);

  return (
    <div
      ref={mapWrapRef}
      style={{
        width: "100%",
        height,
        position: "relative",
        background: "#000",
        overflow: "hidden",
        boxSizing: "border-box",
        margin: 0,
        padding: 0,
      }}
    >
      <div
        ref={mapRef}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: "100%",
          height: "100%",
          minHeight: "100%",
          background: "#000",
          overflow: "hidden",
          boxSizing: "border-box",
          margin: 0,
          padding: 0,
          transform: "translateY(0)",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.44) 0%, rgba(0,0,0,0.36) 45%, rgba(0,0,0,0.48) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 42%, rgba(255,0,128,0.05) 0%, rgba(255,0,128,0) 32%), linear-gradient(90deg, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.26) 100%)",
        }}
      />
    </div>
  );
}

export default MapView;