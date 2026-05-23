"use strict";

import React, { useEffect, useState } from "react";
import reviewApi from "../../../services/review.api";
import ReviewAdminItem from "./ReviewAdminItem";

/* 🔥 추가 */
import Loading from "../../common/Loading";
import ErrorMessage from "../../common/ErrorMessage";
import EmptyState from "../../common/EmptyState";

/**
 * =====================================================
 * 🔥 REVIEW ADMIN LIST (ULTRA FINAL STABLE PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ 공통 UI 컴포넌트 최소 추가 (Loading / Error / Empty)
 * ✔ 기존 로직 / 흐름 변경 없음
 * ✔ 에러 시 리스트 렌더 차단 (안전성 보강)
 * =====================================================
 */

function ReviewAdminList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchList = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await reviewApi.getAdminList();
      const data = res?.data || res?.items || res || [];

      setList(Array.isArray(data) ? data : []);

    } catch (e) {
      setError(e.message || "리뷰 목록 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleHide = async (id) => {
    try {
      await reviewApi.hide(id);

      setList((prev) =>
        prev.map((r) =>
          (r._id || r.id) === id ? { ...r, status: "hidden" } : r
        )
      );
    } catch (e) {
      setError(e.message || "숨김 실패");
    }
  };

  const handleRestore = async (id) => {
    try {
      await reviewApi.restore(id);

      setList((prev) =>
        prev.map((r) =>
          (r._id || r.id) === id ? { ...r, status: "active" } : r
        )
      );
    } catch (e) {
      setError(e.message || "복구 실패");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      await reviewApi.adminRemove(id);

      setList((prev) =>
        prev.filter((r) => (r._id || r.id) !== id)
      );
    } catch (e) {
      setError(e.message || "삭제 실패");
    }
  };

  const handleReply = async (id) => {
    const content = window.prompt("답글을 입력하세요");
    if (!content) return;

    try {
      await reviewApi.reply(id, content);

      setList((prev) =>
        prev.map((r) =>
          (r._id || r.id) === id
            ? { ...r, reply: { content } }
            : r
        )
      );
    } catch (e) {
      setError(e.message || "답글 실패");
    }
  };

  return (
    <div style={styles.wrap}>
      {error && <ErrorMessage message={error} />}

      {loading && <Loading message="불러오는 중..." />}

      {!loading && !error && list.length === 0 && (
        <EmptyState message="리뷰가 없습니다." />
      )}

      {!loading && !error && list.length > 0 && (
        <div style={styles.list}>
          {list.map((review) => (
            <ReviewAdminItem
              key={review._id || review.id}
              review={review}
              onHide={handleHide}
              onRestore={handleRestore}
              onDelete={handleDelete}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
🔥 STYLE
========================= */
const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
};

export default ReviewAdminList;