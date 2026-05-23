"use strict";

import React, {
  memo,
  useMemo,
} from "react";

/**
 * =====================================================
 * /client/src/components/map/MapOverlay.jsx
 * NORA ULTRA PREMIUM FINAL
 * 업로드 사진 기준 100% 복제형
 * 블랙 + 메탈 골드 + 핑크 포인트
 * 글씨 네온 제거
 * 숫자/가격 흰색
 * 할인 박스 핑크
 * 테두리만 골드 glow
 * =====================================================
 */

function MapOverlay({
  shop = {},
  visible = false,
  selected = false,
  onClose = null,
  onDetail = null,
}) {
  const safeShop = shop || {};

  const safeTitle =
    safeShop.name ||
    safeShop.title ||
    "더 스크럽 테라피";

  const safeImage =
    safeShop.image ||
    safeShop.thumbnail ||
    safeShop.thumb ||
    "";

  const safeAddress =
    safeShop.address ||
    "경상남도 김해시 삼계동 1479-2";

  const safeDistance =
    safeShop.distance ||
    "0.1km";

  const safePrice =
    safeShop.price ||
    "45,000원";

  const safeOriginalPrice =
    safeShop.originalPrice ||
    "80,000원";

  const safeDiscount =
    safeShop.discount ||
    safeShop.discountRate ||
    "44%";

  const safeRating =
    safeShop.rating ||
    "5.0";

  const safeReview =
    safeShop.reviewCount ||
    safeShop.reviews ||
    125;

  const safeLike =
    safeShop.likes ||
    safeShop.favoriteCount ||
    941;

  const safeDescription =
    safeShop.description ||
    safeShop.course ||
    "건식 관리 60분";

  const overlayStyle =
    useMemo(() => {
      return {
        ...styles.wrap,
        opacity: visible ? 1 : 0,
        visibility: visible
          ? "visible"
          : "hidden",
        transform: visible
          ? "translateY(0px) scale(1)"
          : "translateY(12px) scale(0.96)",
        pointerEvents: visible
          ? "auto"
          : "none",
        zIndex: selected
          ? 9999
          : 1000,
      };
    }, [visible, selected]);

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (
        typeof onClose ===
        "function"
      ) {
        onClose(safeShop);
      }
    } catch (err) {
      console.error(
        "MapOverlay Close Error:",
        err
      );
    }
  };

  const handleDetail = (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (
        typeof onDetail ===
        "function"
      ) {
        onDetail(safeShop);
      }
    } catch (err) {
      console.error(
        "MapOverlay Detail Error:",
        err
      );
    }
  };

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div style={styles.goldGlow} />

      <div style={styles.card}>
        <div style={styles.topLine} />

        <div style={styles.imageWrap}>
          {safeImage ? (
            <img
              src={safeImage}
              alt={safeTitle}
              style={styles.image}
              draggable={false}
            />
          ) : (
            <div style={styles.noImage}>
              NORA
            </div>
          )}

          <div style={styles.imageOverlay} />

          <div style={styles.best}>
            BEST
          </div>

          <button
            type="button"
            style={styles.closeBtn}
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.titleRow}>
            <div style={styles.title}>
              {safeTitle}
            </div>

            <span style={styles.bestMini}>
              BEST
            </span>
          </div>

          <div style={styles.meta}>
            <span style={styles.metaStrong}>
              ★ {safeRating}
            </span>

            <span style={styles.metaText}>
              ({safeReview})
            </span>

            <span style={styles.metaText}>
              ♡ 찜 {safeLike}
            </span>

            <span style={styles.metaText}>
              ⦿ {safeDistance}
            </span>
          </div>

          <div style={styles.divider} />

          <div style={styles.address}>
            ⦿ {safeAddress}
          </div>

          <div style={styles.description}>
            {safeDescription}
          </div>

          <div style={styles.priceRow}>
            <div style={styles.discount}>
              {String(safeDiscount).includes("%")
                ? safeDiscount
                : `${safeDiscount}%`}
            </div>

            <div style={styles.originalPrice}>
              {safeOriginalPrice}
            </div>

            <div style={styles.price}>
              {safePrice}
            </div>
          </div>

          <button
            type="button"
            style={styles.detailBtn}
            onClick={handleDetail}
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
    position: "relative",
    width: 320,
    transition: "all 0.28s ease",
    userSelect: "none",
  },

  goldGlow: {
    position: "absolute",
    inset: -2,
    borderRadius: 20,
    background:
      "linear-gradient(135deg, rgba(255,248,214,0.38) 0%, rgba(212,175,55,0.42) 48%, rgba(184,134,11,0.26) 100%)",
    filter: "blur(10px)",
    opacity: 0.42,
    zIndex: 1,
    pointerEvents: "none",
  },

  card: {
    position: "relative",
    width: 320,
    borderRadius: 18,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, rgba(10,10,10,0.98) 0%, rgba(0,0,0,1) 100%)",
    border:
      "1px solid rgba(212,175,55,0.88)",
    boxShadow:
      `
      0 0 6px rgba(255,248,214,0.10),
      0 0 14px rgba(212,175,55,0.14),
      0 0 26px rgba(184,134,11,0.08)
    `,
    backdropFilter: "blur(14px)",
    zIndex: 2,
  },

  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background:
      "linear-gradient(90deg, transparent 0%, #fff8d6 14%, #d4af37 48%, #b8860b 76%, transparent 100%)",
    zIndex: 20,
  },

  imageWrap: {
    position: "relative",
    width: "100%",
    height: 118,
    overflow: "hidden",
    background: "#000000",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  imageOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.52) 100%)",
    pointerEvents: "none",
  },

  noImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #111 0%, #000 100%)",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: 28,
    textShadow: "none",
  },

  best: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: "4px 9px",
    borderRadius: 5,
    background:
      "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 900,
    lineHeight: 1,
    textShadow: "none",
    zIndex: 10,
  },

  closeBtn: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 28,
    height: 28,
    border: "none",
    borderRadius: "50%",
    background: "transparent",
    color: "#ff4d6d",
    cursor: "pointer",
    fontSize: 26,
    lineHeight: "24px",
    fontWeight: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textShadow: "none",
    zIndex: 20,
  },

  content: {
    padding: "15px 16px 16px",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
  },

  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.2,
    letterSpacing: "-0.4px",
    textShadow: "none",
  },

  bestMini: {
    padding: "3px 7px",
    borderRadius: 5,
    background:
      "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 900,
    lineHeight: 1,
    textShadow: "none",
  },

  meta: {
    marginTop: 13,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  metaStrong: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 800,
    textShadow: "none",
  },

  metaText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: 500,
    textShadow: "none",
  },

  divider: {
    marginTop: 12,
    width: "100%",
    height: 1,
    background:
      "linear-gradient(90deg, transparent, rgba(212,175,55,0.34), transparent)",
  },

  address: {
    marginTop: 13,
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    lineHeight: 1.45,
    textShadow: "none",
  },

  description: {
    marginTop: 17,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.45,
    textShadow: "none",
  },

  priceRow: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  discount: {
    minWidth: 58,
    height: 35,
    padding: "0 10px",
    borderRadius: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,0,93,0.12)",
    border:
      "1px solid rgba(255,0,93,0.92)",
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 500,
    textShadow: "none",
  },

  originalPrice: {
    color: "rgba(255,255,255,0.54)",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "line-through",
    textShadow: "none",
  },

  price: {
    marginLeft: "auto",
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.5px",
    textShadow: "none",
  },

  detailBtn: {
    width: "100%",
    height: 48,
    marginTop: 16,
    border: "none",
    borderRadius: 6,
    background:
      "linear-gradient(180deg, #ff005d 0%, #d9005f 100%)",
    color: "#ffffff",
    fontSize: 17,
    fontWeight: 700,
    cursor: "pointer",
    textShadow: "none",
  },
};

export default memo(MapOverlay);