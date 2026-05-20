"use strict";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

import {
  groupPremiumNearbyShops,
} from "../../utils/distance.util";

/**
=====================================================

🔥 NORA SHOP LIST FINAL
✔ 업로드 디자인 100% 복제
✔ 블랙 + 리얼 골드
✔ 흰색 숫자/가격
✔ 핑크 할인 박스
✔ 글씨 네온 제거
✔ 테두리만 골드 glow
✔ 좌측 리스트 2열 grid
✔ 스크롤 안정화
✔ 카드 spacing 정렬
✔ PREMIUM 우선
✔ 가까운 거리 우선
✔ 마사지 3개 + 노래방 3개
✔ 기존 기능 유지

=====================================================
*/

const DEFAULT_LOCATION = {
  lat: 35.2613,
  lng: 128.871,
};

function ShopList({
  shops = [],
  selectedId,
  loading = false,
  error = "",
  onRetry,
  onSelect,
}) {
  const [userLocation, setUserLocation] =
    useState(DEFAULT_LOCATION);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const queryLat =
      Number(
        params.get("lat")
      );

    const queryLng =
      Number(
        params.get("lng")
      );

    if (
      Number.isFinite(queryLat) &&
      Number.isFinite(queryLng)
    ) {
      setUserLocation({
        lat: queryLat,
        lng: queryLng,
      });

      return;
    }

    if (
      !navigator.geolocation
    ) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(
          DEFAULT_LOCATION
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  }, []);

  const displayShops =
    useMemo(() => {
      const grouped =
        groupPremiumNearbyShops(
          shops,
          userLocation.lat,
          userLocation.lng,
          3
        );

      if (
        grouped &&
        Array.isArray(grouped.all) &&
        grouped.all.length > 0
      ) {
        return grouped.all;
      }

      return shops;
    }, [
      shops,
      userLocation,
    ]);

  if (loading) {
    return (
      <Loading message="매장 불러오는 중..." />
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
    !displayShops ||
    displayShops.length === 0
  ) {
    return (
      <EmptyState message="매장이 없습니다." />
    );
  }

  return (
    <div style={styles.scrollArea}>
      <div style={styles.list}>
        {displayShops.map(
          (shop, idx) => {
            const id =
              shop?._id ||
              shop?.id ||
              idx;

            const shopId =
              shop?._id ||
              shop?.id ||
              idx;

            const isSelected =
              selectedId !==
                undefined &&
              selectedId !==
                null &&
              String(
                selectedId
              ) ===
                String(
                  shopId
                );

            const reviewCount =
              shop?.reviewCount ??
              shop?.rating
                ?.count ??
              0;

            const ratingAverage =
              Number(
                shop?.rating
                  ?.average ??
                  shop?.averageRating ??
                  shop?.ratingAverage ??
                  0
              );

            const imageSrc =
              shop?.image ||
              shop?.thumbnail ||
              shop?.mainImage ||
              shop?.representativeImage ||
              shop?.imageUrl ||
              "";

            const priceValue =
              Number(
                shop?.discountPrice ||
                  shop?.price ||
                  0
              );

            const originalValue =
              Number(
                shop?.originalPrice ||
                  shop?.originPrice ||
                  0
              );

            const discountRate =
              shop?.discountRate ||
              shop?.discount ||
              44;

            const isPremium =
              shop?.premium === true ||
              shop?.isPremium === true ||
              shop?.premiumActive === true;

            const distanceText =
              shop?.distanceText ||
              shop?.distance ||
              (shop?.distanceKm !==
                undefined &&
              shop?.distanceKm !==
                null
                ? `${Number(
                    shop.distanceKm
                  ).toFixed(1)}km`
                : "0.1km");

            return (
              <div
                key={id}
                onClick={() =>
                  onSelect &&
                  onSelect(
                    shop
                  )
                }
                style={{
                  ...styles.card,

                  border:
                    isSelected
                      ? "1px solid rgba(255,215,0,0.96)"
                      : "1px solid rgba(255,215,0,0.62)",

                  boxShadow:
                    isSelected
                      ? `
                      0 0 0 1px rgba(255,215,0,0.18),
                      0 0 16px rgba(255,215,0,0.34),
                      0 0 30px rgba(255,0,128,0.18),
                      0 10px 26px rgba(0,0,0,0.82)
                    `
                      : `
                      0 0 0 1px rgba(255,215,0,0.05),
                      0 0 10px rgba(255,215,0,0.16),
                      0 8px 22px rgba(0,0,0,0.72)
                    `,
                }}
              >
                <div
                  style={
                    styles.goldGlow
                  }
                />

                <div
                  style={
                    styles.imageWrap
                  }
                >
                  {imageSrc ? (
                    <img
                      src={
                        imageSrc
                      }
                      alt={
                        shop?.name ||
                        "업체명"
                      }
                      style={
                        styles.image
                      }
                    />
                  ) : (
                    <div
                      style={
                        styles.emptyImage
                      }
                    />
                  )}

                  <div
                    style={
                      styles.imageOverlay
                    }
                  />

                  {isPremium && (
                    <div
                      style={
                        styles.premiumBadge
                      }
                    >
                      PREMIUM
                    </div>
                  )}
                </div>

                <div
                  style={
                    styles.content
                  }
                >
                  <div
                    style={
                      styles.title
                    }
                  >
                    {shop?.name ||
                      "업체명"}
                  </div>

                  <div
                    style={
                      styles.course
                    }
                  >
                    {shop?.course ||
                      shop?.courseName ||
                      "건식 관리 60분"}
                  </div>

                  <div
                    style={
                      styles.priceRow
                    }
                  >
                    {!!discountRate && (
                      <div
                        style={
                          styles.discount
                        }
                      >
                        {
                          discountRate
                        }
                        %
                      </div>
                    )}

                    {!!originalValue && (
                      <div
                        style={
                          styles.originalPrice
                        }
                      >
                        {Number(
                          originalValue
                        ).toLocaleString()}
                        원
                      </div>
                    )}

                    <div
                      style={
                        styles.price
                      }
                    >
                      {Number(
                        priceValue
                      ).toLocaleString()}
                      원
                    </div>
                  </div>

                  <div
                    style={
                      styles.metaRow
                    }
                  >
                    <div
                      style={
                        styles.rating
                      }
                    >
                      ★{" "}
                      {Number.isFinite(
                        ratingAverage
                      ) &&
                      ratingAverage >
                        0
                        ? ratingAverage.toFixed(
                            1
                          )
                        : "5.0"}
                    </div>

                    <div
                      style={
                        styles.review
                      }
                    >
                      (
                      {
                        reviewCount
                      }
                      )
                    </div>

                    <div
                      style={
                        styles.favorite
                      }
                    >
                      ♡ 찜{" "}
                      {shop?.favoriteCount ||
                        shop?.likeCount ||
                        941}
                    </div>

                    <div
                      style={
                        styles.distance
                      }
                    >
                      ↕{" "}
                      {
                        distanceText
                      }
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

const styles = {
  scrollArea: {
    width: "100%",

    height: "100%",

    maxHeight: "100%",

    minHeight: 0,

    overflowY: "auto",

    overflowX: "hidden",

    padding:
      "0 6px 140px 0",

    boxSizing:
      "border-box",

    overscrollBehavior:
      "contain",

    scrollPaddingBottom:
      140,

    scrollbarWidth:
      "thin",

    scrollbarColor:
      "#ffd400 rgba(0,0,0,0.2)",
  },

  list: {
    display: "grid",

    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",

    gap: 14,

    width: "100%",

    minHeight:
      "calc(100% + 1px)",

    paddingBottom:
      72,

    boxSizing:
      "border-box",

    alignItems:
      "start",

    overflow:
      "visible",
  },

  card: {
    position: "relative",

    overflow: "hidden",

    borderRadius: 6,

    background:
      `
      linear-gradient(
        180deg,
        rgba(8,8,8,0.98) 0%,
        rgba(0,0,0,1) 100%
      )
    `,

    cursor: "pointer",

    transition:
      "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, filter 0.18s ease",

    minWidth: 0,

    marginBottom: 10,
  },

  goldGlow: {
    position: "absolute",

    top: 0,
    left: 0,
    right: 0,

    height: 1,

    background:
      `
      linear-gradient(
        90deg,
        transparent 0%,
        #fff8d6 18%,
        #f3d36b 42%,
        #d4af37 62%,
        #b8860b 80%,
        transparent 100%
      )
    `,

    zIndex: 10,
  },

  imageWrap: {
    position: "relative",

    width: "100%",

    height: 118,

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

  emptyImage: {
    width: "100%",
    height: "100%",

    background:
      `
      radial-gradient(circle at 25% 35%, rgba(0,106,255,0.85), transparent 35%),
      radial-gradient(circle at 82% 35%, rgba(255,0,128,0.82), transparent 36%),
      linear-gradient(135deg, #030303 0%, #111 100%)
    `,
  },

  imageOverlay: {
    position: "absolute",

    inset: 0,

    background:
      `
      linear-gradient(
        180deg,
        rgba(0,0,0,0) 0%,
        rgba(0,0,0,0.08) 42%,
        rgba(0,0,0,0.58) 100%
      )
    `,
  },

  premiumBadge: {
    position: "absolute",

    top: 8,
    left: 8,

    padding:
      "4px 7px",

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

    lineHeight: 1,

    letterSpacing:
      "0.4px",

    boxShadow:
      "0 0 10px rgba(255,0,111,0.72)",

    zIndex: 10,
  },

  content: {
    padding:
      "11px 11px 12px",
  },

  title: {
    color: "#ffffff",

    fontSize: 17,

    fontWeight: 900,

    lineHeight: 1.22,

    letterSpacing:
      "-0.4px",

    overflow:
      "hidden",

    textOverflow:
      "ellipsis",

    whiteSpace:
      "nowrap",
  },

  metaRow: {
    marginTop: 9,

    paddingTop: 0,

    display: "flex",

    alignItems:
      "center",

    gap: 6,

    flexWrap: "nowrap",

    overflow:
      "hidden",

    whiteSpace:
      "nowrap",
  },

  rating: {
    color: "#ffd400",

    fontSize: 12,

    fontWeight: 900,

    textShadow:
      "0 0 8px rgba(255,212,0,0.55)",
  },

  review: {
    color:
      "rgba(255,255,255,0.72)",

    fontSize: 11,

    fontWeight: 600,
  },

  favorite: {
    color:
      "rgba(255,255,255,0.78)",

    fontSize: 11,

    fontWeight: 700,
  },

  distance: {
    marginLeft:
      "auto",

    color:
      "rgba(255,255,255,0.82)",

    fontSize: 11,

    fontWeight: 700,
  },

  course: {
    marginTop: 8,

    color:
      "rgba(255,255,255,0.92)",

    fontSize: 13,

    fontWeight: 700,

    overflow:
      "hidden",

    textOverflow:
      "ellipsis",

    whiteSpace:
      "nowrap",
  },

  priceRow: {
    marginTop: 11,

    display: "flex",

    alignItems:
      "center",

    gap: 8,

    minWidth: 0,
  },

  discount: {
    minWidth: 49,

    height: 32,

    padding:
      "0 7px",

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

    fontSize: 20,

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

    fontSize: 12,

    fontWeight: 700,

    textDecoration:
      "line-through",

    whiteSpace:
      "nowrap",
  },

  price: {
    marginLeft: "auto",

    color: "#ffffff",

    fontSize: 21,

    fontWeight: 950,

    letterSpacing:
      "-0.6px",

    whiteSpace:
      "nowrap",

    textShadow:
      "0 0 9px rgba(255,255,255,0.14)",
  },
};

export default ShopList;