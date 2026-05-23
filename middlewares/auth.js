"use strict";

const jwt = require("jsonwebtoken");

/* =====================================================
🔥 CONFIG
===================================================== */
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_KEY_CHANGE_THIS";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "30d";

/* =====================================================
🔥 INTERNAL STORE
===================================================== */
const TOKEN_BLACKLIST = new Set();
const TOKEN_WHITELIST = new Set();
const TOKEN_META = new Map();
const LOGIN_HISTORY = [];
const FAILED_LOGINS = new Map(); // 🔥 추가
const USER_SESSION_MAP = new Map(); // 🔥 추가

/* =====================================================
🔥 UTIL
===================================================== */
function safeString(v, d = "") {
  return typeof v === "string" ? v : d;
}

function now() {
  return Date.now();
}

function extractToken(req) {
  const header = safeString(req.headers?.authorization, "").trim();

  if (header.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }

  if (req.headers?.["x-access-token"]) return String(req.headers["x-access-token"]).trim();
  if (req.cookies?.token) return String(req.cookies.token).trim();
  if (req.query?.token) return String(req.query.token).trim();

  return null;
}

function normalizeDecoded(decoded = {}) {
  return {
    id: decoded.id || decoded._id || decoded.userId || "",
    role: decoded.role || "user",
    email: decoded.email || "",
    nickname: decoded.nickname || "",
    userId: decoded.userId || decoded.id || decoded._id || "",
    ...decoded
  };
}

/* =====================================================
🔥 VERIFY
===================================================== */
function verifyTokenInternal(token) {
  if (!token) return null;
  if (TOKEN_BLACKLIST.has(token)) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return normalizeDecoded(decoded);
  } catch {
    return null;
  }
}

/* =====================================================
🔥 AUTH
===================================================== */
function auth(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ ok: false, message: "인증 토큰 없음" });
    }

    const decoded = verifyTokenInternal(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ ok: false, message: "유효하지 않은 토큰" });
    }

    req.token = token;
    req.user = decoded;

    req.auth = {
      ok: true,
      token,
      userId: decoded.id,
      role: decoded.role
    };

    LOGIN_HISTORY.push({
      userId: decoded.id,
      time: now(),
      ip: req.ip
    });

    USER_SESSION_MAP.set(decoded.id, token);

    return next();
  } catch {
    return res.status(401).json({ ok: false });
  }
}

/* =====================================================
🔥 OPTIONAL
===================================================== */
auth.optional = function (req, res, next) {
  const token = extractToken(req);
  const decoded = verifyTokenInternal(token);

  if (!decoded) {
    req.user = null;
    req.auth = { ok: false };
    return next();
  }

  req.user = decoded;
  req.auth = { ok: true };
  return next();
};

/* =====================================================
🔥 ROLE
===================================================== */
auth.adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ ok: false });
  if (!["admin", "superAdmin"].includes(req.user.role)) {
    return res.status(403).json({ ok: false });
  }
  next();
};

auth.superAdminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ ok: false });
  if (req.user.role !== "superAdmin") {
    return res.status(403).json({ ok: false });
  }
  next();
};

/* =====================================================
🔥 TOKEN
===================================================== */
auth.sign = function (user = {}, expires = JWT_EXPIRES_IN) {
  const token = jwt.sign(
    {
      id: user._id || user.id || "",
      role: user.role || "user"
    },
    JWT_SECRET,
    { expiresIn: expires }
  );

  TOKEN_META.set(token, { createdAt: now() });
  return token;
};

auth.refresh = function (user = {}) {
  return jwt.sign(
    {
      id: user._id || user.id || "",
      role: user.role || "user",
      type: "refresh"
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES }
  );
};

/* =====================================================
🔥 SECURITY (확장)
===================================================== */

auth.blacklist = (token) => token && TOKEN_BLACKLIST.add(token);
auth.isBlacklisted = (token) => TOKEN_BLACKLIST.has(token);

auth.revokeUserSession = (userId) => {
  const token = USER_SESSION_MAP.get(userId);
  if (token) TOKEN_BLACKLIST.add(token);
};

auth.revokeAllUserTokens = (userId) => {
  for (const token of TOKEN_META.keys()) {
    const decoded = jwt.decode(token);
    if (decoded?.id === userId) TOKEN_BLACKLIST.add(token);
  }
};

/* =====================================================
🔥 RATE LIMIT / SECURITY
===================================================== */

// 로그인 실패 기록
auth.recordFail = (userId) => {
  const arr = FAILED_LOGINS.get(userId) || [];
  arr.push(now());
  FAILED_LOGINS.set(userId, arr.slice(-10));
};

// 로그인 차단
auth.isBlocked = (userId) => {
  const arr = FAILED_LOGINS.get(userId) || [];
  return arr.length >= 5;
};

// IP 탐지 강화
auth.detectSuspiciousIP = (ip) => {
  const hits = LOGIN_HISTORY.filter(v => v.ip === ip).length;
  return hits > 100;
};

/* =====================================================
🔥 SESSION
===================================================== */

auth.getSession = (userId) => {
  return USER_SESSION_MAP.get(userId) || null;
};

auth.clearSession = (userId) => {
  USER_SESSION_MAP.delete(userId);
};

/* =====================================================
🔥 ANALYTICS
===================================================== */

auth.getLoginHistory = () => LOGIN_HISTORY.slice(-100);

auth.getUserLoginCount = (userId) => {
  return LOGIN_HISTORY.filter(v => v.userId === userId).length;
};

/* =====================================================
🔥 OWNER GUARD
===================================================== */
auth.ownerOrAdmin = (getId) => (req, res, next) => {
  const target = typeof getId === "function" ? getId(req) : getId;

  if (!req.user) return res.status(401).json({ ok: false });

  if (
    String(req.user.id) !== String(target) &&
    !["admin", "superAdmin"].includes(req.user.role)
  ) {
    return res.status(403).json({ ok: false });
  }

  next();
};

/* =====================================================
🔥 DEBUG
===================================================== */
auth.debugToken = (req) => {
  const token = extractToken(req);
  return {
    token,
    decoded: jwt.decode(token),
    valid: !!verifyTokenInternal(token)
  };
};

/* =====================================================
🔥 HEALTH
===================================================== */
auth.health = () => ({
  ok: true,
  blacklist: TOKEN_BLACKLIST.size,
  sessions: USER_SESSION_MAP.size,
  logins: LOGIN_HISTORY.length
});

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
setInterval(() => {
  if (LOGIN_HISTORY.length > 10000) LOGIN_HISTORY.splice(0, 5000);
  if (TOKEN_META.size > 5000) TOKEN_META.clear();
}, 60000);

/* ===================================================== */
console.log("🔥 AUTH ULTRA MASTER READY");

module.exports = auth;