/* =====================================================
🔥 NOMA FINAL CLIENT CORE
👉 안정화 완료 / 충돌 제거 / 실서비스 가능
===================================================== */

/* =========================
🔥 CONFIG
========================= */
const API_BASE_URL = "";

/* =========================
🔥 STATE
========================= */
const state = {
  token: localStorage.getItem("token") || "",
  shops: [],
  page: 1,
  loading: false,
  hasMore: true,
  favorites: new Set(
    JSON.parse(localStorage.getItem("favorites") || "[]")
  ),
  selectedId: localStorage.getItem("selectedShop") || null,
  filters: {
    keyword: "",
    tag: "",
    sort: "default"
  },
  ui: {
    offline: !navigator.onLine,
    lastSyncAt: 0
  },
  metrics: {
    apiFail: 0,
    renderCount: 0,
    loadCount: 0
  }
};

/* =========================
🔥 GLOBAL LOCK
========================= */
let LOAD_LOCK = false;
let FAVORITE_LOCK = new Set();
let RESERVE_LOCK = false;
let SCROLL_LOCK = false;

/* =========================
🔥 SAFE HELPERS
========================= */
function safeArr(v){
  return Array.isArray(v) ? v : [];
}

function safeNum(v,d=0){
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeJson(v,d){
  try{
    const parsed = JSON.parse(v);
    return parsed ?? d;
  }catch{
    return d;
  }
}

function saveStorage(key,value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
  }catch(e){
    console.warn("STORAGE ERROR", e);
  }
}

function getStorage(key,d){
  try{
    return safeJson(localStorage.getItem(key), d);
  }catch{
    return d;
  }
}

/* =========================
🔥 API
========================= */
async function api(path,opt={}){
  try{
    const res = await fetch(API_BASE_URL + path,{
      ...opt,
      headers:{
        "Content-Type":"application/json",
        ...(state.token
          ? { Authorization:`Bearer ${state.token}` }
          : {})
      }
    });

    const data = await res.json().catch(()=>({}));

    if(!res.ok){
      state.metrics.apiFail++;
    }

    return data;

  }catch(e){
    state.metrics.apiFail++;
    console.error("API ERROR:", e);
    return { ok:false };
  }
}

/* =========================
🔥 CACHE
========================= */
function saveCache(){
  saveStorage("NOMA_CACHE", {
    shops: state.shops.slice(0,200),
    savedAt: Date.now()
  });
}

function loadCache(){
  const cache = getStorage("NOMA_CACHE", null);

  if(!cache) return [];

  if(Date.now() - safeNum(cache.savedAt) > 1000 * 60 * 30){
    return [];
  }

  return safeArr(cache.shops);
}

/* =========================
🔥 FILTER
========================= */
function applyFilters(items){
  let list = safeArr(items);

  if(state.filters.keyword){
    const q = String(state.filters.keyword).toLowerCase();

    list = list.filter(v=>{
      return (
        String(v.name || "").toLowerCase().includes(q) ||
        String(v.region || "").toLowerCase().includes(q)
      );
    });
  }

  if(state.filters.tag){
    list = list.filter(v=>{
      return safeArr(v.tags).includes(state.filters.tag);
    });
  }

  switch(state.filters.sort){
    case "rating":
      list.sort((a,b)=>
        safeNum(b.ratingAvg) - safeNum(a.ratingAvg)
      );
      break;

    case "price":
      list.sort((a,b)=>
        safeNum(a.price) - safeNum(b.price)
      );
      break;

    case "like":
      list.sort((a,b)=>
        safeNum(b.likeCount) - safeNum(a.likeCount)
      );
      break;

    default:
      break;
  }

  return list;
}

/* =========================
🔥 LOAD SHOPS
========================= */
async function loadShops(reset=false){
  if(LOAD_LOCK) return;

  LOAD_LOCK = true;
  state.loading = true;

  try{
    if(reset){
      state.page = 1;
      state.shops = [];
      state.hasMore = true;
    }

    if(!state.hasMore){
      return;
    }

    const data = await api(`/api/shops?page=${state.page}`);

    const items = safeArr(data.items);

    if(items.length === 0){
      state.hasMore = false;
      return;
    }

    const merged = new Map();

    [...state.shops, ...items].forEach(v=>{
      if(v && v._id){
        merged.set(v._id,{
          ...v,
          ratingAvg: safeNum(v.ratingAvg),
          likeCount: safeNum(v.likeCount),
          price: safeNum(v.price),
          reviewCount: safeNum(v.reviewCount),
          tags: safeArr(v.tags)
        });
      }
    });

    state.shops = [...merged.values()];
    state.page += 1;
    state.metrics.loadCount += 1;
    state.ui.lastSyncAt = Date.now();

    renderShops(state.shops);
    saveCache();

  }catch(e){
    console.error("LOAD ERROR:", e);

    if(state.shops.length === 0){
      const cache = loadCache();

      if(cache.length){
        state.shops = cache;
        renderShops(state.shops);
      }
    }

  }finally{
    state.loading = false;

    setTimeout(()=>{
      LOAD_LOCK = false;
    },300);
  }
}

