"use strict";

import React, { useEffect, useState } from "react";
import paymentApi from "../../../services/payment.api";
import PaymentAdminItem from "./PaymentAdminItem";

/* 🔥 추가 */
import Loading from "../../common/Loading";
import ErrorMessage from "../../common/ErrorMessage";
import EmptyState from "../../common/EmptyState";

/**
 * =====================================================
 * 🔥 PAYMENT ADMIN LIST (ULTRA FINAL STABLE PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ 공통 UI 컴포넌트 최소 추가 (Loading / Error / Empty)
 * ✔ 기존 로직 / 흐름 변경 없음
 * ✔ 에러 시 리스트 렌더 차단 (안전성 보강)
 * =====================================================
 */

function PaymentAdminList() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalize = (res) => {
    return Array.isArray(res)
      ? res
      : Array.isArray(res?.list)
      ? res.list
      : Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res?.payments)
      ? res.payments
      : Array.isArray(res?.data)
      ? res.data
      : [];
  };

  const fetchList = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await paymentApi.getAdminList({
        status,
      });

      setList(normalize(res));
    } catch (e) {
      setError(e.message || "결제 목록 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [status]);

  const handleRefund = async (id) => {
    if (!id) return;

    if (!window.confirm("해당 결제를 환불 처리하시겠습니까?")) return;

    try {
      setLoading(true);
      setError("");

      if (paymentApi.refund) {
        await paymentApi.refund(id);
      } else {
        await paymentApi.kakaoCancel({ paymentId: id });
      }

      setList((prev) =>
        prev.map((p) =>
          (p._id || p.id) === id
            ? { ...p, status: "cancelled" }
            : p
        )
      );

      alert("환불 처리 완료");
    } catch (e) {
      setError(e.message || "환불 처리 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async (id) => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await paymentApi.getDetail(id);
      const payment =
        res?.payment ||
        res?.data ||
        res?.item ||
        res ||
        null;

      if (payment) {
        setList((prev) =>
          prev.map((p) =>
            (p._id || p.id) === id ? { ...p, ...payment } : p
          )
        );
      }
    } catch (e) {
      setError(e.message || "결제 상태 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleDetail = (id) => {
    if (!id) return;
    window.location.href = `/admin/payments/${id}`;
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">전체</option>
          <option value="ready">결제 대기</option>
          <option value="paid">결제 완료</option>
          <option value="cancelled">결제 취소</option>
          <option value="fail">결제 실패</option>
        </select>

        <button type="button" onClick={fetchList} style={styles.reload}>
          새로고침
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading && <Loading message="불러오는 중..." />}

      {!loading && !error && list.length === 0 && (
        <EmptyState message="결제 내역이 없습니다." />
      )}

      {!loading && !error && list.length > 0 && (
        <div style={styles.list}>
          {list.map((payment, idx) => (
            <PaymentAdminItem
              key={payment?._id || payment?.id || idx}
              payment={payment}
              onRefund={handleRefund}
              onRefreshStatus={handleRefreshStatus}
              onDetail={handleDetail}
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
    display: "grid",
    gap: 12,
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  select: {
    padding: "8px 10px",
    background: "#000",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
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
    gap: 10,
  },
};

export default PaymentAdminList;