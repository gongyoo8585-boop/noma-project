"use strict";

import React, { useEffect, useRef, useState } from "react";
import { Routes, Route } from "react-router-dom";

/* =========================
🔥 페이지 import
========================= */
import HomePage from "../pages/HomePage";
import MapPage from "../pages/MapPage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import SignupAgreePage from "../pages/SignupAgreePage";
import SignupTypePage from "../pages/SignupTypePage";
import BusinessSignupAgreePage from "../pages/BusinessSignupAgreePage";
import BusinessSignupPage from "../pages/BusinessSignupPage";
import TermsDetailPage from "../pages/TermsDetailPage";
import ShopDetailPage from "../pages/ShopDetailPage";
import KaraokeMapPage from "../pages/KaraokeMapPage";
import KaraokeShopDetailPage from "../pages/KaraokeShopDetailPage";
import JobsPage from "../pages/JobsPage";
import JobDetailPage from "../pages/JobDetailPage";
import BusinessJobFormPage from "../pages/BusinessJobFormPage";
import PartnerInquiryPage from "../pages/PartnerInquiryPage";

import ReviewPage from "../pages/ReviewPage";
import ReservationCreatePage from "../pages/ReservationCreatePage";
import ReservationListPage from "../pages/ReservationListPage";
import ReservationDetailPage from "../pages/ReservationDetailPage";

import PaymentProcessPage from "../pages/PaymentProcessPage";
import PaymentSuccessPage from "../pages/PaymentSuccessPage";
import PaymentFailPage from "../pages/PaymentFailPage";
import PaymentPage from "../pages/PaymentPage";

/* 관리자 */
import UserAdminPage from "../pages/admin/UserAdminPage";
import ReservationAdminPage from "../pages/admin/ReservationAdminPage";
import PaymentAdminPage from "../pages/admin/PaymentAdminPage";
import ReviewAdminPage from "../pages/admin/ReviewAdminPage";
import ReportAdminPage from "../pages/admin/ReportAdminPage";
import AdminDashboard from "../pages/AdminDashboard";
import TermsAdminPage from "../pages/admin/TermsAdminPage";
import AdminJobPage from "../pages/admin/AdminJobPage";
import AdminJobFormPage from "../pages/admin/AdminJobFormPage";

/* 🔥 추가 */
import ShopAdminPage from "../pages/admin/ShopAdminPage";

/* 🔥 노래방 관리자 */
import KaraokeDashboardPage from "../pages/admin/karaoke/KaraokeDashboardPage";
import KaraokeShopAdminPage from "../pages/admin/karaoke/KaraokeShopAdminPage";
import KaraokeUserAdminPage from "../pages/admin/karaoke/KaraokeUserAdminPage";
import KaraokeReservationAdminPage from "../pages/admin/karaoke/KaraokeReservationAdminPage";
import KaraokePaymentAdminPage from "../pages/admin/karaoke/KaraokePaymentAdminPage";
import KaraokeReviewAdminPage from "../pages/admin/karaoke/KaraokeReviewAdminPage";
import KaraokeReportAdminPage from "../pages/admin/karaoke/KaraokeReportAdminPage";
import KaraokeAnalyticsPage from "../pages/admin/karaoke/KaraokeAnalyticsPage";

/* UI 상태 */
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";
import AdminLayout from "../components/admin/AdminLayout";

const ADMIN_ROUTE_PREFIXES = [
  "/admin",
  "/admin/dashboard",
  "/admin/massage",
  "/admin/karaoke",
];

