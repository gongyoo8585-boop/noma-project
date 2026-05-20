"use strict";

/**
 * =====================================================
 * 🔥 AUTH UTIL (ULTRA FINAL COMPLETE)
 * ✔ 토큰 관리
 * ✔ 유저 저장 / 조회
 * ✔ 로그인 상태 체크
 * ✔ 로그아웃
 * ✔ 토큰 파싱
 * ✔ 안전 처리 (null 방어)
 * ✔ 어디서든 재사용 가능
 * ✔ 🔥 INVALID_TOKEN 수정
 * ✔ 🔥 adminToken 호환 추가
 * =====================================================
 */

/* =========================
🔥 TOKEN
========================= */
export function setToken(token) {
  if (!token) return;

  /**
   * 🔥 기존 유지
   */
  localStorage.setItem("token", token);

  /**
   * 🔥 최소 추가
   * adminToken 동시 저장
   */
  localStorage.setItem("adminToken", token);
}

export function getToken() {

  /**
   * 🔥 핵심 수정
   * adminToken 우선 조회
   */
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

export function removeToken() {

  /**
   * 🔥 기존 유지
   */
  localStorage.removeItem("token");

  /**
   * 🔥 최소 추가
   */
  localStorage.removeItem("adminToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("authToken");
  localStorage.removeItem("jwt");
}

/* =========================
🔥 USER
========================= */
export function setUser(user) {
  if (!user) return;

  try {

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

  } catch {}
}

export function getUser() {

  try {

    const raw =
      localStorage.getItem("user");

    return raw
      ? JSON.parse(raw)
      : null;

  } catch {

    return null;
  }
}

export function removeUser() {
  localStorage.removeItem("user");
}

/* =========================
🔥 AUTH 상태
========================= */
export function isLoggedIn() {

  const token = getToken();

  /**
   * 🔥 최소 추가
   * 토큰 존재 + 유효성 체크
   */
  if (!token) return false;

  return isTokenValid(token);
}

/* =========================
🔥 LOGOUT
========================= */
export function logout() {

  removeToken();

  removeUser();

  if (
    typeof window !== "undefined"
  ) {

    /**
     * 🔥 replace 사용
     * 뒤로가기 INVALID_TOKEN 방지
     */
    window.location.replace("/login");
  }
}

/* =========================
🔥 JWT PARSE
========================= */
export function parseJwt(token) {

  try {

    if (!token) return null;

    const parts =
      token.split(".");

    /**
     * 🔥 최소 추가
     * JWT 형식 방어
     */
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];

    const base64 =
      base64Url
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const jsonPayload =
      decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => {
            return (
              "%" +
              (
                "00" +
                c
                  .charCodeAt(0)
                  .toString(16)
              ).slice(-2)
            );
          })
          .join("")
      );

    return JSON.parse(
      jsonPayload
    );

  } catch {

    return null;
  }
}

/* =========================
🔥 TOKEN 유효성 체크 (간단)
========================= */
export function isTokenValid(token) {

  /**
   * 🔥 최소 추가
   */
  if (!token) return false;

  const parsed =
    parseJwt(token);

  if (!parsed) {

    return false;
  }

  /**
   * 🔥 exp 없는 경우 허용
   */
  if (!parsed.exp) {

    return true;
  }

  const now =
    Date.now() / 1000;

  return parsed.exp > now;
}

/* =========================
🔥 자동 로그인 체크
========================= */
export function checkAutoLogin(
  navigate
) {

  const token =
    getToken();

  /**
   * 🔥 INVALID_TOKEN 수정
   */
  if (
    !token ||
    !isTokenValid(token)
  ) {

    logout();

    return false;
  }

  if (navigate) {

    navigate("/map");
  }

  return true;
}