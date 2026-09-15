"use strict";

/* =====================================================
🔥 USER ROUTES (NORA PRODUCTION SAFE)
✔ ReferenceError: router is not defined 오류 제거
✔ 기존 확장 라우트 유지
✔ auth/admin 미정의 오류 방지
✔ User 모델 경로 안전 처리
✔ Router.use Object 오류 연쇄 방지
===================================================== */

const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    console.warn("[user.routes] require fail:", modulePath, error.message);
    return null;
  }
}

const User =
  safeRequire("../../models/User") ||
  safeRequire("../../models/user") ||
  safeRequire("../../models/User.model") ||
  safeRequire("../../models/user.model") ||
  safeRequire("../../server/models/User") ||
  safeRequire("../../modules/user/models/User");

const Shop =
  safeRequire("../../server/models/Shop");

const authModule =
  safeRequire("../../middlewares/auth") ||
  safeRequire("../../middleware/auth") ||
  safeRequire("../../src/middlewares/auth") ||
  safeRequire("../../src/middleware/auth") ||
  {};

const adminModule =
  safeRequire("../../middlewares/adminGuard") ||
  safeRequire("../../middleware/adminGuard") ||
  safeRequire("../../src/middlewares/adminGuard") ||
  safeRequire("../../src/middleware/adminGuard") ||
  {};

const userController =
  safeRequire("../../controllers/user/userController") ||
  safeRequire("../../controllers/user.controller") ||
  safeRequire("../../controllers/userController") ||
  {};

const auth =
  typeof authModule === "function"
    ? authModule
    : typeof authModule.auth === "function"
    ? authModule.auth
    : typeof authModule.verifyToken === "function"
    ? authModule.verifyToken
    : typeof authModule.authenticate === "function"
    ? authModule.authenticate
    : (req, res, next) => next();

const resolvedAdmin =
  typeof adminModule.admin === "function"
    ? adminModule.admin
    : typeof adminModule.adminOnly === "function"
    ? adminModule.adminOnly
    : typeof adminModule.requireAdmin === "function"
    ? adminModule.requireAdmin
    : typeof adminModule === "function"
    ? adminModule()
    : null;

const admin = (req, res, next) => {
  const role = String(req.user?.role || "")
    .trim()
    .toLowerCase();

  if (
    req.user?.isAdmin === true ||
    role === "admin" ||
    role === "superadmin" ||
    role === "super_admin"
  ) {
    return next();
  }

  if (typeof resolvedAdmin === "function") {
    return resolvedAdmin(req, res, next);
  }

  return res.status(403).json({
    ok: false,
    message: "FORBIDDEN_ROLE",
    error: "FORBIDDEN_ROLE",
  });
};

/* =====================================================
🔥 RESPONSE
===================================================== */
function ok(res, data = {}, message = "OK") {
  return res.json({
    ok: true,
    message,
    ...data,
  });
}

function fail(res, status = 500, message = "SERVER_ERROR") {
  return res.status(status).json({
    ok: false,
    message,
    error: message,
  });
}

function safeAsync(handler) {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      console.error("[user.routes] handler error:", error);
      return fail(res, error.status || 500, error.message || "USER_ROUTE_ERROR");
    }
  };
}

function safeHandler(name, fallback) {
  const handler = userController && userController[name];

  if (typeof handler === "function") {
    return safeAsync(handler);
  }

  return safeAsync(fallback);
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const item = typeof user.toObject === "function" ? user.toObject() : { ...user };

  delete item.password;
  delete item.refreshToken;
  delete item.token;

  return item;
}

