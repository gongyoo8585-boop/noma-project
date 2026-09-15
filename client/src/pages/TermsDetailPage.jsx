"use strict";

import React from "react";

const STORAGE_KEY = "nora_terms_contents";

const TERM_META = {
  service: {
    title: "서비스 이용약관",
  },
  privacy: {
    title: "개인정보 처리방침",
  },
  privacyRequired: {
    title: "개인정보 수집 및 이용동의 (필수)",
  },
  privacyOptional: {
    title: "개인정보 수집 및 이용동의 (선택)",
  },
  location: {
    title: "위치기반서비스 이용약관",
  },
};

function TermsDetailPage({ navigate }) {
  const params = new URLSearchParams(
    typeof window !== "undefined"
      ? window.location.search
      : ""
  );

  const type = params.get("type") || "service";

  const meta =
    TERM_META[type] || TERM_META.service;

  const content = getTermContent(type);

  const goBack = () => {
    try {
      if (typeof navigate === "function") {
        navigate("/signup-agree");
        return;
      }

      window.history.pushState(
        {},
        "",
        "/signup-agree"
      );

      window.dispatchEvent(
        new PopStateEvent("popstate")
      );
    } catch {
      window.location.href = "/signup-agree";
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {meta.title}
        </h2>

        {content ? (
          <textarea
            readOnly
            wrap="soft"
            value={content}
            style={styles.contentTextarea}
          />
        ) : (
          <div style={styles.emptyBox}>
            <div style={styles.empty}>
              등록된 약관 내용이 없습니다.
              관리자 페이지의 약관관리에서 내용을 입력해주세요.
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={goBack}
          style={styles.backBtn}
        >
          약관동의로 돌아가기
        </button>
      </div>
    </div>
  );
}

function getTermContent(type) {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return "";
    }

    const parsed = JSON.parse(saved);

    return String(parsed?.[type] || "");
  } catch (e) {
    console.error(e);
    return "";
  }
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    padding: 20,
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },

  card: {
    width: "100%",
    maxWidth: "calc(100vw - 272px)",
    marginTop: 30,
    padding: 24,
    background: "#111",
    border: "1px solid #333",
    borderRadius: 14,
    boxSizing: "border-box",
  },

  title: {
    margin: 0,
    marginBottom: 20,
    color: "#d4af37",
    fontSize: 24,
    fontWeight: 800,
  },

  contentTextarea: {
    width: "100%",
    minHeight: 720,
    background: "#000",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 12,
    resize: "vertical",
    boxSizing: "border-box",
    overflowX: "hidden",
  },

  emptyBox: {
    minHeight: 360,
    padding: 12,
    background: "#000",
    border: "1px solid #333",
    borderRadius: 8,
    boxSizing: "border-box",
  },

  empty: {
    color: "#999",
    fontSize: 14,
    lineHeight: 1.6,
  },

  backBtn: {
    width: "100%",
    height: 48,
    marginTop: 18,
    border: "none",
    borderRadius: 8,
    background: "#d4af37",
    color: "#000",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  },
};

export default TermsDetailPage;
