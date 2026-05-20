"use strict";

import React from "react";
import Loading from "../../common/Loading";
import ErrorMessage from "../../common/ErrorMessage";
import EmptyState from "../../common/EmptyState";

/**
 * =====================================================
 * 🔥 DASHBOARD STATS
 * ✔ 관리자 통계 카드
 * ✔ 업체수
 * ✔ 회원수
 * ✔ 예약수
 * ✔ 매출
 * ✔ 일일 콜수
 * ✔ 일일 클릭수
 * ✔ 일일 전환수
 * ✔ 일일 리뷰수
 * ✔ 검정 + 골드 테마
 * ✔ 반응형
 * ✔ 기존 구조 영향 없음
 * =====================================================
 */

function DashboardStats({
  stats = {},
  loading = false,
  error = "",
  onRetry,
}) {
  if (loading) {
    return (
      <Loading message="통계 불러오는 중..." />
    );
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={onRetry}
      />
    );
  }

  if (
    !stats ||
    Object.keys(stats).length === 0
  ) {
    return (
      <EmptyState message="통계 데이터가 없습니다." />
    );
  }

  const numberFormat = (value) => {
    const num = Number(value || 0);

    return num.toLocaleString("ko-KR");
  };

  const statCards = [
    {
      label: "전체 업체수",
      value: stats.shops,
    },
    {
      label: "전체 회원수",
      value: stats.users,
    },
    {
      label: "전체 예약수",
      value:
        stats.reservations ||
        stats.reservationCount,
    },
    {
      label: "전체 매출",
      value: `${numberFormat(
        stats.revenue
      )}원`,
    },
    {
      label: "일일 콜수",
      value:
        stats.dailyCallCount ||
        stats.callCount ||
        0,
    },
    {
      label: "일일 클릭수",
      value:
        stats.dailyClickCount ||
        stats.clickCount ||
        0,
    },
    {
      label: "일일 전환수",
      value:
        stats.dailyConversionCount ||
        stats.conversionCount ||
        0,
    },
    {
      label: "일일 리뷰수",
      value:
        stats.dailyReviewCount ||
        stats.reviewCount ||
        0,
    },
  ];

  return (
    <div style={styles.grid}>
      {statCards.map(
        (item, index) => (
          <div
            key={`${item.label}-${index}`}
            style={styles.card}
          >
            <div style={styles.label}>
              {item.label}
            </div>

            <div style={styles.value}>
              {typeof item.value ===
              "string"
                ? item.value
                : numberFormat(
                    item.value
                  )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    width: "100%",
  },

  card: {
    background: "#050505",
    border: "1px solid #222",
    borderRadius: 16,
    padding: 24,
    minHeight: 120,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    boxShadow:
      "0 0 20px rgba(0,0,0,0.45)",
  },

  label: {
    color: "#888",
    fontSize: 14,
    marginBottom: 14,
    fontWeight: 500,
  },

  value: {
    color: "#d4af37",
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.2,
    wordBreak: "break-word",
  },
};

export default DashboardStats;