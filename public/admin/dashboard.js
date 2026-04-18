/* =====================================================
🔥 NOMA ADMIN DASHBOARD - FINAL ULTRA COMPLETE
👉 /public/admin/dashboard.js
👉 SINGLE ENGINE / NO DUPLICATE RENDER / NO DOUBLE API
===================================================== */

(function () {
  "use strict";

  if (window.__NOMA_ADMIN_FINAL__) return;
  window.__NOMA_ADMIN_FINAL__ = true;

  /* =========================
     CONFIG
  ========================= */
  const API_BASE = "/api/admin";
  const TOKEN = localStorage.getItem("token") || "";

  /* =========================
     STATE
  ========================= */
  const state = {
    loading: false,

    stats: {},
    liveStats: {},

    users: [],
    shops: [],
    reservations: [],
    logs: [],

    currentTab: localStorage.getItem("noma_admin_tab") || "dashboard",

    searchUser: localStorage.getItem("noma_admin_search_user") || "",
    searchShop: localStorage.getItem("noma_admin_search_shop") || "",
    reservationStatus: localStorage.getItem("noma_admin_reservation_status") || "",

    pageUsers: Number(localStorage.getItem("noma_admin_page_users") || 1),
    pageShops: Number(localStorage.getItem("noma_admin_page_shops") || 1),
    pageReservations: Number(localStorage.getItem("noma_admin_page_reservations") || 1),
    pageSize: Number(localStorage.getItem("noma_admin_page_size") || 20),

    autoRefresh: localStorage.getItem("noma_admin_auto_refresh") !== "false",

    metrics: {
      apiFail: 0,
      apiSuccess: 0,
      lastError: "",
      lastLoadedAt: 0
    },

    cache: {
      dashboard: null,
      users: null,
      shops: null,
      reservations: null,
      logs: null
    }
  };

  /* =========================
     DOM
  ========================= */
  function $(id) {
    return document.getElementById(id);
  }

  function ensureRoot() {
    if (!$("adminApp")) {
      const app = document.createElement("div");
      app.id = "adminApp";
      document.body.appendChild(app);
    }
    return $("adminApp");
  }

  const app = ensureRoot();

  /* =========================
     STORAGE
  ========================= */
  function saveState() {
    localStorage.setItem("noma_admin_tab", state.currentTab);
    localStorage.setItem("noma_admin_search_user", state.searchUser);
    localStorage.setItem("noma_admin_search_shop", state.searchShop);
    localStorage.setItem("noma_admin_reservation_status", state.reservationStatus);
    localStorage.setItem("noma_admin_page_users", String(state.pageUsers));
    localStorage.setItem("noma_admin_page_shops", String(state.pageShops));
    localStorage.setItem("noma_admin_page_reservations", String(state.pageReservations));
    localStorage.setItem("noma_admin_page_size", String(state.pageSize));
    localStorage.setItem("noma_admin_auto_refresh", String(state.autoRefresh));
  }

  /* =========================
     STYLE
  ========================= */
  function injectStyle() {
    if ($("nomaAdminFinalStyle")) return;

    const style = document.createElement("style");
    style.id = "nomaAdminFinalStyle";
    style.textContent = `
      body {
        background: #000;
        color: #fff;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
      }

      .admin-wrap {
        padding: 20px;
      }

      .admin-title {
        color: #D4AF37;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 20px;
      }

      .admin-nav {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }

      .admin-nav button,
      .admin-btn {
        background: #D4AF37;
        color: #000;
        border: none;
        border-radius: 8px;
        padding: 10px 14px;
        cursor: pointer;
        font-weight: 700;
      }

      .admin-nav button.active {
        background: #fff;
      }

      .admin-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }

      .admin-card {
        background: #111;
        border: 1px solid #D4AF37;
        border-radius: 14px;
        padding: 16px;
      }

      .admin-card h3 {
        margin: 0 0 8px;
        color: #D4AF37;
        font-size: 15px;
      }

      .admin-card .value {
        font-size: 26px;
        font-weight: 700;
      }

      .admin-panel {
        background: #0d0d0d;
        border: 1px solid #333;
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .admin-panel h2 {
        margin-top: 0;
        color: #D4AF37;
        font-size: 20px;
      }

      .admin-toolbar,
      .patch-toolbar,
      .admin-footer-actions,
      .admin-row-actions,
      .patch-inline-actions,
      .patch-pagination {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .admin-toolbar,
      .patch-toolbar {
        margin-bottom: 16px;
      }

      .admin-input,
      .admin-select,
      .patch-toolbar select,
      .patch-toolbar input {
        background: #111;
        color: #fff;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 10px 12px;
        min-width: 180px;
      }

      .admin-table-wrap {
        overflow-x: auto;
      }

      .admin-table {
        width: 100%;
        border-collapse: collapse;
      }

      .admin-table th,
      .admin-table td {
        border-bottom: 1px solid #222;
        padding: 12px 10px;
        text-align: left;
        font-size: 14px;
        white-space: nowrap;
      }

      .admin-table th {
        color: #D4AF37;
        background: #080808;
        position: sticky;
        top: 0;
      }

      .admin-empty,
      .admin-loading {
        padding: 20px 0;
        color: #999;
      }

      .admin-badge,
      .patch-chip {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        background: #222;
        color: #D4AF37;
      }

      .admin-mini-btn {
        background: #222;
        color: #fff;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 6px 8px;
        cursor: pointer;
        font-size: 12px;
      }

      .admin-mini-btn.gold {
        background: #D4AF37;
        color: #000;
        border: none;
      }

      .admin-log {
        max-height: 340px;
        overflow: auto;
        background: #080808;
        border-radius: 10px;
        padding: 10px;
      }

      .admin-log-item {
        font-size: 13px;
        padding: 8px 0;
        border-bottom: 1px solid #191919;
      }

      .admin-muted {
        color: #999;
        font-size: 13px;
      }

      .patch-banner {
        background: #1a1200;
        border: 1px solid #D4AF37;
        color: #fff;
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 14px;
      }

      .patch-danger {
        background: #2a0d0d;
        border-color: #a33;
      }

      .patch-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .patch-mini-card {
        background: #111;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 12px;
      }

      .patch-mini-card strong {
        display: block;
        color: #D4AF37;
        margin-bottom: 6px;
      }

      @media (max-width: 768px) {
        .admin-title {
          font-size: 22px;
        }

        .admin-card .value {
          font-size: 22px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /* =========================
     API
  ========================= */
  async function api(path, options = {}) {
    try {
      const res = await fetch(path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}),
          ...(options.headers || {})
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        state.metrics.apiFail++;
        state.metrics.lastError = data?.msg || data?.message || `HTTP ${res.status}`;
        console.error("ADMIN API ERROR:", path, data);
        return { ok: false, ...data };
      }

      state.metrics.apiSuccess++;
      state.metrics.lastLoadedAt = Date.now();
      return data;
    } catch (e) {
      state.metrics.apiFail++;
      state.metrics.lastError = e.message || "NETWORK ERROR";
      console.error("ADMIN API FAIL:", path, e);
      return { ok: false };
    }
  }

  async function apiRetry(path, options = {}, retry = 1) {
    let last = null;
    for (let i = 0; i <= retry; i++) {
      last = await api(path, options);
      if (last?.ok) return last;
    }
    return last || { ok: false };
  }

  /* =========================
     HELPERS
  ========================= */
  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  }

  function fmtNumber(v) {
    return Number(v || 0).toLocaleString();
  }

  function paginate(list, page = 1, limit = 20) {
    const p = Math.max(1, Number(page || 1));
    const l = Math.max(1, Number(limit || 20));
    const start = (p - 1) * l;
    const arr = Array.isArray(list) ? list : [];
    return {
      items: arr.slice(start, start + l),
      total: arr.length,
      page: p,
      limit: l,
      totalPages: Math.max(1, Math.ceil(arr.length / l))
    };
  }

  function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function downloadText(filename, text, mime = "text/plain") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function rowsToCsv(rows) {
    if (!rows.length) return "";
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r || {})))];
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const lines = [
      keys.map(esc).join(","),
      ...rows.map((row) => keys.map((k) => esc(row[k])).join(","))
    ];
    return lines.join("\n");
  }

  function setLoading(on) {
    state.loading = on;
    const box = $("adminLoading");
    if (box) box.style.display = on ? "block" : "none";
  }

  function showBanner(msg, danger = false) {
    const banner = $("patchBanner");
    if (!banner) return;
    banner.className = "patch-banner" + (danger ? " patch-danger" : "");
    banner.innerHTML = escapeHtml(msg);
    banner.style.display = "block";

    clearTimeout(showBanner.__t);
    showBanner.__t = setTimeout(() => {
      banner.style.display = "none";
    }, 3000);
  }

  /* =========================
     LAYOUT
  ========================= */
  function renderLayout() {
    app.innerHTML = `
      <div class="admin-wrap">
        <div class="admin-title">노마 관리자 대시보드</div>

        <div class="admin-nav">
          <button data-tab="dashboard">대시보드</button>
          <button data-tab="users">회원 관리</button>
          <button data-tab="shops">업체 관리</button>
          <button data-tab="reservations">예약 관리</button>
          <button data-tab="logs">로그</button>
        </div>

        <div id="patchToolbar" class="patch-toolbar">
          <button id="patchReloadAll">전체 새로고침</button>
          <button id="patchExportUsersCsv">회원 CSV</button>
          <button id="patchExportShopsCsv">업체 CSV</button>
          <button id="patchExportReservationsCsv">예약 CSV</button>
          <button id="patchClearLocalCache">로컬 캐시 삭제</button>
          <select id="patchPageSize">
            <option value="10">10개</option>
            <option value="20">20개</option>
            <option value="50">50개</option>
            <option value="100">100개</option>
          </select>
          <button id="patchToggleAutoRefresh">${state.autoRefresh ? "자동 새로고침 ON" : "자동 새로고침 OFF"}</button>
        </div>

        <div id="patchBanner" class="patch-banner" style="display:none;"></div>
        <div id="adminLoading" class="admin-loading" style="display:none;">불러오는 중...</div>
        <div id="adminView"></div>
      </div>
    `;

    $("patchPageSize").value = String(state.pageSize);

    document.querySelectorAll(".admin-nav button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === state.currentTab);
      btn.addEventListener("click", async () => {
        state.currentTab = btn.dataset.tab;
        saveState();
        render();
      });
    });

    bindTopToolbar();
  }

  function bindTopToolbar() {
    $("patchReloadAll").onclick = async () => {
      await reloadCurrentTab(true);
    };

    $("patchExportUsersCsv").onclick = () => {
      const csv = rowsToCsv((state.users || []).map((v) => ({
        _id: v._id,
        email: v.email || v.name || "",
        role: v.role || "",
        createdAt: v.createdAt || ""
      })));
      downloadText("admin-users.csv", csv, "text/csv");
    };

    $("patchExportShopsCsv").onclick = () => {
      const csv = rowsToCsv((state.shops || []).map((v) => ({
        _id: v._id,
        name: v.name || "",
        region: v.region || "",
        likeCount: v.likeCount || 0,
        viewCount: v.viewCount || 0
      })));
      downloadText("admin-shops.csv", csv, "text/csv");
    };

    $("patchExportReservationsCsv").onclick = () => {
      const csv = rowsToCsv((state.reservations || []).map((v) => ({
        _id: v._id,
        userId: v.userId || "",
        placeId: v.placeId || v.shopId || "",
        status: v.status || "",
        createdAt: v.createdAt || ""
      })));
      downloadText("admin-reservations.csv", csv, "text/csv");
    };

    $("patchClearLocalCache").onclick = () => {
      state.cache = {
        dashboard: null,
        users: null,
        shops: null,
        reservations: null,
        logs: null
      };
      showBanner("로컬 관리자 캐시를 삭제했습니다.");
    };

    $("patchPageSize").onchange = (e) => {
      state.pageSize = Number(e.target.value || 20);
      saveState();
      render();
    };

    $("patchToggleAutoRefresh").onclick = () => {
      state.autoRefresh = !state.autoRefresh;
      $("patchToggleAutoRefresh").textContent = state.autoRefresh
        ? "자동 새로고침 ON"
        : "자동 새로고침 OFF";
      saveState();
      showBanner(`자동 새로고침이 ${state.autoRefresh ? "활성화" : "비활성화"}되었습니다.`);
    };
  }

  /* =========================
     DATA LOAD
  ========================= */
  async function loadDashboard(force = false) {
    if (state.cache.dashboard && !force) return state.cache.dashboard;

    setLoading(true);
    const [full, statsLive] = await Promise.all([
      apiRetry(`${API_BASE}/full`),
      apiRetry(`${API_BASE}/stats/live`)
    ]);

    const payload = {
      stats: full.stats || {},
      recentUsers: full.recent?.users || [],
      recentReservations: full.recent?.reservations || [],
      recentInquiries: full.recent?.inquiries || [],
      topAds: full.topAds || [],
      topShops: full.topShops || [],
      liveStats: statsLive.stats || {}
    };

    state.cache.dashboard = payload;
    state.stats = payload.stats;
    state.liveStats = payload.liveStats;
    setLoading(false);
    return payload;
  }

  async function loadUsers(force = false) {
    if (state.cache.users && !force && !state.searchUser) {
      state.users = state.cache.users;
      return state.users;
    }

    setLoading(true);
    const path = state.searchUser
      ? `${API_BASE}/users/search?q=${encodeURIComponent(state.searchUser)}`
      : `${API_BASE}/users`;

    const res = await apiRetry(path);
    state.users = res.items || [];
    state.cache.users = state.users;
    setLoading(false);
    return state.users;
  }

  async function loadShops(force = false) {
    if (state.cache.shops && !force && !state.searchShop) {
      state.shops = state.cache.shops;
      return state.shops;
    }

    setLoading(true);
    const path = state.searchShop
      ? `${API_BASE}/shops/search?q=${encodeURIComponent(state.searchShop)}`
      : `${API_BASE}/shops`;

    const res = await apiRetry(path);
    state.shops = res.items || [];
    state.cache.shops = state.shops;
    setLoading(false);
    return state.shops;
  }

  async function loadReservations(force = false) {
    if (state.cache.reservations && !force && !state.reservationStatus) {
      state.reservations = state.cache.reservations;
      return state.reservations;
    }

    setLoading(true);
    const path = state.reservationStatus
      ? `${API_BASE}/reservations/filter?status=${encodeURIComponent(state.reservationStatus)}`
      : `${API_BASE}/reservations`;

    const res = await apiRetry(path);
    state.reservations = res.items || [];
    state.cache.reservations = state.reservations;
    setLoading(false);
    return state.reservations;
  }

  async function loadLogs(force = false) {
    if (state.cache.logs && !force) {
      state.logs = state.cache.logs;
      return state.logs;
    }

    setLoading(true);
    const res = await apiRetry(`${API_BASE}/logs`);
    state.logs = res.logs || [];
    state.cache.logs = state.logs;
    setLoading(false);
    return state.logs;
  }

  async function reloadCurrentTab(force = false) {
    try {
      if (state.currentTab === "dashboard") await loadDashboard(force);
      if (state.currentTab === "users") await loadUsers(force);
      if (state.currentTab === "shops") await loadShops(force);
      if (state.currentTab === "reservations") await loadReservations(force);
      if (state.currentTab === "logs") await loadLogs(force);

      render();
      showBanner("데이터를 새로고침했습니다.");
    } catch (e) {
      showBanner(e.message || "새로고침 실패", true);
    }
  }

  /* =========================
     ACTIONS
  ========================= */
  async function deleteUserSafe(id) {
    if (!confirm("이 회원을 soft delete 처리할까요?")) return;
    const res = await api(`${API_BASE}/users/${id}/safe`, { method: "DELETE" });
    if (res.ok) {
      await loadUsers(true);
      render();
      showBanner("회원을 삭제 처리했습니다.");
    } else {
      showBanner("회원 삭제 실패", true);
    }
  }

  async function toggleUserRole(id) {
    const res = await api(`${API_BASE}/users/${id}/role`, { method: "POST" });
    if (res.ok) {
      await loadUsers(true);
      render();
      showBanner("권한을 변경했습니다.");
    } else {
      showBanner("권한 변경 실패", true);
    }
  }

  async function deleteShopSafe(id) {
    if (!confirm("이 업체를 soft delete 처리할까요?")) return;
    const res = await api(`${API_BASE}/shops/${id}/safe`, { method: "DELETE" });
    if (res.ok) {
      await loadShops(true);
      render();
      showBanner("업체를 삭제 처리했습니다.");
    } else {
      showBanner("업체 삭제 실패", true);
    }
  }

  async function updateReservationStatus(id, status) {
    const res = await api(`${API_BASE}/reservations/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    });

    if (res.ok) {
      await loadReservations(true);
      render();
      showBanner(`예약 상태를 ${status}로 변경했습니다.`);
    } else {
      showBanner("예약 상태 변경 실패", true);
    }
  }

  async function clearCacheRemote() {
    const res = await api(`${API_BASE}/cache-clear`, { method: "POST" });
    if (res.ok) {
      showBanner("서버 캐시 초기화 완료");
    } else {
      showBanner("서버 캐시 초기화 실패", true);
    }
  }

  async function exportUsersJson() {
    const res = await api(`${API_BASE}/export/users`);
    if (!res.ok) return;
    const text = JSON.stringify(res.users || [], null, 2);
    downloadText("users-export.json", text, "application/json");
  }

  /* =========================
     RENDERERS
  ========================= */
  function renderStatsCards() {
    const stats = state.stats || {};
    const live = state.liveStats || {};

    return `
      <div class="patch-stats">
        <div class="patch-mini-card"><strong>API 성공</strong>${fmtNumber(state.metrics.apiSuccess)}</div>
        <div class="patch-mini-card"><strong>API 실패</strong>${fmtNumber(state.metrics.apiFail)}</div>
        <div class="patch-mini-card"><strong>마지막 로드</strong>${fmtDate(state.metrics.lastLoadedAt)}</div>
        <div class="patch-mini-card"><strong>최근 오류</strong>${escapeHtml(state.metrics.lastError || "-")}</div>
        <div class="patch-mini-card"><strong>실시간 회원</strong>${fmtNumber(live.users)}</div>
        <div class="patch-mini-card"><strong>실시간 업체</strong>${fmtNumber(live.shops)}</div>
        <div class="patch-mini-card"><strong>실시간 예약</strong>${fmtNumber(live.reservations)}</div>
        <div class="patch-mini-card"><strong>총 매출</strong>${fmtNumber(stats.revenue)}</div>
      </div>
    `;
  }

  function renderPager(kind, totalPages, page) {
    return `
      <div class="patch-pagination">
        <button data-pager="${kind}" data-dir="prev">이전</button>
        <span>${page} / ${totalPages}</span>
        <button data-pager="${kind}" data-dir="next">다음</button>
      </div>
    `;
  }

  function bindPager(kind, totalPages) {
    document.querySelectorAll(`[data-pager="${kind}"]`).forEach((btn) => {
      btn.onclick = () => {
        const dir = btn.dataset.dir;
        const key =
          kind === "users" ? "pageUsers" :
          kind === "shops" ? "pageShops" :
          "pageReservations";

        if (dir === "prev") state[key] = Math.max(1, state[key] - 1);
        if (dir === "next") state[key] = Math.min(totalPages, state[key] + 1);

        saveState();
        render();
      };
    });
  }

  function renderDashboardView() {
    const d = state.cache.dashboard || {
      stats: {},
      recentUsers: [],
      recentReservations: [],
      topShops: [],
      liveStats: {}
    };

    return `
      ${renderStatsCards()}

      <div class="admin-grid">
        <div class="admin-card"><h3>회원 수</h3><div class="value">${fmtNumber(d.stats.users)}</div></div>
        <div class="admin-card"><h3>업체 수</h3><div class="value">${fmtNumber(d.stats.shops)}</div></div>
        <div class="admin-card"><h3>예약 수</h3><div class="value">${fmtNumber(d.stats.reservations)}</div></div>
        <div class="admin-card"><h3>문의 수</h3><div class="value">${fmtNumber(d.stats.inquiries)}</div></div>
        <div class="admin-card"><h3>매출</h3><div class="value">${fmtNumber(d.stats.revenue)}</div></div>
      </div>

      <div class="admin-panel">
        <h2>최근 회원</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr><th>ID</th><th>이메일</th><th>역할</th><th>가입일</th></tr>
            </thead>
            <tbody>
              ${(d.recentUsers || []).map((u) => `
                <tr>
                  <td>${escapeHtml(u._id)}</td>
                  <td>${escapeHtml(u.email || u.name || "-")}</td>
                  <td><span class="patch-chip">${escapeHtml(u.role || "user")}</span></td>
                  <td>${fmtDate(u.createdAt)}</td>
                </tr>
              `).join("") || `<tr><td colspan="4" class="admin-empty">데이터 없음</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-panel">
        <h2>인기 업체</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr><th>업체명</th><th>점수</th><th>좋아요</th><th>조회수</th></tr>
            </thead>
            <tbody>
              ${(d.topShops || []).map((s) => `
                <tr>
                  <td>${escapeHtml(s.name)}</td>
                  <td>${fmtNumber(s.score)}</td>
                  <td>${fmtNumber(s.likeCount)}</td>
                  <td>${fmtNumber(s.viewCount)}</td>
                </tr>
              `).join("") || `<tr><td colspan="4" class="admin-empty">데이터 없음</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="admin-footer-actions" style="margin-top:12px;">
          <button class="admin-btn" id="btnClearCache">서버 캐시 초기화</button>
        </div>
      </div>
    `;
  }

  function renderUsersView() {
    const pg = paginate(state.users || [], state.pageUsers, state.pageSize);

    return `
      <div class="admin-panel">
        <h2>회원 관리</h2>

        <div class="admin-toolbar">
          <input id="searchUserInput" class="admin-input" placeholder="이메일 검색" value="${escapeHtml(state.searchUser)}" />
          <button class="admin-btn" id="btnSearchUser">검색</button>
          <button class="admin-btn" id="btnUsersReload">새로고침</button>
          <button class="admin-btn" id="btnExportUsers">유저 내보내기</button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>이메일</th>
                <th>역할</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              ${pg.items.map((u) => `
                <tr>
                  <td>${escapeHtml(u._id)}</td>
                  <td>${escapeHtml(u.email || u.name || "-")}</td>
                  <td>${escapeHtml(u.role || "user")}</td>
                  <td>${fmtDate(u.createdAt)}</td>
                  <td>
                    <div class="patch-inline-actions">
                      <button class="admin-mini-btn gold" data-user-role="${escapeHtml(u._id)}">권한변경</button>
                      <button class="admin-mini-btn" data-user-delete="${escapeHtml(u._id)}">삭제</button>
                    </div>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="5" class="admin-empty">회원 없음</td></tr>`}
            </tbody>
          </table>
        </div>

        ${renderPager("users", pg.totalPages, pg.page)}
      </div>
    `;
  }

  function renderShopsView() {
    const pg = paginate(state.shops || [], state.pageShops, state.pageSize);

    return `
      <div class="admin-panel">
        <h2>업체 관리</h2>

        <div class="admin-toolbar">
          <input id="searchShopInput" class="admin-input" placeholder="업체명 검색" value="${escapeHtml(state.searchShop)}" />
          <button class="admin-btn" id="btnSearchShop">검색</button>
          <button class="admin-btn" id="btnShopsReload">새로고침</button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>업체명</th>
                <th>지역</th>
                <th>좋아요</th>
                <th>조회수</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              ${pg.items.map((s) => `
                <tr>
                  <td>${escapeHtml(s._id)}</td>
                  <td>${escapeHtml(s.name)}</td>
                  <td>${escapeHtml(s.region || "-")}</td>
                  <td>${fmtNumber(s.likeCount)}</td>
                  <td>${fmtNumber(s.viewCount)}</td>
                  <td>
                    <div class="patch-inline-actions">
                      <button class="admin-mini-btn" data-shop-delete="${escapeHtml(s._id)}">삭제</button>
                    </div>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="6" class="admin-empty">업체 없음</td></tr>`}
            </tbody>
          </table>
        </div>

        ${renderPager("shops", pg.totalPages, pg.page)}
      </div>
    `;
  }

  function renderReservationsView() {
    const pg = paginate(state.reservations || [], state.pageReservations, state.pageSize);

    return `
      <div class="admin-panel">
        <h2>예약 관리</h2>

        <div class="admin-toolbar">
          <select id="reservationStatusInput" class="admin-select">
            <option value="">전체</option>
            <option value="pending" ${state.reservationStatus === "pending" ? "selected" : ""}>pending</option>
            <option value="confirmed" ${state.reservationStatus === "confirmed" ? "selected" : ""}>confirmed</option>
            <option value="cancelled" ${state.reservationStatus === "cancelled" ? "selected" : ""}>cancelled</option>
          </select>
          <button class="admin-btn" id="btnSearchReservation">조회</button>
          <button class="admin-btn" id="btnReservationsReload">새로고침</button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>유저</th>
                <th>업체</th>
                <th>상태</th>
                <th>생성일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              ${pg.items.map((r) => `
                <tr>
                  <td>${escapeHtml(r._id)}</td>
                  <td>${escapeHtml(r.userId || "-")}</td>
                  <td>${escapeHtml(r.placeId || r.shopId || "-")}</td>
                  <td><span class="patch-chip">${escapeHtml(r.status || "-")}</span></td>
                  <td>${fmtDate(r.createdAt)}</td>
                  <td>
                    <div class="patch-inline-actions">
                      <button class="admin-mini-btn gold" data-rsv-id="${escapeHtml(r._id)}" data-rsv-status="confirmed">확정</button>
                      <button class="admin-mini-btn" data-rsv-id="${escapeHtml(r._id)}" data-rsv-status="cancelled">취소</button>
                    </div>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="6" class="admin-empty">예약 없음</td></tr>`}
            </tbody>
          </table>
        </div>

        ${renderPager("reservations", pg.totalPages, pg.page)}
      </div>
    `;
  }

  function renderLogsView() {
    return `
      <div class="admin-panel">
        <h2>로그</h2>
        <div class="patch-inline-actions" style="margin-bottom:12px;">
          <button class="admin-btn" id="btnLogsReload">새로고침</button>
          <button class="admin-btn" id="btnLogsExport">JSON 내보내기</button>
        </div>
        <div class="admin-log">
          ${(state.logs || []).map((l) => `
            <div class="admin-log-item">
              <div><strong>${escapeHtml(l.path || l.action || "-")}</strong></div>
              <div class="admin-muted">${fmtDate(l.time)}</div>
            </div>
          `).join("") || `<div class="admin-empty">로그 없음</div>`}
        </div>
      </div>
    `;
  }

  function render() {
    document.querySelectorAll(".admin-nav button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === state.currentTab);
    });

    const view = $("adminView");
    if (!view) return;

    if (state.currentTab === "dashboard") {
      view.innerHTML = renderDashboardView();
      bindDashboardEvents();
      return;
    }

    if (state.currentTab === "users") {
      view.innerHTML = renderUsersView();
      bindUsersEvents();
      bindPager("users", Math.max(1, Math.ceil((state.users || []).length / state.pageSize)));
      return;
    }

    if (state.currentTab === "shops") {
      view.innerHTML = renderShopsView();
      bindShopsEvents();
      bindPager("shops", Math.max(1, Math.ceil((state.shops || []).length / state.pageSize)));
      return;
    }

    if (state.currentTab === "reservations") {
      view.innerHTML = renderReservationsView();
      bindReservationsEvents();
      bindPager("reservations", Math.max(1, Math.ceil((state.reservations || []).length / state.pageSize)));
      return;
    }

    if (state.currentTab === "logs") {
      view.innerHTML = renderLogsView();
      bindLogsEvents();
    }
  }

  /* =========================
     BIND EVENTS
  ========================= */
  function bindDashboardEvents() {
    const btn = $("btnClearCache");
    if (btn) btn.onclick = clearCacheRemote;
  }

  function bindUsersEvents() {
    const btnSearch = $("btnSearchUser");
    const input = $("searchUserInput");
    const btnReload = $("btnUsersReload");
    const btnExport = $("btnExportUsers");

    const run = debounce(async () => {
      state.searchUser = input?.value || "";
      state.pageUsers = 1;
      saveState();
      await loadUsers(true);
      render();
    }, 250);

    if (input) input.oninput = run;
    if (btnSearch) btnSearch.onclick = run;
    if (btnReload) btnReload.onclick = async () => {
      await loadUsers(true);
      render();
    };
    if (btnExport) btnExport.onclick = exportUsersJson;

    document.querySelectorAll("[data-user-role]").forEach((btn) => {
      btn.onclick = async () => toggleUserRole(btn.dataset.userRole);
    });

    document.querySelectorAll("[data-user-delete]").forEach((btn) => {
      btn.onclick = async () => deleteUserSafe(btn.dataset.userDelete);
    });
  }

  function bindShopsEvents() {
    const btnSearch = $("btnSearchShop");
    const input = $("searchShopInput");
    const btnReload = $("btnShopsReload");

    const run = debounce(async () => {
      state.searchShop = input?.value || "";
      state.pageShops = 1;
      saveState();
      await loadShops(true);
      render();
    }, 250);

    if (input) input.oninput = run;
    if (btnSearch) btnSearch.onclick = run;
    if (btnReload) btnReload.onclick = async () => {
      await loadShops(true);
      render();
    };

    document.querySelectorAll("[data-shop-delete]").forEach((btn) => {
      btn.onclick = async () => deleteShopSafe(btn.dataset.shopDelete);
    });
  }

  function bindReservationsEvents() {
    const btnSearch = $("btnSearchReservation");
    const btnReload = $("btnReservationsReload");
    const select = $("reservationStatusInput");

    if (btnSearch) {
      btnSearch.onclick = async () => {
        state.reservationStatus = select?.value || "";
        state.pageReservations = 1;
        saveState();
        await loadReservations(true);
        render();
      };
    }

    if (btnReload) {
      btnReload.onclick = async () => {
        await loadReservations(true);
        render();
      };
    }

    document.querySelectorAll("[data-rsv-id]").forEach((btn) => {
      btn.onclick = async () => {
        await updateReservationStatus(btn.dataset.rsvId, btn.dataset.rsvStatus);
      };
    });
  }

  function bindLogsEvents() {
    const btnReload = $("btnLogsReload");
    const btnExport = $("btnLogsExport");

    if (btnReload) {
      btnReload.onclick = async () => {
        await loadLogs(true);
        render();
      };
    }

    if (btnExport) {
      btnExport.onclick = () => {
        downloadText(
          "admin-logs.json",
          JSON.stringify(state.logs || [], null, 2),
          "application/json"
        );
      };
    }
  }

  /* =========================
     INIT
  ========================= */
  async function init() {
    injectStyle();
    renderLayout();

    await Promise.all([
      loadDashboard(),
      loadUsers(),
      loadShops(),
      loadReservations(),
      loadLogs()
    ]);

    render();

    setInterval(async () => {
      if (!state.autoRefresh) return;
      if (document.hidden) return;
      if (state.currentTab === "dashboard") {
        await loadDashboard(true);
        render();
      }
    }, 15000);

    setInterval(async () => {
      if (!state.autoRefresh) return;
      if (document.hidden) return;

      if (state.currentTab === "users") {
        await loadUsers(true);
        render();
      }

      if (state.currentTab === "shops") {
        await loadShops(true);
        render();
      }

      if (state.currentTab === "reservations") {
        await loadReservations(true);
        render();
      }
    }, 30000);
  }

  window.NOMA_ADMIN_FINAL = {
    state,
    reload: () => reloadCurrentTab(true),
    render
  };

  window.addEventListener("online", () => showBanner("네트워크가 복구되었습니다."));
  window.addEventListener("offline", () => showBanner("오프라인 상태입니다.", true));

