"use strict";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import AdminLayout from "../../components/admin/AdminLayout";

import Loading from "../../components/common/Loading";
import ErrorMessage from "../../components/common/ErrorMessage";
import EmptyState from "../../components/common/EmptyState";

import reviewApi from "../../services/review.api";

/**
 * =====================================================
 * 🔥 REPORT ADMIN PAGE
 * ✔ 신고 리뷰 관리자 페이지
 * ✔ 신고 리뷰 목록
 * ✔ 리뷰 삭제
 * ✔ 숨김 처리
 * ✔ 복구 처리
 * ✔ 평점 확인
 * ✔ loading / error / empty 상태 대응
 * ✔ AdminLayout 추가
 * ✔ 기존 구조 영향 없음
 * =====================================================
 */

export default function ReportAdminPage() {
  const [items, setItems] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [keyword, setKeyword] =
    useState("");

  const [processingId, setProcessingId] =
    useState("");

  /* 🔥 최소 추가 */
  const [stats, setStats] = useState({
    total: 0,
    hidden: 0,
    visible: 0,
  });

  const [statsStartDate, setStatsStartDate] =
    useState("");

  const [statsEndDate, setStatsEndDate] =
    useState("");

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
      start: start
        .toISOString()
        .slice(0, 10),

      end: end
        .toISOString()
        .slice(0, 10),
    };
  };

  const getDateFilteredItems = (
    safeItems
  ) => {
    const range =
      getDefaultMonthRange();

    const startDate =
      statsStartDate ||
      range.start;

    const endDate =
      statsEndDate ||
      range.end;

    const start = new Date(
      `${startDate}T00:00:00`
    );

    const end = new Date(
      `${endDate}T23:59:59`
    );

    return safeItems.filter(
      (item) => {
        if (!item?.createdAt) {
          return true;
        }

        const createdAt =
          new Date(
            item.createdAt
          );

        return (
          createdAt >= start &&
          createdAt <= end
        );
      }
    );
  };

  /* =========================
  LOAD
  ========================= */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res =
        await reviewApi.getAdminList({
          reported: true,
          keyword,
        });

      const safeItems = Array.isArray(
        res
      )
        ? res
        : res?.items ||
          res?.list ||
          res?.data ||
          [];

      const filteredItems =
        getDateFilteredItems(
          safeItems
        );

      setItems(filteredItems);

      /* 🔥 최소 추가 */
      setStats({
        total: filteredItems.length,
        hidden:
          filteredItems.filter(
            (v) => v?.hidden
          ).length,
        visible:
          filteredItems.filter(
            (v) => !v?.hidden
          ).length,
      });
    } catch (e) {
      setError(
        e?.message ||
          "신고 목록 조회 실패"
      );
    } finally {
      setLoading(false);
    }
  }, [
    keyword,
    statsStartDate,
    statsEndDate,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  /* =========================
  DELETE
  ========================= */
  const handleDelete = async (
    item
  ) => {
    try {
      if (!item?._id) {
        alert("리뷰 정보 오류");
        return;
      }

      const ok = window.confirm(
        "리뷰를 삭제하시겠습니까?"
      );

      if (!ok) return;

      setProcessingId(item._id);

      await reviewApi.adminRemove(
        item._id
      );

      alert("삭제 완료");

      load();
    } catch (e) {
      alert(
        e?.message ||
          "리뷰 삭제 실패"
      );
    } finally {
      setProcessingId("");
    }
  };

  /* =========================
  HIDE
  ========================= */
  const handleHide = async (
    item
  ) => {
    try {
      if (!item?._id) {
        alert("리뷰 정보 오류");
        return;
      }

      setProcessingId(item._id);

      await reviewApi.hide(item._id);

      alert("숨김 처리 완료");

      load();
    } catch (e) {
      alert(
        e?.message ||
          "숨김 처리 실패"
      );
    } finally {
      setProcessingId("");
    }
  };

  /* =========================
  RESTORE
  ========================= */
  const handleRestore = async (
    item
  ) => {
    try {
      if (!item?._id) {
        alert("리뷰 정보 오류");
        return;
      }

      setProcessingId(item._id);

      await reviewApi.restore(
        item._id
      );

      alert("복구 완료");

      load();
    } catch (e) {
      alert(
        e?.message ||
          "복구 실패"
      );
    } finally {
      setProcessingId("");
    }
  };

  /* =========================
  loading
  ========================= */
  if (loading) {
    return <Loading />;
  }

  /* =========================
  error
  ========================= */
  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={load}
      />
    );
  }

  /* =========================
  empty
  ========================= */
  if (!items.length) {
    return (
      <AdminLayout title="신고 관리">
        <div
          className="report-admin-page"
          style={styles.page}
        >
          <div
            className="admin-page-header"
            style={styles.header}
          >
            <h2 style={styles.title}>
              신고 관리
            </h2>
          </div>

          {/* 🔥 최소 추가 */}
          <div style={styles.statsWrap}>
            <div>
              전체: {stats.total}
            </div>

            <div>
              노출: {stats.visible}
            </div>

            <div>
              숨김: {stats.hidden}
            </div>
          </div>

          <div
            style={
              styles.statsFilterRow
            }
          >
            <input
              type="date"
              value={
                statsStartDate
              }
              onChange={(e) =>
                setStatsStartDate(
                  e.target.value
                )
              }
              style={
                styles.dateInput
              }
            />

            <input
              type="date"
              value={
                statsEndDate
              }
              onChange={(e) =>
                setStatsEndDate(
                  e.target.value
                )
              }
              style={
                styles.dateInput
              }
            />

            <button
              onClick={load}
              style={
                styles.searchBtn
              }
              type="button"
            >
              월간 기간설정 조회
            </button>
          </div>

          <div style={styles.filterWrap}>
            <input
              type="text"
              placeholder="검색"
              value={keyword}
              onChange={(e) =>
                setKeyword(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  load();
                }
              }}
              style={styles.input}
            />

            <button
              onClick={load}
              style={styles.searchBtn}
              type="button"
            >
              검색
            </button>
          </div>

          <EmptyState message="신고된 리뷰가 없습니다." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="신고 관리">
      <div
        className="report-admin-page"
        style={styles.page}
      >
        <div
          className="admin-page-header"
          style={styles.header}
        >
          <h2 style={styles.title}>
            신고 관리
          </h2>
        </div>

        {/* 🔥 최소 추가 */}
        <div style={styles.statsWrap}>
          <div>
            전체: {stats.total}
          </div>

          <div>
            노출: {stats.visible}
          </div>

          <div>
            숨김: {stats.hidden}
          </div>
        </div>

        <div
          style={
            styles.statsFilterRow
          }
        >
          <input
            type="date"
            value={statsStartDate}
            onChange={(e) =>
              setStatsStartDate(
                e.target.value
              )
            }
            style={styles.dateInput}
          />

          <input
            type="date"
            value={statsEndDate}
            onChange={(e) =>
              setStatsEndDate(
                e.target.value
              )
            }
            style={styles.dateInput}
          />

          <button
            onClick={load}
            style={styles.searchBtn}
            type="button"
          >
            월간 기간설정 조회
          </button>
        </div>

        {/* =========================
        FILTER
        ========================= */}
        <div style={styles.filterWrap}>
          <input
            type="text"
            placeholder="리뷰 검색"
            value={keyword}
            onChange={(e) =>
              setKeyword(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                load();
              }
            }}
            style={styles.input}
          />

          <button
            onClick={load}
            style={styles.searchBtn}
            type="button"
          >
            검색
          </button>
        </div>

        {/* =========================
        TABLE
        ========================= */}
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            width="100%"
            border="1"
            cellPadding="10"
            style={styles.table}
          >
            <thead>
              <tr>
                <th>평점</th>
                <th>내용</th>
                <th>작성자</th>
                <th>매장</th>
                <th>상태</th>
                <th>신고수</th>
                <th>작성일</th>
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const isProcessing =
                  processingId ===
                  item._id;

                return (
                  <tr key={item._id}>
                    <td>
                      ⭐{" "}
                      {item.rating ||
                        0}
                    </td>

                    <td
                      style={{
                        maxWidth: 300,
                        wordBreak:
                          "break-all",
                      }}
                    >
                      {item.content ||
                        "-"}
                    </td>

                    <td>
                      {item.user
                        ?.name ||
                        item.user
                          ?.email ||
                        "-"}
                    </td>

                    <td>
                      {item.shop
                        ?.name || "-"}
                    </td>

                    <td>
                      {item.hidden
                        ? "hidden"
                        : "visible"}
                    </td>

                    <td>
                      {item.reportCount ||
                        item.reports
                          ?.length ||
                        0}
                    </td>

                    <td>
                      {item.createdAt
                        ? new Date(
                            item.createdAt
                          ).toLocaleString()
                        : "-"}
                    </td>

                    <td>
                      <div
                        style={{
                          display:
                            "flex",
                          gap: 6,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        {!item.hidden && (
                          <button
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              handleHide(
                                item
                              )
                            }
                            style={
                              styles.actionBtn
                            }
                            type="button"
                          >
                            숨김
                          </button>
                        )}

                        {item.hidden && (
                          <button
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              handleRestore(
                                item
                              )
                            }
                            style={
                              styles.actionBtn
                            }
                            type="button"
                          >
                            복구
                          </button>
                        )}

                        <button
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            handleDelete(
                              item
                            )
                          }
                          style={
                            styles.deleteBtn
                          }
                          type="button"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    padding: 20,
    boxSizing: "border-box",
  },

  header: {
    marginBottom: 20,
  },

  title: {
    margin: 0,
    color: "#d4af37",
    fontSize: 28,
  },

  statsWrap: {
    display: "flex",
    gap: 20,
    marginBottom: 20,
    flexWrap: "wrap",
    color: "#d4af37",
  },

  statsFilterRow: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr auto",
    gap: 10,
    marginBottom: 20,
  },

  dateInput: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    outline: "none",
  },

  filterWrap: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  input: {
    minWidth: 220,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    outline: "none",
  },

  searchBtn: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
  },

  table: {
    borderCollapse: "collapse",
    background: "#111",
    color: "#fff",
  },

  actionBtn: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
  },

  deleteBtn: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "none",
    background: "#ff4444",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
};