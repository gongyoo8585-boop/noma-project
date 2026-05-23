// ==============================
// 🔥 FINAL COMPLETE VERSION (100% REAL FINAL)
// ==============================

function safe(v, fallback = "") {
  return v ?? fallback;
}

function toNumber(v, def = 0){
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

const CFG = window.APP_CONFIG || {};
const API_BASE_URL = (CFG.API_BASE_URL || "").replace(/\/$/, "");

/* ========================= DOM ========================= */
const list = document.getElementById("list");
const loading = document.getElementById("loading");
const searchInput = document.getElementById("search");
const sortSelectEl = document.getElementById("sortSelect");

let socket = window.io ? io() : null;
let token = localStorage.getItem("token") || "";

/* ========================= STATE ========================= */
const state = {
  token,
  map: null,
  currentPos: JSON.parse(localStorage.getItem("lastPos") || "null") || {
    lat: 35.2283,
    lng: 128.8892
  },
  markers: [],
  shops: [],
  selectedId: localStorage.getItem("selectedId") || null,
  hasMore: true,
  abortController: null,
  lastLoad: 0,
  cache: {},
  cacheTime: {},
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
  page: 1,
  offline: !navigator.onLine,
  isLoading: false
};

/* ========================= UTIL ========================= */
function escapeHtml(v) {
  return String(v || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

function formatKm(km){
  const n = toNumber(km,0);
  return n < 1 ? `${Math.round(n*1000)}m` : `${n.toFixed(2)}km`;
}

function setStatus(t){
  const el = document.getElementById("statusText");
  if(el) el.textContent = t || "";
}

function showLoading(on){
  if(!loading) return;
  loading.style.display = on?"block":"none";
}

/* ========================= API ========================= */
async function api(url,opt={}) {

  try {

    // 🔥 abort previous
    if(state.abortController){
      state.abortController.abort();
    }

    state.abortController = new AbortController();
    opt.signal = state.abortController.signal;

    if (state.token) {
      opt.headers = {
        ...(opt.headers||{}),
        Authorization:"Bearer "+state.token
      };
    }

    if (opt.body && !opt.headers?.["Content-Type"]) {
      opt.headers = {
        ...(opt.headers||{}),
        "Content-Type":"application/json"
      };
    }

    const r = await fetch(API_BASE_URL+url,opt);
    const d = await r.json().catch(()=>({}));

    if(!r.ok){
      setStatus("서버 오류");
      return { ok:false, items:[] };
    }

    return d;

  } catch(e){

    // 🔥 fallback cache
    const cached = state.cache[url];
    if(cached){
      return { ok:true, items:cached };
    }

    setStatus("네트워크 오류");
    return { ok:false, items:[] };
  }
}

/* ========================= MAP ========================= */
function initMap(){
  const el = document.getElementById("map");
  if(!el || !window.kakao?.maps) return;

  const center = new kakao.maps.LatLng(state.currentPos.lat,state.currentPos.lng);
  state.map = new kakao.maps.Map(el,{center,level:5});

  new kakao.maps.Marker({map:state.map,position:center});
  attachMapDebounce();
}

function clearMarkers(){
  state.markers.forEach(m=>m.setMap(null));
  state.markers=[];
}

function addMarkers(items){
  if(!state.map || !window.kakao?.maps) return;

  clearMarkers();

  items.forEach(shop=>{
    if(!shop?.lat||!shop?.lng) return;

    const marker = new kakao.maps.Marker({
      map:state.map,
      position:new kakao.maps.LatLng(shop.lat,shop.lng)
    });

    kakao.maps.event.addListener(marker,"click",()=>{
      state.selectedId = shop._id;
      localStorage.setItem("selectedId",shop._id);
      render(state.shops);
    });

    state.markers.push(marker);
  });
}

/* ========================= SORT ========================= */
function applySort(items){
  const arr = [...items];
  switch(sortSelectEl?.value){
    case "distance": return arr.sort((a,b)=>toNumber(a.distanceKm,999)-toNumber(b.distanceKm,999));
    case "rating": return arr.sort((a,b)=>toNumber(b.ratingAvg)-toNumber(a.ratingAvg));
    case "view": return arr.sort((a,b)=>toNumber(b.viewCount)-toNumber(a.viewCount));
    default: return arr.sort((a,b)=>toNumber(b.likeCount)-toNumber(a.likeCount));
  }
}

/* ========================= RENDER ========================= */
function render(items){

  if(!list) return;

  items = applySort(items);
  state.shops = items;

  list.innerHTML="";

  if(!items.length){
    list.innerHTML="<div>없음</div>";
    return;
  }

  items.forEach(p=>{
    const el = document.createElement("div");
    el.className="card "+(state.selectedId===p._id?"active":"");

    const isFav = state.favorites.has(p._id);

    el.innerHTML=`
      <div>${escapeHtml(p.name)}</div>
      <div>${formatKm(p.distanceKm)}</div>
      <div>❤️ ${p.likeCount||0}</div>
      <button class="like">${isFav?"★":"☆"}</button>
      <button class="detail">상세</button>
    `;

    el.onclick=()=>{
      state.selectedId = p._id;
      localStorage.setItem("selectedId",p._id);
      render(state.shops);
    };

    el.querySelector(".like").onclick=(e)=>{
      e.stopPropagation();
      toggleFavorite(p._id);
    };

    el.querySelector(".detail").onclick=(e)=>{
      e.stopPropagation();
      openDetail(p._id);
    };

    list.appendChild(el);
  });

  addMarkers(items);
}

/* ========================= DETAIL ========================= */
async function openDetail(id){

  document.querySelector(".modal")?.remove();

  const d = await api(`/api/shops/${id}`);
  if(!d.shop) return;

  const modal=document.createElement("div");
  modal.className="modal";

  modal.innerHTML=`
    <div>
      <h2>${escapeHtml(d.shop.name)}</h2>
      <div>⭐ ${d.shop.ratingAvg||0}</div>
      <button onclick="this.closest('.modal').remove()">닫기</button>
    </div>
  `;

  document.body.appendChild(modal);
}

/* ========================= FAVORITE ========================= */
async function toggleFavorite(id){

  const prev = new Set(state.favorites);

  if(state.favorites.has(id)){
    state.favorites.delete(id);
  }else{
    state.favorites.add(id);
  }

  localStorage.setItem("favorites", JSON.stringify([...state.favorites]));
  render(state.shops);

  const r = await api(`/api/favorites/${id}`, {method:"POST"});

  if(!r.ok){
    state.favorites = prev;
    render(state.shops);
  }
}

/* ========================= LOAD ========================= */
async function loadPlaces(reset=false){

  if(Date.now()-state.lastLoad < 300) return;
  state.lastLoad = Date.now();

  if(state.isLoading) return;
  state.isLoading = true;

  if(reset){
    state.page=1;
    state.hasMore=true;
  }

  showLoading(true);

  const params = new URLSearchParams();
  params.set("lat",state.currentPos.lat);
  params.set("lng",state.currentPos.lng);
  params.set("page",state.page);

  if(searchInput?.value){
    params.set("keyword",searchInput.value);
  }

  const key = params.toString();

  // 🔥 cache TTL 5초
  if(state.cache[key] && Date.now()-state.cacheTime[key] < 5000){
    render(state.cache[key]);
    showLoading(false);
    state.isLoading=false;
    return;
  }

  const d = await api("/api/shops?"+key);

  let items = d.items||[];

  if(!items.length){
    state.hasMore=false;
  }else{
    state.page++;
  }

  state.cache[key] = items;
  state.cacheTime[key] = Date.now();

  render(items);

  showLoading(false);
  state.isLoading=false;
}

/* ========================= SCROLL ========================= */
window.addEventListener("scroll",()=>{
  if(!state.hasMore || state.isLoading) return;

  if(window.innerHeight+window.scrollY >= document.body.offsetHeight-100){
    loadPlaces();
  }
});

/* ========================= MAP DEBOUNCE ========================= */
function attachMapDebounce(){
  if(!window.kakao?.maps||!state.map) return;

  let timer;
  kakao.maps.event.addListener(state.map,"dragend",()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const c = state.map.getCenter();
      state.currentPos={lat:c.getLat(),lng:c.getLng()};
      loadPlaces(true);
    },300);
  });
}

