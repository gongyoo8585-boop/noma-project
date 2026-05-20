"use strict";

import React, { useMemo, useState } from "react";

function ShopCard({
  shop = {},
  onClick,
  onLike,
  onReservation,
  onView,
}) {
  /* 🔥 월간 기간 설정 */
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    )
      .toISOString()
      .slice(0, 10);
  });

  const [endDate, setEndDate] = useState(() => {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    )
      .toISOString()
      .slice(0, 10);
  });

  const todayKey = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const isBareBase64Image = (value) => {
    const text = String(value || "").trim();

    if (!text || text.includes(" ") || text.includes("\n") || text.includes("\r")) {
      return false;
    }

    if (
      text.startsWith("/9j/") ||
      text.startsWith("iVBOR") ||
      text.startsWith("R0lGOD") ||
      text.startsWith("UklGR")
    ) {
      return true;
    }

    return /^[A-Za-z0-9+/]{120,}={0,2}$/.test(text);
  };

  const normalizeImageSrc = (value) => {
    const text = String(value || "").trim();

    if (!text) {
      return "";
    }

    if (text === "undefined" || text === "null" || text === "[object Object]") {
      return "";
    }

    if (text.includes("[object Object]")) {
      return "";
    }

    if (text.startsWith("data:image/")) {
      return text.includes(";base64,") ? text : "";
    }

    if (text.startsWith("blob:")) {
      return text;
    }

    if (text.startsWith("http://") || text.startsWith("https://")) {
      return text;
    }

    if (text.startsWith("/")) {
      if (isBareBase64Image(text)) {
        return `data:image/jpeg;base64,${text}`;
      }

      return text;
    }

    if (isBareBase64Image(text)) {
      return `data:image/jpeg;base64,${text}`;
    }

    return "";
  };

  const getImageValue = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return normalizeImageSrc(value);
    }

    if (typeof value === "object") {
      return normalizeImageSrc(
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

  const normalizeImageList = (value) => {
    const result = [];

    const pushValue = (item) => {
      if (item === null || item === undefined || item === "") {
        return;
      }

      if (Array.isArray(item)) {
        item.forEach((child) => pushValue(child));
        return;
      }

      if (typeof item === "string") {
        const text = item.trim();

        if (!text) {
          return;
        }

        const safeImage = normalizeImageSrc(text);

        if (safeImage) {
          result.push(safeImage);
          return;
        }

        if (
          text.startsWith("data:image/") ||
          text.startsWith("blob:") ||
          text.startsWith("http://") ||
          text.startsWith("https://") ||
          text.startsWith("/")
        ) {
          return;
        }

        text
          .split(",")
          .map((part) => normalizeImageSrc(part))
          .filter(Boolean)
          .forEach((part) => result.push(part));

        return;
      }

      const image = getImageValue(item);

      if (image) {
        result.push(image);
      }
    };

    pushValue(value);

    return Array.from(new Set(result));
  };

  const images = Array.from(
    new Set(
      [
        ...normalizeImageList(shop?.representativeImage),
        ...normalizeImageList(shop?.mainImage),
        ...normalizeImageList(shop?.thumbnail),
        ...normalizeImageList(shop?.coverImage),
        ...normalizeImageList(shop?.image),
        ...normalizeImageList(shop?.imageUrl),
        ...normalizeImageList(shop?.photo),
        ...normalizeImageList(shop?.picture),
        ...normalizeImageList(shop?.images),
        ...normalizeImageList(shop?.photos),
        ...normalizeImageList(shop?.imageUrls),
        ...normalizeImageList(shop?.gallery),
        ...normalizeImageList(shop?.pictures),
        ...normalizeImageList(shop?.files),
      ].filter(Boolean)
    )
  );

  const representativeImage =
    normalizeImageSrc(
      shop?.representativeImage ||
        shop?.mainImage ||
        shop?.thumbnail ||
        shop?.coverImage ||
        images[0] ||
        ""
    ) ||
    images[0] ||
    "";

  const dailyCalls =
    shop?.dailyCalls || {};

  const dailyClicks =
    shop?.dailyClicks || {};

  const dailyConversions =
    shop?.dailyConversions || {};

  const dailyReviews =
    shop?.dailyReviews || {};

  const getMonthlyTotal = (
    dailyData = {}
  ) => {
    if (
      !dailyData ||
      typeof dailyData !== "object"
    ) {
      return 0;
    }

    return Object.entries(dailyData).reduce(
      (sum, [date, value]) => {
        if (
          startDate &&
          endDate &&
          date >= startDate &&
          date <= endDate
        ) {
          return (
            sum + Number(value || 0)
          );
        }

        return sum;
      },
      0
    );
  };

  const todayCalls = Number(
    dailyCalls[todayKey] || 0
  );

  const todayClicks = Number(
    dailyClicks[todayKey] || 0
  );

  const todayConversions = Number(
    dailyConversions[todayKey] || 0
  );

  const todayReviews = Number(
    dailyReviews[todayKey] || 0
  );

  const monthlyCalls =
    getMonthlyTotal(dailyCalls);

  const monthlyClicks =
    getMonthlyTotal(dailyClicks);

  const monthlyConversions =
    getMonthlyTotal(
      dailyConversions
    );

  const monthlyReviews =
    getMonthlyTotal(
      dailyReviews
    );

  return (
    <div style={styles.wrapper}>
      {/* 업체 카드 */}
      <div style={styles.card}>
        {!!representativeImage && (
          <div style={styles.imageBox}>
            <img
              src={representativeImage}
              alt={shop?.name || "shop"}
              style={styles.image}
              onClick={() =>
                onClick && onClick(shop)
              }
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        <div style={styles.content}>
          <div style={styles.header}>
            <div>
              <div style={styles.shopName}>
                {shop?.name ||
                  "업체명 없음"}
              </div>

              <div style={styles.address}>
                {shop?.address ||
                  "주소 없음"}
              </div>
            </div>

            <div style={styles.rating}>
              ⭐{" "}
              {Number(
                shop?.rating ||
                  shop?.averageRating ||
                  0
              ).toFixed(1)}
            </div>
          </div>

          <div style={styles.info}>
            <strong>코스:</strong>{" "}
            {Array.isArray(
              shop?.courses
            )
              ? shop.courses.join(", ")
              : "-"}
          </div>

          <div style={styles.info}>
            <strong>금액:</strong>{" "}
            {Array.isArray(shop?.price)
              ? shop.price
                  .map(
                    (price) =>
                      `${Number(
                        price
                      ).toLocaleString()}원`
                  )
                  .join(", ")
              : "-"}
          </div>

          <div style={styles.actions}>
            {!!onReservation && (
              <button
                type="button"
                style={styles.reserveBtn}
                onClick={() =>
                  onReservation(shop)
                }
              >
                예약
              </button>
            )}

            {!!onLike && (
              <button
                type="button"
                style={styles.likeBtn}
                onClick={() =>
                  onLike(shop)
                }
              >
                찜
              </button>
            )}

            {!!onView && (
              <button
                type="button"
                style={styles.viewBtn}
                onClick={() =>
                  onView(shop)
                }
              >
                상세보기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🔥 업체 카드 바로 밑 통계 박스 */}
      <div style={styles.statsBox}>
        <div style={styles.statsHeader}>
          <div style={styles.statsTitle}>
            업체 통계 분석
          </div>

          <div style={styles.dateRow}>
            <input
              type="date"
              value={startDate}
              onChange={(e) =>
                setStartDate(
                  e.target.value
                )
              }
              style={styles.dateInput}
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) =>
                setEndDate(
                  e.target.value
                )
              }
              style={styles.dateInput}
            />
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              일일 콜수
            </div>

            <div style={styles.statValue}>
              {todayCalls}
            </div>

            <div style={styles.monthValue}>
              월간: {monthlyCalls}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              일일 클릭수
            </div>

            <div style={styles.statValue}>
              {todayClicks}
            </div>

            <div style={styles.monthValue}>
              월간: {monthlyClicks}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              일일 전환수
            </div>

            <div style={styles.statValue}>
              {todayConversions}
            </div>

            <div style={styles.monthValue}>
              월간: {monthlyConversions}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              일일 리뷰수
            </div>

            <div style={styles.statValue}>
              {todayReviews}
            </div>

            <div style={styles.monthValue}>
              월간: {monthlyReviews}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  card: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 16,
    overflow: "hidden",
    color: "#fff",
  },

  imageBox: {
    width: "100%",
    height: 240,
    background: "#000",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    cursor: "pointer",
  },

  content: {
    padding: 18,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },

  shopName: {
    color: "#d4af37",
    fontSize: 24,
    fontWeight: "bold",
  },

  address: {
    marginTop: 6,
    color: "#aaa",
    fontSize: 13,
    lineHeight: 1.5,
  },

  rating: {
    color: "#d4af37",
    fontWeight: "bold",
    fontSize: 16,
  },

  info: {
    marginTop: 10,
    color: "#ddd",
    lineHeight: 1.6,
  },

  actions: {
    display: "flex",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },

  reserveBtn: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
  },

  likeBtn: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#f44336",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  viewBtn: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#2196f3",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  /* 🔥 통계 박스 */
  statsBox: {
    background: "#0a0a0a",
    border: "1px solid #d4af37",
    borderRadius: 14,
    padding: 18,
  },

  statsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 18,
  },

  statsTitle: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "bold",
  },

  dateRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  dateInput: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
    outline: "none",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },

  statCard: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 12,
    padding: 18,
  },

  statLabel: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 10,
  },

  statValue: {
    color: "#d4af37",
    fontSize: 34,
    fontWeight: "bold",
  },

  monthValue: {
    marginTop: 12,
    color: "#fff",
    fontSize: 14,
  },
};

export default ShopCard;