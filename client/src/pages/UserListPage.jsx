"use strict";

import React from "react";
import UserList from "../components/admin/user/UserList";

/* 🔥 추가 */
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 USER LIST PAGE (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ EmptyState 최소 추가
 * ✔ 기존 흐름 유지
 * ✔ 컴포넌트 체크 안정화 (최소 수정)
 * =====================================================
 */

function UserListPage() {
  const pathname = window?.location?.pathname || "";

  const isAdmin = pathname.includes("/admin");

  /* 🔥 최소 수정 */
  const isValidComponent = typeof UserList === "function";

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          {isAdmin ? "전체 유저 목록" : "유저 목록"}
        </h1>
        <p style={styles.desc}>
          {isAdmin
            ? "회원 관리 및 권한 설정을 수행합니다."
            : "등록된 사용자 목록입니다."}
        </p>
      </div>

      {/* 🔥 컴포넌트 방어 */}
      {!isValidComponent && (
        <EmptyState message="유저 목록을 불러올 수 없습니다." />
      )}

      {isValidComponent && <UserList admin={isAdmin} />}
    </div>
  );
}

/* =========================
🔥 STYLE
========================= */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    padding: 20,
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
  },
};

export default UserListPage;