"use strict";

import React, { useEffect, useState } from "react";

/**
 * =====================================================
 * TERMS ADMIN PAGE
 * 관리자 약관 관리
 * =====================================================
 */

const STORAGE_KEY = "nora_terms_contents";

const DEFAULT_TERMS = {
  service: "",
  privacy: "",
  privacyRequired: "",
  privacyOptional: "",
  location: "",
};

function TermsAdminPage() {
  const [terms, setTerms] = useState(DEFAULT_TERMS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        setTerms({
          ...DEFAULT_TERMS,
          ...JSON.parse(saved),
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const update = (key, value) => {
    setTerms((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(terms)
      );

      alert("약관 저장 완료");
    } catch (e) {
      console.error(e);
      alert("약관 저장 실패");
    }
  };

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>약관관리</h2>

      <TermEditor
        title="서비스 이용약관"
        value={terms.service}
        onChange={(v) => update("service", v)}
      />

      <TermEditor
        title="개인정보 처리방침"
        value={terms.privacy}
        onChange={(v) => update("privacy", v)}
      />

      <TermEditor
        title="개인정보 수집 및 이용동의 (필수)"
        value={terms.privacyRequired}
        onChange={(v) =>
          update("privacyRequired", v)
        }
      />

      <TermEditor
        title="개인정보 수집 및 이용동의 (선택)"
        value={terms.privacyOptional}
        onChange={(v) =>
          update("privacyOptional", v)
        }
      />

      <TermEditor
        title="위치기반서비스 이용약관"
        value={terms.location}
        onChange={(v) => update("location", v)}
      />

      <button
        type="button"
        onClick={handleSave}
        style={styles.saveBtn}
      >
        저장
      </button>
    </div>
  );
}

function TermEditor({
  title,
  value,
  onChange,
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        {title}
      </div>

      <textarea
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        style={styles.textarea}
        placeholder="약관 내용을 입력하세요."
      />
    </div>
  );
}

const styles = {
  wrap: {
    width: "100%",
  },

  title: {
    color: "#d4af37",
    marginBottom: 20,
  },

  card: {
    marginBottom: 20,
    padding: 16,
    border: "1px solid #333",
    borderRadius: 10,
    background: "#111",
  },

  cardTitle: {
    color: "#fff",
    fontWeight: 700,
    marginBottom: 10,
  },

  textarea: {
    width: "100%",
    minHeight: 220,
    background: "#000",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 12,
    resize: "vertical",
    boxSizing: "border-box",
  },

  saveBtn: {
    width: "100%",
    height: 50,
    border: "none",
    borderRadius: 8,
    background: "#d4af37",
    color: "#000",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default TermsAdminPage;
