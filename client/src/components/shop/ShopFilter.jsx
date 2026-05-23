"use strict";

import React, {
  useMemo,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

/**
=====================================================

🔥 NORA SHOP FILTER (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ 지역 필터 유지
✔ 시/군/구 다음 동(읍/면/동) 필터 추가
✔ 카테고리 필터 유지
✔ 정렬 필터 유지
✔ 활성 상태 유지
✔ glow 유지
✔ hover 유지
✔ 런타임 에러 방지
✔ 로딩/에러/빈 상태 대응

=====================================================
*/

function ShopFilter({
  loading = false,
  error = "",
  onRetry,

  regions = [],
  selectedRegion = "",
  onRegionChange,

  dongs = [],
  selectedDong = "",
  onDongChange,

  categories = [],
  selectedCategory = "",
  onCategoryChange,

  sorts = [],
  selectedSort = "",
  onSortChange,
}) {
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

  const safeDongs =
    useMemo(() => {
      if (
        Array.isArray(
          dongs
        )
      ) {
        return dongs;
      }

      return [];
    }, [dongs]);

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

  const safeSorts =
    useMemo(() => {
      if (
        Array.isArray(
          sorts
        ) &&
        sorts.length > 0
      ) {
        return sorts;
      }

      return [
        "추천순",
        "인기순",
        "거리순",
        "리뷰순",
      ];
    }, [sorts]);

  if (loading) {
    return (
      <Loading message="필터 불러오는 중..." />
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
    safeRegions.length === 0 &&
    safeCategories.length === 0
  ) {
    return (
      <EmptyState message="필터 정보가 없습니다." />
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
              FILTER
            </div>

            <div
              style={
                styles.subTitle
              }
            >
              지역 / 동네 /
              카테고리 /
              정렬
            </div>
          </div>

          <div
            style={
              styles.badge
            }
          >
            PREMIUM
          </div>
        </div>

        {/* 🔥 REGION */}
        <div
          style={
            styles.section
          }
        >
          <div
            style={
              styles.sectionTitle
            }
          >
            지역 선택
          </div>

          <div
            style={
              styles.tagWrap
            }
          >
            <button
              type="button"
              onClick={() =>
                onRegionChange &&
                onRegionChange("")
              }
              style={{
                ...styles.tag,

                background:
                  !selectedRegion
                    ? "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)"
                    : "rgba(255,255,255,0.03)",

                color:
                  !selectedRegion
                    ? "#000"
                    : "#F3D36B",

                border:
                  !selectedRegion
                    ? "1px solid rgba(243,211,107,0.72)"
                    : "1px solid rgba(243,211,107,0.16)",

                boxShadow:
                  !selectedRegion
                    ? `
                    0 0 18px rgba(243,211,107,0.28)
                  `
                    : `
                    0 0 10px rgba(243,211,107,0.06)
                  `,
              }}
            >
              전체
            </button>

            {safeRegions.map(
              (
                region,
                index
              ) => {
                const active =
                  String(
                    selectedRegion
                  ) ===
                  String(
                    region
                  );

                return (
                  <button
                    key={`${region}-${index}`}
                    type="button"
                    onClick={() =>
                      onRegionChange &&
                      onRegionChange(
                        region
                      )
                    }
                    style={{
                      ...styles.tag,

                      background:
                        active
                          ? "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)"
                          : "rgba(255,255,255,0.03)",

                      color:
                        active
                          ? "#000"
                          : "#F3D36B",

                      border:
                        active
                          ? "1px solid rgba(243,211,107,0.72)"
                          : "1px solid rgba(243,211,107,0.16)",

                      boxShadow:
                        active
                          ? `
                          0 0 18px rgba(243,211,107,0.28)
                        `
                          : `
                          0 0 10px rgba(243,211,107,0.06)
                        `,
                    }}
                  >
                    {region}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* 🔥 DONG */}
        <div
          style={
            styles.section
          }
        >
          <div
            style={
              styles.sectionTitle
            }
          >
            동네 선택
          </div>

          <div
            style={
              styles.tagWrap
            }
          >
            <button
              type="button"
              onClick={() =>
                onDongChange &&
                onDongChange("")
              }
              style={{
                ...styles.tag,

                background:
                  !selectedDong
                    ? "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)"
                    : "rgba(255,255,255,0.03)",

                color:
                  !selectedDong
                    ? "#000"
                    : "#F3D36B",

                border:
                  !selectedDong
                    ? "1px solid rgba(243,211,107,0.72)"
                    : "1px solid rgba(243,211,107,0.16)",

                boxShadow:
                  !selectedDong
                    ? `
                    0 0 18px rgba(243,211,107,0.28)
                  `
                    : `
                    0 0 10px rgba(243,211,107,0.06)
                  `,
              }}
            >
              전체
            </button>

            {safeDongs.map(
              (
                dong,
                index
              ) => {
                const active =
                  String(
                    selectedDong
                  ) ===
                  String(
                    dong
                  );

                return (
                  <button
                    key={`${dong}-${index}`}
                    type="button"
                    onClick={() =>
                      onDongChange &&
                      onDongChange(
                        dong
                      )
                    }
                    style={{
                      ...styles.tag,

                      background:
                        active
                          ? "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)"
                          : "rgba(255,255,255,0.03)",

                      color:
                        active
                          ? "#000"
                          : "#F3D36B",

                      border:
                        active
                          ? "1px solid rgba(243,211,107,0.72)"
                          : "1px solid rgba(243,211,107,0.16)",

                      boxShadow:
                        active
                          ? `
                          0 0 18px rgba(243,211,107,0.28)
                        `
                          : `
                          0 0 10px rgba(243,211,107,0.06)
                        `,
                    }}
                  >
                    {dong}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* 🔥 CATEGORY */}
        <div
          style={
            styles.section
          }
        >
          <div
            style={
              styles.sectionTitle
            }
          >
            카테고리
          </div>

          <div
            style={
              styles.tagWrap
            }
          >
            <button
              type="button"
              onClick={() =>
                onCategoryChange &&
                onCategoryChange(
                  ""
                )
              }
              style={{
                ...styles.pinkTag,

                background:
                  !selectedCategory
                    ? "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)"
                    : "rgba(255,255,255,0.03)",

                color:
                  !selectedCategory
                    ? "#fff"
                    : "#ff4d9d",

                border:
                  !selectedCategory
                    ? "1px solid rgba(255,0,128,0.62)"
                    : "1px solid rgba(255,0,128,0.18)",

                boxShadow:
                  !selectedCategory
                    ? `
                    0 0 18px rgba(255,0,128,0.32)
                  `
                    : `
                    0 0 10px rgba(255,0,128,0.06)
                  `,
              }}
            >
              전체
            </button>

            {safeCategories.map(
              (
                category,
                index
              ) => {
                const active =
                  String(
                    selectedCategory
                  ) ===
                  String(
                    category
                  );

                return (
                  <button
                    key={`${category}-${index}`}
                    type="button"
                    onClick={() =>
                      onCategoryChange &&
                      onCategoryChange(
                        category
                      )
                    }
                    style={{
                      ...styles.pinkTag,

                      background:
                        active
                          ? "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)"
                          : "rgba(255,255,255,0.03)",

                      color:
                        active
                          ? "#fff"
                          : "#ff4d9d",

                      border:
                        active
                          ? "1px solid rgba(255,0,128,0.62)"
                          : "1px solid rgba(255,0,128,0.18)",

                      boxShadow:
                        active
                          ? `
                          0 0 18px rgba(255,0,128,0.32)
                        `
                          : `
                          0 0 10px rgba(255,0,128,0.06)
                        `,
                    }}
                  >
                    {category}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* 🔥 SORT */}
        <div
          style={
            styles.section
          }
        >
          <div
            style={
              styles.sectionTitle
            }
          >
            정렬 방식
          </div>

          <div
            style={
              styles.sortWrap
            }
          >
            {safeSorts.map(
              (
                sort,
                index
              ) => {
                const active =
                  String(
                    selectedSort
                  ) ===
                  String(sort);

                return (
                  <button
                    key={`${sort}-${index}`}
                    type="button"
                    onClick={() =>
                      onSortChange &&
                      onSortChange(
                        sort
                      )
                    }
                    style={{
                      ...styles.sortBtn,

                      background:
                        active
                          ? "linear-gradient(135deg, rgba(243,211,107,0.18) 0%, rgba(184,134,11,0.18) 100%)"
                          : "rgba(255,255,255,0.03)",

                      color:
                        active
                          ? "#F3D36B"
                          : "rgba(255,255,255,0.72)",

                      border:
                        active
                          ? "1px solid rgba(243,211,107,0.42)"
                          : "1px solid rgba(255,255,255,0.06)",

                      boxShadow:
                        active
                          ? `
                          0 0 18px rgba(243,211,107,0.22)
                        `
                          : `
                          0 0 10px rgba(243,211,107,0.04)
                        `,
                    }}
                  >
                    {sort}
                  </button>
                );
              }
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

    gap: 20,

    marginBottom: 28,
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

  badge: {
    minWidth: 100,

    height: 38,

    padding:
      "0 16px",

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
      0 0 18px rgba(255,0,128,0.28)
    `,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    color: "#fff",

    fontSize: 15,

    fontWeight: 800,

    marginBottom: 14,
  },

  tagWrap: {
    display: "flex",

    flexWrap: "wrap",

    gap: 12,
  },

  tag: {
    minHeight: 42,

    padding:
      "10px 18px",

    borderRadius: 999,

    fontSize: 13,

    fontWeight: 800,

    cursor: "pointer",

    transition:
      "all 0.22s ease",

    backdropFilter:
      "blur(10px)",

    WebkitBackdropFilter:
      "blur(10px)",
  },

  pinkTag: {
    minHeight: 42,

    padding:
      "10px 18px",

    borderRadius: 999,

    fontSize: 13,

    fontWeight: 800,

    cursor: "pointer",

    transition:
      "all 0.22s ease",

    backdropFilter:
      "blur(10px)",

    WebkitBackdropFilter:
      "blur(10px)",
  },

  sortWrap: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(120px, 1fr))",

    gap: 14,
  },

  sortBtn: {
    minHeight: 54,

    borderRadius: 18,

    fontSize: 14,

    fontWeight: 800,

    cursor: "pointer",

    transition:
      "all 0.22s ease",

    backdropFilter:
      "blur(10px)",

    WebkitBackdropFilter:
      "blur(10px)",
  },
};

export default ShopFilter;