"use strict";

/**
 * =====================================================
 * 🔥 ROUTES INDEX (FINAL STABLE)
 * =====================================================
 */

const express = require("express");
const path = require("path");

const router = express.Router();

console.log("🔥 ROUTES INDEX LOADED");

const CACHE = new Map();
const ROUTES = [];
const MOUNTED = new Set();
const FAIL_LOG = [];
const RATE = new Map();

function normalizeShopCategory(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();

  if (
    text === "karaoke" ||
    text === "노래방" ||
    text === "가라오케" ||
    text === "coin-karaoke" ||
    text === "coin_karaoke" ||
    text === "nora-karaoke" ||
    text === "nora_karaoke"
  ) {
    return "karaoke";
  }

  if (
    text === "massage" ||
    text === "마사지" ||
    text === "shop" ||
    text === "nora-massage" ||
    text === "nora_massage"
  ) {
    return "massage";
  }

  return "";
}

function getRequestShopCategory(req) {
  const url = String(req?.originalUrl || req?.url || "").toLowerCase();

  return (
    normalizeShopCategory(req?.query?.category) ||
    normalizeShopCategory(req?.query?.shopCategory) ||
    normalizeShopCategory(req?.query?.serviceType) ||
    normalizeShopCategory(req?.query?.businessType) ||
    normalizeShopCategory(req?.query?.adminCategory) ||
    normalizeShopCategory(req?.body?.category) ||
    normalizeShopCategory(req?.body?.shopCategory) ||
    normalizeShopCategory(req?.body?.serviceType) ||
    normalizeShopCategory(req?.body?.businessType) ||
    normalizeShopCategory(req?.body?.adminCategory) ||
    normalizeShopCategory(req?.user?.adminType) ||
    normalizeShopCategory(req?.user?.adminCategory) ||
    normalizeShopCategory(req?.user?.serviceType) ||
    (url.includes("category=karaoke") ? "karaoke" : "") ||
    (url.includes("category=massage") ? "massage" : "") ||
    (url.includes("/karaoke") ? "karaoke" : "") ||
    ""
  );
}

function getSafeRequestShopCategory(req) {
  return getRequestShopCategory(req) || "massage";
}

function applyShopCategoryRequest(req, res, next) {
  try {
    const category = getSafeRequestShopCategory(req);

    req.shopCategory = category;
    req.adminCategory = category;
    req.query = req.query || {};
    req.body = req.body || {};

    req.query.category = category;
    req.query.shopCategory = category;
    req.query.serviceType = category;
    req.query.businessType = category;
    req.query.adminCategory = category;

    req.body.category = category;
    req.body.shopCategory = category;
    req.body.serviceType = category;
    req.body.businessType = category;
    req.body.adminCategory = category;

    return next();
  } catch (e) {
    console.error("ROUTES INDEX SHOP CATEGORY ERROR:", e.message);

    return res.status(500).json({
      ok: false,
      msg: "CATEGORY_FILTER_ERROR",
      message: "CATEGORY_FILTER_ERROR",
    });
  }
}


function safeRequire(pathArg, alt = []) {
  try {
    if (CACHE.has(pathArg)) {
      return CACHE.get(pathArg);
    }

    let mod = null;

    try {
      mod = require(pathArg);
    } catch (err) {
      for (const p of alt) {
        try {
          mod = require(p);
          console.warn(`[ROUTE FALLBACK] ${pathArg} → ${p}`);
          break;
        } catch {}
      }
    }

    if (!mod) {
      throw new Error("MODULE_NOT_FOUND");
    }

    if (mod.default) {
      mod = mod.default;
    }

    CACHE.set(pathArg, mod);

    return mod;
  } catch (err) {
    console.error(`[ROUTE LOAD FAIL] ${pathArg}`, err.message);

    FAIL_LOG.push({
      path: pathArg,
      error: err.message,
      time: Date.now(),
    });

    return null;
  }
}

function mount(pathUrl, mod, desc = "") {
  if (!mod) {
    ROUTES.push({
      path: pathUrl,
      enabled: false,
      desc,
    });

    return;
  }

  if (MOUNTED.has(pathUrl)) {
    return;
  }

  if (
    typeof mod !== "function" &&
    typeof mod?.use !== "function"
  ) {
    ROUTES.push({
      path: pathUrl,
      enabled: false,
      desc,
      error: "INVALID_ROUTER",
    });

    console.error(`[ROUTE INVALID] ${pathUrl}`);

    return;
  }

  console.log(`🔥 MOUNT: ${pathUrl}`);

  if (desc === "shop" || pathUrl === "/shops") {
    router.use(pathUrl, applyShopCategoryRequest, mod);
  } else {
    router.use(pathUrl, mod);
  }

  MOUNTED.add(pathUrl);

  ROUTES.push({
    path: pathUrl,
    enabled: true,
    desc,
    time: Date.now(),
  });
}

/* =====================================================
🔥 LOAD ROUTES
===================================================== */

const shopRoutes = safeRequire(
  path.join(__dirname, "shop_routes"),
  [
    path.join(__dirname, "shop.routes"),
    path.join(__dirname, "shop/shop.routes"),
  ]
);