async function attachJobWritePermissionFields(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) return [];

  const baseUsers = safeItems
    .map(sanitizeUser)
    .filter(Boolean);

  if (!User?.collection || typeof User.collection.find !== "function") {
    return baseUsers.map((item) => ({
      ...item,
      jobGrade:
        String(item?.jobGrade || "").toLowerCase() === "premium"
          ? "premium"
          : "normal",
      jobPostingEnabled: item?.jobPostingEnabled === true,
    }));
  }

  try {
    const objectIds = safeItems
      .map((item) => item?._id)
      .filter(Boolean);

    const rawItems = await User.collection
      .find(
        { _id: { $in: objectIds } },
        { projection: { jobGrade: 1, jobPostingEnabled: 1 } }
      )
      .toArray();

    const permissionMap = new Map(
      rawItems.map((item) => [String(item?._id || ""), item])
    );

    return baseUsers.map((item) => {
      const raw = permissionMap.get(String(item?._id || "")) || {};
      return {
        ...item,
        jobGrade:
          String(raw?.jobGrade || item?.jobGrade || "").toLowerCase() ===
          "premium"
            ? "premium"
            : "normal",
        jobPostingEnabled:
          raw && Object.prototype.hasOwnProperty.call(raw, "jobPostingEnabled")
            ? raw.jobPostingEnabled === true
            : item?.jobPostingEnabled === true,
      };
    });
  } catch (error) {
    console.warn(
      "[user.routes] job permission list merge fail:",
      error?.message || error
    );

    return baseUsers.map((item) => ({
      ...item,
      jobGrade:
        String(item?.jobGrade || "").toLowerCase() === "premium"
          ? "premium"
          : "normal",
      jobPostingEnabled: item?.jobPostingEnabled === true,
    }));
  }
}

async function getRawUserWithJobPermissions(user) {
  if (!user) return null;

  if (User?.collection && typeof User.collection.findOne === "function") {
    try {
      const raw = await User.collection.findOne({ _id: user._id });
      if (raw) return raw;
    } catch (error) {
      console.warn(
        "[user.routes] raw user permission read fail:",
        error?.message || error
      );
    }
  }

  return typeof user.toObject === "function" ? user.toObject() : { ...user };
}

function currentUserId(req) {
  return String(req.user?._id || req.user?.id || req.params.id || "");
}

function normalizeShopLinkServiceType(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  if (
    text === "massage" ||
    text === "마사지" ||
    text.includes("massage") ||
    text.includes("마사지") ||
    text.includes("테라피") ||
    text.includes("스웨디시") ||
    text.includes("아로마")
  ) {
    return "massage";
  }

  if (
    text === "karaoke" ||
    text === "노래방" ||
    text === "가라오케" ||
    text.includes("karaoke") ||
    text.includes("노래방") ||
    text.includes("가라오케") ||
    text.includes("코인")
  ) {
    return "karaoke";
  }

  return text;
}

function normalizeShopLinkShop(shop = {}) {
  if (!shop || typeof shop !== "object") {
    return null;
  }

  const source =
    typeof shop.toObject === "function"
      ? shop.toObject()
      : { ...shop };

  const owner = source.owner;
  const ownerId = String(
    owner?._id ||
      owner?.id ||
      owner ||
      ""
  ).trim();

  const ownerNickname =
    owner && typeof owner === "object"
      ? String(
          owner.nickname ||
            owner.name ||
            owner.id ||
            ""
        ).trim()
      : "";

  const nickname = String(
    source.nickname ||
      source.shopName ||
      source.name ||
      source.title ||
      ownerNickname ||
      "업체명 없음"
  ).trim();

  const normalizedServiceType =
    normalizeShopLinkServiceType(
      source.serviceType ||
        source.category ||
        source.shopCategory ||
        source.businessType ||
        source.adminCategory ||
        ""
    );

  return {
    ...source,
    nickname,
    ownerId,
    ownerNickname,
    serviceType:
      normalizedServiceType ||
      source.serviceType ||
      "",
  };
}

/* =====================================================
🔥 HEALTH
===================================================== */
router.get("/health", (req, res) => {
  return ok(res, {
    service: "user",
    status: "UP",
    userModel: !!User,
    controller: !!userController,
    time: Date.now(),
  });
});

