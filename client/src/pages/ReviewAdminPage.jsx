"use strict";

import React, { useEffect, useState } from "react";
import reviewApi from "../services/review.api";
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 REVIEW ADMIN PAGE (FULL COMPLETE)
 * ✔ 리뷰 삭제
 * ✔ 신고 처리 (숨김/복구)
 * ✔ 평점 확인
 * ✔ 기존 구조 유지
 * =====================================================
 */

function ReviewAdminPage() {
  const [list, setList] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");
  const [shopId, setShopId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await reviewApi.getAdminList({
        status,
        shopId,
      });

      const statsRes = await reviewApi.getStats({
        shopId,
      });

      setList(res.list || res.items || []);
      setStats(statsRes.stats || null);

    } catch (e) {
      setError(e.message || "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      await reviewApi.adminRemove(id);
      load();
    } catch (e) {
      alert(e.message || "삭제 실패");
    }
  };

  const hide = async (id) => {
    try {
      await reviewApi.hide(id);
      load();
    } catch (e) {
      alert(e.message || "숨김 실패");
    }
  };

  const restore = async (id) => {
    try {
      await reviewApi.restore(id);
      load();
    } catch (e) {
      alert(e.message || "복구 실패");
    }
  };

  return (
    <div style={wrap}>
      <h2>리뷰 관리</h2>

      {/* 필터 */}
      <div style={filterBox}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">전체</option>
          <option value="active">active</option>
          <option value="hidden">hidden</option>
          <option value="deleted">deleted</option>
        </select>

        <input
          placeholder="shopId"
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
        />

        <button onClick={load}>검색</button>
      </div>

      {/* 평점 통계 */}
      {stats && (
        <div style={statsBox}>
          <div>평균 평점: {Number(stats.average || 0).toFixed(2)}</div>
          <div>리뷰 수: {stats.count || 0}</div>
        </div>
      )}

      {/* 상태 */}
      {loading && <Loading />}
      {error && <ErrorMessage message={error} />}
      {!loading && list.length === 0 && (
        <EmptyState message="리뷰 없음" />
      )}

      {/* 리스트 */}
      <div>
        {list.map((r) => (
          <div key={r._id} style={card}>
            <div><b>매장:</b> {r.shop?.name}</div>
            <div><b>유저:</b> {r.user?.email}</div>
            <div><b>평점:</b> {r.rating}</div>
            <div><b>내용:</b> {r.content}</div>
            <div><b>상태:</b> {r.status}</div>
            <div><b>신고수:</b> {r.reportCount || 0}</div>

            <div style={btnRow}>
              {r.status !== "deleted" && (
                <button style={danger} onClick={() => remove(r._id)}>
                  삭제
                </button>
              )}

              {r.status === "active" && (
                <button style={warn} onClick={() => hide(r._id)}>
                  숨김
                </button>
              )}

              {r.status === "hidden" && (
                <button style={btn} onClick={() => restore(r._id)}>
                  복구
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
STYLE
========================= */
const wrap = {
  padding: 20,
  background: "#000",
  color: "#fff",
  minHeight: "100vh",
};

const filterBox = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
};

const statsBox = {
  marginBottom: 20,
  padding: 10,
  border: "1px solid #333",
};

const card = {
  border: "1px solid #333",
  padding: 12,
  marginBottom: 10,
  borderRadius: 8,
};

const btnRow = {
  marginTop: 10,
  display: "flex",
  gap: 8,
};

const btn = {
  padding: "6px 10px",
  background: "#2ecc71",
  border: "none",
  cursor: "pointer",
};

const warn = {
  padding: "6px 10px",
  background: "#f39c12",
  border: "none",
  cursor: "pointer",
};

const danger = {
  padding: "6px 10px",
  background: "#e74c3c",
  border: "none",
  color: "#fff",
  cursor: "pointer",
};

export default ReviewAdminPage;