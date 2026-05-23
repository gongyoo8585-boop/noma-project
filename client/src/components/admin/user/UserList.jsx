"use strict";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import userApi from "../../../services/user.api";
import UserItem from "./UserItem";

/* 🔥 추가 */
import Loading from "../../common/Loading";
import ErrorMessage from "../../common/ErrorMessage";
import EmptyState from "../../common/EmptyState";

/**
 * =====================================================
 * 🔥 USER LIST (ULTRA FINAL STABLE PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ 공통 UI 컴포넌트 최소 추가 유지
 * ✔ 기존 로직 / 흐름 유지
 * ✔ StrictMode 중복 요청 최소 방어
 * ✔ unmounted state update 방어
 * ✔ 과다 요청 최소 방어
 * ✔ null 안전성 최소 보강
 * ✔ 무한 로딩 최소 방어
 * ✔ render crash 최소 방어
 * ✔ 429 요청 폭주 방어 최소 추가
 * ✔ fetch 중복 실행 방어 최소 추가
 * ✔ response 구조 유연 처리
 * ✔ key crash 방어
 * =====================================================
 */

function UserList() {
  const mountedRef = useRef(false);

  const fetchedRef = useRef(false);

  /* 🔥 최소 추가 */
  const fetchingRef = useRef(false);

  const [users, setUsers] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const fetchUsers = async () => {
    /* 🔥 중복 요청 방어 */
    if (fetchingRef.current) {
      return;
    }

    if (fetchedRef.current) {
      return;
    }

    try {
      fetchingRef.current = true;

      fetchedRef.current = true;

      if (mountedRef.current) {
        setLoading(true);
        setError("");
      }

      const res =
        await userApi.getList();

      /* 🔥 응답 구조 방어 */
      let list =
        res?.data?.users ||
        res?.data?.items ||
        res?.data?.data ||
        res?.data ||
        res?.users ||
        res?.items ||
        res?.result ||
        res ||
        [];

      /* 🔥 null 방어 */
      if (!Array.isArray(list)) {
        list = [];
      }

      if (!mountedRef.current) {
        return;
      }

      setUsers(list);
    } catch (e) {
      console.error(
        "USER_LIST_LOAD_ERROR:",
        e
      );

      fetchedRef.current = false;

      if (!mountedRef.current) {
        return;
      }

      setError(
        e?.response?.data
          ?.message ||
          e?.message ||
          "유저 목록 조회 실패"
      );
    } finally {
      fetchingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    fetchUsers();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleRole = async (
    id,
    role
  ) => {
    try {
      await userApi.updateRole(
        id,
        role
      );

      setUsers((prev) =>
        prev.map((u) =>
          (u?._id || u?.id) ===
          id
            ? {
                ...u,
                role,
              }
            : u
        )
      );
    } catch (e) {
      setError(
        e?.response?.data
          ?.message ||
          e?.message ||
          "권한 변경 실패"
      );
    }
  };

  const handleBlock = async (
    id,
    blocked
  ) => {
    try {
      await userApi.block(
        id,
        blocked
      );

      setUsers((prev) =>
        prev.map((u) =>
          (u?._id || u?.id) ===
          id
            ? {
                ...u,
                status:
                  blocked
                    ? "blocked"
                    : "active",
              }
            : u
        )
      );
    } catch (e) {
      setError(
        e?.response?.data
          ?.message ||
          e?.message ||
          "차단 실패"
      );
    }
  };

  const handleDelete =
    async (id) => {
      if (
        !window.confirm(
          "정말 삭제하시겠습니까?"
        )
      ) {
        return;
      }

      try {
        await userApi.remove(id);

        setUsers((prev) =>
          prev.filter(
            (u) =>
              (u?._id ||
                u?.id) !== id
          )
        );
      } catch (e) {
        setError(
          e?.response?.data
            ?.message ||
            e?.message ||
            "삭제 실패"
        );
      }
    };

  return (
    <div style={wrap}>
      {error && (
        <ErrorMessage
          message={error}
        />
      )}

      {loading && (
        <Loading message="불러오는 중..." />
      )}

      {!loading &&
        !error &&
        users.length ===
          0 && (
          <EmptyState message="유저가 없습니다." />
        )}

      {!loading &&
        !error &&
        users.length >
          0 && (
          <div style={list}>
            {users.map(
              (
                user,
                index
              ) => (
                <UserItem
                  key={
                    user?._id ||
                    user?.id ||
                    index
                  }
                  user={user}
                  onRoleChange={
                    handleRole
                  }
                  onBlock={
                    handleBlock
                  }
                  onDelete={
                    handleDelete
                  }
                />
              )
            )}
          </div>
        )}
    </div>
  );
}

/* =========================
🔥 STYLE
========================= */

const wrap = {};

const list = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export default UserList;