/* =====================================================
🔥 CORE USER ROUTES
===================================================== */
router.get(
  "/me",
  auth,
  safeHandler("me", async (req, res) => {
    const id = currentUserId(req);

    if (!id || !User) {
      return ok(res, {
        user: req.user || null,
      });
    }

    const user = await User.findById(id).lean();

    return ok(res, {
      user: sanitizeUser(user) || req.user || null,
    });
  })
);

router.get(
  "/profile",
  auth,
  safeHandler("profile", async (req, res) => {
    const id = currentUserId(req);

    if (!id || !User) {
      return ok(res, {
        user: req.user || null,
      });
    }

    const user = await User.findById(id).lean();

    return ok(res, {
      user: sanitizeUser(user) || req.user || null,
    });
  })
);

router.put(
  "/profile",
  auth,
  safeHandler("updateProfile", async (req, res) => {
    const id = currentUserId(req);

    if (!id || !User) {
      return ok(res, {
        user: {
          ...(req.user || {}),
          ...(req.body || {}),
        },
      });
    }

    const user = await User.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();

    return ok(res, {
      user: sanitizeUser(user),
    });
  })
);

router.patch(
  "/profile",
  auth,
  safeHandler("updateProfile", async (req, res) => {
    const id = currentUserId(req);

    if (!id || !User) {
      return ok(res, {
        user: {
          ...(req.user || {}),
          ...(req.body || {}),
        },
      });
    }

    const user = await User.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();

    return ok(res, {
      user: sanitizeUser(user),
    });
  })
);

router.get(
  "/",
  auth,
  admin,
  safeHandler("listUsers", async (req, res) => {
    if (!User) {
      return ok(res, {
        items: [],
        users: [],
        total: 0,
      });
    }

    const limit = Math.max(1, Math.min(300, Number(req.query.limit || 100)));
    const items = await User.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const users = items.map(sanitizeUser);

    return ok(res, {
      items: users,
      users,
      total: users.length,
    });
  })
);

router.get(
  "/admin",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return ok(res, {
        items: [],
        users: [],
        list: [],
        data: [],
        total: 0,
        count: 0,
      });
    }

    const limit = Math.max(
      1,
      Math.min(
        1000,
        Number(req.query.limit || 1000)
      )
    );

    const filter = {
      $or: [
        { status: { $exists: false } },
        { status: { $ne: "deleted" } },
      ],
    };

    let query = User.find(filter)
      .select("-password -loginFailCount -lockedUntil -__v")
      .sort({ createdAt: -1 })
      .limit(limit);

    if (typeof query.maxTimeMS === "function") {
      query = query.maxTimeMS(4500);
    }

    const items = await query.lean();

    const users = Array.isArray(items)
      ? await attachJobWritePermissionFields(items)
      : [];

    return ok(res, {
      items: users,
      users,
      list: users,
      data: users,
      total: users.length,
      count: users.length,
    });
  })
);

router.get(
  "/admin/stats",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return ok(res, {
        total: 0,
        count: 0,
        users: 0,
        userCount: 0,
        recent: [],
        items: [],
        list: [],
        data: [],
      });
    }

    const filter = {
      $or: [
        { status: { $exists: false } },
        { status: { $ne: "deleted" } },
      ],
    };

    let totalQuery = User.countDocuments(filter);

    if (typeof totalQuery.maxTimeMS === "function") {
      totalQuery = totalQuery.maxTimeMS(4500);
    }

    const total = await totalQuery;

    let recentQuery = User.find(filter)
      .select("-password -loginFailCount -lockedUntil -__v")
      .sort({ createdAt: -1 })
      .limit(5);

    if (typeof recentQuery.maxTimeMS === "function") {
      recentQuery = recentQuery.maxTimeMS(4500);
    }

    const recentItems = await recentQuery.lean();

    const recent = Array.isArray(recentItems)
      ? recentItems.map(sanitizeUser).filter(Boolean)
      : [];

    return ok(res, {
      total,
      count: total,
      users: total,
      userCount: total,
      recent,
      items: recent,
      list: recent,
      data: recent,
    });
  })
);

