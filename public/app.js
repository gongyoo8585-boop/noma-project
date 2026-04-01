const CFG = window.APP_CONFIG || {};
const API_BASE_URL = (CFG.API_BASE_URL || "").replace(/\/$/, "");
const KAKAO_JS_KEY = CFG.KAKAO_JS_KEY || "";

const restaurantListEl = document.getElementById("restaurantList");
const favoriteListEl = document.getElementById("favoriteList");
const keywordInputEl = document.getElementById("keywordInput");
const searchBtnEl = document.getElementById("searchBtn");
const reloadBtnEl = document.getElementById("reloadBtn");
const resultCountChipEl = document.getElementById("resultCountChip");
const statusTextEl = document.getElementById("statusText");

const guestBoxEl = document.getElementById("guestBox");
const userBoxEl = document.getElementById("userBox");
const userGreetingEl = document.getElementById("userGreeting");
const logoutBtnEl = document.getElementById("logoutBtn");

const authModalEl = document.getElementById("authModal");
const openLoginBtnEl = document.getElementById("openLoginBtn");
const openRegisterBtnEl = document.getElementById("openRegisterBtn");
const closeAuthModalBtnEl = document.getElementById("closeAuthModalBtn");
const loginTabBtnEl = document.getElementById("loginTabBtn");
const registerTabBtnEl = document.getElementById("registerTabBtn");
const loginFormEl = document.getElementById("loginForm");
const registerFormEl = document.getElementById("registerForm");
const loginAccountEl = document.getElementById("loginAccount");
const loginPasswordEl = document.getElementById("loginPassword");
const registerUsernameEl = document.getElementById("registerUsername");
const registerEmailEl = document.getElementById("registerEmail");
const registerPasswordEl = document.getElementById("registerPassword");

const detailModalEl = document.getElementById("detailModal");
const closeDetailModalBtnEl = document.getElementById("closeDetailModalBtn");
const detailContentEl = document.getElementById("detailContent");

const state = {
  token: localStorage.getItem("token") || "",
  user: null,
  map: null,
  placesService: null,
  currentPos: { lat: 35.2283, lng: 128.8892 },
  currentMarker: null,
  markers: [],
  places: [],
  favorites: new Map(),
  detailPlace: null
};

function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "요청 실패");
    }
    return data;
  });
}

function openAuthModal(tab = "login") {
  authModalEl.classList.remove("hidden");
  setAuthTab(tab);
}

function closeAuthModal() {
  authModalEl.classList.add("hidden");
}

function setAuthTab(tab) {
  const isLogin = tab === "login";
  loginTabBtnEl.classList.toggle("active", isLogin);
  registerTabBtnEl.classList.toggle("active", !isLogin);
  loginFormEl.classList.toggle("hidden", !isLogin);
  registerFormEl.classList.toggle("hidden", isLogin);
}

function openDetailModal(place) {
  state.detailPlace = place;
  renderDetail(place);
  detailModalEl.classList.remove("hidden");
}

function closeDetailModal() {
  detailModalEl.classList.add("hidden");
}

function updateAuthUI() {
  const loggedIn = Boolean(state.user);

  guestBoxEl.classList.toggle("hidden", loggedIn);
  userBoxEl.classList.toggle("hidden", !loggedIn);

  if (loggedIn) {
    userGreetingEl.textContent = `${state.user.username}님`;
  }
}

async function bootstrapUser() {
  if (!state.token) {
    updateAuthUI();
    renderFavorites([]);
    return;
  }

  try {
    const data = await api("/api/auth/me");
    state.user = data.user;
    updateAuthUI();
    await loadFavorites();
  } catch {
    state.token = "";
    state.user = null;
    localStorage.removeItem("token");
    updateAuthUI();
    renderFavorites([]);
  }
}

async function registerUser(e) {
  e.preventDefault();

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: registerUsernameEl.value.trim(),
        email: registerEmailEl.value.trim(),
        password: registerPasswordEl.value
      })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("token", data.token);

    registerFormEl.reset();
    updateAuthUI();
    closeAuthModal();
    await loadFavorites();
    renderPlaces(state.places);
    alert("회원가입 완료");
  } catch (err) {
    alert(err.message);
  }
}

async function loginUser(e) {
  e.preventDefault();

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        account: loginAccountEl.value.trim(),
        password: loginPasswordEl.value
      })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("token", data.token);

    loginFormEl.reset();
    updateAuthUI();
    closeAuthModal();
    await loadFavorites();
    renderPlaces(state.places);
    alert("로그인 성공");
  } catch (err) {
    alert(err.message);
  }
}

