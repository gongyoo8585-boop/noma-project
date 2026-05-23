"use strict";

const paymentService = require("../services/payment.service");

/* =====================================================
🔥 UTILS (추가 - 기존 기능 유지 + 안정성)
===================================================== */
const {
  success,
  fail,
  serializePayment,
  paymentListResponse,
  validateKakaoReady,
  validateApprovePayment,
  validateCancelPayment,
  validateRefundPayment,
} = require("../utils");

/* =====================================================
🔥 CONTROLLER
===================================================== */
class PaymentController {

  /* ============================================
  🔥 KAKAO READY
  ============================================ */
  async createKakaoPayment(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json(fail("UNAUTHORIZED", 401));
      }

      const payload = validateKakaoReady({
        user: userId,
        reservation: req.body.reservationId,
        title: req.body.title,
        amount: req.body.amount,
        clientUrls: {
          approval: `${process.env.CLIENT_URL}/payment/success`,
          cancel: `${process.env.CLIENT_URL}/payment/cancel`,
          fail: `${process.env.CLIENT_URL}/payment/fail`,
        },
      });

      const result = await paymentService.createKakaoPayment(payload);

      return res.json(success(result, "KAKAO_READY"));

    } catch (err) {
      console.error("createKakaoPayment error:", err.message);
      return res.status(500).json(fail(err.message || "SERVER_ERROR", 500));
    }
  }

  /* ============================================
  🔥 APPROVE
  ============================================ */
  async approveKakaoPayment(req, res) {
    try {
      const { orderId, pg_token } = req.query;

      const payload = validateApprovePayment({
        orderId,
        pgToken: pg_token,
        userId: req.user?.id || req.user?._id,
      });

      const payment = await paymentService.approveKakaoPayment(payload);

      return res.redirect(
        `${process.env.CLIENT_URL}/payment/success?paymentId=${payment.paymentId}`
      );

    } catch (err) {
      console.error("approveKakaoPayment error:", err.message);

      return res.redirect(
        `${process.env.CLIENT_URL}/payment/fail?error=${encodeURIComponent(err.message)}`
      );
    }
  }

  /* ============================================
  🔥 FAIL
  ============================================ */
  async failKakaoPayment(req, res) {
    try {
      const { orderId } = req.query;

      if (orderId) {
        await paymentService.failPayment({
          orderId,
          reason: "USER_CANCEL_OR_FAIL",
        });
      }

      return res.redirect(`${process.env.CLIENT_URL}/payment/fail`);

    } catch (err) {
      console.error("failKakaoPayment error:", err.message);

      return res.redirect(
        `${process.env.CLIENT_URL}/payment/fail?error=${encodeURIComponent(err.message)}`
      );
    }
  }

  /* ============================================
  🔥 CANCEL
  ============================================ */
  async cancelPayment(req, res) {
    try {
      const payload = validateCancelPayment({
        paymentId: req.params.paymentId,
        reason: req.body.reason,
      });

      const payment = await paymentService.cancelPayment(payload);

      return res.json(
        success(serializePayment(payment), "PAYMENT_CANCELLED")
      );

    } catch (err) {
      console.error("cancelPayment error:", err.message);
      return res.status(500).json(fail(err.message || "SERVER_ERROR", 500));
    }
  }

  /* ============================================
  🔥 REFUND
  ============================================ */
  async refundPayment(req, res) {
    try {
      const payment = await paymentService.getPayment(req.params.paymentId);

      const payload = validateRefundPayment(payment, {
        paymentId: req.params.paymentId,
        amount: req.body.amount,
        reason: req.body.reason,
      });

      const result = await paymentService.refundPayment(payload);

      return res.json(
        success(serializePayment(result), "PAYMENT_REFUNDED")
      );

    } catch (err) {
      console.error("refundPayment error:", err.message);
      return res.status(500).json(fail(err.message || "SERVER_ERROR", 500));
    }
  }

  /* ============================================
  🔥 DETAIL
  ============================================ */
  async getPayment(req, res) {
    try {
      const payment = await paymentService.getPayment(req.params.paymentId);

      return res.json(
        success(serializePayment(payment), "PAYMENT_DETAIL")
      );

    } catch (err) {
      console.error("getPayment error:", err.message);
      return res.status(404).json(fail(err.message || "NOT_FOUND", 404));
    }
  }

  /* ============================================
  🔥 LIST
  ============================================ */
  async getMyPayments(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json(fail("UNAUTHORIZED", 401));
      }

      const { limit, skip, status } = req.query;

      const list = await paymentService.getUserPayments(userId, {
        limit,
        skip,
        status,
      });

      return res.json(paymentListResponse(list));

    } catch (err) {
      console.error("getMyPayments error:", err.message);
      return res.status(500).json(fail("SERVER_ERROR", 500));
    }
  }
}

module.exports = new PaymentController();