/* =========================
🔥 RENDER
========================= */
function renderShops(items){
  try{
    state.metrics.renderCount += 1;

    const el = document.getElementById("restaurantList");

    if(!el) return;

    let list = applyFilters(items);

    if(list.length > 200){
      list = list.slice(0,200);
    }

    el.innerHTML = "";

    if(list.length === 0){
      el.innerHTML = `
        <div class="empty">
          등록된 매장이 없습니다.
        </div>
      `;
      return;
    }

    list.forEach(shop=>{
      if(!shop || !shop._id) return;

      const card = document.createElement("div");

      card.className = "card";

      card.style.background =
        state.selectedId === shop._id
          ? "#1f1f1f"
          : "#111";

      card.style.border =
        state.selectedId === shop._id
          ? "1px solid #d4af37"
          : "1px solid #333";

      card.style.color = "#fff";
      card.style.padding = "16px";
      card.style.marginBottom = "12px";
      card.style.borderRadius = "12px";
      card.style.transition = "all 0.2s ease";

      card.innerHTML = `
        <div style="font-size:18px;font-weight:700;color:#d4af37;">
          ${shop.name || ""}
        </div>

        <div style="margin-top:6px;">
          ⭐ ${safeNum(shop.ratingAvg).toFixed(1)}
        </div>

        <div style="margin-top:6px;">
          ❤️ ${safeNum(shop.likeCount)}
        </div>

        <div style="margin-top:12px;display:flex;gap:8px;">
          <button
            class="favorite-btn"
            data-id="${shop._id}"
            style="
              background:#000;
              color:#d4af37;
              border:1px solid #d4af37;
              padding:8px 12px;
              border-radius:8px;
              cursor:pointer;
            "
          >
            ${state.favorites.has(shop._id) ? "★ 즐겨찾기" : "☆ 즐겨찾기"}
          </button>

          <button
            class="reserve-btn"
            data-id="${shop._id}"
            style="
              background:#d4af37;
              color:#000;
              border:none;
              padding:8px 12px;
              border-radius:8px;
              cursor:pointer;
              font-weight:700;
            "
          >
            예약
          </button>
        </div>
      `;

      card.addEventListener("click",(e)=>{
        if(e.target.closest("button")) return;

        state.selectedId = shop._id;

        localStorage.setItem(
          "selectedShop",
          shop._id
        );

        saveRecent(shop);
        renderShops(state.shops);
      });

      const favBtn = card.querySelector(".favorite-btn");

      if(favBtn){
        favBtn.addEventListener("click",(e)=>{
          e.stopPropagation();
          toggleFavorite(shop._id);
        });
      }

      const reserveBtn = card.querySelector(".reserve-btn");

      if(reserveBtn){
        reserveBtn.addEventListener("click",(e)=>{
          e.stopPropagation();
          reserveShop(shop._id);
        });
      }

      el.appendChild(card);
    });

    syncUi();

  }catch(e){
    console.error("RENDER ERROR:", e);
  }
}

/* =========================
🔥 FAVORITE
========================= */
async function toggleFavorite(id){
  if(!id) return;

  if(FAVORITE_LOCK.has(id)){
    return;
  }

  FAVORITE_LOCK.add(id);

  try{
    if(state.favorites.has(id)){
      state.favorites.delete(id);
    }else{
      state.favorites.add(id);
    }

    localStorage.setItem(
      "favorites",
      JSON.stringify([...state.favorites])
    );

    renderShops(state.shops);

    await api(`/api/favorites/${id}`,{
      method:"POST"
    });

  }catch(e){
    console.error("FAVORITE ERROR:", e);

  }finally{
    setTimeout(()=>{
      FAVORITE_LOCK.delete(id);
    },300);
  }
}

/* =========================
🔥 RESERVE
========================= */
async function reserveShop(id){
  if(!id) return;

  if(RESERVE_LOCK){
    return;
  }

  RESERVE_LOCK = true;

  try{
    if(!state.token){
      alert("로그인 필요");
      return;
    }

    const result = await api("/api/reservations",{
      method:"POST",
      body: JSON.stringify({
        shopId:id
      })
    });

    if(result && result.ok === false){
      alert("예약 실패");
      return;
    }

    alert("예약 완료");

  }catch(e){
    console.error("RESERVE ERROR:", e);
    alert("예약 실패");

  }finally{
    setTimeout(()=>{
      RESERVE_LOCK = false;
    },1000);
  }
}

