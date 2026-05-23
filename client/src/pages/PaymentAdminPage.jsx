"use strict";

import React, { useCallback, useEffect, useState } from "react";

import paymentApi from "../services/payment.api";

import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * 🔥 PAYMENT ADMIN PAGE
 * ✔ 기존 구조 유지
 * ✔ 결제 목록 조회
 * ✔ 결제 상태 확인
 * ✔ 관리자 환불 처리
 * ✔ loading / error / empty 상태 대응
 * ✔ 최소 기능 추가만 적용
 * =====================================================
 */

export default function PaymentAdminPage() {
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [status, setStatus] = useState("");

  const [keyword, setKeyword] = useState("");

  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [listRes, statsRes] = await Promise.all([
        paymentApi.getAdminList({
          status,
          keyword,
        }),
        paymentApi.getStats(),
      ]);

      const safeItems = Array.isArray(listRes)
        ? listRes
        : listRes?.items ||
          listRes?.list ||
          listRes?.data ||
          [];

      setItems(safeItems);

      setStats(statsRes || null);
    } catch (e) {
      setError(
        e?.message || "결제 목록 조회 실패"
      );
    } finally {
      setLoading(false);
    }
  }, [status, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefund = async (item) => {
    try {
      if (!item?._id) {
        alert("결제 정보 오류");
        return;
      }

      const ok = window.confirm(
        "환불 처리하시겠습니까?"
      );

      if (!ok) return;

      await paymentApi.refund(item._id);

      alert("환불 처리 완료");

      load();
    } catch (e) {
      alert(
        e?.message || "환불 처리 실패"
      );
    }
  };

  /* =========================
  loading
  ========================= */
  if (loading) {
    return <Loading />;
  }

  /* =========================
  error
  ========================= */
  if (error) {
    return (
      <ErrorMessage message={error} />
    );
  }

  /* =========================
  empty
  ========================= */
  if (!items.length) {
    return (
      <div className="payment-admin-page">
        <div className="admin-header">
          <h2>결제 관리</h2>
        </div>

        <div
          style={{
            marginBottom: 20,
            display: "flex",
            gap: 10,
          }}
        >
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
          >
            <option value="">
              전체 상태
            </option>

            <option value="ready">
              ready
            </option>

            <option value="paid">
              paid
            </option>

            <option value="cancelled">
              cancelled
            </option>

            <option value="fail">
              fail
            </option>
          </select>

          <input
            value={keyword}
            onChange={(e) =>
              setKeyword(e.target.value)
            }
            placeholder="검색"
          />

          <button onClick={load}>
            검색
          </button>
        </div>

        <EmptyState message="결제 내역이 없습니다." />
      </div>
    );
  }

  return (
    <div className="payment-admin-page">
      <div className="admin-header">
        <h2>결제 관리</h2>
      </div>

      {/* =========================
      통계
      ========================= */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div className="admin-card">
            <strong>전체</strong>
            <div>{stats.total || 0}</div>
          </div>

          <div className="admin-card">
            <strong>결제완료</strong>
            <div>{stats.paid || 0}</div>
          </div>

          <div className="admin-card">
            <strong>취소</strong>
            <div>
              {stats.cancelled || 0}
            </div>
          </div>

          <div className="admin-card">
            <strong>실패</strong>
            <div>{stats.failed || 0}</div>
          </div>

          <div className="admin-card">
            <strong>매출</strong>
            <div>
              ₩
              {Number(
                stats.revenue || 0
              ).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* =========================
      필터
      ========================= */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
        >
          <option value="">
            전체 상태
          </option>

          <option value="ready">
            ready
          </option>

          <option value="paid">
            paid
          </option>

          <option value="cancelled">
            cancelled
          </option>

          <option value="fail">
            fail
          </option>
        </select>

        <input
          value={keyword}
          onChange={(e) =>
            setKeyword(e.target.value)
          }
          placeholder="tid / 실패사유 검색"
        />

        <button onClick={load}>
          검색
        </button>
      </div>

      {/* =========================
      테이블
      ========================= */}
      <div
        style={{
          overflowX: "auto",
        }}
      >
        <table
          width="100%"
          border="1"
          cellPadding="10"
          style={{
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>상태</th>
              <th>금액</th>
              <th>결제수단</th>
              <th>TID</th>
              <th>사용자</th>
              <th>예약</th>
              <th>생성일</th>
              <th>관리</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                <td>
                  {item.status || "-"}
                </td>

                <td>
                  ₩
                  {Number(
                    item.amount || 0
                  ).toLocaleString()}
                </td>

                <td>
                  {item.method || "-"}
                </td>

                <td>
                  {item.tid || "-"}
                </td>

                <td>
                  {item.user?.name ||
                    item.user?.email ||
                    "-"}
                </td>

                <td>
                  {item.reservation?._id ||
                    "-"}
                </td>

                <td>
                  {item.createdAt
                    ? new Date(
                        item.createdAt
                      ).toLocaleString()
                    : "-"}
                </td>

                <td>
                  {item.status ===
                    "paid" && (
                    <button
                      onClick={() =>
                        handleRefund(item)
                      }
                    >
                      환불
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}