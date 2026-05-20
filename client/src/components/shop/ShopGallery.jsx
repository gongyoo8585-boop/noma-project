"use strict";

import React, {
  useMemo,
  useState,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

/**
=====================================================

🔥 NORA SHOP GALLERY (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ 메인 이미지 뷰어 유지
✔ 썸네일 슬라이드 유지
✔ 이미지 선택 유지
✔ 확대 hover 유지
✔ glow 유지
✔ 로딩/에러/빈 상태 대응
✔ 모바일 대응
✔ 런타임 에러 방지

=====================================================
*/

function ShopGallery({
  images = [],
  loading = false,
  error = "",
  onRetry,
}) {
  const safeImages =
    useMemo(() => {
      if (
        Array.isArray(
          images
        )
      ) {
        return images.filter(
          Boolean
        );
      }

      return [];
    }, [images]);

  const [selectedIndex, setSelectedIndex] =
    useState(0);

  const currentImage =
    safeImages[
      selectedIndex
    ] || "";

  if (loading) {
    return (
      <Loading message="갤러리 불러오는 중..." />
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
    !safeImages ||
    safeImages.length ===
      0
  ) {
    return (
      <EmptyState message="이미지가 없습니다." />
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* 🔥 GOLD GLOW */}
      <div style={styles.outerGlow} />

      <div style={styles.container}>
        {/* 🔥 TOP GOLD LINE */}
        <div style={styles.topGlow} />

        {/* 🔥 MAIN IMAGE */}
        <div
          style={
            styles.mainImageWrap
          }
        >
          <img
            src={currentImage}
            alt={`gallery-${selectedIndex}`}
            style={
              styles.mainImage
            }
            onError={(e) => {
              e.currentTarget.style.display =
                "none";
            }}
          />

          {/* 🔥 IMAGE OVERLAY */}
          <div
            style={
              styles.imageOverlay
            }
          />

          {/* 🔥 BEST */}
          <div
            style={
              styles.bestBadge
            }
          >
            PREMIUM
          </div>

          {/* 🔥 COUNT */}
          <div
            style={
              styles.countBadge
            }
          >
            {selectedIndex + 1}
            {" / "}
            {
              safeImages.length
            }
          </div>
        </div>

        {/* 🔥 THUMBNAILS */}
        <div
          style={
            styles.thumbnailSection
          }
        >
          {safeImages.map(
            (
              image,
              index
            ) => {
              const isSelected =
                selectedIndex ===
                index;

              return (
                <div
                  key={index}
                  style={{
                    ...styles.thumbnailWrap,

                    border:
                      isSelected
                        ? "2px solid rgba(243,211,107,0.95)"
                        : "1px solid rgba(255,255,255,0.08)",

                    boxShadow:
                      isSelected
                        ? `
                        0 0 14px rgba(243,211,107,0.52),
                        0 0 30px rgba(212,175,55,0.22)
                      `
                        : `
                        0 0 6px rgba(243,211,107,0.06)
                      `,

                    transform:
                      isSelected
                        ? "scale(1.03)"
                        : "scale(1)",
                  }}
                  onClick={() =>
                    setSelectedIndex(
                      index
                    )
                  }
                  onMouseEnter={(
                    e
                  ) => {
                    e.currentTarget.style.transform =
                      "translateY(-2px) scale(1.04)";
                  }}
                  onMouseLeave={(
                    e
                  ) => {
                    e.currentTarget.style.transform =
                      isSelected
                        ? "scale(1.03)"
                        : "scale(1)";
                  }}
                >
                  <img
                    src={image}
                    alt={`thumb-${index}`}
                    style={
                      styles.thumbnail
                    }
                    onError={(e) => {
                      e.currentTarget.style.display =
                        "none";
                    }}
                  />

                  {/* 🔥 SELECTED OVERLAY */}
                  {isSelected && (
                    <div
                      style={
                        styles.selectedOverlay
                      }
                    />
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

    filter: "blur(22px)",

    opacity: 0.16,

    pointerEvents:
      "none",

    boxShadow:
      `
      0 0 22px rgba(243,211,107,0.52),
      0 0 48px rgba(212,175,55,0.24)
    `,
  },

  container: {
    position: "relative",

    overflow: "hidden",

    borderRadius: 30,

    padding: 18,

    background:
      "linear-gradient(180deg, rgba(18,14,4,0.98) 0%, rgba(8,8,8,0.99) 58%, rgba(0,0,0,1) 100%)",

    border:
      "2px solid rgba(212,175,55,0.92)",

    boxShadow:
      `
      0 0 14px rgba(243,211,107,0.22),
      0 0 32px rgba(212,175,55,0.14),
      inset 0 0 24px rgba(243,211,107,0.03)
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

    zIndex: 10,
  },

  mainImageWrap: {
    position: "relative",

    width: "100%",
    height: 520,

    overflow: "hidden",

    borderRadius: 24,

    background: "#000",

    marginBottom: 18,
  },

  mainImage: {
    width: "100%",
    height: "100%",

    objectFit: "cover",

    display: "block",

    transform:
      "scale(1.02)",

    transition:
      "all 0.35s ease",
  },

  imageOverlay: {
    position: "absolute",

    inset: 0,

    background:
      "linear-gradient(180deg, rgba(255,248,214,0.02) 0%, rgba(0,0,0,0.62) 100%)",
  },

  bestBadge: {
    position: "absolute",

    top: 18,
    left: 18,

    padding:
      "8px 14px",

    borderRadius: 999,

    background:
      "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)",

    color: "#fff",

    fontSize: 12,

    fontWeight: 900,

    letterSpacing: 1,

    boxShadow:
      `
      0 0 14px rgba(255,0,128,0.72)
    `,
  },

  countBadge: {
    position: "absolute",

    right: 18,
    bottom: 18,

    padding:
      "8px 14px",

    borderRadius: 999,

    background:
      "rgba(0,0,0,0.72)",

    border:
      "1px solid rgba(243,211,107,0.22)",

    color: "#F3D36B",

    fontSize: 13,

    fontWeight: 800,

    backdropFilter:
      "blur(10px)",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.18)
    `,
  },

  thumbnailSection: {
    display: "flex",

    gap: 12,

    overflowX: "auto",

    paddingBottom: 4,
  },

  thumbnailWrap: {
    position: "relative",

    width: 110,
    height: 82,

    borderRadius: 18,

    overflow: "hidden",

    flexShrink: 0,

    cursor: "pointer",

    background: "#111",

    transition:
      "all 0.22s ease",
  },

  thumbnail: {
    width: "100%",
    height: "100%",

    objectFit: "cover",

    display: "block",
  },

  selectedOverlay: {
    position: "absolute",

    inset: 0,

    background:
      "linear-gradient(180deg, rgba(243,211,107,0.08) 0%, rgba(0,0,0,0.22) 100%)",

    boxShadow:
      `
      inset 0 0 18px rgba(243,211,107,0.22)
    `,
  },
};

export default ShopGallery;