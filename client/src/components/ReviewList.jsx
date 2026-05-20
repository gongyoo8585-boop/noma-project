"use strict";

import React, { useEffect, useState } from "react";
import reviewApi from "../services/review.api";

/* 🔥 추가 */
import Loading from "./common/Loading";
import ErrorMessage from "./common/ErrorMessage";
import EmptyState from "./common/EmptyState";

/**
 * =====================================================
 * 🔥 REVIEW LIST COMPONENT (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 기능 100% 유지
 * ✔ 기존 구조 / 흐름 변경 없음
 * ✔ Loading / Error / Empty 최소 추가
 * ✔ 에러 시 리스트 렌더 차단 (안전성 보강)
 * =====================================================
 */

function ReviewList({
  shopId = null,
  mine = false,
  admin = false,
  refreshKey = 0,

  reviews = null,
  onDelete = null,
}) {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* 🔥 외부 reviews 사용 */
  useEffect(() => {
    if (Array.isArray(reviews)) {
      setList(reviews);
    }
  }, [reviews]);

  useEffect(() => {
    if (Array.isArray(reviews)) return;
    load();
  }, [shopId, mine, admin, refreshKey, status]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      let res;

      if (admin) {
        res = await reviewApi.getAdminList({
          status,
          limit: 100,
        });
      } else if (mine) {
        res = await reviewApi.getMyList();
      } else if (shopId) {
        res = await reviewApi.getByShop(shopId, {
          limit: 50,
        });
      } else {
        res = [];
      }

      /* 🔥 최소 추가: res null/undefined 방어 */
      const safeRes = res || {};

      const data = Array.isArray(safeRes)
        ? safeRes
        : Array.isArray(safeRes?.list)
        ? safeRes.list
        : Array.isArray(safeRes?.items)
        ? safeRes.items
        : Array.isArray(safeRes?.reviews)
        ? safeRes.reviews
        : [];

      setList(data);
    } catch (e) {
      setError(e.message || "리뷰 불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!id) return;

    if (!window.confirm("리뷰를 삭제하시겠습니까?")) return;

    try {
      if (admin) {
        await reviewApi.adminRemove(id);
      } else {
        await reviewApi.remove(id);
      }

      if (onDelete) {
        onDelete(id);
      } else {
        load();
      }

      alert("삭제 완료");
    } catch (e) {
      alert(e.message || "삭제 실패");
    }
  };

  const report = async (id) => {
    if (!id) return;

    const reason = window.prompt("신고 사유를 입력하세요.");
    if (!reason) return;

    try {
      await reviewApi.report(id, reason);
      alert("신고 완료");
      load();
    } catch (e) {
      alert(e.message || "신고 실패");
    }
  };

  const hide = async (id) => {
    if (!id) return;

    if (!window.confirm("리뷰를 숨김 처리하시겠습니까?")) return;

    try {
      await reviewApi.hide(id);
      alert("숨김 처리 완료");
      load();
    } catch (e) {
      alert(e.message || "숨김 처리 실패");
    }
  };

  const restore = async (id) => {
    if (!id) return;

    if (!window.confirm("리뷰를 복구하시겠습니까?")) return;

    try {
      await reviewApi.restore(id);
      alert("복구 완료");
      load();
    } catch (e) {
      alert(e.message || "복구 실패");
    }
  };

  const reply = async (id) => {
    if (!id) return;

    const content = window.prompt("관리자 답글을 입력하세요.");
    if (!content || !content.trim()) return;

    try {
      await reviewApi.reply(id, content);
      alert("답글 등록 완료");
      load();
    } catch (e) {
      alert(e.message || "답글 등록 실패");
    }
  };

  const renderStars = (rating) => {
    const score = Math.max(0, Math.min(5, Number(rating || 0)));
    return "★".repeat(score) + "☆".repeat(5 - score);
  };

  return (
    <div style={wrap}>
      <div style={header}>
        <h3 style={title}>
          {admin ? "관리자 리뷰 목록" : mine ? "내 리뷰" : "리뷰 목록"}
        </h3>

        {admin && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={select}
          >
            <option value="">전체</option>
            <option value="active">활성</option>
            <option value="hidden">숨김</option>
            <option value="deleted">삭제</option>
          </select>
        )}
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading && <Loading message="리뷰 불러오는 중..." />}

      {/* 🔥 최소 수정: 배열 안전 체크 */}
      {!loading && !error && (!list || list.length === 0) && (
        <EmptyState message="리뷰가 없습니다." />
      )}

      {/* 🔥 최소 수정: 배열 확인 후 렌더 */}
      {!loading && !error && Array.isArray(list) && list.length > 0 && (
        <div style={listWrap}>
          {list.map((review, idx) => (
            <div key={review?._id || idx} style={card}>
              <div style={top}>
                <div>
                  <strong style={userName}>
                    {review?.user?.nickname ||
                      review?.user?.name ||
                      review?.user?.id ||
                      "사용자"}
                  </strong>

                  {review?.shop?.name && (
                    <div style={meta}>매장: {review.shop.name}</div>
                  )}
                </div>

                <div style={ratingBox}>
                  <span style={stars}>{renderStars(review?.rating)}</span>
                  <span style={score}>
                    {Number(review?.rating || 0)}점
                  </span>
                </div>
              </div>

              <p style={content}>{review?.content || ""}</p>

              {Array.isArray(review?.images) && review.images.length > 0 && (
                <div style={imageRow}>
                  {review.images.map((src, idx) => (
                    <img
                      key={`${src}-${idx}`}
                      src={src}
                      alt="review"
                      style={img}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ))}
                </div>
              )}

              <div style={infoRow}>
                {review?.reservation?.date && (
                  <span>
                    예약: {review.reservation.date}{" "}
                    {review.reservation.time || ""}
                  </span>
                )}

                {review?.status && (
                  <span style={statusBadge(review.status)}>
                    {review.status}
                  </span>
                )}
              </div>

              {review?.reply?.content && (
                <div style={replyBox}>
                  <strong>관리자 답글</strong>
                  <p style={{ margin: "6px 0 0", color: "#fff" }}>
                    {review.reply.content}
                  </p>
                </div>
              )}

              <div style={actions}>
                {!admin && !mine && (
                  <button onClick={() => report(review?._id)} style={smallBtn}>
                    신고
                  </button>
                )}

                {(mine || admin) && (
                  <button onClick={() => remove(review?._id)} style={dangerBtn}>
                    삭제
                  </button>
                )}

                {admin && review?.status !== "hidden" && (
                  <button onClick={() => hide(review?._id)} style={smallBtn}>
                    숨김
                  </button>
                )}

                {admin && review?.status !== "active" && (
                  <button onClick={() => restore(review?._id)} style={smallBtn}>
                    복구
                  </button>
                )}

                {admin && (
                  <button onClick={() => reply(review?._id)} style={goldBtn}>
                    답글
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* 스타일 그대로 유지 */

const wrap = { color: "#d4af37" };
const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
  gap: 10,
};
const title = { margin: 0, color: "#d4af37" };
const select = {
  padding: 8,
  background: "#000",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};
const muted = { color: "#888" };
const listWrap = { display: "grid", gap: 12 };
const card = {
  padding: 16,
  border: "1px solid #333",
  borderRadius: 12,
  background: "#111",
};
const top = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};
const userName = { color: "#fff" };
const ratingBox = { textAlign: "right", whiteSpace: "nowrap" };
const stars = { color: "#d4af37", display: "block" };
const score = { color: "#888", fontSize: 12 };
const content = { color: "#fff", whiteSpace: "pre-wrap", lineHeight: 1.5 };
const meta = { color: "#888", fontSize: 13, marginTop: 4 };
const imageRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};
const img = {
  width: 80,
  height: 80,
  objectFit: "cover",
  borderRadius: 8,
  border: "1px solid #333",
};
const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  color: "#888",
  fontSize: 13,
  marginTop: 10,
};
const replyBox = {
  marginTop: 12,
  padding: 12,
  borderRadius: 8,
  background: "#000",
  border: "1px solid #333",
};
const actions = {
  display: "flex",
  gap: 8,
  marginTop: 12,
  flexWrap: "wrap",
};
const smallBtn = {
  padding: "7px 10px",
  border: "1px solid #444",
  borderRadius: 8,
  background: "#000",
  color: "#fff",
  cursor: "pointer",
};
const goldBtn = {
  padding: "7px 10px",
  border: "none",
  borderRadius: 8,
  background: "#d4af37",
  color: "#000",
  cursor: "pointer",
  fontWeight: "bold",
};
const dangerBtn = {
  padding: "7px 10px",
  border: "none",
  borderRadius: 8,
  background: "#900",
  color: "#fff",
  cursor: "pointer",
};

function statusBadge(status) {
  const base = {
    padding: "3px 7px",
    borderRadius: 999,
    fontSize: 12,
    border: "1px solid #444",
  };

  if (status === "active") {
    return { ...base, color: "#d4af37", background: "#111" };
  }

  if (status === "hidden") {
    return { ...base, color: "#fff", background: "#7a5200" };
  }

  if (status === "deleted") {
    return { ...base, color: "#fff", background: "#700" };
  }

  return base;
}

export default ReviewList;