"use strict";

/* =====================================================
🔥 ROUTES INDEX (FINAL ULTRA MASTER - ENTERPRISE HARDENED)
👉 기존 기능 100% 유지
👉 안전 로딩 + fallback + registry 보호 + 성능 개선
👉 운영 / 디버그 / 모니터링 완성형
👉 통째 교체 가능
===================================================== */

const express = require("express");
const router = express.Router();

/* =====================================================
🔥 LOAD ROUTES SAFE (강화)
===================================================== */
const LOAD_CACHE = new Map();

function safeRequire(modulePath) {
  try {
    if (LOAD_CACHE.has(modulePath)) {
      return LOAD_CACHE.get(modulePath);
    }

    const mod = require(modulePath);
    LOAD_CACHE.set(modulePath, mod);

    return mod;
  } catch (e) {
    console.error(`❌ ROUTE LOAD FAIL: ${modulePath}`, e.message);
    return null;
  }
}

/* =====================================================
🔥 LOAD ROUTES
===================================================== */
const shopRoutes = safeRequire("./shop.routes");
const reservationRoutes = safeRequire("./reservation.routes");
const paymentRoutes = safeRequire("./payment.routes");

const adminRoutes = safeRequire("./admin.routes");
const authRoutes = safeRequire("./auth.routes");
const userRoutes = safeRequire("./user.routes");
const uploadRoutes = safeRequire("./upload.routes");
const reviewRoutes = safeRequire("./review.routes");
const couponRoutes = safeRequire("./coupon.routes");
const notificationRoutes = safeRequire("./notification.routes");

/* =====================================================
🔥 SAFE UTIL
===================================================== */
const MOUNTED_PATHS = new Set();

function safeMount(path, routeModule) {
  try {
    if (!routeModule) return false;

    if (MOUNTED_PATHS.has(path)) {
      console.warn("⚠️ DUPLICATE ROUTE SKIPPED:", path);
      return false;
    }

    router.use(path, routeModule);
    MOUNTED_PATHS.add(path);

    return true;
  } catch (e) {
    console.error("❌ ROUTE MOUNT ERROR:", path, e.message);
    return false;
  }
}

function now() {
  return Date.now();
}

/* =====================================================
🔥 ROUTE REGISTRY
===================================================== */
const ROUTE_REGISTRY = [];

function register(path, enabled, description = "") {
  ROUTE_REGISTRY.push({
    path,
    enabled: !!enabled,
    description,
    time: now()
  });
}

/* =====================================================
🔥 GLOBAL API META
===================================================== */
router.use((req, res, next) => {
  req.apiStartedAt = req.apiStartedAt || Date.now();
  res.setHeader("X-API-Gateway", "Massage-Platform");
  res.setHeader("X-Route-Count", ROUTE_REGISTRY.length);
  next();
});

/* =====================================================
🔥 CORE ROUTES
===================================================== */
const shopsMounted = safeMount("/shops", shopRoutes);
register("/shops", shopsMounted, "shop API");

const reservationsMounted = safeMount("/reservations", reservationRoutes);
register("/reservations", reservationsMounted, "reservation API");

const paymentsMounted = safeMount("/payments", paymentRoutes);
register("/payments", paymentsMounted, "payment API");

/* =====================================================
🔥 OPTIONAL ROUTES
===================================================== */
const adminMounted = safeMount("/admin", adminRoutes);
register("/admin", adminMounted, "admin API");

const authMounted = safeMount("/auth", authRoutes);
register("/auth", authMounted, "auth API");

const usersMounted = safeMount("/users", userRoutes);
register("/users", usersMounted, "user API");

const uploadsMounted = safeMount("/uploads", uploadRoutes);
register("/uploads", uploadsMounted, "upload API");

const reviewsMounted = safeMount("/reviews", reviewRoutes);
register("/reviews", reviewsMounted, "review API");

const couponsMounted = safeMount("/coupons", couponRoutes);
register("/coupons", couponsMounted, "coupon API");

const notificationsMounted = safeMount("/notifications", notificationRoutes);
register("/notifications", notificationsMounted, "notification API");

/* =====================================================
🔥 ROOT API CHECK
===================================================== */
router.get("/", (req, res) => {
  return res.json({
    ok: true,
    message: "🔥 API ROOT READY",
    time: Date.now(),
    routes: ROUTE_REGISTRY.filter((v) => v.enabled).map((v) => v.path)
  });
});

/* =====================================================
🔥 API HEALTH
===================================================== */
router.get("/health", (req, res) => {
  return res.json({
    ok: true,
    status: "UP",
    time: Date.now(),
    enabledRouteCount: ROUTE_REGISTRY.filter((v) => v.enabled).length,
    disabledRouteCount: ROUTE_REGISTRY.filter((v) => !v.enabled).length,
    cacheSize: LOAD_CACHE.size
  });
});

/* =====================================================
🔥 API ROUTE MAP
===================================================== */
router.get("/routes", (req, res) => {
  return res.json({
    ok: true,
    list: ROUTE_REGISTRY
  });
});

/* =====================================================
🔥 DEBUG
===================================================== */
router.get("/debug", (req, res) => {
  return res.json({
    ok: true,
    now: Date.now(),
    uptime: process.uptime(),
    loadedModules: LOAD_CACHE.size,
    mountedPaths: Array.from(MOUNTED_PATHS),
    routes: {
      shopsMounted,
      reservationsMounted,
      paymentsMounted,
      adminMounted,
      authMounted,
      usersMounted,
      uploadsMounted,
      reviewsMounted,
      couponsMounted,
      notificationsMounted
    }
  });
});

/* =====================================================
🔥 VERSION
===================================================== */
router.get("/version", (req, res) => {
  return res.json({
    ok: true,
    version: process.env.APP_VERSION || "1.0.0",
    env: process.env.NODE_ENV || "development"
  });
});

/* =====================================================
🔥 FALLBACK ROUTE (보호)
===================================================== */
router.use((req, res) => {
  return res.status(404).json({
    ok: false,
    message: "API ROUTE NOT FOUND",
    path: req.originalUrl
  });
});

/* =====================================================
🔥 AUTO CLEAN (추가)
===================================================== */
if (!global.__ROUTES_CLEAN__) {
  global.__ROUTES_CLEAN__ = true;

  setInterval(() => {
    try {
      if (ROUTE_REGISTRY.length > 1000) {
        ROUTE_REGISTRY.splice(0, ROUTE_REGISTRY.length - 500);
      }

      if (LOAD_CACHE.size > 100) {
        LOAD_CACHE.clear();
      }
    } catch {}
  }, 30000);
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 ROUTES INDEX FINAL MASTER READY");

module.exports = router;