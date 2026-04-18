// ==============================
// 🔥 기존 코드 유지 + 수정 + 확장 (최종 완성형)
// ==============================

const params = new URLSearchParams(location.search);
const boardType = params.get("boardType") || "community";
const token = localStorage.getItem("token") || "";

/* ========================= */
/* 🔥 상태 */
/* ========================= */
let LOADING = false;
let LAST_LOAD_TIME = 0;
let CACHE = [];
let SEARCH_TIMER = null;

/* 🔥 추가 위치 1 */
let PAGE = 1;
let HAS_MORE = true;
let SCROLL_LOCK = false;

/* 🔥 추가 위치 2 */
let ERROR_COUNT = 0;
let LAST_KEYWORD = "";
let VIEW_MODE = "list";
let LAST_FETCH_TIME = 0;
let RETRY_COUNT = 0;

/* ========================= */
const boardNameMap = {
  "shop-recommend": "샵추천",
  "region-recommend": "지역별 샵추천",
  "review": "방문후기",
  "info": "정보공유",
  "community": "커뮤니티",
  "notice": "공지사항"
};

const boardTitleEl = document.getElementById("boardTitle");
if (boardTitleEl) {
  boardTitleEl.textContent = boardNameMap[boardType] || "게시판";
}

/* ========================= */
const countEl = document.getElementById("postCount");
const socket = window.io ? io() : null;

/* ========================= */
/* 🔥 escape */
/* ========================= */
function escapeHtml(str){
  return String(str || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

/* ========================= */
/* 🔥 API */
/* ========================= */
async function api(path, options = {}) {
  try{
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(()=>({}));

    if(!res.ok){
      ERROR_COUNT++;
      throw new Error(data.message || "요청 실패");
    }

    RETRY_COUNT = 0;
    return data;

  }catch(e){
    console.error(e);
    ERROR_COUNT++;

    /* 🔥 추가: 재시도 */
    if(RETRY_COUNT < 2){
      RETRY_COUNT++;
      return api(path, options);
    }

    return {};
  }
}

/* ========================= */
/* 🔥 검색 debounce */
/* ========================= */
const searchEl = document.getElementById("search");

if (searchEl) {
  searchEl.addEventListener("input", () => {
    clearTimeout(SEARCH_TIMER);
    SEARCH_TIMER = setTimeout(()=>{
      PAGE = 1;
      saveSearch(searchEl.value);
      loadPosts(true);
    }, 400);
  });
}

const sortEl = document.getElementById("sort");

/* ========================= */
/* 🔥 LOAD */
/* ========================= */
async function loadPosts(reset=false) {

  const now = Date.now();
  if (now - LAST_LOAD_TIME < 300) return;
  LAST_LOAD_TIME = now;

  if (LOADING) return;
  LOADING = true;

  const wrap = document.getElementById("postList");
  if (!wrap){
    LOADING = false;
    return;
  }

  if(reset){
    PAGE = 1;
    CACHE = [];
    HAS_MORE = true;
  }

  if(!HAS_MORE){
    LOADING = false;
    return;
  }

  if(reset){
    wrap.innerHTML = "<div>불러오는 중...</div>";
  }

  try {

    let url = `/api/posts?boardType=${encodeURIComponent(boardType)}&page=${PAGE}`;

    if (searchEl?.value.trim()) {
      LAST_KEYWORD = searchEl.value.trim();
      url += `&q=${encodeURIComponent(LAST_KEYWORD)}`;
    }

    if (sortEl?.value) {
      url += `&sort=${sortEl.value}`;
    }

    const data = await api(url);

    const newItems = data.items || [];

    if(newItems.length === 0){
      HAS_MORE = false;
    }

    CACHE = reset ? newItems : [...CACHE, ...newItems];

    if(reset) wrap.innerHTML = "";

    if (!CACHE.length) {
      wrap.innerHTML = "<div>게시글 없음</div>";
      return;
    }

    if (countEl) countEl.textContent = `총 ${CACHE.length}개`;

    /* 🔥 추가: 댓글 병렬 처리 */
    const commentMap = {};
    await Promise.all(
      CACHE.map(async (p)=>{
        try{
          commentMap[p._id] = await api(`/api/comments?postId=${p._id}`);
        }catch{
          commentMap[p._id] = {items:[]};
        }
      })
    );

    wrap.innerHTML = "";

    for (const post of CACHE) {

      const comments = commentMap[post._id] || {items:[]};

      const div = document.createElement("div");
      div.className = "board-item";

      if((post.likeCount||0) > 20){
        div.style.border="1px solid gold";
      }

      div.innerHTML = `
        <div class="board-title">${escapeHtml(post.title)}</div>

        <div class="board-sub">
          ${escapeHtml(post.nickname || post.userId)}
          · ${new Date(post.createdAt).toLocaleString()}
          · 👍 ${post.likeCount || 0}
          · 💬 ${(comments.items || []).length}
        </div>

        <div style="margin-top:10px;white-space:pre-wrap;">
          ${escapeHtml(post.content)}
        </div>

        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="likeBtn">좋아요</button>
          <button class="deleteBtn">삭제</button>
        </div>

        <div style="margin-top:12px;">
          <input class="commentInput" placeholder="댓글 입력" />
          <button class="commentBtn">댓글 등록</button>
        </div>

        <div class="commentList" style="margin-top:12px;">
          ${(comments.items || []).map((c) => `
            <div style="padding:8px 0;border-top:1px solid #222;">
              ${escapeHtml(c.nickname || c.userId)}: ${escapeHtml(c.content)}
            </div>
          `).join("")}
        </div>
      `;

      /* 좋아요 */
      div.querySelector(".likeBtn").onclick = async (e) => {
        if (!token) return alert("로그인 필요");

        const btn = e.target;
        btn.disabled = true;

        await api(`/api/posts/${post._id}/like`, { method: "POST" });

        loadPosts(true);
      };

      /* 삭제 */
      div.querySelector(".deleteBtn").onclick = async () => {
        if (!confirm("삭제할까?")) return;

        await api(`/api/posts/${post._id}`, { method: "DELETE" });
        loadPosts(true);
      };

      /* 댓글 */
      div.querySelector(".commentBtn").onclick = async () => {
        if (!token) return alert("로그인 필요");

        const input = div.querySelector(".commentInput");
        const content = input.value.trim();

        if (!content) return;

        await api("/api/comments", {
          method: "POST",
          body: JSON.stringify({ postId: post._id, content })
        });

        input.value = "";
        loadPosts(true);
      };

      wrap.appendChild(div);
    }

  } catch (e) {
    wrap.innerHTML = "<div>오류 발생</div>";
  } finally {
    LOADING = false;
  }
}

/* ========================= */
/* 🔥 WRITE */
/* ========================= */
document.getElementById("writeBtn").onclick = async () => {
  if (!token) return alert("로그인 필요");

  const title = document.getElementById("postTitle").value.trim();
  const content = document.getElementById("postContent").value.trim();

  if (!title || !content) return alert("제목/내용 입력");

  await api("/api/posts", {
    method: "POST",
    body: JSON.stringify({ boardType, title, content })
  });

  document.getElementById("postTitle").value = "";
  document.getElementById("postContent").value = "";

  loadPosts(true);
};

/* ========================= */
/* 🔥 추가 기능 10개 */
/* ========================= */

// 1 무한스크롤
window.addEventListener("scroll",()=>{
  if(SCROLL_LOCK || !HAS_MORE) return;

  if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 100){
    SCROLL_LOCK = true;
    PAGE++;
    loadPosts().then(()=>SCROLL_LOCK=false);
  }
});

// 2 ESC 닫기
document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape"){
    document.querySelector(".modal")?.remove();
  }
});

