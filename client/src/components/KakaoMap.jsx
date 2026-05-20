"use strict";

import React, { useEffect, useRef, useState } from "react";

/* 🔥 최소 추가 (공통 UI) */
import Loading from "./common/Loading";
import ErrorMessage from "./common/ErrorMessage";
import EmptyState from "./common/EmptyState";

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
  const envKey = window.__ENV__?.KAKAO_KEY;

  if (
    envKey &&
    typeof envKey === "string" &&
    !envKey.includes("%") &&
    envKey !== "undefined" &&
    envKey !== "null"
  ) {
    return envKey;
  }

  return "290ec1ed8354f004a77502dfef5cbd28";
};

/* 🔥 최소 추가: SDK 동적 로드 */
const loadKakaoScript = () => {
  return new Promise((resolve, reject) => {
    if (
      window.__KAKAO_SDK_LOADED__ &&
      window.kakao?.maps &&
      window.kakao.maps.load
    ) {
      resolve(window.kakao);
      return;
    }

    if (window.kakao?.maps && window.kakao.maps.load) {
      window.__KAKAO_SDK_LOADED__ = true;
      resolve(window.kakao);
      return;
    }

    const existing = document.getElementById("kakao-map-sdk");

    if (existing) {
      existing.onload = () => {
        if (window.kakao?.maps) {
          window.__KAKAO_SDK_LOADED__ = true;
          resolve(window.kakao);
        } else {
          reject(new Error("KAKAO_NOT_READY"));
        }
      };

      existing.onerror = () => reject(new Error("KAKAO_LOAD_FAIL"));
      return;
    }

    const key = getKakaoKey();

    if (!key) {
      reject(new Error("KAKAO_KEY_MISSING"));
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services,clusterer,drawing&autoload=false`;
    script.async = true;

    script.onload = () => {
      if (window.kakao?.maps) {
        window.__KAKAO_SDK_LOADED__ = true;
        resolve(window.kakao);
      } else {
        reject(new Error("KAKAO_NOT_READY"));
      }
    };

    script.onerror = () => reject(new Error("KAKAO_LOAD_FAIL"));

    document.head.appendChild(script);
  });
};

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

  const [loaded, setLoaded] = useState(false);
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

    mapRefInstance.current.setCenter(
      currentCenter
    );
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
    let sdkReady = false;

    const markReady = () => {
      if (!mounted) return;
      sdkReady = true;
      window.__KAKAO_SDK_LOADED__ = true;
      setLoaded(true);
    };

    const fallbackReady = () => {
      setTimeout(() => {
        if (!mounted) return;
        if (!sdkReady && window.kakao && window.kakao.maps) {
          markReady();
        }
      }, 1000);
    };

    if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
      try {
        window.kakao.maps.load(markReady);
        fallbackReady();
      } catch (e) {
        if (!mounted) return;
        setError("카카오맵 초기화 실패");
      }

      return () => {
        mounted = false;
      };
    }

    loadKakaoScript()
      .then((kakao) => {
        kakao.maps.load(markReady);
        fallbackReady();
      })
      .catch(() => {
        if (!mounted) return;
        setError("카카오맵 로드 실패");
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || !window.kakao?.maps) return;

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

    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(
        initCenter.lat,
        initCenter.lng
      ),
      level,
    });

    mapRefInstance.current = map;

    infoWindowRef.current = new window.kakao.maps.InfoWindow({
      zIndex: 10,
    });

    window.kakao.maps.event.addListener(map, "dragend", () => {
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

          onMapMove({
            lat,
            lng,
          });
        }
      }
    });

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
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (clusterRef.current) {
      clusterRef.current.clear();
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

          onMarkerClick && onMarkerClick(shop);
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

        onMarkerClick && onMarkerClick(shop);
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
          onMapMove({
            lat: Number(latitude),
            lng: Number(longitude),
          });
        }

        setTimeout(relayoutMap, 0);
        setTimeout(relayoutMap, 300);
      },
      () => {
        alert("위치 권한 필요");
      }
    );
  };

  return (
    <div style={styles.wrap}>
      {!loaded && !error && <Loading message="지도 로딩 중..." />}
      {error && <ErrorMessage message={error} />}
      {loaded && !error && shops.length === 0 && (
        <EmptyState message="표시할 매장이 없습니다." />
      )}

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height,
          minHeight: height,
          border: "1px solid #333",
          borderRadius: 12,
          background: "#f5f5f5",
          display: "block",
          overflow: "hidden",
        }}
      />

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

  topOverlay: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    gap: 12,
    pointerEvents: "auto",
  },

  myLocationButton: {
    height: 42,
    padding: "0 18px",
    border: "1px solid #d1a500",
    borderRadius: 8,
    background: "rgba(0, 0, 0, 0.92)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow:
      "0 0 10px rgba(255, 212, 0, 0.45), inset 0 0 8px rgba(255, 212, 0, 0.08)",
  },

  locationText: {
    height: 42,
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    border: "1px solid #d1a500",
    borderRadius: 8,
    background: "rgba(0, 0, 0, 0.92)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    boxShadow:
      "0 0 10px rgba(255, 212, 0, 0.45), inset 0 0 8px rgba(255, 212, 0, 0.08)",
  },
};

export default KakaoMap;