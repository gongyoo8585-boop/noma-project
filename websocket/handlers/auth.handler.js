"use strict";

/* =====================================================
🔥 AUTH HANDLER (FINAL MASTER)
웹소켓 인증 / 세션 / 토큰 검증
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try { return require(path); }
  catch (_) { return null; }
}

/* =====================================================
🔥 MODULES
===================================================== */
const jwt = safeRequire("jsonwebtoken");
const User = safeRequire("../../models/User");

/* =====================================================
🔥 CONFIG
===================================================== */
const JWT_SECRET = process.env.JWT_SECRET || "secret";

/* =====================================================
🔥 STATE
===================================================== */
const AUTHED = new WeakMap(); // ws -> user

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date();
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
🔥 VERIFY TOKEN
===================================================== */
function verifyToken(token) {
  try {
    if (!jwt) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return null;
  }
}

/* =====================================================
🔥 AUTH CORE
===================================================== */
async function authenticate(ws, payload = {}) {

  const token = payload.token;

  if (!token) {
    return send(ws, {
      ok: false,
      type: "AUTH_FAIL",
      message: "TOKEN_REQUIRED"
    });
  }

  const decoded = verifyToken(token);

  if (!decoded || !decoded.id) {
    return send(ws, {
      ok: false,
      type: "AUTH_FAIL",
      message: "INVALID_TOKEN"
    });
  }

  let user = null;

  if (User) {
    try {
      user = await User.findById(decoded.id).lean();
    } catch (_) {}
  }

  ws.userId = String(decoded.id);
  ws.role = decoded.role || "user";

  AUTHED.set(ws, {
    userId: ws.userId,
    role: ws.role,
    authedAt: now()
  });

  return send(ws, {
    type: "AUTH_OK",
    userId: ws.userId,
    role: ws.role,
    user: user
      ? {
          _id: user._id,
          email: user.email || "",
          name: user.name || "",
        }
      : null
  });
}

/* =====================================================
🔥 LOGOUT
===================================================== */
function logout(ws) {
  AUTHED.delete(ws);

  ws.userId = null;
  ws.role = null;

  return send(ws, {
    type: "LOGOUT_OK"
  });
}

/* =====================================================
🔥 CHECK AUTH
===================================================== */
function isAuthed(ws) {
  return AUTHED.has(ws);
}

/* =====================================================
🔥 HANDLER
===================================================== */
async function handleAuth(ws, type, payload, context) {

  switch (type) {

    case "AUTH":
    case "LOGIN":
      await authenticate(ws, payload);
      return true;

    case "LOGOUT":
      logout(ws);
      return true;

    case "ME":
      if (!isAuthed(ws)) {
        return send(ws, {
          ok:false,
          type:"ERROR",
          message:"NOT_AUTHENTICATED"
        });
      }

      const meta = AUTHED.get(ws);

      return send(ws, {
        type:"ME",
        userId: meta.userId,
        role: meta.role
      });

    default:
      return false;
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  handleAuth,
  authenticate,
  logout,
  isAuthed
};