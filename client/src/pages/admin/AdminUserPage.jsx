"use strict";

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../../services/user.api";
import Loading from "../../components/common/Loading";
import ErrorMessage from "../../components/common/ErrorMessage";
import EmptyState from "../../components/common/EmptyState";

function AdminUserPage({ navigate }) {
  const routerNavigate = useNavigate();
  const go = navigate || routerNavigate;

  const [users, setUsers] = useState([]);
  const [originUsers, setOriginUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    admin: 0,
    blocked: 0,
  });

  const loadingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) {
      return;
    }

    mountedRef.current = true;

    load();
  }, []);

  const getUserId = (user) => {
    return (
      user?._id ||
      user?.id ||
      user?.userId ||
      ""
    );
  };

  const normalizeUsers = (res) => {
    if (Array.isArray(res)) {
      return res.filter(Boolean);
    }

    const list =
      res?.items ||
      res?.list ||
      res?.users ||
      res?.data ||
      res?.result ||
      res?.data?.items ||
      res?.data?.users ||
      res?.data?.list ||
      [];

    return Array.isArray(list)
      ? list.filter(Boolean)
      : [];
  };

  const updateStats = (list) => {
    setStats({
      total: list.length,
      admin: list.filter(
        (u) =>
          u?.role === "admin" ||
          u?.isAdmin === true
      ).length,
      blocked: list.filter(
        (u) =>
          u?.blocked ||
          u?.status === "blocked"
      ).length,
    });
  };

  const load = async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;

      setLoading(true);
      setError("");

      const res = await userApi.getList({
        keyword,
        limit: 100,
      });

      const list = normalizeUsers(res);

      setUsers(list);
      setOriginUsers(list);

      updateStats(list);
    } catch (e) {
      console.error(
        "ADMIN USER LOAD ERROR:",
        e
      );

      const message =
        e?.response?.status === 429
          ? "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
          : e?.response?.data
              ?.message ||
            e?.message ||
            "유저 목록 조회 실패";

      setError(message);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const changeRole = async (
    id,
    role
  ) => {
    if (!id) {
      alert(
        "유저 ID가 없습니다."
      );
      return;
    }

    try {
      setError("");

      if (
        userApi.updateRole
      ) {
        await userApi.updateRole(
          id,
          role
        );
      } else if (
        userApi.update
      ) {
        await userApi.update(id, {
          role,
        });
      } else {
        throw new Error(
          "ROLE_API_NOT_FOUND"
        );
      }

      alert("권한 변경 완료");

      await load();
    } catch (e) {
      console.error(
        "ADMIN USER ROLE ERROR:",
        e
      );

      const message =
        e?.response?.data
          ?.message ||
        e?.message ||
        "권한 변경 실패";

      setError(message);

      alert(message);
    }
  };

  const toggleBlock =
    async (user) => {
      const id =
        getUserId(user);

      if (!id) {
        alert(
          "유저 ID가 없습니다."
        );
        return;
      }

      try {
        setError("");

        const blocked =
          user?.blocked ||
          user?.status ===
            "blocked";

        if (userApi.block) {
          await userApi.block(
            id,
            !blocked
          );
        } else if (
          userApi.update
        ) {
          await userApi.update(
            id,
            {
              blocked:
                !blocked,
            }
          );
        } else {
          throw new Error(
            "BLOCK_API_NOT_FOUND"
          );
        }

        alert(
          blocked
            ? "차단 해제"
            : "차단 완료"
        );

        await load();
      } catch (e) {
        console.error(
          "ADMIN USER BLOCK ERROR:",
          e
        );

        const message =
          e?.response?.data
            ?.message ||
          e?.message ||
          "처리 실패";

        setError(message);

        alert(message);
      }
    };

  const remove = async (
    id
  ) => {
    if (!id) {
      alert(
        "유저 ID가 없습니다."
      );
      return;
    }

    if (
      !window.confirm(
        "유저를 삭제하시겠습니까?"
      )
    ) {
      return;
    }

    try {
      setError("");

      await userApi.remove(id);

      alert("삭제 완료");

      await load();
    } catch (e) {
      console.error(
        "ADMIN USER DELETE ERROR:",
        e
      );

      const message =
        e?.response?.data
          ?.message ||
        e?.message ||
        "삭제 실패";

      setError(message);

      alert(message);
    }
  };

  const filterRole = (
    role
  ) => {
    if (!role) {
      setUsers(originUsers);
      updateStats(
        originUsers
      );
      return;
    }

    const filtered =
      originUsers.filter(
        (u) =>
          (u?.role ||
            (u?.isAdmin
              ? "admin"
              : "user")) ===
          role
      );

    setUsers(filtered);
    updateStats(filtered);
  };

  return (
    <div style={container}>
      <div style={header}>
        <h2
          style={{
            margin: 0,
          }}
        >
          유저 관리
        </h2>

        <button
          style={
            secondaryBtn
          }
          onClick={() =>
            go(
              "/admin/dashboard"
            )
          }
        >
          대시보드
        </button>
      </div>

      <div style={statsBox}>
        <span>
          전체:{" "}
          {stats.total}
        </span>

        <span>
          관리자:{" "}
          {stats.admin}
        </span>

        <span>
          차단:{" "}
          {stats.blocked}
        </span>
      </div>

      <div style={filterBox}>
        <input
          placeholder="아이디 / 닉네임 검색"
          value={keyword}
          onChange={(e) =>
            setKeyword(
              e.target.value
            )
          }
          style={input}
        />

        <button
          style={
            primaryBtn
          }
          onClick={load}
        >
          검색
        </button>
      </div>

      <div
        style={
          quickFilterBox
        }
      >
        <button
          style={smallBtn}
          onClick={() =>
            filterRole("")
          }
        >
          전체
        </button>

        <button
          style={smallBtn}
          onClick={() =>
            filterRole(
              "admin"
            )
          }
        >
          관리자
        </button>

        <button
          style={smallBtn}
          onClick={() =>
            filterRole("user")
          }
        >
          유저
        </button>
      </div>

      {loading && (
        <Loading message="유저 목록 로딩중..." />
      )}

      {!loading &&
        error && (
          <ErrorMessage
            message={error}
            onRetry={load}
          />
        )}

      {!loading &&
        !error &&
        users.length ===
          0 && (
          <EmptyState message="유저 없음" />
        )}

      {!loading &&
        !error &&
        users.length >
          0 && (
          <div
            style={
              listWrap
            }
          >
            {users.map(
              (u) => {
                const id =
                  getUserId(
                    u
                  );

                const blocked =
                  u?.blocked ||
                  u?.status ===
                    "blocked";

                const role =
                  u?.role ||
                  (u?.isAdmin
                    ? "admin"
                    : "user");

                return (
                  <div
                    key={
                      id ||
                      u?.email ||
                      u?.nickname
                    }
                    style={
                      card
                    }
                  >
                    <div>
                      <strong>
                        {u?.id ||
                          u?.email ||
                          id ||
                          "-"}
                      </strong>

                      <p>
                        닉네임:{" "}
                        {u?.nickname ||
                          u?.name ||
                          "-"}
                      </p>

                      <p>
                        권한:{" "}
                        {role}
                      </p>

                      <p>
                        상태:{" "}
                        {blocked
                          ? "차단됨"
                          : "정상"}
                      </p>
                    </div>

                    <div
                      style={
                        actions
                      }
                    >
                      <button
                        style={
                          roleBtn
                        }
                        onClick={() =>
                          changeRole(
                            id,
                            role ===
                              "admin"
                              ? "user"
                              : "admin"
                          )
                        }
                      >
                        {role ===
                        "admin"
                          ? "유저로"
                          : "관리자로"}
                      </button>

                      <button
                        style={
                          warnBtn
                        }
                        onClick={() =>
                          toggleBlock(
                            u
                          )
                        }
                      >
                        {blocked
                          ? "차단 해제"
                          : "차단"}
                      </button>

                      <button
                        style={
                          dangerBtn
                        }
                        onClick={() =>
                          remove(
                            id
                          )
                        }
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
    </div>
  );
}

const container = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: 20,
  background: "#000",
  color: "#d4af37",
  minHeight: "100vh",
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 15,
};

const statsBox = {
  display: "flex",
  gap: 15,
  marginBottom: 15,
};

const filterBox = {
  display: "flex",
  gap: 10,
  marginBottom: 10,
};

const quickFilterBox = {
  display: "flex",
  gap: 8,
  marginBottom: 15,
};

const input = {
  flex: 1,
  padding: 10,
  border: "1px solid #333",
  borderRadius: 8,
  background: "#000",
  color: "#fff",
  outline: "none",
};

const primaryBtn = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 8,
  background: "#d4af37",
  color: "#000",
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryBtn = {
  padding: "10px 14px",
  border: "1px solid #444",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const listWrap = {
  display: "grid",
  gap: 10,
};

const card = {
  padding: 15,
  border: "1px solid #333",
  borderRadius: 10,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  background: "#111",
};

const actions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const smallBtn = {
  padding: "6px 10px",
  border: "1px solid #444",
  borderRadius: 6,
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const roleBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: 6,
  background: "#d4af37",
  color: "#000",
  cursor: "pointer",
};

const warnBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: 6,
  background: "#ffc107",
  color: "#000",
  cursor: "pointer",
};

const dangerBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: 6,
  background: "#dc3545",
  color: "#fff",
  cursor: "pointer",
};

export default AdminUserPage;