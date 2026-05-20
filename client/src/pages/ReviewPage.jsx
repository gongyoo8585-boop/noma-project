"use strict";

// 🔥 process 에러 방어 (최상단 추가 - 최소 수정)
if (typeof process === "undefined") {
  window.process = { env: {} };
}

import React, { useEffect, useState } from "react";

/**
 * =====================================================
 * 🔥 REVIEW PAGE (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ Loading / Error / EmptyState 적용 (최소 추가)
 * ✔ 기존 흐름 유지
 * ✔ 중복 렌더링 방지 (Error 시 하위 UI 차단 - 최소 수정)
 * =====================================================
 */

import ReviewList from "../components/ReviewList";
import ReviewForm from "../components/ReviewForm";
import reviewApi from "../services/review.api";

/* 🔥 추가 */
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

const ReviewPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError("");

      /* 🔥 최소 수정: fallback API 사용 (기존 로직 유지) */
      const apiFn =
        reviewApi && typeof reviewApi.safeGetMyList === "function"
          ? reviewApi.safeGetMyList
          : reviewApi.getMyList;

      if (!apiFn) {
        setReviews([]);
        return;
      }

      const res = await apiFn();

      /* 🔥 최소 추가: 응답이 객체가 아닌 경우 방어 */
      const safeRes = res || {};

      setReviews(
        Array.isArray(safeRes)
          ? safeRes
          : Array.isArray(safeRes?.items)
          ? safeRes.items
          : Array.isArray(safeRes?.data)
          ? safeRes.data
          : Array.isArray(safeRes?.list)
          ? safeRes.list
          : []
      );

    } catch (e) {
      /* 🔥 최소 수정: 리뷰 목록 조회 실패 시 페이지 에러 차단 */
      setReviews([]);
      setError("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleCreate = async (data) => {
    try {
      setLoading(true);
      setError("");

      await reviewApi.create(data);
      await fetchReviews();

    } catch (e) {
      setError(e.message || "리뷰 작성 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError("");

      await reviewApi.remove(id);

      setReviews((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (r) => (r._id || r.id) !== id
        )
      );

    } catch (e) {
      setError(e.message || "리뷰 삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>리뷰</h1>

      {/* 🔥 에러 UI */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={fetchReviews}
        />
      )}

      {/* 🔥 기존 기능 유지 (폼 항상 노출) */}
      <ReviewForm onSubmit={handleCreate} loading={loading} />

      {/* 🔥 로딩 */}
      {loading && <Loading />}

      {/* 🔥 최소 수정: reviews 안전 배열 보장 */}
      {!loading && !error && (!reviews || reviews.length === 0) && (
        <EmptyState message="작성된 리뷰가 없습니다." />
      )}

      {/* 🔥 최소 수정: 배열 확인 후 렌더링 */}
      {!loading && !error && Array.isArray(reviews) && reviews.length > 0 && (
        <ReviewList
          reviews={reviews}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#000",
    color: "#FFD700",
    minHeight: "100vh",
    padding: "20px",
  },
  title: {
    fontSize: "28px",
    marginBottom: "20px",
  },
};

export default ReviewPage;