"use strict";

/**
 * =====================================================
 * 🔥 KAKAO CONFIG (ULTRA FINAL)
 * ✔ 기존 기능 100% 유지
 * ✔ SDK 로드 안정성 강화
 * ✔ 중복 로딩 완전 방지
 * ✔ timeout / fallback 추가
 * ✔ 에러 처리 강화
 * ✔ 확장 유틸 추가
 * =====================================================
 */

/* =====================================================
🔥 ENV
===================================================== */
const KAKAO_JS_KEY =
  window.__ENV__?.KAKAO_KEY ||
  process.env.REACT_APP_KAKAO_JS_KEY;

/* =====================================================
🔥 상태 관리
===================================================== */
let kakaoLoaded = false;
let loadingPromise = null;

/* =====================================================
🔥 SDK 로드 함수 (강화)
===================================================== */
export function loadKakaoSDK(timeout = 10000) {
  /* 🔥 최소 추가: index.html에서 이미 로드된 경우 즉시 사용 */
  if (window.__KAKAO_SDK_LOADED__ && window.kakao?.maps) {
    kakaoLoaded = true;
    return Promise.resolve(window.kakao);
  }

  if (kakaoLoaded && window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  if (!KAKAO_JS_KEY) {
    console.error("❌ Kakao JS Key 없음");
    return Promise.reject(new Error("NO_KAKAO_KEY"));
  }

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("kakao-map-sdk");

    if (existing) {
      waitForKakao(resolve, reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services,clusterer,drawing&autoload=false`;
    script.async = true;

    /* 🔥 타임아웃 처리 */
    const timer = setTimeout(() => {
      console.error("❌ Kakao SDK 로드 타임아웃");
      reject(new Error("KAKAO_TIMEOUT"));
    }, timeout);

    script.onload = () => {
      clearTimeout(timer);
      waitForKakao(resolve, reject);
    };

    script.onerror = () => {
      clearTimeout(timer);
      console.error("❌ Kakao SDK 로드 실패");
      reject(new Error("KAKAO_LOAD_FAIL"));
    };

    document.head.appendChild(script);
  });

  return loadingPromise;
}

/* =====================================================
🔥 SDK 준비 대기 (강화)
===================================================== */
function waitForKakao(resolve, reject) {
  /* 🔥 최소 수정: 이미 로드된 경우 즉시 resolve (안정성 보강) */
  if (window.kakao?.maps && kakaoLoaded) {
    resolve(window.kakao);
    return;
  }

  if (!window.kakao || !window.kakao.maps) {
    reject(new Error("KAKAO_NOT_FOUND"));
    return;
  }

  try {
    window.kakao.maps.load(() => {
      kakaoLoaded = true;
      resolve(window.kakao);
    });
  } catch (e) {
    reject(e);
  }
}

/* =====================================================
🔥 상태 체크
===================================================== */
export function isKakaoReady() {
  return !!(window.kakao && window.kakao.maps);
}

/* =====================================================
🔥 안전한 접근
===================================================== */
export function getKakao() {
  if (!isKakaoReady()) {
    console.warn("⚠️ Kakao SDK 아직 준비 안됨");
    return null;
  }
  return window.kakao;
}

/* =====================================================
🔥 유틸 (좌표 생성)
===================================================== */
export function createLatLng(lat, lng) {
  const kakao = getKakao();
  if (!kakao) return null;

  return new kakao.maps.LatLng(Number(lat), Number(lng));
}

/* =====================================================
🔥 유틸 (지도 생성)
===================================================== */
export function createMap(container, options = {}) {
  const kakao = getKakao();
  if (!kakao) return null;

  const center =
    options.center ||
    createLatLng(
      options.lat || 37.5665,
      options.lng || 126.9780
    );

  return new kakao.maps.Map(container, {
    center,
    level: options.level || 5,
  });
}

/* =====================================================
🔥 유틸 (마커 생성)
===================================================== */
export function createMarker(map, lat, lng, options = {}) {
  const kakao = getKakao();
  if (!kakao) return null;

  return new kakao.maps.Marker({
    map,
    position: createLatLng(lat, lng),
    title: options.title || "",
    clickable: true,
  });
}

/* =====================================================
🔥 유틸 (인포윈도우)
===================================================== */
export function createInfoWindow(content = "") {
  const kakao = getKakao();
  if (!kakao) return null;

  return new kakao.maps.InfoWindow({
    content,
    zIndex: 10,
    removable: true,
  });
}

/* =====================================================
🔥 유틸 (지도 이동)
===================================================== */
export function moveMap(map, lat, lng) {
  const kakao = getKakao();
  if (!kakao || !map) return;

  const moveLatLng = createLatLng(lat, lng);
  map.panTo(moveLatLng);
}

/* =====================================================
🔥 유틸 (마커 제거)
===================================================== */
export function removeMarker(marker) {
  if (!marker) return;
  marker.setMap(null);
}

/* =====================================================
🔥 EXPORT
===================================================== */
export default {
  loadKakaoSDK,
  isKakaoReady,
  getKakao,
  createLatLng,
  createMap,
  createMarker,
  createInfoWindow,
  moveMap,
  removeMarker,
};