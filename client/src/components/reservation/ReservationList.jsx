"use strict";

import React, { useEffect, useState } from "react";
import reservationApi from "../../services/reservation.api";
import ReservationItem from "./ReservationItem";

/* 🔥 추가 */
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 RESERVATION LIST (ULTRA FINAL - ERROR UI PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ Loading / Error / Empty 최소 추가
 * ✔ 기존 흐름 유지
 * =====================================================
 */

function ReservationList({ admin = false }) {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [useTx, setUseTx] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalize = (res) => {
    return Array.isArray(res)
      ? res
      : Array.isArray(res?.list)
      ? res.list
      : Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res?.reservations)
      ? res.reservations
      : Array.isArray(res?.data)
      ? res.data
      : [];
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const res = admin
        ? await reservationApi.getAdminList({ status })
        : await reservationApi.getMyList({ status });

      setList(normalize(res));
    } catch (e) {
      setError(e.message || "예약 목록 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!id) return;

    if (!window.confirm("예약을 취소하시겠습니까?")) return;

    try {
      setLoading(true);

      if (useTx) {
        await reservationApi.cancelTx(id);
      } else {
        await reservationApi.cancel(id);
      }

      await load();
      alert("예약 취소 완료");
    } catch (e) {
      alert(e.message || "예약 취소 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, admin]);

  return (
    <div style={styles.wrap}>
      {/* 컨트롤 */}
      <div style={styles.top}>
        <div style={styles.controls}>
          {admin && (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={styles.select}
            >
              <option value="">전체</option>
              <option value="pending">대기</option>
              <option value="approved">승인</option>
              <option value="confirmed">확정</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
            </select>
          )}

          <label style={styles.check}>
            <input
              type="checkbox"
              checked={useTx}
              onChange={(e) => setUseTx(e.target.checked)}
            />
            트랜잭션 취소
          </label>
        </div>

        <button onClick={load} style={styles.reload}>
          새로고침
        </button>
      </div>

      {/* 상태 */}
      {error && <ErrorMessage message={error} onRetry={load} />}
      {loading && <Loading message="예약 불러오는 중..." />}

      {!loading && list.length === 0 && !error && (
        <EmptyState message="예약이 없습니다." />
      )}

      {/* 리스트 */}
      <div style={styles.list}>
        {!loading && !error &&
          list.map((item, idx) => (
            <ReservationItem
              key={item?._id || idx}
              reservation={item}
              onCancel={handleCancel}
            />
          ))}
      </div>
    </div>
  );
}

/* =========================
🔥 스타일
========================= */
const styles = {
  wrap: {
    display: "grid",
    gap: 12,
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  select: {
    padding: 8,
    background: "#000",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: 8,
  },
  check: {
    display: "flex",
    gap: 6,
    color: "#fff",
    alignItems: "center",
  },
  reload: {
    padding: "8px 12px",
    background: "#d4af37",
    color: "#000",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
  list: {
    display: "grid",
    gap: 12,
  },
};

export default ReservationList;