/* ========================= NETWORK ========================= */
window.addEventListener("offline",()=>setStatus("오프라인"));
window.addEventListener("online",()=>loadPlaces(true));

/* ========================= SOCKET ========================= */
if(socket){
  socket.on("shop:like",()=>loadPlaces(true));
  socket.on("reservation:new",()=>loadPlaces(true));
}

/* ========================= INIT ========================= */
function init(){
  initMap();
  loadPlaces(true);
}

init();
/* =====================================================
🔥 FINAL ADD-ONLY EXTENSION v4 (절대 기존 코드 수정 없음)
👉 위치: init(); 아래
===================================================== */

/* =========================
1. API 요청 중복 방지
========================= */
const REQUEST_LOCK = new Set();

function lockRequest(key){
  if(REQUEST_LOCK.has(key)) return false;
  REQUEST_LOCK.add(key);
  return true;
}

function unlockRequest(key){
  REQUEST_LOCK.delete(key);
}

/* =========================
2. 안전 API 호출
========================= */
async function safeApiCall(url,opt={}){
  if(!lockRequest(url)) return {};

  try{
    return await api(url,opt);
  }catch(e){
    console.error("SAFE API ERROR:", e.message);
    return {};
  }finally{
    unlockRequest(url);
  }
}

/* =========================
3. 자동 재시도
========================= */
async function retryApiCall(url,opt={},retry=2){
  let last;
  for(let i=0;i<=retry;i++){
    try{
      return await safeApiCall(url,opt);
    }catch(e){
      last=e;
    }
  }
  console.warn("RETRY FAIL:", last?.message);
  return {};
}

