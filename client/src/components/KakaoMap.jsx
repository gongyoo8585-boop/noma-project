"use strict";

import React, { useEffect, useRef, useState } from "react";

/* 🔥 최소 추가 (공통 UI) */
import ErrorMessage from "./common/ErrorMessage";
import EmptyState from "./common/EmptyState";

const GOLD_GRADIENT = "linear-gradient(90deg, #F7D774 0%, #D4AF37 50%, #B8860B 100%)";

/**
 * =====================================================
 * 🔥 KakaoMap (ULTRA FINAL UPGRADE)
 * =====================================================
 */

const DEFAULT_CENTER = {
  lat: 35.2283,
  lng: 128.8892,
};

/* 🔥 최소 추가: 부산광역시청 강제 이동 방지 */
const BUSAN_CITY_HALL_POSITION = {
  lat: 35.1796,
  lng: 129.0756,
};

/* 🔥 최소 추가: 좌표 검증 */
const isValidCoord = (lat, lng) => {
  const safeLat = Number(lat);
  const safeLng = Number(lng);

  if (
    !Number.isFinite(safeLat) ||
    !Number.isFinite(safeLng)
  ) {
    return false;
  }

  if (safeLat === 0 || safeLng === 0) {
    return false;
  }

  if (safeLat < 33 || safeLat > 39) {
    return false;
  }

  if (safeLng < 124 || safeLng > 132) {
    return false;
  }

  return true;
};

/* 🔥 최소 추가: 부산광역시청 좌표 방지 */
const isBusanCityHallCoord = (lat, lng) => {
  const safeLat = Number(lat);
  const safeLng = Number(lng);

  if (
    !Number.isFinite(safeLat) ||
    !Number.isFinite(safeLng)
  ) {
    return false;
  }

  return (
    Math.abs(safeLat - BUSAN_CITY_HALL_POSITION.lat) < 0.002 &&
    Math.abs(safeLng - BUSAN_CITY_HALL_POSITION.lng) < 0.002
  );
};

/* 🔥 최소 추가: 대표 이미지 */
const getRepresentativeImage = (shop) => {
  const images =
    Array.isArray(shop?.images)
      ? shop.images
      : Array.isArray(shop?.photos)
      ? shop.photos
      : Array.isArray(shop?.imageUrls)
      ? shop.imageUrls
      : [];

  return (
    shop?.representativeImage ||
    shop?.mainImage ||
    shop?.thumbnail ||
    shop?.coverImage ||
    images[0] ||
    ""
  );
};

/* 🔥 최소 추가: 코스 금액 */
const getCoursePriceText = (shop) => {
  const courses =
    Array.isArray(shop?.courses)
      ? shop.courses
      : [];

  const prices =
    Array.isArray(shop?.price)
      ? shop.price
      : shop?.price !== undefined &&
        shop?.price !== null
      ? [shop.price]
      : [];

  if (!courses.length && !prices.length) {
    return "코스/금액 없음";
  }

  const max = Math.max(
    courses.length,
    prices.length
  );

  return Array.from({
    length: max,
  })
    .map((_, index) => {
      const course =
        courses[index] || "-";

      const price =
        prices[index] !== undefined &&
        prices[index] !== null &&
        prices[index] !== ""
          ? `${Number(prices[index]).toLocaleString()}원`
          : "-";

      return `${course} / ${price}`;
    })
    .join("<br/>");
};

/* 🔥 최소 추가: 상단 현재 주소 표시 */
const getShopAddressText = (shop) => {
  if (!shop) {
    return "";
  }

  return (
    shop?.address ||
    shop?.roadAddress ||
    shop?.road_address ||
    shop?.jibunAddress ||
    shop?.jibun_address ||
    shop?.location?.address ||
    shop?.location?.roadAddress ||
    shop?.location?.jibunAddress ||
    ""
  );
};

