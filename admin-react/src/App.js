import React, { useEffect, useMemo, useState, useCallback } from "react";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";

const PAGE_SIZE = 10;

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  const token = localStorage.getItem("token") || "";

  const authHeaders = useMemo(() => {
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }, [token]);

  const loadInquiries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/api/inquiry/admin`, {
        method: "GET",
        headers: authHeaders
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "문의 목록을 불러오지 못했습니다.");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setLastUpdatedAt(new Date().toLocaleString());
    } catch (err) {
      setError(err.message || "서버 오류");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  useEffect(() => {
    if (!window.io) return;

    const socket = window.io(API_BASE, {
      transports: ["websocket", "polling"]
    });

    const reload = () => {
      loadInquiries();
    };

    socket.on("inquiry:new", reload);

    return () => {
      socket.off("inquiry:new", reload);
      socket.disconnect();
    };
  }, [loadInquiries]);

  const filteredItems = useMemo(() => {
    let arr = [...items];

    if (statusFilter !== "all") {
      arr = arr.filter((item) => item.status === statusFilter);
    }

    if (keyword.trim()) {
      const q = keyword.trim().toLowerCase();
      arr = arr.filter((item) => {
        const name = String(item.name || "").toLowerCase();
        const phone = String(item.phone || "").toLowerCase();
        const content = String(item.content || "").toLowerCase();
        return (
          name.includes(q) || phone.includes(q) || content.includes(q)
        );
      });
    }

    return arr;
  }, [items, keyword, statusFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((v) => v.status === "pending").length;
    const done = items.filter((v) => v.status === "done").length;
    return { total, pending, done };
  }, [items]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / PAGE_SIZE)
  );

  const currentPageItems = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function updateStatus(id, status) {
    try {
      setSavingId(id);
      setError("");

      const res = await fetch(`${API_BASE}/api/inquiry/${id}/status`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ status })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "상태 변경 실패");
      }

      setItems((prev) =>
        prev.map((item) =>
          item._id === id || item.id === id
            ? {
                ...item,
                status
              }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "상태 변경 중 오류");
    } finally {
      setSavingId("");
    }
  }

  function formatDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>관리자 문의 대시보드</h1>
            <div style={styles.sub}>
              마지막 갱신: {lastUpdatedAt || "-"}
            </div>
          </div>

          <button
            type="button"
            onClick={loadInquiries}
            style={styles.reloadBtn}
            disabled={loading}
          >
            {loading ? "불러오는 중..." : "새로고침"}
          </button>
        </header>

        <section style={styles.statsWrap}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>전체</div>
            <div style={styles.statValue}>{stats.total}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>대기</div>
            <div style={styles.statValue}>{stats.pending}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>완료</div>
            <div style={styles.statValue}>{stats.done}</div>
          </div>
        </section>

        <section style={styles.filterWrap}>
          <input
            type="text"
            placeholder="이름 / 전화번호 / 내용 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={styles.searchInput}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">전체 상태</option>
            <option value="pending">pending</option>
            <option value="done">done</option>
          </select>
        </section>

        {error ? <div style={styles.error}>{error}</div> : null}

        <section style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>이름</th>
                <th style={styles.th}>전화번호</th>
                <th style={styles.th}>내용</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>등록일</th>
                <th style={styles.th}>처리</th>
              </tr>
            </thead>
            <tbody>
              {currentPageItems.length === 0 ? (
                <tr>
                  <td colSpan="6" style={styles.empty}>
                    {loading ? "불러오는 중..." : "데이터 없음"}
                  </td>
                </tr>
              ) : (
                currentPageItems.map((item) => {
                  const id = item._id || item.id;
                  const isPending = item.status === "pending";
                  const isSaving = savingId === id;

                  return (
                    <tr key={id}>
                      <td style={styles.td}>{item.name || "-"}</td>
                      <td style={styles.td}>{item.phone || "-"}</td>
                      <td style={styles.tdContent}>{item.content || "-"}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            ...(isPending
                              ? styles.badgePending
                              : styles.badgeDone)
                          }}
                        >
                          {item.status || "-"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {formatDate(item.createdAt)}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionWrap}>
                          <button
                            type="button"
                            onClick={() => updateStatus(id, "pending")}
                            style={styles.smallBtn}
                            disabled={isSaving}
                          >
                            pending
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(id, "done")}
                            style={styles.smallBtnPrimary}
                            disabled={isSaving}
                          >
                            done
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        <section style={styles.pagination}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={styles.pageBtn}
          >
            이전
          </button>

          <div style={styles.pageText}>
            {page} / {totalPages}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={styles.pageBtn}
          >
            다음
          </button>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    padding: "24px",
    boxSizing: "border-box",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px"
  },
  title: {
    margin: 0,
    fontSize: "28px"
  },
  sub: {
    marginTop: "6px",
    color: "#666",
    fontSize: "14px"
  },
  reloadBtn: {
    padding: "10px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#111827",
    color: "#fff",
    cursor: "pointer"
  },
  statsWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "20px"
  },
  statCard: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "16px"
  },
  statLabel: {
    color: "#6b7280",
    fontSize: "14px",
    marginBottom: "8px"
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "700"
  },
  filterWrap: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap"
  },
  searchInput: {
    flex: 1,
    minWidth: "260px",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d1d5db"
  },
  select: {
    minWidth: "160px",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d1d5db"
  },
  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px"
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "12px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    textAlign: "left",
    padding: "14px",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px"
  },
  td: {
    padding: "14px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
    fontSize: "14px"
  },
  tdContent: {
    padding: "14px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
    fontSize: "14px",
    minWidth: "320px",
    lineHeight: 1.5
  },
  empty: {
    textAlign: "center",
    padding: "30px",
    color: "#6b7280"
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700"
  },
  badgePending: {
    background: "#fff7ed",
    color: "#c2410c"
  },
  badgeDone: {
    background: "#ecfdf5",
    color: "#047857"
  },
  actionWrap: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  smallBtn: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#fff",
    cursor: "pointer"
  },
  smallBtnPrimary: {
    padding: "8px 10px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer"
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    marginTop: "18px"
  },
  pageBtn: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer"
  },
  pageText: {
    fontWeight: "700"
  }
};