function logoutUser() {
  state.token = "";
  state.user = null;
  state.favorites = new Map();
  localStorage.removeItem("token");
  updateAuthUI();
  renderFavorites([]);
  renderPlaces(state.places);
}

async function loadFavorites() {
  if (!state.token) {
    state.favorites = new Map();
    renderFavorites([]);
    return;
  }

  try {
    const items = await api("/api/favorites");
    const map = new Map();

    items.forEach((item) => {
      map.set(item.placeId, item);
    });

    state.favorites = map;
    renderFavorites(items);
    renderPlaces(state.places);
  } catch (err) {
    alert(err.message);
  }
}

async function saveFavorite(place) {
  if (!state.token) {
    openAuthModal("login");
    return;
  }

  try {
    await api("/api/favorites", {
      method: "POST",
      body: JSON.stringify({
        placeId: place.placeId,
        placeName: place.placeName,
        addressName: place.addressName,
        roadAddressName: place.roadAddressName,
        phone: place.phone,
        placeUrl: place.placeUrl,
        categoryName: place.categoryName,
        x: place.x,
        y: place.y,
        distance: place.distance
      })
    });

    await loadFavorites();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteFavorite(placeId) {
  if (!state.token) {
    return;
  }

  try {
    await api(`/api/favorites/${placeId}`, { method: "DELETE" });
    await loadFavorites();
  } catch (err) {
    alert(err.message);
  }
}

function renderFavorites(items) {
  favoriteListEl.innerHTML = "";

  if (!items.length) {
    favoriteListEl.innerHTML = `<div class="empty-box">저장한 맛집이 없습니다.</div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "place-card";

    card.innerHTML = `
      <div class="place-title">⭐ ${escapeHtml(item.placeName)}</div>
      <div class="meta">
        <div class="meta-line"><span class="meta-icon">📍</span><span>${escapeHtml(item.roadAddressName || item.addressName || "주소 없음")}</span></div>
        <div class="meta-line"><span class="meta-icon">📞</span><span>${escapeHtml(item.phone || "전화번호 없음")}</span></div>
        <div class="meta-line"><span class="meta-icon">📏</span><span>${formatDistance(item.distance)}</span></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-dark js-move">지도이동</button>
        <button class="btn btn-dark js-detail">상세보기</button>
        <button class="btn btn-danger js-delete">삭제</button>
      </div>
    `;

    card.querySelector(".js-move").onclick = () => moveMap(item.y, item.x);
    card.querySelector(".js-detail").onclick = () =>
      openDetailModal({
        placeId: item.placeId,
        placeName: item.placeName,
        addressName: item.addressName,
        roadAddressName: item.roadAddressName,
        phone: item.phone,
        placeUrl: item.placeUrl,
        categoryName: item.categoryName,
        x: item.x,
        y: item.y,
        distance: item.distance
      });
    card.querySelector(".js-delete").onclick = () => deleteFavorite(item.placeId);

    favoriteListEl.appendChild(card);
  });
}

function renderPlaces(items) {
  restaurantListEl.innerHTML = "";
  resultCountChipEl.textContent = `주변 맛집 ${items.length}개`;

  if (!items.length) {
    restaurantListEl.innerHTML = `<div class="empty-box">검색 결과가 없습니다.</div>`;
    return;
  }

  items.forEach((place) => {
    const saved = state.favorites.has(place.placeId);

    const card = document.createElement("div");
    card.className = "place-card";

    card.innerHTML = `
      <div class="place-title">🍽️ ${escapeHtml(place.placeName)}</div>
      <div class="meta">
        <div class="meta-line"><span class="meta-icon">📏</span><span>${formatDistance(place.distance)}</span></div>
        <div class="meta-line"><span class="meta-icon">📍</span><span>${escapeHtml(place.roadAddressName || place.addressName || "주소 없음")}</span></div>
        <div class="meta-line"><span class="meta-icon">📞</span><span>${escapeHtml(place.phone || "전화번호 없음")}</span></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-dark js-move">지도이동</button>
        <button class="btn btn-dark js-detail">상세보기</button>
        <button class="btn ${saved ? "btn-dark" : "btn-primary"} js-save">${saved ? "저장됨" : "저장"}</button>
      </div>
    `;

    card.querySelector(".js-move").onclick = () => moveMap(place.y, place.x);
    card.querySelector(".js-detail").onclick = () => openDetailModal(place);
    card.querySelector(".js-save").onclick = () => {
      if (saved) {
        deleteFavorite(place.placeId);
      } else {
        saveFavorite(place);
      }
    };

    restaurantListEl.appendChild(card);
  });
}

function renderDetail(place) {
  const saved = state.favorites.has(place.placeId);

  detailContentE