// modules/payment/jobs/payment.cleanup.job.js

const Payment = require('../models/Payment');

/**
 * reservation 연동 (safe)
 */
let Reservation = null;
try {
  Reservation = require('../../reservation/models/Reservation');
} catch (e) {
  console.warn('[payment job] Reservation model not found');
}

/**
 * ============================================
 * 설정
 * ============================================
 */
const TIMEOUT_MINUTES = Number(process.env.PAYMENT_TIMEOUT_MINUTES || 10);
const BATCH_SIZE = Number(process.env.PAYMENT_CLEANUP_BATCH || 100);

/**
 * ============================================
 * 만료 대상 조회
 * ============================================
 */
async function findExpiredPayments() {
  const expireTime = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

  return Payment.find({
    status: { $in: ['pending', 'ready'] },
    createdAt: { $lt: expireTime },
    isDeleted: false,
  })
    .sort({ createdAt: 1 })
    .limit(BATCH_SIZE);
}

/**
 * ============================================
 * 단일 결제 만료 처리
 * ============================================
 */
async function expirePayment(payment) {
  try {
    if (!payment) return;

    // 이미 완료된 상태면 skip
    if (['paid', 'cancelled', 'refunded', 'expired'].includes(payment.status)) {
      return;
    }

    payment.status = 'expired';
    payment.cancelledAt = new Date();

    await payment.save();

    // 🔥 reservation 동기화
    if (payment.reservation && Reservation) {
      try {
        await Reservation.findByIdAndUpdate(payment.reservation, {
          status: 'expired',
          expiredAt: new Date(),
        });
      } catch (e) {
        console.error('[payment job] reservation expire error:', e.message);
      }
    }

    console.log(`[payment job] expired: ${payment.paymentId}`);

  } catch (err) {
    console.error('[payment job] expirePayment error:', err.message);
  }
}

/**
 * ============================================
 * 메인 실행
 * ============================================
 */
async function runPaymentCleanup() {
  try {
    const list = await findExpiredPayments();

    if (!list || list.length === 0) {
      return;
    }

    for (const payment of list) {
      await expirePayment(payment);
    }

  } catch (err) {
    console.error('[payment job] runPaymentCleanup error:', err.message);
  }
}

/**
 * ============================================
 * export
 * ============================================
 */
module.exports = {
  runPaymentCleanup,
};