const isAdminRoutePath = (pathname = "") => {
  if (!pathname || typeof pathname !== "string") {
    return false;
  }

  return ADMIN_ROUTE_PREFIXES.some((prefix) => {
    return (
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`)
    );
  });
};

/**
 * =====================================================
 * 🔥 APP ROUTER
 * ✔ 관리자 무한 로딩 수정
 * ✔ 로그인 깜박임 제거
 * ✔ redirect loop 제거
 * ✔ signup 유지
 * ✔ signup-agree 약관동의 라우트 최소 추가
 * ✔ 기존 구조 유지
 * ✔ 업체 관리 / 신고 관리 라우팅 직접 연결
 * ✔ 최소 수정
 * ✔ token 자동 관리자 처리 제거
 * ✔ 로그인 페이지 정상 복구
 * ✔ Navigate redirect 제거
 * ✔ "/" 메인 랜딩 HomePage 연결
 * ✔ "/map" 지도 MapPage 연결
 * ✔ 상세페이지 ShopDetailPage 연결
 * ✔ 마사지 관리자 시스템 라우팅 분리
 * ✔ 노래방 관리자 시스템 라우팅 분리
 * ✔ 마사지 유저 라우팅 분리
 * ✔ 노래방 유저 라우팅 분리
 * =====================================================
 */

function AppRouter() {
  const authSyncTimerRef = useRef(null);

  const [loading] = useState(false);
  const [error] = useState("");

  const [user, setUser] = useState(null);

  const [checked, setChecked] = useState(false);

  const getSavedUser = () => {
    try {
      const savedUser =
        localStorage.getItem("adminUser") ||
        sessionStorage.getItem("adminUser");

      if (!savedUser) {
        return null;
      }

      return JSON.parse(savedUser);
    } catch (e) {
      console.error("USER PARSE ERROR:", e);
      return null;
    }
  };

  const getSavedToken = () => {
    return (
      localStorage.getItem("adminToken") ||
      sessionStorage.getItem("adminToken") ||
      localStorage.getItem("local-admin-token") ||
      sessionStorage.getItem("local-admin-token") ||
      ""
    );
  };

  const normalizeAdminUser = (value) => {
    if (!value || typeof value !== "object") {
      return null;
    }

    if (
      value.role === "admin" ||
      value.userRole === "admin" ||
      value.type === "admin" ||
      value.isAdmin === true
    ) {
      return {
        ...value,
        role: value.role || "admin",
        userRole: value.userRole || "admin",
        type: value.type || "admin",
        isAdmin: true,
      };
    }

    return value;
  };

  const isSameUser = (a, b) => {
    try {
      return JSON.stringify(a || null) === JSON.stringify(b || null);
    } catch (e) {
      return false;
    }
  };

  const setUserSafely = (nextUser) => {
    setUser((prev) => {
      if (isSameUser(prev, nextUser)) {
        return prev;
      }

      return nextUser || null;
    });
  };

  const syncAdminUserFromStorage = () => {
    try {
      const savedUser = normalizeAdminUser(getSavedUser());
      const savedToken = getSavedToken();

      if (
        savedUser &&
        savedToken &&
        (
          savedUser.role === "admin" ||
          savedUser.userRole === "admin" ||
          savedUser.type === "admin" ||
          savedUser.isAdmin === true
        )
      ) {
        sessionStorage.setItem(
          "adminLoggedIn",
          "true"
        );

        localStorage.setItem(
          "isAdmin",
          "true"
        );

        sessionStorage.setItem(
          "isAdmin",
          "true"
        );

        localStorage.setItem(
          "adminUser",
          JSON.stringify(savedUser)
        );

        sessionStorage.setItem(
          "adminUser",
          JSON.stringify(savedUser)
        );

        setUserSafely(savedUser);

        return savedUser;
      }

      setUserSafely(null);

      return null;
    } catch (e) {
      console.error(
        "ADMIN USER SYNC ERROR:",
        e
      );

      setUserSafely(null);

      return null;
    }
  };

  useEffect(() => {
    const currentPath = window.location.pathname;

    if (
      currentPath === "/signup-type" ||
      currentPath === "/signup-agree" ||
      currentPath === "/signup" ||
      currentPath === "/business/signup-agree" ||
      currentPath === "/business/signup" ||
      currentPath === "/register" ||
      currentPath === "/terms"
    ) {
      setChecked(true);
      return;
    }

    syncAdminUserFromStorage();

    setChecked(true);
  }, []);

  useEffect(() => {
    const handleAuthSync = () => {
      if (authSyncTimerRef.current) {
        clearTimeout(authSyncTimerRef.current);
      }

      authSyncTimerRef.current = setTimeout(() => {
        syncAdminUserFromStorage();
      }, 0);
    };

    window.addEventListener("storage", handleAuthSync);
    window.addEventListener("focus", handleAuthSync);
    window.addEventListener("auth-updated", handleAuthSync);
    window.addEventListener("popstate", handleAuthSync);

    return () => {
      if (authSyncTimerRef.current) {
        clearTimeout(authSyncTimerRef.current);
      }

      window.removeEventListener("storage", handleAuthSync);
      window.removeEventListener("focus", handleAuthSync);
      window.removeEventListener("auth-updated", handleAuthSync);
      window.removeEventListener("popstate", handleAuthSync);
    };
  }, []);

  const setAdminUser = (nextUser) => {
    try {
      const normalizedUser = normalizeAdminUser(nextUser);

      if (
        normalizedUser &&
        (
          normalizedUser.role === "admin" ||
          normalizedUser.userRole === "admin" ||
          normalizedUser.type === "admin" ||
          normalizedUser.isAdmin === true
        )
      ) {
        sessionStorage.setItem(
          "adminLoggedIn",
          "true"
        );

        localStorage.setItem(
          "isAdmin",
          "true"
        );

        sessionStorage.setItem(
          "isAdmin",
          "true"
        );

        localStorage.setItem(
          "adminUser",
          JSON.stringify(normalizedUser)
        );

        sessionStorage.setItem(
          "adminUser",
          JSON.stringify(normalizedUser)
        );

        setUserSafely(normalizedUser);

        try {
          window.setTimeout(() => {
            window.dispatchEvent(new Event("auth-updated"));
          }, 0);
        } catch (e) {
          console.warn("AUTH EVENT FAIL");
        }

        return;
      }

      setUserSafely(normalizedUser || null);
    } catch (e) {
      console.error(
        "SET ADMIN USER ERROR:",
        e
      );

      setUserSafely(nextUser || null);
    }
  };

  const savedUser =
    user ||
    normalizeAdminUser(getSavedUser());

  const savedToken =
    getSavedToken();

  const isAdminLoggedIn =
    !!(
      savedToken &&
      savedUser &&
      (
        savedUser.role === "admin" ||
        savedUser.userRole === "admin" ||
        savedUser.type === "admin" ||
        savedUser.isAdmin === true
      )
    );

  useEffect(() => {
    if (
      checked &&
      !isAdminLoggedIn &&
      isAdminRoutePath(window.location.pathname)
    ) {
      sessionStorage.removeItem(
        "adminLoggedIn"
      );
    }
  }, [checked, isAdminLoggedIn]);

  const handleAdminLoginUser = (nextUser) => {
    setAdminUser(nextUser);
  };

  const AdminLoginPage = (
    <LoginPage
      setUser={handleAdminLoginUser}
    />
  );

  const UserLoginPage = (
    <LoginPage />
  );

  if (loading || !checked) {
    return <Loading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
      />
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<HomePage />}
      />

      <Route
        path="/home"
        element={<HomePage />}
      />

      <Route
        path="/login"
        element={UserLoginPage}
      />

      <Route
        path="/signup-type"
        element={<SignupTypePage />}
      />

      <Route
        path="/signup-agree"
        element={<SignupAgreePage />}
      />

      <Route
        path="/signup"
        element={<SignupPage />}
      />

      <Route
        path="/terms"
        element={<TermsDetailPage />}
      />

      <Route
        path="/register"
        element={<SignupPage />}
      />

      <Route
        path="/business/signup-agree"
        element={<BusinessSignupAgreePage />}
      />

      <Route
        path="/business/signup"
        element={<BusinessSignupPage />}
      />

      <Route
        path="/admin"
        element={AdminLoginPage}
      />

      <Route
        path="/admin/dashboard"
        element={
          isAdminLoggedIn ? (
            <AdminDashboard />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/shops"
        element={
          isAdminLoggedIn ? (
            <ShopAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/signup"
        element={
          isAdminLoggedIn ? (
            <AdminLayout title="회원가입 페이지">
              <SignupPage />
            </AdminLayout>
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/jobs"
        element={
          isAdminLoggedIn ? (
            <AdminJobPage serviceType="massage" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/jobs/new"
        element={
          isAdminLoggedIn ? (
            <AdminJobFormPage serviceType="massage" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/jobs/:jobId/edit"
        element={
          isAdminLoggedIn ? (
            <AdminJobFormPage serviceType="massage" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/reports"
        element={
          isAdminLoggedIn ? (
            <ReportAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/users"
        element={
          isAdminLoggedIn ? (
            <UserAdminPage roleFilter="user" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/users/shop"
        element={
          isAdminLoggedIn ? (
            <UserAdminPage
              roleFilter="shop"
              serviceFilter="massage"
            />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/users/admin"
        element={
          isAdminLoggedIn ? (
            <UserAdminPage roleFilter="admin" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/reservations"
        element={
          isAdminLoggedIn ? (
            <ReservationAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/payments"
        element={
          isAdminLoggedIn ? (
            <PaymentAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/reviews"
        element={
          isAdminLoggedIn ? (
            <ReviewAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/analytics"
        element={
          isAdminLoggedIn ? (
            <AdminDashboard />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/terms"
        element={
          isAdminLoggedIn ? (
            <AdminLayout title="약관 관리">
              <TermsAdminPage />
            </AdminLayout>
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/terms/*"
        element={
          isAdminLoggedIn ? (
            <AdminLayout title="약관 관리">
              <TermsAdminPage />
            </AdminLayout>
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage"
        element={
          isAdminLoggedIn ? (
            <AdminDashboard />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/dashboard"
        element={
          isAdminLoggedIn ? (
            <AdminDashboard />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/shops"
        element={
          isAdminLoggedIn ? (
            <ShopAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/jobs"
        element={
          isAdminLoggedIn ? (
            <AdminJobPage serviceType="massage" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/jobs/new"
        element={
          isAdminLoggedIn ? (
            <AdminJobFormPage serviceType="massage" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/jobs/:jobId/edit"
        element={
          isAdminLoggedIn ? (
            <AdminJobFormPage serviceType="massage" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/reports"
        element={
          isAdminLoggedIn ? (
            <ReportAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/users"
        element={
          isAdminLoggedIn ? (
            <UserAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/reservations"
        element={
          isAdminLoggedIn ? (
            <ReservationAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/payments"
        element={
          isAdminLoggedIn ? (
            <PaymentAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/reviews"
        element={
          isAdminLoggedIn ? (
            <ReviewAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/massage/analytics"
        element={
          isAdminLoggedIn ? (
            <AdminDashboard />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke"
        element={
          isAdminLoggedIn ? (
            <KaraokeDashboardPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/dashboard"
        element={
          isAdminLoggedIn ? (
            <KaraokeDashboardPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/shops"
        element={
          isAdminLoggedIn ? (
            <KaraokeShopAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/jobs"
        element={
          isAdminLoggedIn ? (
            <AdminJobPage serviceType="karaoke" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/jobs/new"
        element={
          isAdminLoggedIn ? (
            <AdminJobFormPage serviceType="karaoke" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/jobs/:jobId/edit"
        element={
          isAdminLoggedIn ? (
            <AdminJobFormPage serviceType="karaoke" />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/users"
        element={
          isAdminLoggedIn ? (
            <KaraokeUserAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/users/shop"
        element={
          isAdminLoggedIn ? (
            <UserAdminPage
              roleFilter="shop"
              serviceFilter="karaoke"
            />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/reservations"
        element={
          isAdminLoggedIn ? (
            <KaraokeReservationAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/payments"
        element={
          isAdminLoggedIn ? (
            <KaraokePaymentAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/reviews"
        element={
          isAdminLoggedIn ? (
            <KaraokeReviewAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/reports"
        element={
          isAdminLoggedIn ? (
            <KaraokeReportAdminPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/admin/karaoke/analytics"
        element={
          isAdminLoggedIn ? (
            <KaraokeAnalyticsPage />
          ) : (
            AdminLoginPage
          )
        }
      />

      <Route
        path="/jobs"
        element={<JobsPage />}
      />

      <Route
        path="/business/jobs/new"
        element={<BusinessJobFormPage />}
      />

      <Route
        path="/jobs/:jobId"
        element={<JobDetailPage />}
      />

      <Route
        path="/partner-inquiry"
        element={<PartnerInquiryPage />}
      />

      <Route
        path="/map"
        element={<MapPage />}
      />

      <Route
        path="/massage"
        element={<MapPage />}
      />

      <Route
        path="/massage/map"
        element={<MapPage />}
      />

      <Route
        path="/karaoke"
        element={<KaraokeMapPage />}
      />

      <Route
        path="/karaoke/map"
        element={<KaraokeMapPage />}
      />

      <Route
        path="/shops/:id"
        element={<ShopDetailPage />}
      />

      <Route
        path="/shop/:id"
        element={<ShopDetailPage />}
      />

      <Route
        path="/shop-detail/:id"
        element={<ShopDetailPage />}
      />

      <Route
        path="/massage/shops/:id"
        element={<ShopDetailPage />}
      />

      <Route
        path="/massage/shop/:id"
        element={<ShopDetailPage />}
      />

      <Route
        path="/massage/shop-detail/:id"
        element={<ShopDetailPage />}
      />

      <Route
        path="/karaoke/shops/:id"
        element={<KaraokeShopDetailPage />}
      />

      <Route
        path="/karaoke/shop/:id"
        element={<KaraokeShopDetailPage />}
      />

      <Route
        path="/karaoke/shop-detail/:id"
        element={<KaraokeShopDetailPage />}
      />

      <Route
        path="/reviews"
        element={<ReviewPage />}
      />

      <Route
        path="/reservations"
        element={
          <ReservationListPage />
        }
      />

      <Route
        path="/reservations/create"
        element={
          <ReservationCreatePage />
        }
      />

      <Route
        path="/reservations/:id"
        element={
          <ReservationDetailPage />
        }
      />

      <Route
        path="/payment"
        element={<PaymentPage />}
      />

      <Route
        path="/payments/process"
        element={
          <PaymentProcessPage />
        }
      />

      <Route
        path="/payments/success"
        element={
          <PaymentSuccessPage />
        }
      />

      <Route
        path="/payments/fail"
        element={
          <PaymentFailPage />
        }
      />

      <Route
        path="/empty"
        element={
          <EmptyState
            message="데이터 없음"
          />
        }
      />

      <Route
        path="*"
        element={<HomePage />}
      />
    </Routes>
  );
}

export default AppRouter;
