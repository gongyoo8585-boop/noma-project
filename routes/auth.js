<script>

/* ===================================================== */
/* 🔥 FINAL COMPLETE VERSION (ULTRA FINAL PRO MAX++) */
/* ===================================================== */

const API_BASE_URL = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/,"");

let socket = window.io ? io() : null;
let token = localStorage.getItem("token") || "";

/* ========================= */
function safeEl(el){ return el || document.createElement("div"); }
function toNum(v,d=0){ const n=Number(v); return Number.isFinite(n)?n:d; }

/* DOM */
const list = safeEl(document.getElementById("list"));
const loading = document.getElementById("loading");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sortSelect");

/* ========================= */
let currentSort = sortSelect?.value || "like";

sortSelect?.addEventListener("change",()=>{
  currentSort = sortSelect.value;
  clearCache();
  loadPlaces(true);
});

/* ========================= */
let map = null;
if(window.L && document.getElementById("map")){
  map = L.map("map").setView([35.2283,128.8892], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
}

let markers = [];
let selectedId = localStorage.getItem("selectedShop") || null;
let currentItems = [];

let CACHE = {};
let CACHE_TIME = {};
let LAST_LOAD = 0;
let ABORT = null;
let isLoading=false;
let LAST_CLICK = 0;

let FAVORITES = new Set(JSON.parse(localStorage.getItem("favorites")||"[]"));
let OFFLINE = !navigator.onLine;

/* =========================
   🔥 API
========================= */
async function api(url, opt={}, retry=2) {
  try{
    if(ABORT) ABORT.abort();
    ABORT = new AbortController();
    opt.signal = ABORT.signal;

    if(token){
      opt.headers = {
        ...(opt.headers||{}),
        Authorization:"Bearer "+token
      };
    }

    const timer = setTimeout(()=>ABORT.abort(),5000);

    const r = await fetch(API_BASE_URL + url,opt);
    clearTimeout(timer);

    let data = {};
    try{ data = await r.json(); }catch{}

    if(!r.ok) throw new Error(data.message||"API 오류");

    return data;

  }catch(e){

    if(retry>0 && !OFFLINE){
      return api(url,opt,retry-1);
    }

    const cached = getCache(getCacheKey());
    if(cached){
      render(cached);
      return {items:cached};
    }

    console.error(e);
    return {items:[], ok:false};
  }
}

/* ========================= */
function getPrice(p){
  return toNum(p?.priceDiscount,0);
}

/* ========================= */
function applySort(items){
  const copy = [...(items||[])];

  switch(currentSort){
    case "distance": return copy.sort((a,b)=>toNum(a.distanceKm,999)-toNum(b.distanceKm,999));
    case "rating": return copy.sort((a,b)=>toNum(b.ratingAvg)-toNum(a.ratingAvg));
    case "view": return copy.sort((a,b)=>toNum(b.viewCount)-toNum(a.viewCount));
    case "price": return copy.sort((a,b)=>getPrice(a)-getPrice(b));
    default: return copy.sort((a,b)=>toNum(b.likeCount)-toNum(a.likeCount));
  }
}

/* ========================= */
let debounceTimer;
searchInput?.addEventListener("input",()=>{
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>loadPlaces(true),300);
});

/* ========================= */
async function like(id){
  if(!token) return alert("로그인 필요");

  if(Date.now()-LAST_CLICK < 500) return;
  LAST_CLICK = Date.now();

  const before = new Set(FAVORITES);

  if(FAVORITES.has(id)) FAVORITES.delete(id);
  else FAVORITES.add(id);

  localStorage.setItem("favorites",JSON.stringify([...FAVORITES]));
  render(currentItems);

  const res = await api(`/api/favorites/${id}`,{method:"POST"});

  /* 실패 rollback */
  if(res.ok === false){
    FAVORITES = before;
    render(currentItems);
  }
}

/* ========================= */
async function reserve(id){
  if(!token) return alert("로그인 필요");

  const time = prompt("예약시간");
  if(!time) return;

  const date = new Date(time);
  if(isNaN(date)) return alert("시간 오류");

  await api("/api/reservations",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({shopId:id,reserveAt:date})
  });

  alert("예약 완료");
}

/* ========================= */
function showError(msg){
  list.innerHTML = `<div style="color:red">${msg}</div>`;
}

