"use strict";

import React, { useEffect, useState } from "react";
import reservationApi from "../../../services/reservation.api";
import ReservationAdminItem from "./ReservationAdminItem";

/* 🔥 추가 */
import Loading from "../../common/Loading";
import ErrorMessage from "../../common/ErrorMessage";
import EmptyState from "../../common/EmptyState";

/**
 * =====================================================
 * 🔥 RESERVATION ADMIN LIST (ULTRA FINAL STABLE PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ 공통 UI 컴포넌트 최소 추가 (Loading / Error / Empty)
 * ✔ 기존 로직 / 흐름 변경 없음
 * =====================================================
 */

function ReservationAdminList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchList = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await reservationApi.getAdminList();
      const data = res?.data || res?.items || res || [];

      setList(Array.isArray(data) ? data : []);

    } catch (e) {
      setError(e.message || "예약 목록 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleStatus = async (id, status) => {
    try {
      await reservationApi.updateStatus(id, status);

      setList((prev) =>
        prev.map((r) =>
          (r._id || r.id) === id ? { ...r, status } : r
        )
      );
    } catch (e) {
      setError(e.message || "상태 변경 실패");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("예약 취소하시겠습니까?")) return;

    try {
      await reservationApi.adminCancel(id);

      setList((prev) =>
        prev.map((r) =>
          (r._id || r.id) === id
            ? { ...r, status: "cancelled" }
            : r
        )
      );
    } catch (e) {
      setError(e.message || "취소 실패");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      await reservationApi.remove(id);

      setList((prev) =>
        prev.filter((r) => (r._id || r.id) !== id)
      );
    } catch (e) {
      setError(e.message || "삭제 실패");
    }
  };

  return (
    <div style={wrap}>
      {error && <ErrorMessage message={error} />}

      {loading ? (
        <Loading message="불러오는 중..." />
      ) : (
        <div style={listWrap}>
          {list.length === 0 && (
            <EmptyState message="예약이 없습니다." />
          )}

          {list.map((item) => (
            <ReservationAdminItem
              key={item._id || item.id}
              reservation={item}
              onStatusChange={handleStatus}
              onCancel={handleCancel}
              onDelete={handleDelete}
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

const wrap = {};

const listWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export default ReservationAdminList;