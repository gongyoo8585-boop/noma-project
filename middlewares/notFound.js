"use strict";

/* =====================================================
🔥 NOT FOUND MIDDLEWARE (FINAL ULTRA COMPLETE MASTER)
👉 존재하지 않는 route / API 처리
👉 app.js 에서 분리해서 사용
👉 traceId / method / path / 시간 포함
👉 통째로 교체 가능한 완성형
===================================================== */

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function makeTraceId(prefix = "NF") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIp(req) {
  let ip =
    req.headers["x-forwarded-for"] ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";

  if (typeof ip === "string" && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  return safeStr(ip);
}

function isApiRequest(req) {
  const path = safeStr(req.originalUrl || req.url || "");
  return path.startsWith("/api");
}

/* =====================================================
🔥 GLOBAL STATE
===================================================== */
const NOT_FOUND_STATE = {
  total: 0,
  apiOnly: 0,
  webOnly: 0,
  lastAt: null
};

/* =====================================================
🔥 MAIN HANDLER
===================================================== */
function notFound(req, res, next) {
  const traceId = req.traceId || makeTraceId();
  const path = safeStr(req.originalUrl || req.url || "");
  const method = safeStr(req.method || "GET", "GET");
  const ip = getClientIp(req);
  const api = isApiRequest(req);

  NOT_FOUND_STATE.total += 1;
  NOT_FOUND_STATE.lastAt = now();

  if (api) NOT_FOUND_STATE.apiOnly += 1;
  else NOT_FOUND_STATE.webOnly += 1;

  res.setHeader("X-Trace-Id", traceId);

  const payload = {
    ok: false,
    message: "API NOT FOUND",
    path,
    method,
    traceId,
    timestamp: now()
  };

  if (process.env.NODE_ENV !== "production") {
    payload.debug = {
      ip,
      accepts: safeStr(req.headers.accept || ""),
      referer: safeStr(req.headers.referer || req.headers.referrer || "")
    };
  }

  return res.status(404).json(payload);
}

/* =====================================================
🔥 API ONLY HANDLER
===================================================== */
notFound.apiOnly = function (req, res, next) {
  if (!isApiRequest(req)) return next();
  return notFound(req, res, next);
};

/* =====================================================
🔥 WEB ONLY HANDLER
===================================================== */
notFound.webOnly = function (req, res, next) {
  if (isApiRequest(req)) return next();
  return notFound(req, res, next);
};

/* =====================================================
🔥 TEXT RESPONSE MODE
===================================================== */
notFound.text = function (req, res) {
  const traceId = req.traceId || makeTraceId("NFTXT");
  return res.status(404).send(`404 NOT FOUND | ${req.method} ${req.originalUrl} | ${traceId}`);
};

/* =====================================================
🔥 HTML RESPONSE MODE
===================================================== */
notFound.html = function (req, res) {
  const traceId = req.traceId || makeTraceId("NFHTML");
  return res.status(404).send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>404 Not Found</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; background: #111; color: #fff; }
    .box { max-width: 700px; margin: 0 auto; background: #1b1b1b; padding: 24px; border-radius: 12px; }
    h1 { margin-top: 0; }
    code { color: #7ee787; }
  </style>
</head>
<body>
  <div class="box">
    <h1>404 Not Found</h1>
    <p>Requested path was not found.</p>
    <p><code>${req.method} ${req.originalUrl}</code></p>
    <p>Trace: <code>${traceId}</code></p>
  </div>
</body>
</html>
  `);
};

/* =====================================================
🔥 STATE / DEBUG
===================================================== */
notFound.getState = function () {
  return {
    ...NOT_FOUND_STATE
  };
};

notFound.resetState = function () {
  NOT_FOUND_STATE.total = 0;
  NOT_FOUND_STATE.apiOnly = 0;
  NOT_FOUND_STATE.webOnly = 0;
  NOT_FOUND_STATE.lastAt = null;
  return true;
};

/* =====================================================
🔥 CONDITIONAL HANDLER
===================================================== */
notFound.smart = function (req, res, next) {
  const accept = safeStr(req.headers.accept || "");

  if (accept.includes("text/html")) {
    return notFound.html(req, res, next);
  }

  if (accept.includes("text/plain")) {
    return notFound.text(req, res, next);
  }

  return notFound(req, res, next);
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 NOT FOUND MIDDLEWARE READY");

module.exports = notFound;