/* 🔥 최소 추가: 정확한 주소 검색용 주소 확보 */
const getSearchAddressText = (shop) => {
  if (!shop) {
    return "";
  }

  const rawAddress =
    shop?.roadAddress ||
    shop?.address ||
    shop?.road_address ||
    shop?.road_address_name ||
    shop?.jibunAddress ||
    shop?.jibun_address ||
    shop?.jibun_address_name ||
    shop?.locationText ||
    shop?.location?.roadAddress ||
    shop?.location?.address ||
    shop?.location?.jibunAddress ||
    "";

  return String(rawAddress || "")
    .replace(/[^·]*?(인근|부근|근처)\s*·\s*/g, "")
    .replace(/\s*(인근|부근|근처)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/* 🔥 최소 추가: 브라우저에서 실제 카카오 JS 키 안전 확보 */
const getKakaoKey = () => {
  const candidates = [
    window.__ENV__?.VITE_KAKAO_MAP_KEY,
    window.__ENV__?.VITE_KAKAO_JS_KEY,
    window.__ENV__?.VITE_KAKAO_JAVASCRIPT_KEY,
    window.__ENV__?.VITE_KAKAO_API_KEY,
    window.__ENV__?.VITE_KAKAO_APP_KEY,
    window.__ENV__?.KAKAO_MAP_KEY,
    window.__ENV__?.KAKAO_JS_KEY,
    window.__ENV__?.KAKAO_JAVASCRIPT_KEY,
    window.__ENV__?.KAKAO_KEY,
    import.meta.env.VITE_KAKAO_MAP_KEY,
    import.meta.env.VITE_KAKAO_JS_KEY,
    import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY,
    import.meta.env.VITE_KAKAO_API_KEY,
    import.meta.env.VITE_KAKAO_APP_KEY,
    import.meta.env.KAKAO_JS_KEY,
    "290ec1ed8354f004a77502dfef5cbd28",
  ];

  const key = candidates
    .map((item) => String(item || "").trim())
    .find(
      (item) =>
        item &&
        !item.includes("%") &&
        item !== "undefined" &&
        item !== "null"
    );

  return key || "";
};

/* 🔥 최소 추가: SDK 동적 로드 */
const KAKAO_SDK_PRIMARY_ID = "kakao-map-sdk";
const KAKAO_SDK_SHARED_IDS = [
  "kakao-map-sdk",
  "nora-kakao-map-sdk",
];

const getKakaoSdkSrc = () => {
  const key = getKakaoKey();

  if (!key) {
    return "";
  }

  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
    key
  )}&libraries=services,clusterer,drawing&autoload=false`;
};

const isKakaoSdkReady = () => {
  return !!(
    window.kakao &&
    window.kakao.maps &&
    typeof window.kakao.maps.Map === "function"
  );
};

const findKakaoScript = () => {
  if (typeof document === "undefined") {
    return null;
  }

  for (const id of KAKAO_SDK_SHARED_IDS) {
    const script = document.getElementById(id);

    if (script) {
      return script;
    }
  }

  return (
    Array.from(document.querySelectorAll("script")).find((script) =>
      String(script.src || "").includes("dapi.kakao.com/v2/maps/sdk.js")
    ) || null
  );
};

const preloadKakaoScript = () => {
  try {
    if (typeof document === "undefined") {
      return;
    }

    const src = getKakaoSdkSrc();

    if (!src) {
      return;
    }

    if (!document.querySelector('link[data-nora-kakao-preconnect="true"]')) {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = "https://dapi.kakao.com";
      preconnect.crossOrigin = "anonymous";
      preconnect.dataset.noraKakaoPreconnect = "true";
      document.head.appendChild(preconnect);
    }

    if (!document.querySelector('link[data-nora-kakao-preload="true"]')) {
      const preload = document.createElement("link");
      preload.rel = "preload";
      preload.as = "script";
      preload.href = src;
      preload.dataset.noraKakaoPreload = "true";
      document.head.appendChild(preload);
    }
  } catch (e) {}
};

let kakaoScriptPromise = null;

const waitForKakaoReady = (resolve, reject, timeoutMs = 4500) => {
  const startedAt = Date.now();

  const tick = () => {
    if (isKakaoSdkReady()) {
      window.__KAKAO_SDK_LOADED__ = true;
      const script = findKakaoScript();
      if (script) {
        script.dataset.noraKakaoState = "ready";
      }
      resolve(window.kakao);
      return;
    }

    if (window.kakao?.maps?.load) {
      try {
        window.kakao.maps.load(() => {
          if (isKakaoSdkReady()) {
            window.__KAKAO_SDK_LOADED__ = true;
            resolve(window.kakao);
          } else {
            reject(new Error("KAKAO_NOT_READY"));
          }
        });
        return;
      } catch (e) {}
    }

    if (Date.now() - startedAt >= timeoutMs) {
      reject(new Error("KAKAO_LOAD_TIMEOUT"));
      return;
    }

    window.setTimeout(tick, 40);
  };

  tick();
};

const loadKakaoScript = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("KAKAO_BROWSER_ONLY"));
  }

  if (isKakaoSdkReady()) {
    window.__KAKAO_SDK_LOADED__ = true;
    return Promise.resolve(window.kakao);
  }

  if (kakaoScriptPromise) {
    return kakaoScriptPromise;
  }

  preloadKakaoScript();

  kakaoScriptPromise = new Promise((resolve, reject) => {
    const src = getKakaoSdkSrc();

    if (!src) {
      kakaoScriptPromise = null;
      reject(new Error("KAKAO_KEY_MISSING"));
      return;
    }

    let script = findKakaoScript();

    const handleReady = () => {
      waitForKakaoReady(
        resolve,
        (error) => {
          kakaoScriptPromise = null;
          reject(error);
        }
      );
    };

    if (script) {
      if (!script.id) {
        script.id = KAKAO_SDK_PRIMARY_ID;
      }

      script.dataset.noraKakaoMap = "true";
      script.dataset.noraKakaoState = script.dataset.noraKakaoState || "loading";

      script.addEventListener("load", handleReady, { once: true });
      script.addEventListener(
        "error",
        () => {
          kakaoScriptPromise = null;
          reject(new Error("KAKAO_LOAD_FAIL"));
        },
        { once: true }
      );

      handleReady();
      return;
    }

    script = document.createElement("script");
    script.id = KAKAO_SDK_PRIMARY_ID;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.noraKakaoMap = "true";
    script.dataset.noraKakaoState = "loading";

    script.addEventListener("load", handleReady, { once: true });
    script.addEventListener(
      "error",
      () => {
        kakaoScriptPromise = null;
        reject(new Error("KAKAO_LOAD_FAIL"));
      },
      { once: true }
    );

    document.head.appendChild(script);
  });

  return kakaoScriptPromise;
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  preloadKakaoScript();
  loadKakaoScript().catch(() => {});
}
function KakaoMap({
  shops = [],
  height = "500px",
  level = 5,
  onMarkerClick,
  onMapMove,
  selectedShopId,
  center,
}) {
  const mapRef = useRef(null);
  const mapRefInstance = useRef(null);
  const markersRef = useRef([]);
  const clusterRef = useRef(null);
  const infoWindowRef = useRef(null);
  const selectedMarkerIdRef = useRef(null);
  const lastSafeCenterRef = useRef(DEFAULT_CENTER);
  const programMoveRef = useRef(false);
  const geocodeSeqRef = useRef(0);
  const dragendHandlerRef = useRef(null);
  const readyTimerRef = useRef(null);

  const [loaded, setLoaded] = useState(isKakaoSdkReady());
  const [mapCreated, setMapCreated] = useState(false);
  const [error, setError] = useState("");

  const selectedLocationText =
    getShopAddressText(
      shops.find((shop) => {
        const shopId =
          shop?._id ||
          shop?.id ||
          `${shop?.name || ""}-${shop?.lat}-${shop?.lng}`;

        return (
          selectedShopId &&
          String(shopId) === String(selectedShopId)
        );
      })
    ) || "경상남도 김해시 삼계동";

  const setMapCenterSafe = (lat, lng, nextLevel = level) => {
    if (!mapRefInstance.current || !window.kakao?.maps) {
      return;
    }

    const safeLat = Number(lat);
    const safeLng = Number(lng);

    if (!isValidCoord(safeLat, safeLng)) {
      return;
    }

    if (isBusanCityHallCoord(safeLat, safeLng)) {
      return;
    }

    programMoveRef.current = true;

    const position = new window.kakao.maps.LatLng(
      safeLat,
      safeLng
    );

    mapRefInstance.current.setCenter(position);
    mapRefInstance.current.setLevel(nextLevel);

    lastSafeCenterRef.current = {
      lat: safeLat,
      lng: safeLng,
    };

    setTimeout(() => {
      programMoveRef.current = false;
    }, 350);
  };

  const relayoutMap = () => {
    if (!mapRefInstance.current || !window.kakao?.maps) {
      return;
    }

    window.kakao.maps.event.trigger(
      mapRefInstance.current,
      "resize"
    );

    const currentCenter =
      mapRefInstance.current.getCenter();

    if (currentCenter) {
      mapRefInstance.current.setCenter(
        currentCenter
      );
    }
  };

  const geocodeShopPosition = (shop) => {
    return new Promise((resolve) => {
      try {
        const address = getSearchAddressText(shop);

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

        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(address, (result, status) => {
          if (
            status === window.kakao.maps.services.Status.OK &&
            Array.isArray(result) &&
            result.length > 0
          ) {
            const roadItem =
              result.find((item) => item.road_address) ||
              result[0];

            const nextLat = Number(roadItem.y);
            const nextLng = Number(roadItem.x);

            if (
              isValidCoord(nextLat, nextLng) &&
              !isBusanCityHallCoord(nextLat, nextLng)
            ) {
              resolve({
                lat: nextLat,
                lng: nextLng,
              });

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

  const moveShopToExactPosition = async (shop, marker) => {
    const seq = geocodeSeqRef.current + 1;
    geocodeSeqRef.current = seq;

    const geo = await geocodeShopPosition(shop);

    if (geocodeSeqRef.current !== seq) {
      return;
    }

    const fallbackLat = Number(shop?.lat);
    const fallbackLng = Number(shop?.lng);

    const nextLat =
      geo && isValidCoord(geo.lat, geo.lng)
        ? Number(geo.lat)
        : fallbackLat;

    const nextLng =
      geo && isValidCoord(geo.lat, geo.lng)
        ? Number(geo.lng)
        : fallbackLng;

    if (
      !isValidCoord(nextLat, nextLng) ||
      isBusanCityHallCoord(nextLat, nextLng)
    ) {
      return;
    }

    if (marker && window.kakao?.maps) {
      marker.setPosition(
        new window.kakao.maps.LatLng(
          nextLat,
          nextLng
        )
      );
    }

    setMapCenterSafe(
      nextLat,
      nextLng,
      level
    );
  };

  useEffect(() => {
    let mounted = true;

    preloadKakaoScript();

    const markReady = () => {
      if (!mounted) return;
      window.__KAKAO_SDK_LOADED__ = true;
      setLoaded(true);
      setError("");
    };

    if (isKakaoSdkReady()) {
      markReady();
    } else {
      loadKakaoScript()
        .then(() => {
          markReady();
        })
        .catch(() => {
          if (!mounted) return;
          setError("카카오맵 로드 실패");
        });
    }

    const readyTimer = window.setInterval(() => {
      readyTimerRef.current = readyTimer;
      if (isKakaoSdkReady()) {
        markReady();
        window.clearInterval(readyTimer);
      if (readyTimerRef.current) {
        window.clearInterval(readyTimerRef.current);
        readyTimerRef.current = null;
      }
      }
    }, 80);

    return () => {
      mounted = false;
      window.clearInterval(readyTimer);
      if (readyTimerRef.current) {
        window.clearInterval(readyTimerRef.current);
        readyTimerRef.current = null;
      }

      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      clearMarkers();

      if (mapRefInstance.current && window.kakao?.maps && dragendHandlerRef.current) {
        window.kakao.maps.event.removeListener(
          mapRefInstance.current,
          "dragend",
          dragendHandlerRef.current
        );
        dragendHandlerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!loaded || mapRefInstance.current || !mapRef.current || !window.kakao?.maps) return;

    const initCenter =
      center &&
      isValidCoord(center.lat, center.lng) &&
      !isBusanCityHallCoord(center.lat, center.lng)
        ? {
            lat: Number(center.lat),
            lng: Number(center.lng),
          }
        : DEFAULT_CENTER;

    lastSafeCenterRef.current = initCenter;

    if (!mapRef.current) return;

    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(
        initCenter.lat,
        initCenter.lng
      ),
      level,
    });

    mapRefInstance.current = map;
    setMapCreated(true);

    infoWindowRef.current = new window.kakao.maps.InfoWindow({
      zIndex: 10,
    });

    const handleDragEnd = () => {
      if (programMoveRef.current) {
        return;
      }

      if (onMapMove) {
        const center = map.getCenter();
        const lat = center.getLat();
        const lng = center.getLng();

        if (
          isValidCoord(lat, lng) &&
          !isBusanCityHallCoord(lat, lng)
        ) {
          lastSafeCenterRef.current = {
            lat,
            lng,
          };

          try {
            onMapMove({
              lat,
              lng,
            });
          } catch (e) {}
        }
      }
    };

    dragendHandlerRef.current = handleDragEnd;
    window.kakao.maps.event.addListener(map, "dragend", handleDragEnd);

    if (window.kakao.maps.MarkerClusterer) {
      clusterRef.current = new window.kakao.maps.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 6,
      });
    }

    setTimeout(relayoutMap, 0);
    setTimeout(relayoutMap, 300);
    setTimeout(relayoutMap, 800);
  }, [loaded]);

  useEffect(() => {
    if (!center || !mapRefInstance.current || !window.kakao?.maps) return;

    const lat =
      Number(center.lat);

    const lng =
      Number(center.lng);

    if (!isValidCoord(lat, lng)) {
      return;
    }

    if (isBusanCityHallCoord(lat, lng)) {
      return;
    }

    setMapCenterSafe(lat, lng, level);

    setTimeout(relayoutMap, 0);
    setTimeout(relayoutMap, 300);
  }, [center]);

  useEffect(() => {
    if (!selectedShopId && infoWindowRef.current) {
      selectedMarkerIdRef.current = null;
      infoWindowRef.current.close();
    }
  }, [selectedShopId]);

  const clearMarkers = () => {
    try {
      markersRef.current.forEach((m) => {
        if (m && typeof m.setMap === "function") {
          m.setMap(null);
        }
      });
      markersRef.current = [];

      if (clusterRef.current && typeof clusterRef.current.clear === "function") {
        clusterRef.current.clear();
      }
    } catch (e) {
      markersRef.current = [];
    }
  };

  useEffect(() => {
    if (!mapRefInstance.current || !window.kakao?.maps) return;

    clearMarkers();

    const valid = shops.filter(
      (s) =>
        s &&
        isValidCoord(s.lat, s.lng) &&
        !isBusanCityHallCoord(s.lat, s.lng)
    );

    if (valid.length === 0) {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      selectedMarkerIdRef.current = null;

      if (
        lastSafeCenterRef.current &&
        isValidCoord(
          lastSafeCenterRef.current.lat,
          lastSafeCenterRef.current.lng
        )
      ) {
        setMapCenterSafe(
          lastSafeCenterRef.current.lat,
          lastSafeCenterRef.current.lng,
          level
        );
      }

      setTimeout(relayoutMap, 0);
      setTimeout(relayoutMap, 300);
      return;
    }

    const bounds = new window.kakao.maps.LatLngBounds();

    let selectedMarker = null;
    let selectedPosition = null;
    let selectedShop = null;

    const newMarkers = valid.map((shop) => {
      const pos = new window.kakao.maps.LatLng(
        Number(shop.lat),
        Number(shop.lng)
      );

      const marker = new window.kakao.maps.Marker({
        position: pos,
        title: shop.name,
      });

      const shopId =
        shop._id || shop.id || `${shop.name || ""}-${shop.lat}-${shop.lng}`;

      window.kakao.maps.event.addListener(marker, "click", () => {
        const currentId =
          selectedMarkerIdRef.current;

        if (
          currentId &&
          shopId &&
          String(currentId) === String(shopId)
        ) {
          selectedMarkerIdRef.current = null;

          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }

          try {
            try {
          onMarkerClick && onMarkerClick(shop);
        } catch (e) {}
          } catch (e) {}
          return;
        }

        selectedMarkerIdRef.current = shopId;

        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }

        moveShopToExactPosition(
          shop,
          marker
        );

        try {
          onMarkerClick && onMarkerClick(shop);
        } catch (e) {}
      });

      if (
        selectedShopId &&
        String(shopId) === String(selectedShopId)
      ) {
        selectedMarker = marker;
        selectedPosition = pos;
        selectedShop = shop;
        selectedMarkerIdRef.current = shopId;

        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
      }

      bounds.extend(pos);
      return marker;
    });

    markersRef.current = newMarkers;

    if (clusterRef.current) {
      clusterRef.current.addMarkers(newMarkers);
    } else {
      newMarkers.forEach((m) => m.setMap(mapRefInstance.current));
    }

    if (selectedMarker && selectedPosition && selectedShop) {
      moveShopToExactPosition(
        selectedShop,
        selectedMarker
      );
    } else if (newMarkers.length === 1) {
      const onlyPosition =
        newMarkers[0].getPosition();

      setMapCenterSafe(
        onlyPosition.getLat(),
        onlyPosition.getLng(),
        level
      );
    } else {
      programMoveRef.current = true;
      mapRefInstance.current.setBounds(bounds);

      const nextCenter =
        mapRefInstance.current.getCenter();

      if (
        nextCenter &&
        isValidCoord(
          nextCenter.getLat(),
          nextCenter.getLng()
        ) &&
        !isBusanCityHallCoord(
          nextCenter.getLat(),
          nextCenter.getLng()
        )
      ) {
        lastSafeCenterRef.current = {
          lat: nextCenter.getLat(),
          lng: nextCenter.getLng(),
        };
      }

      setTimeout(() => {
        programMoveRef.current = false;
      }, 350);
    }

    setTimeout(relayoutMap, 0);
    setTimeout(relayoutMap, 300);
    setTimeout(relayoutMap, 800);
  }, [shops, selectedShopId]);

  useEffect(() => {
    const onResize = () => {
      relayoutMap();
    };

    window.addEventListener(
      "resize",
      onResize
    );

    setTimeout(relayoutMap, 300);

    return () => {
      window.removeEventListener(
        "resize",
        onResize
      );
    };
  }, []);

  const moveToMyLocation = () => {
    if (!navigator.geolocation) {
      alert("위치 사용 불가");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        if (!window.kakao?.maps || !mapRefInstance.current) return;

        if (!isValidCoord(latitude, longitude)) {
          alert("현재 위치 좌표 오류");
          return;
        }

        if (isBusanCityHallCoord(latitude, longitude)) {
          alert("현재 위치 좌표 오류");
          return;
        }

        setMapCenterSafe(
          latitude,
          longitude,
          level
        );

        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }

        selectedMarkerIdRef.current = null;

        if (onMapMove) {
          try {
            onMapMove({
              lat: Number(latitude),
              lng: Number(longitude),
            });
          } catch (e) {}
        }

        setTimeout(relayoutMap, 0);
        setTimeout(relayoutMap, 300);
      },
      () => {
        alert("위치 권한 필요");
      },
      {
        enableHighAccuracy: true,
        timeout: 3000,
        maximumAge: 30000,
      }
    );
  };

  return (
    <div style={styles.wrap}>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height,
          minHeight: height,
          border: "none",
          borderRadius: 12,
          background:
            "radial-gradient(circle at 52% 42%, rgba(255,255,255,0.22), transparent 18%), linear-gradient(135deg, #8b8f85 0%, #7d8479 44%, #6f756d 100%)",
          display: "block",
          overflow: "hidden",
        }}
      />

      {!mapCreated && !error && (
        <div style={styles.instantMapPreviewLayer}>
          <div style={styles.instantMapRoadMain} />
          <div style={styles.instantMapRoadSubOne} />
          <div style={styles.instantMapRoadSubTwo} />
          <div style={styles.instantMapRiver} />
          <div style={styles.instantMapParkOne} />
          <div style={styles.instantMapParkTwo} />
          <div style={styles.instantMapLabelCenter}>경상남도 김해시 삼계동</div>
          <div style={styles.instantMapLabelOne}>가야대역</div>
          <div style={styles.instantMapLabelTwo}>해동이 스포츠센터</div>
          <div style={styles.instantMapLabelThree}>삼계동</div>
          <div style={styles.instantMapDotOne} />
          <div style={styles.instantMapDotTwo} />
          <div style={styles.instantMapDotThree} />
        </div>
      )}

      {error && !mapCreated && (
        <div style={styles.mapErrorLayer}>
          <ErrorMessage message={error} />
        </div>
      )}

      {mapCreated && !error && shops.length === 0 && (
        <div style={styles.emptyLayer}>
          <EmptyState message="표시할 매장이 없습니다." />
        </div>
      )}

      <div style={styles.topOverlay}>
        <button
          type="button"
          onClick={moveToMyLocation}
          style={styles.myLocationButton}
        >
          ⌖ 내 주변
        </button>

        <div style={styles.locationText}>
          ⌖ {selectedLocationText}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    width: "100%",
    height: "100%",
    minHeight: "500px",
    display: "block",
    position: "relative",
    background: "#000",
  },

  instantMapPreviewLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    overflow: "hidden",
    pointerEvents: "none",
    background:
      "radial-gradient(circle at 52% 42%, rgba(255,255,255,0.2), transparent 18%), linear-gradient(135deg, #8b8f85 0%, #7d8479 44%, #6f756d 100%)",
  },

  instantMapRoadMain: {
    position: "absolute",
    left: "-8%",
    top: "42%",
    width: "118%",
    height: 42,
    borderRadius: 28,
    background: "rgba(180, 164, 114, 0.7)",
    transform: "rotate(-27deg)",
    boxShadow: "none",
  },

  instantMapRoadSubOne: {
    position: "absolute",
    left: "37%",
    top: "-12%",
    width: 34,
    height: "125%",
    borderRadius: 24,
    background: "rgba(205, 198, 165, 0.54)",
    transform: "rotate(5deg)",
    boxShadow: "none",
  },

  instantMapRoadSubTwo: {
    position: "absolute",
    left: "48%",
    top: "8%",
    width: 22,
    height: "98%",
    borderRadius: 20,
    background: "rgba(190, 185, 155, 0.48)",
    transform: "rotate(-9deg)",
  },

  instantMapRiver: {
    position: "absolute",
    right: "15%",
    top: "6%",
    width: 90,
    height: "72%",
    borderRadius: "50%",
    background: "rgba(105, 145, 155, 0.35)",
    transform: "rotate(17deg)",
    filter: "blur(0.3px)",
  },

  instantMapParkOne: {
    position: "absolute",
    right: "4%",
    top: "7%",
    width: 250,
    height: 230,
    borderRadius: "45% 55% 35% 60%",
    background: "rgba(90, 130, 78, 0.42)",
  },

  instantMapParkTwo: {
    position: "absolute",
    left: "12%",
    bottom: "7%",
    width: 220,
    height: 180,
    borderRadius: "55% 45% 60% 40%",
    background: "rgba(88, 124, 76, 0.34)",
  },

  instantMapLabelCenter: {
    position: "absolute",
    left: "43%",
    top: "38%",
    color: "rgba(35,35,35,0.72)",
    fontSize: 15,
    fontWeight: 800,
    textShadow: "none",
  },

  instantMapLabelOne: {
    position: "absolute",
    left: "36%",
    top: "29%",
    color: "rgba(55,45,115,0.7)",
    fontSize: 13,
    fontWeight: 700,
  },

  instantMapLabelTwo: {
    position: "absolute",
    left: "58%",
    top: "29%",
    color: "rgba(30,85,130,0.72)",
    fontSize: 13,
    fontWeight: 700,
  },

  instantMapLabelThree: {
    position: "absolute",
    left: "54%",
    top: "55%",
    color: "rgba(90,60,30,0.74)",
    fontSize: 13,
    fontWeight: 700,
  },

  instantMapDotOne: {
    position: "absolute",
    left: "38%",
    top: "35%",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "rgba(90, 55, 155, 0.8)",
  },

  instantMapDotTwo: {
    position: "absolute",
    left: "60%",
    top: "37%",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "rgba(30, 110, 160, 0.8)",
  },

  instantMapDotThree: {
    position: "absolute",
    left: "50%",
    top: "60%",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "rgba(160, 80, 55, 0.85)",
  },

  mapErrorLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    boxSizing: "border-box",
    background: "rgba(0, 0, 0, 0.72)",
  },

  emptyLayer: {
    position: "absolute",
    left: "50%",
    top: "50%",
    zIndex: 11,
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },

  topOverlay: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    pointerEvents: "auto",
  },

  myLocationButton: {
    height: 48,
    minWidth: "max-content",
    padding: "0 16px",
    border: "2px solid transparent",
    borderRadius: 9,
    background: `linear-gradient(#000000, #000000) padding-box, ${GOLD_GRADIENT} border-box`,
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
    wordBreak: "keep-all",
    flexShrink: 0,
    cursor: "pointer",
    boxShadow: "none",
  },

  locationText: {
    height: 48,
    width: "fit-content",
    maxWidth: "calc(100% - 112px)",
    minWidth: 0,
    flex: "0 1 auto",
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    border: "2px solid transparent",
    borderRadius: 9,
    background: `linear-gradient(#000000, #000000) padding-box, ${GOLD_GRADIENT} border-box`,
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.25,
    textAlign: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    wordBreak: "keep-all",
    boxShadow: "none",
  },
};

export default KakaoMap;
