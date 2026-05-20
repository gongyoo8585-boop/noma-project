"use strict";

import React, { useEffect, useState } from "react";
import userApi from "../services/user.api";

/**
 * =====================================================
 * 🔥 USER PROFILE COMPONENT (ULTRA FINAL)
 * ✔ 기존 기능 100% 유지
 * ✔ 프로필 수정 / 비밀번호 변경 유지
 * ✔ 입력 검증 강화
 * ✔ 오류 처리 개선
 * ✔ 다크(블랙/골드) UI 적용
 * ✔ UX 개선 (상태 메시지)
 * =====================================================
 */

function UserProfile() {
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    nickname: "",
    phone: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  /* =========================
  🔥 초기 로드
  ========================= */
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);

      const res = await userApi.getMe();
      const data = res.user || res.data || res;

      setUser(data);

      setForm({
        nickname: data.nickname || "",
        phone: data.phone || "",
        email: data.email || "",
      });

    } catch {
      setError("유저 정보 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePasswordForm = (key, value) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
  };

  /* =========================
  🔥 프로필 수정
  ========================= */
  const saveProfile = async () => {
    if (!form.nickname.trim()) {
      alert("닉네임 입력 필요");
      return;
    }

    try {
      setSaving(true);

      await userApi.update({
        nickname: form.nickname,
        phone: form.phone,
        email: form.email,
      });

      setStatusMsg("프로필 수정 완료");
      loadUser();

    } catch {
      alert("프로필 수정 실패");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
  🔥 비밀번호 변경
  ========================= */
  const changePassword = async () => {
    if (!passwordForm.current || !passwordForm.next) {
      alert("비밀번호 입력 필요");
      return;
    }

    if (passwordForm.next.length < 6) {
      alert("비밀번호는 최소 6자");
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      alert("비밀번호 불일치");
      return;
    }

    try {
      await userApi.changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });

      setStatusMsg("비밀번호 변경 완료");

      setPasswordForm({
        current: "",
        next: "",
        confirm: "",
      });

    } catch {
      alert("비밀번호 변경 실패");
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>로딩중...</div>;
  }

  if (!user) {
    return <div style={{ padding: 20 }}>유저 없음</div>;
  }

  return (
    <div style={container}>
      <h3>프로필</h3>

      {error && <div style={errorStyle}>{error}</div>}
      {statusMsg && <div style={statusStyle}>{statusMsg}</div>}

      {/* =========================
      🔥 기본 정보
      ========================= */}
      <section style={card}>
        <p><strong>ID:</strong> {user.id || "-"}</p>
        <p><strong>권한:</strong> {user.role}</p>
      </section>

      {/* =========================
      🔥 프로필 수정
      ========================= */}
      <section style={card}>
        <h4>정보 수정</h4>

        <input
          value={form.nickname}
          onChange={(e) => updateForm("nickname", e.target.value)}
          placeholder="닉네임"
          style={input}
        />

        <input
          value={form.phone}
          onChange={(e) => updateForm("phone", e.target.value)}
          placeholder="전화번호"
          style={input}
        />

        <input
          value={form.email}
          onChange={(e) => updateForm("email", e.target.value)}
          placeholder="이메일"
          style={input}
        />

        <button onClick={saveProfile} style={primaryBtn}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </section>

      {/* =========================
      🔥 비밀번호 변경
      ========================= */}
      <section style={card}>
        <h4>비밀번호 변경</h4>

        <input
          type="password"
          placeholder="현재 비밀번호"
          value={passwordForm.current}
          onChange={(e) => updatePasswordForm("current", e.target.value)}
          style={input}
        />

        <input
          type="password"
          placeholder="새 비밀번호"
          value={passwordForm.next}
          onChange={(e) => updatePasswordForm("next", e.target.value)}
          style={input}
        />

        <input
          type="password"
          placeholder="비밀번호 확인"
          value={passwordForm.confirm}
          onChange={(e) => updatePasswordForm("confirm", e.target.value)}
          style={input}
        />

        <button onClick={changePassword} style={secondaryBtn}>
          비밀번호 변경
        </button>
      </section>
    </div>
  );
}

/* =========================
STYLE (블랙/골드)
========================= */

const container = {
  maxWidth: 500,
  margin: "0 auto",
  padding: 20,
  background: "#000",
  color: "#d4af37",
  minHeight: "100vh",
};

const card = {
  border: "1px solid #333",
  borderRadius: 12,
  padding: 20,
  marginBottom: 15,
  background: "#111",
};

const input = {
  width: "100%",
  padding: 10,
  marginBottom: 10,
  border: "1px solid #333",
  borderRadius: 8,
  background: "#000",
  color: "#fff",
};

const primaryBtn = {
  width: "100%",
  padding: 10,
  background: "#d4af37",
  color: "#000",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const secondaryBtn = {
  width: "100%",
  padding: 10,
  background: "#444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const errorStyle = {
  color: "red",
  marginBottom: 10,
};

const statusStyle = {
  color: "#fff",
  marginBottom: 10,
};

export default UserProfile;