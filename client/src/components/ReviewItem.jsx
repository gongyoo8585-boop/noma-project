"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 REVIEW ITEM (ULTRA FINAL - PATCHED)
 * ✔ 기존 기능 100% 유지
 * ✔ 별점 범위 안전 처리 추가 (최소 수정)
 * ✔ 나머지 구조 / 로직 변경 없음
 * =====================================================
 */

function ReviewItem({
  review,
  onDelete,
  onReport,
  onHide,
  onRestore,
  onReply,
  isAdmin = false,
  isMine = false,
}) {
  if (!review) return null;

  const renderStars = (rating) => {
    const score = Math.max(0, Math.min(5, Number(rating || 0))); // 🔥 안전 처리 추가
    return "★".repeat(score) + "☆".repeat(5 - score);
  };

  return (
    <div style={card}>
      <div style={top}>
        <div>
          <strong style={userName}>
            {review.user?.nickname ||
              review.user?.name ||
              "사용자"}
          </strong>

          {review.shop?.name && (
            <div style={meta}>매장: {review.shop.name}</div>
          )}
        </div>

        <div style={ratingBox}>
          <span style={stars}>{renderStars(review.rating)}</span>
          <span style={score}>{review.rating || 0}점</span>
        </div>
      </div>

      <p style={content}>{review.content}</p>

      {Array.isArray(review.images) && review.images.length > 0 && (
        <div style={imageRow}>
          {review.images.map((src, idx) => (
            <img key={idx} src={src} alt="review" style={img} />
          ))}
        </div>
      )}

      <div style={infoRow}>
        {review.reservation?.date && (
          <span>
            예약: {review.reservation.date}{" "}
            {review.reservation.time}
          </span>
        )}

        {review.status && (
          <span style={statusBadge(review.status)}>
            {review.status}
          </span>
        )}
      </div>

      {review.reply?.content && (
        <div style={replyBox}>
          <strong>관리자 답글</strong>
          <p>{review.reply.content}</p>
        </div>
      )}

      <div style={actions}>
        {!isAdmin && !isMine && (
          <button onClick={() => onReport?.(review._id)} style={btn}>
            신고
          </button>
        )}

        {(isMine || isAdmin) && (
          <button onClick={() => onDelete?.(review._id)} style={dangerBtn}>
            삭제
          </button>
        )}

        {isAdmin && review.status !== "hidden" && (
          <button onClick={() => onHide?.(review._id)} style={btn}>
            숨김
          </button>
        )}

        {isAdmin && review.status !== "active" && (
          <button onClick={() => onRestore?.(review._id)} style={btn}>
            복구
          </button>
        )}

        {isAdmin && (
          <button onClick={() => onReply?.(review._id)} style={goldBtn}>
            답글
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================
STYLE
========================= */

const card = {
  padding: 16,
  border: "1px solid #333",
  borderRadius: 12,
  background: "#111",
  color: "#fff",
};

const top = {
  display: "flex",
  justifyContent: "space-between",
};

const userName = {
  color: "#FFD700",
};

const ratingBox = {
  textAlign: "right",
};

const stars = {
  color: "#FFD700",
};

const score = {
  fontSize: 12,
  color: "#aaa",
};

const content = {
  marginTop: 10,
};

const meta = {
  fontSize: 12,
  color: "#aaa",
};

const imageRow = {
  display: "flex",
  gap: 8,
  marginTop: 10,
};

const img = {
  width: 70,
  height: 70,
  objectFit: "cover",
  borderRadius: 8,
};

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 10,
  fontSize: 12,
  color: "#aaa",
};

const replyBox = {
  marginTop: 10,
  padding: 10,
  border: "1px solid #333",
  borderRadius: 8,
  background: "#000",
};

const actions = {
  marginTop: 10,
  display: "flex",
  gap: 8,
};

const btn = {
  padding: "6px 10px",
  border: "1px solid #444",
  background: "#000",
  color: "#fff",
  borderRadius: 6,
  cursor: "pointer",
};

const goldBtn = {
  ...btn,
  background: "#FFD700",
  color: "#000",
};

const dangerBtn = {
  ...btn,
  background: "#900",
};

function statusBadge(status) {
  const base = {
    padding: "3px 7px",
    borderRadius: 999,
    fontSize: 12,
  };

  if (status === "active") return { ...base, background: "#222" };
  if (status === "hidden") return { ...base, background: "#7a5200" };
  if (status === "deleted") return { ...base, background: "#700" };

  return base;
}

export default ReviewItem;