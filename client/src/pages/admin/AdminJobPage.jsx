"use strict";

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jobApi from "../../services/job.api";
import AdminLayout from "../../components/admin/AdminLayout";

const GOLD = "#d4af37";

function getEffectiveServiceType(propValue, pathname) {
  if (propValue === "karaoke" || propValue === "massage") {
    return propValue;
  }

  return String(pathname || "").startsWith("/admin/karaoke")
    ? "karaoke"
    : "massage";
}

function getJobId(job = {}) {
  return job?._id || job?.id || "";
}

function formatDate(value) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) return "-";

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function getPayText(job = {}) {
  if (job?.payText) return job.payText;

  const min = Number(job?.payMin || 0);
  const max = Number(job?.payMax || 0);

  if (min > 0 && max > 0) {
    return `${min.toLocaleString("ko-KR")}원 ~ ${max.toLocaleString("ko-KR")}원`;
  }

  if (min > 0) return `${min.toLocaleString("ko-KR")}원 이상`;
  if (max > 0) return `${max.toLocaleString("ko-KR")}원 이하`;
  return "협의";
}

function AdminJobPage({ serviceType = "" }) {
  const location = useLocation();
  const navigate = useNavigate();

  const effectiveServiceType = getEffectiveServiceType(
    serviceType,
    location.pathname
  );
  const isKaraoke = effectiveServiceType === "karaoke";
  const basePath = isKaraoke ? "/admin/karaoke/jobs" : "/admin/jobs";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [tier, setTier] = useState("");
  const [keyword, setKeyword] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await jobApi.adminGetList({
          serviceType: effectiveServiceType,
          status,
          tier,
          keyword,
        });

        if (!mounted) return;

        const list = Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.jobs)
          ? response.jobs
          : [];

        setItems(list);
      } catch (loadError) {
        if (!mounted) return;
        setItems([]);
        setError(loadError?.message || "채용정보 목록을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [effectiveServiceType, status, tier, reloadKey]);

  const counts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === "recruiting") acc.recruiting += 1;
        if (item.status === "closed") acc.closed += 1;
        if (item.status === "draft") acc.draft += 1;
        if (item.status === "hidden") acc.hidden += 1;
        if (item.tier === "premium") acc.premium += 1;
        else acc.normal += 1;
        return acc;
      },
      {
        total: 0,
        recruiting: 0,
        closed: 0,
        draft: 0,
        hidden: 0,
        premium: 0,
        normal: 0,
      }
    );
  }, [items]);

  const handleSearch = (event) => {
    event?.preventDefault?.();
    setReloadKey((prev) => prev + 1);
  };

  const handleClose = async (job) => {
    const id = getJobId(job);
    if (!id || job?.status === "closed") return;

    if (!window.confirm(`"${job?.title || "채용공고"}" 모집을 마감하시겠습니까?`)) {
      return;
    }

    try {
      setError("");
      await jobApi.adminClose(id);
      setReloadKey((prev) => prev + 1);
    } catch (closeError) {
      setError(closeError?.message || "채용공고 마감에 실패했습니다.");
    }
  };

  const handleDelete = async (job) => {
    const id = getJobId(job);
    if (!id) return;

    if (!window.confirm(`"${job?.title || "채용공고"}"를 완전히 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setError("");
      await jobApi.adminDelete(id);
      setReloadKey((prev) => prev + 1);
    } catch (deleteError) {
      setError(deleteError?.message || "채용공고 삭제에 실패했습니다.");
    }
  };

  return (
    <AdminLayout title={`${isKaraoke ? "가라오케" : "마사지"} 채용 관리`}>
      <div style={styles.page}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>채용 관리</h1>
            <p style={styles.subTitle}>
              {isKaraoke ? "가라오케" : "마사지"} 채용공고 등록·수정·마감·PREMIUM을 관리합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`${basePath}/new`)}
            style={styles.createButton}
          >
            + 채용공고 등록
          </button>
        </div>

        <div style={styles.statGrid}>
          <div style={styles.statCard}><span>전체</span><strong>{counts.total}</strong></div>
          <div style={styles.statCard}><span>모집중</span><strong>{counts.recruiting}</strong></div>
          <div style={styles.statCard}><span>PREMIUM</span><strong style={{ color: GOLD }}>{counts.premium}</strong></div>
          <div style={styles.statCard}><span>NORMAL</span><strong>{counts.normal}</strong></div>
          <div style={styles.statCard}><span>마감</span><strong>{counts.closed}</strong></div>
          <div style={styles.statCard}><span>임시저장</span><strong>{counts.draft}</strong></div>
        </div>

        <form onSubmit={handleSearch} style={styles.filterRow}>
          <select value={status} onChange={(event) => setStatus(event.target.value)} style={styles.input}>
            <option value="">전체 상태</option>
            <option value="recruiting">모집중</option>
            <option value="closed">모집마감</option>
            <option value="draft">임시저장</option>
            <option value="hidden">숨김</option>
          </select>

          <select value={tier} onChange={(event) => setTier(event.target.value)} style={styles.input}>
            <option value="">전체 등급</option>
            <option value="premium">PREMIUM</option>
            <option value="normal">NORMAL</option>
          </select>

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="업체명·제목·연락처 검색"
            style={{ ...styles.input, ...styles.searchInput }}
          />

          <button type="submit" style={styles.searchButton}>검색</button>
        </form>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading ? (
          <div style={styles.stateBox}>채용정보를 불러오는 중...</div>
        ) : items.length === 0 ? (
          <div style={styles.stateBox}>등록된 채용정보가 없습니다.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>등급</th>
                  <th style={styles.th}>업체 / 제목</th>
                  <th style={styles.th}>급여</th>
                  <th style={styles.th}>근무</th>
                  <th style={styles.th}>상태</th>
                  <th style={styles.th}>최근 수정</th>
                  <th style={styles.th}>관리</th>
                </tr>
              </thead>
              <tbody>
                {items.map((job) => {
                  const id = getJobId(job);
                  const isPremium = job?.tier === "premium";
                  const isClosed = job?.status === "closed";

                  return (
                    <tr key={id} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={isPremium ? styles.premiumBadge : styles.normalBadge}>
                          {isPremium ? "PREMIUM" : "NORMAL"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <strong style={styles.shopName}>{job?.shopName || "업체명 없음"}</strong>
                        <div style={styles.jobTitle}>{job?.title || "제목 없음"}</div>
                        <div style={styles.smallText}>{job?.address || "주소 없음"}</div>
                      </td>
                      <td style={styles.td}>
                        <strong>{getPayText(job)}</strong>
                      </td>
                      <td style={styles.td}>
                        <div>{job?.workTime || "협의"}</div>
                        <div style={styles.smallText}>{job?.workDays || "협의"}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...(isClosed ? styles.closedStatus : job?.status === "recruiting" ? styles.recruitingStatus : styles.otherStatus) }}>
                          {job?.status === "recruiting"
                            ? "모집중"
                            : job?.status === "closed"
                            ? "마감"
                            : job?.status === "draft"
                            ? "임시저장"
                            : "숨김"}
                        </span>
                      </td>
                      <td style={styles.td}>{formatDate(job?.updatedAt)}</td>
                      <td style={styles.td}>
                        <div style={styles.actionRow}>
                          <button
                            type="button"
                            onClick={() => navigate(`${basePath}/${encodeURIComponent(id)}/edit`)}
                            style={styles.editButton}
                          >
                            수정
                          </button>
                          {!isClosed && (
                            <button type="button" onClick={() => handleClose(job)} style={styles.closeButton}>
                              마감
                            </button>
                          )}
                          <button type="button" onClick={() => handleDelete(job)} style={styles.deleteButton}>
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
        )}
      </div>
    </AdminLayout>
  );
}

const styles = {
  page: { width: "100%", boxSizing: "border-box", color: "#fff" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 18 },
  title: { margin: 0, fontSize: 28, color: "#fff" },
  subTitle: { margin: "7px 0 0", color: "#999", fontSize: 13 },
  createButton: { minHeight: 44, padding: "0 18px", border: `1px solid ${GOLD}`, borderRadius: 8, background: "#211b05", color: GOLD, fontWeight: 900, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 },
  statCard: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 14px", border: "1px solid #333", borderRadius: 8, background: "#0a0a0a", color: "#aaa", fontSize: 12 },
  filterRow: { display: "grid", gridTemplateColumns: "150px 150px minmax(200px, 1fr) 90px", gap: 9, marginBottom: 14 },
  input: { minHeight: 42, width: "100%", boxSizing: "border-box", border: "1px solid #3c3c3c", borderRadius: 7, background: "#0a0a0a", color: "#fff", padding: "0 11px", outline: "none" },
  searchInput: {},
  searchButton: { border: `1px solid ${GOLD}`, borderRadius: 7, background: "#1d1804", color: GOLD, fontWeight: 900, cursor: "pointer" },
  errorBox: { marginBottom: 14, padding: 12, border: "1px solid #792039", borderRadius: 7, background: "#18050b", color: "#ff9cb2" },
  stateBox: { padding: 35, border: "1px solid #333", borderRadius: 8, textAlign: "center", color: "#888", background: "#080808" },
  tableWrap: { width: "100%", overflowX: "auto", border: "1px solid #303030", borderRadius: 9 },
  table: { width: "100%", minWidth: 980, borderCollapse: "collapse", background: "#080808" },
  th: { padding: "12px 10px", borderBottom: `1px solid ${GOLD}`, color: GOLD, textAlign: "left", fontSize: 12, whiteSpace: "nowrap", background: "#0d0d0d" },
  tr: { borderBottom: "1px solid #242424" },
  td: { padding: "13px 10px", verticalAlign: "middle", fontSize: 12, color: "#ddd" },
  premiumBadge: { display: "inline-block", padding: "5px 7px", border: `1px solid ${GOLD}`, borderRadius: 5, color: GOLD, fontSize: 10, fontWeight: 900 },
  normalBadge: { display: "inline-block", padding: "5px 7px", border: "1px solid #555", borderRadius: 5, color: "#aaa", fontSize: 10, fontWeight: 900 },
  shopName: { color: GOLD, fontSize: 12 },
  jobTitle: { marginTop: 4, color: "#fff", fontWeight: 800 },
  smallText: { marginTop: 4, color: "#777", fontSize: 10 },
  statusBadge: { display: "inline-block", padding: "5px 8px", borderRadius: 5, fontWeight: 900, fontSize: 10 },
  recruitingStatus: { background: "#102a18", color: "#6ee894" },
  closedStatus: { background: "#31101a", color: "#ff809a" },
  otherStatus: { background: "#252525", color: "#aaa" },
  actionRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  editButton: { minHeight: 32, padding: "0 9px", border: `1px solid ${GOLD}`, borderRadius: 5, background: "#171300", color: GOLD, fontWeight: 800, cursor: "pointer" },
  closeButton: { minHeight: 32, padding: "0 9px", border: "1px solid #805021", borderRadius: 5, background: "#201307", color: "#ffbe72", fontWeight: 800, cursor: "pointer" },
  deleteButton: { minHeight: 32, padding: "0 9px", border: "1px solid #762037", borderRadius: 5, background: "#20070e", color: "#ff89a2", fontWeight: 800, cursor: "pointer" },
};

export default AdminJobPage;