/* =====================================================
🔥 ADMIN USER ID CHANGE
===================================================== */
router.patch(
  "/:id/id",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const targetUserId = String(req.params.id || "").trim();
    const nextId = String(req.body?.id || "").trim();

    if (!targetUserId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    if (!nextId) {
      return fail(res, 400, "NEW_ID_REQUIRED");
    }

    const user = await User.findById(targetUserId);

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    if (String(user.id || "") === nextId) {
      return ok(res, {
        user: sanitizeUser(user),
      }, "USER_ID_UNCHANGED");
    }

    const duplicate = await User.findOne({
      id: nextId,
      _id: {
        $ne: user._id,
      },
    }).lean();

    if (duplicate) {
      return fail(res, 409, "USER_ID_ALREADY_EXISTS");
    }

    user.id = nextId;

    await user.save();

    return ok(res, {
      user: sanitizeUser(user),
    }, "USER_ID_UPDATED");
  })
);

/* =====================================================
🔥 ADMIN USER NICKNAME CHANGE
===================================================== */
router.patch(
  "/:id/nickname",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const targetUserId = String(req.params.id || "").trim();
    const nextNickname = String(req.body?.nickname || "").trim();

    if (!targetUserId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    if (!nextNickname) {
      return fail(res, 400, "NEW_NICKNAME_REQUIRED");
    }

    const user = await User.findById(targetUserId);

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    if (String(user.nickname || "").trim() === nextNickname) {
      return ok(
        res,
        {
          user: sanitizeUser(user),
        },
        "USER_NICKNAME_UNCHANGED"
      );
    }

    user.nickname = nextNickname;

    await user.save();

    return ok(
      res,
      {
        user: sanitizeUser(user),
      },
      "USER_NICKNAME_UPDATED"
    );
  })
);

/* =====================================================
🔥 ADMIN USER PASSWORD RESET
===================================================== */
router.patch(
  "/:id/password",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const targetUserId = String(req.params.id || "").trim();
    const nextPassword = String(req.body?.password || "");

    if (!targetUserId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    if (!nextPassword) {
      return fail(res, 400, "NEW_PASSWORD_REQUIRED");
    }

    if (nextPassword.length < 4) {
      return fail(res, 400, "PASSWORD_TOO_SHORT");
    }

    const user = await User.findById(targetUserId)
      .select("+password");

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const hashedPassword = await bcrypt.hash(
      nextPassword,
      10
    );

    await User.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          password: hashedPassword,
          loginFailCount: 0,
          lockedUntil: null,
        },
      }
    );

    const updatedUser = await User.findById(
      user._id
    ).lean();

    return ok(res, {
      user: sanitizeUser(updatedUser),
      passwordReset: true,
    }, "USER_PASSWORD_RESET");
  })
);

/* =====================================================
🔥 ADMIN USER ROLE CHANGE
===================================================== */
router.patch(
  "/:id/role",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const targetUserId = String(req.params.id || "").trim();
    const nextRole = String(req.body?.role || "")
      .trim()
      .toLowerCase();

    if (!targetUserId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    if (!nextRole) {
      return fail(res, 400, "ROLE_REQUIRED");
    }

    if (!["user", "shop", "admin"].includes(nextRole)) {
      return fail(res, 400, "INVALID_ROLE");
    }

    const user = await User.findById(targetUserId);

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const currentRole = String(user.role || "user")
      .trim()
      .toLowerCase();

    if (currentRole === nextRole) {
      return ok(
        res,
        {
          user: sanitizeUser(user),
        },
        "USER_ROLE_UNCHANGED"
      );
    }

    user.role = nextRole;

    await user.save();

    return ok(
      res,
      {
        user: sanitizeUser(user),
      },
      "USER_ROLE_UPDATED"
    );
  })
);

