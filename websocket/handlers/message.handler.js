"use strict";

/* =====================================================
🔥 MESSAGE HANDLER (FINAL MASTER)
웹소켓 메시지 중앙 처리 (라우팅 / 검증 / 분기)
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try { return require(path); }
  catch (_) { return null; }
}

/* =====================================================
🔥 HANDLERS
===================================================== */
const authHandler = safeRequire("./auth.handler");
const subscriptionHandler = safeRequire("./subscription.handler");

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date();
}

function safeParse(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch (_) {
    return null;
  }
}

function send(ws, data) {
  try {
    ws.send(JSON.stringify({
      ok: data.ok !== false,
      time: now(),
      ...data
    }));
  } catch (_) {}
}

/* =====================================================
🔥 VALIDATION
===================================================== */
function validateMessage(msg) {
  if (!msg) return "INVALID_JSON";
  if (!msg.type) return "TYPE_REQUIRED";
  return null;
}

/* =====================================================
🔥 CORE HANDLER
===================================================== */
async function handleMessage(ws, raw, context = {}) {
  const msg = safeParse(raw);

  const error = validateMessage(msg);
  if (error) {
    return send(ws, {
      ok: false,
      type: "ERROR",
      message: error
    });
  }

  const type = String(msg.type).toUpperCase();
  const payload = msg.payload || {};

  /* =========================
  🔥 AUTH HANDLER
  ========================= */
  if (authHandler?.handleAuth) {
    const handled = await authHandler.handleAuth(ws, type, payload, context);
    if (handled) return true;
  }

  /* =========================
  🔥 SUBSCRIPTION HANDLER
  ========================= */
  if (subscriptionHandler?.handleSubscription) {
    const handled = await subscriptionHandler.handleSubscription(ws, type, payload, context);
    if (handled) return true;
  }

  /* =========================
  🔥 DEFAULT TYPES
  ========================= */
  switch (type) {

    case "PING":
      return send(ws, { type:"PONG" });

    case "ECHO":
      return send(ws, {
        type:"ECHO",
        data: payload
      });

    case "TIME":
      return send(ws, {
        type:"TIME",
        serverTime: now()
      });

    case "HEALTH":
      return send(ws, {
        type:"HEALTH",
        status:"ok"
      });

    default:
      return send(ws, {
        type:"UNKNOWN",
        received:type
      });
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  handleMessage
};