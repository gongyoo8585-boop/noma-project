"use strict";

/* =====================================================
🔥 기존 코드 100% 유지 (절대 삭제 금지)
기준: :contentReference[oaicite:0]{index=0}
===================================================== */

let User = null;
let Payment = null;
let Reservation = null;

let analyticsService = null;
let notifyService = null;
let cacheService = null;

try { User = require("../modules/user/models/User"); } catch (_) {}
try { Payment = require("../modules/payment/models/Payment"); } catch (_) {}
try { Reservation = require("../modules/reservation/models/Reservation"); } catch (_) {}

try { analyticsService = require("./analyticsService"); } catch (_) {}
try { notifyService = require("./notifyService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

class AdminService {
  constructor() {
    this.lastAction = null;
  }

  async getDashboard() {
    const result = { users: 0, payments: 0, reservations: 0 };

    try {
      if (User) result.users = await User.countDocuments({ isDeleted: false });
      if (Payment) result.payments = await Payment.countDocuments({ isDeleted: false });
      if (Reservation) result.reservations = await Reservation.countDocuments({ isDeleted: false });
    } catch (_) {}

    return result;
  }

  async listUsers({ limit = 20, skip = 0 } = {}) {
    assert(User, "USER_MODEL_MISSING");

    return User.find({ isDeleted: false })
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });
  }

  async deleteUser(userId) {
    const user = await User.findActiveById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");

    user.isDeleted = true;
    await user.save();

    this.lastAction = { type: "delete_user", userId };

    return true;
  }

  async listPayments({ limit = 20, skip = 0 } = {}) {
    assert(Payment, "PAYMENT_MODEL_MISSING");

    return Payment.find({ isDeleted: false })
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });
  }

  async forceCancelPayment(paymentId) {
    const payment = await Payment.findActiveByPaymentId(paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    await payment.markCancelled("ADMIN_FORCE");

    this.lastAction = { type: "cancel_payment", paymentId };

    return payment;
  }

  async listReservations({ limit = 20, skip = 0 } = {}) {
    assert(Reservation, "RESERVATION_MODEL_MISSING");

    return Reservation.find({ isDeleted: false })
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });
  }

  async forceCancelReservation(reservationId) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    reservation.status = "cancelled";
    await reservation.save();

    this.lastAction = { type: "cancel_reservation", reservationId };

    return reservation;
  }

  async broadcast(message) {
    assert(message, "MESSAGE_REQUIRED");

    if (notifyService && User) {
      const users = await User.find({ isDeleted: false }).select("id");

      for (const u of users) {
        notifyService.pushAsync({
          userId: u.id,
          type: "admin_broadcast",
          message,
        });
      }
    }

    this.lastAction = { type: "broadcast", message };

    return true;
  }

  getAnalytics() {
    if (!analyticsService) return null;

    return {
      stats: analyticsService.getStats(),
      recent: analyticsService.getEvents(20),
    };
  }

  clearCache() {
    if (!cacheService) return false;

    cacheService.reset();
    return true;
  }

  getLastAction() {
    return this.lastAction;
  }

  reset() {
    this.lastAction = null;
    return true;
  }
}

/* =====================================================
🔥 🔥 확장 영역 (기존 코드 절대 건드리지 않음)
===================================================== */

const instance = new AdminService();

/* =====================================================
🔥 고급 대시보드 (확장)
===================================================== */
instance.getFullDashboard = async function () {
  const base = await this.getDashboard();

  let revenue = 0;
  try {
    if (Payment) {
      const result = await Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]);
      revenue = result?.[0]?.total || 0;
    }
  } catch (_) {}

  return { ...base, revenue, time: new Date() };
};

/* =====================================================
🔥 사용자 상세 분석 (확장)
===================================================== */
instance.getUserDetail = async function (userId) {
  assert(User, "USER_MODEL_MISSING");

  const user = await User.findById(userId).lean();
  if (!user) throw new Error("USER_NOT_FOUND");

  const reservationCount = Reservation
    ? await Reservation.countDocuments({ userId })
    : 0;

  const paymentCount = Payment
    ? await Payment.countDocuments({ userId })
    : 0;

  return {
    user,
    reservationCount,
    paymentCount
  };
};

/* =====================================================
🔥 결제 통계 확장
===================================================== */
instance.getPaymentStatsAdvanced = async function () {
  if (!Payment) return {};

  const [total, paid, cancelled] = await Promise.all([
    Payment.countDocuments(),
    Payment.countDocuments({ status: "paid" }),
    Payment.countDocuments({ status: "cancelled" })
  ]);

  return { total, paid, cancelled };
};

/* =====================================================
🔥 예약 통계 확장
===================================================== */
instance.getReservationStatsAdvanced = async function () {
  if (!Reservation) return {};

  const [total, confirmed, cancelled] = await Promise.all([
    Reservation.countDocuments(),
    Reservation.countDocuments({ status: "confirmed" }),
    Reservation.countDocuments({ status: "cancelled" })
  ]);

  return { total, confirmed, cancelled };
};

/* =====================================================
🔥 유저 상태 제어 확장
===================================================== */
instance.lockUser = async function (userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  user.isActive = false;
  await user.save();

  return true;
};

instance.unlockUser = async function (userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  user.isActive = true;
  await user.save();

  return true;
};

/* =====================================================
🔥 대량 처리 확장
===================================================== */
instance.bulkDeleteUsers = async function (ids = []) {
  if (!User) return 0;

  const result = await User.updateMany(
    { _id: { $in: ids } },
    { $set: { isDeleted: true } }
  );

  return result.modifiedCount || 0;
};

/* =====================================================
🔥 시스템 상태 확장
===================================================== */
instance.getSystemHealth = async function () {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    lastAction: this.lastAction,
    time: new Date()
  };
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 admin.service FINAL EXPANDED (STRICT MODE)");

module.exports = instance;