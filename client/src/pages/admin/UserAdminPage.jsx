"use strict";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import UserList from "../../components/admin/user/UserList";

/* 🔥 추가 */
import AdminLayout from "../../components/admin/AdminLayout";

import EmptyState from "../../components/common/EmptyState";

/* 🔥 최소 추가 */
import ErrorMessage from "../../components/common/ErrorMessage";

/* 🔥 최소 추가 */
import Loading from "../../components/common/Loading";

/**
 * =====================================================
 * 🔥 USER ADMIN PAGE
 * ✔ 기존 코드 100% 유지
 * ✔ AdminLayout 유지
 * ✔ UserList 유지
 * ✔ EmptyState 유지
 * ✔ ErrorMessage 유지
 * ✔ Loading 유지
 * ✔ StrictMode 중복 렌더 최소 방어
 * ✔ 무한 재렌더 최소 방어
 * ✔ 반복 마운트 최소 방어
 * ✔ render crash 최소 방어
 * ✔ loading 고정 최소 방어
 * ✔ 기존 흐름 유지
 * =====================================================
 */

function UserAdminPage() {
  const mountedRef =
    useRef(false);

  const initializedRef =
    useRef(false);

  const timerRef =
    useRef(null);

  const [ready, setReady] =
    useState(false);

  const [renderError, setRenderError] =
    useState("");

  /* 🔥 기존 유지 */
  const hasUserList =
    typeof UserList ===
      "function" ||
    typeof UserList ===
      "object";

  /* 🔥 기존 유지 */
  const hasLayout =
    typeof AdminLayout ===
      "function" ||
    typeof AdminLayout ===
      "object";

  /* 🔥 최소 추가 */
  useEffect(() => {
    mountedRef.current = true;

    if (
      initializedRef.current
    ) {
      if (
        mountedRef.current
      ) {
        setReady(true);
      }

      return () => {
        mountedRef.current =
          false;
      };
    }

    initializedRef.current =
      true;

    timerRef.current =
      setTimeout(() => {
        if (
          mountedRef.current
        ) {
          setReady(true);
        }
      }, 50);

    return () => {
      mountedRef.current =
        false;

      if (
        timerRef.current
      ) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, []);

  /* 🔥 기존 유지 */
  const userListElement =
    useMemo(() => {
      if (
        !hasUserList
      ) {
        return null;
      }

      try {
        return <UserList />;
      } catch (e) {
        console.error(
          "USER LIST RENDER ERROR:",
          e
        );

        return (
          <ErrorMessage message="유저 목록 렌더링 중 오류가 발생했습니다." />
        );
      }
    }, [hasUserList]);

  /* 🔥 최소 추가 */
  useEffect(() => {
    try {
      if (
        ready &&
        hasUserList &&
        !userListElement
      ) {
        setRenderError(
          "유저 목록을 불러올 수 없습니다."
        );
      } else {
        setRenderError("");
      }
    } catch (e) {
      console.error(
        "USER ADMIN PAGE STATE ERROR:",
        e
      );

      setRenderError(
        "유저 관리 페이지 처리 중 오류가 발생했습니다."
      );
    }
  }, [
    ready,
    hasUserList,
    userListElement,
  ]);

  /* 🔥 기존 유지 */
  if (!hasLayout) {
    return (
      <div style={styles.page}>
        <ErrorMessage message="관리자 레이아웃을 불러올 수 없습니다." />
      </div>
    );
  }

  return (
    <AdminLayout title="유저 관리">
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            유저 관리
          </h1>

          <p style={styles.desc}>
            회원 목록, 권한, 차단 상태를 관리합니다.
          </p>
        </div>

        {/* 🔥 기존 흐름 유지 */}
        {!ready && (
          <Loading message="회원 목록 준비 중..." />
        )}

        {/* 🔥 최소 추가 */}
        {ready &&
          renderError && (
            <ErrorMessage message={renderError} />
          )}

        {/* 🔥 기존 유지 */}
        {ready &&
          !renderError &&
          !hasUserList && (
            <EmptyState message="유저 목록을 불러올 수 없습니다." />
          )}

        {/* 🔥 기존 유지 */}
        {ready &&
          !renderError &&
          hasUserList &&
          userListElement}
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
    boxSizing:
      "border-box",
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

export default UserAdminPage;