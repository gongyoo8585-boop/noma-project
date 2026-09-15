"use strict";

const jwt = require("jsonwebtoken");

/* =====================================================
🔥 CONFIG
===================================================== */
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_KEY_CHANGE_THIS";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_EXPIRES =
  process.env.JWT_REFRESH_EXPIRES ||
  process.env.JWT_REFRESH_EXPIRES_IN ||
  "30d";

/* =====================================================
🔥 INTERNAL STORE
===================================================== */
const TOKEN_BLACKLIST = new Set();
const TOKEN_WHITELIST = new Set();
const TOKEN_META = new Map();
const LOGIN_HISTORY = [];
const FAILED_LOGINS = new Map();
const USER_SESSION_MAP = new Map();

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

    if (token) {
      return token;
    }
  }

  if (req.headers?.["x-access-token"]) {
    return String(req.headers["x-access-token"]).trim();
  }

  if (req.headers?.["x-auth-token"]) {
    return String(req.headers["x-auth-token"]).trim();
  }

  if (req.cookies?.token) {
    return String(req.cookies.token).trim();
  }

  if (req.cookies?.accessToken) {
    return String(req.cookies.accessToken).trim();
  }

  if (req.query?.token) {
    return String(req.query.token).trim();
  }

  return null;
}

function normalizeDecoded(decoded = {}) {
  return {
    id: decoded.id || decoded._id || decoded.userId || "",
    role: decoded.role || "user",
    email: decoded.email || "",
    nickname: decoded.nickname || "",
    userId: decoded.userId || decoded.id || decoded._id || "",
    ...decoded,
  };
}

function getUserIdFromRequest(req) {
  return (
    req?.user?.id ||
    req?.user?._id ||
    req?.user?.userId ||
    req?.auth?.userId ||
    ""
  );
}

function getRoleFromRequest(req) {
  return req?.user?.role || req?.auth?.role || "user";
}

/* =====================================================
🔥 VERIFY
===================================================== */
function verifyTokenInternal(token) {
  if (!token) {
    return null;
  }

  if (TOKEN_BLACKLIST.has(token)) {
    return null;
  }

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
      return res.status(401).json({
        ok: false,
        message: "인증 토큰 없음",
      });
    }

    const decoded = verifyTokenInternal(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        ok: false,
        message: "유효하지 않은 토큰",
      });
    }

    req.token = token;
    req.user = decoded;

    req.auth = {
      ok: true,
      token,
      userId: decoded.id,
      role: decoded.role,
    };

    LOGIN_HISTORY.push({
      userId: decoded.id,
      time: now(),
      ip: req.ip,
    });

    if (LOGIN_HISTORY.length > 10000) {
      LOGIN_HISTORY.splice(0, LOGIN_HISTORY.length - 10000);
    }

    USER_SESSION_MAP.set(decoded.id, token);

    return next();
  } catch {
    return res.status(401).json({
      ok: false,
      message: "AUTH_ERROR",
    });
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
    req.auth = {
      ok: false,
    };

    return next();
  }

  req.token = token;
  req.user = decoded;

  req.auth = {
    ok: true,
    token,
    userId: decoded.id,
    role: decoded.role,
  };

  return next();
};

/* =====================================================
🔥 COMPAT ALIASES
===================================================== */
auth.verifyToken = auth;
auth.authenticateToken = auth;
auth.authMiddleware = auth;
auth.protect = auth;
auth.optionalAuth = auth.optional;

/* =====================================================
🔥 REQUEST HELPERS
===================================================== */
auth.getUserId = function (req) {
  return getUserIdFromRequest(req);
};

auth.getRole = function (req) {
  return getRoleFromRequest(req);
};

auth.isAdmin = function (req) {
  return ["admin", "superAdmin"].includes(getRoleFromRequest(req));
};

auth.isSuperAdmin = function (req) {
  return getRoleFromRequest(req) === "superAdmin";
};

/* =====================================================
🔥 ROLE
===================================================== */
auth.adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: "인증 필요",
    });
  }

  if (!["admin", "superAdmin"].includes(req.user.role)) {
    return res.status(403).json({
      ok: false,
      message: "관리자 권한 필요",
    });
  }

  return next();
};

auth.superAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: "인증 필요",
    });
  }

  if (req.user.role !== "superAdmin") {
    return res.status(403).json({
      ok: false,
      message: "최고 관리자 권한 필요",
    });
  }

  return next();
};

/* =====================================================
🔥 TOKEN
===================================================== */
auth.sign = function (user = {}, expires = JWT_EXPIRES_IN) {
  const token = jwt.sign(
    {
      id: user._id || user.id || user.userId || "",
      role: user.role || "user",
      email: user.email || "",
      nickname: user.nickname || "",
    },
    JWT_SECRET,
    {
      expiresIn: expires,
    }
  );

  TOKEN_META.set(token, {
    createdAt: now(),
    userId: user._id || user.id || user.userId || "",
  });

  return token;
};

