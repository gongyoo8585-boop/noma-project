"use strict";

const mongoose = require("mongoose");

/* =====================================================
🔥 STATE
===================================================== */
let isConnected = false;
let isConnecting = false;

/* =====================================================
🔥 CONNECT
===================================================== */
async function connectDB() {
  // 이미 연결 or 연결 중이면 중단
  if (isConnected || isConnecting) {
    return;
  }

  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("❌ MONGO_URI 환경변수 없음");
    process.exit(1);
  }

  try {
    isConnecting = true;

    console.log("🔌 MongoDB connecting...");

    const conn = await mongoose.connect(MONGO_URI, {
      autoIndex: true,
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    isConnected = true;
    isConnecting = false;

    console.log("✅ MongoDB connected:", conn.connection.host);

    return conn;

  } catch (err) {
    isConnecting = false;

    console.error("❌ MongoDB connection failed:", err.message);

    // 🔥 안전한 재시도 (중복 방지)
    setTimeout(() => {
      if (!isConnected) {
        connectDB();
      }
    }, 5000);
  }
}

/* =====================================================
🔥 EVENTS
===================================================== */
mongoose.connection.on("connected", () => {
  console.log("📡 Mongoose connected");
});

mongoose.connection.on("error", (err) => {
  console.error("🔥 Mongoose error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ Mongoose disconnected");
  isConnected = false;
});

/* =====================================================
🔥 UTILS
===================================================== */
function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

function getDBStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
}

/* =====================================================
🔥 GRACEFUL SHUTDOWN
===================================================== */
async function closeDB() {
  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log("🔌 MongoDB closed");
  } catch (e) {
    console.error("DB close error:", e.message);
  }
}

process.on("SIGINT", async () => {
  console.log("🛑 서버 종료 중...");
  await closeDB();
  process.exit(0);
});

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  connectDB,
  closeDB,
  isDBConnected,
  getDBStatus
};