/* =========================
🔥 RECENT
========================= */
function saveRecent(shop){
  if(!shop || !shop._id) return;

  let recent = getStorage("NOMA_RECENT", []);

  recent = [
    shop,
    ...recent.filter(v=>v && v._id !== shop._id)
  ].slice(0,20);

  saveStorage("NOMA_RECENT", recent);
}

/* =========================
🔥 UI SYNC
========================= */
function syncUi(){
  const resultCount =
    document.getElementById("resultCount");

  if(resultCount){
    resultCount.innerText =
      `${state.shops.length}개`;
  }

  const networkStatus =
    document.getElementById("networkStatus");

  if(networkStatus){
    networkStatus.innerText =
      navigator.onLine
        ? "🟢 ONLINE"
        : "🔴 OFFLINE";
  }

  const favoriteCount =
    document.getElementById("favoriteCount");

  if(favoriteCount){
    favoriteCount.innerText =
      String(state.favorites.size);
  }

  const loading =
    document.getElementById("loading");

  if(loading){
    loading.style.display =
      state.loading
        ? "block"
        : "none";
  }
}

/* =========================
🔥 SEARCH
========================= */
const searchInput =
  document.getElementById("search");

if(searchInput){
  searchInput.addEventListener("input",(e)=>{
    state.filters.keyword =
      String(e.target.value || "");

    renderShops(state.shops);
  });
}

/* =========================
🔥 SORT
========================= */
const sortSelect =
  document.getElementById("sortSelect");

if(sortSelect){
  sortSelect.addEventListener("change",(e)=>{
    state.filters.sort =
      String(e.target.value || "default");

    renderShops(state.shops);
  });
}

/* =========================
🔥 TAG
========================= */
const tagSelect =
  document.getElementById("tagSelect");

if(tagSelect){
  tagSelect.addEventListener("change",(e)=>{
    state.filters.tag =
      String(e.target.value || "");

    renderShops(state.shops);
  });
}

/* =========================
🔥 SCROLL
========================= */
window.addEventListener("scroll",()=>{
  if(SCROLL_LOCK) return;

  SCROLL_LOCK = true;

  requestAnimationFrame(()=>{
    if(
      window.innerHeight +
      window.scrollY >=
      document.body.offsetHeight - 150
    ){
      loadShops(false);
    }

    try{
      localStorage.setItem(
        "scrollY",
        String(window.scrollY || 0)
      );
    }catch(e){}

    SCROLL_LOCK = false;
  });
});

/* =========================
🔥 RESTORE SCROLL
========================= */
window.addEventListener("load",()=>{
  const y = Number(
    localStorage.getItem("scrollY") || 0
  );

  if(y > 0){
    setTimeout(()=>{
      window.scrollTo(0,y);
    },100);
  }
});

/* =========================
🔥 NETWORK
========================= */
window.addEventListener("offline",()=>{
  state.ui.offline = true;

  const cache = loadCache();

  if(cache.length){
    state.shops = cache;
    renderShops(state.shops);
  }

  syncUi();
});

window.addEventListener("online",()=>{
  state.ui.offline = false;
  loadShops(true);
  syncUi();
});

/* =========================
🔥 STORAGE SYNC
========================= */
window.addEventListener("storage",(e)=>{
  if(e.key === "favorites"){
    state.favorites = new Set(
      safeArr(
        safeJson(e.newValue, [])
      )
    );

    renderShops(state.shops);
  }
});

/* =========================
🔥 AUTO REFRESH
========================= */
setInterval(()=>{
  if(
    !document.hidden &&
    navigator.onLine
  ){
    loadShops(false);
  }
},120000);

/* =========================
🔥 CLEANUP
========================= */
setInterval(()=>{
  state.shops = safeArr(state.shops)
    .filter(v=>v && v._id)
    .slice(0,300);
},10000);

/* =========================
🔥 DEVTOOLS
========================= */
window.NOMA = {
  state,
  reload: ()=>loadShops(true),
  render: ()=>renderShops(state.shops)
};

/* =========================
🔥 INIT
========================= */
(function init(){
  try{
    const cache = loadCache();

    if(cache.length){
      state.shops = cache;
      renderShops(state.shops);
    }

    loadShops(true);
    syncUi();

    console.log("🔥 NOMA CLIENT READY");

  }catch(e){
    console.error("INIT ERROR:", e);
  }
})();