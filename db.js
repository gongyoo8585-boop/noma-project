const mongoose = require("mongoose");

/* ========================= */
/* 🔥 기존 유지 */
/* ========================= */
const connectDB = async () => {
  try {

    /* ========================= */
    /* 🔥 추가 위치 1: URI 선택 (DEV/PROD) */
    /* ========================= */
    const MONGO_URI =
      process.env.NODE_ENV === "production"
        ? process.env.MONGO_URI
        : process.env.MONGO_URI_DEV || process.env.MONGO_URI;

    if (!MONGO_URI) {
      throw new Error("MONGO_URI 환경변수 없음");
    }

    /* ========================= */
    /* 🔥 오류 수정: 옵션 최신화 */
    /* ========================= */
    await mongoose.connect(MONGO_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,                 // 🔥 추가 위치 A
      minPoolSize: 1,                  // 🔥 추가 위치 B
    });

    console.log("✅ MongoDB 연결 성공");

  } catch (err) {

    /* ========================= */
    /* 🔥 추가 위치 2: 에러 로그 */
    /* ========================= */
    console.error("❌ MongoDB 연결 실패:", err.message);

    /* ========================= */
    /* 🔥 추가 위치 3: 재시도 */
    /* ========================= */
    setTimeout(connectDB, 5000);
  }
};

/* ========================= */
/* 🔥 기존 이벤트 유지 */
/* ========================= */
mongoose.connection.on("connected", () => {
  console.log("📡 DB connected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ DB error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ DB disconnected");
});

/* ========================= */
/* 🔥 추가 기능 10개 (확장)
========================= */

// 1️⃣ 재연결 카운터
let reconnectCount = 0;

// 2️⃣ 최대 재시도 제한
const MAX_RETRY = 10;

// 3️⃣ 재연결 로직 개선
mongoose.connection.on("disconnected", () => {
  if (reconnectCount < MAX_RETRY) {
    reconnectCount++;
    console.log(`🔁 재연결 시도 (${reconnectCount})`);
    setTimeout(connectDB, 3000);
  } else {
    console.error("❌ DB 재연결 실패 (최대 초과)");
  }
});

// 4️⃣ 연결 상태 체크 함수
function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

// 5️⃣ 상태 출력 함수
function getDBStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
}

// 6️⃣ 연결 시간 기록
let connectedAt = null;
mongoose.connection.on("connected", () => {
  connectedAt = Date.now();
});

// 7️⃣ uptime 계산
function getDBUptime() {
  if (!connectedAt) return 0;
  return Date.now() - connectedAt;
}

// 8️⃣ graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 서버 종료 중...");
  await mongoose.connection.close();
  process.exit(0);
});

// 9️⃣ 에러 상세 로그
mongoose.connection.on("error", (err) => {
  console.error("❌ DB error stack:", err.stack);
});

// 🔟 디버그 모드
if (process.env.NODE_ENV !== "production") {
  mongoose.set("debug", true);
}

/* ========================= */
/* 🔥 신규 추가 기능 10개 (추가 확장)
========================= */

// 1️⃣ ping 체크
async function pingDB() {
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
}

// 2️⃣ 컬렉션 리스트
async function getCollections() {
  return mongoose.connection.db.listCollections().toArray();
}

// 3️⃣ 현재 연결 수
function getConnectionCount() {
  return mongoose.connections.length;
}

// 4️⃣ 마지막 에러 저장
let lastError = null;
mongoose.connection.on("error", (err) => {
  lastError = err.message;
});

// 5️⃣ 마지막 에러 조회
function getLastError() {
  return lastError;
}

// 6️⃣ DB 정보
async function getDBInfo() {
  return mongoose.connection.db.stats();
}

// 7️⃣ 강제 재연결
async function forceReconnect() {
  await mongoose.connection.close();
  reconnectCount = 0;
  return connectDB();
}

// 8️⃣ 연결 대기 함수
async function waitForDB(timeout = 5000) {
  const start = Date.now();
  while (!isDBConnected()) {
    if (Date.now() - start > timeout) {
      throw new Error("DB 연결 타임아웃");
    }
    await new Promise(r => setTimeout(r, 200));
  }
}

// 9️⃣ 헬스체크 데이터
function getHealth() {
  return {
    status: getDBStatus(),
    uptime: getDBUptime(),
    reconnectCount
  };
}

// 🔟 슬로우 로그
mongoose.set("debug", function (collectionName, method, query, doc) {
  const start = Date.now();
  setTimeout(() => {
    const time = Date.now() - start;
    if (time > 200) {
      console.log(`🐢 SLOW QUERY: ${collectionName}.${method}`, query);
    }
  }, 0);
});

/* ========================= */
/* 🔥 export 확장 */
/* ========================= */
module.exports = {
  connectDB,
  isDBConnected,
  getDBStatus,
  getDBUptime,

  // 🔥 추가 export
  pingDB,
  getCollections,
  getConnectionCount,
  getLastError,
  getDBInfo,
  forceReconnect,
  waitForDB,
  getHealth
};