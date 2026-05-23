"use strict";

import React, {
  memo,
  useMemo,
  useState,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * /client/src/components/shop/ShopCard.jsx
 * =====================================================
 */

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1200&auto=format&fit=crop";

function ShopCard({
  shop = {},
  onClick,
  onLike,
  onView,
  loading = false,
  error = "",
}) {
  const [imageError, setImageError] =
    useState(false);

  const [isHover, setIsHover] =
    useState(false);

  const normalizeImageUrl = (
    value
  ) => {
    if (!value) {
      return "";
    }

    const image =
      String(value).trim();

    if (!image) {
      return "";
    }

    if (
      image.startsWith(
        "http://"
      ) ||
      image.startsWith(
        "https://"
      ) ||
      image.startsWith(
        "data:image"
      ) ||
      image.startsWith(
        "blob:"
      )
    ) {
      return image;
    }

    if (
      image.startsWith("/")
    ) {
      return `${window.location.origin}${image}`;
    }

    return image;
  };

  const getImageValue = (
    value
  ) => {
    if (!value) {
      return "";
    }

    if (
      typeof value ===
      "string"
    ) {
      return normalizeImageUrl(
        value
      );
    }

    if (
      typeof value ===
      "object"
    ) {
      return normalizeImageUrl(
        value.url ||
          value.src ||
          value.path ||
          value.location ||
          value.image ||
          value.imageUrl ||
          value.thumbnail ||
          value.thumbnailUrl ||
          value.mainImage ||
          value.representativeImage ||
          value.coverImage ||
          value.photo ||
          value.picture ||
          ""
      );
    }

    return "";
  };

  const getFirstImage = (
    item = {}
  ) => {
    const imageFields = [
      item?.representativeImage,
      item?.mainImage,
      item?.thumbnail,
      item?.image,
      item?.imageUrl,
      item?.thumbnailUrl,
      item?.coverImage,
      item?.photo,
      item?.picture,
    ];

    for (
      let i = 0;
      i < imageFields.length;
      i += 1
    ) {
      const value =
        getImageValue(
          imageFields[i]
        );

      if (value) {
        return value;
      }
    }

    const arrayFields = [
      item?.images,
      item?.photos,
      item?.imageUrls,
      item?.gallery,
      item?.pictures,
      item?.files,
    ];

    for (
      let i = 0;
      i < arrayFields.length;
      i += 1
    ) {
      const current =
        arrayFields[i];

      if (
        Array.isArray(
          current
        ) &&
        current.length > 0
      ) {
        const first =
          getImageValue(
            current[0]
          );

        if (first) {
          return first;
        }
      }

      if (
        typeof current ===
        "string" &&
        current.includes(",")
      ) {
        const splitImage =
          current
            .split(",")
            .map((v) =>
              v.trim()
            )
            .filter(Boolean);

        if (
          splitImage.length >
          0
        ) {
          const first =
            getImageValue(
              splitImage[0]
            );

          if (first) {
            return first;
          }
        }
      }
    }

    return DEFAULT_IMAGE;
  };

  const safeShop =
    useMemo(() => {
      return {
        id:
          shop?.id ||
          shop?._id ||
          `shop-${Date.now()}`,

        name:
          shop?.name ||
          "노라 김해 본점",

        image:
          getFirstImage(
            shop
          ),

        rating:
          Number(
            shop?.rating ||
              shop?.ratingAvg ||
              shop?.score
          ) || 5.0,

        reviewCount:
          Number(
            shop?.reviewCount ||
              shop?.reviewsCount ||
              shop?.reviews
                ?.length
          ) || 125,

        favoriteCount:
          Number(
            shop?.favoriteCount ||
              shop?.likeCount ||
              shop?.likes
          ) || 941,

        distance:
          shop?.distance ||
          "0.1km",

        course:
          shop?.course ||
          shop?.courseName ||
          shop?.service ||
          (Array.isArray(
            shop?.courses
          ) &&
            shop
              .courses[0]) ||
          "스웨디시 60분",

        location:
          shop?.locationName ||
          shop?.address ||
          shop?.roadAddress ||
          shop?.region ||
          "김해시 삼계동",

        description:
          shop?.description ||
          "프리미엄 힐링 마사지",

        price:
          Number(
            String(
              Array.isArray(
                shop?.price
              )
                ? shop.price[0]
                : shop?.price ||
                  shop?.salePrice ||
                  shop?.minPrice ||
                  90000
            ).replace(/,/g, "")
          ) || 90000,

        originalPrice:
          Number(
            String(
              Array.isArray(
                shop?.originalPrice
              )
                ? shop
                    .originalPrice[0]
                : shop?.originalPrice ||
                  shop?.originPrice ||
                  shop?.regularPrice ||
                  160200
            ).replace(/,/g, "")
          ) || 160200,

        discountRate:
          Number(
            shop?.discountRate ||
              shop?.discount ||
              shop?.saleRate
          ) || 44,

        badge:
          shop?.badge ||
          "BEST",

        premium:
          shop?.premium ===
            true ||
          shop?.isPremium ===
            true,
      };
    }, [shop]);

  const formattedPrice =
    useMemo(() => {
      return Number(
        safeShop.price
      ).toLocaleString();
    }, [safeShop.price]);

  const formattedOriginalPrice =
    useMemo(() => {
      return Number(
        safeShop.originalPrice
      ).toLocaleString();
    }, [
      safeShop.originalPrice,
    ]);

  if (loading) {
    return (
      <Loading message="업체 정보를 불러오는 중..." />
    );
  }

  if (error) {
    return (
      <ErrorMessage message={error} />
    );
  }

  if (!shop) {
    return (
      <EmptyState message="업체 정보가 없습니다." />
    );
  }

  return (
    <div
      style={{
        ...styles.wrapper,
        ...(isHover
          ? styles.wrapperHover
          : null),
      }}
      onMouseEnter={() =>
        setIsHover(true)
      }
      onMouseLeave={() =>
        setIsHover(false)
      }
      onClick={() => {
        if (
          typeof onClick ===
          "function"
        ) {
          onClick(shop);
        }
      }}
    >
      <div
        style={
          styles.goldTopLine
        }
      />

      <div
        style={
          styles.imageWrap
        }
      >
        <img
          src={
            imageError
              ? DEFAULT_IMAGE
              : safeShop.image
          }
          alt={
            safeShop.name
          }
          style={{
            ...styles.image,
            ...(isHover
              ? styles.imageHover
              : null),
          }}
          onError={() =>
            setImageError(
              true
            )
          }
        />

        <div
          style={
            styles.imageOverlay
          }
        />

        {safeShop.premium && (
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
          {safeShop.name}
        </div>

        <div
          style={
            styles.course
          }
        >
          {
            safeShop.course
          }
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
            {Number(
              safeShop.rating
            ).toFixed(1)}
          </div>

          <div
            style={
              styles.review
            }
          >
            (
            {
              safeShop.reviewCount
            }
            )
          </div>

          <div
            style={
              styles.distance
            }
          >
            ↕{" "}
            {
              safeShop.distance
            }
          </div>
        </div>

        <div
          style={
            styles.location
          }
        >
          ↕{" "}
          {
            safeShop.location
          }
        </div>

        <div
          style={
            styles.description
          }
        >
          {
            safeShop.description
          }
        </div>

        <div
          style={
            styles.priceRow
          }
        >
          <div
            style={
              styles.discount
            }
          >
            {
              safeShop.discountRate
            }
            %
          </div>

          <div
            style={
              styles.originalPrice
            }
          >
            {
              formattedOriginalPrice
            }
            원
          </div>

          <div
            style={
              styles.price
            }
          >
            {
              formattedPrice
            }
            원
          </div>
        </div>

        <button
          type="button"
          style={{
            ...styles.detailButton,
            ...(isHover
              ? styles.detailButtonHover
              : null),
          }}
          onClick={(e) => {
            e.stopPropagation();

            if (
              typeof onView ===
              "function"
            ) {
              onView(shop);
            }
          }}
        >
          상세보기
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position:
      "relative",
    width: "100%",
    borderRadius: 6,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, rgba(8,8,8,0.98) 0%, rgba(0,0,0,1) 100%)",
    border:
      "1px solid rgba(255,215,0,0.78)",
    boxShadow:
      "0 0 0 1px rgba(255,215,0,0.06), 0 0 10px rgba(255,215,0,0.16), 0 10px 28px rgba(0,0,0,0.78)",
    transition:
      "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, filter 0.18s ease",
    cursor: "pointer",
    backdropFilter:
      "blur(8px)",
    boxSizing:
      "border-box",
    marginBottom: 18,
  },

  wrapperHover: {
    transform:
      "translateY(-2px)",
    border:
      "1px solid rgba(255,215,0,0.96)",
    boxShadow:
      "0 0 0 1px rgba(255,215,0,0.14), 0 0 18px rgba(255,215,0,0.36), 0 0 34px rgba(255,0,128,0.20), 0 12px 34px rgba(0,0,0,0.86)",
    filter:
      "brightness(1.05)",
  },

  goldTopLine: {
    position:
      "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 20,
    background:
      "linear-gradient(90deg, transparent 0%, #fff6c8 18%, #f1cf62 38%, #d4af37 58%, #9f7600 82%, transparent 100%)",
  },

  imageWrap: {
    position:
      "relative",
    width: "100%",
    height: 118,
    overflow: "hidden",
    background:
      "#000",
  },

  premiumBadge: {
    position:
      "absolute",
    top: 10,
    left: 10,
    zIndex: 30,
    height: 28,
    padding:
      "0 12px",
    borderRadius: 999,
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    background:
      "linear-gradient(135deg, #ff008c 0%, #ff4dc4 100%)",
    border:
      "1px solid rgba(255,255,255,0.22)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing:
      "1px",
    boxShadow:
      "0 0 12px rgba(255,0,140,0.72), 0 0 24px rgba(255,0,140,0.38)",
    textShadow:
      "0 0 8px rgba(255,255,255,0.34)",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transform:
      "scale(1.01)",
    transition:
      "transform 0.24s ease, filter 0.24s ease",
    filter:
      "saturate(1.12) contrast(1.08)",
  },

  imageHover: {
    transform:
      "scale(1.055)",
    filter:
      "saturate(1.22) contrast(1.12) brightness(1.06)",
  },

  imageOverlay: {
    position:
      "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 44%, rgba(0,0,0,0.58) 100%)",
  },

  content: {
    padding:
      "11px 11px 18px",
    boxSizing:
      "border-box",
  },

  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: 900,
    lineHeight: 1.22,
    letterSpacing:
      "-0.4px",
    textShadow:
      "0 0 8px rgba(255,255,255,0.12)",
    overflow:
      "hidden",
    textOverflow:
      "ellipsis",
    whiteSpace:
      "nowrap",
  },

  location: {
    marginTop: 9,
    color:
      "rgba(255,255,255,0.58)",
    fontSize: 11,
    fontWeight: 500,
    overflow:
      "hidden",
    textOverflow:
      "ellipsis",
    whiteSpace:
      "nowrap",
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

  metaRow: {
    marginTop: 9,
    paddingBottom: 8,
    display: "flex",
    alignItems:
      "center",
    flexWrap: "nowrap",
    gap: 6,
    borderBottom:
      "1px solid rgba(255,215,0,0.13)",
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
      "0 0 8px rgba(255,212,0,0.62)",
  },

  review: {
    color:
      "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: 600,
  },

  distance: {
    marginLeft:
      "auto",
    color:
      "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: 700,
  },

  description: {
    marginTop: 9,
    color:
      "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 1.4,
    fontWeight: 600,
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
    gap: 9,
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
    color: "#fff",
    fontSize: 20,
    fontWeight: 950,
    lineHeight: 1,
    boxShadow:
      "inset 0 0 0 1px rgba(255,255,255,0.10), 0 0 12px rgba(255,0,111,0.54)",
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
    color: "#fff",
    fontSize: 21,
    fontWeight: 950,
    letterSpacing:
      "-0.6px",
    whiteSpace:
      "nowrap",
    textShadow:
      "0 0 9px rgba(255,255,255,0.14)",
  },

  detailButton: {
    width: "100%",
    height: 44,
    marginTop: 14,
    marginBottom: 2,
    border: "none",
    borderRadius: 4,
    background:
      "linear-gradient(180deg, #ff006f 0%, #dd004f 100%)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 900,
    letterSpacing:
      "-0.3px",
    cursor: "pointer",
    transition:
      "transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease",
    boxShadow:
      "0 0 10px rgba(255,0,111,0.24)",
  },

  detailButtonHover: {
    transform:
      "translateY(-1px)",
    filter:
      "brightness(1.08)",
    boxShadow:
      "0 0 14px rgba(255,0,111,0.66), 0 0 26px rgba(255,0,111,0.28)",
  },
};

export default memo(
  ShopCard
);