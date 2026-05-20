"use strict";

import React, { useEffect, useState } from "react";
import userApi from "../services/user.api";

/* 🔥 추가 */
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 USER PROFILE PAGE (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ Loading / Error / EmptyState 최소 추가
 * ✔ 기존 흐름 유지
 * ✔ 비밀번호 영역 안전 렌더링 추가 (최소 수정)
 * =====================================================
 */

function UserProfilePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUser = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await userApi.getMe();
      const data = res?.data || res;

      setUser(data || null);
      setForm({
        name: data?.name || "",
        nickname: data?.nickname || "",
        email: data?.email || "",
      });

    } catch (e) {
      setError(e.message || "유저 정보 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await userApi.update(form);
      setSuccess("프로필 수정 완료");

      await loadUser();

    } catch (e) {
      setError(e.message || "수정 실패");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError("비밀번호 입력 필요");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await userApi.changePassword(passwordForm);

      setSuccess("비밀번호 변경 완료");
      setPasswordForm({ currentPassword: "", newPassword: "" });

    } catch (e) {
      setError(e.message || "비밀번호 변경 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrap}>
      <h1 style={title}>내 정보</h1>

      {loading && <Loading message="유저 정보 불러오는 중..." />}

      {error && (
        <ErrorMessage
          message={error}
          onRetry={loadUser}
        />
      )}

      {success && <div style={successBox}>{success}</div>}

      {!loading && !error && !user && (
        <EmptyState message="유저 정보를 찾을 수 없습니다." />
      )}

      {!loading && !error && user && (
        <div style={card}>
          <Input
            label="이름"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <Input
            label="닉네임"
            value={form.nickname}
            onChange={(v) => setForm({ ...form, nickname: v })}
          />
          <Input
            label="이메일"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />

          <button onClick={handleUpdate} style={btn}>
            프로필 수정
          </button>
        </div>
      )}

      {/* 🔥 최소 수정: user 있을 때만 비밀번호 영역 표시 */}
      {!loading && !error && user && (
        <div style={card}>
          <h3 style={{ color: "#FFD700" }}>비밀번호 변경</h3>

          <Input
            label="현재 비밀번호"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(v) =>
              setPasswordForm({ ...passwordForm, currentPassword: v })
            }
          />

          <Input
            label="새 비밀번호"
            type="password"
            value={passwordForm.newPassword}
            onChange={(v) =>
              setPasswordForm({ ...passwordForm, newPassword: v })
            }
          />

          <button onClick={handlePasswordChange} style={goldBtn}>
            비밀번호 변경
          </button>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div style={inputRow}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}

const wrap = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 20,
};

const title = {
  fontSize: 28,
  color: "#FFD700",
  marginBottom: 20,
};

const successBox = {
  color: "#4caf50",
  marginBottom: 10,
};

const card = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
  maxWidth: 400,
};

const inputRow = {
  display: "flex",
  flexDirection: "column",
  marginBottom: 10,
};

const labelStyle = {
  marginBottom: 4,
  color: "#FFD700",
};

const input = {
  padding: 8,
  background: "#000",
  border: "1px solid #333",
  color: "#fff",
  borderRadius: 6,
};

const btn = {
  marginTop: 10,
  padding: "10px 14px",
  background: "#444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const goldBtn = {
  ...btn,
  background: "#FFD700",
  color: "#000",
  fontWeight: "bold",
};

export default UserProfilePage;