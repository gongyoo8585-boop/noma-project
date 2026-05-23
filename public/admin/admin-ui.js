// ==============================
// 🔥 FINAL COMPLETE VERSION (ADMIN ULTRA COMPLETE)
// ==============================

const socket = window.io ? io() : null;
let adminToken = localStorage.getItem("adminToken") || "";
let currentTab = localStorage.getItem("adminTab") || "dashboard";

/* =========================
🔥 추가 위치 1: 상태 확장
========================= */
let LAST_LOAD_TIME = 0;
let IS_LOADING = false;

let CACHE = {
  inquiries: [],
  users: [],
  reservations: []
};

/* 🔥 추가 위치 2: 요청 큐 */
let REQUEST_QUEUE = [];

/* =========================
DOM 안전 접근
========================= */
function safeEl(id){
  return document.getElementById(id);
}

/* 🔥 오류 수정 */
function authHeaders() {
  return adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
}

/* =========================
API
========================= */
async function api(path, options = {}) {
  try{
    const headers = { ...(options.headers || {}), ...authHeaders() };

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("ADMIN API ERROR:", path, data);
      showError("API 오류 발생");
      return data || {};
    }

    return data;

  }catch(e){
    console.error(e);
    showError("네트워크 오류");
    return { items:[], stats:{} };
  }
}

/* =========================
🔥 핵심 로드
========================= */
async function loadAll(){

  if(IS_LOADING) return;
  if(Date.now() - LAST_LOAD_TIME < 300) return;

  IS_LOADING = true;
  LAST_LOAD_TIME = Date.now();

  showLoading(true);

  await Promise.all([
    loadStats(),
    loadInquiries(),
    loadReservationsAdmin(),
    loadUsersAdmin()
  ]);

  showLastLoad();
  showLoading(false);

  IS_LOADING = false;
}

/* =========================
문의
========================= */
async function loadInquiries(){
  const wrap = safeEl("inquiryList");
  if(!wrap) return;

  const data = await api("/api/admin/inquiries");
  CACHE.inquiries = data.items || [];

  wrap.innerHTML = `
    <h3>문의 (${CACHE.inquiries.length})</h3>
    ${CACHE.inquiries.map(i=>`
      <div style="border:1px solid #333;margin:10px;padding:10px">
        <div>${i.name} / ${i.phone}</div>
        <div>${i.content}</div>
        <div>${i.status}</div>
        <button onclick="updateInquiryStatus('${i._id}')">완료</button>
      </div>
    `).join("")}
  `;
}

/* =========================
통계
========================= */
async function loadStats(){
  const wrap = safeEl("dashboard");
  if(!wrap) return;

  const data = await api("/api/admin/stats");

  wrap.innerHTML = `
    <h3>대시보드</h3>
    <div>회원: ${data.stats?.users||0}</div>
    <div>업체: ${data.stats?.shops||0}</div>
    <div>예약: ${data.stats?.reservations||0}</div>
  `;
}

/* =========================
유저
========================= */
async function loadUsersAdmin(){
  const wrap = safeEl("userSection");
  if(!wrap) return;

  const data = await api("/api/admin/users");
  CACHE.users = data.items || [];

  wrap.innerHTML = `
    <h3>유저 (${CACHE.users.length})</h3>
    ${CACHE.users.map(u=>`
      <div style="border:1px solid #333;margin:10px;padding:10px">
        <div>${u.id}</div>
        <div>${u.role}</div>
        <button onclick="changeUserRole('${u._id}')">권한변경</button>
        <button onclick="deleteUser('${u._id}')">삭제</button>
      </div>
    `).join("")}
  `;
}

/* =========================
예약
========================= */
async function loadReservationsAdmin(){
  const wrap = safeEl("reservationSection");
  if(!wrap) return;

  const data = await api("/api/admin/reservations");
  CACHE.reservations = data.items || [];

  wrap.innerHTML = `
    <h3>예약 (${CACHE.reservations.length})</h3>
    ${CACHE.reservations.map(r=>`
      <div style="border:1px solid #333;margin:10px;padding:10px">
        <div>${r.userId}</div>
        <div>${r.status}</div>
        <button onclick="updateReservationStatus('${r._id}')">확정</button>
      </div>
    `).join("")}
  `;
}

/* =========================
SHOP CRUD
========================= */
async function loadShopAdmin(){
  const wrap = safeEl("shopSection");
  if(!wrap) return;

  const data = await api("/api/admin/shops");

  wrap.innerHTML = `
    <h3>업체 관리</h3>
    <input id="newShopName" placeholder="업체명">
    <input id="newShopRegion" placeholder="지역">
    <button onclick="createShop()">추가</button>

    ${(data.items||[]).map(s=>`
      <div style="border:1px solid #333;margin:10px;padding:10px">
        <input value="${s.name}" onchange="updateShop('${s._id}', this.value)">
        <span>${s.region||""}</span>
        <button onclick="deleteShop('${s._id}')">삭제</button>
      </div>
    `).join("")}
  `;
}

