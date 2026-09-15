"use strict";

import React, {
  useEffect,
  useState,
} from "react";

function normalizeShopLinkServiceType(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  if (
    text === "massage" ||
    text === "마사지" ||
    text.includes("massage") ||
    text.includes("마사지") ||
    text.includes("테라피") ||
    text.includes("스웨디시") ||
    text.includes("아로마")
  ) {
    return "massage";
  }

  if (
    text === "karaoke" ||
    text === "노래방" ||
    text === "가라오케" ||
    text.includes("karaoke") ||
    text.includes("노래방") ||
    text.includes("가라오케") ||
    text.includes("코인")
  ) {
    return "karaoke";
  }

  return text;
}

function getShopLinkId(shop = {}) {
  return String(
    shop?._id ||
      shop?.id ||
      shop?.shopId ||
      ""
  ).trim();
}

function getShopLinkName(shop = {}) {
  return String(
    shop?.nickname ||
      shop?.ownerNickname ||
      shop?.name ||
      shop?.shopName ||
      shop?.title ||
      "업체명 없음"
  ).trim();
}

function getShopLinkServiceType(shop = {}) {
  return normalizeShopLinkServiceType(
    shop?.serviceType ||
      shop?.category ||
      shop?.shopCategory ||
      shop?.businessType ||
      shop?.adminCategory ||
      ""
  );
}

function compareShopLinkOptions(a = {}, b = {}) {
  const rank = {
    massage: 0,
    karaoke: 1,
  };

  const aType = getShopLinkServiceType(a);
  const bType = getShopLinkServiceType(b);
  const aRank = rank[aType] ?? 2;
  const bRank = rank[bType] ?? 2;

  if (aRank !== bRank) {
    return aRank - bRank;
  }

  return getShopLinkName(a).localeCompare(
    getShopLinkName(b),
    "ko"
  );
}

/**
 * =====================================================
 * 🔥 USER ITEM (ULTRA FINAL COMPLETE)
 * ✔ 관리자 유저 단일 아이템
 * ✔ UserList와 기존 호환 유지
 * ✔ 닉네임 / 아이디 / 비밀번호 표시 영역 유지
 * ✔ 닉네임 변경 입력 / 버튼 추가
 * ✔ 아이디 변경 입력 / 버튼 추가
 * ✔ 비밀번호 재설정 입력 / 버튼 추가
 * ✔ 권한 변경
 * ✔ 차단 / 해제
 * ✔ 삭제
 * ✔ null / undefined 안전 처리
 * ✔ 블랙 + 골드 UI
 * =====================================================
 */

