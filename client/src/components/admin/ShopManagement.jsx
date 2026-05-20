"use strict";

import React, { useEffect, useMemo, useState } from "react";
import shopApi from "../../services/shop.api";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

function ShopManagement() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");

  /* 🔥 업체별 통계 기간 */
  const [statsDateMap, setStatsDateMap] = useState({});

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s/g, "")
      .trim();

  const todayKey = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const loadShops = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await shopApi.getList();

      const items =
        res?.items ||
        res?.data ||
        res?.shops ||
        res?.list ||
        [];

      const safeItems = Array.isArray(items)
        ? items
        : [];

      setShops(safeItems);

      const initialDateMap = {};

      safeItems.forEach((shop) => {
        const shopId = String(
          shop?._id || shop?.id || ""
        );

        const now = new Date();

        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

        const end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        );

        initialDateMap[shopId] = {
          startDate: start
            .toISOString()
            .slice(0, 10),
          endDate: end
            .toISOString()
            .slice(0, 10),
        };
      });

      setStatsDateMap(initialDateMap);
    } catch (e) {
      console.error(e);

      setError(
        e?.message || "업체 목록 조회 실패"
      );

      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  const filteredShops = useMemo(() => {
    const safeKeyword = normalize(keyword);

    if (!safeKeyword) {
      return shops;
    }

    return shops.filter((shop) => {
      const name = normalize(shop?.name);

      const address = normalize(
        shop?.address
      );

      return (
        name.includes(safeKeyword) ||
        address.includes(safeKeyword)
      );
    });
  }, [shops, keyword]);

  const getMonthlyTotal = (
    dailyData = {},
    startDate,
    endDate
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

  const onChangeStatsDate = (
    shopId,
    field,
    value
  ) => {
    setStatsDateMap((prev) => ({
      ...prev,
      [shopId]: {
        ...(prev[shopId] || {}),
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <Loading message="업체 목록 로딩중..." />
    );
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={loadShops}
      />
    );
  }

  if (!filteredShops.length) {
    return (
      <EmptyState message="검색된 업체가 없습니다." />
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.searchBox}>
        <input
          type="text"
          value={keyword}
          onChange={(e) =>
            setKeyword(e.target.value)
          }
          placeholder="업체명 검색"
          style={styles.searchInput}
        />
      </div>

      <div style={styles.shopList}>
        {filteredShops.map((shop) => {
          const shopId = String(
            shop?._id || shop?.id || ""
          );

          const dateConfig =
            statsDateMap[shopId] || {};

          const startDate =
            dateConfig.startDate || "";

          const endDate =
            dateConfig.endDate || "";

          const dailyCalls =
            shop?.dailyCalls || {};

          const dailyClicks =
            shop?.dailyClicks || {};

          const dailyConversions =
            shop?.dailyConversions || {};

          const dailyReviews =
            shop?.dailyReviews || {};

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
            getMonthlyTotal(
              dailyCalls,
              startDate,
              endDate
            );

          const monthlyClicks =
            getMonthlyTotal(
              dailyClicks,
              startDate,
              endDate
            );

          const monthlyConversions =
            getMonthlyTotal(
              dailyConversions,
              startDate,
              endDate
            );

          const monthlyReviews =
            getMonthlyTotal(
              dailyReviews,
              startDate,
              endDate
            );

          return (
            <div
              key={shopId}
              style={styles.shopWrapper}
            >
              {/* 업체 카드 */}
              <div style={styles.shopCard}>
                <div style={styles.shopHeader}>
                  <div>
                    <div style={styles.shopName}>
                      {shop?.name ||
                        "업체명 없음"}
                    </div>

                    <div style={styles.shopAddress}>
                      {shop?.address ||
                        "주소 없음"}
                    </div>
                  </div>

                  <div style={styles.shopStatus}>
                    {shop?.status ||
                      "active"}
                  </div>
                </div>

                <div style={styles.shopInfo}>
                  <strong>코스:</strong>{" "}
                  {Array.isArray(
                    shop?.courses
                  )
                    ? shop.courses.join(", ")
                    : "-"}
                </div>

                <div style={styles.shopInfo}>
                  <strong>금액:</strong>{" "}
                  {Array.isArray(
                    shop?.price
                  )
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
              </div>

              {/* 🔥 업체 카드 바로 밑 통계 박스 */}
              <div style={styles.statsBox}>
                <div style={styles.statsHeader}>
                  <div style={styles.statsTitle}>
                    업체 통계 분석
                  </div>

                  <div style={styles.dateRange}>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) =>
                        onChangeStatsDate(
                          shopId,
                          "startDate",
                          e.target.value
                        )
                      }
                      style={styles.dateInput}
                    />

                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) =>
                        onChangeStatsDate(
                          shopId,
                          "endDate",
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

                    <div style={styles.monthlyValue}>
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

                    <div style={styles.monthlyValue}>
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

                    <div style={styles.monthlyValue}>
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

                    <div style={styles.monthlyValue}>
                      월간: {monthlyReviews}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    padding: 20,
    background: "#000",
    minHeight: "100vh",
    color: "#fff",
  },

  searchBox: {
    marginBottom: 20,
  },

  searchInput: {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    outline: "none",
    fontSize: 15,
  },

  shopList: {
    display: "grid",
    gap: 20,
  },

  shopWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  shopCard: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 14,
    padding: 18,
  },

  shopHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },

  shopName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#d4af37",
  },

  shopAddress: {
    color: "#aaa",
    marginTop: 6,
    fontSize: 13,
  },

  shopStatus: {
    color: "#4caf50",
    fontWeight: "bold",
  },

  shopInfo: {
    marginTop: 10,
    color: "#ddd",
    lineHeight: 1.6,
  },

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
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 18,
  },

  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d4af37",
  },

  dateRange: {
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

  monthlyValue: {
    marginTop: 10,
    color: "#fff",
    fontSize: 14,
  },
};

export default ShopManagement;