const reservationRoutes = safeRequire(
  path.join(__dirname, "reservation.routes"),
  [
    path.join(__dirname, "reservation_routes"),
    path.join(__dirname, "reservation/reservation.routes"),
  ]
);

const paymentRoutes = safeRequire(
  path.join(__dirname, "payment.routes"),
  [
    path.join(__dirname, "payment_routes"),
    path.join(__dirname, "payment/payment.routes"),
  ]
);

const paymentVerifyRoutes = safeRequire(
  path.join(__dirname, "payment.verify.routes"),
  [
    path.join(__dirname, "payment_verify.routes"),
    path.join(__dirname, "payment/payment.verify.routes"),
  ]
);

const authRoutes = safeRequire(
  path.join(__dirname, "auth.routes"),
  [
    path.join(__dirname, "auth_routes"),
    path.join(__dirname, "auth/auth.routes"),
  ]
);

const userRoutes = safeRequire(
  path.join(__dirname, "user.routes"),
  [
    path.join(__dirname, "user_routes"),
    path.join(__dirname, "user/user.routes"),
  ]
);

const adminRoutes = safeRequire(
  path.join(__dirname, "admin/admin.routes"),
  [
    path.join(__dirname, "admin.routes"),
    path.join(__dirname, "admin/admin_routes"),
  ]
);

const adminDashboardRoutes = safeRequire(
  path.join(__dirname, "admin/admin.dashboard.routes"),
  [
    path.join(__dirname, "admin/admin_dashboard.routes"),
    path.join(__dirname, "admin.dashboard.routes"),
  ]
);

const mapRoutes = safeRequire(
  path.join(__dirname, "map.routes"),
  [
    path.join(__dirname, "map_routes"),
  ]
);

const reviewRoutes = safeRequire(
  path.join(__dirname, "review.routes"),
  [
    path.join(__dirname, "review_routes"),
    path.join(__dirname, "review/review.routes"),
  ]
);

/* =====================================================
🔥 MOUNT
===================================================== */

console.log("🔥 shopRoutes loaded:", !!shopRoutes);
console.log("🔥 reviewRoutes loaded:", !!reviewRoutes);
console.log("🔥 reservationRoutes loaded:", !!reservationRoutes);
console.log("🔥 paymentRoutes loaded:", !!paymentRoutes);
console.log("🔥 authRoutes loaded:", !!authRoutes);
console.log("🔥 userRoutes loaded:", !!userRoutes);
console.log("🔥 adminRoutes loaded:", !!adminRoutes);

mount("/shops", shopRoutes, "shop");
mount("/reservations", reservationRoutes, "reservation");
mount("/payments", paymentRoutes, "payment");
mount("/payment/verify", paymentVerifyRoutes, "payment-verify");
mount("/auth", authRoutes, "auth");
mount("/users", userRoutes, "user");
mount("/admin", adminRoutes, "admin");

if (adminDashboardRoutes) {
  mount("/admin/dashboard", adminDashboardRoutes, "admin-dashboard");
}

mount("/map", mapRoutes, "map");
mount("/reviews", reviewRoutes, "review");

/* =====================================================
🔥 ROUTE INFO
===================================================== */

router.get("/", (req, res) => {
  res.json({
    ok: true,
    routes: ROUTES.filter((r) => r.enabled).map((r) => r.path),
    total: ROUTES.length,
    mounted: MOUNTED.size,
  });
});

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    routes: MOUNTED.size,
    failed: FAIL_LOG.length,
    memory: process.memoryUsage(),
    time: new Date(),
  });
});

router.get("/debug", (req, res) => {
  res.json({
    ok: true,
    routes: ROUTES,
    cache: CACHE.size,
    fails: FAIL_LOG.slice(-20),
  });
});

/* =====================================================
🔥 LOCAL RATE LIMIT
===================================================== */

router.use((req, res, next) => {
  const now = Date.now();
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

  let data = RATE.get(ip);

  if (!data) {
    data = {
      count: 1,
      ts: now,
    };

    RATE.set(ip, data);

    return next();
  }

  if (now - data.ts > 1000) {
    data.count = 1;
    data.ts = now;

    return next();
  }

  data.count++;

  if (data.count > 150) {
    return res.status(429).json({
      ok: false,
      msg: "RATE_LIMIT",
      message: "RATE_LIMIT",
    });
  }

  next();
});

/* =====================================================
🔥 404
===================================================== */

router.use((req, res) => {
  console.warn("404:", req.originalUrl);

  res.status(404).json({
    ok: false,
    msg: "API_NOT_FOUND",
    message: "API_NOT_FOUND",
    path: req.originalUrl,
  });
});

/* =====================================================
🔥 CLEANUP
===================================================== */

setInterval(() => {
  if (CACHE.size > 200) {
    CACHE.clear();
  }

  if (FAIL_LOG.length > 1000) {
    FAIL_LOG.splice(0, 500);
  }

  const now = Date.now();

  for (const [ip, data] of RATE.entries()) {
    if (now - data.ts > 10000) {
      RATE.delete(ip);
    }
  }
}, 30000);

module.exports = router;