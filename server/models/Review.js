"use strict";

/**
 * =====================================================
 * 🔥 REVIEW MODEL (ULTRA FINAL - PATCHED)
 * ✔ 기존 기능 100% 유지
 * ✔ report 중복 방어 안정성 강화
 * ✔ rating 통계 NaN 방어
 * ✔ require() undefined 방어
 * ✔ 신고 reason 안전 처리 추가
 * ✔ 🔥 업체 일일 리뷰수 통계 최소 추가
 * =====================================================
 */

const mongoose = require("mongoose");

if (!mongoose.models) {
  mongoose.models = {};
}

const normalizeDateKey = (value) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
      unique: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    images: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "hidden", "deleted"],
      default: "active",
      index: true,
    },

    reportCount: {
      type: Number,
      default: 0,
    },

    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: {
          type: String,
          default: "",
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    reply: {
      content: {
        type: String,
        default: "",
      },
      admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      repliedAt: Date,
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    handledAt: Date,

    deletedAt: Date,

    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ shop: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, createdAt: -1 });
ReviewSchema.index({ rating: -1 });
ReviewSchema.index({ content: "text" });

ReviewSchema.methods.hide = async function (adminId) {
  this.status = "hidden";
  this.handledBy = adminId || this.handledBy;
  this.handledAt = new Date();
  await this.save();
  return this;
};

ReviewSchema.methods.restore = async function () {
  this.status = "active";
  this.deletedAt = null;
  await this.save();
  return this;
};

ReviewSchema.methods.softDelete = async function () {
  this.status = "deleted";
  this.deletedAt = new Date();
  await this.save();
  return this;
};

ReviewSchema.methods.addReport = async function ({ userId, reason }) {
  if (!userId) throw new Error("userId 필요");

  const already = this.reports.some(
    (r) => String(r.user) === String(userId)
  );

  if (already) {
    throw new Error("이미 신고한 리뷰");
  }

  this.reports.push({
    user: userId,
    reason: reason ? String(reason).trim() : "",
  });

  this.reportCount = this.reports.length;

  if (this.reportCount >= 5) {
    this.status = "hidden";
  }

  await this.save();
  return this;
};

ReviewSchema.methods.setReply = async function ({ adminId, content }) {
  this.reply = {
    content: content ? String(content).trim() : "",
    admin: adminId,
    repliedAt: new Date(),
  };

  await this.save();
  return this;
};

ReviewSchema.statics.findByShop = function (shopId, params = {}) {
  const limit = Number(params.limit || 20);
  const page = Number(params.page || 1);
  const skip = (page - 1) * limit;

  return this.find({
    shop: shopId,
    status: "active",
  })
    .populate("user", "name nickname avatar")
    .populate("reservation", "date time serviceType")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

ReviewSchema.statics.findByUser = function (userId) {
  return this.find({ user: userId })
    .populate("shop", "name address thumbnail")
    .populate("reservation", "date time serviceType")
    .sort({ createdAt: -1 })
    .lean();
};

ReviewSchema.statics.findAdminList = function (params = {}) {
  const query = {};

  if (params.status) query.status = params.status;
  if (params.shopId) query.shop = params.shopId;
  if (params.userId) query.user = params.userId;

  return this.find(query)
    .populate("user", "name nickname email")
    .populate("shop", "name address")
    .populate("reservation", "date time serviceType status")
    .sort({ createdAt: -1 })
    .limit(Number(params.limit || 100))
    .lean();
};

ReviewSchema.statics.getShopRatingStats = async function (shopId) {
  const result = await this.aggregate([
    {
      $match: {
        shop: new mongoose.Types.ObjectId(shopId),
        status: "active",
      },
    },
    {
      $group: {
        _id: "$shop",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = result[0] || {
    average: 0,
    count: 0,
  };

  return {
    average: Number(stats.average || 0),
    count: Number(stats.count || 0),
  };
};

ReviewSchema.post("save", async function (doc) {
  try {
    const Review = mongoose.model("Review");
    const Shop = mongoose.model("Shop");

    const stats = await Review.getShopRatingStats(doc.shop);

    const dateKey = normalizeDateKey(doc.createdAt || new Date());

    await Shop.findByIdAndUpdate(doc.shop, {
      "rating.average": Number(stats.average || 0),
      "rating.count": Number(stats.count || 0),
      ratingAvg: Number(stats.average || 0),
      reviewCount: Number(stats.count || 0),
      "stats.reviewCount": Number(stats.count || 0),
      ...(dateKey
        ? {
            [`dailyReviews.${dateKey}`]: Number(stats.count || 0),
          }
        : {}),
    });
  } catch (e) {
    console.error("REVIEW POST SAVE ERROR:", e.message);
  }
});

ReviewSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (!doc) return;

    const Review = mongoose.model("Review");
    const Shop = mongoose.model("Shop");

    const stats = await Review.getShopRatingStats(doc.shop);

    await Shop.findByIdAndUpdate(doc.shop, {
      "rating.average": Number(stats.average || 0),
      "rating.count": Number(stats.count || 0),
      ratingAvg: Number(stats.average || 0),
      reviewCount: Number(stats.count || 0),
      "stats.reviewCount": Number(stats.count || 0),
    });
  } catch (e) {
    console.error("REVIEW DELETE HOOK ERROR:", e.message);
  }
});

ReviewSchema.methods.toJSON = function () {
  return this.toObject();
};

const ReviewModel =
  mongoose.models.Review ||
  mongoose.model("Review", ReviewSchema);

module.exports = ReviewModel;

if (!module.exports) {
  console.error("❌ Review model export 실패");
}