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

🔥 NORA SHOP LOCATION (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ 지도 영역 유지
✔ 위치 정보 유지
✔ 주소 복사 유지
✔ 길찾기 버튼 유지
✔ 카카오맵 버튼 유지
✔ glow 유지
✔ hover 유지
✔ 런타임 에러 방지
✔ 로딩/에러/빈 상태 대응

=====================================================
*/

function ShopLocation({
  shop = {},
  loading = false,
  error = "",
  onRetry,
  onDirections,
  onOpenMap,
}) {
  const [copied, setCopied] =
    useState(false);

  const locationData =
    useMemo(() => {
      return {
        lat:
          shop?.lat ||
          35.1796,

        lng:
          shop?.lng ||
          129.0756,

        address:
          shop?.address ||
          "부산광역시 해운대구 우동 000-0",

        region:
          shop?.region ||
          "부산 해운대",

        distance:
          shop?.distance ||
          "0.2km",
      };
    }, [shop]);

  const handleCopy =
    async () => {
      try {
        if (
          navigator?.clipboard
        ) {
          await navigator.clipboard.writeText(
            locationData.address
          );

          setCopied(true);

          setTimeout(() => {
            setCopied(false);
          }, 2000);
        }
      } catch (e) {
        console.error(
          "주소 복사 오류:",
          e
        );
      }
    };

  if (loading) {
    return (
      <Loading message="위치 정보를 불러오는 중..." />
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
      <EmptyState message="위치 정보가 없습니다." />
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
              LOCATION
            </div>

            <div
              style={
                styles.subTitle
              }
            >
              매장 위치 및 교통 안내
            </div>
          </div>

          <div
            style={
              styles.distanceBadge
            }
          >
            📍{" "}
            {
              locationData.distance
            }
          </div>
        </div>

        {/* 🔥 MAP AREA */}
        <div
          style={
            styles.mapWrap
          }
        >
          {/* MAP BACKGROUND */}
          <div
            style={
              styles.mapBackground
            }
          />

          {/* GRID */}
          <div
            style={
              styles.gridOverlay
            }
          />

          {/* GOLD RADAR */}
          <div
            style={
              styles.radar
            }
          />

          {/* PINK RADAR */}
          <div
            style={
              styles.pinkRadar
            }
          />

          {/* CENTER MARKER */}
          <div
            style={
              styles.markerWrap
            }
          >
            <div
              style={
                styles.markerGlow
              }
            />

            <div
              style={
                styles.marker
              }
            >
              📍
            </div>
          </div>

          {/* MINI INFO */}
          <div
            style={
              styles.mapInfoCard
            }
          >
            <div
              style={
                styles.mapShopName
              }
            >
              {shop?.name ||
                "NORA"}
            </div>

            <div
              style={
                styles.mapAddress
              }
            >
              {
                locationData.region
              }
            </div>
          </div>

          {/* ZOOM */}
          <div
            style={
              styles.zoomWrap
            }
          >
            <button
              type="button"
              style={
                styles.zoomBtn
              }
            >
              +
            </button>

            <button
              type="button"
              style={
                styles.zoomBtn
              }
            >
              −
            </button>
          </div>
        </div>

        {/* 🔥 ADDRESS CARD */}
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
            📌
          </div>

          <div
            style={
              styles.infoContent
            }
          >
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
              {
                locationData.address
              }
            </div>
          </div>

          <button
            type="button"
            style={{
              ...styles.copyBtn,

              background:
                copied
                  ? "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)"
                  : "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)",
            }}
            onClick={
              handleCopy
            }
          >
            {copied
              ? "복사완료"
              : "주소복사"}
          </button>
        </div>

        {/* 🔥 LAT LNG */}
        <div
          style={
            styles.coordWrap
          }
        >
          <div
            style={
              styles.coordCard
            }
          >
            <div
              style={
                styles.coordLabel
              }
            >
              LATITUDE
            </div>

            <div
              style={
                styles.coordValue
              }
            >
              {
                locationData.lat
              }
            </div>
          </div>

          <div
            style={
              styles.coordCard
            }
          >
            <div
              style={
                styles.coordLabel
              }
            >
              LONGITUDE
            </div>

            <div
              style={
                styles.coordValue
              }
            >
              {
                locationData.lng
              }
            </div>
          </div>
        </div>

        {/* 🔥 ACTIONS */}
        <div
          style={
            styles.actionWrap
          }
        >
          <button
            type="button"
            style={
              styles.directionBtn
            }
            onClick={() =>
              onDirections &&
              onDirections(
                shop
              )
            }
          >
            길찾기
          </button>

          <button
            type="button"
            style={
              styles.kakaoBtn
            }
            onClick={() =>
              onOpenMap &&
              onOpenMap(shop)
            }
          >
            카카오맵
          </button>
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

  distanceBadge: {
    minWidth: 90,

    height: 42,

    padding:
      "0 16px",

    borderRadius: 999,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "rgba(243,211,107,0.08)",

    border:
      "1px solid rgba(243,211,107,0.22)",

    color: "#F3D36B",

    fontSize: 14,

    fontWeight: 800,

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.12)
    `,
  },

  mapWrap: {
    position: "relative",

    width: "100%",
    height: 420,

    overflow: "hidden",

    borderRadius: 26,

    background:
      "linear-gradient(135deg, #050505 0%, #0c0c0c 100%)",

    border:
      "1px solid rgba(243,211,107,0.16)",

    marginBottom: 24,
  },

  mapBackground: {
    position: "absolute",

    inset: 0,

    background:
      `
      radial-gradient(circle at center, rgba(243,211,107,0.06) 0%, rgba(0,0,0,0) 60%),
      linear-gradient(135deg, rgba(10,10,10,0.96) 0%, rgba(0,0,0,1) 100%)
    `,
  },

  gridOverlay: {
    position: "absolute",

    inset: 0,

    backgroundImage:
      `
      linear-gradient(rgba(243,211,107,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(243,211,107,0.05) 1px, transparent 1px)
    `,

    backgroundSize:
      "44px 44px",
  },

  radar: {
    position: "absolute",

    top: "50%",
    left: "50%",

    width: 280,
    height: 280,

    transform:
      "translate(-50%, -50%)",

    borderRadius: "50%",

    border:
      "1px solid rgba(243,211,107,0.18)",

    boxShadow:
      `
      0 0 42px rgba(243,211,107,0.12)
    `,
  },

  pinkRadar: {
    position: "absolute",

    top: "50%",
    left: "50%",

    width: 160,
    height: 160,

    transform:
      "translate(-50%, -50%)",

    borderRadius: "50%",

    border:
      "1px solid rgba(255,0,128,0.18)",

    boxShadow:
      `
      0 0 42px rgba(255,0,128,0.12)
    `,
  },

  markerWrap: {
    position: "absolute",

    top: "50%",
    left: "50%",

    transform:
      "translate(-50%, -50%)",

    zIndex: 10,
  },

  markerGlow: {
    position: "absolute",

    top: "50%",
    left: "50%",

    width: 84,
    height: 84,

    transform:
      "translate(-50%, -50%)",

    borderRadius: "50%",

    background:
      "rgba(255,0,128,0.28)",

    filter: "blur(18px)",
  },

  marker: {
    position: "relative",

    width: 64,
    height: 64,

    borderRadius: "50%",

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)",

    color: "#fff",

    fontSize: 28,

    fontWeight: 900,

    boxShadow:
      `
      0 0 20px rgba(255,0,128,0.62),
      0 0 44px rgba(255,0,128,0.24)
    `,
  },

  mapInfoCard: {
    position: "absolute",

    left: 22,
    bottom: 22,

    padding:
      "14px 18px",

    borderRadius: 18,

    background:
      "rgba(0,0,0,0.72)",

    border:
      "1px solid rgba(243,211,107,0.18)",

    backdropFilter:
      "blur(12px)",

    boxShadow:
      `
      0 0 16px rgba(243,211,107,0.12)
    `,
  },

  mapShopName: {
    color: "#fff",

    fontSize: 16,

    fontWeight: 800,

    marginBottom: 6,
  },

  mapAddress: {
    color:
      "rgba(255,255,255,0.62)",

    fontSize: 12,
  },

  zoomWrap: {
    position: "absolute",

    top: 20,
    right: 20,

    display: "flex",

    flexDirection:
      "column",

    gap: 10,
  },

  zoomBtn: {
    width: 42,
    height: 42,

    borderRadius: 14,

    border:
      "1px solid rgba(243,211,107,0.18)",

    background:
      "rgba(0,0,0,0.72)",

    color: "#F3D36B",

    fontSize: 22,

    fontWeight: 900,

    cursor: "pointer",

    backdropFilter:
      "blur(10px)",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.12)
    `,
  },

  infoCard: {
    display: "flex",

    alignItems:
      "center",

    gap: 18,

    padding: 22,

    borderRadius: 24,

    background:
      "rgba(255,255,255,0.03)",

    border:
      "1px solid rgba(243,211,107,0.12)",

    marginBottom: 22,

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.06)
    `,
  },

  infoIcon: {
    width: 56,
    height: 56,

    borderRadius: 18,

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    background:
      "rgba(243,211,107,0.08)",

    border:
      "1px solid rgba(243,211,107,0.16)",

    color: "#F3D36B",

    fontSize: 24,

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.12)
    `,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color:
      "rgba(255,255,255,0.58)",

    fontSize: 13,

    marginBottom: 8,
  },

  infoValue: {
    color: "#fff",

    fontSize: 15,

    fontWeight: 700,

    lineHeight: 1.7,
  },

  copyBtn: {
    minWidth: 120,

    height: 48,

    padding:
      "0 18px",

    border: "none",

    borderRadius: 16,

    color: "#000",

    fontSize: 14,

    fontWeight: 900,

    cursor: "pointer",

    boxShadow:
      `
      0 0 14px rgba(243,211,107,0.22)
    `,
  },

  coordWrap: {
    display: "grid",

    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",

    gap: 16,

    marginBottom: 26,
  },

  coordCard: {
    padding: 20,

    borderRadius: 22,

    background:
      "rgba(255,255,255,0.03)",

    border:
      "1px solid rgba(243,211,107,0.12)",

    boxShadow:
      `
      0 0 12px rgba(243,211,107,0.06)
    `,
  },

  coordLabel: {
    color:
      "rgba(255,255,255,0.58)",

    fontSize: 12,

    marginBottom: 10,

    letterSpacing: 1,
  },

  coordValue: {
    color: "#F3D36B",

    fontSize: 18,

    fontWeight: 900,

    textShadow:
      `
      0 0 12px rgba(243,211,107,0.32)
    `,
  },

  actionWrap: {
    display: "flex",

    gap: 14,
  },

  directionBtn: {
    flex: 1,

    height: 56,

    border: "none",

    borderRadius: 18,

    background:
      "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)",

    color: "#000",

    fontSize: 16,

    fontWeight: 900,

    cursor: "pointer",

    boxShadow:
      `
      0 0 16px rgba(243,211,107,0.28)
    `,
  },

  kakaoBtn: {
    flex: 1,

    height: 56,

    border: "none",

    borderRadius: 18,

    background:
      "linear-gradient(135deg, #ff005d 0%, #ff3d91 100%)",

    color: "#fff",

    fontSize: 16,

    fontWeight: 900,

    cursor: "pointer",

    boxShadow:
      `
      0 0 16px rgba(255,0,128,0.32)
    `,
  },
};

export default ShopLocation;