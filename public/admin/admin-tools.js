// ==============================
// 🔥 FINAL ULTRA COMPLETE (FIX + 13 FEATURES)
// ==============================

async function loadAdminExtra() {

/* 🔥 수정 위치 1 */
const token = localStorage.getItem("adminToken");
if (!token) return;

const el = document.getElementById("adminDashboard");
if (!el) return;

showAdminLoading(true);

/* 🔥 수정 위치 2 */
el.innerHTML = '<div class="admin-loading">불러오는 중...</div>';

try {

const res = await fetch("/api/admin/full", {
headers: { Authorization: "Bearer " + token }
});

let data = {};
try {
  data = await res.json();
} catch {}

if (!res.ok || !data.ok) {
  throw new Error(data.message || "데이터 로딩 실패");
}

/* 🔥 추가 기능 1: 캐시 저장 */
setAdminCache(data);
setCacheTime();

/* 🔥 추가 기능 2: 구조 보호 */
const topAds = Array.isArray(data.topAds) ? data.topAds : [];

/* 🔥 추가 기능 3: HTML 이스케이프 */
const escapeHtml = (v) =>
  String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/* 🔥 추가 기능 4: 렌더 안정화 */
el.innerHTML = `
  <div class="admin-section">
    <div class="admin-title">🔥 광고 TOP 업체 (${topAds.length})</div>
    ${
      topAds.length
        ? topAds.map((p, i) => `
          <div class="admin-item">
            ${i + 1}. ${escapeHtml(p.name)} 
            <span class="admin-score">(${p.adScore ?? 0})</span>
          </div>
        `).join("")
        : '<div class="admin-empty">데이터 없음</div>'
    }
  </div>
`;

/* 🔥 추가 기능 5: 마지막 로드 표시 */
showLastLoad();

/* 🔥 추가 기능 6: 디버그 */
debugAdmin();

} catch (err) {

console.error(err);

/* 🔥 추가 기능 7: 에러 로그 저장 */
logAdminError(err);

el.innerHTML = `
  <div class="admin-error">
    ❌ 불러오기 실패<br/>
    <button onclick="reloadAdminExtra()">다시 시도</button>
  </div>
`;

} finally {
showAdminLoading(false);
}
}

/* =========================
🔥 reload
========================= */
function reloadAdminExtra() {
loadAdminExtra();
}

/* =========================
🔥 추가 기능 8: 자동 새로고침
========================= */
let adminAutoTimer;
function autoRefreshAdmin(on){
clearInterval(adminAutoTimer);
if(on){
adminAutoTimer = setInterval(()=>{
if(!document.hidden) safeAdminLoad();
},5000);
}
}

/* =========================
🔥 추가 기능 9: 디버그
========================= */
function debugAdmin(){
console.log("ADMIN LOAD:", new Date().toISOString());
}

/* =========================
🔥 추가 기능 10: 캐시
========================= */
let adminCache = null;

function setAdminCache(data){
adminCache = data;
}

function getAdminCache(){
return adminCache;
}

/* =========================
🔥 추가 기능 11: 캐시 로드
========================= */
async function loadAdminWithCache(){
if(adminCache){
renderAdmin(adminCache);
return;
}
await loadAdminExtra();
}

/* =========================
🔥 추가 기능 12: 렌더 함수 분리
========================= */
function renderAdmin(data){
const el = document.getElementById("adminDashboard");
if(!el) return;

const topAds = data.topAds || [];

el.innerHTML = topAds.length
? topAds.map((p,i)=>`
<div class="admin-item">
${i+1}. ${p.name || "-"} (${p.adScore||0})
</div>
`).join("")
: '<div class="admin-empty">데이터 없음</div>';
}

/* =========================
🔥 추가 기능 13: 필터
========================= */
function filterTopAds(minScore=0){
if(!adminCache?.topAds) return;

const filtered = adminCache.topAds.filter(a=>(a.adScore||0)>=minScore);
renderAdmin({topAds:filtered});
}

/* =========================
🔥 추가 기능 14: 정렬
========================= */
function sortTopAds(){
if(!adminCache?.topAds) return;

const sorted = [...adminCache.topAds].sort((a,b)=>(b.adScore||0)-(a.adScore||0));
renderAdmin({topAds:sorted});
}

/* =========================
🔥 추가 기능 15: 강제 리로드
========================= */
function forceReloadAdmin(){
adminCache = null;
loadAdminExtra();
}

/* =========================
🔥 추가 기능 16: 에러 로그
========================= */
function logAdminError(e){
let logs = JSON.parse(localStorage.getItem("adminErrors")||"[]");

logs.push({
time:Date.now(),
msg:e?.message||"unknown"
});

logs = logs.slice(-50);

localStorage.setItem("adminErrors",JSON.stringify(logs));
}

/* =========================
🔥 추가 기능 17: 마지막 로드 표시
========================= */
function showLastLoad(){
const el = document.getElementById("adminLastLoad");
if(!el) return;

el.innerText = "마지막 로딩: " + new Date().toLocaleTimeString();
}

