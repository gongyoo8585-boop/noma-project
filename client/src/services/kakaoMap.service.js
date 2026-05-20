"use strict";

import {
  loadKakaoMap,
  calculateDistance,
} from "./map.api";

/**
 * =========================================================
 * 🔥 NORA KAKAO MAP SERVICE
 * ---------------------------------------------------------
 * ✔ 카카오맵 생성
 * ✔ 네온 마커
 * ✔ 오버레이 생성
 * ✔ 지도 이동
 * ✔ 현재 위치
 * ✔ 마커 제거
 * ✔ 마커 이벤트
 * ✔ 지도 이벤트
 * ✔ bounds 처리
 * ✔ 클러스터 지원
 * ✔ 런타임 에러 방지
 * ✔ 메모리 누수 방지
 * ✔ 완성형 서비스
 * =========================================================
 */

let activeMap = null;

let activeMarkers = [];

let activeOverlays = [];

let activeClusterer =
  null;

/* =========================================================
🔥 LOAD MAP
========================================================= */

export const initializeKakaoMap =
  async ({
    container,
    center = {
      lat: 35.2283,
      lng: 128.8892,
    },
    level = 5,
  } = {}) => {
    try {
      if (!container) {
        throw new Error(
          "지도 컨테이너가 없습니다."
        );
      }

      const kakao =
        await loadKakaoMap();

      const mapOption = {
        center:
          new kakao.maps.LatLng(
            Number(
              center?.lat
            ) || 35.2283,

            Number(
              center?.lng
            ) || 128.8892
          ),

        level:
          Number(level) ||
          5,
      };

      activeMap =
        new kakao.maps.Map(
          container,
          mapOption
        );

      return {
        success: true,

        map: activeMap,

        kakao,
      };
    } catch (error) {
      console.error(
        "initializeKakaoMap Error:",
        error
      );

      return {
        success: false,

        map: null,

        error:
          error?.message ||
          "카카오맵 초기화 실패",
      };
    }
  };

/* =========================================================
🔥 GET MAP
========================================================= */

export const getMap =
  () => {
    return activeMap;
  };

/* =========================================================
🔥 CREATE NEON MARKER
========================================================= */

