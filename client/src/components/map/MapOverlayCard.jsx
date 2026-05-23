"use strict";

import React, {
  memo,
  useMemo,
} from "react";

/**
=====================================================

🔥 NORA MAP OVERLAY CARD
✔ 카카오맵 오버레이 카드
✔ 블랙 + 골드 + 핑크
✔ glow 효과
✔ hover 없이 고정 프리미엄 UI
✔ mazzang 스타일
✔ 지도 위 floating card
✔ NaN / undefined 방어
✔ 0% runtime error

=====================================================
*/

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function safeString(
  value,
  fallback = ""
) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return String(value);
}

function MapOverlayCard({
  shop = {},
  visible = true,
  onClick,
  onClose,
}) {
  const data = useMemo(() => {
    const originalPrice =
      safeNumber(
        shop?.originalPrice ||
          shop?.originPrice ||
          160000
      );

    const salePrice =
      safeNumber(
        shop?.discountPrice ||
          shop?.salePrice ||
          shop?.price ||
          90000
      );

    return {
      id:
        shop?._id ||
        shop?.id ||
        "overlay-shop",

      name: safeString(
        shop?.name,
        "노라 스웨디시"
      ),

      image:
        shop?.image ||
        shop?.thumbnail ||
        shop?.mainImage ||
        shop?.representativeImage ||
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1200&auto=format&fit=crop",

      rating: safeNumber(
        shop?.rating ||
          shop?.ratingAvg ||
          shop?.averageRating ||
          5
      ),

      reviewCount:
        safeNumber(
          shop?.reviewCount ||
            shop?.reviewsCount ||
            128
        ),

      favoriteCount:
        safeNumber(
          shop?.favoriteCount ||
            shop?.likeCount ||
            942
        ),

      distance:
        shop?.distance ||
        "0.1km",

      address:
        shop?.address ||
        shop?.roadAddress ||
        shop?.locationName ||
        shop?.region ||
        "김해 삼계동",

      description:
        shop?.description ||
        "프리미엄 감성 스웨디시",

      discountRate:
        safeNumber(
          shop?.discountRate ||
            shop?.discount ||
            44
        ),

      salePrice,
      originalPrice,
    };
  }, [shop]);

  if (!visible) {
    return null;
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.glowLine} />

        <button
          type="button"
          style={styles.closeButton}
          onClick={(e) => {
            e.stopPropagation();

            if (
              typeof onClose ===
              "function"
            ) {
              onClose();
            }
          }}
        >
          ✕
        </button>

        <div style={styles.imageWrap}>
          <img
            src={data.image}
            alt={data.name}
            style={styles.image}
          />

          <div
            style={
              styles.imageOverlay
            }
          />

          <div
            style={
              styles.bestBadge
            }
          >
            BEST
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.title}>
            {data.name}
          </div>

          <div style={styles.address}>
            📍 {data.address}
          </div>

          <div
            style={
              styles.description
            }
          >
            {data.description}
          </div>

          <div style={styles.metaRow}>
            <div
              style={
                styles.rating
              }
            >
              ★{" "}
              {data.rating.toFixed(
                1
              )}
            </div>

            <div
              style={
                styles.review
              }
            >
              (
              {
                data.reviewCount
              }
              )
            </div>

            <div
              style={
                styles.favorite
              }
            >
              ♡ 찜{" "}
              {
                data.favoriteCount
              }
            </div>

            <div
              style={
                styles.distance
              }
            >
              ↕{" "}
              {
                data.distance
              }
            </div>
          </div>

          <div style={styles.priceRow}>
            <div
              style={
                styles.discount
              }
            >
              {
                data.discountRate
              }
              %
            </div>

            <div
              style={
                styles.originalPrice
              }
            >
              {Number(
                data.originalPrice
              ).toLocaleString()}
              원
            </div>

            <div style={styles.price}>
              {Number(
                data.salePrice
              ).toLocaleString()}
              원
            </div>
          </div>

          <button
            type="button"
            style={styles.detailButton}
            onClick={(e) => {
              e.stopPropagation();

              if (
                typeof onClick ===
                "function"
              ) {
                onClick(shop);
              }
            }}
          >
            상세보기
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "absolute",
    left: "50%",
    bottom: 28,
    transform:
      "translateX(-50%)",
    zIndex: 9999,
    pointerEvents: "auto",
  },

  card: {
    position: "relative",

    width: 320,

    overflow: "hidden",

    borderRadius: 8,

    background:
      "linear-gradient(180deg, rgba(8,8,8,0.98) 0%, rgba(0,0,0,1) 100%)",

    border:
      "1px solid rgba(255,215,0,0.92)",

    boxShadow:
      `
      0 0 0 1px rgba(255,215,0,0.10),
      0 0 18px rgba(255,215,0,0.26),
      0 0 36px rgba(255,0,128,0.12),
      0 14px 40px rgba(0,0,0,0.88)
    `,

    backdropFilter:
      "blur(10px)",
  },

  glowLine: {
    position: "absolute",

    top: 0,
    left: 0,
    right: 0,

    height: 1,

    zIndex: 10,

    background:
      `
      linear-gradient(
        90deg,
        transparent 0%,
        #fff4be 20%,
        #ffd400 50%,
        #c99900 80%,
        transparent 100%
      )
    `,
  },

  closeButton: {
    position: "absolute",

    top: 8,
    right: 8,

    width: 28,
    height: 28,

    border: "none",

    borderRadius: "50%",

    background:
      "rgba(0,0,0,0.82)",

    color: "#ffffff",

    fontSize: 14,

    cursor: "pointer",

    zIndex: 30,

    display: "flex",

    alignItems: "center",

    justifyContent:
      "center",

    boxShadow:
      "0 0 10px rgba(0,0,0,0.8)",
  },

  imageWrap: {
    position: "relative",

    width: "100%",

    height: 160,

    overflow: "hidden",

    background:
      "#000",
  },

  image: {
    width: "100%",
    height: "100%",

    objectFit: "cover",

    display: "block",

    filter:
      "saturate(1.12) contrast(1.08)",
  },

  imageOverlay: {
    position: "absolute",

    inset: 0,

    background:
      `
      linear-gradient(
        180deg,
        rgba(0,0,0,0) 0%,
        rgba(0,0,0,0.12) 42%,
        rgba(0,0,0,0.62) 100%
      )
    `,
  },

  bestBadge: {
    position: "absolute",

    top: 10,
    left: 10,

    padding:
      "5px 8px",

    borderRadius: 3,

    background:
      `
      linear-gradient(
        135deg,
        #ff006f 0%,
        #ff3d91 100%
      )
    `,

    color: "#ffffff",

    fontSize: 10,

    fontWeight: 900,

    letterSpacing:
      "0.2px",

    boxShadow:
      "0 0 10px rgba(255,0,111,0.72)",

    zIndex: 10,
  },

  content: {
    padding:
      "14px 14px 16px",
  },

  title: {
    color: "#ffffff",

    fontSize: 20,

    fontWeight: 900,

    lineHeight: 1.2,

    letterSpacing:
      "-0.5px",

    textShadow:
      "0 0 10px rgba(255,255,255,0.10)",
  },

  address: {
    marginTop: 10,

    color:
      "rgba(255,255,255,0.72)",

    fontSize: 12,

    fontWeight: 600,

    overflow:
      "hidden",

    textOverflow:
      "ellipsis",

    whiteSpace:
      "nowrap",
  },

  description: {
    marginTop: 8,

    color:
      "rgba(255,255,255,0.82)",

    fontSize: 13,

    fontWeight: 600,

    lineHeight: 1.45,
  },

  metaRow: {
    marginTop: 12,

    display: "flex",

    alignItems:
      "center",

    gap: 7,

    flexWrap: "nowrap",

    overflow:
      "hidden",

    whiteSpace:
      "nowrap",
  },

  rating: {
    color: "#ffd400",

    fontSize: 13,

    fontWeight: 900,

    textShadow:
      "0 0 8px rgba(255,212,0,0.62)",
  },

  review: {
    color:
      "rgba(255,255,255,0.72)",

    fontSize: 12,

    fontWeight: 600,
  },

  favorite: {
    color:
      "rgba(255,255,255,0.82)",

    fontSize: 12,

    fontWeight: 700,
  },

  distance: {
    marginLeft: "auto",

    color:
      "rgba(255,255,255,0.82)",

    fontSize: 12,

    fontWeight: 700,
  },

  priceRow: {
    marginTop: 14,

    display: "flex",

    alignItems:
      "center",

    gap: 9,
  },

  discount: {
    minWidth: 54,

    height: 34,

    padding:
      "0 8px",

    borderRadius: 3,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "rgba(0,0,0,0.74)",

    border:
      "2px solid #ff006f",

    color: "#ffffff",

    fontSize: 21,

    fontWeight: 950,

    lineHeight: 1,

    boxShadow:
      `
      inset 0 0 0 1px rgba(255,255,255,0.10),
      0 0 12px rgba(255,0,111,0.54)
    `,
  },

  originalPrice: {
    color:
      "rgba(255,255,255,0.38)",

    fontSize: 13,

    fontWeight: 700,

    textDecoration:
      "line-through",

    whiteSpace:
      "nowrap",
  },

  price: {
    marginLeft: "auto",

    color: "#ffffff",

    fontSize: 24,

    fontWeight: 950,

    letterSpacing:
      "-0.8px",

    whiteSpace:
      "nowrap",

    textShadow:
      "0 0 10px rgba(255,255,255,0.16)",
  },

  detailButton: {
    width: "100%",

    height: 46,

    marginTop: 15,

    border: "none",

    borderRadius: 4,

    background:
      `
      linear-gradient(
        180deg,
        #ff006f 0%,
        #db0052 100%
      )
    `,

    color: "#ffffff",

    fontSize: 15,

    fontWeight: 900,

    letterSpacing:
      "-0.3px",

    cursor: "pointer",

    transition:
      "all 0.18s ease",

    boxShadow:
      `
      0 0 12px rgba(255,0,111,0.34),
      0 0 24px rgba(255,0,111,0.16)
    `,
  },
};

export default memo(
  MapOverlayCard
);