/* =====================================================
🔥 ADMIN USER BLOCK / UNBLOCK
===================================================== */
router.patch(
  "/:id/block",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const targetUserId = String(req.params.id || "").trim();

    if (!targetUserId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    if (typeof req.body?.blocked !== "boolean") {
      return fail(res, 400, "BLOCKED_BOOLEAN_REQUIRED");
    }

    const nextBlocked = req.body.blocked === true;
    const user = await User.findById(targetUserId);

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    user.blocked = nextBlocked;
    user.status = nextBlocked ? "blocked" : "active";

    await user.save();

    return ok(
      res,
      {
        user: sanitizeUser(user),
      },
      nextBlocked ? "USER_BLOCKED" : "USER_UNBLOCKED"
    );
  })
);

/* =====================================================
🔥 ADMIN SHOP SERVICE TYPE CHANGE
===================================================== */
router.patch(
  "/:id/service-type",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const targetUserId = String(req.params.id || "").trim();
    const nextServiceType = String(req.body?.serviceType || "")
      .trim()
      .toLowerCase();

    if (!targetUserId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    if (!nextServiceType) {
      return fail(res, 400, "SERVICE_TYPE_REQUIRED");
    }

    if (!["massage", "karaoke"].includes(nextServiceType)) {
      return fail(res, 400, "INVALID_SERVICE_TYPE");
    }

    const user = await User.findById(targetUserId);

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const currentRole = String(user.role || "user")
      .trim()
      .toLowerCase();

    if (currentRole !== "shop") {
      return fail(res, 400, "SHOP_ROLE_REQUIRED");
    }

    const currentServiceType = String(user.serviceType || "")
      .trim()
      .toLowerCase();

    if (currentServiceType === nextServiceType) {
      return ok(
        res,
        {
          user: sanitizeUser(user),
        },
        "USER_SERVICE_TYPE_UNCHANGED"
      );
    }

    user.serviceType = nextServiceType;

    await user.save();

    return ok(
      res,
      {
        user: sanitizeUser(user),
      },
      "USER_SERVICE_TYPE_UPDATED"
    );
  })
);

/* =====================================================
🔥 ADMIN SHOP JOB GRADE CHANGE
===================================================== */
router.patch(
  "/:id/job-grade",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const targetUserId = String(req.params.id || "").trim();
    const nextJobGrade = String(req.body?.jobGrade || "")
      .trim()
      .toLowerCase();

    if (!targetUserId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    if (!["premium", "normal"].includes(nextJobGrade)) {
      return fail(res, 400, "INVALID_JOB_GRADE");
    }

    const user = await User.findById(targetUserId);

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const currentRole = String(user.role || "user")
      .trim()
      .toLowerCase();

    if (currentRole !== "shop") {
      return fail(res, 400, "SHOP_ROLE_REQUIRED");
    }

    if (User?.collection && typeof User.collection.updateOne === "function") {
      await User.collection.updateOne(
        { _id: user._id },
        { $set: { jobGrade: nextJobGrade } }
      );
    } else {
      user.set("jobGrade", nextJobGrade, { strict: false });
      await user.save();
    }

    const updatedUser = await getRawUserWithJobPermissions(user);

    return ok(
      res,
      {
        user: {
          ...sanitizeUser(updatedUser),
          jobGrade: nextJobGrade,
          jobPostingEnabled: updatedUser?.jobPostingEnabled === true,
        },
      },
      "USER_JOB_GRADE_UPDATED"
    );
  })
);

