"use strict";

import React, { useEffect, useState, useCallback } from "react";
import reservationApi from "../../services/reservation.api";

import Loading from "../../components/common/Loading";
import ErrorMessage from "../../components/common/ErrorMessage";
import EmptyState from "../../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 ADMIN RESERVATION PAGE (ULTRA FINAL)
 * ✔ 기존 기능 100% 유지
 * ✔ 상태 변경 / 삭제 / 검색 / 필터 유지
 * ✔ 오류 방지 (undefined 안전 처리)
 * ✔ 통계 / 빠른 필터 유지
 * ✔ 다크(블랙/골드) UI 적용
 * ✔ Loading / ErrorMessage / EmptyState 적용
 * ✔ 429 과다 요청 방지 최소 추가
 * ✔ 중복 로딩 방지 최소 추가
 * ✔ stale status 방지 최소 추가
 * =====================================================
 */

function AdminReservationPage({ navigate }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  const normalizeList = (res) => {
    const items =
      res?.items ||
      res?.list ||
      res?.data ||
      [];

    return Array.isArray(items) ? items : [];
  };

  const updateLocalStats = (items = []) => {
    setStats({
      total: items.length,
      pending: items.filter((r) => r?.status === "pending").length,
      completed: items.filter((r) => r?.status === "completed").length,
    });
  };

  /* =========================
  🔥 데이터 로드
  ========================= */
  const load = useCallback(
    async (override = {}) => {
      if (loading) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const nextKeyword =
          override.keyword !== undefined
            ? override.keyword
            : keyword;

        const nextStatus =
          override.status !== undefined
            ? override.status
            : status;

        const res = await reservationApi.getAdminList({
          keyword: nextKeyword,
          status: nextStatus,
          limit: 100,
        });

        const items = normalizeList(res);

        setList(items);
        updateLocalStats(items);
      } catch (e) {
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "예약 목록 불러오기 실패"
        );
      } finally {
        setLoading(false);
      }
    },
    [keyword, status, loading]
  );

  useEffect(() => {
    load();
  }, []);

  /* =========================
  🔥 상태 변경
  ========================= */
  const updateStatus = async (id, nextStatus) => {
    if (!id) {
      setError("예약 ID가 없습니다.");
      return;
    }

    try {
      setError("");

      await reservationApi.updateStatus(id, nextStatus);

      alert("상태 변경 완료");

      load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "상태 변경 실패"
      );
    }
  };

  /* =========================
  🔥 삭제
  ========================= */
  const remove = async (id) => {
    if (!id) {
      setError("예약 ID가 없습니다.");
      return;
    }

    if (!window.confirm("예약을 삭제하시겠습니까?")) return;

    try {
      setError("");

      await reservationApi.remove(id);

      alert("삭제 완료");

      load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "삭제 실패"
      );
    }
  };

  /* =========================
  🔥 빠른 필터
  ========================= */
  const quickFilter = (type) => {
    setStatus(type);
    load({ status: type });
  };

  const goDashboard = () => {
    if (typeof navigate === "function") {
      navigate("/admin");
      return;
    }

    window.location.href = "/admin";
  };

  return (
    <div style={container}>
      <div style={header}>
        <h2>예약 관리</h2>
        <button style={secondaryBtn} onClick={goDashboard}>
          대시보드
        </button>
      </div>

      {/* =========================
      🔥 통계
      ========================= */}
      <div style={statsBox}>
        <span>전체: {stats.total}</span>
        <span>대기: {stats.pending}</span>
        <span>완료: {stats.completed}</span>
      </div>

      {/* =========================
      🔥 검색 / 필터
      ========================= */}
      <div style={filterBox}>
        <input
          placeholder="매장명 / 유저 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              load();
            }
          }}
          style={input}
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={input}
        >
          <option value="">전체 상태</option>
          <option value="pending">대기</option>
          <option value="approved">승인</option>
          <option value="completed">완료</option>
          <option value="cancelled">취소</option>
        </select>

        <button style={primaryBtn} onClick={() => load()} disabled={loading}>
          검색
        </button>
      </div>

      {/* 빠른 필터 */}
      <div style={quickFilterBox}>
        <button style={smallBtn} onClick={() => quickFilter("")} disabled={loading}>
          전체
        </button>
        <button style={smallBtn} onClick={() => quickFilter("pending")} disabled={loading}>
          대기
        </button>
        <button style={smallBtn} onClick={() => quickFilter("completed")} disabled={loading}>
          완료
        </button>
      </div>

      {loading && <Loading message="예약 목록 불러오는 중..." />}

      {error && !loading && (
        <ErrorMessage
          message={error}
          onRetry={() => load()}
        />
      )}

      {/* =========================
      🔥 리스트
      ========================= */}
      {!loading && !error && (
        <div style={listWrap}>
          {list.map((r, idx) => {
            const id = r?._id || r?.id || `reservation-${idx}`;

            return (
              <div key={id} style={card}>
                <div>
                  <strong>{r?.shop?.name || r?.shopName || "-"}</strong>
                  <p>
                    {r?.date || "-"} / {r?.time || "-"}
                  </p>
                  <p>유저: {r?.user?.id || r?.userId || "-"}</p>
                  <p>서비스: {r?.serviceType || "-"}</p>
                  <p>상태: {r?.status || "-"}</p>
                </div>

                <div style={actions}>
                  <button
                    style={approveBtn}
                    onClick={() => updateStatus(r?._id || r?.id, "approved")}
                  >
                    승인
                  </button>

                  <button
                    style={completeBtn}
                    onClick={() => updateStatus(r?._id || r?.id, "completed")}
                  >
                    완료
                  </button>

                  <button
                    style={cancelBtn}
                    onClick={() => updateStatus(r?._id || r?.id, "cancelled")}
                  >
                    취소
                  </button>

                  <button
                    style={dangerBtn}
                    onClick={() => remove(r?._id || r?.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}

          {list.length === 0 && (
            <EmptyState message="예약 데이터 없음" />
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
STYLE (블랙/골드)
========================= */

const container = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: 20,
  background: "#000",
  color: "#d4af37",
  minHeight: "100vh",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 15,
};

const statsBox = {
  display: "flex",
  gap: 15,
  marginBottom: 15,
};

const filterBox = {
  display: "flex",
  gap: 10,
  marginBottom: 10,
};

const quickFilterBox = {
  display: "flex",
  gap: 8,
  marginBottom: 15,
};

const input = {
  padding: 10,
  border: "1px solid #333",
  borderRadius: 8,
  background: "#000",
  color: "#fff",
};

const primaryBtn = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 8,
  background: "#d4af37",
  color: "#000",
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "10px 14px",
  border: "1px solid #444",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const listWrap = {
  display: "grid",
  gap: 10,
};

const card = {
  padding: 15,
  border: "1px solid #333",
  borderRadius: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#111",
};

const actions = {
  display: "flex",
  gap: 8,
};

const smallBtn = {
  padding: "6px 10px",
  border: "1px solid #444",
  borderRadius: 6,
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const approveBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: 6,
  background: "#d4af37",
  color: "#000",
  cursor: "pointer",
};

const completeBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: 6,
  background: "#28a745",
  color: "#fff",
  cursor: "pointer",
};

const cancelBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: 6,
  background: "#ff8800",
  color: "#fff",
  cursor: "pointer",
};

const dangerBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: 6,
  background: "#dc3545",
  color: "#fff",
  cursor: "pointer",
};

export default AdminReservationPage;