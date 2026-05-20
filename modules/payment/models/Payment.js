"use strict";

// modules/payment/models/Payment.js

const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    // 내부 결제 고유 ID
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // 사용자 참조
    user: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },

    // 예약 참조
    reservation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },

    // 외부 주문 번호
    orderId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    // 결제명
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // 원 결제 금액
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // 할인 금액
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 실제 결제 금액
    paidAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // 환불 누적 금액
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 통화
    currency: {
      type: String,
      default: "KRW",
      uppercase: true,
      trim: true,
    },

    // 결제 수단
    method: {
      type: String,
      enum: [
        "card",
        "bank_transfer",
        "virtual_account",
        "kakao_pay",
        "naver_pay",
        "toss_pay",
        "point",
        "cash",
        "etc",
      ],
      required: true,
      index: true,
    },

    // PG사
    provider: {
      type: String,
      default: "internal",
      trim: true,
      index: true,
    },

    // 상태
    status: {
      type: String,
      enum: [
        "pending",
        "ready",
        "paid",
        "failed",
        "cancelled",
        "refunded",
        "partial_refunded",
        "expired",
      ],
      default: "pending",
      index: true,
    },

    // PG 거래 ID
    transactionId: {
      type: String,
      default: null,
      trim: true,
      index: true,
      sparse: true,
    },

    // PG 주문/결제 관련 키
    providerOrderId: {
      type: String,
      default: null,
      trim: true,
      sparse: true,
      index: true,
    },

    providerPaymentKey: {
      type: String,
      default: null,
      trim: true,
      sparse: true,
    },

    // 결제자 정보
    payerName: {
      type: String,
      default: null,
      trim: true,
    },

    payerEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },

    payerPhone: {
      type: String,
      default: null,
      trim: true,
    },

    // 상태별 시간
    paidAt: {
      type: Date,
      default: null,
      index: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    // 사유
    failReason: {
      type: String,
      default: null,
      trim: true,
    },

    cancelReason: {
      type: String,
      default: null,
      trim: true,
    },

    refundReason: {
      type: String,
      default: null,
      trim: true,
    },

    // 관리자 메모
    adminNote: {
      type: String,
      default: null,
      trim: true,
    },

    // 서비스/예약 snapshot
    serviceSnapshot: {
      type: {
        serviceId: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        serviceName: {
          type: String,
          default: null,
          trim: true,
        },
        therapistId: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        therapistName: {
          type: String,
          default: null,
          trim: true,
        },
        duration: {
          type: Number,
          default: null,
        },
        price: {
          type: Number,
          default: null,
        },
        shopId: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        shopName: {
          type: String,
          default: null,
          trim: true,
        },
      },
      default: {},
    },

    // PG 응답 / 확장용 데이터
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // 소프트 삭제
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ============================================
 * INDEX
 * ============================================ */
PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ reservation: 1, createdAt: -1 });
PaymentSchema.index({ orderId: 1, createdAt: -1 });
PaymentSchema.index({ provider: 1, status: 1 });
PaymentSchema.index({ status: 1, paidAt: -1 });

/* ============================================
 * PRE VALIDATE
 * ============================================ */
PaymentSchema.pre("validate", function (next) {
  try {
    if (this.paidAmount == null) {
      const amount = Number(this.amount || 0);
      const discountAmount = Number(this.discountAmount || 0);
      this.paidAmount = Math.max(amount - discountAmount, 0);
    }

    if (!this.paymentId) {
      this.paymentId = `pay_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

/* ============================================
 * METHODS
 * ============================================ */
PaymentSchema.methods.markReady = async function (extra = {}) {
  this.status = "ready";

  if (extra.transactionId) this.transactionId = extra.transactionId;
  if (extra.providerOrderId) this.providerOrderId = extra.providerOrderId;
  if (extra.providerPaymentKey) this.providerPaymentKey = extra.providerPaymentKey;

  if (extra.metadata && typeof extra.metadata === "object") {
    this.metadata = {
      ...(this.metadata || {}),
      ...extra.metadata,
    };
  }

  return this.save();
};

PaymentSchema.methods.markPaid = async function (extra = {}) {
  this.status = "paid";
  this.paidAt = extra.paidAt || new Date();
  this.failedAt = null;
  this.failReason = null;
  this.cancelledAt = null;
  this.cancelReason = null;

  if (extra.transactionId) this.transactionId = extra.transactionId;
  if (extra.providerOrderId) this.providerOrderId = extra.providerOrderId;
  if (extra.providerPaymentKey) this.providerPaymentKey = extra.providerPaymentKey;
  if (typeof extra.paidAmount === "number") this.paidAmount = extra.paidAmount;

  if (extra.metadata && typeof extra.metadata === "object") {
    this.metadata = {
      ...(this.metadata || {}),
      ...extra.metadata,
    };
  }

  return this.save();
};

PaymentSchema.methods.markFailed = async function (reason = null, extra = {}) {
  this.status = "failed";
  this.failedAt = new Date();
  this.failReason = reason || extra.failReason || "PAYMENT_FAILED";

  if (extra.transactionId) this.transactionId = extra.transactionId;

  if (extra.metadata && typeof extra.metadata === "object") {
    this.metadata = {
      ...(this.metadata || {}),
      ...extra.metadata,
    };
  }

  return this.save();
};

PaymentSchema.methods.markCancelled = async function (reason = null, extra = {}) {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  this.cancelReason = reason || extra.cancelReason || null;

  if (extra.metadata && typeof extra.metadata === "object") {
    this.metadata = {
      ...(this.metadata || {}),
      ...extra.metadata,
    };
  }

  return this.save();
};

PaymentSchema.methods.markRefunded = async function (
  amount = null,
  reason = null,
  extra = {}
) {
  const refundAmount = typeof amount === "number" ? amount : this.paidAmount;

  this.refundedAmount =
    Number(this.refundedAmount || 0) + Number(refundAmount || 0);
  this.refundedAt = new Date();
  this.refundReason = reason || extra.refundReason || null;

  if (this.refundedAmount > 0 && this.refundedAmount < this.paidAmount) {
    this.status = "partial_refunded";
  } else {
    this.status = "refunded";
  }

  if (extra.metadata && typeof extra.metadata === "object") {
    this.metadata = {
      ...(this.metadata || {}),
      ...extra.metadata,
    };
  }

  return this.save();
};

/* ============================================
 * STATICS
 * ============================================ */
PaymentSchema.statics.findActiveByPaymentId = function (paymentId) {
  return this.findOne({
    paymentId,
    isDeleted: false,
  });
};

PaymentSchema.statics.findUserPayments = function (userId, options = {}) {
  const limit = Number(options.limit || 20);
  const skip = Number(options.skip || 0);
  const status = options.status;

  const query = {
    user: userId,
    isDeleted: false,
  };

  if (status) query.status = status;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model("Payment", PaymentSchema);