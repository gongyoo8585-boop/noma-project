"use strict";

import React, {
  memo,
  useMemo,
  useState,
} from "react";

/**
 * =====================================================
 * 🔥 NORA MAP SEARCH BAR
 * ✔ 네온 UI
 * ✔ 검색 안정화
 * ✔ Enter 검색 지원
 * ✔ 버튼 중복 클릭 방지
 * ✔ 안전한 value 처리
 * ✔ 지역/카테고리 필터 유지
 * ✔ 반응형 대응
 * ✔ 런타임 에러 방지
 * =====================================================
 */

function MapSearchBar({
  keyword = "",
  city = "",
  district = "",
  category = "",
  cityOptions = [],
  districtOptions = [],
  categoryOptions = [],
  loading = false,
  onKeywordChange = null,
  onCityChange = null,
  onDistrictChange = null,
  onCategoryChange = null,
  onSearch = null,
}) {
  const [isSearching, setIsSearching] =
    useState(false);

  const safeKeyword =
    keyword || "";

  const safeCity =
    city || "";

  const safeDistrict =
    district || "";

  const safeCategory =
    category || "";

  const safeCityOptions =
    Array.isArray(cityOptions)
      ? cityOptions
      : [];

  const safeDistrictOptions =
    Array.isArray(
      districtOptions
    )
      ? districtOptions
      : [];

  const safeCategoryOptions =
    Array.isArray(
      categoryOptions
    )
      ? categoryOptions
      : [];

  const disabled =
    loading || isSearching;

  const handleSearch =
    async () => {
      if (disabled) {
        return;
      }

      try {
        setIsSearching(true);

        if (
          typeof onSearch ===
          "function"
        ) {
          await Promise.resolve(
            onSearch({
              keyword:
                safeKeyword,
              city: safeCity,
              district:
                safeDistrict,
              category:
                safeCategory,
            })
          );
        }
      } catch (err) {
        console.error(
          "MapSearchBar Search Error:",
          err
        );
      } finally {
        setIsSearching(false);
      }
    };

  const wrapStyle = useMemo(() => {
    return {
      ...styles.wrap,

      opacity: disabled
        ? 0.85
        : 1,
    };
  }, [disabled]);

  return (
    <div style={wrapStyle}>
      {/* =========================
      🔥 FILTER ROW
      ========================= */}
      <div style={styles.filterRow}>
        {/* CITY */}
        <select
          value={safeCity}
          disabled={disabled}
          onChange={(e) => {
            try {
              if (
                typeof onCityChange ===
                "function"
              ) {
                onCityChange(
                  e.target.value
                );
              }
            } catch (err) {
              console.error(
                "City Change Error:",
                err
              );
            }
          }}
          style={styles.select}
        >
          <option value="">
            전체 지역
          </option>

          {safeCityOptions.map(
            (
              item,
              index
            ) => (
              <option
                key={`city-${index}`}
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

        {/* DISTRICT */}
        <select
          value={safeDistrict}
          disabled={disabled}
          onChange={(e) => {
            try {
              if (
                typeof onDistrictChange ===
                "function"
              ) {
                onDistrictChange(
                  e.target.value
                );
              }
            } catch (err) {
              console.error(
                "District Change Error:",
                err
              );
            }
          }}
          style={styles.select}
        >
          <option value="">
            전체 동네
          </option>

          {safeDistrictOptions.map(
            (
              item,
              index
            ) => (
              <option
                key={`district-${index}`}
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

        {/* CATEGORY */}
        <select
          value={safeCategory}
          disabled={disabled}
          onChange={(e) => {
            try {
              if (
                typeof onCategoryChange ===
                "function"
              ) {
                onCategoryChange(
                  e.target.value
                );
              }
            } catch (err) {
              console.error(
                "Category Change Error:",
                err
              );
            }
          }}
          style={styles.select}
        >
          <option value="">
            전체
          </option>

          {safeCategoryOptions.map(
            (
              item,
              index
            ) => (
              <option
                key={`category-${index}`}
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

      {/* =========================
      🔥 SEARCH ROW
      ========================= */}
      <div style={styles.searchRow}>
        <input
          type="text"
          value={safeKeyword}
          disabled={disabled}
          placeholder="지역, 매장명으로 검색"
          onChange={(e) => {
            try {
              if (
                typeof onKeywordChange ===
                "function"
              ) {
                onKeywordChange(
                  e.target.value
                );
              }
            } catch (err) {
              console.error(
                "Keyword Change Error:",
                err
              );
            }
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              handleSearch();
            }
          }}
          style={styles.input}
          autoComplete="off"
        />

        <button
          type="button"
          disabled={disabled}
          onClick={
            handleSearch
          }
          style={{
            ...styles.searchBtn,

            ...(disabled
              ? styles.disabledBtn
              : {}),
          }}
        >
          {loading ||
          isSearching
            ? "검색중..."
            : "⌕"}
        </button>
      </div>
    </div>
  );
}

/* =========================
🔥 STYLE
========================= */

const styles = {
  wrap: {
    width: "100%",

    display: "flex",
    flexDirection: "column",

    gap: 14,

    padding: 18,

    borderRadius: 24,

    background:
      "rgba(0,0,0,0.92)",

    border:
      "1px solid rgba(255,215,0,0.45)",

    boxShadow:
      "0 0 24px rgba(255,215,0,0.12), inset 0 0 18px rgba(255,215,0,0.06)",

    backdropFilter:
      "blur(16px)",

    boxSizing: "border-box",
  },

  filterRow: {
    width: "100%",

    display: "grid",

    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",

    gap: 12,
  },

  select: {
    width: "100%",
    height: 52,

    padding: "0 16px",

    borderRadius: 14,

    background:
      "rgba(10,10,10,0.95)",

    border:
      "1px solid rgba(255,215,0,0.55)",

    color: "#FFD700",

    fontSize: 15,
    fontWeight: 600,

    outline: "none",

    cursor: "pointer",

    boxShadow:
      "0 0 10px rgba(255,215,0,0.12)",

    boxSizing: "border-box",
  },

  searchRow: {
    width: "100%",

    display: "flex",

    alignItems: "center",

    gap: 12,
  },

  input: {
    flex: 1,

    height: 56,

    padding: "0 18px",

    borderRadius: 16,

    border:
      "1px solid rgba(255,215,0,0.55)",

    background:
      "rgba(8,8,8,0.96)",

    color: "#fff",

    fontSize: 16,

    outline: "none",

    boxSizing: "border-box",

    boxShadow:
      "0 0 12px rgba(255,215,0,0.08)",
  },

  searchBtn: {
    width: 64,
    height: 56,

    borderRadius: 16,

    border:
      "1px solid rgba(255,215,0,0.7)",

    background:
      "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)",

    color: "#fff",

    fontSize: 22,
    fontWeight: 800,

    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    boxShadow:
      "0 0 18px rgba(255,0,128,0.35)",

    transition:
      "all 0.22s ease",
  },

  disabledBtn: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
};

export default memo(
  MapSearchBar
);