function showLoading(on){
  if(!loading) return;
  loading.style.display = on ? "block" : "none";
}

function formatKm(km){
  km=toNum(km,0);
  return km<1?`${Math.round(km*1000)}m`:`${km.toFixed(2)}km`;
}

function setStatus(msg){
  const el = document.getElementById("statusText");
  if(el) el.innerText = msg;
}

/* ========================= */
function getCacheKey(){
  return (searchInput?.value || "all") + "_" + currentSort;
}

function setCache(key,data){
  CACHE[key]=data;
  CACHE_TIME[key]=Date.now();
}

function getCache(key){
  if(!CACHE[key]) return null;
  if(Date.now()-CACHE_TIME[key] > 5000) return null;
  return CACHE[key];
}

function clearCache(){
  CACHE = {};
  CACHE_TIME = {};
}

/* ========================= */
function clearMarkers(){
  markers.forEach(m=>{ try{ map?.removeLayer(m);}catch{} });
  markers=[];
}

function addMarkers(items){
  if(!map) return;

  clearMarkers();

  items.forEach(p=>{
    if(!p.lat || !p.lng) return;

    const marker = L.marker([p.lat,p.lng]).addTo(map);

    marker.on("click",()=>{
      selectedId = p._id;
      localStorage.setItem("selectedShop",p._id);
      render(currentItems);
    });

    markers.push(marker);
  });
}

/* ========================= */
function render(items){

  items = applySort(items);
  currentItems = items;
  list.innerHTML="";

  if(!items.length){
    list.innerHTML="<div>결과 없음</div>";
    return;
  }

  items.forEach(p=>{
    const el=document.createElement("div");
    const isFav = FAVORITES.has(p._id);

    el.className="card "+(selectedId===p._id?"active":"");

    el.innerHTML=`
      <div>${p.name||""}</div>
      <div>${formatKm(p.distanceKm)}</div>
      <div>${getPrice(p).toLocaleString()}원</div>
      <div>${isFav?"★":"☆"}</div>
      <button class="like">찜</button>
      <button class="reserve">예약</button>
      <button class="detail">상세</button>
    `;

    el.onclick=()=>selectItem(p);

    el.querySelector(".like").onclick=e=>{
      e.stopPropagation();
      like(p._id);
    };

    el.querySelector(".reserve").onclick=e=>{
      e.stopPropagation();
      reserve(p._id);
    };

    el.querySelector(".detail").onclick=e=>{
      e.stopPropagation();
      openDetail(p._id);
    };

    list.appendChild(el);
  });

  addMarkers(items);
}

/* ========================= */
async function openDetail(id){

  document.getElementById("modal")?.remove();

  const d = await api(`/api/shops/${id}`);
  if(!d.shop) return;

  const modal=document.createElement("div");
  modal.id="modal";

  modal.style.cssText="position:fixed;inset:0;background:#000a;display:flex;justify-content:center;align-items:center";

  modal.innerHTML=`
    <div style="background:#111;padding:20px">
      <h2>${d.shop.name}</h2>
      <button class="close">닫기</button>
    </div>
  `;

  modal.querySelector(".close").onclick=()=>modal.remove();
  document.body.appendChild(modal);
}

/* ========================= */
async function loadPlaces(reset=false){

  if(Date.now()-LAST_LOAD < 300) return;
  LAST_LOAD = Date.now();

  if(isLoading) return;
  isLoading=true;

  if(reset) clearCache();

  showLoading(true);

  try{
    let url="/api/shops";
    const keyword = searchInput?.value;

    if(keyword){
      url += `?keyword=${encodeURIComponent(keyword)}`;
    }

    const cacheKey = getCacheKey();
    const cached = getCache(cacheKey);

    if(cached){
      render(cached);
      return;
    }

    const d = await api(url);

    if(!d.items){
      showError("데이터 실패");
      return;
    }

    setCache(cacheKey,d.items);
    render(d.items);

  }finally{
    isLoading=false;
    showLoading(false);
  }
}

/* ========================= */
async function selectItem(p){
  selectedId=p._id;
  localStorage.setItem("selectedShop",p._id);

  await api(`/api/shops/${p._id}/click`,{method:"POST"}).catch(()=>{});

  if(map && p.lat){
    map.setView([p.lat,p.lng],15);
  }
}

