"use strict";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import userApi from "../../../services/user.api";
import UserItem from "./UserItem";

import Loading from "../../common/Loading";
import ErrorMessage from "../../common/ErrorMessage";
import EmptyState from "../../common/EmptyState";

function UserList({
  roleFilter = "",
  serviceFilter = "",
}) {
  const mountedRef = useRef(false);
  const fetchedRef = useRef(false);
  const fetchingRef = useRef(false);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [shopLinks, setShopLinks] = useState({
    links: [],
    shops: [],
  });

  const normalizeShopLinks = (res = {}) => {
    const source =
      res?.data &&
      !Array.isArray(res.data) &&
      typeof res.data === "object"
        ? res.data
        : res;

    if (Array.isArray(source)) {
      return {
        links: source,
        shops: source,
      };
    }

    const links =
      (Array.isArray(source?.links) && source.links) ||
      (Array.isArray(source?.items) && source.items) ||
      (Array.isArray(source?.list) && source.list) ||
      (Array.isArray(source?.data) && source.data) ||
      [];

    const shops =
      (Array.isArray(source?.shops) && source.shops) ||
      [];

    return {
      links,
      shops: shops.length > 0 ? shops : links,
    };
  };

  const refreshShopLinks = async () => {
    try {
      const res = await userApi.getShopLinks();

      if (!mountedRef.current) return;

      setShopLinks(
        normalizeShopLinks(res)
      );
    } catch (e) {
      console.warn(
        "SHOP_LINK_LIST_LOAD_ERROR:",
        e?.response?.data?.message ||
          e?.message ||
          e
      );

      if (!mountedRef.current) return;

      setShopLinks({
        links: [],
        shops: [],
      });
    }
  };

  const fetchUsers = async () => {
    if (fetchingRef.current) return;
    if (fetchedRef.current) return;

    try {
      fetchingRef.current = true;
      fetchedRef.current = true;

      if (mountedRef.current) {
        setLoading(true);
        setError("");
      }

      const res = await userApi.getList();

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

      if (!Array.isArray(list)) {
        list = [];
      }

      if (!mountedRef.current) return;

      setUsers(list);
    } catch (e) {
      console.error("USER_LIST_LOAD_ERROR:", e);
      fetchedRef.current = false;

      if (!mountedRef.current) return;

      setError(
        e?.response?.data?.message ||
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
    refreshShopLinks();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleRole = async (id, role) => {
    try {
      await userApi.updateRole(id, role);

      setUsers((prev) =>
        prev.map((u) =>
          (u?._id || u?.id) === id
            ? {
                ...u,
                role,
              }
            : u
        )
      );
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "권한 변경 실패"
      );
      throw e;
    }
  };

  const handleBlock = async (id, blocked) => {
    try {
      await userApi.block(id, blocked);

      setUsers((prev) =>
        prev.map((u) =>
          (u?._id || u?.id) === id
            ? {
                ...u,
                status: blocked ? "blocked" : "active",
                blocked,
              }
            : u
        )
      );
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "차단 실패"
      );
      throw e;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await userApi.remove(id);

      setUsers((prev) =>
        prev.filter((u) => (u?._id || u?.id) !== id)
      );
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "삭제 실패"
      );
      throw e;
    }
  };

  const handleServiceTypeChange = async (
    id,
    nextServiceType
  ) => {
    try {
      setError("");

      const safeServiceType =
        String(nextServiceType || "")
          .trim()
          .toLowerCase();

      if (
        ![
          "massage",
          "karaoke",
        ].includes(safeServiceType)
      ) {
        throw new Error(
          "올바르지 않은 업체 종류입니다."
        );
      }

      const res =
        await userApi.updateServiceType(
          id,
          safeServiceType
        );

      const updatedUser =
        res?.data?.user ||
        res?.user ||
        null;

      setUsers((prev) =>
        prev.map((u) => {
          const currentId =
            u?._id || u?.id;

          if (currentId !== id) {
            return u;
          }

          return updatedUser
            ? {
                ...u,
                ...updatedUser,
                serviceType:
                  updatedUser?.serviceType ||
                  safeServiceType,
              }
            : {
                ...u,
                serviceType:
                  safeServiceType,
              };
        })
      );

      return res;
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "업체 종류 변경 실패"
      );
      throw e;
    }
  };

  const handleJobGradeChange = async (id, nextJobGrade) => {
    try {
      setError("");

      const safeJobGrade = String(nextJobGrade || "")
        .trim()
        .toLowerCase();

      if (!["premium", "normal"].includes(safeJobGrade)) {
        throw new Error("올바르지 않은 채용정보 등급입니다.");
      }

      const res = await userApi.updateJobGrade(id, safeJobGrade);
      const updatedUser = res?.data?.user || res?.user || null;

      setUsers((prev) =>
        prev.map((u) => {
          const currentId = u?._id || u?.id;
          if (currentId !== id) return u;

          return updatedUser
            ? { ...u, ...updatedUser, jobGrade: updatedUser?.jobGrade || safeJobGrade }
            : { ...u, jobGrade: safeJobGrade };
        })
      );

      return res;
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "채용정보 등급 변경 실패"
      );
      throw e;
    }
  };

  const handleJobPostingEnabledChange = async (id, nextEnabled) => {
    try {
      setError("");

      const safeEnabled = nextEnabled === true;
      const res = await userApi.updateJobPostingEnabled(id, safeEnabled);
      const updatedUser = res?.data?.user || res?.user || null;

      setUsers((prev) =>
        prev.map((u) => {
          const currentId = u?._id || u?.id;
          if (currentId !== id) return u;

          return updatedUser
            ? {
                ...u,
                ...updatedUser,
                jobPostingEnabled: updatedUser?.jobPostingEnabled === true,
              }
            : { ...u, jobPostingEnabled: safeEnabled };
        })
      );

      return res;
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "채용정보 사용 설정 변경 실패"
      );
      throw e;
    }
  };

  const handleNicknameChange = async (id, nextNickname) => {
    try {
      setError("");

      const res = await userApi.updateNickname(
        id,
        nextNickname
      );

      const updatedUser =
        res?.data?.user ||
        res?.user ||
        null;

      setUsers((prev) =>
        prev.map((u) => {
          const currentId = u?._id || u?.id;

          if (currentId !== id) {
            return u;
          }

          return updatedUser
            ? {
                ...u,
                ...updatedUser,
              }
            : {
                ...u,
                nickname: nextNickname,
              };
        })
      );

      return res;
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "닉네임 변경 실패"
      );
      throw e;
    }
  };

  const handleIdChange = async (id, nextId) => {
    try {
      setError("");

      const res = await userApi.updateId(
        id,
        nextId
      );

      const updatedUser =
        res?.data?.user ||
        res?.user ||
        null;

      setUsers((prev) =>
        prev.map((u) => {
          const currentId = u?._id || u?.id;

          if (currentId !== id) {
            return u;
          }

          return updatedUser
            ? {
                ...u,
                ...updatedUser,
              }
            : {
                ...u,
                id: nextId,
              };
        })
      );

      return res;
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "아이디 변경 실패"
      );
      throw e;
    }
  };

  const handlePasswordReset = async (
    id,
    nextPassword
  ) => {
    try {
      setError("");

      const res = await userApi.resetPassword(
        id,
        nextPassword
      );

      return res;
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "비밀번호 재설정 실패"
      );
      throw e;
    }
  };

  const handleShopLink = async (userId, shopId) => {
    try {
      setError("");

      const res =
        await userApi.linkShopToUser(
          userId,
          shopId
        );

      await refreshShopLinks();

      return res;
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "업체 연결 실패"
      );
      throw e;
    }
  };

  const handleShopUnlink = async (userId) => {
    try {
      setError("");

      const res =
        await userApi.unlinkShopFromUser(
          userId
        );

      await refreshShopLinks();

      return res;
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "업체 연결 해제 실패"
      );
      throw e;
    }
  };

  const getLinkedShopForUser = (user = {}) => {
    const userId = String(
      user?._id ||
        user?.id ||
        ""
    );

    if (!userId) return null;

    return (
      shopLinks.links.find((shop) => {
        const ownerId = String(
          shop?.ownerId ||
            shop?.owner?._id ||
            shop?.owner?.id ||
            shop?.owner ||
            ""
        );

        return ownerId === userId;
      }) || null
    );
  };

  const normalizedSearchKeyword = String(
    searchKeyword || ""
  )
    .trim()
    .toLowerCase();

  const normalizedRoleFilter = String(
    roleFilter || ""
  )
    .trim()
    .toLowerCase();

  const normalizedServiceFilter = String(
    serviceFilter || ""
  )
    .trim()
    .toLowerCase();

  const roleFilteredUsers = roleFilter
    ? users.filter((user) => {
        const currentRole = String(
          user?.role ||
            user?.userRole ||
            user?.type ||
            "user"
        )
          .trim()
          .toLowerCase();

        return currentRole === normalizedRoleFilter;
      })
    : users;

  const serviceFilteredUsers = roleFilteredUsers.filter((user) => {
    const currentRole = String(
      user?.role ||
        user?.userRole ||
        user?.type ||
        "user"
    )
      .trim()
      .toLowerCase();

    const currentServiceType = String(
      user?.serviceType ||
        (currentRole === "shop"
          ? "massage"
          : "general")
    )
      .trim()
      .toLowerCase();

    if (normalizedServiceFilter) {
      return currentServiceType === normalizedServiceFilter;
    }

    if (normalizedRoleFilter === "user") {
      return currentServiceType !== "karaoke";
    }

    return true;
  });

  const filteredUsers = normalizedSearchKeyword
    ? serviceFilteredUsers.filter((user) => {
        const nickname =
          user?.nickname ||
          user?.name ||
          user?.username ||
          "";

        const loginId = user?.id || "";

        return (
          String(nickname)
            .toLowerCase()
            .includes(normalizedSearchKeyword) ||
          String(loginId)
            .toLowerCase()
            .includes(normalizedSearchKeyword)
        );
      })
    : serviceFilteredUsers;

  const emptyMessage =
    roleFilter === "shop"
      ? normalizedServiceFilter === "karaoke"
        ? "가라오케 업체가 없습니다."
        : normalizedServiceFilter === "massage"
          ? "마사지 업체가 없습니다."
          : "업체가 없습니다."
      : roleFilter === "admin"
        ? "관리자가 없습니다."
        : normalizedServiceFilter === "karaoke"
          ? "노래방 회원이 없습니다."
          : "유저가 없습니다.";

  return (
    <div style={wrap}>
      <div style={searchWrap}>
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) =>
            setSearchKeyword(e.target.value)
          }
          placeholder="닉네임 또는 아이디 검색"
          style={searchInput}
        />

        {searchKeyword ? (
          <button
            type="button"
            onClick={() => setSearchKeyword("")}
            style={searchResetButton}
          >
            초기화
          </button>
        ) : null}
      </div>

      {error && (
        <ErrorMessage message={error} />
      )}

      {loading && (
        <Loading message="불러오는 중..." />
      )}

      {!loading &&
        !error &&
        serviceFilteredUsers.length === 0 && (
          <EmptyState message={emptyMessage} />
        )}

      {!loading &&
        !error &&
        serviceFilteredUsers.length > 0 &&
        filteredUsers.length === 0 && (
          <EmptyState message="검색 결과가 없습니다." />
        )}

      {!loading &&
        !error &&
        filteredUsers.length > 0 && (
          <div style={list}>
            {filteredUsers.map((user, index) => (
              <UserItem
                key={
                  user?._id ||
                  user?.id ||
                  index
                }
                user={user}
                onRoleChange={handleRole}
                onBlock={handleBlock}
                onDelete={handleDelete}
                onServiceTypeChange={
                  handleServiceTypeChange
                }
                onNicknameChange={
                  handleNicknameChange
                }
                onIdChange={handleIdChange}
                onPasswordReset={
                  handlePasswordReset
                }
                onJobGradeChange={
                  handleJobGradeChange
                }
                onJobPostingEnabledChange={
                  handleJobPostingEnabledChange
                }
                linkedShop={
                  getLinkedShopForUser(user)
                }
                availableShops={
                  shopLinks.shops
                }
                onShopLink={
                  handleShopLink
                }
                onShopUnlink={
                  handleShopUnlink
                }
              />
            ))}
          </div>
        )}
    </div>
  );
}

const wrap = {};

const searchWrap = {
  display: "flex",
  gap: 8,
  marginBottom: 14,
  alignItems: "center",
};

const searchInput = {
  width: "100%",
  maxWidth: 420,
  padding: "10px 12px",
  background: "#000",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: 8,
  boxSizing: "border-box",
  outline: "none",
};

const searchResetButton = {
  padding: "10px 14px",
  background: "#d4af37",
  color: "#000",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const list = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export default UserList;
