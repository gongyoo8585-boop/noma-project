"use strict";

import React from "react";

import ReviewAdminList from "../../components/admin/review/ReviewAdminList";

/* 🔥 추가 */
import AdminLayout from "../../components/admin/AdminLayout";

import EmptyState from "../../components/common/EmptyState";

/* 🔥 최소 추가 */
import ErrorMessage from "../../components/common/ErrorMessage";

/**
 * =====================================================
 * 🔥 REVIEW ADMIN PAGE
 * (ULTRA FINAL - ADMIN LAYOUT PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ AdminLayout 최소 추가
 * ✔ EmptyState 유지
 * ✔ 기존 흐름 유지
 * ✔ null 안전성 최소 보강
 * ✔ render crash 방어 최소 추가
 * ✔ ReviewAdminList undefined 방어
 * ✔ React runtime error 최소 방어
 * =====================================================
 */

function ReviewAdminPage() {

  /* 🔥 기존 유지 */
  const hasReviewAdminList =
    typeof ReviewAdminList === "function" ||
    typeof ReviewAdminList === "object";

  /* 🔥 최소 추가 */
  const hasLayout =
    typeof AdminLayout === "function" ||
    typeof AdminLayout === "object";

  /* 🔥 최소 추가 */
  if (!hasLayout) {
    return (
      <div style={styles.page}>
        <ErrorMessage message="관리자 레이아웃을 불러올 수 없습니다." />
      </div>
    );
  }

  return (
    <AdminLayout title="리뷰 관리">
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>리뷰 관리</h1>

          <p style={styles.desc}>
            전체 리뷰 목록, 숨김/복구, 삭제 및 관리자 답글을 관리합니다.
          </p>
        </div>

        {/* 🔥 기존 유지 */}
        {!hasReviewAdminList && (
          <EmptyState message="리뷰 목록을 불러올 수 없습니다." />
        )}

        {/* 🔥 기존 유지 */}
        {hasReviewAdminList && (
          <ReviewAdminList />
        )}
      </div>
    </AdminLayout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    padding: 20,
    boxSizing: "border-box",
  },

  header: {
    marginBottom: 20,
  },

  title: {
    margin: 0,
    color: "#d4af37",
    fontSize: 28,
  },

  desc: {
    marginTop: 8,
    color: "#aaa",
    fontSize: 14,
    lineHeight: 1.5,
  },
};

export default ReviewAdminPage;