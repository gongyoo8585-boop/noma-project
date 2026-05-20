"use strict";

import React, {
  memo,
  useMemo,
  useState,
  useCallback,
} from "react";

/**
 * =========================================================
 * 🔥 NORA REGION FILTER
 * ---------------------------------------------------------
 * ✔ 시/도 선택
 * ✔ 지역 선택
 * ✔ 카테고리 선택
 * ✔ 네온 UI
 * ✔ 드롭다운 열림/닫힘
 * ✔ 외부 상태 연동
 * ✔ 모바일 대응
 * ✔ 런타임 에러 방지
 * ✔ 완성형 컴포넌트
 * =========================================================
 */

const DEFAULT_REGIONS = [
  "전체",
  "김해시",
  "창원시",
  "부산",
  "양산",
];

const DEFAULT_DISTRICTS = [
  "전체",
  "삼계동",
  "내동",
  "외동",
  "장유",
];

const DEFAULT_CATEGORIES = [
  "전체",
  "건식",
  "아로마",
  "스웨디시",
  "타이",
];

function RegionFilter({
  region = "김해시",
  district = "삼계동",
  category = "전체",

  regions = DEFAULT_REGIONS,
  districts = DEFAULT_DISTRICTS,
  categories = DEFAULT_CATEGORIES,

  loading = false,
  disabled = false,

  onRegionChange,
  onDistrictChange,
  onCategoryChange,
}) {
  const [openType, setOpenType] =
    useState(null);

  const safeRegions =
    useMemo(() => {
      return Array.isArray(
        regions
      )
        ? regions
        : DEFAULT_REGIONS;
    }, [regions]);

  const safeDistricts =
    useMemo(() => {
      return Array.isArray(
        districts
      )
        ? districts
        : DEFAULT_DISTRICTS;
    }, [districts]);

  const safeCategories =
    useMemo(() => {
      return Array.isArray(
        categories
      )
        ? categories
        : DEFAULT_CATEGORIES;
    }, [categories]);

  const handleToggle =
    useCallback(
      (type) => {
        if (
          loading ||
          disabled
        ) {
          return;
        }

        setOpenType((prev) =>
          prev === type
            ? null
            : type
        );
      },
      [loading, disabled]
    );

  const handleSelect =
    useCallback(
      (type, value) => {
        try {
          if (
            type === "region" &&
            typeof onRegionChange ===
              "function"
          ) {
            onRegionChange(value);
          }

          if (
            type ===
              "district" &&
            typeof onDistrictChange ===
              "function"
          ) {
            onDistrictChange(
              value
            );
          }

          if (
            type ===
              "category" &&
            typeof onCategoryChange ===
              "function"
          ) {
            onCategoryChange(
              value
            );
          }

          setOpenType(null);
        } catch (err) {
          console.error(
            "RegionFilter Select Error:",
            err
          );
        }
      },
      [
        onRegionChange,
        onDistrictChange,
        onCategoryChange,
      ]
    );

  return (
    <div style={styles.wrapper}>
      {/* =====================================
      REGION
      ===================================== */}
      <div style={styles.selectWrap}>
        <button
          type="button"
          onClick={() =>
            handleToggle(
              "region"
            )
          }
          disabled={
            loading ||
            disabled
          }
          style={{
            ...styles.selectButton,

            ...(openType ===
            "region"
              ? styles.activeButton
              : {}),
          }}
        >
          <span>
            {region ||
              "지역"}
          </span>

          <span
            style={{
              ...styles.arrow,
              transform:
                openType ===
                "region"
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </button>

        {openType ===
          "region" && (
          <div
            style={
              styles.dropdown
            }
          >
            {safeRegions.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    handleSelect(
                      "region",
                      item
                    )
                  }
                  style={
                    styles.option
                  }
                >
                  {item}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* =====================================
      DISTRICT
      ===================================== */}
      <div style={styles.selectWrap}>
        <button
          type="button"
          onClick={() =>
            handleToggle(
              "district"
            )
          }
          disabled={
            loading ||
            disabled
          }
          style={{
            ...styles.selectButton,

            ...(openType ===
            "district"
              ? styles.activeButton
              : {}),
          }}
        >
          <span>
            {district ||
              "지역 선택"}
          </span>

          <span
            style={{
              ...styles.arrow,
              transform:
                openType ===
                "district"
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </button>

        {openType ===
          "district" && (
          <div
            style={
              styles.dropdown
            }
          >
            {safeDistricts.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    handleSelect(
                      "district",
                      item
                    )
                  }
                  style={
                    styles.option
                  }
                >
                  {item}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* =====================================
      CATEGORY
      ===================================== */}
      <div style={styles.selectWrap}>
        <button
          type="button"
          onClick={() =>
            handleToggle(
              "category"
            )
          }
          disabled={
            loading ||
            disabled
          }
          style={{
            ...styles.selectButton,

            ...(openType ===
            "category"
              ? styles.activeButton
              : {}),
          }}
        >
          <span>
            {category ||
              "카테고리"}
          </span>

          <span
            style={{
              ...styles.arrow,
              transform:
                openType ===
                "category"
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </button>

        {openType ===
          "category" && (
          <div
            style={
              styles.dropdown
            }
          >
            {safeCategories.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    handleSelect(
                      "category",
                      item
                    )
                  }
                  style={
                    styles.option
                  }
                >
                  {item}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
🔥 STYLE
========================================================= */

const styles = {
  wrapper: {
    width: "100%",

    display: "flex",
    alignItems: "center",

    gap: 12,

    position: "relative",

    zIndex: 100,
  },

  selectWrap: {
    position: "relative",

    flex: 1,

    minWidth: 0,
  },

  selectButton: {
    width: "100%",

    height: 54,

    padding:
      "0 18px",

    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",

    borderRadius: 16,

    border:
      "1px solid rgba(255,215,0,0.55)",

    background:
      "linear-gradient(135deg, rgba(15,15,15,0.96) 0%, rgba(24,24,24,0.96) 100%)",

    color: "#FFD700",

    fontSize: 16,
    fontWeight: 700,

    cursor: "pointer",

    outline: "none",

    backdropFilter:
      "blur(14px)",

    boxShadow:
      "0 0 14px rgba(255,215,0,0.18), inset 0 0 8px rgba(255,215,0,0.05)",

    transition:
      "all 0.24s ease",

    overflow: "hidden",

    whiteSpace: "nowrap",

    textOverflow: "ellipsis",
  },

  activeButton: {
    border:
      "1px solid rgba(255,0,128,0.92)",

    color: "#fff",

    boxShadow:
      "0 0 18px rgba(255,0,128,0.42), 0 0 38px rgba(255,0,128,0.18)",
  },

  arrow: {
    marginLeft: 10,

    fontSize: 11,

    transition:
      "all 0.22s ease",
  },

  dropdown: {
    position: "absolute",

    top: 62,
    left: 0,
    right: 0,

    padding: 8,

    borderRadius: 18,

    border:
      "1px solid rgba(255,215,0,0.42)",

    background:
      "rgba(10,10,10,0.98)",

    backdropFilter:
      "blur(18px)",

    boxShadow:
      "0 0 28px rgba(255,215,0,0.16)",

    zIndex: 9999,

    overflow: "hidden",
  },

  option: {
    width: "100%",

    minHeight: 48,

    padding:
      "0 16px",

    display: "flex",
    alignItems: "center",

    border: "none",

    borderRadius: 12,

    background:
      "transparent",

    color: "#FFD700",

    fontSize: 15,
    fontWeight: 700,

    cursor: "pointer",

    transition:
      "all 0.2s ease",
  },
};

export default memo(
  RegionFilter
);