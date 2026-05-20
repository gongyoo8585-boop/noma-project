"use strict";

import React, {
  useMemo,
} from "react";

/**
=====================================================

🔥 NORA SHOP CATEGORY TABS (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ 카테고리 탭 유지
✔ 활성 상태 유지
✔ glow 유지
✔ hover 유지
✔ badge 유지
✔ count 유지
✔ 런타임 에러 방지
✔ 반응형 유지

=====================================================
*/

function ShopCategoryTabs({
  categories = [],
  activeCategory = "",
  onChange,
}) {
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

  if (
    safeCategories.length ===
    0
  ) {
    return null;
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
              CATEGORY
            </div>

            <div
              style={
                styles.subTitle
              }
            >
              프리미엄 마사지
              카테고리
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

        {/* 🔥 TAB LIST */}
        <div
          style={
            styles.tabWrap
          }
        >
          {safeCategories.map(
            (
              category,
              index
            ) => {
              const safeValue =
                category?.value ||
                category?.id ||
                category?.name ||
                category;

              const safeLabel =
                category?.label ||
                category?.name ||
                category;

              const safeCount =
                category?.count ||
                0;

              const isActive =
                String(
                  activeCategory
                ) ===
                String(
                  safeValue
                );

              return (
                <button
                  key={`${safeValue}-${index}`}
                  type="button"
                  onClick={() => {
                    if (
                      typeof onChange ===
                      "function"
                    ) {
                      onChange(
                        safeValue
                      );
                    }
                  }}
                  style={{
                    ...styles.tab,

                    background:
                      isActive
                        ? "linear-gradient(135deg, rgba(255,248,214,0.18) 0%, rgba(243,211,107,0.22) 38%, rgba(212,175,55,0.20) 100%)"
                        : "rgba(255,255,255,0.03)",

                    border:
                      isActive
                        ? "1px solid rgba(243,211,107,0.48)"
                        : "1px solid rgba(255,255,255,0.06)",

                    boxShadow:
                      isActive
                        ? `
                        0 0 20px rgba(243,211,107,0.24),
                        0 0 42px rgba(212,175,55,0.12)
                      `
                        : `
                        0 0 10px rgba(243,211,107,0.04)
                      `,
                  }}
                  onMouseEnter={(
                    e
                  ) => {
                    e.currentTarget.style.transform =
                      "translateY(-2px)";

                    e.currentTarget.style.boxShadow =
                      `
                      0 0 22px rgba(243,211,107,0.18),
                      0 0 44px rgba(212,175,55,0.10)
                    `;
                  }}
                  onMouseLeave={(
                    e
                  ) => {
                    e.currentTarget.style.transform =
                      "translateY(0px)";

                    e.currentTarget.style.boxShadow =
                      isActive
                        ? `
                        0 0 20px rgba(243,211,107,0.24),
                        0 0 42px rgba(212,175,55,0.12)
                      `
                        : `
                        0 0 10px rgba(243,211,107,0.04)
                      `;
                  }}
                >
                  {/* 🔥 ACTIVE GLOW */}
                  {isActive && (
                    <div
                      style={
                        styles.activeGlow
                      }
                    />
                  )}

                  {/* 🔥 ICON */}
                  <div
                    style={{
                      ...styles.iconWrap,

                      background:
                        isActive
                          ? "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)"
                          : "rgba(255,255,255,0.04)",

                      border:
                        isActive
                          ? "1px solid rgba(255,0,128,0.42)"
                          : "1px solid rgba(255,255,255,0.06)",

                      boxShadow:
                        isActive
                          ? `
                          0 0 18px rgba(255,0,128,0.24)
                        `
                          : "none",
                    }}
                  >
                    {category?.icon ||
                      "💆"}
                  </div>

                  {/* 🔥 LABEL */}
                  <div
                    style={
                      styles.content
                    }
                  >
                    <div
                      style={{
                        ...styles.label,

                        color:
                          isActive
                            ? "#F3D36B"
                            : "#fff",

                        textShadow:
                          isActive
                            ? `
                            0 0 12px rgba(243,211,107,0.32)
                          `
                            : "none",
                      }}
                    >
                      {safeLabel}
                    </div>

                    {/* 🔥 COUNT */}
                    {safeCount >
                      0 && (
                      <div
                        style={
                          styles.count
                        }
                      >
                        {safeCount}
                      </div>
                    )}
                  </div>

                  {/* 🔥 ACTIVE BADGE */}
                  {isActive && (
                    <div
                      style={
                        styles.activeBadge
                      }
                    >
                      ACTIVE
                    </div>
                  )}
                </button>
              );
            }
          )}
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

    marginBottom: 26,
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
    minWidth: 76,

    height: 36,

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
      0 0 18px rgba(255,0,128,0.28)
    `,
  },

  tabWrap: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",

    gap: 18,
  },

  tab: {
    position: "relative",

    minHeight: 110,

    display: "flex",

    alignItems:
      "center",

    gap: 16,

    padding: 20,

    borderRadius: 24,

    cursor: "pointer",

    overflow: "hidden",

    transition:
      "all 0.22s ease",

    backdropFilter:
      "blur(12px)",

    WebkitBackdropFilter:
      "blur(12px)",
  },

  activeGlow: {
    position: "absolute",

    inset: 0,

    background:
      "radial-gradient(circle at top right, rgba(243,211,107,0.10) 0%, rgba(0,0,0,0) 68%)",

    pointerEvents:
      "none",
  },

  iconWrap: {
    position: "relative",

    width: 64,
    height: 64,

    minWidth: 64,

    borderRadius: 22,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize: 30,

    transition:
      "all 0.22s ease",
  },

  content: {
    flex: 1,

    position: "relative",

    zIndex: 2,
  },

  label: {
    fontSize: 18,

    fontWeight: 900,

    lineHeight: 1.4,
  },

  count: {
    marginTop: 8,

    color:
      "rgba(255,255,255,0.52)",

    fontSize: 13,

    fontWeight: 700,
  },

  activeBadge: {
    position: "absolute",

    top: 16,
    right: 16,

    minWidth: 62,

    height: 24,

    padding:
      "0 10px",

    borderRadius: 999,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "linear-gradient(135deg, rgba(255,0,128,0.22) 0%, rgba(255,77,166,0.22) 100%)",

    border:
      "1px solid rgba(255,0,128,0.32)",

    color: "#ff4d9d",

    fontSize: 10,

    fontWeight: 900,

    letterSpacing: 1,

    boxShadow:
      `
      0 0 12px rgba(255,0,128,0.14)
    `,
  },
};

export default ShopCategoryTabs;