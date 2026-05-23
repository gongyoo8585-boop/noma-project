"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 REVIEW ADMIN ITEM (ULTRA FINAL COMPLETE)
 * ✔ 관리자 리뷰 단일 아이템
 * ✔ ReviewAdminList와 100% 호환
 * ✔ 숨김 / 복구 / 삭제 / 답글
 * ✔ 유저 / 매장 / 예약 / 상태 / 이미지 / 답글 출력
 * ✔ null / undefined 안전 처리
 * ✔ 블랙 + 골드 UI
 * ✔ 단일 파일 완성형
 * =====================================================
 */

function ReviewAdminItem({
  review,
  onHide,
  onRestore,
  onDelete,
  onReply,
}) {
  if (!review) return null;

  const id = review._id || review.id || "";
  const user = review.user || {};
  const shop = review.shop || {};
  const reservation = review.reservation || {};
  const status = review.status || "active";
  const rating = Math.max(0, Math.min(5, Math.floor(Number(review.rating || 0))));

  const handleHide = () => {
    if (!id) return;
    onHide && onHide(id);
  };

  const handleRestore = () => {
    if (!id) return;
    onRestore && onRestore(id);
  };

  const handleDelete = () => {
    if (!id) return;
    onDelete && onDelete(id);
  };

  const handleReply = () => {
    if (!id) return;
    onReply && onReply(id);
  };

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <strong style={styles.title}>
            {user.nickname || user.name || user.email || "사용자"}
          </strong>

          <div style={styles.meta}>
            매장: {shop.name || "-"}
          </div>

          <div style={styles.meta}>
            예약: {reservation.date || "-"} {reservation.time || ""}
          </div>
        </div>

        <span style={statusBadge(status)}>
          {status}
        </span>
      </div>

      <div style={styles.rating}>
        <span style={styles.stars}>
          {"★".repeat(rating)}
          {"☆".repeat(5 - rating)}
        </span>
        <span style={styles.score}>{rating}점</span>
      </div>

      <p style={styles.content}>
        {review.content || ""}
      </p>

      {Array.isArray(review.images) && review.images.length > 0 && (
        <div style={styles.imageRow}>
          {review.images.map((src, idx) => (
            <img
              key={`${src}-${idx}`}
              src={src}
              alt="review"
              style={styles.img}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ))}
        </div>
      )}

      <div style={styles.info}>
        <InfoRow label="리뷰 ID" value={id || "-"} />
        <InfoRow label="신고 수" value={String(review.reportCount || 0)} />
        <InfoRow label="작성일" value={formatDate(review.createdAt)} />
        <InfoRow label="수정일" value={formatDate(review.updatedAt)} />
      </div>

      {review.reply?.content && (
        <div style={styles.replyBox}>
          <strong style={styles.replyTitle}>관리자 답글</strong>
          <p style={styles.replyText}>{review.reply.content}</p>
        </div>
      )}

      <div style={styles.actions}>
        {status !== "hidden" && (
          <button
            type="button"
            onClick={handleHide}
            style={styles.btn}
          >
            숨김
          </button>
        )}

        {status !== "active" && (
          <button
            type="button"
            onClick={handleRestore}
            style={styles.goldBtn}
          >
            복구
          </button>
        )}

        <button
          type="button"
          onClick={handleReply}
          style={styles.btn}
        >
          답글
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

function InfoRow({ label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
}

function formatDate(date) {
  if (!date) return "-";

  try {
    return new Date(date).toLocaleString();
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

  if (status === "hidden") {
    return {
      ...base,
      background: "#7a5200",
      color: "#fff",
    };
  }

  if (status === "deleted") {
    return {
      ...base,
      background: "#700",
      color: "#fff",
    };
  }

  return base;
}

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
  title: {
    color: "#d4af37",
    fontSize: 18,
  },
  meta: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 4,
  },
  rating: {
    marginTop: 12,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  stars: {
    color: "#d4af37",
    letterSpacing: 1,
  },
  score: {
    color: "#aaa",
    fontSize: 13,
  },
  content: {
    marginTop: 12,
    color: "#fff",
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  },
  imageRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10,
  },
  img: {
    width: 80,
    height: 80,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #333",
  },
  info: {
    marginTop: 14,
    display: "grid",
    gap: 6,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px solid #222",
    paddingBottom: 5,
  },
  label: {
    color: "#d4af37",
    fontWeight: "bold",
    minWidth: 80,
  },
  value: {
    color: "#ddd",
    textAlign: "right",
    wordBreak: "break-word",
  },
  replyBox: {
    marginTop: 12,
    padding: 12,
    background: "#000",
    border: "1px solid #333",
    borderRadius: 8,
  },
  replyTitle: {
    color: "#d4af37",
  },
  replyText: {
    margin: "6px 0 0",
    color: "#fff",
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  },
  actions: {
    marginTop: 14,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  btn: {
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

export default ReviewAdminItem;