/* 🔥 CRUD */
async function createShop(){
  const name = safeEl("newShopName")?.value;
  const region = safeEl("newShopRegion")?.value;

  await api("/api/admin/shops",{method:"POST",body:JSON.stringify({name,region})});
  loadShopAdmin();
}

async function updateShop(id,name){
  if(!name) return;
  await api(`/api/admin/shops/${id}`,{method:"PUT",body:JSON.stringify({name})});
}

async function deleteShop(id){
  if(!confirm("삭제?")) return;
  await api(`/api/admin/shops/${id}`,{ method:"DELETE" });
  loadShopAdmin();
}

/* =========================
RANKING
========================= */
async function loadRanking(){
  const wrap = safeEl("rankingSection");
  if(!wrap) return;

  const data = await api("/api/shops?sort=like");

  wrap.innerHTML = `
    <h3>🔥 인기 TOP10</h3>
    ${(data.items||[]).slice(0,10).map((s,i)=>`
      <div>${i+1}. ${s.name} ❤️${s.likeCount||0}</div>
    `).join("")}
  `;
}

/* =========================
TAB
========================= */
function showTab(tab){
  currentTab = tab;
  saveAdminState();

  ["dashboard","inquiryList","shopSection","rankingSection","userSection","reservationSection"]
    .forEach(id=>{
      safeEl(id)?.style.setProperty("display", id===tab||(
        tab==="inquiry"&&id==="inquiryList"
      ) ? "block":"none");
    });

  if(tab==="shop") loadShopAdmin();
  if(tab==="ranking") loadRanking();
  if(tab==="users") loadUsersAdmin();
  if(tab==="reservations") loadReservationsAdmin();
}

/* =========================
SOCKET
========================= */
if(socket){
  socket.on("inquiry:new", ()=>loadInquiries());
  socket.on("shop:like", loadRanking);
}

/* =========================
INIT
========================= */
if (adminToken){
  loadAll();
  showTab(currentTab);
}

/* =========================
기능
========================= */
async function updateInquiryStatus(id){
  await api(`/api/admin/inquiries/${id}/status`,{method:"POST"});
  loadInquiries();
}

async function updateReservationStatus(id){
  await api(`/api/admin/reservations/${id}/status`,{
    method:"POST",
    body:JSON.stringify({status:"confirmed"})
  });
  loadReservationsAdmin();
}

async function changeUserRole(id){
  await api(`/api/admin/users/${id}/role`,{method:"POST"});
  loadUsersAdmin();
}

async function deleteUser(id){
  if(!confirm("삭제?")) return;
  await api(`/api/admin/users/${id}`,{method:"DELETE"});
  loadUsersAdmin();
}

/* =========================
UI
========================= */
function showError(msg){
  const el = safeEl("dashboard");
  if(el){
    el.innerHTML += `<div style="color:red">${msg}</div>`;
  }
}

function saveAdminState(){
  localStorage.setItem("adminTab",currentTab);
}

function showLoading(on){
  const el = safeEl("loading");
  if(el) el.style.display = on?"block":"none";
}

function showLastLoad(){
  const el = safeEl("lastLoad");
  if(el){
    el.innerText = "마지막 로드: " + new Date().toLocaleTimeString();
  }
}

/* =========================
자동 갱신
========================= */
setInterval(()=>{
  if(document.hidden) return;
  loadAll();
},30000);

/* 클릭 효과 */
document.addEventListener("click",(e)=>{
  const btn = e.target.closest("button");
  if(btn){
    btn.style.transform="scale(0.95)";
    setTimeout(()=>btn.style.transform="",100);
  }
});

/* =====================================================
🔥 ADD ONLY EXTENSION (ADMIN FINAL +13)
📍 위치: 기존 코드 맨 아래
===================================================== */

/* =========================
1. 요청 큐 실제 사용 연결
========================= */
function enqueueRequest(key){
  if(REQUEST_QUEUE.includes(key)) return false;
  REQUEST_QUEUE.push(key);
  return true;
}

function dequeueRequest(key){
  REQUEST_QUEUE = REQUEST_QUEUE.filter(v=>v!==key);
}

/* =========================
2. API 보호 래퍼
========================= */
async function safeAdminApi(path,opt={}){
  if(!enqueueRequest(path)) return {};
  try{
    return await api(path,opt);
  }finally{
    dequeueRequest(path);
  }
}