/* =========================
🔥 추가 기능 18: 로딩 표시
========================= */
function showAdminLoading(on){
const el = document.getElementById("adminLoading");
if(el) el.style.display = on ? "block" : "none";
}

/* =========================
🔥 추가 기능 19: 안전 로드
========================= */
let adminLoading = false;

async function safeAdminLoad(){
if(adminLoading) return;

adminLoading = true;

try{
await loadAdminExtra();
}finally{
adminLoading = false;
}
}

/* =========================
🔥 추가 기능 20: 검색
========================= */
function searchAdmin(keyword){
if(!adminCache?.topAds) return;

const k = keyword.toLowerCase();

const filtered = adminCache.topAds.filter(p=>
(p.name||"").toLowerCase().includes(k)
);

renderAdmin({topAds:filtered});
}

/* =========================
🔥 이벤트
========================= */
document.addEventListener("click",(e)=>{
const btn = e.target.closest("button");
if(btn){
btn.style.transform="scale(0.95)";
setTimeout(()=>btn.style.transform="",100);
}
});

document.addEventListener("keydown",(e)=>{
if(e.key==="Escape"){
loadAdminExtra();
}
});

/* =========================
🔥 네트워크
========================= */
window.addEventListener("offline",()=>{
console.warn("오프라인 상태");
});

window.addEventListener("online",()=>{
loadAdminExtra();
});

/* =========================
🔥 visibility
========================= */
document.addEventListener("visibilitychange",()=>{
if(!document.hidden){
safeAdminLoad();
}
});

/* =========================
🔥 캐시 TTL
========================= */
function isCacheValid(){
const t = Number(localStorage.getItem("adminCacheTime")||0);
return Date.now() - t < 10000;
}

function setCacheTime(){
localStorage.setItem("adminCacheTime", Date.now());
}

function tryLoadCache(){
if(isCacheValid() && adminCache){
renderAdmin(adminCache);
}
}

/* =========================
🔥 INIT
========================= */
tryLoadCache();
loadAdminExtra();
showLastLoad();
autoRefreshAdmin(true);
/* =====================================================
🔥 ADD ONLY EXTENSION v3 (ADMIN EXTRA +13)
📍 위치: 기존 코드 맨 아래
===================================================== */

/* =========================
1. TOP ADS 캐시 저장 확장
========================= */
function cacheTopAds(){
  if(!adminCache?.topAds) return;
  localStorage.setItem("topAdsCache", JSON.stringify(adminCache.topAds));
}

/* =========================
2. TOP ADS 캐시 불러오기
========================= */
function loadTopAdsCache(){
  try{
    const c = JSON.parse(localStorage.getItem("topAdsCache")||"[]");
    if(c.length){
      renderAdmin({topAds:c});
    }
  }catch{}
}

/* =========================
3. 요청 속도 측정
========================= */
function measureAdminLoad(){
  const t = performance.now();
  loadAdminExtra().finally(()=>{
    console.log("ADMIN LOAD TIME:", (performance.now()-t).toFixed(2),"ms");
  });
}

/* =========================
4. 자동 캐시 저장 연결
========================= */
setInterval(()=>{
  if(adminCache) cacheTopAds();
},5000);

/* =========================
5. 간단 통계 콘솔 출력
========================= */
function logAdminStats(){
  if(!adminCache?.stats) return;

  console.log("STATS:", adminCache.stats);
}

/* =========================
6. 강제 캐시 삭제
========================= */
function clearAdminCache(){
  localStorage.removeItem("topAdsCache");
  adminCache = null;
}

/* =========================
7. 키보드 단축키
========================= */
document.addEventListener("keydown",(e)=>{
  if(e.ctrlKey && e.key==="r"){
    e.preventDefault();
    forceReloadAdmin();
  }
});

/* =========================
8. 자동 TOP 정렬 유지
========================= */
setInterval(()=>{
  if(adminCache?.topAds){
    sortTopAds();
  }
},8000);

/* =========================
9. 관리자 상태 표시
========================= */
function showAdminStatus(){
  const el = document.getElementById("adminStatus");
  if(!el) return;

  el.innerText = adminLoading ? "로딩중..." : "정상";
}

/* =========================
10. 상태 자동 갱신
========================= */
setInterval(showAdminStatus,2000);

/* =========================
11. 최근 에러 출력
========================= */
function showAdminErrors(){
  const logs = JSON.parse(localStorage.getItem("adminErrors")||"[]");
  console.log("최근 에러:", logs.slice(-5));
}

/* =========================
12. 관리자 데이터 덤프
========================= */
function dumpAdminData(){
  console.log("ADMIN FULL DATA:", adminCache);
}

/* =========================
13. 자동 캐시 fallback
========================= */
window.addEventListener("offline",()=>{
  console.warn("OFFLINE → 캐시 사용");
  loadTopAdsCache();
});