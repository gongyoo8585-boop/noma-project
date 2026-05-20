"use strict";

import React, {
  memo,
  useMemo,
  useCallback,
} from "react";

/**
 * =========================================================
 * /client/src/components/map/ShopMapCard.jsx
 *
 * NORA ULTRA PREMIUM FINAL
 * 업로드한 화면 기준 100% 복제형
 * 블랙 + 메탈 골드 + 핑크 포인트
 * 글씨 네온 제거
 * 숫자/가격 흰색
 * 할인 박스 핑크
 * 테두리만 골드 glow
 *
 * =========================================================
 */

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1200&auto=format&fit=crop";

function ShopMapCard({
  shop = {},
  visible = true,
  loading = false,
  onClose,
  onClick,
  onDetailClick,
  onFavoriteClick,
}) {
  const safeShop =
    useMemo(() => {
      return {
        id:
          shop?.id ||
          shop?._id ||
          Date.now(),

        name:
          shop?.name ||
          "더 스크럽 테라피",

        image:
          shop?.image ||
          shop?.thumbnail ||
          shop?.imageUrl ||
          DEFAULT_IMAGE,

        rating:
          Number(shop?.rating) ||
          5.0,

        reviewCount:
          Number(
            shop?.reviewCount
          ) || 125,

        favoriteCount:
          Number(
            shop?.favoriteCount
          ) || 941,

        distance:
          shop?.distance ||
          "0.1km",

        address:
          shop?.address ||
          "경상남도 김해시 삼계동 1479-2",

        course:
          shop?.course ||
          "건식 관리 60분",

        price:
          Number(shop?.price) ||
          45000,

        originalPrice:
          Number(
            shop?.originalPrice
          ) || 80000,

        discountRate:
          Number(
            shop?.discountRate
          ) || 44,

        badge:
          shop?.badge ||
          "BEST",
      };
    }, [shop]);

  const formattedPrice =
    useMemo(() => {
      return safeShop.price.toLocaleString();
    }, [safeShop.price]);

  const formattedOriginalPrice =
    useMemo(() => {
      return safeShop.originalPrice.toLocaleString();
    }, [safeShop.originalPrice]);

  const handleCardClick =
    useCallback(() => {
      try {
        if (
          typeof onClick ===
          "function"
        ) {
          onClick(safeShop);
        }
      } catch (err) {
        console.error(err);
      }
    }, [onClick, safeShop]);

  const handleDetailClick =
    useCallback(
      (event) => {
        event.stopPropagation();

        try {
          if (
            typeof onDetailClick ===
            "function"
          ) {
            onDetailClick(
              safeShop
            );
          }
        } catch (err) {
          console.error(err);
        }
      },
      [
        onDetailClick,
        safeShop,
      ]
    );

  const handleFavoriteClick =
    useCallback(
      (event) => {
        event.stopPropagation();

        try {
          if (
            typeof onFavoriteClick ===
            "function"
          ) {
            onFavoriteClick(
              safeShop
            );
          }
        } catch (err) {
          console.error(err);
        }
      },
      [
        onFavoriteClick,
        safeShop,
      ]
    );

  const handleClose =
    useCallback(
      (event) => {
        event.stopPropagation();

        try {
          if (
            typeof onClose ===
            "function"
          ) {
            onClose();
          }
        } catch (err) {
          console.error(err);
        }
      },
      [onClose]
    );

  if (!visible) {
    return null;
  }

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingText}>
          매장 정보를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div
      style={styles.wrapper}
      onClick={
        handleCardClick
      }
    >
      <div style={styles.topLine} />

      <button
        type="button"
        onClick={
          handleClose
        }
        style={
          styles.closeButton
        }
      >
        ×
      </button>

      <div style={styles.imageWrap}>
        <img
          src={safeShop.image}
          alt={safeShop.name}
          style={styles.image}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src =
              DEFAULT_IMAGE;
          }}
        />

        <div
          style={
            styles.imageOverlay
          }
        />

        <div style={styles.badge}>
          {safeShop.badge}
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.titleRow}>
          <div style={styles.title}>
            {safeShop.name}
          </div>

          <div style={styles.smallBadge}>
            {safeShop.badge}
          </div>

          <button
            type="button"
            onClick={
              handleFavoriteClick
            }
            style={
              styles.favoriteButton
            }
          >
            ♡
          </button>
        </div>

        <div style={styles.metaRow}>
          <div style={styles.rating}>
            ★ {safeShop.rating}
          </div>

          <div style={styles.review}>
            ({safeShop.reviewCount})
          </div>

          <div style={styles.favorite}>
            ♡ 찜 {safeShop.favoriteCount}
          </div>

          <div style={styles.distance}>
            ⦿ {safeShop.distance}
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.address}>
          ⦿ {safeShop.address}
        </div>

        <div style={styles.course}>
          {safeShop.course}
        </div>

        <div style={styles.priceRow}>
          <div style={styles.discount}>
            {safeShop.discountRate}%
          </div>

          <div style={styles.originalPrice}>
            {formattedOriginalPrice}원
          </div>

          <div style={styles.price}>
            {formattedPrice}원
          </div>
        </div>

        <button
          type="button"
          onClick={
            handleDetailClick
          }
          style={
            styles.detailButton
          }
        >
          상세보기
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: 320,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
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
    cursor: "pointer",
    color: "#ffffff",
  },

  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background:
      "linear-gradient(90deg, transparent 0%, #fff8d6 14%, #d4af37 48%, #b8860b 76%, transparent 100%)",
    zIndex: 10,
  },

  loadingWrap: {
    width: 320,
    height: 420,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "rgba(0,0,0,0.98)",
    border:
      "1px solid rgba(212,175,55,0.72)",
  },

  loadingText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    textShadow: "none",
  },

  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: "#ff4d6d",
    fontSize: 26,
    lineHeight: "24px",
    fontWeight: 300,
    cursor: "pointer",
    zIndex: 30,
    textShadow: "none",
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
  },

  badge: {
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

  smallBadge: {
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

  favoriteButton: {
    marginLeft: "auto",
    width: 28,
    height: 28,
    border: "none",
    background: "transparent",
    color: "#ff006e",
    fontSize: 22,
    lineHeight: "26px",
    cursor: "pointer",
    textShadow: "none",
  },

  metaRow: {
    marginTop: 13,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    color: "#ffffff",
  },

  rating: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 800,
    textShadow: "none",
  },

  review: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontWeight: 500,
    textShadow: "none",
  },

  favorite: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
    fontWeight: 600,
    textShadow: "none",
  },

  distance: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
    fontWeight: 600,
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

  course: {
    marginTop: 17,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
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
    background:
      "rgba(255,0,93,0.12)",
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

  detailButton: {
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

export default memo(
  ShopMapCard
);