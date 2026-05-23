"use strict";

/**
 * =====================================================
 * REVIEW CONTROLLER (REMOVED)
 * =====================================================
 */

const removedReviewPayload = (data = {}) => {
  return {
    ok: true,
    removed: true,
    list: [],
    data: [],
    items: [],
    reviews: [],
    total: 0,
    count: 0,
    reviewCount: 0,
    hidden: 0,
    reported: 0,
    ...data,
  };
};

const ok = (res, data = {}) => {
  return res.json(removedReviewPayload(data));
};

exports.getReviews = async (req, res) => {
  return ok(res, {
    action: "getReviews",
  });
};

exports.create = async (req, res) => {
  return ok(res, {
    action: "create",
  });
};

exports.getByShop = async (req, res) => {
  return ok(res, {
    action: "getByShop",
  });
};

exports.getMyList = async (req, res) => {
  return ok(res, {
    action: "getMyList",
  });
};

exports.getDetail = async (req, res) => {
  return ok(res, {
    action: "getDetail",
    review: null,
  });
};

exports.update = async (req, res) => {
  return ok(res, {
    action: "update",
    review: null,
  });
};

exports.remove = async (req, res) => {
  return ok(res, {
    action: "remove",
    review: null,
  });
};

exports.report = async (req, res) => {
  return ok(res, {
    action: "report",
    review: null,
  });
};

exports.getAdminList = async (req, res) => {
  return ok(res, {
    action: "getAdminList",
  });
};

exports.hide = async (req, res) => {
  return ok(res, {
    action: "hide",
    review: null,
  });
};

exports.restore = async (req, res) => {
  return ok(res, {
    action: "restore",
    review: null,
  });
};

exports.reply = async (req, res) => {
  return ok(res, {
    action: "reply",
    review: null,
  });
};

exports.getStats = async (req, res) => {
  return ok(res, {
    action: "getStats",
    stats: {
      avgRating: 0,
      count: 0,
      total: 0,
      reviews: 0,
      reviewCount: 0,
      hidden: 0,
      reported: 0,
    },
  });
};

exports.adminRemove = async (req, res) => {
  return ok(res, {
    action: "adminRemove",
    review: null,
  });
};