/* ========================= */
window.addEventListener("scroll",()=>{
  if(isLoading) return;
  if(window.innerHeight+window.scrollY >= document.body.offsetHeight-100){
    loadPlaces();
  }
});

window.addEventListener("offline",()=>{
  OFFLINE=true;
  showError("오프라인");
});

window.addEventListener("online",()=>{
  OFFLINE=false;
  loadPlaces(true);
});

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape"){
    document.getElementById("modal")?.remove();
  }
});

if(socket){
  socket.on("shop:like",loadPlaces);
  socket.on("reservation:new",loadPlaces);
}

/* ========================= */
loadPlaces();

</script>

<script id="final-add-only-v4">
<script id="ultra-final-patch">
/* =====================================================
🔥 FINAL ULTRA COMPLETE PATCH (NO MODIFY / ADD ONLY)
📍 위치: final-add-only-v4 아래
===================================================== */

/* =========================
1. Abort 안정화 (POST 제외)
========================= */
const __origApi2 = api;
api = async function(url,opt={},retry=2){
  try{
    if(opt.method === "POST"){
      return fetch(API_BASE_URL + url,{
        ...opt,
        headers:{
          ...(opt.headers||{}),
          ...(token ? {Authorization:"Bearer "+token} : {})
        }
      }).then(r=>r.json()).catch(()=>({}));
    }
    return __origApi2(url,opt,retry);
  }catch(e){
    console.warn("API SAFE FAIL",e);
    return {items:[]};
  }
};

/* =========================
2. 중복 로딩 차단 강화
========================= */
let __LOAD_LOCK=false;
const __origLoad2 = loadPlaces;
loadPlaces = async function(reset=false){
  if(__LOAD_LOCK) return;
  __LOAD_LOCK=true;

  try{
    return await __origLoad2(reset);
  }finally{
    setTimeout(()=>__LOAD_LOCK=false,200);
  }
};

/* =========================
3. render 데이터 보호
========================= */
const __origRender3 = render;
render = function(items){
  if(!Array.isArray(items)) items=[];
  items = items.filter(v=>v && v._id);
  __origRender3(items);
};

/* =========================
4. distance 안전 보정
========================= */
function safeDistance(v){
  const n = Number(v);
  return isNaN(n) ? 999 : n;
}

/* =========================
5. sort 안정화
========================= */
const __origSort = applySort;
applySort = function(items){
  try{
    return __origSort(items);
  }catch{
    return items || [];
  }
};

/* =========================
6. favorite 동기화 보호
========================= */
window.addEventListener("storage",(e)=>{
  if(e.key==="favorites"){
    try{
      FAVORITES = new Set(JSON.parse(e.newValue||"[]"));
      render(currentItems);
    }catch{}
  }
});

/* =========================
7. 클릭 debounce 강화
========================= */
let __CLICK_LOCK=0;
document.addEventListener("click",(e)=>{
  if(Date.now()-__CLICK_LOCK < 150) e.stopPropagation();
  __CLICK_LOCK = Date.now();
});

/* =========================
8. marker 클릭 안정화
========================= */
const __origAddMarkers2 = addMarkers;
addMarkers = function(items){
  __origAddMarkers2(items);

  markers.forEach(m=>{
    m.off("click");
    m.on("click",()=>{
      if(Date.now()-LAST_CLICK < 300) return;
      LAST_CLICK = Date.now();
    });
  });
};

/* =========================
9. 캐시 key 강화
========================= */
const __origKey2 = getCacheKey;
getCacheKey = function(){
  return __origKey2() + "_" + (OFFLINE ? "offline":"online");
};

/* =========================
10. 에러 UI fallback
========================= */
function safeError(msg){
  try{ showError(msg); }catch{
    console.error(msg);
  }
}

/* =========================
11. infinite scroll 보호
========================= */
let __SCROLL_LOCK=false;
window.addEventListener("scroll",()=>{
  if(__SCROLL_LOCK) return;

  if(window.innerHeight+window.scrollY >= document.body.offsetHeight-100){
    __SCROLL_LOCK=true;
    loadPlaces();
    setTimeout(()=>__SCROLL_LOCK=false,500);
  }
});