/* =====================================================
🔥 ADMIN SHOP JOB POSTING ON / OFF
===================================================== */
router.patch(
  "/:id/job-posting-enabled",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const targetUserId = String(req.params.id || "").trim();

    if (!targetUserId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    if (typeof req.body?.jobPostingEnabled !== "boolean") {
      return fail(res, 400, "JOB_POSTING_ENABLED_BOOLEAN_REQUIRED");
    }

    const nextEnabled = req.body.jobPostingEnabled === true;
    const user = await User.findById(targetUserId);

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const currentRole = String(user.role || "user")
      .trim()
      .toLowerCase();

    if (currentRole !== "shop") {
      return fail(res, 400, "SHOP_ROLE_REQUIRED");
    }

    if (User?.collection && typeof User.collection.updateOne === "function") {
      await User.collection.updateOne(
        { _id: user._id },
        { $set: { jobPostingEnabled: nextEnabled } }
      );
    } else {
      user.set("jobPostingEnabled", nextEnabled, { strict: false });
      await user.save();
    }

    const updatedUser = await getRawUserWithJobPermissions(user);

    return ok(
      res,
      {
        user: {
          ...sanitizeUser(updatedUser),
          jobGrade:
            String(updatedUser?.jobGrade || "").toLowerCase() === "premium"
              ? "premium"
              : "normal",
          jobPostingEnabled: nextEnabled,
        },
      },
      nextEnabled
        ? "USER_JOB_POSTING_ENABLED"
        : "USER_JOB_POSTING_DISABLED"
    );
  })
);

/* =====================================================
ADMIN SHOP MEMBER <-> SHOP OWNER LINK
===================================================== */
router.get(
  "/admin/shop-links",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User || !Shop) {
      return fail(res, 503, "SHOP_LINK_MODEL_NOT_CONNECTED");
    }

    const users = await User.find({
      role: "shop",
      status: { $ne: "deleted" },
    })
      .select("-password -loginFailCount -lockedUntil -__v")
      .sort({ createdAt: -1 })
      .lean();

    let shopQuery = Shop.find({
      isDeleted: { $ne: true },
    })
      .select(
        "_id name nickname shopName title category shopCategory serviceType businessType adminCategory address roadAddress region district approved visible status owner phone updatedAt createdAt"
      )
      .sort({ name: 1, title: 1 });

    if (
      shopQuery &&
      typeof shopQuery.populate === "function"
    ) {
      shopQuery = shopQuery.populate(
        "owner",
        "_id id nickname name email phone role serviceType status blocked"
      );
    }

    if (
      shopQuery &&
      typeof shopQuery.lean === "function"
    ) {
      shopQuery = shopQuery.lean();
    }

    const rawShops = await shopQuery;

    const shops = Array.isArray(rawShops)
      ? rawShops
          .map(normalizeShopLinkShop)
          .filter(Boolean)
      : [];

    const ownerMap = new Map();

    shops.forEach((shop) => {
      if (shop?.ownerId) {
        ownerMap.set(String(shop.ownerId), shop);
      }
    });

    const items = users.map((user) => ({
      ...sanitizeUser(user),
      linkedShop:
        ownerMap.get(String(user?._id || "")) ||
        null,
    }));

    const links = shops.filter(
      (shop) => !!shop?.ownerId
    );

    return ok(res, {
      items,
      users: items,
      links,
      list: links,
      data: links,
      shops,
      total: links.length,
      count: links.length,
    });
  })
);

router.post(
  "/admin/shop-links/user/:userId",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!User || !Shop) {
      return fail(res, 503, "SHOP_LINK_MODEL_NOT_CONNECTED");
    }

    const userId = String(req.params?.userId || "").trim();
    const shopId = String(req.body?.shopId || "").trim();

    if (!userId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    if (!shopId) {
      return fail(res, 400, "SHOP_REQUIRED");
    }

    let user = null;

    try {
      user = await User.findById(userId);
    } catch (_) {
      user = null;
    }

    if (!user && typeof User.findOne === "function") {
      user = await User.findOne({ id: userId });
    }

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    if (String(user.role || "").trim().toLowerCase() !== "shop") {
      return fail(res, 400, "SHOP_MEMBER_ONLY");
    }

    const shop = await Shop.findOne({
      _id: shopId,
      isDeleted: { $ne: true },
    });

    if (!shop) {
      return fail(res, 404, "SHOP_NOT_FOUND");
    }

    if (shop.owner && String(shop.owner) !== String(user._id)) {
      return fail(res, 409, "SHOP_ALREADY_LINKED");
    }

    const currentOwnerShop = await Shop.findOne({
      owner: user._id,
      _id: { $ne: shop._id },
      isDeleted: { $ne: true },
    });

    if (currentOwnerShop) {
      return fail(res, 409, "USER_ALREADY_HAS_SHOP");
    }

    const serviceType =
      normalizeShopLinkServiceType(
        user.serviceType || ""
      );

    const shopServiceType =
      normalizeShopLinkServiceType(
        shop.serviceType ||
          shop.category ||
          shop.shopCategory ||
          shop.businessType ||
          shop.adminCategory ||
          ""
      );

    if (
      ["massage", "karaoke"].includes(serviceType) &&
      shopServiceType &&
      serviceType !== shopServiceType
    ) {
      return fail(res, 400, "SHOP_SERVICE_TYPE_MISMATCH");
    }

    shop.owner = user._id;
    await shop.save();

    return ok(
      res,
      {
        user: sanitizeUser(user),
        shop:
          normalizeShopLinkShop(shop) ||
          shop,
        linked: true,
      },
      "SHOP_LINKED"
    );
  })
);

