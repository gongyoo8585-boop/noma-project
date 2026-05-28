"use strict";

/* =====================================================
🔥 ROUTES INDEX (FINAL MASTER ULTIMATE)
✔ 기존 기능 100% 유지
✔ 실제 구조 기준 수정
✔ /routes/shop/shop.routes.js 우선 적용
✔ MODULE_NOT_FOUND 로그 노이즈 제거
✔ middleware 적용 순서 수정
✔ FAIL_LOG 누적 제한
✔ Router.use() Object 오류 제거
✔ module.exports 누락 수정
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

const MAX_FAIL_LOG = 50;

const MAX_REQUEST_LOG = 1000;

/* =====================================================
🔥 SAFE LOG
===================================================== */
function pushFailLog(item) {
  FAIL_LOG.push({
    path: item.path || "",
    error: item.error || "UNKNOWN",
    time: item.time || Date.now(),
  });

  while (FAIL_LOG.length > MAX_FAIL_LOG) {
    FAIL_LOG.shift();
  }
}

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path, alt = [], options = {}) {
  const silent = options.silent === true;

  const candidates = [
    path,
    ...(Array.isArray(alt) ? alt : []),
  ];

  for (const candidate of candidates) {
    try {
      if (CACHE.has(candidate)) {
        return CACHE.get(candidate);
      }

      const resolved = require.resolve(candidate);

      const mod = require(resolved);

      CACHE.set(candidate, mod);

      CACHE.set(path, mod);

      return mod;
    } catch (e) {
      if (e && e.code !== "MODULE_NOT_FOUND") {
        if (!silent) {
          console.error(
            "[ROUTE LOAD ERROR]",
            candidate,
            e.message
          );

          pushFailLog({
            path: candidate,
            error: e.message,
            time: Date.now(),
          });
        }

        return null;
      }
    }
  }

  if (!silent) {
    pushFailLog({
      path,
      error: "NOT_FOUND",
      time: Date.now(),
    });
  }

  return null;
}

/* =====================================================
🔥 NORMALIZE ROUTE MODULE
===================================================== */
function normalizeRouteModule(mod, label = "route") {
  if (!mod) {
    return null;
  }

  if (typeof mod === "function") {
    return mod;
  }

  if (mod && typeof mod === "object") {
    const candidates = [
      mod.router,
      mod.default,
      mod.routes,
      mod.route,
      mod.app,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "function") {
        return candidate;
      }
    }

    const fn = Object.values(mod).find(
      (value) => typeof value === "function"
    );

    if (fn) {
      return fn;
    }
  }

  pushFailLog({
    path: label,
    error: `INVALID_ROUTE_MODULE_${typeof mod}`,
    time: Date.now(),
  });

  return null;
}

/* =====================================================
🔥 RATE LIMIT
===================================================== */
const RATE = new Map();

router.use((req, res, next) => {
  const now = Date.now();

  const arr = RATE.get(req.ip) || [];

  const filtered = arr.filter(
    (t) => now - t < 1000
  );

  filtered.push(now);

  RATE.set(req.ip, filtered);

  if (filtered.length > 200) {
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

  while (REQUESTS.length > MAX_REQUEST_LOG) {
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
  "./etc/review.routes",
  [
    "./review/review.routes",
    "./review.routes",
  ],
  { silent: false }
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
const upload = safeRequire(
  "./upload.routes",
  [],
  { silent: true }
);

const coupon = safeRequire(
  "./coupon.routes",
  [],
  { silent: true }
);

const notification = safeRequire(
  "./notification/notification.routes",
  [
    "./notification.routes",
  ],
  { silent: true }
);

const analytics = safeRequire(
  "./analytics/analytics.routes",
  [
    "./analytics.routes",
  ],
  { silent: true }
);

/* =====================================================
🔥 MOUNT
===================================================== */
function mount(path, mod, desc = "") {
  const middleware = normalizeRouteModule(
    mod,
    desc || path
  );

  if (!middleware) {
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

  router.use(path, middleware);

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

mount(
  "/reservations",
  reservation,
  "reservation"
);

mount("/payments", payment, "payment");

mount("/reviews", review, "review");

mount(
  "/payment/verify",
  paymentVerify,
  "paymentVerify"
);

/* =====================================================
🔥 OPTIONAL
===================================================== */
mount("/admin", admin, "admin");

mount("/auth", auth, "auth");

mount("/users", user, "user");

mount("/uploads", upload, "upload");

mount("/coupons", coupon, "coupon");

mount(
  "/notifications",
  notification,
  "notification"
);

mount(
  "/analytics",
  analytics,
  "analytics"
);

/* =====================================================
🔥 ROOT
===================================================== */
router.get("/", (req, res) => {
  return res.json({
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
  return res.json({
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
  return res.json({
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
  return res.status(404).json({
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

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = router;
