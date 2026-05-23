"use strict";

import React, { useState, useEffect } from "react";
import userApi from "../services/user.api";

/**
 * =====================================================
 * 🔥 SIGNUP PAGE (ULTRA FINAL - PATCHED)
 * ✔ 기존 기능 100% 유지
 * ✔ 회원가입 후 map 이동 버그 수정
 * ✔ 최소 수정만 적용
 * =====================================================
 */

function SignupPage({ navigate }) {
  const [form, setForm] = useState({
    id: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
    phone: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const go = (path) => {
    try {
      if (typeof navigate === "function") {
        navigate(path);
      } else {
        window.location.href = path;
      }
    } catch {
      window.location.href = path;
    }
  };

  useEffect(() => {
    setError("");
  }, []);

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setError("");
  };

  const validate = () => {
    if (!form.id.trim()) return "아이디를 입력하세요.";
    if (form.id.trim().length < 4) return "아이디는 4자 이상이어야 합니다.";
    if (!form.password) return "비밀번호를 입력하세요.";
    if (form.password.length < 6) return "비밀번호는 6자 이상이어야 합니다.";
    if (form.password !== form.passwordConfirm) return "비밀번호가 일치하지 않습니다.";
    if (!form.nickname.trim()) return "닉네임을 입력하세요.";

    if (form.phone && !/^01[0-9]{8,9}$/.test(form.phone)) {
      return "전화번호 형식이 올바르지 않습니다.";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return "이메일 형식이 올바르지 않습니다.";
    }

    return "";
  };

  const handleSignup = async () => {
    const msg = validate();

    if (msg) {
      setError(msg);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        id: form.id.trim(),
        password: form.password,
        nickname: form.nickname.trim(),
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.email.trim() && { email: form.email.trim() }),
      };

      const res = await userApi.register(payload);

      const token = res.token || res.data?.token;
      const user = res.user || res.data?.user;

      if (token) {
        localStorage.setItem("token", token);

        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        alert("회원가입 완료");

        /* 🔥 핵심 수정:
           회원가입 완료 후 map 이동 제거
           admin 로그인 페이지 이동
        */
        go("/login");
        return;
      }

      alert("회원가입 완료. 로그인해주세요.");

      /* 🔥 핵심 수정 */
      go("/login");

    } catch (e) {
      setError(e.message || "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSignup();
    }
  };

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={{ color: "#d4af37" }}>노마 회원가입</h2>

        {error && <div style={errorStyle}>{error}</div>}

        {renderInput("아이디", "id")}
        {renderInput("비밀번호", "password", "password")}
        {renderInput("비밀번호 확인", "passwordConfirm", "password")}
        {renderInput("닉네임", "nickname")}
        {renderInput("전화번호", "phone")}
        {renderInput("이메일", "email")}

        <button
          disabled={loading}
          onClick={handleSignup}
          style={primaryButton}
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>

        <button
          onClick={() => go("/login")}
          style={secondaryButton}
        >
          이미 계정이 있어요
        </button>
      </div>
    </div>
  );

  function renderInput(label, key, type = "text") {
    return (
      <label style={labelStyle}>
        {label}
        <input
          type={type}
          value={form[key]}
          onChange={(e) => update(key, e.target.value)}
          onKeyDown={handleKeyDown}
          style={input}
        />
      </label>
    );
  }
}

const container = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#000",
  padding: 20,
};

const card = {
  width: "100%",
  maxWidth: 420,
  padding: 28,
  borderRadius: 14,
  background: "#111",
  border: "1px solid #333",
};

const labelStyle = {
  display: "block",
  marginBottom: 12,
  fontSize: 14,
  fontWeight: 600,
  color: "#d4af37",
};

const input = {
  width: "100%",
  marginTop: 6,
  padding: 12,
  border: "1px solid #333",
  borderRadius: 8,
  background: "#000",
  color: "#fff",
};

const primaryButton = {
  width: "100%",
  padding: 13,
  border: "none",
  borderRadius: 8,
  background: "#d4af37",
  color: "#000",
  fontSize: 16,
  fontWeight: 700,
  marginTop: 8,
  cursor: "pointer",
};

const secondaryButton = {
  width: "100%",
  padding: 13,
  border: "1px solid #444",
  borderRadius: 8,
  background: "#000",
  color: "#fff",
  fontSize: 15,
  cursor: "pointer",
  marginTop: 10,
};

const errorStyle = {
  padding: 10,
  marginBottom: 12,
  color: "#ff6b6b",
  background: "#220000",
  border: "1px solid #550000",
  borderRadius: 8,
};

export default SignupPage;