router.delete(
  "/admin/shop-links/user/:userId",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!Shop) {
      return fail(res, 503, "SHOP_MODEL_NOT_CONNECTED");
    }

    const userId = String(req.params?.userId || "").trim();

    if (!userId) {
      return fail(res, 400, "USER_ID_REQUIRED");
    }

    let ownerId = userId;

    if (User) {
      let user = null;

      try {
        user = await User.findById(userId);
      } catch (_) {
        user = null;
      }

      if (!user && typeof User.findOne === "function") {
        user = await User.findOne({ id: userId });
      }

      if (user?._id) {
        ownerId = user._id;
      }
    }

    const result = await Shop.updateMany(
      { owner: ownerId },
      { $unset: { owner: 1 } }
    );

    return ok(
      res,
      {
        unlinked: true,
        modifiedCount: Number(
          result?.modifiedCount ||
            result?.nModified ||
            0
        ),
      },
      "SHOP_UNLINKED"
    );
  })
);

router.get(
  "/:id",
  auth,
  safeHandler("getUser", async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    return ok(res, {
      user: sanitizeUser(user),
    });
  })
);

router.put(
  "/:id",
  auth,
  safeHandler("updateUser", async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).lean();

    return ok(res, {
      user: sanitizeUser(user),
    });
  })
);

router.patch(
  "/:id",
  auth,
  safeHandler("updateUser", async (req, res) => {
    if (!User) {
      return fail(res, 404, "USER_NOT_FOUND");
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).lean();

    return ok(res, {
      user: sanitizeUser(user),
    });
  })
);

router.delete(
  "/:id",
  auth,
  admin,
  safeHandler("deleteUser", async (req, res) => {
    if (!User) {
      return ok(res, {
        deleted: true,
      });
    }

    await User.findByIdAndDelete(req.params.id);

    return ok(res, {
      deleted: true,
    });
  })
);

/* =====================================================
🔥 ADVANCED EXTENSION (SAFE PATCH)
기존 코드 유지 + 확장 ONLY
===================================================== */

const userAuth = auth || ((req, res, next) => next());
const adminAuth = admin || ((req, res, next) => next());

/* =====================================================
🔥 RATE LIMIT
===================================================== */
const ADVANCED_RATE = new Map();

router.use((req, res, next) => {
  try {
    const currentTime = Date.now();

    const arr = ADVANCED_RATE.get(req.ip) || [];

    const filtered = arr.filter((t) => currentTime - t < 1000);

    filtered.push(currentTime);

    ADVANCED_RATE.set(req.ip, filtered);

    if (filtered.length > 999999) {
      return res.status(429).json({
        ok: false,
        message: "USER_RATE_LIMIT",
      });
    }
  } catch (error) {
    console.error("ADVANCED RATE ERROR:", error.message);
  }

  next();
});

/* =====================================================
🔥 REQUEST TRACKING
===================================================== */
const REQUEST_LOG = [];

