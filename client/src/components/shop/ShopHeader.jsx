"use strict";

import React, {
  useMemo,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

/**
=====================================================

🔥 NORA SHOP HEADER (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ 검색창 유지
✔ 지역 선택 유지
✔ 카테고리 유지
✔ 정렬 유지
✔ 통계 표시 유지
✔ hover glow 유지
✔ 반응형 유지
✔ 로딩/에러/빈 상태 대응
✔ 런타임 에러 방지

=====================================================
*/

function ShopHeader({
  title = "NORA",
  subTitle = "프리미엄 마사지 플랫폼",
  search = "",
  onSearch,
  region = "",
  regions = [],
  onRegionChange,
  category = "",
  categories = [],
  onCategoryChange,
  sort = "",
  sorts = [],
  onSortChange,
  total = 0,
  loading = false,
  error = "",
  onRetry,
}) {
  const safeRegions =
    useMemo(() => {
      return Array.isArray(
        regions
      )
        ? regions
        : [];
    }, [regions]);

  const safeCategories =
    useMemo(() => {
      return Array.isArray(
        categories
      )
        ? categories
        : [];
    }, [categories]);

  const safeSorts =
    useMemo(() => {
      return Array.isArray(
        sorts
      )
        ? sorts
        : [];
    }, [sorts]);

  if (loading) {
    return (
      <Loading message="헤더 정보를 불러오는 중..." />
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
    !title &&
    !subTitle &&
    total === 0
  ) {
    return (
      <EmptyState message="헤더 데이터가 없습니다." />
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* 🔥 OUTER GLOW */}
      <div style={styles.outerGlow} />

      <div style={styles.container}>
        {/* 🔥 TOP GOLD LINE */}
        <div style={styles.topGlow} />

        {/* 🔥 HEADER TOP */}
        <div style={styles.topSection}>
          <div style={styles.left}>
            <div style={styles.logoRow}>
              <div style={styles.logoGlow}>
                N
              </div>

              <div>
                <div
                  style={
                    styles.title
                  }
                >
                  {title}
                </div>

                <div
                  style={
                    styles.subTitle
                  }
                >
                  {
                    subTitle
                  }
                </div>
              </div>
            </div>
          </div>

          <div
            style={
              styles.right
            }
          >
            <div
              style={
                styles.totalCard
              }
            >
              <div
                style={
                  styles.totalLabel
                }
              >
                전체 업체
              </div>

              <div
                style={
                  styles.totalValue
                }
              >
                {Number(
                  total || 0
                ).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 FILTER SECTION */}
        <div
          style={
            styles.filterSection
          }
        >
          {/* 🔥 SEARCH */}
          <div
            style={
              styles.searchWrap
            }
          >
            <div
              style={
                styles.searchIcon
              }
            >
              🔍
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                onSearch &&
                onSearch(
                  e.target.value
                )
              }
              placeholder="업체명 / 지역 / 코스 검색"
              style={
                styles.searchInput
              }
            />
          </div>

          {/* 🔥 REGION */}
          <select
            value={region}
            onChange={(e) =>
              onRegionChange &&
              onRegionChange(
                e.target.value
              )
            }
            style={
              styles.select
            }
          >
            <option value="">
              전체 지역
            </option>

            {safeRegions.map(
              (
                item,
                index
              ) => (
                <option
                  key={
                    item ||
                    index
                  }
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          {/* 🔥 CATEGORY */}
          <select
            value={category}
            onChange={(e) =>
              onCategoryChange &&
              onCategoryChange(
                e.target.value
              )
            }
            style={
              styles.select
            }
          >
            <option value="">
              전체 카테고리
            </option>

            {safeCategories.map(
              (
                item,
                index
              ) => (
                <option
                  key={
                    item ||
                    index
                  }
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          {/* 🔥 SORT */}
          <select
            value={sort}
            onChange={(e) =>
              onSortChange &&
              onSortChange(
                e.target.value
              )
            }
            style={
              styles.select
            }
          >
            <option value="">
              정렬 선택
            </option>

            {safeSorts.map(
              (
                item,
                index
              ) => (
                <option
                  key={
                    item?.value ||
                    index
                  }
                  value={
                    item?.value ||
                    item
                  }
                >
                  {item?.label ||
                    item}
                </option>
              )
            )}
          </select>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",

    width: "100%",

    marginBottom: 22,
  },

  outerGlow: {
    position: "absolute",

    inset: 0,

    borderRadius: 34,

    background:
      "linear-gradient(135deg, rgba(255,248,214,0.92) 0%, rgba(243,211,107,0.92) 30%, rgba(212,175,55,0.96) 58%, rgba(184,134,11,0.92) 100%)",

    filter: "blur(22px)",

    opacity: 0.16,

    pointerEvents:
      "none",

    boxShadow:
      `
      0 0 20px rgba(243,211,107,0.52),
      0 0 48px rgba(212,175,55,0.24)
    `,
  },

  container: {
    position: "relative",

    overflow: "hidden",

    borderRadius: 30,

    padding: 26,

    background:
      "linear-gradient(180deg, rgba(18,14,4,0.98) 0%, rgba(8,8,8,0.99) 58%, rgba(0,0,0,1) 100%)",

    border:
      "2px solid rgba(212,175,55,0.92)",

    boxShadow:
      `
      0 0 14px rgba(243,211,107,0.22),
      0 0 30px rgba(212,175,55,0.14),
      inset 0 0 24px rgba(243,211,107,0.03)
    `,

    backdropFilter:
      "blur(14px)",
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
      0 0 18px rgba(243,211,107,0.82)
    `,
  },

  topSection: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    gap: 20,

    flexWrap: "wrap",

    marginBottom: 24,
  },

  left: {
    flex: 1,
  },

  right: {
    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "flex-end",
  },

  logoRow: {
    display: "flex",

    alignItems:
      "center",

    gap: 16,
  },

  logoGlow: {
    width: 64,
    height: 64,

    borderRadius: 20,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)",

    color: "#fff",

    fontSize: 34,

    fontWeight: 900,

    boxShadow:
      `
      0 0 18px rgba(255,0,128,0.72),
      0 0 36px rgba(255,0,128,0.24)
    `,

    textShadow:
      `
      0 0 12px rgba(255,255,255,0.42)
    `,
  },

  title: {
    background:
      "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)",

    WebkitBackgroundClip:
      "text",

    WebkitTextFillColor:
      "transparent",

    fontSize: 38,

    fontWeight: 900,

    lineHeight: 1.1,

    textShadow:
      `
      0 0 14px rgba(243,211,107,0.28)
    `,
  },

  subTitle: {
    marginTop: 8,

    color:
      "rgba(255,255,255,0.68)",

    fontSize: 14,

    lineHeight: 1.6,
  },

  totalCard: {
    minWidth: 140,

    padding:
      "16px 18px",

    borderRadius: 18,

    background:
      "rgba(243,211,107,0.06)",

    border:
      "1px solid rgba(243,211,107,0.16)",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.08)
    `,
  },

  totalLabel: {
    color:
      "rgba(255,255,255,0.62)",

    fontSize: 13,

    marginBottom: 8,
  },

  totalValue: {
    background:
      "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)",

    WebkitBackgroundClip:
      "text",

    WebkitTextFillColor:
      "transparent",

    fontSize: 30,

    fontWeight: 900,

    lineHeight: 1.1,

    textShadow:
      `
      0 0 14px rgba(243,211,107,0.32)
    `,
  },

  filterSection: {
    display: "grid",

    gridTemplateColumns:
      "minmax(260px, 1fr) repeat(3, minmax(160px, 220px))",

    gap: 14,

    alignItems:
      "center",
  },

  searchWrap: {
    position: "relative",

    height: 58,

    display: "flex",

    alignItems:
      "center",

    borderRadius: 18,

    overflow: "hidden",

    background:
      "rgba(255,255,255,0.03)",

    border:
      "1px solid rgba(243,211,107,0.18)",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.08),
      inset 0 0 18px rgba(243,211,107,0.02)
    `,
  },

  searchIcon: {
    width: 56,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize: 18,

    color: "#F3D36B",
  },

  searchInput: {
    flex: 1,

    height: "100%",

    border: "none",

    outline: "none",

    background:
      "transparent",

    color: "#fff",

    fontSize: 15,

    paddingRight: 16,
  },

  select: {
    height: 58,

    borderRadius: 18,

    border:
      "1px solid rgba(243,211,107,0.18)",

    background:
      "rgba(255,255,255,0.03)",

    color: "#F3D36B",

    fontSize: 14,

    fontWeight: 700,

    padding:
      "0 16px",

    outline: "none",

    cursor: "pointer",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.06),
      inset 0 0 18px rgba(243,211,107,0.02)
    `,
  },
};

export default ShopHeader;