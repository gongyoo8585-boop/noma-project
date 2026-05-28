const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

/* =====================================================
 SAFE REQUIRE
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
      console.warn("[payment.routes] require fail:", modulePath, "MODULE_NOT_FOUND");
      return null;
    }

    return require(found);
  } catch (error) {
    console.warn(
      "[payment.routes] require fail:",
      modulePath,
      error.message
    );

    return null;
  }
}

function normalizeControllerModule(mod) {
  if (!mod) {
    return {};
  }

  if (mod && typeof mod === "object") {
    return mod.default || mod.controller || mod.paymentController || mod;
  }

  return {};
}

/* =====================================================
 CONTROLLER
===================================================== */
const paymentController = normalizeControllerModule(
  safeRequire("../../controllers/payment/paymentController") ||
    safeRequire("../../controllers/payment/payment.controller") ||
    safeRequire("../../controllers/payment/payment.Controller") ||
    safeRequire("../controllers/payment/paymentController") ||
    safeRequire("../controllers/payment/payment.controller") ||
    safeRequire("../controllers/payment/payment.Controller") ||
    {}
);

/* =====================================================
 AUTH
===================================================== */
const authModule =
  safeRequire("../../middlewares/auth") ||
  safeRequire("../middlewares/auth") ||
  {};

const auth =
  typeof authModule === "function"
    ? authModule
    : typeof authModule.auth === "function"
    ? authModule.auth
    : (req, res, next) => next();

/* =====================================================
 ADMIN
===================================================== */
function adminOnly(req, res, next) {
  const role = req.user?.role || "";

  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: "UNAUTHORIZED",
    });
  }

  if (!["admin", "superAdmin"].includes(role)) {
    return res.status(403).json({
      ok: false,
      message: "FORBIDDEN",
    });
  }

  next();
}

/* =====================================================
 SAFE ASYNC
===================================================== */
function safeAsync(fn) {
  return async (req, res, next) => {
    try {
      return await fn(req, res, next);
    } catch (error) {
      console.error("[PAYMENT ERROR]", error);

      return res.status(error.status || 500).json({
        ok: false,
        message: error.message || "SERVER_ERROR",
      });
    }
  };
}

/* =====================================================
 SAFE HANDLER
===================================================== */
function safeHandler(handlerName) {
  const handler = paymentController?.[handlerName];

  if (typeof handler === "function") {
    return safeAsync(handler);
  }

  return (req, res) => {
    return res.status(501).json({
      ok: false,
      message: `${handlerName}_NOT_IMPLEMENTED`,
    });
  };
}

/* =====================================================
 OBJECT ID VALIDATION
===================================================== */
function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function validateObjectIdParam(name) {
  return (req, res, next) => {
    if (!isValidId(req.params[name])) {
      return res.status(400).json({
        ok: false,
        message: `invalid ${name}`,
      });
    }

    next();
  };
}

/* =====================================================
 RATE LIMIT
===================================================== */
const RATE = new Map();

router.use((req, res, next) => {
  const now = Date.now();

  const list = RATE.get(req.ip) || [];

  const filtered = list.filter((t) => now - t < 1000);

  filtered.push(now);

  RATE.set(req.ip, filtered);

  if (filtered.length > 100) {
    return res.status(429).json({
      ok: false,
      message: "TOO_MANY_REQUESTS",
    });
  }

  next();
});

/* =====================================================
 HEALTH
===================================================== */
router.get("/health", (req, res) => {
  return res.json({
    ok: true,
    service: "payment",
    time: Date.now(),
  });
});

router.get("/ping", (req, res) => {
  return res.json({
    ok: true,
    pong: true,
  });
});

/* =====================================================
 KAKAO PAY
===================================================== */
router.post(
  "/kakao/ready",
  auth,
  safeHandler("kakaoReady")
);

router.get(
  "/kakao/success",
  safeHandler("kakaoSuccess")
);

router.get(
  "/kakao/cancel",
  safeHandler("kakaoCancel")
);

router.get(
  "/kakao/fail",
  safeHandler("kakaoFail")
);

/* =====================================================
 CORE PAYMENT
===================================================== */
router.post(
  "/checkout",
  auth,
  safeHandler("createCheckout")
);

router.post(
  "/",
  auth,
  safeHandler("createPayment")
);

router.post(
  "/approve",
  auth,
  safeHandler("approvePayment")
);

router.post(
  "/fail",
  auth,
  safeHandler("failPayment")
);