/* =========================
4. 로컬 캐시 저장
========================= */
function saveLocalCache(key,data){
  localStorage.setItem("CACHE_"+key, JSON.stringify({
    t:Date.now(),
    d:data
  }));
}

/* =========================
5. 로컬 캐시 조회
========================= */
function loadLocalCache(key,ttl=5000){
  try{
    const raw = localStorage.getItem("CACHE_"+key);
    if(!raw) return null;

    const parsed = JSON.parse(raw);
    if(Date.now()-parsed.t > ttl) return null;

    return parsed.d;
  }catch{
    return null;
  }
}

/* =========================
6. 검색 기록 저장
========================= */
function saveSearchHistory(q){
  if(!q) return;

  let arr = JSON.parse(localStorage.getItem("SEARCH_HISTORY")||"[]");
  arr.unshift(q);
  arr = [...new Set(arr)].slice(0,10);

  localStorage.setItem("SEARCH_HISTORY",JSON.stringify(arr));
}

/* =========================
7. 검색 추천
========================= */
function getSearchSuggest(q){
  const arr = JSON.parse(localStorage.getItem("SEARCH_HISTORY")||"[]");
  return arr.filter(v=>v.includes(q));
}

/* =========================
8. 성능 측정
========================= */
function perfStart(){
  return performance.now();
}

function perfEnd(start){
  console.log("PERF:", (performance.now()-start).toFixed(2)+"ms");
}

/* =========================
9. 스크롤 저장
========================= */
function saveScroll(){
  localStorage.setItem("SCROLL_Y", window.scrollY);
}

/* =========================
10. 스크롤 복원
========================= */
function restoreScroll(){
  const y = Number(localStorage.getItem("SCROLL_Y")||0);
  window.scrollTo(0,y);
}

/* =========================
11. 상태 로그
========================= */
function logState(){
  console.log("STATE:",{
    shops: state.shops.length,
    page: state.page,
    loading: state.isLoading,
    offline: state.offline
  });
}

/* =========================
12. 강제 초기화
========================= */
function hardReset(){
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
}

/* =========================
13. 자동 복구
========================= */
let FAIL_COUNT = 0;

function autoRecover(){
  if(FAIL_COUNT > 3){
    console.warn("AUTO RECOVER");
    FAIL_COUNT = 0;
    loadPlaces(true);
  }
}

/* =========================
🔥 기존 코드 영향 없는 이벤트만 추가
========================= */

// 검색 기록 저장
searchInput?.addEventListener("change",()=>{
  saveSearchHistory(searchInput.value);
});

// 스크롤 저장
window.addEventListener("scroll",()=>{
  saveScroll();
});

// 로드시 복원
window.addEventListener("load",()=>{
  restoreScroll();
});

// 상태 로그
setInterval(logState,10000);

// 자동 복구 트리거
setInterval(autoRecover,5000);

/* =========================
🔥 안전 실행
========================= */
function safeExec(fn){
  try{ fn(); }
  catch(e){ console.error("SAFE EXEC:", e.message); }
}