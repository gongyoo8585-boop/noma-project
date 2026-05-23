"use strict";

import React, {
  useMemo,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

/**
=====================================================

🔥 NORA SHOP INFO (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ 업체 기본 정보 유지
✔ 운영시간 유지
✔ 연락처 유지
✔ 주소 유지
✔ 카테고리 유지
✔ 편의시설 유지
✔ 태그 유지
✔ 설명 유지
✔ glow 유지
✔ hover 유지
✔ 로딩/에러/빈 상태 대응
✔ 런타임 에러 방지

=====================================================
*/

function ShopInfo({
  shop = {},
  loading = false,
  error = "",
  onRetry,
}) {
  const safeTags =
    useMemo(() => {
      if (
        Array.isArray(
          shop?.tags
        )
      ) {
        return shop.tags;
      }

      return [];
    }, [shop]);

  const safeFacilities =
    useMemo(() => {
      if (
        Array.isArray(
          shop?.facilities
        )
      ) {
        return shop.facilities;
      }

      return [];
    }, [shop]);

  if (loading) {
    return (
      <Loading message="업체 정보 불러오는 중..." />
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
    !shop ||
    Object.keys(shop)
      .length === 0
  ) {
    return (
      <EmptyState message="업체 정보가 없습니다." />
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
                styles.shopName
              }
            >
              {shop?.name ||
                "업체명 없음"}
            </div>

            <div
              style={
                styles.category
              }
            >
              {shop?.category ||
                "마사지"}{" "}
              ·{" "}
              {shop?.region ||
                "지역 정보 없음"}
            </div>
          </div>

          <div
            style={
              styles.ratingBox
            }
          >
            <div
              style={
                styles.rating
              }
            >
              ⭐{" "}
              {Number(
                shop?.rating
                  ?.average ??
                  shop?.averageRating ??
                  0
              ).toFixed(1)}
            </div>

            <div
              style={
                styles.reviewCount
              }
            >
              리뷰{" "}
              {shop?.reviewCount ||
                0}
            </div>
          </div>
        </div>

        {/* 🔥 DESCRIPTION */}
        {!!shop?.description && (
          <div
            style={
              styles.descriptionBox
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              업체 소개
            </div>

            <div
              style={
                styles.description
              }
            >
              {
                shop.description
              }
            </div>
          </div>
        )}

        {/* 🔥 INFO GRID */}
        <div
          style={
            styles.infoGrid
          }
        >
          {/* 운영시간 */}
          <div
            style={
              styles.infoCard
            }
          >
            <div
              style={
                styles.infoIcon
              }
            >
              🕒
            </div>

            <div>
              <div
                style={
                  styles.infoLabel
                }
              >
                운영시간
              </div>

              <div
                style={
                  styles.infoValue
                }
              >
                {shop?.businessHours ||
                  "24시간 운영"}
              </div>
            </div>
          </div>

          {/* 전화 */}
          <div
            style={
              styles.infoCard
            }
          >
            <div
              style={
                styles.infoIcon
              }
            >
              📞
            </div>

            <div>
              <div
                style={
                  styles.infoLabel
                }
              >
                연락처
              </div>

              <div
                style={
                  styles.infoValue
                }
              >
                {shop?.phone ||
                  "-"}
              </div>
            </div>
          </div>

          {/* 주소 */}
          <div
            style={
              styles.infoCard
            }
          >
            <div
              style={
                styles.infoIcon
              }
            >
              📍
            </div>

            <div>
              <div
                style={
                  styles.infoLabel
                }
              >
                주소
              </div>

              <div
                style={
                  styles.infoValue
                }
              >
                {shop?.address ||
                  "주소 없음"}
              </div>
            </div>
          </div>

          {/* 거리 */}
          <div
            style={
              styles.infoCard
            }
          >
            <div
              style={
                styles.infoIcon
              }
            >
              🚕
            </div>

            <div>
              <div
                style={
                  styles.infoLabel
                }
              >
                거리
              </div>

              <div
                style={
                  styles.infoValue
                }
              >
                {shop?.distance ||
                  "0.1km"}
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 FACILITIES */}
        {safeFacilities
          .length > 0 && (
          <div
            style={
              styles.sectionBox
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              편의시설
            </div>

            <div
              style={
                styles.facilityWrap
              }
            >
              {safeFacilities.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={
                      item ||
                      index
                    }
                    style={
                      styles.facilityTag
                    }
                  >
                    {item}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* 🔥 TAGS */}
        {safeTags.length >
          0 && (
          <div
            style={
              styles.sectionBox
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              추천 태그
            </div>

            <div
              style={
                styles.tagWrap
              }
            >
              {safeTags.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={
                      item ||
                      index
                    }
                    style={
                      styles.tag
                    }
                  >
                    #{item}
                  </div>
                )
              )}
            </div>
          </div>
        )}
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

    opacity: 0.14,

    pointerEvents:
      "none",

    boxShadow:
      `
      0 0 18px rgba(243,211,107,0.42),
      0 0 40px rgba(212,175,55,0.22)
    `,
  },

  container: {
    position: "relative",

    overflow: "hidden",

    borderRadius: 30,

    padding: 28,

    background:
      "linear-gradient(180deg, rgba(18,14,4,0.98) 0%, rgba(8,8,8,0.99) 58%, rgba(0,0,0,1) 100%)",

    border:
      "2px solid rgba(212,175,55,0.92)",

    boxShadow:
      `
      0 0 14px rgba(243,211,107,0.22),
      0 0 32px rgba(212,175,55,0.12),
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
      "flex-start",

    gap: 20,

    flexWrap: "wrap",

    marginBottom: 28,
  },

  shopName: {
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
      0 0 14px rgba(243,211,107,0.32)
    `,
  },

  category: {
    marginTop: 10,

    color:
      "rgba(255,255,255,0.68)",

    fontSize: 14,

    lineHeight: 1.6,
  },

  ratingBox: {
    minWidth: 120,

    padding:
      "16px 18px",

    borderRadius: 18,

    background:
      "rgba(243,211,107,0.06)",

    border:
      "1px solid rgba(243,211,107,0.16)",

    textAlign: "center",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.08)
    `,
  },

  rating: {
    color: "#F3D36B",

    fontSize: 26,

    fontWeight: 900,

    textShadow:
      `
      0 0 12px rgba(243,211,107,0.42)
    `,
  },

  reviewCount: {
    marginTop: 8,

    color:
      "rgba(255,255,255,0.68)",

    fontSize: 13,
  },

  descriptionBox: {
    marginBottom: 28,
  },

  sectionTitle: {
    background:
      "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)",

    WebkitBackgroundClip:
      "text",

    WebkitTextFillColor:
      "transparent",

    fontSize: 24,

    fontWeight: 900,

    marginBottom: 14,

    textShadow:
      `
      0 0 12px rgba(243,211,107,0.24)
    `,
  },

  description: {
    color:
      "rgba(255,255,255,0.86)",

    fontSize: 15,

    lineHeight: 1.9,
  },

  infoGrid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",

    gap: 16,

    marginBottom: 30,
  },

  infoCard: {
    display: "flex",

    alignItems:
      "flex-start",

    gap: 14,

    padding: 20,

    borderRadius: 22,

    background:
      "rgba(255,255,255,0.03)",

    border:
      "1px solid rgba(243,211,107,0.12)",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.06),
      inset 0 0 18px rgba(243,211,107,0.02)
    `,

    transition:
      "all 0.22s ease",
  },

  infoIcon: {
    width: 48,
    height: 48,

    borderRadius: 16,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "rgba(243,211,107,0.08)",

    border:
      "1px solid rgba(243,211,107,0.14)",

    color: "#F3D36B",

    fontSize: 22,

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.08)
    `,
  },

  infoLabel: {
    color:
      "rgba(255,255,255,0.62)",

    fontSize: 13,

    marginBottom: 8,
  },

  infoValue: {
    color: "#fff",

    fontSize: 15,

    fontWeight: 700,

    lineHeight: 1.6,
  },

  sectionBox: {
    marginTop: 10,

    marginBottom: 26,
  },

  facilityWrap: {
    display: "flex",

    flexWrap: "wrap",

    gap: 10,
  },

  facilityTag: {
    padding:
      "10px 16px",

    borderRadius: 999,

    background:
      "rgba(243,211,107,0.08)",

    border:
      "1px solid rgba(243,211,107,0.18)",

    color: "#F3D36B",

    fontSize: 13,

    fontWeight: 700,

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.08)
    `,
  },

  tagWrap: {
    display: "flex",

    flexWrap: "wrap",

    gap: 10,
  },

  tag: {
    padding:
      "10px 16px",

    borderRadius: 999,

    background:
      "linear-gradient(135deg, rgba(255,0,128,0.14) 0%, rgba(255,61,145,0.18) 100%)",

    border:
      "1px solid rgba(255,0,128,0.24)",

    color: "#ff4d9d",

    fontSize: 13,

    fontWeight: 800,

    boxShadow:
      `
      0 0 12px rgba(255,0,128,0.12)
    `,
  },
};

export default ShopInfo;