router.post(
  "/cancel",
  auth,
  safeHandler("cancelPayment")
);

router.post(
  "/refund",
  auth,
  safeHandler("refundPayment")
);

router.post(
  "/calculate",
  safeHandler("calculateAmount")
);

router.post(
  "/validate",
  safeHandler("validateCheckout")
);

/* =====================================================
 QUERY
===================================================== */
router.get(
  "/me",
  auth,
  safeHandler("myPayments")
);

router.get(
  "/",
  auth,
  safeHandler("listPayments")
);

router.get(
  "/reservation/:reservationId",
  auth,
  validateObjectIdParam("reservationId"),
  safeHandler("getReservationPayments")
);

router.get(
  "/user/:userId",
  auth,
  safeHandler("getUserPayments")
);

router.get(
  "/shop/:shopId",
  auth,
  validateObjectIdParam("shopId"),
  safeHandler("getShopPayments")
);

router.get(
  "/order/:orderId",
  auth,
  safeHandler("getPaymentByOrderId")
);

router.get(
  "/key/:paymentKey",
  auth,
  safeHandler("getPaymentByKey")
);

router.get(
  "/:paymentId/receipt",
  auth,
  safeHandler("getReceipt")
);

router.get(
  "/:paymentId",
  auth,
  safeHandler("getPayment")
);

/* =====================================================
 MOCK
===================================================== */
router.post(
  "/mock/success",
  auth,
  safeHandler("mockSuccess")
);

router.post(
  "/mock/cancel",
  auth,
  safeHandler("mockCancel")
);

router.post(
  "/mock/fail",
  auth,
  safeHandler("mockFail")
);

/* =====================================================
 ADMIN
===================================================== */
router.get(
  "/admin/logs",
  auth,
  adminOnly,
  safeHandler("getLogs")
);

router.get(
  "/admin/metrics",
  auth,
  adminOnly,
  safeHandler("getMetrics")
);

router.get(
  "/admin/health",
  auth,
  adminOnly,
  safeHandler("getHealth")
);

router.get(
  "/admin/store-size",
  auth,
  adminOnly,
  safeHandler("getStoreSize")
);

router.post(
  "/admin/logs/clear",
  auth,
  adminOnly,
  safeHandler("clearLogs")
);

router.post(
  "/admin/clear-expired",
  auth,
  adminOnly,
  safeHandler("clearExpired")
);

/* =====================================================
 EXTRA
===================================================== */
router.get(
  "/status/:paymentId",
  auth,
  validateObjectIdParam("paymentId"),
  safeHandler("getPaymentStatus")
);

router.get(
  "/recent",
  auth,
  safeHandler("getRecentPayments")
);

router.get(
  "/stats/summary",
  auth,
  safeHandler("getSummaryStats")
);

/* =====================================================
 DEBUG
===================================================== */
const ROUTE_LOGS = [];

router.use((req, res, next) => {
  ROUTE_LOGS.push({
    url: req.originalUrl,
    method: req.method,
    time: Date.now(),
  });

  if (ROUTE_LOGS.length > 5000) {
    ROUTE_LOGS.shift();
  }

  next();
});

router.get(
  "/admin/route-logs",
  auth,
  adminOnly,
  (req, res) => {
    return res.json({
      ok: true,
      logs: ROUTE_LOGS.slice(-200),
    });
  }
);

router.post(
  "/admin/route-logs/clear",
  auth,
  adminOnly,
  (req, res) => {
    ROUTE_LOGS.length = 0;

    return res.json({
      ok: true,
    });
  }
);

/* =====================================================
 CLEAN
===================================================== */
if (!global.__PAYMENT_ROUTES_RATE_CLEANER__) {
  global.__PAYMENT_ROUTES_RATE_CLEANER__ = setInterval(() => {
    if (RATE.size > 5000) {
      RATE.clear();
    }
  }, 30000);

  if (
    global.__PAYMENT_ROUTES_RATE_CLEANER__ &&
    typeof global.__PAYMENT_ROUTES_RATE_CLEANER__.unref === "function"
  ) {
    global.__PAYMENT_ROUTES_RATE_CLEANER__.unref();
  }
}

/* =====================================================
 FALLBACK
===================================================== */
router.use((req, res) => {
  return res.status(404).json({
    ok: false,
    message: "PAYMENT_ROUTE_NOT_FOUND",
    path: req.originalUrl,
  });
});

/* =====================================================
 FINAL
===================================================== */
console.log("🔥 PAYMENT ROUTES FINAL READY");

module.exports = router;
