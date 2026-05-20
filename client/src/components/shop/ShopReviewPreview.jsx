"use strict";

import React, {
  useMemo,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

/**
=====================================================

🔥 NORA SHOP REVIEW PREVIEW (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ 리뷰 카드 유지
✔ 별점 유지
✔ 사용자 유지
✔ 날짜 유지
✔ glow 유지
✔ hover 유지
✔ 런타임 에러 방지
✔ 로딩/에러/빈 상태 대응

=====================================================
*/

function ShopReviewPreview({
  reviews = [],
  loading = false,
  error = "",
  onRetry,
  onMore,
}) {
  const safeReviews =
    useMemo(() => {
      if (
        Array.isArray(
          reviews
        )
      ) {
        return reviews;
      }

      return [];
    }, [reviews]);

  if (loading) {
    return (
      <Loading message="리뷰 불러오는 중..." />
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
    !safeReviews ||
    safeReviews.length ===
      0
  ) {
    return (
      <EmptyState message="등록된 리뷰가 없습니다." />
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
              REVIEW
            </div>

            <div
              style={
                styles.subTitle
              }
            >
              실제 방문 고객 후기
            </div>
          </div>

          {typeof onMore ===
            "function" && (
            <button
              type="button"
              style={
                styles.moreBtn
              }
              onClick={() =>
                onMore()
              }
            >
              전체보기
            </button>
          )}
        </div>

        {/* 🔥 REVIEW LIST */}
        <div
          style={
            styles.reviewList
          }
        >
          {safeReviews.map(
            (
              review,
              index
            ) => {
              const safeId =
                review?._id ||
                review?.id ||
                index;

              const rating =
                Number(
                  review?.rating ||
                    5
                );

              return (
                <div
                  key={safeId}
                  style={
                    styles.reviewCard
                  }
                  onMouseEnter={(
                    e
                  ) => {
                    e.currentTarget.style.transform =
                      "translateY(-3px)";

                    e.currentTarget.style.boxShadow =
                      `
                      0 0 22px rgba(243,211,107,0.18),
                      0 0 46px rgba(212,175,55,0.10)
                    `;
                  }}
                  onMouseLeave={(
                    e
                  ) => {
                    e.currentTarget.style.transform =
                      "translateY(0px)";

                    e.currentTarget.style.boxShadow =
                      `
                      0 0 10px rgba(243,211,107,0.06)
                    `;
                  }}
                >
                  {/* 🔥 USER */}
                  <div
                    style={
                      styles.userRow
                    }
                  >
                    <div
                      style={
                        styles.avatar
                      }
                    >
                      {(
                        review?.userName ||
                        "N"
                      )
                        .charAt(
                          0
                        )
                        .toUpperCase()}
                    </div>

                    <div
                      style={
                        styles.userInfo
                      }
                    >
                      <div
                        style={
                          styles.userName
                        }
                      >
                        {review?.userName ||
                          "NORA USER"}
                      </div>

                      <div
                        style={
                          styles.date
                        }
                      >
                        {review?.createdAt ||
                          review?.date ||
                          "2026-05-13"}
                      </div>
                    </div>

                    {/* 🔥 RATING */}
                    <div
                      style={
                        styles.ratingWrap
                      }
                    >
                      <div
                        style={
                          styles.rating
                        }
                      >
                        ⭐{" "}
                        {rating.toFixed(
                          1
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 🔥 CONTENT */}
                  <div
                    style={
                      styles.content
                    }
                  >
                    {review?.content ||
                      "정말 만족스러운 관리였습니다. 시설도 깔끔하고 분위기가 매우 고급스러웠습니다."}
                  </div>

                  {/* 🔥 TAGS */}
                  {!!review?.tags &&
                    Array.isArray(
                      review.tags
                    ) &&
                    review.tags
                      .length >
                      0 && (
                      <div
                        style={
                          styles.tagWrap
                        }
                      >
                        {review.tags.map(
                          (
                            tag,
                            tagIndex
                          ) => (
                            <div
                              key={`${safeId}-${tagIndex}`}
                              style={
                                styles.tag
                              }
                            >
                              #{tag}
                            </div>
                          )
                        )}
                      </div>
                    )}
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
    display: "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    gap: 20,

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

  moreBtn: {
    height: 44,

    padding:
      "0 18px",

    borderRadius: 14,

    border:
      "1px solid rgba(243,211,107,0.22)",

    background:
      "rgba(243,211,107,0.08)",

    color: "#F3D36B",

    fontSize: 14,

    fontWeight: 800,

    cursor: "pointer",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.08)
    `,
  },

  reviewList: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",

    gap: 18,
  },

  reviewCard: {
    padding: 22,

    borderRadius: 24,

    background:
      "rgba(255,255,255,0.03)",

    border:
      "1px solid rgba(243,211,107,0.12)",

    transition:
      "all 0.22s ease",

    boxShadow:
      `
      0 0 10px rgba(243,211,107,0.06)
    `,
  },

  userRow: {
    display: "flex",

    alignItems:
      "center",

    gap: 14,

    marginBottom: 18,
  },

  avatar: {
    width: 56,
    height: 56,

    borderRadius: "50%",

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)",

    color: "#fff",

    fontSize: 22,

    fontWeight: 900,

    boxShadow:
      `
      0 0 16px rgba(255,0,128,0.42)
    `,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    color: "#fff",

    fontSize: 16,

    fontWeight: 800,

    marginBottom: 6,
  },

  date: {
    color:
      "rgba(255,255,255,0.52)",

    fontSize: 12,
  },

  ratingWrap: {
    display: "flex",

    alignItems:
      "center",
  },

  rating: {
    color: "#F3D36B",

    fontSize: 18,

    fontWeight: 900,

    textShadow:
      `
      0 0 12px rgba(243,211,107,0.42)
    `,
  },

  content: {
    color:
      "rgba(255,255,255,0.86)",

    fontSize: 14,

    lineHeight: 1.9,

    marginBottom: 18,
  },

  tagWrap: {
    display: "flex",

    flexWrap: "wrap",

    gap: 10,
  },

  tag: {
    padding:
      "8px 14px",

    borderRadius: 999,

    background:
      "linear-gradient(135deg, rgba(255,0,128,0.14) 0%, rgba(255,61,145,0.18) 100%)",

    border:
      "1px solid rgba(255,0,128,0.24)",

    color: "#ff4d9d",

    fontSize: 12,

    fontWeight: 800,

    boxShadow:
      `
      0 0 12px rgba(255,0,128,0.12)
    `,
  },
};

export default ShopReviewPreview;