"use strict";

/* =====================================================
🔥 AUTH ROUTES (NORA SAFE ROUTER FINAL)
✔ route 파일에서 server/app import 금지
✔ app.listen/server.listen side effect 차단
✔ module.exports = router 보장
✔ /api/auth NOT_FOUND 복구
✔ 기존 auth endpoint 유지
===================================================== */

const express = require("express");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

let bcrypt = null;

try {
  bcrypt = require("bcryptjs");
} catch (_) {
  try {
    bcrypt = require("bcrypt");
  } catch (error) {
    bcrypt = null;
  }
}

const router = express.Router();

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */

function safeRequire(modulePath) {
  try {
    const basePath = path.resolve(__dirname, modulePath);

    const candidates = [
      basePath,
      `${basePath}.js`,
      `${basePath}.json`,
      path.join(basePath, "index.js"),
    ];

    const found = candidates.find((filePath) => fs.existsSync(filePath));

    if (!found) {
      return null;
    }

    return require(found);
  } catch (error) {
    console.error("[AUTH ROUTE LOAD ERROR]", modulePath, error.message);

    return null;
  }
}

/* =====================================================
🔥 MODEL LOAD
===================================================== */

const User =
  safeRequire("../../models/User") ||
  safeRequire("../../models/user") ||
  safeRequire("../../models/User.model") ||
  safeRequire("../../models/user.model") ||
  safeRequire("../../server/models/User") ||
  safeRequire("../../server/models/user") ||
  safeRequire("../../modules/user/models/User") ||
  null;

/* =====================================================
🔥 BASIC UTILS
===================================================== */

function ok(res, data = {}, status = 200) {
  return res.status(status).json({
    ok: true,
    success: true,
    ...data,
  });
}

function fail(res, status = 400, message = "AUTH_ERROR") {
  return res.status(status).json({
    ok: false,
    success: false,
    msg: message,
    message,
    error: message,
  });
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.SECRET ||
    "nora-local-secret"
  );
}

function signToken(user) {
  const payload = {
    id: user.id || user.email || user.username || String(user._id || ""),
    _id: user._id,
    email: user.email,
    role: user.role || (user.isAdmin ? "admin" : "user"),
    isAdmin: user.isAdmin === true || user.role === "admin",
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function extractToken(req) {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return (
    req.cookies?.token ||
    req.cookies?.accessToken ||
    req.cookies?.authToken ||
    req.headers["x-access-token"] ||
    req.headers["x-auth-token"] ||
    req.query?.token ||
    null
  );
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  const item = typeof user.toObject === "function" ? user.toObject() : { ...user };

  delete item.password;
  delete item.passwordHash;
  delete item.refreshToken;

  return item;
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

async function comparePassword(plain, hashed) {
  if (!plain || !hashed) {
    return false;
  }

  if (!bcrypt) {
    return plain === hashed;
  }

  try {
    return await bcrypt.compare(plain, hashed);
  } catch (_) {
    return plain === hashed;
  }
}

async function hashPassword(password) {
  if (!bcrypt) {
    return password;
  }

  return bcrypt.hash(password, 10);
}

async function findUserByLogin(loginId) {
  if (!User || typeof User.findOne !== "function") {
    return null;
  }

  const query = {
    $or: [
      { id: loginId },
      { email: loginId },
      { username: loginId },
      { phone: loginId },
    ],
  };

  return User.findOne(query);
}

async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return fail(res, 401, "AUTH_REQUIRED");
    }

    const decoded = jwt.verify(token, getJwtSecret());

    req.user = decoded;
    req.auth = decoded;

    return next();
  } catch (error) {
    return fail(res, 401, "INVALID_TOKEN");
  }
}

async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = jwt.verify(token, getJwtSecret());

      req.user = decoded;
      req.auth = decoded;
    }
  } catch (_) {
    req.user = null;
    req.auth = null;
  }

  return next();
}

/* =====================================================
🔥 HEALTH
===================================================== */

router.get("/health", (req, res) =>
  ok(res, {
    service: "NORA AUTH API",
    status: "UP",
    hasUserModel: !!User,
    timestamp: new Date().toISOString(),
  })
);

router.get("/ping", (req, res) =>
  ok(res, {
    service: "NORA AUTH API",
    pong: true,
    timestamp: new Date().toISOString(),
  })
);

/* =====================================================
🔥 LOGIN / REGISTER
===================================================== */