// 3 자동 새로고침
setInterval(()=>{
  if(!document.hidden) loadPosts(true);
},30000);

// 4 최근 검색 저장
function saveSearch(q){
  let arr = JSON.parse(localStorage.getItem("boardSearch")||"[]");
  arr.unshift(q);
  arr = [...new Set(arr)].slice(0,10);
  localStorage.setItem("boardSearch",JSON.stringify(arr));
}

// 5 클릭 효과
document.addEventListener("click",(e)=>{
  const btn = e.target.closest("button");
  if(btn){
    btn.style.transform="scale(0.95)";
    setTimeout(()=>btn.style.transform="",100);
  }
});

// 6 상태 로그
function debugBoard(){
  console.log("BOARD STATE:", {PAGE, CACHE, HAS_MORE, ERROR_COUNT});
}

// 7 네트워크 감지
window.addEventListener("offline",()=>alert("오프라인"));
window.addEventListener("online",()=>loadPosts(true));

// 8 캐시 리셋
function resetBoard(){
  CACHE = [];
  PAGE = 1;
  HAS_MORE = true;
  loadPosts(true);
}

// 9 인기 정렬
function sortPopular(){
  CACHE.sort((a,b)=> (b.likeCount||0)-(a.likeCount||0));
  loadPosts(true);
}

// 🔟 마지막 검색 복구
function restoreSearch(){
  if(searchEl && LAST_KEYWORD){
    searchEl.value = LAST_KEYWORD;
  }
}

/* ========================= */
/* 🔥 socket */
/* ========================= */
if (socket) {
  socket.on("post:new", ()=>loadPosts(true));
  socket.on("post:like", ()=>loadPosts(true));
  socket.on("comment:add", ()=>loadPosts(true));
}

/* ========================= */
/* INIT */
/* ========================= */
restoreSearch();
loadPosts(true);