/* =====================================================
🔥 SAFE STABILITY PATCH
===================================================== */
(function () {
  // (PATCH 코드 그대로)
})();

/* 👉 PATCH 적용 후 실행 */
init();
/* =====================================================
🔥 SAFE STABILITY PATCH (KEEP ALL FEATURES)
👉 기존 기능 유지 + 오류만 수정
===================================================== */

(function () {
  "use strict";

  if (window.__NOMA_ADMIN_PATCH__) return;
  window.__NOMA_ADMIN_PATCH__ = true;

  /* =========================
  1. REQUEST DEDUPE (경로별 중복 방지)
  ========================= */
  const API_PENDING = new Map();
  const ORIGINAL_API = api;

  api = async function (path, opt = {}) {
    const method = (opt.method || "GET").toUpperCase();
    const bodyKey = typeof opt.body === "string" ? opt.body : JSON.stringify(opt.body || {});
    const dedupeKey = `${method}::${path}::${bodyKey}`;

    if (API_PENDING.has(dedupeKey)) {
      return API_PENDING.get(dedupeKey);
    }

    const p = ORIGINAL_API(path, opt)
      .catch((e) => {
        console.error("PATCH API ERROR:", e);
        return { ok: false };
      })
      .finally(() => {
        API_PENDING.delete(dedupeKey);
      });

    API_PENDING.set(dedupeKey, p);
    return p;
  };

  /* =========================
  2. CACHE TTL
  ========================= */
  const CACHE_TTL = 1000 * 60 * 3;
  const CACHE_TIME = {};

  function setCacheSafe(key, data) {
    state.cache[key] = data;
    CACHE_TIME[key] = Date.now();
  }

  function getCacheSafe(key) {
    const t = CACHE_TIME[key];
    if (!t) return null;
    if (Date.now() - t > CACHE_TTL) return null;
    return state.cache[key];
  }

  /* =========================
  3. LOAD WRAP (기존 기능 유지)
  ========================= */
  const _loadDashboard = loadDashboard;
  loadDashboard = async function (force = false) {
    const cached = getCacheSafe("dashboard");
    if (cached && !force) {
      state.stats = cached.stats || {};
      state.liveStats = cached.liveStats || {};
      return cached;
    }

    const res = await _loadDashboard(force);
    setCacheSafe("dashboard", {
      stats: state.stats,
      liveStats: state.liveStats,
      payload: res
    });
    return res;
  };

  const _loadUsers = loadUsers;
  loadUsers = async function (force = false) {
    const cached = getCacheSafe("users");
    if (cached && !force && !state.searchUser) {
      state.users = cached;
      return cached;
    }

    const res = await _loadUsers(force);
    setCacheSafe("users", Array.isArray(state.users) ? [...state.users] : []);
    return res;
  };

  const _loadShops = loadShops;
  loadShops = async function (force = false) {
    const cached = getCacheSafe("shops");
    if (cached && !force && !state.searchShop) {
      state.shops = cached;
      return cached;
    }

    const res = await _loadShops(force);
    setCacheSafe("shops", Array.isArray(state.shops) ? [...state.shops] : []);
    return res;
  };

  const _loadReservations = loadReservations;
  loadReservations = async function (force = false) {
    const cached = getCacheSafe("reservations");
    if (cached && !force && !state.reservationStatus) {
      state.reservations = cached;
      return cached;
    }

    const res = await _loadReservations(force);
    setCacheSafe("reservations", Array.isArray(state.reservations) ? [...state.reservations] : []);
    return res;
  };

  const _loadLogs = loadLogs;
  loadLogs = async function (force = false) {
    const cached = getCacheSafe("logs");
    if (cached && !force) {
      state.logs = cached;
      return cached;
    }

    const res = await _loadLogs(force);
    setCacheSafe("logs", Array.isArray(state.logs) ? [...state.logs] : []);
    return res;
  };

  /* =========================
  4. SAFE RENDER
  ========================= */
  const ORIGINAL_RENDER = render;
  let RENDER_SCHEDULED = false;

  render = function () {
    if (RENDER_SCHEDULED) return;

    RENDER_SCHEDULED = true;

    requestAnimationFrame(() => {
      try {
        ORIGINAL_RENDER();
      } catch (e) {
        console.error("RENDER CRASH:", e);
      } finally {
        RENDER_SCHEDULED = false;
      }
    });
  };

  /* =========================
  5. MEMORY TRIM
  ========================= */
  const PATCH_MEMORY_INTERVAL = setInterval(() => {
    if (state.users.length > 2000) state.users = state.users.slice(0, 1000);
    if (state.shops.length > 2000) state.shops = state.shops.slice(0, 1000);
    if (state.reservations.length > 2000) state.reservations = state.reservations.slice(0, 1000);
    if (state.logs.length > 3000) state.logs = state.logs.slice(0, 1500);
  }, 15000);

  /* =========================
  6. SAFE AUTO REFRESH
  ========================= */
  let AUTO_LOCK = false;

  const PATCH_AUTO_INTERVAL = setInterval(() => {
    if (AUTO_LOCK) return;
    if (!state.autoRefresh) return;
    if (document.hidden) return;

    AUTO_LOCK = true;

    reloadCurrentTab(false)
      .catch((e) => {
        console.error("AUTO REFRESH FAIL:", e);
      })
      .finally(() => {
        setTimeout(() => {
          AUTO_LOCK = false;
        }, 1500);
      });
  }, 20000);

  /* =========================
  7. ERROR RECOVERY
  ========================= */
  window.addEventListener("error", () => {
    if (state.metrics.apiFail > 10) {
      console.warn("SAFE RECOVERY MODE");
      const dashboardCache = getCacheSafe("dashboard");
      if (dashboardCache) {
        state.stats = dashboardCache.stats || {};
        state.liveStats = dashboardCache.liveStats || {};
        render();
      }
    }
  });

  /* =========================
  8. NETWORK RECOVERY
  ========================= */
  window.addEventListener("online", () => {
    reloadCurrentTab(true);
  });

  /* =========================
  9. DEBUG TOOL
  ========================= */
  window.NOMA_ADMIN_DEBUG = {
    state,
    reload: () => reloadCurrentTab(true),
    clearCache: () => {
      state.cache = {
        dashboard: null,
        users: null,
        shops: null,
        reservations: null,
        logs: null
      };
      Object.keys(CACHE_TIME).forEach((k) => delete CACHE_TIME[k]);
    },
    apiPending: () => API_PENDING.size,
    patchIntervals: () => [PATCH_MEMORY_INTERVAL, PATCH_AUTO_INTERVAL]
  };

  console.log("🔥 SAFE PATCH APPLIED");
})();