/* =========================
12. socket 이벤트 안전화
========================= */
if(socket){
  const safeReload = ()=>{
    if(Date.now()-LAST_LOAD < 1000) return;
    loadPlaces(true);
  };

  socket.off("shop:like");
  socket.off("reservation:new");

  socket.on("shop:like",safeReload);
  socket.on("reservation:new",safeReload);
}

/* =========================
13. 초기 상태 복구
========================= */
setTimeout(()=>{
  try{
    const id = localStorage.getItem("selectedShop");
    if(id) selectedId=id;

    render(currentItems);
  }catch{}
},300);

</script>
/* =====================================================
🔥 ADD ONLY EXTENSION (ULTRA FINAL +13 FEATURES)
📍 위치: 기존 코드 맨 아래
===================================================== */

/* =========================
1. 이미지 Lazy Load
========================= */
function lazyLoadImages(){
  document.querySelectorAll("img[data-src]").forEach(img=>{
    if(img.dataset.src){
      img.src = img.dataset.src;
      delete img.dataset.src;
    }
  });
}

/* =========================
2. 네트워크 상태 표시 강화
========================= */
function updateNetStatus(){
  const el = document.getElementById("statusText");
  if(!el) return;

  el.innerText = OFFLINE ? "🔴 오프라인" : "🟢 온라인";
}

/* =========================
3. 최근 본 목록 저장
========================= */
function saveRecent(p){
  let arr = JSON.parse(localStorage.getItem("recent")||"[]");
  arr.unshift(p);
  arr = arr.slice(0,10);
  localStorage.setItem("recent",JSON.stringify(arr));
}

/* =========================
4. 최근 본 불러오기
========================= */
function getRecent(){
  return JSON.parse(localStorage.getItem("recent")||"[]");
}

/* =========================
5. 성능 측정
========================= */
function perfStart(){ return performance.now(); }
function perfEnd(t){ console.log("LOAD TIME:", (performance.now()-t).toFixed(2)+"ms"); }

/* =========================
6. 자동 캐시 백업
========================= */
function backupCache(){
  try{
    localStorage.setItem("backupCache", JSON.stringify(CACHE));
  }catch{}
}

/* =========================
7. 캐시 복구
========================= */
function restoreCache(){
  try{
    const c = JSON.parse(localStorage.getItem("backupCache")||"{}");
    if(c) CACHE = c;
  }catch{}
}

/* =========================
8. 클릭 하이라이트 효과
========================= */
function highlightCard(el){
  if(!el) return;
  el.style.outline="2px solid #0ff";
  setTimeout(()=>el.style.outline="",500);
}

/* =========================
9. 스크롤 위치 저장
========================= */
function saveScroll(){
  localStorage.setItem("scrollY", window.scrollY);
}

/* =========================
10. 스크롤 복원
========================= */
function restoreScroll(){
  const y = Number(localStorage.getItem("scrollY")||0);
  window.scrollTo(0,y);
}

/* =========================
11. 키보드 단축키
========================= */
document.addEventListener("keydown",(e)=>{
  if(e.ctrlKey && e.key==="f"){
    e.preventDefault();
    searchInput?.focus();
  }
});

/* =========================
12. 자동 정렬 유지
========================= */
setInterval(()=>{
  if(currentItems.length){
    render(currentItems);
  }
},10000);

/* =========================
13. 디버그 로그
========================= */
function debugState(){
  console.log("STATE:",{
    items:currentItems.length,
    cache:Object.keys(CACHE).length,
    offline:OFFLINE,
    selected:selectedId
  });
}

/* =========================
🔥 기존 코드와 연결 (추가 이벤트만)
========================= */

// 최근 본 저장 연결
document.addEventListener("click",(e)=>{
  const card = e.target.closest(".card");
  if(card){
    const idx = [...list.children].indexOf(card);
    const item = currentItems[idx];
    if(item) saveRecent(item);
    highlightCard(card);
  }
});

// lazy load
window.addEventListener("scroll",lazyLoadImages);

// 스크롤 저장
window.addEventListener("scroll",saveScroll);

// 복원
window.addEventListener("load",()=>{
  restoreScroll();
  restoreCache();
  updateNetStatus();
});

// 캐시 백업
setInterval(backupCache,5000);

// 상태 로그
setInterval(debugState,10000);

// 네트워크 상태
window.addEventListener("online",updateNetStatus);
window.addEventListener("offline",updateNetStatus);

</script>