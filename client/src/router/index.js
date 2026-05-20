"use strict";

import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

/* =========================
🔥 PAGES
========================= */
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import MapPage from "../pages/MapPage";

/* 🔥 기존 관리자 라우터 유지 */
import AppRouter from "./AppRouter";

/* =========================
🔥 COMMON UI
========================= */
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 ROUTER INDEX (ADMIN FIRST FINAL)
 * ✔ 기존 구조 유지
 * ✔ 관리자 우선 라우팅
 * ✔ /admin 최초 진입 시 로그인 페이지
 * ✔ 로그인 후 관리자 페이지 진입 가능
 * ✔ 기존 기능 유지
 * ✔ 최소 추가만 적용
 * =====================================================
 */

function AdminGate() {

  /* 🔥 최소 추가 */
  const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt");

  /* 🔥 로그인 안 된 경우 */
  if (!token) {
    return <LoginPage />;
  }

  /* 🔥 기존 관리자 라우터 유지 */
  return <AppRouter />;
}

function RouterIndex() {

  try {

    return (
      <BrowserRouter>
        <Routes>

          {/* =========================
          🔥 관리자 우선
          ========================= */}
          <Route
            path="/admin/*"
            element={<AdminGate />}
          />

          {/* =========================
          🔥 로그인
          ========================= */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          {/* =========================
          🔥 회원가입
          ========================= */}
          <Route
            path="/signup"
            element={<SignupPage />}
          />

          {/* =========================
          🔥 지도
          ========================= */}
          <Route
            path="/map"
            element={<MapPage />}
          />

          {/* =========================
          🔥 첫 페이지 → 관리자
          ========================= */}
          <Route
            path="/"
            element={
              <Navigate
                to="/admin"
                replace
              />
            }
          />

          {/* =========================
          🔥 EMPTY
          ========================= */}
          <Route
            path="/empty"
            element={
              <EmptyState
                message="데이터 없음"
              />
            }
          />

          {/* =========================
          🔥 404
          ========================= */}
          <Route
            path="*"
            element={
              <div
                style={{
                  minHeight: "100vh",
                  background: "#000",
                  color: "#d4af37",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <h1>404</h1>

                <p>
                  페이지를 찾을 수 없습니다.
                </p>
              </div>
            }
          />

        </Routes>
      </BrowserRouter>
    );

  } catch (e) {

    console.error(
      "ROUTER INDEX ERROR:",
      e
    );

    return (
      <ErrorMessage
        message="라우터 오류 발생"
      />
    );
  }
}

export default RouterIndex;