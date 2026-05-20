"use strict";

/**
 * =====================================================
 * REVIEW ROUTES (REMOVED)
 * =====================================================
 */

const express = require("express");

const router = express.Router();

function removedReviewResponse(action = "review-feature-removed") {
  return {
    ok: true,
    removed: true,
    action,
    list: [],
    items: [],
    reviews: [],
    data: [],
    total: 0,
    count: 0,
    reviewCount: 0,
    hidden: 0,
    reported: 0,
  };
}

function sendRemoved(action) {
  return (req, res) => {
    return res.json(removedReviewResponse(action));
  };
}

function sendCreatedRemoved(action) {
  return (req, res) => {
    return res.status(201).json(removedReviewResponse(action));
  };
}

router.get(
  "/",
  sendRemoved("getReviews")
);

router.get(
  "/me",
  sendRemoved("getMyList")
);

router.get(
  "/admin",
  sendRemoved("getAdminList")
);

router.get(
  "/stats",
  sendRemoved("getStats")
);

router.get(
  "/shop/:shopId",
  sendRemoved("getByShop")
);

router.post(
  "/",
  sendCreatedRemoved("create")
);

router.delete(
  "/admin/:id",
  sendRemoved("adminRemove")
);

router.patch(
  "/:id/hide",
  sendRemoved("hide")
);

router.patch(
  "/:id/restore",
  sendRemoved("restore")
);

router.post(
  "/:id/reply",
  sendCreatedRemoved("reply")
);

router.post(
  "/:id/report",
  sendCreatedRemoved("report")
);

router.get(
  "/health",
  (req, res) => {
    return res.json({
      ok: true,
      service: "review.routes",
      removed: true,
      time: new Date(),
    });
  }
);

router.get(
  "/:id",
  sendRemoved("getDetail")
);

router.put(
  "/:id",
  sendRemoved("update")
);

router.delete(
  "/:id",
  sendRemoved("remove")
);

module.exports = router;
