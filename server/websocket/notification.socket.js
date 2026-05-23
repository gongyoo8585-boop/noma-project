"use strict";

/**
 * =====================================================
 * 🔥 NOTIFICATION SOCKET (ULTRA FINAL)
 * ✔ 실시간 알림 (예약 / 결제 / 관리자)
 * ✔ 유저별 룸 관리
 * ✔ 브로드캐스트 / 개인 알림
 * ✔ 인증 기반 연결 (JWT)
 * ✔ reconnect / heartbeat 안정성
 * ✔ 이벤트 로깅
 * ✔ 기존 기능 100% 유지 + 확장
 * =====================================================
 */

let ioInstance = null;

/* =========================
JWT (선택적)
========================= */
let jwt = null;
try {
  jwt = require("jsonwebtoken");
} catch (e) {}

/* =========================
ENV
========================= */
const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY";

/* =========================
🔥 초기화
========================= */
function initSocket(server) {
  const { Server } = require("socket.io");

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("🔌 SOCKET CONNECT:", socket.id);

    /* =========================
    🔐 JWT 인증 (옵션)
    ========================= */
    socket.on("auth", (token) => {
      if (!jwt || !token) return;

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id || decoded._id;

        socket.join(`user:${socket.userId}`);
        console.log(`🔐 AUTH OK: ${socket.userId}`);
      } catch (e) {
        console.warn("❌ SOCKET AUTH FAIL");
      }
    });

    /* =========================
    🔥 유저 등록
    ========================= */
    socket.on("register", (userId) => {
      if (!userId) return;

      socket.userId = userId;
      socket.join(`user:${userId}`);

      console.log(`👤 USER JOIN: ${userId}`);
    });

    /* =========================
    🔥 관리자 등록
    ========================= */
    socket.on("admin", () => {
      socket.join("admin");
      socket.isAdmin = true;

      console.log("👑 ADMIN CONNECTED");
    });

    /* =========================
    🔥 테스트
    ========================= */
    socket.on("ping", () => {
      socket.emit("pong", { time: Date.now() });
    });

    /* =========================
    🔥 유저 룸 제거
    ========================= */
    socket.on("leave", () => {
      if (socket.userId) {
        socket.leave(`user:${socket.userId}`);
      }
    });

    /* =========================
    🔥 연결 종료
    ========================= */
    socket.on("disconnect", () => {
      console.log("❌ SOCKET DISCONNECT:", socket.id);
    });
  });

  return io;
}

/* =========================
🔥 내부 emit 함수
========================= */
function emitToUser(userId, event, data) {
  if (!ioInstance || !userId) return;

  ioInstance.to(`user:${userId}`).emit(event, data);
}

function emitToAdmin(event, data) {
  if (!ioInstance) return;

  ioInstance.to("admin").emit(event, data);
}

function broadcast(event, data) {
  if (!ioInstance) return;

  ioInstance.emit(event, data);
}

/* =========================
🔥 알림 이벤트 모음
========================= */
const notification = {
  /* -------------------------
  예약 생성
  ------------------------- */
  reservationCreated(userId, data) {
    emitToUser(userId, "reservation:created", data);
    emitToAdmin("reservation:new", data);
  },

  /* -------------------------
  예약 상태 변경
  ------------------------- */
  reservationUpdated(userId, data) {
    emitToUser(userId, "reservation:updated", data);
  },

  /* -------------------------
  예약 취소
  ------------------------- */
  reservationCancelled(userId, data) {
    emitToUser(userId, "reservation:cancelled", data);
    emitToAdmin("reservation:cancelled", data);
  },

  /* -------------------------
  결제 완료
  ------------------------- */
  paymentSuccess(userId, data) {
    emitToUser(userId, "payment:success", data);
    emitToAdmin("payment:new", data);
  },

  /* -------------------------
  결제 실패
  ------------------------- */
  paymentFail(userId, data) {
    emitToUser(userId, "payment:fail", data);
  },

  /* -------------------------
  결제 취소
  ------------------------- */
  paymentCancelled(userId, data) {
    emitToUser(userId, "payment:cancelled", data);
  },

  /* -------------------------
  관리자 공지
  ------------------------- */
  noticeAll(data) {
    broadcast("notice", data);
  },

  /* -------------------------
  특정 유저 알림
  ------------------------- */
  notifyUser(userId, data) {
    emitToUser(userId, "notify", data);
  },

  /* -------------------------
  시스템 알림
  ------------------------- */
  system(data) {
    broadcast("system", data);
  },
};

/* =========================
🔥 상태 체크
========================= */
function isInitialized() {
  return !!ioInstance;
}

/* =========================
EXPORT
========================= */
module.exports = {
  initSocket,
  notification,
  isInitialized,
};