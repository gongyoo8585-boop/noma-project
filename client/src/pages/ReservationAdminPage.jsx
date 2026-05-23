"use strict";

import React, { useEffect, useState } from "react";
import reservationApi from "../services/reservation.api";
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 RESERVATION ADMIN PAGE (FULL COMPLETE)
 * =====================================================
 */

function ReservationAdminPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [shopId, setShopId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await reservationApi.getAdminList({
        status,
        date,
        shopId,
      });

      setList(res.list || res.items || []);
    } catch (e) {
      setError(e.message || "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, next) => {
    try {
      await reservationApi.updateStatus(id, next);
      load();
    } catch (e) {
      alert(e.message || "상태 변경 실패");
    }
  };

  const forceCancel = async (id) => {
    if (!window.confirm("강제 취소하시겠습니까?")) return;

    try {
      await reservationApi.cancel(id);
      load();
    } catch (e) {
      alert(e.message || "취소 실패");
    }
  };

  const getNextStatus = (current) => {
    if (current === "pending") return "approved";
    if (current === "approved") return "completed";
    return null;
  };

  return (
    <div style={wrap}>
      <h2>예약 관리</h2>

      {/* 필터 */}
      <div style={filterBox}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">전체</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          placeholder="shopId"
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
        />

        <button onClick={load}>검색</button>
      </div>

      {/* 상태 */}
      {loading && <Loading />}
      {error && <ErrorMessage message={error} />}
      {!loading && list.length === 0 && <EmptyState message="데이터 없음" />}

      {/* 리스트 */}
      <div>
        {list.map((r) => {
          const next = getNextStatus(r.status);

          return (
            <div key={r._id} style={card}>
              <div><b>매장:</b> {r.shop?.name}</div>
              <div><b>유저:</b> {r.user?.email}</div>
              <div><b>날짜:</b> {r.date} {r.time}</div>
              <div><b>상태:</b> {r.status}</div>

              <div style={btnRow}>
                {next && (
                  <button
                    style={btn}
                    onClick={() => updateStatus(r._id, next)}
                  >
                    → {next}
                  </button>
                )}

                {r.status !== "cancelled" && (
                  <button
                    style={danger}
                    onClick={() => forceCancel(r._id)}
                  >
                    강제 취소
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
STYLE
========================= */
const wrap = {
  padding: 20,
  color: "#fff",
  background: "#000",
  minHeight: "100vh",
};

const filterBox = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
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
  background: "#d4af37",
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

export default ReservationAdminPage;