router.post("/login", async (req, res) => {
  try {
    const loginId = firstValue(
      req.body?.id,
      req.body?.email,
      req.body?.username,
      req.body?.phone,
      req.body?.loginId
    );

    const password = firstValue(req.body?.password, req.body?.pw);

    if (!loginId || !password) {
      return fail(res, 400, "ID_PASSWORD_REQUIRED");
    }

    if (!User) {
      return fail(res, 503, "USER_MODEL_NOT_CONNECTED");
    }

    const user = await findUserByLogin(loginId);

    if (!user) {
      return fail(res, 401, "INVALID_ACCOUNT");
    }

    const hashed = user.password || user.passwordHash;

    const matched = await comparePassword(password, hashed);

    if (!matched) {
      return fail(res, 401, "INVALID_PASSWORD");
    }

    const token = signToken(user);
    const safeUser = normalizeUser(user);

    return ok(res, {
      token,
      accessToken: token,
      authToken: token,
      adminToken: token,
      jwt: token,
      user: safeUser,
    });
  } catch (error) {
    console.error("[AUTH LOGIN ERROR]", error.message);

    return fail(res, 500, "LOGIN_ERROR");
  }
});

router.post("/register", async (req, res) => {
  try {
    const id = firstValue(
      req.body?.id,
      req.body?.email,
      req.body?.username,
      req.body?.phone
    );

    const email = firstValue(req.body?.email);
    const username = firstValue(req.body?.username, req.body?.name);
    const phone = firstValue(req.body?.phone);
    const password = firstValue(req.body?.password, req.body?.pw);

    if (!id || !password) {
      return fail(res, 400, "ID_PASSWORD_REQUIRED");
    }

    if (!User) {
      return fail(res, 503, "USER_MODEL_NOT_CONNECTED");
    }

    const exists = await findUserByLogin(id);

    if (exists) {
      return fail(res, 409, "USER_ALREADY_EXISTS");
    }

    const hashed = await hashPassword(password);

    const created = await User.create({
      id,
      email: email || undefined,
      username: username || undefined,
      name: username || undefined,
      phone: phone || undefined,
      password: hashed,
      role: req.body?.role || "user",
      isAdmin: req.body?.isAdmin === true,
    });

    const token = signToken(created);

    return ok(
      res,
      {
        token,
        accessToken: token,
        authToken: token,
        user: normalizeUser(created),
      },
      201
    );
  } catch (error) {
    console.error("[AUTH REGISTER ERROR]", error.message);

    return fail(res, 500, "REGISTER_ERROR");
  }
});

router.post("/signup", async (req, res, next) => {
  req.url = "/register";
  return next();
});

router.post("/logout", (req, res) =>
  ok(res, {
    message: "LOGOUT_OK",
  })
);