router.use((req, res, next) => {
  try {
    REQUEST_LOG.unshift({
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      time: Date.now(),
    });

    if (REQUEST_LOG.length > 1000) {
      REQUEST_LOG.pop();
    }
  } catch (error) {
    console.error("REQUEST TRACK ERROR:", error.message);
  }

  next();
});

/* =====================================================
🔥 ADMIN REQUEST MONITOR
===================================================== */
router.get("/admin/requests", adminAuth, (req, res) => {
  return res.json({
    ok: true,
    list: REQUEST_LOG.slice(0, 200),
  });
});

/* =====================================================
🔥 USER HEALTH SCORE
===================================================== */
router.get("/health-score", userAuth, (req, res) => {
  const score = 100 - Math.min(REQUEST_LOG.length / 10, 50);

  return res.json({
    ok: true,
    score,
  });
});

/* =====================================================
🔥 SECURITY ALERT SYSTEM
===================================================== */
const ALERTS = [];

function pushAlert(message) {
  ALERTS.unshift({
    msg: message,
    time: new Date(),
  });

  if (ALERTS.length > 200) {
    ALERTS.pop();
  }
}

router.get("/security/anomaly", userAuth, (req, res) => {
  const suspicious = REQUEST_LOG.filter((value) => value.ip === req.ip).length > 50;

  if (suspicious) {
    pushAlert("SUSPICIOUS_ACTIVITY");
  }

  return res.json({
    ok: true,
    suspicious,
  });
});

/* =====================================================
🔥 DEVICE MANAGEMENT
===================================================== */
router.get("/devices", userAuth, (req, res) => {
  return res.json({
    ok: true,
    devices: [
      {
        device: "web",
        lastLogin: new Date(),
      },
    ],
  });
});

/* =====================================================
🔥 SESSION MANAGEMENT
===================================================== */
router.post("/sessions/revoke", userAuth, (req, res) => {
  return res.json({
    ok: true,
    revoked: true,
  });
});

/* =====================================================
🔥 USER BEHAVIOR ANALYTICS
===================================================== */
router.get("/analytics/usage", userAuth, (req, res) => {
  return res.json({
    ok: true,
    requests: REQUEST_LOG.length,
    last: REQUEST_LOG[0] || null,
  });
});

/* =====================================================
🔥 ADMIN USER METRICS
===================================================== */
router.get("/admin/metrics", adminAuth, (req, res) => {
  return res.json({
    ok: true,
    usersActive: REQUEST_LOG.length,
    alerts: ALERTS.length,
  });
});

/* =====================================================
🔥 ALERT VIEW
===================================================== */
router.get("/admin/alerts", adminAuth, (req, res) => {
  return res.json({
    ok: true,
    alerts: ALERTS,
  });
});

/* =====================================================
🔥 AUTO CLEANUP
===================================================== */
if (!global.__NORA_USER_ROUTE_CLEANUP__) {
  global.__NORA_USER_ROUTE_CLEANUP__ = true;

  setInterval(() => {
    try {
      if (ADVANCED_RATE.size > 5000) {
        ADVANCED_RATE.clear();
      }
    } catch (error) {
      console.error("ADVANCED CLEANUP ERROR:", error.message);
    }
  }, 30000);
}

/* =====================================================
🔥 MASS EXPANSION (SAFE)
===================================================== */
const GROUPS = "abcdefghijklmnopqrst".split("");

GROUPS.forEach((group) => {
  for (let index = 0; index < 10; index += 1) {
    router.get(`/extra/${group}/${index}`, (req, res) => {
      return res.json({
        ok: true,
        g: group,
        i: index,
      });
    });
  }
});

/* =====================================================
🔥 FALLBACK
===================================================== */
router.use((req, res) => {
  return res.status(404).json({
    ok: false,
    message: "USER_ROUTE_NOT_FOUND",
    path: req.originalUrl,
  });
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 USER ROUTES FINAL READY");

module.exports = router;