function UserItem({
  user,
  onRoleChange,
  onBlock,
  onDelete,
  onIdChange,
  onPasswordReset,
  onNicknameChange,
  onServiceTypeChange,
  onJobGradeChange,
  onJobPostingEnabledChange,
  linkedShop,
  availableShops = [],
  onShopLink,
  onShopUnlink,
}) {
  if (!user) return null;

  const id = user._id || user.id || "";
  const loginId = user.id || "-";

  const name =
    user.name ||
    user.nickname ||
    user.username ||
    user.id ||
    "사용자";

  const email = user.email || "-";

  const phone =
    user.phone ||
    user.phoneNumber ||
    user.mobile ||
    "-";

  const role =
    user.role ||
    user.userRole ||
    user.type ||
    "user";

  const serviceType =
    normalizeShopLinkServiceType(
      user.serviceType ||
        (role === "shop" ? "massage" : "")
    );

  const jobGrade =
    String(user.jobGrade || "normal")
      .trim()
      .toLowerCase() === "premium"
      ? "premium"
      : "normal";

  const jobPostingEnabled =
    user.jobPostingEnabled === true;

  const linkedShopId =
    String(
      linkedShop?._id ||
        linkedShop?.id ||
        ""
    ).trim();

  const linkedShopName =
    linkedShop?.nickname ||
    linkedShop?.ownerNickname ||
    linkedShop?.name ||
    linkedShop?.shopName ||
    linkedShop?.title ||
    "";

  const linkedShopAddress =
    linkedShop?.address ||
    linkedShop?.roadAddress ||
    "";

  const selectableShops = Array.isArray(availableShops)
    ? Array.from(
        availableShops.reduce((map, shop) => {
          const optionId = getShopLinkId(shop);

          if (optionId && !map.has(optionId)) {
            map.set(optionId, shop);
          }

          return map;
        }, new Map()).values()
      ).sort(compareShopLinkOptions)
    : [];

  const hasLinkedShopInOptions =
    linkedShopId &&
    selectableShops.some((shop) =>
      String(shop?._id || shop?.id || "") ===
      linkedShopId
    );

  const shopOptions =
    linkedShopId &&
    linkedShop &&
    !hasLinkedShopInOptions
      ? [linkedShop, ...selectableShops]
      : selectableShops;

  const massageShopOptions = shopOptions.filter(
    (shop) =>
      getShopLinkServiceType(shop) === "massage"
  );

  const karaokeShopOptions = shopOptions.filter(
    (shop) =>
      getShopLinkServiceType(shop) === "karaoke"
  );

  const otherShopOptions = shopOptions.filter((shop) => {
    const shopType = getShopLinkServiceType(shop);
    return !["massage", "karaoke"].includes(shopType);
  });

  const renderShopOption = (shop, index) => {
    const optionId = getShopLinkId(shop);
    const optionName = getShopLinkName(shop);
    const optionAddress = String(
      shop?.address ||
        shop?.roadAddress ||
        ""
    ).trim();

    if (!optionId) return null;

    return (
      <option
        key={`${optionId}-${index}`}
        value={optionId}
      >
        {optionName}
        {optionAddress
          ? ` - ${optionAddress}`
          : ""}
      </option>
    );
  };

  const status =
    user.status ||
    (user.blocked
      ? "blocked"
      : "active");

  const isBlocked =
    status === "blocked" ||
    user.blocked === true;

  const [newNickname, setNewNickname] =
    useState(user.nickname || user.name || "");

  const [newLoginId, setNewLoginId] =
    useState(user.id || "");

  const [newPassword, setNewPassword] =
    useState("");

  const [nicknameSaving, setNicknameSaving] =
    useState(false);

  const [idSaving, setIdSaving] =
    useState(false);

  const [
    passwordSaving,
    setPasswordSaving,
  ] = useState(false);

  const [
    serviceTypeSaving,
    setServiceTypeSaving,
  ] = useState(false);

  const [
    jobGradeSaving,
    setJobGradeSaving,
  ] = useState(false);

  const [
    jobPostingSaving,
    setJobPostingSaving,
  ] = useState(false);

  const [
    selectedShopId,
    setSelectedShopId,
  ] = useState(linkedShopId);

  const [
    shopLinkSaving,
    setShopLinkSaving,
  ] = useState(false);

  const [actionMessage, setActionMessage] =
    useState("");

  useEffect(() => {
    setNewNickname(
      user.nickname ||
        user.name ||
        ""
    );
  }, [user.nickname, user.name]);

  useEffect(() => {
    setNewLoginId(user.id || "");
  }, [user.id]);

  useEffect(() => {
    setSelectedShopId(linkedShopId);
  }, [linkedShopId]);

  const handleRoleChange = (e) => {
    const nextRole = e.target.value;

    if (!id) return;
    if (nextRole === role) return;

    onRoleChange &&
      onRoleChange(id, nextRole);
  };

  const handleBlock = () => {
    if (!id) return;

    onBlock &&
      onBlock(id, !isBlocked);
  };

  const handleDelete = () => {
    if (!id) return;

    onDelete &&
      onDelete(id);
  };

  const handleServiceTypeChange =
    async (nextServiceType) => {
      const safeNextServiceType =
        String(nextServiceType || "")
          .trim()
          .toLowerCase();

      if (!id) return;

      if (
        role !== "shop" ||
        ![
          "massage",
          "karaoke",
        ].includes(
          safeNextServiceType
        )
      ) {
        return;
      }

      if (
        safeNextServiceType ===
        serviceType
      ) {
        setActionMessage(
          safeNextServiceType ===
            "karaoke"
            ? "현재 가라오케 업체로 설정되어 있습니다."
            : "현재 마사지 업체로 설정되어 있습니다."
        );
        return;
      }

      if (
        typeof onServiceTypeChange !==
        "function"
      ) {
        setActionMessage(
          "업체 종류 변경 기능이 연결되지 않았습니다."
        );
        return;
      }

      try {
        setServiceTypeSaving(true);
        setActionMessage("");

        await onServiceTypeChange(
          id,
          safeNextServiceType
        );

        setActionMessage(
          safeNextServiceType ===
            "karaoke"
            ? "가라오케 업체로 변경되었습니다."
            : "마사지 업체로 변경되었습니다."
        );
      } catch (error) {
        setActionMessage(
          error?.response?.data?.message ||
            error?.message ||
            "업체 종류 변경 실패"
        );
      } finally {
        setServiceTypeSaving(false);
      }
    };

  const handleJobGradeChange = async (nextJobGrade) => {
    const safeNextJobGrade =
      String(nextJobGrade || "")
        .trim()
        .toLowerCase();

    if (!id || role !== "shop") return;

    if (!['premium', 'normal'].includes(safeNextJobGrade)) {
      setActionMessage("올바르지 않은 채용정보 등급입니다.");
      return;
    }

    if (safeNextJobGrade === jobGrade) {
      setActionMessage(
        safeNextJobGrade === "premium"
          ? "현재 Premium 채용정보 등급입니다."
          : "현재 normal 채용정보 등급입니다."
      );
      return;
    }

    if (typeof onJobGradeChange !== "function") {
      setActionMessage("채용정보 등급 변경 기능이 연결되지 않았습니다.");
      return;
    }

    try {
      setJobGradeSaving(true);
      setActionMessage("");

      await onJobGradeChange(id, safeNextJobGrade);

      setActionMessage(
        safeNextJobGrade === "premium"
          ? "Premium 채용정보 등급으로 변경되었습니다."
          : "normal 채용정보 등급으로 변경되었습니다."
      );
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          error?.message ||
          "채용정보 등급 변경 실패"
      );
    } finally {
      setJobGradeSaving(false);
    }
  };

  const handleJobPostingEnabledChange = async (nextValue) => {
    const nextEnabled = String(nextValue || "").toLowerCase() === "on";

    if (!id || role !== "shop") return;

    if (nextEnabled === jobPostingEnabled) {
      setActionMessage(
        nextEnabled
          ? "현재 채용정보 사용이 ON 상태입니다."
          : "현재 채용정보 사용이 OFF 상태입니다."
      );
      return;
    }

    if (typeof onJobPostingEnabledChange !== "function") {
      setActionMessage("채용정보 사용 설정 기능이 연결되지 않았습니다.");
      return;
    }

    try {
      setJobPostingSaving(true);
      setActionMessage("");

      await onJobPostingEnabledChange(id, nextEnabled);

      setActionMessage(
        nextEnabled
          ? "채용정보 글쓰기 사용이 ON으로 변경되었습니다."
          : "채용정보 글쓰기 사용이 OFF로 변경되었습니다."
      );
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          error?.message ||
          "채용정보 사용 설정 변경 실패"
      );
    } finally {
      setJobPostingSaving(false);
    }
  };

  const handleShopLink = async () => {
    const nextShopId =
      String(selectedShopId || "").trim();

    if (!id || role !== "shop") return;

    if (!nextShopId) {
      setActionMessage(
        "연결할 업체를 선택하세요."
      );
      return;
    }

    if (
      linkedShopId &&
      nextShopId === linkedShopId
    ) {
      setActionMessage(
        "현재 선택한 업체가 이미 연결되어 있습니다."
      );
      return;
    }

    if (typeof onShopLink !== "function") {
      setActionMessage(
        "업체 연결 기능이 연결되지 않았습니다."
      );
      return;
    }

    try {
      setShopLinkSaving(true);
      setActionMessage("");

      await onShopLink(
        id,
        nextShopId
      );

      setActionMessage(
        "업체가 연결되었습니다."
      );
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          error?.message ||
          "업체 연결 실패"
      );
    } finally {
      setShopLinkSaving(false);
    }
  };

  const handleShopUnlink = async () => {
    if (!id || role !== "shop") return;

    if (!linkedShopId) {
      setActionMessage(
        "현재 연결된 업체가 없습니다."
      );
      return;
    }

    if (typeof onShopUnlink !== "function") {
      setActionMessage(
        "업체 연결 해제 기능이 연결되지 않았습니다."
      );
      return;
    }

    try {
      setShopLinkSaving(true);
      setActionMessage("");

      await onShopUnlink(id);

      setSelectedShopId("");

      setActionMessage(
        "업체 연결이 해제되었습니다."
      );
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          error?.message ||
          "업체 연결 해제 실패"
      );
    } finally {
      setShopLinkSaving(false);
    }
  };

  const handleNicknameChange = async () => {
    const nextNickname =
      String(newNickname || "").trim();

    if (!id) return;

    if (!nextNickname) {
      setActionMessage(
        "새 닉네임을 입력하세요."
      );
      return;
    }

    const currentNickname =
      String(
        user.nickname ||
          user.name ||
          ""
      ).trim();

    if (nextNickname === currentNickname) {
      setActionMessage(
        "현재 닉네임과 같습니다."
      );
      return;
    }

    if (
      typeof onNicknameChange !==
      "function"
    ) {
      setActionMessage(
        "닉네임 변경 기능이 연결되지 않았습니다."
      );
      return;
    }

    try {
      setNicknameSaving(true);
      setActionMessage("");

      await onNicknameChange(
        id,
        nextNickname
      );

      setActionMessage(
        "닉네임이 변경되었습니다."
      );
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          error?.message ||
          "닉네임 변경 실패"
      );
    } finally {
      setNicknameSaving(false);
    }
  };

  const handleIdChange = async () => {
    const nextId =
      String(newLoginId || "").trim();

    if (!id) return;

    if (!nextId) {
      setActionMessage(
        "새 아이디를 입력하세요."
      );
      return;
    }

    if (nextId === user.id) {
      setActionMessage(
        "현재 아이디와 같습니다."
      );
      return;
    }

    if (
      typeof onIdChange !== "function"
    ) {
      setActionMessage(
        "아이디 변경 기능이 연결되지 않았습니다."
      );
      return;
    }

    try {
      setIdSaving(true);
      setActionMessage("");

      await onIdChange(id, nextId);

      setActionMessage(
        "아이디가 변경되었습니다."
      );
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          error?.message ||
          "아이디 변경 실패"
      );
    } finally {
      setIdSaving(false);
    }
  };

  const handlePasswordReset =
    async () => {
      const nextPassword =
        String(newPassword || "");

      if (!id) return;

      if (!nextPassword) {
        setActionMessage(
          "새 비밀번호를 입력하세요."
        );
        return;
      }

      if (nextPassword.length < 4) {
        setActionMessage(
          "비밀번호는 4자 이상 입력하세요."
        );
        return;
      }

      if (
        typeof onPasswordReset !==
        "function"
      ) {
        setActionMessage(
          "비밀번호 재설정 기능이 연결되지 않았습니다."
        );
        return;
      }

      try {
        setPasswordSaving(true);
        setActionMessage("");

        await onPasswordReset(
          id,
          nextPassword
        );

        setNewPassword("");

        setActionMessage(
          "비밀번호가 재설정되었습니다."
        );
      } catch (error) {
        setActionMessage(
          error?.response?.data?.message ||
            error?.message ||
            "비밀번호 재설정 실패"
        );
      } finally {
        setPasswordSaving(false);
      }
    };

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <div style={styles.name}>
            {name}
          </div>
        </div>

        <span
          style={statusBadge(status)}
        >
          {status}
        </span>
      </div>

      <div style={styles.info}>
        <div>
          <span style={styles.label}>
            닉네임
          </span>

          <span style={styles.value}>
            {name}
          </span>
        </div>

        <div style={styles.editRow}>
          <span style={styles.label}>
            닉네임 변경
          </span>

          <div
            style={styles.editControls}
          >
            <input
              type="text"
              value={newNickname}
              onChange={(e) =>
                setNewNickname(
                  e.target.value
                )
              }
              placeholder="새 닉네임"
              style={styles.input}
              disabled={nicknameSaving}
            />

            <button
              type="button"
              onClick={handleNicknameChange}
              style={styles.goldBtn}
              disabled={nicknameSaving}
            >
              {nicknameSaving
                ? "변경 중..."
                : "닉네임 변경"}
            </button>
          </div>
        </div>

        <div>
          <span style={styles.label}>
            아이디
          </span>

          <span style={styles.value}>
            {loginId}
          </span>
        </div>

        <div style={styles.editRow}>
          <span style={styles.label}>
            아이디 변경
          </span>

          <div
            style={styles.editControls}
          >
            <input
              type="text"
              value={newLoginId}
              onChange={(e) =>
                setNewLoginId(
                  e.target.value
                )
              }
              placeholder="새 아이디"
              style={styles.input}
              disabled={idSaving}
            />

            <button
              type="button"
              onClick={handleIdChange}
              style={styles.goldBtn}
              disabled={idSaving}
            >
              {idSaving
                ? "변경 중..."
                : "아이디 변경"}
            </button>
          </div>
        </div>

        <div>
          <span style={styles.label}>
            비밀번호
          </span>

          <span
            style={
              styles.passwordValue
            }
          >
            ••••••••
          </span>
        </div>

        <div style={styles.editRow}>
          <span style={styles.label}>
            비밀번호 재설정
          </span>

          <div
            style={styles.editControls}
          >
            <input
              type="password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(
                  e.target.value
                )
              }
              placeholder="새 비밀번호"
              style={styles.input}
              disabled={
                passwordSaving
              }
            />

            <button
              type="button"
              onClick={
                handlePasswordReset
              }
              style={styles.goldBtn}
              disabled={
                passwordSaving
              }
            >
              {passwordSaving
                ? "재설정 중..."
                : "비밀번호 재설정"}
            </button>
          </div>
        </div>

        <div>
          <span style={styles.label}>
            이메일
          </span>

          <span style={styles.value}>
            {email}
          </span>
        </div>

        <div>
          <span style={styles.label}>
            전화
          </span>

          <span style={styles.value}>
            {phone}
          </span>
        </div>

        <div>
          <span style={styles.label}>
            권한
          </span>

          <select
            value={role}
            onChange={handleRoleChange}
            style={styles.select}
          >
            <option value="user">
              유저
            </option>

            <option value="shop">
              업체
            </option>

            <option value="admin">
              관리자
            </option>
          </select>
        </div>

        <div>
          <span style={styles.label}>
            가입일
          </span>

          <span style={styles.value}>
            {formatDate(
              user.createdAt
            )}
          </span>
        </div>

        <div>
          <span style={styles.label}>
            최근 로그인
          </span>

          <span style={styles.value}>
            {formatDate(
              user.lastLoginAt
            )}
          </span>
        </div>
      </div>

      {actionMessage ? (
        <div
          style={styles.actionMessage}
        >
          {actionMessage}
        </div>
      ) : null}

      <div style={styles.actions}>
        <button
          type="button"
          onClick={handleBlock}
          style={
            isBlocked
              ? styles.goldBtn
              : styles.blockBtn
          }
        >
          {isBlocked
            ? "차단 해제"
            : "차단"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          style={styles.dangerBtn}
        >
          삭제
        </button>

        {role === "shop" ? (
          <>
            <label style={styles.jobPermissionControl}>
              <span style={styles.jobPermissionLabel}>등급:</span>
              <select
                value={jobGrade}
                onChange={(e) => handleJobGradeChange(e.target.value)}
                disabled={jobGradeSaving}
                style={styles.jobPermissionSelect}
              >
                <option value="premium">Premium</option>
                <option value="normal">normal</option>
              </select>
            </label>

            <label style={styles.jobPermissionControl}>
              <span style={styles.jobPermissionLabel}>채용정보:</span>
              <select
                value={jobPostingEnabled ? "on" : "off"}
                onChange={(e) =>
                  handleJobPostingEnabledChange(e.target.value)
                }
                disabled={jobPostingSaving}
                style={styles.jobPermissionSelect}
              >
                <option value="on">ON</option>
                <option value="off">OFF</option>
              </select>
            </label>
          </>
        ) : null}
      </div>

      {role === "shop" ? (
        <div
          style={
            styles.serviceTypeWrap
          }
        >
          <div
            style={
              styles.serviceTypeLabel
            }
          >
            업체 종류 목록
          </div>

          <div
            style={
              styles.serviceTypeActions
            }
          >
            <select
              value={serviceType}
              onChange={(e) =>
                handleServiceTypeChange(
                  e.target.value
                )
              }
              disabled={
                serviceTypeSaving
              }
              style={
                styles.serviceTypeSelect
              }
            >
              <option value="massage">
                마사지
              </option>

              <option value="karaoke">
                가라오케
              </option>
            </select>
          </div>
        </div>
      ) : null}

    </div>
  );
}

