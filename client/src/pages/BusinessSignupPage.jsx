"use strict";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../services/user.api";
import shopApi from "../services/shop.api";

const GOLD_LIGHT = "#F7D774";
const GOLD = "#D4AF37";
const GOLD_DARK = "#B8860B";
const GOLD_GRADIENT = `linear-gradient(90deg, ${GOLD_LIGHT} 0%, ${GOLD} 55%, ${GOLD_DARK} 100%)`;

function BusinessSignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    id: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
    email: "",
    emailCode: "",
    serviceType: "massage",
    shopId: "",
  });

  const [shops, setShops] = useState([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (sessionStorage.getItem("businessSignupAgreeChecked") !== "true") {
        navigate("/business/signup-agree", { replace: true });
      }
    } catch (storageError) {
      console.warn("BUSINESS_SIGNUP_AGREE_CHECK_ERROR:", storageError);
      navigate("/business/signup-agree", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;

    const loadShops = async () => {
      try {
        setShopLoading(true);

        const response = await shopApi.getList({
          category: form.serviceType,
          serviceType: form.serviceType,
          shopCategory: form.serviceType,
        });

        const list =
          response?.shops ||
          response?.items ||
          response?.list ||
          response?.data?.shops ||
          response?.data?.items ||
          response?.data?.list ||
          response?.data ||
          response ||
          [];

        if (!active) {
          return;
        }

        setShops(Array.isArray(list) ? list : []);
      } catch (shopError) {
        console.warn("BUSINESS_SIGNUP_SHOP_LIST_ERROR:", shopError);

        if (active) {
          setShops([]);
        }
      } finally {
        if (active) {
          setShopLoading(false);
        }
      }
    };

    setForm((prev) => ({
      ...prev,
      shopId: "",
    }));

    loadShops();

    return () => {
      active = false;
    };
  }, [form.serviceType]);

  const availableShops = useMemo(() => {
    return shops.filter((shop) => !shop?.owner);
  }, [shops]);

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setError("");

    if (key === "email") {
      setCodeSent(false);
      setForm((prev) => ({
        ...prev,
        emailCode: "",
      }));
    }
  };

  const sendCode = async () => {
    const email = form.email.trim();

    if (!email) {
      setError("이메일을 입력하세요.");
      return;
    }

    try {
      setSending(true);
      setError("");

      await userApi.sendEmailVerificationCode({
        email,
      });

      setCodeSent(true);
      alert("이메일 인증번호를 발송했습니다.");
    } catch (sendError) {
      console.error("BUSINESS_SIGNUP_EMAIL_CODE_SEND_ERROR:", sendError);
      setError(
        sendError?.message ||
          sendError?.msg ||
          sendError?.error ||
          "인증번호 발송에 실패했습니다."
      );
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    const id = form.id.trim();
    const nickname = form.nickname.trim();
    const email = form.email.trim();
    const emailCode = form.emailCode.trim();

    if (!id || id.length < 4) {
      setError("아이디는 4자 이상 입력하세요.");
      return;
    }

    if (!form.password || form.password.length < 6) {
      setError("비밀번호는 6자 이상 입력하세요.");
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!nickname) {
      setError("닉네임을 입력하세요.");
      return;
    }

    if (!email) {
      setError("이메일을 입력하세요.");
      return;
    }

    if (!codeSent || !emailCode) {
      setError("이메일 인증을 완료해주세요.");
      return;
    }

    if (!form.shopId) {
      setError("연결 신청할 Nora 업체를 선택하세요.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await userApi.verifyEmailVerificationCode({
        email,
        code: emailCode,
      });

      await userApi.shopRegister({
        id,
        password: form.password,
        nickname,
        email,
        serviceType: form.serviceType,
        requestedShopId: form.shopId,
      });

      try {
        sessionStorage.removeItem("businessSignupAgreeChecked");
      } catch (storageError) {
        console.warn("BUSINESS_SIGNUP_AGREE_CLEAR_ERROR:", storageError);
      }

      alert(
        "업체회원 가입이 완료되었습니다. 관리자 업체 연결 승인 후 채용정보 등록이 가능합니다."
      );

      navigate("/login", { replace: true });
    } catch (submitError) {
      console.error("BUSINESS_SIGNUP_SUBMIT_ERROR:", submitError);
      setError(
        submitError?.message ||
          submitError?.msg ||
          submitError?.error ||
          "업체회원 가입에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    navigate("/business/signup-agree");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>노라 업체회원 가입</h1>
          <div style={styles.titleLine} />
        </div>

        <p style={styles.desc}>
          실제 Nora 등록업체를 선택하여 업체회원 계정 연결 승인을 신청합니다.
        </p>

        {error ? <div style={styles.error}>{error}</div> : null}

        <Field label="업체 종류">
          <select
            style={styles.input}
            value={form.serviceType}
            onChange={(event) => update("serviceType", event.target.value)}
            disabled={loading}
          >
            <option value="massage">마사지</option>
            <option value="karaoke">노래방</option>
          </select>
        </Field>

        <Field label="연결 신청 업체">
          <select
            style={styles.input}
            value={form.shopId}
            onChange={(event) => update("shopId", event.target.value)}
            disabled={loading || shopLoading}
          >
            <option value="">
              {shopLoading ? "업체 목록 불러오는 중..." : "업체를 선택하세요"}
            </option>

            {availableShops.map((shop) => {
              const shopId = shop?._id || shop?.id || "";
              const shopName =
                shop?.name || shop?.title || shop?.shopName || "업체명 없음";
              const shopAddress =
                shop?.roadAddress || shop?.address || shop?.region || "";

              if (!shopId) {
                return null;
              }

              return (
                <option key={shopId} value={shopId}>
                  {shopName}
                  {shopAddress ? ` - ${shopAddress}` : ""}
                </option>
              );
            })}
          </select>
        </Field>

        {!shopLoading && availableShops.length === 0 ? (
          <div style={styles.emptyShop}>
            현재 연결 신청할 수 있는 등록업체가 없습니다.
          </div>
        ) : null}

        <Field label="아이디">
          <input
            type="text"
            style={styles.input}
            value={form.id}
            onChange={(event) => update("id", event.target.value)}
            placeholder="아이디 4자 이상"
            autoComplete="username"
            disabled={loading}
          />
        </Field>

        <Field label="비밀번호">
          <input
            type="password"
            style={styles.input}
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            placeholder="비밀번호 6자 이상"
            autoComplete="new-password"
            disabled={loading}
          />
        </Field>

        <Field label="비밀번호 확인">
          <input
            type="password"
            style={styles.input}
            value={form.passwordConfirm}
            onChange={(event) =>
              update("passwordConfirm", event.target.value)
            }
            placeholder="비밀번호를 다시 입력하세요"
            autoComplete="new-password"
            disabled={loading}
          />
        </Field>

        <Field label="닉네임">
          <input
            type="text"
            style={styles.input}
            value={form.nickname}
            onChange={(event) => update("nickname", event.target.value)}
            placeholder="닉네임을 입력하세요"
            disabled={loading}
          />
        </Field>

        <Field label="이메일">
          <div style={styles.emailRow}>
            <input
              type="email"
              style={{
                ...styles.input,
                margin: 0,
                flex: 1,
              }}
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="이메일을 입력하세요"
              autoComplete="email"
              disabled={loading || sending}
            />

            <button
              type="button"
              style={{
                ...styles.codeButton,
                ...(sending || loading ? styles.buttonDisabled : null),
              }}
              onClick={sendCode}
              disabled={sending || loading}
            >
              {sending ? "발송중" : codeSent ? "재발송" : "인증번호"}
            </button>
          </div>
        </Field>

        <Field label="이메일 인증번호">
          <input
            type="text"
            inputMode="numeric"
            style={styles.input}
            value={form.emailCode}
            onChange={(event) => update("emailCode", event.target.value)}
            placeholder={
              codeSent ? "이메일로 받은 인증번호 입력" : "인증번호를 먼저 발송하세요"
            }
            disabled={loading || !codeSent}
          />
        </Field>

        <div style={styles.notice}>
          가입 완료 후 관리자가 신청한 업체와 회원계정의 연결을 승인하기 전까지
          채용정보 등록이 제한될 수 있습니다.
        </div>

        <button
          type="button"
          style={{
            ...styles.submitButton,
            ...(loading ? styles.buttonDisabled : null),
          }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? "가입 처리중..." : "업체회원 가입하기"}
        </button>

        <button
          type="button"
          style={styles.backButton}
          onClick={back}
          disabled={loading}
        >
          이전으로
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <div style={styles.label}>{label}</div>
      {children}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 16px",
    background: "#000",
    color: "#fff",
  },

  card: {
    width: "100%",
    maxWidth: 600,
    boxSizing: "border-box",
    padding: "32px 28px",
    borderRadius: 16,
    border: "1px solid #2f2f2f",
    background: "#0b0b0b",
  },

  titleWrap: {
    marginBottom: 20,
  },

  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.35,
    fontWeight: 900,
    letterSpacing: "-0.7px",
    background: GOLD_GRADIENT,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },

  titleLine: {
    width: "100%",
    height: 2,
    marginTop: 14,
    borderRadius: 999,
    background: GOLD_GRADIENT,
  },

  desc: {
    margin: "0 0 20px",
    color: "#c7c7c7",
    fontSize: 14,
    lineHeight: 1.7,
    wordBreak: "keep-all",
  },

  error: {
    marginBottom: 18,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #7b2929",
    background: "#1c0909",
    color: "#ff9a9a",
    fontSize: 13,
    lineHeight: 1.6,
    wordBreak: "keep-all",
  },

  field: {
    marginBottom: 15,
  },

  label: {
    marginBottom: 7,
    color: "#f1f1f1",
    fontSize: 13,
    fontWeight: 800,
  },

  input: {
    width: "100%",
    minHeight: 48,
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 9,
    border: "1px solid #373737",
    outline: "none",
    background: "#050505",
    color: "#fff",
    fontSize: 14,
  },

  emailRow: {
    width: "100%",
    display: "flex",
    alignItems: "stretch",
    gap: 8,
  },

  codeButton: {
    minWidth: 96,
    boxSizing: "border-box",
    padding: "10px 12px",
    border: 0,
    borderRadius: 9,
    background: GOLD_GRADIENT,
    color: "#050505",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  emptyShop: {
    margin: "-5px 0 15px",
    padding: "11px 12px",
    borderRadius: 9,
    border: "1px solid #333",
    background: "#101010",
    color: "#999",
    fontSize: 12,
    lineHeight: 1.55,
  },

  notice: {
    marginTop: 4,
    padding: 14,
    borderRadius: 10,
    border: `1px solid ${GOLD_DARK}`,
    background: "#15120a",
    color: "#e6d18b",
    fontSize: 13,
    lineHeight: 1.65,
    wordBreak: "keep-all",
  },

  submitButton: {
    width: "100%",
    minHeight: 52,
    boxSizing: "border-box",
    marginTop: 18,
    padding: "13px 16px",
    border: 0,
    borderRadius: 10,
    background: GOLD_GRADIENT,
    color: "#050505",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
  },

  backButton: {
    width: "100%",
    minHeight: 48,
    boxSizing: "border-box",
    marginTop: 10,
    padding: "12px 16px",
    border: "1px solid #444",
    borderRadius: 10,
    background: "#000",
    color: "#fff",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },

  buttonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
};

export default BusinessSignupPage;
