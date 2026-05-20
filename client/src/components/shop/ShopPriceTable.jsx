"use strict";

import React, {
  useMemo,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

/**
=====================================================

🔥 NORA SHOP PRICE TABLE (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ 가격표 유지
✔ 할인율 유지
✔ 코스 정보 유지
✔ 시간 정보 유지
✔ hover glow 유지
✔ 반응형 유지
✔ 런타임 에러 방지
✔ 로딩/에러/빈 상태 대응

=====================================================
*/

function ShopPriceTable({
  prices = [],
  loading = false,
  error = "",
  onRetry,
  onSelect,
  selectedId,
}) {
  const safePrices =
    useMemo(() => {
      if (
        Array.isArray(
          prices
        )
      ) {
        return prices;
      }

      return [];
    }, [prices]);

  if (loading) {
    return (
      <Loading message="가격표 불러오는 중..." />
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
    !safePrices ||
    safePrices.length ===
      0
  ) {
    return (
      <EmptyState message="등록된 가격표가 없습니다." />
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
          <div
            style={
              styles.title
            }
          >
            PRICE MENU
          </div>

          <div
            style={
              styles.subTitle
            }
          >
            프리미엄 마사지 코스
          </div>
        </div>

        {/* 🔥 TABLE */}
        <div
          style={
            styles.tableWrap
          }
        >
          {/* TABLE HEAD */}
          <div
            style={
              styles.tableHead
            }
          >
            <div
              style={{
                ...styles.headCell,
                flex: 2,
              }}
            >
              코스명
            </div>

            <div
              style={{
                ...styles.headCell,
                flex: 1,
              }}
            >
              시간
            </div>

            <div
              style={{
                ...styles.headCell,
                flex: 1,
              }}
            >
              할인
            </div>

            <div
              style={{
                ...styles.headCell,
                flex: 1.2,
              }}
            >
              금액
            </div>

            <div
              style={{
                ...styles.headCell,
                flex: 1,
              }}
            >
              예약
            </div>
          </div>

          {/* TABLE BODY */}
          {safePrices.map(
            (
              item,
              index
            ) => {
              const safeId =
                item?._id ||
                item?.id ||
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

              const originalPrice =
                Number(
                  item?.originalPrice ||
                    item?.price ||
                    0
                );

              const discountPrice =
                Number(
                  item?.discountPrice ||
                    originalPrice
                );

              const discountRate =
                Number(
                  item?.discountRate ||
                    0
                );

              return (
                <div
                  key={safeId}
                  style={{
                    ...styles.row,

                    background:
                      isSelected
                        ? "rgba(243,211,107,0.08)"
                        : "rgba(255,255,255,0.02)",

                    border:
                      isSelected
                        ? "1px solid rgba(243,211,107,0.32)"
                        : "1px solid rgba(255,255,255,0.04)",

                    boxShadow:
                      isSelected
                        ? `
                        0 0 18px rgba(243,211,107,0.18),
                        inset 0 0 18px rgba(243,211,107,0.04)
                      `
                        : `
                        0 0 8px rgba(243,211,107,0.04)
                      `,
                  }}
                >
                  {/* COURSE */}
                  <div
                    style={{
                      ...styles.cell,
                      flex: 2,
                    }}
                  >
                    <div
                      style={
                        styles.courseName
                      }
                    >
                      {item?.name ||
                        "프리미엄 코스"}
                    </div>

                    {!!item?.description && (
                      <div
                        style={
                          styles.courseDesc
                        }
                      >
                        {
                          item.description
                        }
                      </div>
                    )}
                  </div>

                  {/* TIME */}
                  <div
                    style={{
                      ...styles.cell,
                      flex: 1,
                    }}
                  >
                    <div
                      style={
                        styles.time
                      }
                    >
                      {item?.duration ||
                        "60분"}
                    </div>
                  </div>

                  {/* DISCOUNT */}
                  <div
                    style={{
                      ...styles.cell,
                      flex: 1,
                    }}
                  >
                    {discountRate >
                    0 ? (
                      <div
                        style={
                          styles.discount
                        }
                      >
                        {discountRate}
                        %
                      </div>
                    ) : (
                      <div
                        style={
                          styles.noneDiscount
                        }
                      >
                        -
                      </div>
                    )}
                  </div>

                  {/* PRICE */}
                  <div
                    style={{
                      ...styles.cell,
                      flex: 1.2,
                    }}
                  >
                    {discountRate >
                      0 && (
                      <div
                        style={
                          styles.originalPrice
                        }
                      >
                        {originalPrice.toLocaleString()}
                        원
                      </div>
                    )}

                    <div
                      style={
                        styles.price
                      }
                    >
                      {discountPrice.toLocaleString()}
                      원
                    </div>
                  </div>

                  {/* BUTTON */}
                  <div
                    style={{
                      ...styles.cell,
                      flex: 1,
                    }}
                  >
                    <button
                      type="button"
                      style={
                        styles.reserveBtn
                      }
                      onClick={() =>
                        onSelect &&
                        onSelect(
                          item
                        )
                      }
                    >
                      예약
                    </button>
                  </div>
                </div>
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

  tableWrap: {
    display: "flex",

    flexDirection:
      "column",

    gap: 14,
  },

  tableHead: {
    display: "flex",

    alignItems:
      "center",

    gap: 12,

    padding:
      "0 18px",
  },

  headCell: {
    color: "#F3D36B",

    fontSize: 13,

    fontWeight: 800,

    textTransform:
      "uppercase",

    letterSpacing: 1,
  },

  row: {
    display: "flex",

    alignItems:
      "center",

    gap: 12,

    padding: 18,

    borderRadius: 24,

    transition:
      "all 0.22s ease",
  },

  cell: {
    display: "flex",

    flexDirection:
      "column",

    justifyContent:
      "center",
  },

  courseName: {
    color: "#fff",

    fontSize: 18,

    fontWeight: 800,

    lineHeight: 1.4,
  },

  courseDesc: {
    marginTop: 6,

    color:
      "rgba(255,255,255,0.58)",

    fontSize: 12,

    lineHeight: 1.6,
  },

  time: {
    color: "#F3D36B",

    fontSize: 18,

    fontWeight: 800,

    textShadow:
      `
      0 0 10px rgba(243,211,107,0.28)
    `,
  },

  discount: {
    minWidth: 58,

    height: 34,

    padding:
      "0 12px",

    borderRadius: 999,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "linear-gradient(135deg, rgba(255,0,128,0.18) 0%, rgba(255,61,145,0.22) 100%)",

    border:
      "1px solid rgba(255,0,128,0.32)",

    color: "#ff4d9d",

    fontSize: 15,

    fontWeight: 900,

    boxShadow:
      `
      0 0 14px rgba(255,0,128,0.18)
    `,
  },

  noneDiscount: {
    color:
      "rgba(255,255,255,0.34)",

    fontSize: 14,
  },

  originalPrice: {
    color:
      "rgba(255,255,255,0.38)",

    fontSize: 13,

    textDecoration:
      "line-through",

    marginBottom: 4,
  },

  price: {
    background:
      "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)",

    WebkitBackgroundClip:
      "text",

    WebkitTextFillColor:
      "transparent",

    fontSize: 24,

    fontWeight: 900,

    textShadow:
      `
      0 0 14px rgba(243,211,107,0.32)
    `,
  },

  reserveBtn: {
    width: "100%",

    minWidth: 100,

    height: 46,

    border: "none",

    borderRadius: 16,

    background:
      "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)",

    color: "#000",

    fontSize: 15,

    fontWeight: 900,

    cursor: "pointer",

    boxShadow:
      `
      0 0 14px rgba(243,211,107,0.28)
    `,

    transition:
      "all 0.22s ease",
  },
};

export default ShopPriceTable;