/* =========================
3. 캐시 TTL 적용
========================= */
function setAdminCache(key,data){
  localStorage.setItem("ADMIN_CACHE_"+key, JSON.stringify({
    t:Date.now(),
    d:data
  }));
}

function getAdminCache(key,ttl=5000){
  try{
    const raw = localStorage.getItem("ADMIN_CACHE_"+key);
    if(!raw) return null;

    const parsed = JSON.parse(raw);
    if(Date.now()-parsed.t>ttl) return null;

    return parsed.d;
  }catch{
    return null;
  }
}

/* =========================
4. 자동 재시도 API
========================= */
async function retryAdminApi(path,opt={},retry=2){
  let last;
  for(let i=0;i<=retry;i++){
    try{
      return await safeAdminApi(path,opt);
    }catch(e){
      last=e;
    }
  }
  console.error("ADMIN RETRY FAIL:",last);
  return {};
}

/* =========================
5. 검색 기능 (유저/문의)
========================= */
function searchUsers(keyword){
  if(!CACHE.users) return;
  const k = keyword.toLowerCase();

  const filtered = CACHE.users.filter(u=>
    (u.id||"").toLowerCase().includes(k)
  );

  renderSearchResult("userSection",filtered,"id");
}

function searchInquiries(keyword){
  if(!CACHE.inquiries) return;

  const k = keyword.toLowerCase();

  const filtered = CACHE.inquiries.filter(i=>
    (i.name||"").toLowerCase().includes(k)
  );

  renderSearchResult("inquiryList",filtered,"name");
}

function renderSearchResult(elId,data,key){
  const wrap = safeEl(elId);
  if(!wrap) return;

  wrap.innerHTML = data.map(d=>`
    <div style="border:1px solid #999;padding:5px">
      ${d[key] || "-"}
    </div>
  `).join("");
}

/* =========================
6. CSV 다운로드
========================= */
function downloadCSV(data,name="export"){
  if(!data?.length) return;

  const keys = Object.keys(data[0]);

  const rows = [
    keys.join(","),
    ...data.map(r=>keys.map(k=>r[k]).join(","))
  ];

  const blob = new Blob([rows.join("\n")],{type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name+".csv";
  a.click();
}

/* =========================
7. 관리자 알림
========================= */
function adminToast(msg){
  const div = document.createElement("div");
  div.innerText = msg;
  div.style = "position:fixed;top:10px;right:10px;background:#000;color:#fff;padding:10px;z-index:9999";
  document.body.appendChild(div);

  setTimeout(()=>div.remove(),2000);
}

/* =========================
8. 자동 저장 (탭 상태 확장)
========================= */
function saveAdminUIState(){
  localStorage.setItem("adminState", JSON.stringify({
    tab:currentTab,
    time:Date.now()
  }));
}

function loadAdminUIState(){
  try{
    const s = JSON.parse(localStorage.getItem("adminState")||"{}");
    if(s.tab) showTab(s.tab);
  }catch{}
}

/* =========================
9. 성능 로그
========================= */
function perfLog(name,fn){
  const t = performance.now();
  const res = fn();
  console.log("PERF:",name,(performance.now()-t).toFixed(2));
  return res;
}

/* =========================
10. 자동 스크롤 복원
========================= */
function saveScrollAdmin(){
  localStorage.setItem("adminScroll",window.scrollY);
}

function restoreScrollAdmin(){
  const y = Number(localStorage.getItem("adminScroll")||0);
  window.scrollTo(0,y);
}

/* =========================
11. 디바운스 공통
========================= */
function debounceAdmin(fn,delay=300){
  let t;
  return (...args)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...args),delay);
  };
}

/* =========================
12. 관리자 상태 디버그
========================= */
function debugAdminState(){
  console.log("ADMIN STATE:",{
    users:CACHE.users.length,
    inquiries:CACHE.inquiries.length,
    reservations:CACHE.reservations.length,
    loading:IS_LOADING
  });
}

/* =========================
13. 긴급 초기화
========================= */
function resetAdminAll(){
  localStorage.clear();
  location.reload();
}

/* =========================
🔥 이벤트 추가 (기존 영향 없음)
========================= */

// 상태 저장
window.addEventListener("beforeunload", saveAdminUIState);

// 스크롤 저장
window.addEventListener("scroll", debounceAdmin(saveScrollAdmin,300));

// 복원
window.addEventListener("load", ()=>{
  loadAdminUIState();
  restoreScrollAdmin();
});

// 자동 디버그
setInterval(debugAdminState,10000);

// 온라인 복귀
window.addEventListener("online", ()=>{
  adminToast("온라인 복귀 → 새로고침");
  loadAll();
});