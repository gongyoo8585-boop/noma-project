"use strict";

import React, { useState } from "react";
import reviewApi from "../services/review.api";

/**
 * =====================================================
 * 🔥 REVIEW FORM (ULTRA FINAL - PATCHED)
 * ✔ 기존 기능 100% 유지
 * ✔ rating 타입 안전 처리 추가 (최소 수정)
 * ✔ 이미지 에러 처리 추가 (최소 수정)
 * ✔ 나머지 구조 / 로직 변경 없음
 * =====================================================
 */

function ReviewForm({ onSubmit = null, loading: parentLoading = false }) {
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================
  🔥 이미지 처리 (base64)
  ========================= */
  const handleImages = async (e) => {
    try {
      const files = Array.from(e.target.files || []);
      const result = [];

      for (const file of files) {
        const base64 = await toBase64(file);
        result.push(base64);
      }

      setImages(result);
    } catch (e) {
      setError("이미지 처리 실패");
    }
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  /* =========================
  🔥 제출
  ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      setError("내용을 입력하세요");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        content: content.trim(),
        rating: Number(rating) || 0, // 🔥 안전 처리 추가
        images,
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        await reviewApi.create(payload);
      }

      setContent("");
      setRating(5);
      setImages([]);

      /* 🔥 최소 추가: file input 초기화 (기존 로직 영향 없음) */
      if (e.target && typeof e.target.reset === "function") {
        e.target.reset();
      }

    } catch (e) {
      setError(e.message || "리뷰 작성 실패");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
  🔥 UI
  ========================= */
  return (
    <form onSubmit={handleSubmit} style={wrap}>
      <h3 style={title}>리뷰 작성</h3>

      {error && <div style={errorBox}>{error}</div>}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="리뷰를 작성하세요"
        style={textarea}
      />

      <div style={row}>
        <label>별점:</label>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          style={select}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n}점
            </option>
          ))}
        </select>
      </div>

      <div style={row}>
        <label>이미지:</label>
        <input type="file" multiple onChange={handleImages} />
      </div>

      {Array.isArray(images) && images.length > 0 && (
        <div style={previewRow}>
          {images.map((src, idx) => (
            <img key={idx} src={src} alt="preview" style={img} />
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || parentLoading}
        style={btn}
      >
        {loading || parentLoading ? "작성중..." : "작성하기"}
      </button>
    </form>
  );
}

/* =========================
STYLE (블랙 + 골드)
========================= */

const wrap = {
  background: "#111",
  padding: 16,
  borderRadius: 12,
  border: "1px solid #333",
  marginBottom: 20,
};

const title = {
  marginBottom: 10,
  color: "#d4af37",
};

const textarea = {
  width: "100%",
  minHeight: 100,
  padding: 10,
  background: "#000",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const row = {
  marginTop: 10,
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const select = {
  padding: 6,
  background: "#000",
  color: "#fff",
  border: "1px solid #333",
};

const previewRow = {
  display: "flex",
  gap: 8,
  marginTop: 10,
};

const img = {
  width: 60,
  height: 60,
  objectFit: "cover",
  borderRadius: 6,
};

const btn = {
  marginTop: 15,
  padding: "10px 14px",
  background: "#d4af37",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const errorBox = {
  marginBottom: 10,
  color: "#ff6b6b",
};

export default ReviewForm;