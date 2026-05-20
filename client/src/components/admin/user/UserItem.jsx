"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 USER ITEM (ULTRA FINAL COMPLETE)
 * ✔ 관리자 유저 단일 아이템
 * ✔ UserList와 100% 호환
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
}) {
  if (!user) return null;

  const id = user._id || user.id || "";
  const name = user.name || user.nickname || user.username || user.id || "사용자";
  const email = user.email || "-";
  const phone = user.phone || user.phoneNumber || user.mobile || "-";
  const role = user.role || user.userRole || user.type || "user";
  const status = user.status || (user.blocked ? "blocked" : "active");
  const isBlocked = status === "blocked" || user.blocked === true;

  const handleRoleChange = (e) => {
    const nextRole = e.target.value;
    if (!id) return;
    if (nextRole === role) return;
    onRoleChange && onRoleChange(id, nextRole);
  };

  const handleBlock = () => {
    if (!id) return;
    onBlock && onBlock(id, !isBlocked);
  };

  const handleDelete = () => {
    if (!id) return;
    onDelete && onDelete(id);
  };

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <strong style={styles.name}>{name}</strong>
          <div style={styles.meta}>{email}</div>
          <div style={styles.meta}>전화: {phone}</div>
        </div>

        <span style={statusBadge(status)}>
          {status}
        </span>
      </div>

      <div style={styles.info}>
        <div>
          <span style={styles.label}>권한</span>
          <select
            value={role}
            onChange={handleRoleChange}
            style={styles.select}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div>
          <span style={styles.label}>가입일</span>
          <span style={styles.value}>
            {formatDate(user.createdAt)}
          </span>
        </div>

        <div>
          <span style={styles.label}>최근 로그인</span>
          <span style={styles.value}>
            {formatDate(user.lastLoginAt)}
          </span>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          onClick={handleBlock}
          style={isBlocked ? styles.goldBtn : styles.blockBtn}
        >
          {isBlocked ? "차단 해제" : "차단"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          style={styles.dangerBtn}
        >
          삭제
        </button>
      </div>
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

    if (Number.isNaN(value.getTime())) {
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  name: {
    color: "#d4af37",
    fontSize: 18,
  },
  meta: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 4,
  },
  info: {
    display: "grid",
    gap: 8,
    marginTop: 14,
  },
  label: {
    display: "inline-block",
    minWidth: 90,
    color: "#d4af37",
    fontWeight: "bold",
    marginRight: 8,
  },
  value: {
    color: "#ddd",
  },
  select: {
    padding: 7,
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
  },
  actions: {
    marginTop: 14,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
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