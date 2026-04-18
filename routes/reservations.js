/**
 * =====================================================
 * 🔥 RESERVATION ROUTES (FINAL ULTRA COMPLETE MASTER)
 * 👉 기존 기능 보존 + 오류 수정 + 운영 기능 확장
 * 👉 /routes/reservations.js 전용 완성본
 * =====================================================
 */

const express = require("express");
const router = express.Router();

const Reservation = require("../models/Reservation");
const Shop = require("../models/Shop");

const auth = require("../middlewares/auth");
const admin = require("../middlewares/admin");

/* =====================================================
   공통 유틸
===================================================== */
function ok(res, data = {}) {
  return res.json({ ok: true, ...data });
}

function fail(res, status = 500, data = {}) {
  return res.status(status).json({ ok: false, ...data });
}

function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("RESERVATION ROUTE ERROR:", e);
      fail(res, 500, { message: e.message || "SERVER ERROR" });
    });
  };
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function safeStr(v = "") {
  return String(v || "").trim();
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes", "y"].includes(v.toLowerCase());
  return false;
}

function safePage(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function safeLimit(v) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, 100);
}

function parseReserveTime(date, time) {
  if (date && time) {
    const d = new Date(`${date} ${time}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  if (time) {
    const d = new Date(time);
    if (!Number.isNaN(d.getTime())) return d;
  }

  if (date) {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function paginateMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    hasMore: page * limit < total
  };
}

function normalizeReservation(doc) {
  const r = doc.toObject ? doc.toObject() : { ...doc };

  return {
    ...r,
    id: String(r._id || r.id || ""),
    userId: String(r.userId || ""),
    placeId: String(r.placeId || ""),
    reserveAt: r.time || null
  };
}

async function findReservationOr404(id) {
  if (!isValidId(id)) return null;
  return Reservation.findById(id);
}

function isOwnerOrAdmin(req, reservation) {
  const me = String(req.user?.id || req.user?._id || "");
  const owner = String(reservation.userId || "");
  const role = String(req.user?.role || "");

  return owner === me || role === "admin" || role === "superAdmin";
}

/* =====================================================
   메모리 캐시 / 로그 / 보호
===================================================== */
const RESERVATION_CACHE = new Map();
const RESERVATION_LOG = [];
const REQUEST_RATE = new Map();
const CREATE_LOCK = new Set();

function cacheSet(key, data, ttl = 5000) {
  RESERVATION_CACHE.set(key, {
    data,
    expire: Date.now() + ttl
  });
}

function cacheGet(key) {
  const c = RESERVATION_CACHE.get(key);
  if (!c) return null;
  if (Date.now() > c.expire) {
    RESERVATION_CACHE.delete(key);
    return null;
  }
  return c.data;
}

function rateLimit(req, ms = 150, max = 15) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const arr = REQUEST_RATE.get(ip) || [];
  const filtered = arr.filter((t) => now - t < ms * max);
  filtered.push(now);
  REQUEST_RATE.set(ip, filtered);
  return filtered.length <= max;
}

function addLog(type, payload = {}) {
  RESERVATION_LOG.push({
    type,
    payload,
    time: Date.now()
  });

  if (RESERVATION_LOG.length > 5000) {
    RESERVATION_LOG.shift();
  }
}

/* =====================================================
   전역 미들웨어
===================================================== */
router.use((req, res, next) => {
  if (!rateLimit(req)) {
    return fail(res, 429, { message: "Too many requests" });
  }
  next();
});

router.use((req, res, next) => {
  addLog("request", {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });
  next();
});

/* =====================================================
   1. 예약 생성
===================================================== */
router.post("/", auth, safeAsync(async (req, res) => {
  const userId = String(req.user?.id || req.user?._id || "");
  const {
    shopId,
    placeId,
    date,
    time,
    people = 1,
    memo = "",
    source = "app",
    device = "",
    contactPhone = "",
    specialRequest = ""
  } = req.body;

  const finalPlaceId = String(shopId || placeId || "");
  if (!isValidId(finalPlaceId)) {
    return fail(res, 400, { message: "invalid placeId" });
  }

  const shop = await Shop.findById(finalPlaceId);
  if (!shop || shop.isDeleted) {
    return fail(res, 404, { message: "shop not found" });
  }

  if (shop.isReservable === false) {
    return fail(res, 400, { message: "shop not reservable" });
  }

  const reserveTime = parseReserveTime(date, time);
  if (!reserveTime) {
    return fail(res, 400, { message: "invalid reservation time" });
  }

  const lockKey = `${userId}_${finalPlaceId}_${reserveTime.toISOString()}`;
  if (CREATE_LOCK.has(lockKey)) {
    return fail(res, 429, { message: "duplicated request" });
  }

  CREATE_LOCK.add(lockKey);
  setTimeout(() => CREATE_LOCK.delete(lockKey), 3000);

  const limitCheck = typeof Reservation.limitPerUserStrict === "function"
    ? await Reservation.limitPerUserStrict(userId)
    : { allowed: true, count: 0 };

  if (!limitCheck.allowed) {
    return fail(res, 400, { message: "reservation limit exceeded", current: limitCheck.count });
  }

  const conflict = typeof Reservation.checkConflictFinal === "function"
    ? await Reservation.checkConflictFinal(finalPlaceId, reserveTime)
    : await Reservation.exists({
        placeId: String(finalPlaceId),
        time: reserveTime,
        status: { $in: ["pending", "confirmed"] }
      });

  if (conflict) {
    return fail(res, 409, { message: "reservation conflict" });
  }

  const reservation = await Reservation.create({
    userId,
    placeId: String(finalPlaceId),
    time: reserveTime,
    people: Math.max(1, safeNum(people, 1)),
    memo: safeStr(memo),
    source: safeStr(source || "app"),
    device: safeStr(device),
    contactPhone: safeStr(contactPhone),
    specialRequest: safeStr(specialRequest),
    status: "pending",
    isActive: true
  });

  try {
    shop.reservationCount = safeNum(shop.reservationCount) + 1;
    if (typeof shop.updateReservable === "function") {
      await shop.updateReservable();
    } else {
      await shop.save();
    }
  } catch (e) {
    console.warn("SHOP RESERVATION COUNT UPDATE FAIL:", e.message);
  }

  RESERVATION_CACHE.clear();
  addLog("create", { reservationId: reservation._id, userId, placeId: finalPlaceId });

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   2. 내 예약 조회
===================================================== */
router.get("/me", auth, safeAsync(async (req, res) => {
  const userId = String(req.user?.id || req.user?._id || "");
  const page = safePage(req.query.page);
  const limit = safeLimit(req.query.limit);
  const status = safeStr(req.query.status);

  const query = { userId };
  if (status) query.status = status;

  const [list, total] = await Promise.all([
    Reservation.find(query)
      .sort({ time: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Reservation.countDocuments(query)
  ]);

  ok(res, {
    list: list.map(normalizeReservation),
    ...paginateMeta(page, limit, total)
  });
}));

/* =====================================================
   3. 예약 상세
===================================================== */
router.get("/:id([0-9a-fA-F]{24})", auth, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (!isOwnerOrAdmin(req, reservation)) {
    return fail(res, 403);
  }

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   4. 예약 취소
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/cancel", auth, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (!isOwnerOrAdmin(req, reservation)) {
    return fail(res, 403);
  }

  const reason = safeStr(req.body.reason);

  if (typeof reservation.cancelSafe === "function") {
    await reservation.cancelSafe(reason);
  } else {
    reservation.status = "cancelled";
    reservation.cancelledAt = new Date();
    reservation.cancelReason = reason;
    reservation.isActive = false;
    await reservation.save();
  }

  RESERVATION_CACHE.clear();
  addLog("cancel", { reservationId: reservation._id, reason });

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   5. 예약 승인
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/approve", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.confirm === "function") {
    await reservation.confirm(String(req.user?.id || req.user?._id || ""));
  } else {
    reservation.status = "confirmed";
    reservation.confirmedAt = new Date();
    await reservation.save();
  }

  RESERVATION_CACHE.clear();
  addLog("approve", { reservationId: reservation._id });

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   6. 예약 거절
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/reject", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  reservation.status = "cancelled";
  reservation.cancelledAt = new Date();
  reservation.cancelReason = safeStr(req.body.reason || "rejected by admin");
  reservation.isActive = false;
  await reservation.save();

  RESERVATION_CACHE.clear();
  addLog("reject", { reservationId: reservation._id });

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   7. 예약 변경
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/reschedule", auth, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (!isOwnerOrAdmin(req, reservation)) {
    return fail(res, 403);
  }

  const reserveTime = parseReserveTime(req.body.date, req.body.time);
  if (!reserveTime) {
    return fail(res, 400, { message: "invalid reservation time" });
  }

  const conflict = typeof Reservation.checkConflictFinal === "function"
    ? await Reservation.checkConflictFinal(reservation.placeId, reserveTime)
    : await Reservation.exists({
        placeId: String(reservation.placeId),
        time: reserveTime,
        status: { $in: ["pending", "confirmed"] },
        _id: { $ne: reservation._id }
      });

  if (conflict) {
    return fail(res, 409, { message: "reservation conflict" });
  }

  reservation.time = reserveTime;
  reservation.status = "pending";
  await reservation.save();

  RESERVATION_CACHE.clear();
  addLog("reschedule", { reservationId: reservation._id });

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   8. 인원 변경
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/people", auth, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (!isOwnerOrAdmin(req, reservation)) {
    return fail(res, 403);
  }

  reservation.people = Math.max(1, safeNum(req.body.people, 1));
  await reservation.save();

  RESERVATION_CACHE.clear();
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   9. 메모 수정
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/memo", auth, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (!isOwnerOrAdmin(req, reservation)) {
    return fail(res, 403);
  }

  reservation.memo = safeStr(req.body.memo);
  await reservation.save();

  RESERVATION_CACHE.clear();
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   10. 체크인
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/check-in", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.checkIn === "function") {
    await reservation.checkIn();
  } else {
    reservation.checkInAt = new Date();
    await reservation.save();
  }

  addLog("check-in", { reservationId: reservation._id });
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   11. 체크아웃
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/check-out", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.checkOut === "function") {
    await reservation.checkOut();
  } else {
    reservation.checkOutAt = new Date();
    await reservation.save();
  }

  addLog("check-out", { reservationId: reservation._id });
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   12. 도착 처리
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/arrive", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.arrive === "function") {
    await reservation.arrive();
  } else {
    reservation.arrivalAt = new Date();
    await reservation.save();
  }

  addLog("arrive", { reservationId: reservation._id });
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   13. 완료 처리
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/complete", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.complete === "function") {
    await reservation.complete();
  } else {
    reservation.isCompleted = true;
    reservation.completedAt = new Date();
    reservation.isActive = false;
    await reservation.save();
  }

  addLog("complete", { reservationId: reservation._id });
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   14. 노쇼 처리
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/no-show", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.markNoShow === "function") {
    await reservation.markNoShow();
  } else {
    reservation.isNoShow = true;
    reservation.status = "cancelled";
    await reservation.save();
  }

  addLog("no-show", { reservationId: reservation._id });
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   15. 방문 처리
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/visited", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.markVisited === "function") {
    await reservation.markVisited();
  } else {
    reservation.isVisited = true;
    await reservation.save();
  }

  addLog("visited", { reservationId: reservation._id });
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   16. 리뷰 완료 처리
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/reviewed", auth, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (!isOwnerOrAdmin(req, reservation)) {
    return fail(res, 403);
  }

  if (typeof reservation.markReviewed === "function") {
    await reservation.markReviewed();
  } else {
    reservation.isReviewed = true;
    await reservation.save();
  }

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   17. 결제 처리
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/pay", auth, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (!isOwnerOrAdmin(req, reservation)) {
    return fail(res, 403);
  }

  const amount = safeNum(req.body.amount, reservation.paymentAmount || 0);

  if (typeof reservation.attachPayment === "function") {
    await reservation.attachPayment(
      safeStr(req.body.paymentId),
      amount
    );
  } else if (typeof reservation.pay === "function") {
    await reservation.pay(amount);
  } else {
    reservation.paymentStatus = "paid";
    reservation.paymentAmount = amount;
    await reservation.save();
  }

  addLog("pay", { reservationId: reservation._id, amount });
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   18. 환불 처리
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/refund", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.refund === "function") {
    await reservation.refund();
  } else {
    reservation.paymentStatus = "refund";
    await reservation.save();
  }

  addLog("refund", { reservationId: reservation._id });
  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   19. 알림 발송 표시
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/reminder", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.markReminder === "function") {
    await reservation.markReminder();
  } else {
    reservation.isReminderSent = true;
    reservation.reminderAt = new Date();
    await reservation.save();
  }

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   20. 관리자 메모
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/admin-memo", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.setAdminMemo === "function") {
    await reservation.setAdminMemo(req.body.adminMemo);
  } else {
    reservation.adminMemo = safeStr(req.body.adminMemo);
    await reservation.save();
  }

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   21. 수정자 기록
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/updated-by", auth, admin, safeAsync(async (req, res) => {
  const reservation = await findReservationOr404(req.params.id);
  if (!reservation) return fail(res, 404);

  if (typeof reservation.setUpdatedBy === "function") {
    await reservation.setUpdatedBy(String(req.user?.id || req.user?._id || ""));
  } else {
    reservation.lastUpdatedBy = String(req.user?.id || req.user?._id || "");
    await reservation.save();
  }

  ok(res, { reservation: normalizeReservation(reservation) });
}));

/* =====================================================
   22. 예약 가능 여부 체크
===================================================== */
router.post("/check", safeAsync(async (req, res) => {
  const placeId = String(req.body.shopId || req.body.placeId || "");
  const reserveTime = parseReserveTime(req.body.date, req.body.time);

  if (!isValidId(placeId) || !reserveTime) {
    return fail(res, 400, { available: false });
  }

  const available = typeof Reservation.isSlotAvailable === "function"
    ? await Reservation.isSlotAvailable(placeId, reserveTime, safeNum(req.body.max, 10))
    : !(await Reservation.exists({
        placeId,
        time: reserveTime,
        status: { $ne: "cancelled" }
      }));

  ok(res, { available });
}));

/* =====================================================
   23. 슬롯 수 조회
===================================================== */
router.get("/slot/count", safeAsync(async (req, res) => {
  const placeId = String(req.query.shopId || req.query.placeId || "");
  const reserveTime = parseReserveTime(req.query.date, req.query.time);

  if (!isValidId(placeId) || !reserveTime) {
    return fail(res, 400);
  }

  const count = typeof Reservation.getSlotCount === "function"
    ? await Reservation.getSlotCount(placeId, reserveTime)
    : await Reservation.countDocuments({
        placeId,
        time: reserveTime,
        status: { $ne: "cancelled" }
      });

  ok(res, { count });
}));

/* =====================================================
   24. 내 히스토리
===================================================== */
router.get("/me/history", auth, safeAsync(async (req, res) => {
  const userId = String(req.user?.id || req.user?._id || "");
  const list = typeof Reservation.getUserHistory === "function"
    ? await Reservation.getUserHistory(userId)
    : await Reservation.find({ userId }).sort({ createdAt: -1 }).limit(50);

  ok(res, { list: list.map(normalizeReservation) });
}));

/* =====================================================
   25. 예약 코드 조회
===================================================== */
router.get("/code/:code", auth, admin, safeAsync(async (req, res) => {
  const item = typeof Reservation.findByReserveCode === "function"
    ? await Reservation.findByReserveCode(req.params.code)
    : await Reservation.findOne({ reserveCode: req.params.code });

  if (!item) return fail(res, 404);
  ok(res, { reservation: normalizeReservation(item) });
}));

/* =====================================================
   26. 방문 코드 조회
===================================================== */
router.get("/visit-code/:code", auth, admin, safeAsync(async (req, res) => {
  const item = typeof Reservation.findByVisitCode === "function"
    ? await Reservation.findByVisitCode(req.params.code)
    : await Reservation.findOne({ visitCode: req.params.code });

  if (!item) return fail(res, 404);
  ok(res, { reservation: normalizeReservation(item) });
}));

/* =====================================================
   27. 전체 조회(관리자)
===================================================== */
router.get("/admin/all", auth, admin, safeAsync(async (req, res) => {
  const page = safePage(req.query.page);
  const limit = safeLimit(req.query.limit);
  const status = safeStr(req.query.status);
  const placeId = safeStr(req.query.placeId);
  const userId = safeStr(req.query.userId);

  const query = {};
  if (status) query.status = status;
  if (placeId) query.placeId = placeId;
  if (userId) query.userId = userId;

  const [list, total] = await Promise.all([
    Reservation.find(query)
      .sort({ time: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Reservation.countDocuments(query)
  ]);

  ok(res, {
    list: list.map(normalizeReservation),
    ...paginateMeta(page, limit, total)
  });
}));

/* =====================================================
   28. 상태별 조회
===================================================== */
router.get("/status/list", auth, admin, safeAsync(async (req, res) => {
  const status = safeStr(req.query.status);
  const list = await Reservation.find({ status }).sort({ createdAt: -1 }).limit(200);
  ok(res, { list: list.map(normalizeReservation) });
}));

/* =====================================================
   29. 오늘 예약
===================================================== */
router.get("/today/list", auth, admin, safeAsync(async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const list = await Reservation.find({
    time: { $gte: start, $lt: end }
  }).sort({ time: 1 });

  ok(res, { list: list.map(normalizeReservation) });
}));

/* =====================================================
   30. 다가오는 예약
===================================================== */
router.get("/upcoming/list", auth, admin, safeAsync(async (req, res) => {
  const list = typeof Reservation.findUpcoming === "function"
    ? await Reservation.findUpcoming(50)
    : await Reservation.find({
        time: { $gte: new Date() },
        status: { $ne: "cancelled" }
      }).sort({ time: 1 }).limit(50);

  ok(res, { list: list.map(normalizeReservation) });
}));

/* =====================================================
   31. 완료 예약
===================================================== */
router.get("/completed/list", auth, admin, safeAsync(async (req, res) => {
  const list = typeof Reservation.findCompleted === "function"
    ? await Reservation.findCompleted(50)
    : await Reservation.find({ isCompleted: true }).sort({ completedAt: -1 }).limit(50);

  ok(res, { list: list.map(normalizeReservation) });
}));

/* =====================================================
   32. 만료 대상 조회
===================================================== */
router.get("/expired/list", auth, admin, safeAsync(async (req, res) => {
  const list = typeof Reservation.findExpiredPending === "function"
    ? await Reservation.findExpiredPending()
    : await Reservation.find({
        status: "pending",
        expireAt: { $lte: new Date() }
      });

  ok(res, { list: list.map(normalizeReservation) });
}));

/* =====================================================
   33. 자동 만료 실행
===================================================== */
router.post("/admin/expire-run", auth, admin, safeAsync(async (req, res) => {
  const list = await Reservation.find({
    status: "pending",
    expireAt: { $lte: new Date() }
  });

  for (const item of list) {
    if (typeof item.autoExpireSafeFinal === "function") {
      await item.autoExpireSafeFinal();
    } else if (typeof item.autoExpireSafe === "function") {
      await item.autoExpireSafe();
    } else {
      item.status = "cancelled";
      item.isActive = false;
      await item.save();
    }
  }

  RESERVATION_CACHE.clear();
  ok(res, { count: list.length });
}));

/* =====================================================
   34. 통계
===================================================== */
router.get("/stats", auth, admin, safeAsync(async (req, res) => {
  const cacheKey = "reservation_stats";
  const cached = cacheGet(cacheKey);
  if (cached) return ok(res, cached);

  const [total, pending, confirmed, cancelled, completed, noShow, paidRevenue] = await Promise.all([
    Reservation.countDocuments(),
    Reservation.countDocuments({ status: "pending" }),
    Reservation.countDocuments({ status: "confirmed" }),
    Reservation.countDocuments({ status: "cancelled" }),
    Reservation.countDocuments({ isCompleted: true }),
    Reservation.countDocuments({ isNoShow: true }),
    typeof Reservation.getRevenue === "function" ? Reservation.getRevenue() : 0
  ]);

  const payload = { total, pending, confirmed, cancelled, completed, noShow, paidRevenue };
  cacheSet(cacheKey, payload, 3000);

  ok(res, payload);
}));

/* =====================================================
   35. 성공률
===================================================== */
router.get("/stats/success-rate", auth, admin, safeAsync(async (req, res) => {
  const rate = typeof Reservation.getSuccessRate === "function"
    ? await Reservation.getSuccessRate()
    : 0;

  ok(res, { rate });
}));

/* =====================================================
   36. 취소율
===================================================== */
router.get("/stats/cancel-rate", auth, admin, safeAsync(async (req, res) => {
  const rate = typeof Reservation.getCancelRate === "function"
    ? await Reservation.getCancelRate()
    : 0;

  ok(res, { rate });
}));

/* =====================================================
   37. 인기 시간대
===================================================== */
router.get("/stats/hot-times", auth, admin, safeAsync(async (req, res) => {
  const placeId = String(req.query.shopId || req.query.placeId || "");
  if (!placeId) return fail(res, 400);

  const items = typeof Reservation.getHotTimes === "function"
    ? await Reservation.getHotTimes(placeId)
    : [];

  ok(res, { items });
}));

/* =====================================================
   38. 랭킹
===================================================== */
router.get("/ranking", auth, admin, safeAsync(async (req, res) => {
  const items = typeof Reservation.getRanking === "function"
    ? await Reservation.getRanking()
    : [];

  ok(res, { items });
}));

/* =====================================================
   39. 예약 로그
===================================================== */
router.get("/admin/log", auth, admin, safeAsync(async (req, res) => {
  ok(res, { logs: RESERVATION_LOG.slice(-100) });
}));

/* =====================================================
   40. 캐시 상태
===================================================== */
router.get("/admin/cache/status", auth, admin, safeAsync(async (req, res) => {
  ok(res, { size: RESERVATION_CACHE.size });
}));

/* =====================================================
   41. 캐시 초기화
===================================================== */
router.post("/admin/cache/clear", auth, admin, safeAsync(async (req, res) => {
  RESERVATION_CACHE.clear();
  ok(res);
}));

/* =====================================================
   42. 관리자 메모 검색
===================================================== */
router.get("/admin/search/memo", auth, admin, safeAsync(async (req, res) => {
  const q = safeStr(req.query.q);
  const list = await Reservation.find({
    adminMemo: { $regex: q, $options: "i" }
  }).limit(100);

  ok(res, { list: list.map(normalizeReservation) });
}));

/* =====================================================
   43. 사용자별 조회
===================================================== */
router.get("/admin/by-user/:userId", auth, admin, safeAsync(async (req, res) => {
  const list = await Reservation.find({
    userId: String(req.params.userId)
  }).sort({ createdAt: -1 });

  ok(res, { list: list.map(normalizeReservation) });
}));

/* =====================================================
   44. 매장별 조회
===================================================== */
router.get("/admin/by-place/:placeId", auth, admin, safeAsync(async (req, res) => {
  const list = await Reservation.find({
    placeId: String(req.params.placeId)
  }).sort({ createdAt: -1 });

  ok(res, { list: list.map(normalizeReservation) });
}));

/* =====================================================
   45. 벌크 취소
===================================================== */
router.post("/admin/bulk-cancel", auth, admin, safeAsync(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(isValidId) : [];

  await Reservation.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status: "cancelled",
        isActive: false,
        cancelledAt: new Date()
      }
    }
  );

  RESERVATION_CACHE.clear();
  ok(res);
}));

/* =====================================================
   46. 벌크 승인
===================================================== */
router.post("/admin/bulk-approve", auth, admin, safeAsync(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(isValidId) : [];

  await Reservation.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status: "confirmed",
        confirmedAt: new Date()
      }
    }
  );

  RESERVATION_CACHE.clear();
  ok(res);
}));

/* =====================================================
   47. 벌크 완료
===================================================== */
router.post("/admin/bulk-complete", auth, admin, safeAsync(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(isValidId) : [];

  await Reservation.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        isCompleted: true,
        completedAt: new Date(),
        isActive: false
      }
    }
  );

  RESERVATION_CACHE.clear();
  ok(res);
}));

/* =====================================================
   48. 핑
===================================================== */
router.get("/ping", (req, res) => {
  ok(res, { time: Date.now() });
});

/* =====================================================
   49. 헬스
===================================================== */
router.get("/health", safeAsync(async (req, res) => {
  const one = await Reservation.findOne().select("_id");
  ok(res, { exists: !!one });
}));

/* =====================================================
   50. 디버그
===================================================== */
router.get("/debug/final", auth, admin, safeAsync(async (req, res) => {
  ok(res, {
    cacheSize: RESERVATION_CACHE.size,
    logSize: RESERVATION_LOG.length,
    now: Date.now()
  });
}));

/* =====================================================
   자동 백그라운드 안정화
===================================================== */
setInterval(async () => {
  try {
    const expired = await Reservation.find({
      status: "pending",
      expireAt: { $lte: new Date() }
    }).limit(50);

    for (const item of expired) {
      if (typeof item.autoExpireSafeFinal === "function") {
        await item.autoExpireSafeFinal();
      } else if (typeof item.autoExpireSafe === "function") {
        await item.autoExpireSafe();
      }
    }
  } catch (e) {
    console.error("RESERVATION AUTO EXPIRE ERROR:", e.message);
  }
}, 60000);

setInterval(() => {
  if (REQUEST_RATE.size > 5000) REQUEST_RATE.clear();
  if (RESERVATION_CACHE.size > 500) RESERVATION_CACHE.clear();
}, 30000);

/* =====================================================
   FINAL
===================================================== */
console.log("🔥 RESERVATION ROUTES FINAL MASTER READY");
/* =====================================================
🔥 FINAL ULTRA EXTENSION v2 (ADD ONLY / NO MODIFY)
👉 위치: module.exports = router; 바로 위
===================================================== */

/* =========================
1. safe reservation normalize 강화
========================= */
function __safeNormalize(r){
  if(!r) return null;

  const obj = r.toObject ? r.toObject() : { ...r };

  return {
    ...obj,
    id: String(obj._id || ""),
    userId: String(obj.userId || ""),
    placeId: String(obj.placeId || ""),
    reserveAt: obj.time || null
  };
}

/* =========================
2. 존재 체크 + 안전 반환
========================= */
async function __findSafe(id){
  if(!isValidId(id)) return null;
  return await Reservation.findById(id);
}

/* =========================
3. 예약 존재 여부 API
========================= */
router.get("/exists/:id", safeAsync(async (req,res)=>{
  const item = await __findSafe(req.params.id);
  ok(res, { exists: !!item });
}));

/* =========================
4. 예약 단일 조회 (공용)
========================= */
router.get("/one/:id", safeAsync(async (req,res)=>{
  const item = await __findSafe(req.params.id);
  if(!item) return fail(res,404);

  ok(res,{ reservation: __safeNormalize(item) });
}));

/* =========================
5. 최근 예약 1건
========================= */
router.get("/latest/one", safeAsync(async (req,res)=>{
  const item = await Reservation.findOne().sort({ createdAt:-1 });
  ok(res,{ reservation: __safeNormalize(item) });
}));

/* =========================
6. 예약 개수 조회
========================= */
router.get("/count", safeAsync(async (req,res)=>{
  const count = await Reservation.countDocuments();
  ok(res,{ count });
}));

/* =========================
7. 상태별 count
========================= */
router.get("/count/status", safeAsync(async (req,res)=>{
  const pending = await Reservation.countDocuments({ status:"pending" });
  const confirmed = await Reservation.countDocuments({ status:"confirmed" });
  const cancelled = await Reservation.countDocuments({ status:"cancelled" });

  ok(res,{ pending, confirmed, cancelled });
}));

/* =========================
8. 최근 N개 조회
========================= */
router.get("/recent/:n", safeAsync(async (req,res)=>{
  const n = Math.min(100, safeNum(req.params.n,10));

  const list = await Reservation.find()
    .sort({ createdAt:-1 })
    .limit(n);

  ok(res,{ list: list.map(__safeNormalize) });
}));

/* =========================
9. 오래된 예약 조회
========================= */
router.get("/old", safeAsync(async (req,res)=>{
  const d = new Date(Date.now() - 7*24*60*60*1000);

  const list = await Reservation.find({
    createdAt: { $lte:d }
  }).limit(50);

  ok(res,{ list: list.map(__safeNormalize) });
}));

/* =========================
10. 강제 완료
========================= */
router.post("/:id/force-complete", auth, admin, safeAsync(async (req,res)=>{
  const item = await __findSafe(req.params.id);
  if(!item) return fail(res,404);

  item.isCompleted = true;
  item.completedAt = new Date();
  item.status = "confirmed";
  item.isActive = false;

  await item.save();

  ok(res,{ reservation: __safeNormalize(item) });
}));

/* =========================
11. 강제 취소
========================= */
router.post("/:id/force-cancel", auth, admin, safeAsync(async (req,res)=>{
  const item = await __findSafe(req.params.id);
  if(!item) return fail(res,404);

  item.status = "cancelled";
  item.isActive = false;
  item.cancelledAt = new Date();

  await item.save();

  ok(res,{ reservation: __safeNormalize(item) });
}));

/* =========================
12. 예약 활성화
========================= */
router.post("/:id/activate", auth, admin, safeAsync(async (req,res)=>{
  const item = await __findSafe(req.params.id);
  if(!item) return fail(res,404);

  item.isActive = true;
  await item.save();

  ok(res,{ reservation: __safeNormalize(item) });
}));

/* =========================
13. 예약 비활성화
========================= */
router.post("/:id/deactivate", auth, admin, safeAsync(async (req,res)=>{
  const item = await __findSafe(req.params.id);
  if(!item) return fail(res,404);

  item.isActive = false;
  await item.save();

  ok(res,{ reservation: __safeNormalize(item) });
}));

/* =========================
14. 예약 전체 삭제 (주의)
========================= */
router.post("/admin/delete-all", auth, admin, safeAsync(async (req,res)=>{
  await Reservation.deleteMany({});
  RESERVATION_CACHE.clear();

  ok(res);
}));

/* =========================
15. 예약 ID 리스트 조회
========================= */
router.get("/ids", safeAsync(async (req,res)=>{
  const items = await Reservation.find().select("_id");
  ok(res,{ ids: items.map(v=>String(v._id)) });
}));

/* =========================
16. 캐시 강제 등록
========================= */
router.post("/admin/cache/set", auth, admin, safeAsync(async (req,res)=>{
  cacheSet("manual", { time:Date.now() }, 5000);
  ok(res);
}));

/* =========================
17. 로그 초기화
========================= */
router.post("/admin/log/clear", auth, admin, safeAsync(async (req,res)=>{
  RESERVATION_LOG.length = 0;
  ok(res);
}));

/* =========================
18. IP별 요청 수 조회
========================= */
router.get("/admin/rate", auth, admin, safeAsync(async (req,res)=>{
  ok(res,{ size: REQUEST_RATE.size });
}));

/* =========================
19. lock 상태 조회
========================= */
router.get("/admin/lock", auth, admin, safeAsync(async (req,res)=>{
  ok(res,{ size: CREATE_LOCK.size });
}));

/* =========================
20. 시스템 상태
========================= */
router.get("/system/status", safeAsync(async (req,res)=>{
  ok(res,{
    cache: RESERVATION_CACHE.size,
    log: RESERVATION_LOG.length,
    lock: CREATE_LOCK.size,
    rate: REQUEST_RATE.size,
    now: Date.now()
  });
}));

module.exports = router;