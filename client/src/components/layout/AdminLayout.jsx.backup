"use strict";

import React from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

import AdminSidebar from "../admin/AdminSidebar";
import AdminHeader from "../admin/AdminHeader";

/**
 * =====================================================
 * 🔥 COMPONENT ADMIN LAYOUT
 * ✔ 관리자 공통 레이아웃
 * ✔ Sidebar + Header 포함
 * ✔ 블랙 / 골드 테마
 * ✔ 반응형 지원
 * ✔ children 안전 처리
 * ✔ loading / error / empty 처리
 * ✔ 기존 프로젝트 구조 충돌 없음
 * ✔ 단독 사용 가능
 * ✔ 관리자 페이지 공통 레이아웃
 * =====================================================
 */

export default function AdminLayout({
  title = "NOMA ADMIN",
  loading = false,
  error = "",
  empty = false,
  emptyMessage = "데이터가 없습니다.",
  children,
}) {
  /* =====================================================
  🔥 LOADING
  ===================================================== */
  if (loading) {
    return (
      <div style={styles.stateWrapper}>
        <div style={styles.statePanel}>
          <Loading message="관리자 페이지 로딩 중..." />
        </div>
      </div>
    );
  }

  /* =====================================================
  🔥 ERROR
  ===================================================== */
  if (error) {
    return (
      <div style={styles.stateWrapper}>
        <div style={styles.statePanel}>
          <ErrorMessage message={error} />
        </div>
      </div>
    );
  }

  /* =====================================================
  🔥 EMPTY
  ===================================================== */
  if (empty) {
    return (
      <div style={styles.stateWrapper}>
        <div style={styles.statePanel}>
          <EmptyState message={emptyMessage} />
        </div>
      </div>
    );
  }

  /* =====================================================
  🔥 CHILDREN VALIDATION
  ===================================================== */
  if (
    children === undefined ||
    children === null
  ) {
    return (
      <div style={styles.stateWrapper}>
        <div style={styles.statePanel}>
          <EmptyState message="페이지 내용을 불러올 수 없습니다." />
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-layout"
      style={styles.wrapper}
    >
      {/* =========================
      SIDEBAR
      ========================= */}
      <aside style={styles.sidebar}>
        <AdminSidebar />
      </aside>

      {/* =========================
      CONTENT
      ========================= */}
      <div style={styles.contentWrapper}>
        {/* HEADER */}
        <div style={styles.headerWrap}>
          <AdminHeader title={title} />
        </div>

        {/* BODY */}
        <main style={styles.main}>
          <div style={styles.mainInner}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    background:
      "radial-gradient(circle at 80% 0%, rgba(255,212,0,0.08) 0%, rgba(0,0,0,0) 28%), linear-gradient(180deg, #000000 0%, #050505 52%, #000000 100%)",
    color: "#fff",
    overflow: "hidden",
  },

  sidebar: {
    width: 240,
    minWidth: 240,
    background:
      "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(5,5,5,1) 100%)",
    borderRight: "1px solid rgba(255,212,0,0.36)",
    overflowY: "auto",
    boxSizing: "border-box",
    boxShadow:
      "6px 0 24px rgba(0,0,0,0.86), 0 0 16px rgba(255,212,0,0.12)",
    scrollbarWidth: "thin",
    scrollbarColor: "#ffd400 rgba(0,0,0,0.4)",
  },

  contentWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    background:
      "linear-gradient(180deg, rgba(9,9,9,1) 0%, rgba(0,0,0,1) 100%)",
  },

  headerWrap: {
    flexShrink: 0,
    borderBottom: "1px solid rgba(255,212,0,0.28)",
    boxShadow:
      "0 0 18px rgba(255,212,0,0.10), 0 10px 24px rgba(0,0,0,0.62)",
    zIndex: 5,
  },

  main: {
    flex: 1,
    padding: 24,
    overflowX: "auto",
    overflowY: "auto",
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 50% 0%, rgba(255,212,0,0.055) 0%, rgba(0,0,0,0) 34%), linear-gradient(180deg, #080808 0%, #030303 100%)",
    scrollbarWidth: "thin",
    scrollbarColor: "#ffd400 rgba(0,0,0,0.35)",
  },

  mainInner: {
    width: "100%",
    minHeight: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid rgba(255,212,0,0.20)",
    background:
      "linear-gradient(180deg, rgba(12,12,12,0.96) 0%, rgba(4,4,4,0.98) 100%)",
    boxShadow:
      "0 0 0 1px rgba(255,212,0,0.04), 0 0 18px rgba(255,212,0,0.10), 0 14px 42px rgba(0,0,0,0.72)",
    padding: 18,
  },

  stateWrapper: {
    width: "100%",
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% 10%, rgba(255,212,0,0.10) 0%, rgba(0,0,0,0) 32%), linear-gradient(180deg, #000000 0%, #050505 100%)",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    boxSizing: "border-box",
  },

  statePanel: {
    width: "min(520px, 100%)",
    minHeight: 220,
    borderRadius: 14,
    border: "1px solid rgba(255,212,0,0.42)",
    background:
      "linear-gradient(180deg, rgba(12,12,12,0.98) 0%, rgba(0,0,0,0.98) 100%)",
    boxShadow:
      "0 0 0 1px rgba(255,212,0,0.08), 0 0 22px rgba(255,212,0,0.18), 0 18px 48px rgba(0,0,0,0.86)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    boxSizing: "border-box",
  },
};