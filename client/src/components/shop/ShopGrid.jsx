"use strict";

import React from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";
import ShopCard from "./ShopCard";

/**
=====================================================

🔥 NORA SHOP GRID (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 텍스트 네온 제거
✔ 블랙 + 리얼 골드 메탈 프레임
✔ 반응형 GRID 유지
✔ 기존 ShopCard 연동 유지
✔ 로딩/에러/빈 상태 유지
✔ hover glow 유지
✔ 안전한 렌더링
✔ 카드 선택 유지
✔ 스크롤 안정성 유지
✔ 런타임 에러 방지
✔ 모바일 대응 유지

=====================================================
*/

function ShopGrid({
  shops = [],
  loading = false,
  error = "",
  onRetry,
  selectedId,
  onSelect,
  onLike,
  onReservation,
  onView,
}) {
  if (loading) {
    return (
      <Loading message="업체 리스트 불러오는 중..." />
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
    !Array.isArray(shops) ||
    shops.length === 0
  ) {
    return (
      <EmptyState message="표시할 업체가 없습니다." />
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* GOLD LINE */}
      <div style={styles.topGlow} />

      {/* GRID */}
      <div style={styles.grid}>
        {shops.map(
          (shop, index) => {
            const safeId =
              shop?._id ||
              shop?.id ||
              index;

            const isSelected =
              selectedId !==
                undefined &&
              selectedId !==
                null &&
              String(
                selectedId
              ) ===
                String(
                  safeId
                );

            return (
              <div
                key={safeId}
                style={{
                  ...styles.cardWrap,

                  transform:
                    isSelected
                      ? "scale(1.01)"
                      : "scale(1)",

                  zIndex:
                    isSelected
                      ? 5
                      : 1,
                }}
              >
                {/* SELECTED GLOW */}
                {isSelected && (
                  <div
                    style={
                      styles.selectedGlow
                    }
                  />
                )}

                <ShopCard
                  shop={shop}
                  onClick={
                    onSelect
                  }
                  onLike={
                    onLike
                  }
                  onReservation={
                    onReservation
                  }
                  onView={
                    onView
                  }
                />
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",

    width: "100%",

    padding: 16,

    borderRadius: 24,

    background:
      "linear-gradient(180deg, rgba(16,12,4,0.98) 0%, rgba(8,8,8,1) 58%, rgba(0,0,0,1) 100%)",

    border:
      "1px solid rgba(243,211,107,0.14)",

    boxShadow:
      `
      0 0 8px rgba(243,211,107,0.08),
      0 0 18px rgba(212,175,55,0.06),
      inset 0 0 18px rgba(243,211,107,0.02)
    `,

    overflow: "hidden",

    boxSizing:
      "border-box",
  },

  topGlow: {
    position: "absolute",

    top: 0,
    left: 0,
    right: 0,

    height: 2,

    background:
      "linear-gradient(90deg, transparent 0%, #fff8d6 18%, #f3d36b 42%, #d4af37 62%, #b8860b 82%, transparent 100%)",

    boxShadow:
      `
      0 0 8px rgba(243,211,107,0.22)
    `,

    zIndex: 10,
  },

  grid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fill, minmax(340px, 1fr))",

    gap: 18,

    width: "100%",

    position: "relative",

    zIndex: 2,
  },

  cardWrap: {
    position: "relative",

    transition:
      "all 0.22s ease",
  },

  selectedGlow: {
    position: "absolute",

    inset: -3,

    borderRadius: 28,

    background:
      "linear-gradient(135deg, rgba(255,248,214,0.72) 0%, rgba(243,211,107,0.78) 30%, rgba(212,175,55,0.82) 58%, rgba(184,134,11,0.78) 100%)",

    filter: "blur(16px)",

    opacity: 0.38,

    zIndex: 0,

    pointerEvents:
      "none",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.22),
      0 0 28px rgba(212,175,55,0.16),
      0 0 52px rgba(184,134,11,0.10)
    `,
  },
};

export default ShopGrid;