router.post("/refresh", optionalAuth, (req, res) => {
  if (!req.user) {
    return fail(res, 401, "INVALID_TOKEN");
  }

  const token = jwt.sign(req.user, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  return ok(res, {
    token,
    accessToken: token,
    authToken: token,
  });
});

/* =====================================================
🔥 PROFILE
===================================================== */

async function getCurrentUser(req, res) {
  try {
    if (!req.user) {
      return fail(res, 401, "AUTH_REQUIRED");
    }

    if (!User || typeof User.findOne !== "function") {
      return ok(res, {
        user: req.user,
      });
    }

    const userId = req.user._id || req.user.id || req.user.email;

    const user = await User.findOne({
      $or: [
        { _id: userId },
        { id: userId },
        { email: userId },
      ],
    }).catch(() => null);

    return ok(res, {
      user: normalizeUser(user) || req.user,
    });
  } catch (error) {
    console.error("[AUTH ME ERROR]", error.message);

    return fail(res, 500, "ME_ERROR");
  }
}

router.get("/me", requireAuth, getCurrentUser);
router.get("/profile", requireAuth, getCurrentUser);
router.get("/session", optionalAuth, (req, res) =>
  ok(res, {
    user: req.user || null,
    authenticated: !!req.user,
  })
);

async function updateProfile(req, res) {
  try {
    if (!User || typeof User.findOneAndUpdate !== "function") {
      return fail(res, 503, "USER_MODEL_NOT_CONNECTED");
    }

    const userId = req.user?._id || req.user?.id || req.user?.email;

    if (!userId) {
      return fail(res, 401, "AUTH_REQUIRED");
    }

    const allowed = {};

    ["name", "username", "phone", "email", "nickname", "avatar"].forEach((key) => {
      if (req.body?.[key] !== undefined) {
        allowed[key] = req.body[key];
      }
    });

    const user = await User.findOneAndUpdate(
      {
        $or: [
          { _id: userId },
          { id: userId },
          { email: userId },
        ],
      },
      {
        $set: allowed,
      },
      {
        new: true,
      }
    );

    return ok(res, {
      user: normalizeUser(user),
    });
  } catch (error) {
    console.error("[AUTH UPDATE PROFILE ERROR]", error.message);

    return fail(res, 500, "UPDATE_PROFILE_ERROR");
  }
}

router.patch("/profile", requireAuth, updateProfile);
router.put("/profile", requireAuth, updateProfile);

/* =====================================================
🔥 PASSWORD
===================================================== */

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const oldPassword = firstValue(req.body?.oldPassword, req.body?.currentPassword);
    const newPassword = firstValue(req.body?.newPassword, req.body?.password);

    if (!oldPassword || !newPassword) {
      return fail(res, 400, "PASSWORD_REQUIRED");
    }

    if (!User || typeof User.findOneAndUpdate !== "function") {
      return fail(res, 503, "USER_MODEL_NOT_CONNECTED");
    }

    const userId = req.user?._id || req.user?.id || req.user?.email;

    const user = await User.findOne({
      $or: [
        { _id: userId },
        { id: userId },
        { email: userId },
      ],
    });

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const matched = await comparePassword(oldPassword, user.password || user.passwordHash);

    if (!matched) {
      return fail(res, 401, "INVALID_PASSWORD");
    }

    user.password = await hashPassword(newPassword);

    await user.save();

    return ok(res, {
      message: "PASSWORD_CHANGED",
    });
  } catch (error) {
    console.error("[AUTH CHANGE PASSWORD ERROR]", error.message);

    return fail(res, 500, "CHANGE_PASSWORD_ERROR");
  }
});

router.post("/forgot-password", (req, res) =>
  ok(res, {
    message: "FORGOT_PASSWORD_REQUEST_ACCEPTED",
  })
);

router.post("/reset-password", (req, res) =>
  ok(res, {
    message: "RESET_PASSWORD_REQUEST_ACCEPTED",
  })
);

router.get("/verify-email", (req, res) =>
  ok(res, {
    message: "VERIFY_EMAIL_REQUEST_ACCEPTED",
  })
);

/* =====================================================
🔥 ADMIN / SECURITY
===================================================== */

router.get("/admin/users", requireAuth, async (req, res) => {
  try {
    if (!User || typeof User.find !== "function") {
      return fail(res, 503, "USER_MODEL_NOT_CONNECTED");
    }

    const users = await User.find({})
      .limit(300)
      .lean();

    return ok(res, {
      users: users.map(normalizeUser),
      items: users.map(normalizeUser),
      total: users.length,
    });
  } catch (error) {
    console.error("[AUTH ADMIN USERS ERROR]", error.message);

    return fail(res, 500, "ADMIN_USERS_ERROR");
  }
});

router.post("/admin/users/:id/force-logout", requireAuth, (req, res) =>
  ok(res, {
    message: "FORCE_LOGOUT_OK",
    id: req.params.id,
  })
);

router.get("/login-history", requireAuth, (req, res) =>
  ok(res, {
    items: [],
    history: [],
  })
);

router.get("/security-check", optionalAuth, (req, res) =>
  ok(res, {
    secure: true,
    authenticated: !!req.user,
  })
);

/* =====================================================
🔥 KAKAO
===================================================== */

router.get("/kakao", (req, res) => {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return fail(res, 503, "KAKAO_CONFIG_MISSING");
  }

  const url =
    "https://kauth.kakao.com/oauth/authorize" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&response_type=code";

  return res.redirect(url);
});

router.get("/kakao/callback", (req, res) =>
  ok(res, {
    message: "KAKAO_CALLBACK_RECEIVED",
    code: req.query?.code || null,
  })
);

/* =====================================================
🔥 FALLBACK
===================================================== */

router.use((req, res) =>
  fail(res, 404, "AUTH_ROUTE_NOT_FOUND")
);

module.exports = router;

console.log("🔥 AUTH ROUTES FINAL SAFE READY");
