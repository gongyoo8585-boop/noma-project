"use strict";

import React from "react";
import Loading from "../../common/Loading";
import ErrorMessage from "../../common/ErrorMessage";
import EmptyState from "../../common/EmptyState";

/**
 * =====================================================
 * 🔥 ADMIN SHOP TABLE
 * ✔ 관리자 업체 목록 테이블
 * ✔ 검정/골드 테마
 * ✔ 업체 선택
 * ✔ 업체 삭제
 * ✔ 업체 상태 변경
 * ✔ 일일 콜수
 * ✔ 일일 클릭수
 * ✔ 일일 전환수
 * ✔ 일일 리뷰수
 * ✔ 월간 기간설정 통계 표시
 * ✔ 기존 구조 영향 없음
 * =====================================================
 */

function AdminShopTable({
  shops = [],
  loading = false,
  error = "",
  onRetry,
  onSelect,
  onDelete,
  onToggleStatus,
  selectedId,

  /* 🔥 최소 추가 */
  statsStartDate = "",
  statsEndDate = "",
}) {
  if (loading) {
    return (
      <Loading message="업체 목록 불러오는 중..." />
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

  if (!shops || shops.length === 0) {
    return (
      <EmptyState message="등록된 업체가 없습니다." />
    );
  }

  const getTotal = (value) => {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return 0;
    }

    return Object.values(value).reduce(
      (sum, current) =>
        sum + Number(current || 0),
      0
    );
  };

  /* 🔥 최소 추가 */
  const getDefaultMonthRange = () => {
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

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  };

  /* 🔥 최소 추가 */
  const getDateRangeRows = (shop) => {
    const range = getDefaultMonthRange();

    const startDate =
      statsStartDate || range.start;

    const endDate =
      statsEndDate || range.end;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return [];
    }

    const dailyCalls =
      shop?.dailyCalls || {};

    const dailyClicks =
      shop?.dailyClicks || {};

    const dailyConversions =
      shop?.dailyConversions || {};

    const dailyReviews =
      shop?.dailyReviews || {};

    const rows = [];

    const current = new Date(start);

    while (current <= end) {
      const key =
        current
          .toISOString()
          .slice(0, 10);

      rows.push({
        date: key,
        calls:
          Number(
            dailyCalls[key] || 0
          ),
        clicks:
          Number(
            dailyClicks[key] || 0
          ),
        conversions:
          Number(
            dailyConversions[key] || 0
          ),
        reviews:
          Number(
            dailyReviews[key] || 0
          ),
      });

      current.setDate(
        current.getDate() + 1
      );
    }

    return rows;
  };

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              업체명
            </th>

            <th style={styles.th}>
              지역
            </th>

            <th style={styles.th}>
              전화번호
            </th>

            <th style={styles.th}>
              가상번호
            </th>

            <th style={styles.th}>
              영업시간
            </th>

            <th style={styles.th}>
              일일 콜수
            </th>

            <th style={styles.th}>
              일일 클릭수
            </th>

            <th style={styles.th}>
              일일 전환수
            </th>

            <th style={styles.th}>
              일일 리뷰수
            </th>

            <th style={styles.th}>
              상태
            </th>

            <th style={styles.th}>
              관리
            </th>
          </tr>
        </thead>

        <tbody>
          {shops.map(
            (shop, index) => {
              const id =
                shop?._id ||
                shop?.id ||
                index;

              const isSelected =
                selectedId &&
                String(
                  selectedId
                ) === String(id);

              const callCount =
                Number(
                  shop?.callCount ||
                    shop?.stats
                      ?.callCount ||
                    0
                ) ||
                getTotal(
                  shop?.dailyCalls
                );

              const clickCount =
                Number(
                  shop?.clickCount ||
                    shop?.viewCount ||
                    shop?.stats
                      ?.clickCount ||
                    0
                ) ||
                getTotal(
                  shop?.dailyClicks
                );

              const conversionCount =
                Number(
                  shop?.conversionCount ||
                    shop?.stats
                      ?.conversionCount ||
                    shop?.stats
                      ?.reservationCount ||
                    0
                ) ||
                getTotal(
                  shop?.dailyConversions
                );

              const reviewCount =
                Number(
                  shop?.reviewCount ||
                    shop?.rating
                      ?.count ||
                    shop?.stats
                      ?.reviewCount ||
                    0
                ) ||
                getTotal(
                  shop?.dailyReviews
                );

              const monthlyRows =
                getDateRangeRows(shop);

              return (
                <React.Fragment key={id}>
                  <tr
                    onClick={() =>
                      onSelect &&
                      onSelect(shop)
                    }
                    style={{
                      ...styles.tr,
                      background:
                        isSelected
                          ? "#111"
                          : "#000",
                    }}
                  >
                    <td style={styles.td}>
                      <div
                        style={
                          styles.name
                        }
                      >
                        {shop?.name ||
                          "-"}
                      </div>

                      <div
                        style={
                          styles.address
                        }
                      >
                        {shop?.address ||
                          "-"}
                      </div>
                    </td>

                    <td style={styles.td}>
                      {shop?.region ||
                        "-"}{" "}
                      {shop?.district ||
                        ""}
                    </td>

                    <td style={styles.td}>
                      {shop?.phone ||
                        "-"}
                    </td>

                    <td style={styles.td}>
                      {shop?.virtualPhone ||
                        shop?.fakePhone ||
                        shop?.callNumber ||
                        "-"}
                    </td>

                    <td style={styles.td}>
                      {shop?.businessHours ||
                        shop?.openingHours ||
                        shop?.hours ||
                        "-"}
                    </td>

                    <td style={styles.td}>
                      {callCount}
                    </td>

                    <td style={styles.td}>
                      {clickCount}
                    </td>

                    <td style={styles.td}>
                      {conversionCount}
                    </td>

                    <td style={styles.td}>
                      {reviewCount}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.status,
                          background:
                            shop?.status ===
                            "inactive"
                              ? "#842029"
                              : "#0f5132",
                        }}
                      >
                        {shop?.status ===
                        "inactive"
                          ? "비활성"
                          : "활성"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <div
                        style={
                          styles.actionWrap
                        }
                      >
                        <button
                          type="button"
                          onClick={(
                            e
                          ) => {
                            e.stopPropagation();

                            if (
                              onToggleStatus
                            ) {
                              onToggleStatus(
                                shop
                              );
                            }
                          }}
                          style={
                            styles.toggleBtn
                          }
                        >
                          {shop?.status ===
                          "inactive"
                            ? "활성화"
                            : "비활성화"}
                        </button>

                        <button
                          type="button"
                          onClick={(
                            e
                          ) => {
                            e.stopPropagation();

                            if (
                              onDelete
                            ) {
                              onDelete(
                                shop
                              );
                            }
                          }}
                          style={
                            styles.deleteBtn
                          }
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td
                      colSpan={11}
                      style={
                        styles.monthlyTd
                      }
                    >
                      <div
                        style={
                          styles.monthlyBox
                        }
                      >
                        <div
                          style={
                            styles.monthlyHeader
                          }
                        >
                          <strong>
                            월간 기간별 일일 통계
                          </strong>

                          <span>
                            {(statsStartDate ||
                              getDefaultMonthRange()
                                .start)}{" "}
                            ~{" "}
                            {(statsEndDate ||
                              getDefaultMonthRange()
                                .end)}
                          </span>
                        </div>

                        <div
                          style={
                            styles.monthlyGrid
                          }
                        >
                          <div
                            style={
                              styles.monthlyHead
                            }
                          >
                            날짜
                          </div>

                          <div
                            style={
                              styles.monthlyHead
                            }
                          >
                            콜수
                          </div>

                          <div
                            style={
                              styles.monthlyHead
                            }
                          >
                            클릭수
                          </div>

                          <div
                            style={
                              styles.monthlyHead
                            }
                          >
                            전환수
                          </div>

                          <div
                            style={
                              styles.monthlyHead
                            }
                          >
                            리뷰수
                          </div>

                          {monthlyRows.map(
                            (row) => (
                              <React.Fragment
                                key={`${id}-${row.date}`}
                              >
                                <div
                                  style={
                                    styles.monthlyCell
                                  }
                                >
                                  {row.date}
                                </div>

                                <div
                                  style={
                                    styles.monthlyCell
                                  }
                                >
                                  {row.calls}
                                </div>

                                <div
                                  style={
                                    styles.monthlyCell
                                  }
                                >
                                  {row.clicks}
                                </div>

                                <div
                                  style={
                                    styles.monthlyCell
                                  }
                                >
                                  {row.conversions}
                                </div>

                                <div
                                  style={
                                    styles.monthlyCell
                                  }
                                >
                                  {row.reviews}
                                </div>
                              </React.Fragment>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    overflowX: "auto",
    background: "#000",
    border: "1px solid #222",
    borderRadius: 12,
  },

  table: {
    width: "100%",
    borderCollapse:
      "collapse",
    minWidth: 1400,
  },

  th: {
    background: "#0a0a0a",
    color: "#d4af37",
    borderBottom:
      "1px solid #222",
    padding: 14,
    textAlign: "left",
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  tr: {
    borderBottom:
      "1px solid #181818",
    cursor: "pointer",
    transition:
      "background 0.2s ease",
  },

  td: {
    padding: 14,
    color: "#fff",
    fontSize: 13,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },

  name: {
    fontWeight: 700,
    color: "#fff",
    marginBottom: 4,
  },

  address: {
    color: "#777",
    fontSize: 12,
  },

  status: {
    color: "#fff",
    padding: "4px 10px",
    borderRadius: 30,
    fontSize: 12,
    fontWeight: 700,
  },

  actionWrap: {
    display: "flex",
    gap: 8,
  },

  toggleBtn: {
    background: "#d4af37",
    color: "#000",
    border: "none",
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },

  deleteBtn: {
    background: "#842029",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },

  monthlyTd: {
    padding: 0,
    background: "#000",
    borderBottom:
      "1px solid #181818",
  },

  monthlyBox: {
    margin: "0 14px 14px",
    padding: 12,
    border: "1px solid #333",
    borderRadius: 10,
    background: "#050505",
  },

  monthlyHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 10,
    color: "#d4af37",
    fontSize: 12,
    marginBottom: 10,
  },

  monthlyGrid: {
    display: "grid",
    gridTemplateColumns:
      "1.4fr 1fr 1fr 1fr 1fr",
    gap: 1,
    background: "#222",
    border: "1px solid #222",
    maxHeight: 220,
    overflowY: "auto",
  },

  monthlyHead: {
    background: "#111",
    color: "#d4af37",
    fontSize: 11,
    fontWeight: "bold",
    padding: "8px 6px",
    textAlign: "center",
  },

  monthlyCell: {
    background: "#000",
    color: "#fff",
    fontSize: 11,
    padding: "7px 6px",
    textAlign: "center",
  },
};

export default AdminShopTable;