auth.refresh = function (user = {}) {
  return jwt.sign(
    {
      id: user._id || user.id || user.userId || "",
      role: user.role || "user",
      type: "refresh",
    },
    JWT_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES,
    }
  );
};

auth.verify = function (token) {
  return verifyTokenInternal(token);
};

auth.extractToken = extractToken;

/* =====================================================
🔥 SECURITY
===================================================== */
auth.blacklist = (token) => {
  if (token) {
    TOKEN_BLACKLIST.add(token);
  }
};

auth.whitelist = (token) => {
  if (token) {
    TOKEN_WHITELIST.add(token);
  }
};

auth.isBlacklisted = (token) => TOKEN_BLACKLIST.has(token);
auth.isWhitelisted = (token) => TOKEN_WHITELIST.has(token);

auth.revokeUserSession = (userId) => {
  const token = USER_SESSION_MAP.get(String(userId));

  if (token) {
    TOKEN_BLACKLIST.add(token);
  }

  USER_SESSION_MAP.delete(String(userId));
};

auth.revokeAllUserTokens = (userId) => {
  for (const token of TOKEN_META.keys()) {
    const decoded = jwt.decode(token);

    if (String(decoded?.id || "") === String(userId)) {
      TOKEN_BLACKLIST.add(token);
    }
  }

  USER_SESSION_MAP.delete(String(userId));
};

/* =====================================================
🔥 RATE LIMIT / SECURITY
===================================================== */
auth.recordFail = (userId) => {
  const key = String(userId || "");
  const arr = FAILED_LOGINS.get(key) || [];

  arr.push(now());

  const recent = arr.filter((time) => now() - time < 10 * 60 * 1000);

  FAILED_LOGINS.set(key, recent.slice(-10));
};

auth.clearFail = (userId) => {
  FAILED_LOGINS.delete(String(userId || ""));
};

auth.isBlocked = (userId) => {
  const key = String(userId || "");
  const arr = FAILED_LOGINS.get(key) || [];
  const recent = arr.filter((time) => now() - time < 10 * 60 * 1000);

  FAILED_LOGINS.set(key, recent);

  return recent.length >= 5;
};

auth.detectSuspiciousIP = (ip) => {
  const hits = LOGIN_HISTORY.filter((v) => v.ip === ip).length;
  return hits > 100;
};

/* =====================================================
🔥 SESSION
===================================================== */
auth.getSession = (userId) => {
  return USER_SESSION_MAP.get(String(userId)) || null;
};

auth.clearSession = (userId) => {
  USER_SESSION_MAP.delete(String(userId));
};

/* =====================================================
🔥 ANALYTICS
===================================================== */
auth.getLoginHistory = () => LOGIN_HISTORY.slice(-100);

auth.getUserLoginCount = (userId) => {
  return LOGIN_HISTORY.filter((v) => String(v.userId) === String(userId)).length;
};

/* =====================================================
🔥 OWNER GUARD
===================================================== */
auth.ownerOrAdmin = (getId) => (req, res, next) => {
  const target = typeof getId === "function" ? getId(req) : getId;

  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: "인증 필요",
    });
  }

  if (
    String(req.user.id) !== String(target) &&
    !["admin", "superAdmin"].includes(req.user.role)
  ) {
    return res.status(403).json({
      ok: false,
      message: "권한 없음",
    });
  }

  return next();
};

/* =====================================================
🔥 DEBUG
===================================================== */
auth.debugToken = (req) => {
  const token = extractToken(req);

  return {
    token,
    decoded: jwt.decode(token),
    valid: !!verifyTokenInternal(token),
  };
};

/* =====================================================
🔥 HEALTH
===================================================== */
auth.health = () => ({
  ok: true,
  blacklist: TOKEN_BLACKLIST.size,
  whitelist: TOKEN_WHITELIST.size,
  sessions: USER_SESSION_MAP.size,
  logins: LOGIN_HISTORY.length,
});

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
if (!global.__NORA_AUTH_CLEANER__) {
  global.__NORA_AUTH_CLEANER__ = true;

  setInterval(() => {
    if (LOGIN_HISTORY.length > 10000) {
      LOGIN_HISTORY.splice(0, LOGIN_HISTORY.length - 10000);
    }

    if (TOKEN_META.size > 5000) {
      TOKEN_META.clear();
    }

    for (const [userId, arr] of FAILED_LOGINS.entries()) {
      const recent = arr.filter((time) => now() - time < 10 * 60 * 1000);

      if (recent.length > 0) {
        FAILED_LOGINS.set(userId, recent.slice(-10));
      } else {
        FAILED_LOGINS.delete(userId);
      }
    }
  }, 60000);
}

/* ===================================================== */
console.log("🔥 AUTH ULTRA MASTER READY");

module.exports = auth;
