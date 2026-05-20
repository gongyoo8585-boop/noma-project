"use strict";

const mongoose = require("mongoose");
const Review = require("../../models/Review");
const Reservation = require("../../models/Reservation");
const Shop = require("../../models/Shop");

/* 🔥 최소 추가: 모델 안전 처리 */
if (!Review) {
  throw new Error("REVIEW_MODEL_NOT_FOUND");
}

/* 🔥 최소 추가 */
if (typeof Review.findByUser !== "function") {
  Review.findByUser = function (userId) {
    return Review.find({
      user: userId,
      status: { $ne: "deleted" },
    })
      .populate("shop", "name")
      .sort({ createdAt: -1 })
      .lean();
  };
}

/* 🔥 최소 추가 */
if (typeof Review.findByShop !== "function") {
  Review.findByShop = function (
    shopId,
    { page = 1, limit = 20 } = {}
  ) {
    const skip =
      (Number(page || 1) - 1) *
      Number(limit || 20);

    return Review.find({
      shop: shopId,
      status: "active",
    })
      .populate("user", "name nickname avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit || 20))
      .lean();
  };
}

/* 🔥 최소 추가 */
if (typeof Review.getShopRatingStats !== "function") {
  Review.getShopRatingStats = async function (shopId) {
    const agg = await Review.aggregate([
      {
        $match: {
          shop: toObjectId(shopId),
          status: "active",
        },
      },
      {
        $group: {
          _id: null,
          average: {
            $avg: "$rating",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    return {
      average:
        Number(
          agg?.[0]?.average || 0
        ) || 0,
      count:
        Number(
          agg?.[0]?.count || 0
        ) || 0,
    };
  };
}

/* 🔥 최소 추가 */
if (
  typeof Review.schema.methods.softDelete !==
  "function"
) {
  Review.schema.methods.softDelete =
    async function () {
      this.status = "deleted";
      this.deletedAt = new Date();
      return this.save();
    };
}

/* 🔥 최소 추가 */
if (
  typeof Review.schema.methods.hide !==
  "function"
) {
  Review.schema.methods.hide =
    async function (adminId) {
      this.status = "hidden";
      this.hiddenBy = adminId;
      this.hiddenAt = new Date();
      return this.save();
    };
}

/* 🔥 최소 추가 */
if (
  typeof Review.schema.methods.restore !==
  "function"
) {
  Review.schema.methods.restore =
    async function () {
      this.status = "active";
      return this.save();
    };
}

/* 🔥 최소 추가 */
if (
  typeof Review.schema.methods.addReport !==
  "function"
) {
  Review.schema.methods.addReport =
    async function ({
      userId,
      reason,
    }) {
      if (!Array.isArray(this.reports)) {
        this.reports = [];
      }

      this.reports.push({
        user: userId,
        reason,
        createdAt: new Date(),
      });

      return this.save();
    };
}

/* 🔥 최소 추가 */
if (
  typeof Review.schema.methods.setReply !==
  "function"
) {
  Review.schema.methods.setReply =
    async function ({
      adminId,
      content,
    }) {
      this.reply = {
        admin: adminId,
        content,
        createdAt: new Date(),
      };

      return this.save();
    };
}

/* 🔥 기존 유지 */
function toObjectId(id) {
  if (!id) return id;
  if (
    id instanceof
    mongoose.Types.ObjectId
  )
    return id;

  if (
    mongoose.Types.ObjectId.isValid(id)
  ) {
    return new mongoose.Types.ObjectId(id);
  }

  return id;
}

async function updateShopRating(shopId) {
  const stats =
    await Review.getShopRatingStats(
      shopId
    );

  if (!Shop) return stats;

  await Shop.findByIdAndUpdate(shopId, {
    "rating.average": Number(
      stats.average || 0
    ),
    "rating.count": Number(
      stats.count || 0
    ),
    ratingAvg: Number(
      stats.average || 0
    ),
  });

  return stats;
}

/* ===================================================== */
exports.getAllReviews = async ({
  page = 1,
  limit = 50,
} = {}) => {
  const pageNum = Number(page || 1);
  const limitNum = Number(limit || 50);
  const skip =
    (pageNum - 1) * limitNum;

  return Review.find({
    status: "active",
  })
    .populate(
      "user",
      "name nickname avatar"
    )
    .populate("shop", "name")
    .populate(
      "reservation",
      "date time serviceType"
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();
};

/* ===================================================== */
exports.createReview = async ({
  userId,
  shopId,
  reservationId,
  rating,
  content,
  images = [],
}) => {
  const score = Number(rating);

  if (!userId)
    throw new Error("인증 필요");

  if (!shopId)
    throw new Error("shopId 필요");

  if (!reservationId)
    throw new Error(
      "reservationId 필요"
    );

  if (
    !score ||
    score < 1 ||
    score > 5
  )
    throw new Error("별점 오류");

  if (
    !content ||
    !String(content).trim()
  )
    throw new Error(
      "리뷰 내용 필요"
    );

  const reservation =
    await Reservation.findById(
      reservationId
    );

  if (!reservation)
    throw new Error("예약 없음");

  if (
    String(reservation.user) !==
    String(userId)
  ) {
    throw new Error("권한 없음");
  }

  if (
    String(reservation.shop) !==
    String(shopId)
  ) {
    throw new Error(
      "예약 매장 불일치"
    );
  }

  if (
    reservation.status !==
    "completed"
  ) {
    throw new Error(
      "완료된 예약만 리뷰 작성 가능"
    );
  }

  const exists =
    await Review.findOne({
      reservation: reservationId,
    });

  if (exists) {
    throw new Error(
      "이미 리뷰 작성됨"
    );
  }

  const review =
    await Review.create({
      user: userId,
      shop: shopId,
      reservation: reservationId,
      rating: score,
      content: String(
        content
      ).trim(),
      images: Array.isArray(images)
        ? images
        : [],
      status: "active",
    });

  reservation.review = review._id;

  await reservation.save();

  await updateShopRating(shopId);

  return review;
};

/* ===================================================== */
exports.getShopReviews = async ({
  shopId,
  page = 1,
  limit = 20,
}) => {
  if (!shopId)
    throw new Error("shopId 필요");

  return Review.findByShop(shopId, {
    page: Number(page || 1),
    limit: Number(limit || 20),
  });
};

/* ===================================================== */
exports.getMyReviews = async ({
  userId,
}) => {
  if (!userId)
    throw new Error("인증 필요");

  return Review.findByUser(userId);
};

/* ===================================================== */
exports.getReviewDetail = async ({
  reviewId,
}) => {
  if (!reviewId)
    throw new Error(
      "review id 필요"
    );

  const review =
    await Review.findById(reviewId)
      .populate(
        "user",
        "name nickname email avatar"
      )
      .populate(
        "shop",
        "name address thumbnail"
      )
      .populate(
        "reservation",
        "date time serviceType status"
      );

  if (!review)
    throw new Error("리뷰 없음");

  return review;
};

/* ===================================================== */
exports.updateReview = async ({
  reviewId,
  userId,
  rating,
  content,
  images,
}) => {
  if (!reviewId)
    throw new Error(
      "review id 필요"
    );

  if (!userId)
    throw new Error("인증 필요");

  const review =
    await Review.findById(reviewId);

  if (!review)
    throw new Error("리뷰 없음");

  if (
    String(review.user) !==
    String(userId)
  ) {
    throw new Error("권한 없음");
  }

  if (
    review.status === "deleted"
  ) {
    throw new Error(
      "삭제된 리뷰"
    );
  }

  if (rating !== undefined) {
    const score = Number(rating);

    if (
      !score ||
      score < 1 ||
      score > 5
    ) {
      throw new Error("별점 오류");
    }

    review.rating = score;
  }

  if (content !== undefined) {
    if (
      !String(content).trim()
    ) {
      throw new Error(
        "리뷰 내용 필요"
      );
    }

    review.content = String(
      content
    ).trim();
  }

  if (images !== undefined) {
    review.images = Array.isArray(
      images
    )
      ? images
      : [];
  }

  await review.save();

  await updateShopRating(review.shop);

  return review;
};

/* ===================================================== */
exports.deleteReview = async ({
  reviewId,
  userId,
  admin = false,
}) => {
  if (!reviewId)
    throw new Error(
      "review id 필요"
    );

  if (!userId)
    throw new Error("인증 필요");

  const review =
    await Review.findById(reviewId);

  if (!review)
    throw new Error("리뷰 없음");

  if (
    !admin &&
    String(review.user) !==
      String(userId)
  ) {
    throw new Error("권한 없음");
  }

  await review.softDelete();

  await updateShopRating(review.shop);

  return review;
};

/* ===================================================== */
exports.reportReview = async ({
  reviewId,
  userId,
  reason,
}) => {
  if (!reviewId)
    throw new Error(
      "review id 필요"
    );

  if (!userId)
    throw new Error("인증 필요");

  const review =
    await Review.findById(reviewId);

  if (!review)
    throw new Error("리뷰 없음");

  if (
    review.status !== "active"
  ) {
    throw new Error(
      "신고 불가능한 리뷰"
    );
  }

  if (reason)
    reason = String(reason).trim();

  return review.addReport({
    userId,
    reason,
  });
};

/* ===================================================== */
exports.getAdminReviews = async ({
  status,
  shopId,
  userId,
  keyword,
  limit = 100,
}) => {
  const query = {};

  if (status)
    query.status = status;

  if (shopId)
    query.shop = shopId;

  if (userId)
    query.user = userId;

  if (
    keyword &&
    String(keyword).trim()
  ) {
    const k = String(keyword).trim();

    query.$or = [
      {
        content: {
          $regex: k,
          $options: "i",
        },
      },
    ];
  }

  return Review.find(query)
    .populate(
      "user",
      "name nickname email"
    )
    .populate(
      "shop",
      "name address"
    )
    .populate(
      "reservation",
      "date time serviceType status"
    )
    .sort({ createdAt: -1 })
    .limit(Number(limit || 100))
    .lean();
};

/* ===================================================== */
exports.hideReview = async ({
  reviewId,
  adminId,
}) => {
  if (!reviewId)
    throw new Error(
      "review id 필요"
    );

  const review =
    await Review.findById(reviewId);

  if (!review)
    throw new Error("리뷰 없음");

  await review.hide(adminId);

  await updateShopRating(review.shop);

  return review;
};

/* ===================================================== */
exports.restoreReview = async ({
  reviewId,
}) => {
  if (!reviewId)
    throw new Error(
      "review id 필요"
    );

  const review =
    await Review.findById(reviewId);

  if (!review)
    throw new Error("리뷰 없음");

  await review.restore();

  await updateShopRating(review.shop);

  return review;
};

/* ===================================================== */
exports.replyReview = async ({
  reviewId,
  adminId,
  content,
}) => {
  if (!reviewId)
    throw new Error(
      "review id 필요"
    );

  if (!adminId)
    throw new Error(
      "adminId 필요"
    );

  if (
    !content ||
    !String(content).trim()
  ) {
    throw new Error(
      "답글 내용 필요"
    );
  }

  const review =
    await Review.findById(reviewId);

  if (!review)
    throw new Error("리뷰 없음");

  return review.setReply({
    adminId,
    content: String(
      content
    ).trim(),
  });
};

/* ===================================================== */
exports.getStats = async ({
  shopId,
} = {}) => {
  const match = {};

  if (shopId) {
    match.shop =
      toObjectId(shopId);
  }

  const total =
    await Review.countDocuments(
      match
    );

  const active =
    await Review.countDocuments({
      ...match,
      status: "active",
    });

  const hidden =
    await Review.countDocuments({
      ...match,
      status: "hidden",
    });

  const deleted =
    await Review.countDocuments({
      ...match,
      status: "deleted",
    });

  const agg =
    await Review.aggregate([
      {
        $match: {
          ...match,
          status: "active",
        },
      },
      {
        $group: {
          _id: null,
          average: {
            $avg: "$rating",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

  return {
    total,
    active,
    hidden,
    deleted,
    average: Number(
      (
        agg?.[0]?.average || 0
      ).toFixed(2)
    ),
    count:
      agg?.[0]?.count || 0,
  };
};

/* ===================================================== */
exports.adminDeleteReview = async ({
  reviewId,
  adminId,
}) => {
  if (!reviewId)
    throw new Error(
      "review id 필요"
    );

  if (!adminId)
    throw new Error(
      "adminId 필요"
    );

  const review =
    await Review.findById(reviewId);

  if (!review)
    throw new Error("리뷰 없음");

  review.status = "deleted";
  review.deletedAt = new Date();
  review.handledBy = adminId;
  review.handledAt = new Date();

  await review.save();

  await updateShopRating(review.shop);

  return review;
};