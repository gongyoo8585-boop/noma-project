"use strict";

/* =====================================================
🔥 ROUTES INDEX (FINAL MASTER ULTIMATE)
✔ 기존 기능 100% 유지
✔ 당신 실제 구조 기준 수정
✔ /routes/shop/shop.routes.js 우선 적용
✔ MODULE_NOT_FOUND 해결
✔ 최소 수정만 적용
===================================================== */

const express = require("express");
const router = express.Router();

/* =====================================================
🔥 LOAD SYSTEM
===================================================== */
const CACHE = new Map();
const FAIL_LOG = [];
const ROUTES = [];
const MOUNTED = new Set();

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path, alt = []) {
  try {
    if (CACHE.has(path)) return CACHE.get(path);

    let mod = null;

    try {
      mod = require(path);
    } catch {
      for (const p of alt) {
        try {
          mod = require(p);
          break;
        } catch {}
      }
    }

    if (!mod) throw new Error("NOT_FOUND");

    CACHE.set(path, mod);

    return mod;

  } catch (e) {

    console.error(
      "[ROUTE LOAD FAIL]",
      path,
      e.message
    );

    FAIL_LOG.push({
      path,
      error: e.message,
      time: Date.now(),
    });

    return null;
  }
}

/* =====================================================
🔥 LOAD ROUTES
===================================================== */

/* 🔥 shop */
const shop = safeRequire(
  "./shop/shop.routes",
  [
    "./shop.routes",
    "./shop_routes",
  ]
);

/* 🔥 reservation */
const reservation = safeRequire(
  "./reservation/reservation.routes",
  [
    "./reservation.routes",
  ]
);

/* 🔥 payment */
const payment = safeRequire(
  "./payment/payment.routes",
  [
    "./payment.routes",
  ]
);

/* 🔥 review */
const review = safeRequire(
  "./review/review.routes",
  [
    "./review.routes",
  ]
);

/* 🔥 auth */
const auth = safeRequire(
  "./auth/auth.routes",
  [
    "./auth.routes",
  ]
);

/* 🔥 user */
const user = safeRequire(
  "./user/user.routes",
  [
    "./user.routes",
  ]
);

/* 🔥 admin */
const admin = safeRequire(
  "./admin/admin.routes",
  [
    "./admin.routes",
  ]
);

/* 🔥 payment verify */
const paymentVerify = safeRequire(
  "./payment/payment.verify.routes",
  [
    "./payment.verify.routes",
  ]
);

/* 🔥 optional */
const upload = safeRequire("./upload.routes");
const coupon = safeRequire("./coupon.routes");
const notification = safeRequire("./notification.routes");

/* =====================================================
🔥 MOUNT
===================================================== */
function mount(path, mod, desc = "") {

  if (!mod) {

    ROUTES.push({
      path,
      enabled: false,
      desc,
    });

    return;
  }

  if (MOUNTED.has(path)) {
    return;
  }

  router.use(path, mod);

  MOUNTED.add(path);

  ROUTES.push({
    path,
    enabled: true,
    desc,
    time: Date.now(),
  });
}

/* =====================================================
🔥 CORE
===================================================== */
mount("/shops", shop, "shop");

mount("/reservations", reservation, "reservation");

mount("/payments", payment, "payment");

mount("/reviews", review, "review");

mount("/payment/verify", paymentVerify, "paymentVerify");

/* =====================================================
🔥 OPTIONAL
===================================================== */
mount("/admin", admin, "admin");

mount("/auth", auth, "auth");

mount("/users", user, "user");

mount("/uploads", upload, "upload");

mount("/coupons", coupon, "coupon");

mount("/notifications", notification, "notification");

/* =====================================================
🔥 RATE LIMIT
===================================================== */
const RATE = new Map();

router.use((req, res, next) => {

  const now = Date.now();

  const arr = RATE.get(req.ip) || [];

  const f = arr.filter(
    (t) => now - t < 1000
  );

  f.push(now);

  RATE.set(req.ip, f);

  if (f.length > 200) {

    return res.status(429).json({
      ok: false,
      message: "RATE_LIMIT",
    });
  }

  next();
});

/* =====================================================
🔥 REQUEST TRACKING
===================================================== */
const REQUESTS = [];

router.use((req, res, next) => {

  REQUESTS.unshift({
    ip: req.ip,
    url: req.originalUrl,
    method: req.method,
    time: Date.now(),
  });

  if (REQUESTS.length > 1000) {
    REQUESTS.pop();
  }

  next();
});

/* =====================================================
🔥 META HEADER
===================================================== */
router.use((req, res, next) => {

  res.setHeader("X-API", "Massage");

  res.setHeader(
    "X-Route-Count",
    ROUTES.length
  );

  next();
});

/* =====================================================
🔥 ROOT
===================================================== */
router.get("/", (req, res) => {

  res.json({
    ok: true,
    routes: ROUTES
      .filter((v) => v.enabled)
      .map((v) => v.path),
    total: ROUTES.length,
  });
});

/* =====================================================
🔥 HEALTH
===================================================== */
router.get("/health", (req, res) => {

  res.json({
    ok: true,
    loaded: CACHE.size,
    failed: FAIL_LOG.length,
    mounted: MOUNTED.size,
    uptime: process.uptime(),
  });
});

/* =====================================================
🔥 DEBUG
===================================================== */
router.get("/debug", (req, res) => {

  res.json({
    ok: true,
    routes: ROUTES,
    cache: CACHE.size,
    fail: FAIL_LOG.slice(-20),
  });
});

/* =====================================================
🔥 FALLBACK
===================================================== */
router.use((req, res) => {

  res.status(404).json({
    ok: false,
    message: "API NOT FOUND",
    path: req.originalUrl,
  });
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log(
  "🔥 ROUTES INDEX FINAL READY"
);

module.exports = router;