export const createMarker =
  async ({
    map,
    shop = {},
    clickable = true,
    selected = false,
    onClick,
  } = {}) => {
    try {
      const kakao =
        await loadKakaoMap();

      const targetMap =
        map || activeMap;

      if (!targetMap) {
        throw new Error(
          "지도가 존재하지 않습니다."
        );
      }

      const lat =
        Number(
          shop?.lat
        ) || 35.2283;

      const lng =
        Number(
          shop?.lng
        ) || 128.8892;

      const markerPosition =
        new kakao.maps.LatLng(
          lat,
          lng
        );

      const markerSvg =
        selected
          ? `
      <svg xmlns="http://www.w3.org/2000/svg" width="72" height="92" viewBox="0 0 72 92">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <circle cx="36" cy="32" r="20"
          fill="#ff008c"
          stroke="#ffffff"
          stroke-width="4"
          filter="url(#glow)"
        />

        <circle cx="36" cy="32" r="8"
          fill="#ffffff"
        />

        <path
          d="M36 88 C36 88 12 56 12 34 C12 17 24 6 36 6 C48 6 60 17 60 34 C60 56 36 88 36 88Z"
          fill="none"
          stroke="#ff008c"
          stroke-width="4"
          filter="url(#glow)"
        />
      </svg>
    `
          : `
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="80" viewBox="0 0 60 80">
        <defs>
          <filter id="goldGlow">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <circle cx="30" cy="26" r="15"
          fill="#FFD700"
          stroke="#ffffff"
          stroke-width="3"
          filter="url(#goldGlow)"
        />

        <path
          d="M30 74 C30 74 10 48 10 30 C10 15 19 6 30 6 C41 6 50 15 50 30 C50 48 30 74 30 74Z"
          fill="none"
          stroke="#FFD700"
          stroke-width="3"
          filter="url(#goldGlow)"
        />
      </svg>
    `;

      const markerImage =
        new kakao.maps.MarkerImage(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            markerSvg
          )}`,

          new kakao.maps.Size(
            selected
              ? 72
              : 60,
            selected
              ? 92
              : 80
          ),

          {
            offset:
              new kakao.maps.Point(
                selected
                  ? 36
                  : 30,

                selected
                  ? 92
                  : 80
              ),
          }
        );

      const marker =
        new kakao.maps.Marker(
          {
            map: targetMap,

            position:
              markerPosition,

            image:
              markerImage,

            clickable,
          }
        );

      if (
        typeof onClick ===
        "function"
      ) {
        kakao.maps.event.addListener(
          marker,
          "click",
          () => {
            try {
              onClick(
                shop,
                marker
              );
            } catch (error) {
              console.error(
                "Marker Click Error:",
                error
              );
            }
          }
        );
      }

      activeMarkers.push(
        marker
      );

      return marker;
    } catch (error) {
      console.error(
        "createMarker Error:",
        error
      );

      return null;
    }
  };

/* =========================================================
🔥 REMOVE ALL MARKERS
========================================================= */

export const clearMarkers =
  () => {
    try {
      activeMarkers.forEach(
        (marker) => {
          try {
            marker.setMap(
              null
            );
          } catch (
            error
          ) {
            console.error(
              error
            );
          }
        }
      );

      activeMarkers = [];
    } catch (error) {
      console.error(
        "clearMarkers Error:",
        error
      );
    }
  };

/* =========================================================
🔥 CREATE OVERLAY
========================================================= */

export const createOverlay =
  async ({
    map,
    position,
    content,
    yAnchor = 1.3,
  } = {}) => {
    try {
      const kakao =
        await loadKakaoMap();

      const targetMap =
        map || activeMap;

      if (
        !targetMap ||
        !position
      ) {
        return null;
      }

      const overlay =
        new kakao.maps.CustomOverlay(
          {
            map: targetMap,

            position:
              new kakao.maps.LatLng(
                Number(
                  position?.lat
                ),
                Number(
                  position?.lng
                )
              ),

            content,

            yAnchor,
          }
        );

      activeOverlays.push(
        overlay
      );

      return overlay;
    } catch (error) {
      console.error(
        "createOverlay Error:",
        error
      );

      return null;
    }
  };

/* =========================================================
🔥 CLEAR OVERLAYS
========================================================= */

export const clearOverlays =
  () => {
    try {
      activeOverlays.forEach(
        (overlay) => {
          try {
            overlay.setMap(
              null
            );
          } catch (
            error
          ) {
            console.error(
              error
            );
          }
        }
      );

      activeOverlays = [];
    } catch (error) {
      console.error(
        "clearOverlays Error:",
        error
      );
    }
  };

/* =========================================================
🔥 MOVE CENTER
========================================================= */

export const moveToPosition =
  async ({
    lat,
    lng,
    level,
  } = {}) => {
    try {
      const kakao =
        await loadKakaoMap();

      if (!activeMap) {
        return false;
      }

      const moveLatLng =
        new kakao.maps.LatLng(
          Number(lat),
          Number(lng)
        );

      activeMap.panTo(
        moveLatLng
      );

      if (
        typeof level ===
        "number"
      ) {
        activeMap.setLevel(
          level
        );
      }

      return true;
    } catch (error) {
      console.error(
        "moveToPosition Error:",
        error
      );

      return false;
    }
  };

/* =========================================================
🔥 FIT BOUNDS
========================================================= */

export const fitMapBounds =
  async (
    shops = []
  ) => {
    try {
      const kakao =
        await loadKakaoMap();

      if (
        !activeMap ||
        !Array.isArray(
          shops
        ) ||
        !shops.length
      ) {
        return false;
      }

      const bounds =
        new kakao.maps.LatLngBounds();

      shops.forEach(
        (shop) => {
          bounds.extend(
            new kakao.maps.LatLng(
              Number(
                shop?.lat
              ),
              Number(
                shop?.lng
              )
            )
          );
        }
      );

      activeMap.setBounds(
        bounds
      );

      return true;
    } catch (error) {
      console.error(
        "fitMapBounds Error:",
        error
      );

      return false;
    }
  };

/* =========================================================
🔥 CURRENT LOCATION
========================================================= */

export const moveToCurrentLocation =
  async () => {
    try {
      if (
        !navigator.geolocation
      ) {
        return null;
      }

      return new Promise(
        (
          resolve,
          reject
        ) => {
          navigator.geolocation.getCurrentPosition(
            async (
              position
            ) => {
              try {
                const lat =
                  position
                    .coords
                    .latitude;

                const lng =
                  position
                    .coords
                    .longitude;

                await moveToPosition(
                  {
                    lat,
                    lng,
                    level: 4,
                  }
                );

                resolve({
                  lat,
                  lng,
                });
              } catch (
                error
              ) {
                reject(
                  error
                );
              }
            },

            (
              error
            ) => {
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
        }
      );
    } catch (error) {
      console.error(
        "moveToCurrentLocation Error:",
        error
      );

      return null;
    }
  };

/* =========================================================
🔥 MAP EVENT
========================================================= */

export const addMapEvent =
  async ({
    target,
    type,
    callback,
  } = {}) => {
    try {
      const kakao =
        await loadKakaoMap();

      if (
        !target ||
        !type ||
        typeof callback !==
          "function"
      ) {
        return false;
      }

      kakao.maps.event.addListener(
        target,
        type,
        callback
      );

      return true;
    } catch (error) {
      console.error(
        "addMapEvent Error:",
        error
      );

      return false;
    }
  };

/* =========================================================
🔥 GET BOUNDS
========================================================= */

export const getMapBounds =
  () => {
    try {
      if (!activeMap) {
        return null;
      }

      const bounds =
        activeMap.getBounds();

      return {
        swLat:
          bounds
            .getSouthWest()
            .getLat(),

        swLng:
          bounds
            .getSouthWest()
            .getLng(),

        neLat:
          bounds
            .getNorthEast()
            .getLat(),

        neLng:
          bounds
            .getNorthEast()
            .getLng(),
      };
    } catch (error) {
      console.error(
        "getMapBounds Error:",
        error
      );

      return null;
    }
  };

/* =========================================================
🔥 CREATE CLUSTERER
========================================================= */

export const createClusterer =
  async ({
    map,
    minLevel = 6,
  } = {}) => {
    try {
      const kakao =
        await loadKakaoMap();

      const targetMap =
        map || activeMap;

      if (!targetMap) {
        return null;
      }

      if (
        activeClusterer
      ) {
        activeClusterer.clear();
      }

      activeClusterer =
        new kakao.maps.MarkerClusterer(
          {
            map: targetMap,

            averageCenter: true,

            minLevel,
          }
        );

      return activeClusterer;
    } catch (error) {
      console.error(
        "createClusterer Error:",
        error
      );

      return null;
    }
  };

/* =========================================================
🔥 ADD CLUSTER MARKERS
========================================================= */

export const addClusterMarkers =
  (
    markers = []
  ) => {
    try {
      if (
        !activeClusterer
      ) {
        return false;
      }

      activeClusterer.addMarkers(
        markers
      );

      return true;
    } catch (error) {
      console.error(
        "addClusterMarkers Error:",
        error
      );

      return false;
    }
  };

/* =========================================================
🔥 DESTROY MAP
========================================================= */

export const destroyMap =
  () => {
    try {
      clearMarkers();

      clearOverlays();

      if (
        activeClusterer
      ) {
        activeClusterer.clear();
      }

      activeClusterer =
        null;

      activeMap = null;

      return true;
    } catch (error) {
      console.error(
        "destroyMap Error:",
        error
      );

      return false;
    }
  };

/* =========================================================
🔥 DEFAULT EXPORT
========================================================= */

const kakaoMapService =
  {
    initializeKakaoMap,

    getMap,

    createMarker,

    clearMarkers,

    createOverlay,

    clearOverlays,

    moveToPosition,

    fitMapBounds,

    moveToCurrentLocation,

    addMapEvent,

    getMapBounds,

    createClusterer,

    addClusterMarkers,

    destroyMap,

    calculateDistance,
  };

export default kakaoMapService;