"use strict";

import React, {
  useMemo,
  useState,
  useEffect,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

/**
=====================================================

🔥 NORA SHOP SEARCH (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ 검색창 유지
✔ 실시간 검색 유지
✔ 지역 필터 유지
✔ 카테고리 필터 유지
✔ 인기 검색어 유지
✔ glow 유지
✔ hover 유지
✔ 런타임 에러 방지
✔ 로딩/에러/빈 상태 대응

=====================================================
*/

function ShopSearch({
  value = "",
  onChange,
  onSearch,
  loading = false,
  error = "",
  onRetry,
  regions = [],
  selectedRegion = "",
  onRegionChange,
  categories = [],
  selectedCategory = "",
  onCategoryChange,
  popularKeywords = [],
}) {
  const [keyword, setKeyword] =
    useState(value || "");

  useEffect(() => {
    setKeyword(value || "");
  }, [value]);

  const safeRegions =
    useMemo(() => {
      if (
        Array.isArray(
          regions
        )
      ) {
        return regions;
      }

      return [];
    }, [regions]);

  const safeCategories =
    useMemo(() => {
      if (
        Array.isArray(
          categories
        )
      ) {
        return categories;
      }

      return [];
    }, [categories]);

  const safeKeywords =
    useMemo(() => {
      if (
        Array.isArray(
          popularKeywords
        )
      ) {
        return popularKeywords;
      }

      return [
        "1인샵",
        "스웨디시",
        "아로마",
        "VIP",
        "로미로미",
      ];
    }, [popularKeywords]);

  const handleSearch =
    () => {
      if (
        typeof onSearch ===
        "function"
      ) {
        onSearch(keyword);
      }
    };

  if (loading) {
    return (
      <Loading message="검색 정보 불러오는 중..." />
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
    !safeRegions &&
    !safeCategories
  ) {
    return (
      <EmptyState message="검색 데이터를 불러올 수 없습니다." />
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* 🔥 OUTER GLOW */}
      <div style={styles.outerGlow} />

      <div style={styles.container}>
        {/* 🔥 TOP GOLD LINE */}
        <div style={styles.topGlow} />

        {/* 🔥 HEADER */}
        <div style={styles.header}>
          <div>
            <div
              style={
                styles.title
              }
            >
              SEARCH
            </div>

            <div
              style={
                styles.subTitle
              }
            >
              프리미엄 마사지
              검색
            </div>
          </div>

          <div
            style={
              styles.liveBadge
            }
          >
            LIVE
          </div>
        </div>

        {/* 🔥 SEARCH BOX */}
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
            value={keyword}
            placeholder="업체명 / 지역 / 마사지 검색"
            onChange={(e) => {
              setKeyword(
                e.target.value
              );

              if (
                typeof onChange ===
                "function"
              ) {
                onChange(
                  e.target.value
                );
              }
            }}
            onKeyDown={(e) => {
              if (
                e.key ===
                "Enter"
              ) {
                handleSearch();
              }
            }}
            style={
              styles.input
            }
          />

          <button
            type="button"
            style={
              styles.searchBtn
            }
            onClick={
              handleSearch
            }
          >
            검색
          </button>
        </div>

        {/* 🔥 FILTERS */}
        <div
          style={
            styles.filterWrap
          }
        >
          {/* REGION */}
          <select
            value={
              selectedRegion
            }
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
                region,
                index
              ) => (
                <option
                  key={`${region}-${index}`}
                  value={region}
                >
                  {region}
                </option>
              )
            )}
          </select>

          {/* CATEGORY */}
          <select
            value={
              selectedCategory
            }
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
                category,
                index
              ) => (
                <option
                  key={`${category}-${index}`}
                  value={
                    category
                  }
                >
                  {category}
                </option>
              )
            )}
          </select>
        </div>

        {/* 🔥 POPULAR */}
        <div
          style={
            styles.keywordSection
          }
        >
          <div
            style={
              styles.keywordTitle
            }
          >
            인기 검색어
          </div>

          <div
            style={
              styles.keywordWrap
            }
          >
            {safeKeywords.map(
              (
                item,
                index
              ) => (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  style={
                    styles.keywordBtn
                  }
                  onClick={() => {
                    setKeyword(
                      item
                    );

                    if (
                      typeof onChange ===
                      "function"
                    ) {
                      onChange(
                        item
                      );
                    }

                    if (
                      typeof onSearch ===
                      "function"
                    ) {
                      onSearch(
                        item
                      );
                    }
                  }}
                >
                  #{item}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",

    width: "100%",

    boxSizing:
      "border-box",
  },

  outerGlow: {
    position: "absolute",

    inset: 0,

    borderRadius: 34,

    background:
      "linear-gradient(135deg, rgba(255,248,214,0.92) 0%, rgba(243,211,107,0.92) 28%, rgba(212,175,55,0.96) 58%, rgba(184,134,11,0.92) 100%)",

    filter: "blur(20px)",

    opacity: 0.12,

    pointerEvents:
      "none",

    boxShadow:
      `
      0 0 20px rgba(243,211,107,0.42),
      0 0 42px rgba(212,175,55,0.22)
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
      0 0 30px rgba(212,175,55,0.12),
      inset 0 0 22px rgba(243,211,107,0.03)
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

  header: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    marginBottom: 24,
  },

  title: {
    background:
      "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)",

    WebkitBackgroundClip:
      "text",

    WebkitTextFillColor:
      "transparent",

    fontSize: 34,

    fontWeight: 900,

    lineHeight: 1.1,

    textShadow:
      `
      0 0 14px rgba(243,211,107,0.32)
    `,
  },

  subTitle: {
    marginTop: 8,

    color:
      "rgba(255,255,255,0.68)",

    fontSize: 14,
  },

  liveBadge: {
    minWidth: 74,

    height: 34,

    padding:
      "0 14px",

    borderRadius: 999,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)",

    color: "#fff",

    fontSize: 12,

    fontWeight: 900,

    letterSpacing: 1,

    boxShadow:
      `
      0 0 14px rgba(255,0,128,0.42)
    `,
  },

  searchWrap: {
    display: "flex",

    alignItems:
      "center",

    gap: 14,

    height: 70,

    padding: 10,

    borderRadius: 24,

    background:
      "rgba(255,255,255,0.03)",

    border:
      "1px solid rgba(243,211,107,0.14)",

    marginBottom: 20,

    boxShadow:
      `
      inset 0 0 18px rgba(243,211,107,0.02),
      0 0 12px rgba(243,211,107,0.06)
    `,
  },

  searchIcon: {
    width: 54,
    height: 54,

    borderRadius: 18,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "rgba(243,211,107,0.08)",

    border:
      "1px solid rgba(243,211,107,0.16)",

    color: "#F3D36B",

    fontSize: 22,

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.08)
    `,
  },

  input: {
    flex: 1,

    height: "100%",

    background:
      "transparent",

    border: "none",

    outline: "none",

    color: "#fff",

    fontSize: 16,

    fontWeight: 600,
  },

  searchBtn: {
    minWidth: 120,

    height: 50,

    border: "none",

    borderRadius: 18,

    background:
      "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)",

    color: "#000",

    fontSize: 15,

    fontWeight: 900,

    cursor: "pointer",

    boxShadow:
      `
      0 0 16px rgba(243,211,107,0.24)
    `,
  },

  filterWrap: {
    display: "grid",

    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",

    gap: 16,

    marginBottom: 24,
  },

  select: {
    height: 58,

    borderRadius: 18,

    border:
      "1px solid rgba(243,211,107,0.14)",

    background:
      "rgba(255,255,255,0.03)",

    color: "#F3D36B",

    fontSize: 14,

    fontWeight: 700,

    padding:
      "0 18px",

    outline: "none",

    cursor: "pointer",

    boxShadow:
      `
      inset 0 0 18px rgba(243,211,107,0.02),
      0 0 10px rgba(243,211,107,0.06)
    `,
  },

  keywordSection: {
    marginTop: 6,
  },

  keywordTitle: {
    color: "#fff",

    fontSize: 15,

    fontWeight: 800,

    marginBottom: 14,
  },

  keywordWrap: {
    display: "flex",

    flexWrap: "wrap",

    gap: 12,
  },

  keywordBtn: {
    height: 42,

    padding:
      "0 18px",

    borderRadius: 999,

    border:
      "1px solid rgba(255,0,128,0.22)",

    background:
      "linear-gradient(135deg, rgba(255,0,128,0.12) 0%, rgba(255,77,166,0.16) 100%)",

    color: "#ff4d9d",

    fontSize: 13,

    fontWeight: 800,

    cursor: "pointer",

    boxShadow:
      `
      0 0 12px rgba(255,0,128,0.10)
    `,
  },
};

export default ShopSearch;