/* =========================
🔥 UTIL
========================= */
function formatDate(date) {
  if (!date) return "-";

  try {
    const value = new Date(date);

    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      return "-";
    }

    return value.toLocaleString();
  } catch {
    return "-";
  }
}

function statusBadge(status) {
  const base = {
    padding: "4px 9px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    border: "1px solid #444",
    whiteSpace: "nowrap",
  };

  if (status === "active") {
    return {
      ...base,
      background: "#111",
      color: "#d4af37",
    };
  }

  if (status === "blocked") {
    return {
      ...base,
      background: "#700",
      color: "#fff",
    };
  }

  if (status === "deleted") {
    return {
      ...base,
      background: "#333",
      color: "#aaa",
    };
  }

  return base;
}

/* =========================
🔥 STYLE
========================= */
const styles = {
  card: {
    padding: 16,
    background: "#111",
    border: "1px solid #333",
    borderRadius: 12,
    color: "#fff",
  },

  top: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  name: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "bold",
  },

  info: {
    display: "grid",
    gap: 8,
    marginTop: 14,
  },

  label: {
    display: "inline-block",
    minWidth: 110,
    color: "#d4af37",
    fontWeight: "bold",
    marginRight: 8,
  },

  value: {
    color: "#ddd",
  },

  passwordValue: {
    color: "#aaa",
    letterSpacing: 2,
  },

  editRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  editControls: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },

  input: {
    minWidth: 180,
    padding: "8px 10px",
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
  },

  select: {
    padding: 7,
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
  },

  actionMessage: {
    marginTop: 12,
    color: "#d4af37",
    fontSize: 13,
  },

  actions: {
    marginTop: 14,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  jobPermissionControl: {
    minHeight: 36,
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "0 8px",
    border: "1px solid #333",
    borderRadius: 8,
    background: "#0b0b0b",
  },

  jobPermissionLabel: {
    color: "#d4af37",
    fontSize: 13,
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  jobPermissionSelect: {
    minWidth: 96,
    padding: "7px 9px",
    background: "#000",
    color: "#fff",
    border: "1px solid #d4af37",
    borderRadius: 7,
    cursor: "pointer",
    fontWeight: "bold",
    outline: "none",
  },

  serviceTypeWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #333",
  },

  serviceTypeLabel: {
    marginBottom: 8,
    color: "#d4af37",
    fontSize: 13,
    fontWeight: "bold",
  },

  serviceTypeActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  serviceTypeSelect: {
    minWidth: 140,
    padding: "9px 12px",
    background: "#000",
    color: "#fff",
    border: "1px solid #d4af37",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
    outline: "none",
  },

  shopLinkWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #333",
  },

  shopLinkLabel: {
    marginBottom: 8,
    color: "#d4af37",
    fontSize: 13,
    fontWeight: "bold",
  },

  shopLinkCurrent: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 10,
  },

  shopLinkName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },

  shopLinkAddress: {
    color: "#aaa",
    fontSize: 12,
    lineHeight: 1.4,
  },

  shopLinkEmpty: {
    color: "#888",
    fontSize: 13,
  },

  shopLinkActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },

  shopLinkSelect: {
    minWidth: 280,
    maxWidth: "100%",
    padding: "9px 12px",
    background: "#000",
    color: "#fff",
    border: "1px solid #d4af37",
    borderRadius: 8,
    cursor: "pointer",
    outline: "none",
  },

  shopUnlinkBtn: {
    padding: "8px 12px",
    background: "#000",
    color: "#ff8080",
    border: "1px solid #700",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },

  blockBtn: {
    padding: "8px 12px",
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
    cursor: "pointer",
  },

  goldBtn: {
    padding: "8px 12px",
    background: "#d4af37",
    color: "#000",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },

  dangerBtn: {
    padding: "8px 12px",
    background: "#900",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default UserItem;
