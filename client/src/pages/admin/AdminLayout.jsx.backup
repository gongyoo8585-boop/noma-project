"use strict";

import React from "react";

import Loading from "../../components/common/Loading";
import ErrorMessage from "../../components/common/ErrorMessage";
import EmptyState from "../../components/common/EmptyState";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminHeader from "../../components/admin/AdminHeader";

/**
 * =====================================================
 * 🔥 PAGE ADMIN LAYOUT
 * ✔ 관리자 페이지 전용 레이아웃
 * ✔ Sidebar + Header 포함
 * ✔ 블랙 / 골드 테마
 * ✔ 반응형 지원
 * ✔ children 안전 처리
 * ✔ loading / error / empty 처리
 * ✔ 기존 프로젝트 구조 충돌 없음
 * ✔ 단독 사용 가능
 * ✔ 관리자 페이지 공통 래퍼
 * =====================================================
 */

export default function AdminLayout({
  title = "NOMA ADMIN",
  subTitle = "MASSAGE PLATFORM",
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
        <Loading message="관리자 페이지 로딩 중..." />
      </div>
    );
  }

  /* =====================================================
  🔥 ERROR
  ===================================================== */
  if (error) {
    return (
      <div style={styles.stateWrapper}>
        <ErrorMessage message={error} />
      </div>
    );
  }

  /* =====================================================
  🔥 EMPTY
  ===================================================== */
  if (empty) {
    return (
      <div style={styles.stateWrapper}>
        <EmptyState message={emptyMessage} />
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
        <EmptyState message="페이지 내용을 불러올 수 없습니다." />
      </div>
    );
  }

  return (
    <div
      className="page-admin-layout"
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
        <AdminHeader
          title={title}
          subTitle={subTitle}
        />

        {/* MAIN */}
        <main style={styles.main}>
          {children}
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
    background: "#000",
    color: "#fff",
    overflow: "hidden",
  },

  sidebar: {
    width: 240,
    minWidth: 240,
    background: "#000",
    borderRight: "1px solid #222",
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",
  },

  contentWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    background: "#111",
  },

  main: {
    flex: 1,
    padding: 24,
    overflowX: "auto",
    overflowY: "auto",
    boxSizing: "border-box",
    background: "#111",
  },

  stateWrapper: {
    width: "100%",
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    boxSizing: "border-box",
  },
};