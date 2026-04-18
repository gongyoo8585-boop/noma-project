"use strict";

const express = require("express");
const router = express.Router();

const Inquiry = require("../models/Inquiry");
const auth = require("../middlewares/auth");
const admin = require("../middlewares/admin");

/* =========================
   공통 유틸
========================= */
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("INQUIRY ROUTE ERROR:", e);
      res.status(500).json({ ok: false, message: "server error" });
    });
  };
}

function cleanPhone(콜) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

function safeText(v) {
  return String(v || "").trim();
}

function baseFilter(extra = {}) {
  return { isDeleted: { $ne: true }, ...extra };
}

/* =========================
   1. 문의 등록
========================= */
router.post(
  "/",
  safeAsync(async (req, res) => {
    const { name, content, phone, category, priority, tags } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        ok: false,
        message: "필수값 없음"
      });
    }

    const inquiry = await Inquiry.create({
      name: safeText(name),
      content: safeText(content),
      phone: cleanPhone(콜),
      category: safeText(category),
      priority: Math.max(0, Number(priority || 0)),
      tags: Array.isArray(tags) ? tags : [],
      status: "pending",
      ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
      userAgent: req.headers["user-agent"] || ""
    });

    res.json({
      ok: true,
      inquiry
    });
  })
);

/* =========================
   2. 전체 문의 (관리자)
========================= */
router.get(
  "/admin",
  auth,
  admin,
  safeAsync(async (req, res) => {
    const items = await Inquiry.find(baseFilter())
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ ok: true, items });
  })
);

/* =========================
   3. 문의 상세
========================= */
router.get(
  "/:id",
  safeAsync(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    const item = await Inquiry.findById(req.params.id);

    if (!item || item.isDeleted) {
      return res.status(404).json({ ok: false });
    }

    res.json({ ok: true, item });
  })
);

/* =========================
   4. 상태 변경 (관리자)
========================= */
router.post(
  "/:id/status",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    const item = await Inquiry.findById(req.params.id);
    if (!item || item.isDeleted) {
      return res.status(404).json({ ok: false });
    }

    const status = ["pending", "done"].includes(req.body.status)
      ? req.body.status
      : "done";

    if (typeof item.setStatus === "function") {
      await item.setStatus(status);
    } else {
      item.status = status;
      item.doneAt = status === "done" ? new Date() : null;
      await item.save();
    }

    res.json({ ok: true, item });
  })
);

/* =========================
   5. 삭제 (관리자, soft delete)
========================= */
router.delete(
  "/:id",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    const item = await Inquiry.findById(req.params.id);
    if (!item || item.isDeleted) {
      return res.status(404).json({ ok: false });
    }

    if (typeof item.softDelete === "function") {
      await item.softDelete();
    } else {
      item.isDeleted = true;
      await item.save();
    }

    res.json({ ok: true });
  })
);

/* =========================
   6. 통계 (관리자)
========================= */
router.get(
  "/stats/all",
  auth,
  admin,
  safeAsync(async (req, res) => {
    let stats;

    if (typeof Inquiry.getStats === "function") {
      stats = await Inquiry.getStats();
    } else {
      const [total, done, pending] = await Promise.all([
        Inquiry.countDocuments(baseFilter()),
        Inquiry.countDocuments(baseFilter({ status: "done" })),
        Inquiry.countDocuments(baseFilter({ status: "pending" }))
      ]);

      stats = { total, done, pending };
    }

    res.json({
      ok: true,
      total: stats.total || 0,
      done: stats.done || 0,
      pending: stats.pending || 0
    });
  })
);

/* =========================
   7. ping
========================= */
router.get("/ping", (req, res) => res.json({ ok: true }));

/* =========================
   8. count
========================= */
router.get(
  "/count",
  safeAsync(async (req, res) => {
    const count = await Inquiry.countDocuments(baseFilter());
    res.json({ ok: true, count });
  })
);

/* =========================
   9. recent
========================= */
router.get(
  "/recent",
  safeAsync(async (req, res) => {
    const items = await Inquiry.find(baseFilter())
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ ok: true, items });
  })
);

/* =========================
   10. pending
========================= */
router.get(
  "/pending",
  safeAsync(async (req, res) => {
    const items = await Inquiry.find(baseFilter({ status: "pending" }))
      .sort({ createdAt: -1 });

    res.json({ ok: true, items });
  })
);

/* =========================
   11. done
========================= */
router.get(
  "/done",
  safeAsync(async (req, res) => {
    const items = await Inquiry.find(baseFilter({ status: "done" }))
      .sort({ createdAt: -1 });

    res.json({ ok: true, items });
  })
);

/* =========================
   12. done 처리
========================= */
router.post(
  "/:id/done",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    const item = await Inquiry.findById(req.params.id);
    if (!item || item.isDeleted) return res.json({ ok: false });

    if (typeof item.markDone === "function") {
      await item.markDone();
    } else {
      item.status = "done";
      item.doneAt = new Date();
      await item.save();
    }

    res.json({ ok: true });
  })
);

/* =========================
   13. pending 처리
========================= */
router.post(
  "/:id/pending",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    const item = await Inquiry.findById(req.params.id);
    if (!item || item.isDeleted) return res.json({ ok: false });

    if (typeof item.markPending === "function") {
      await item.markPending();
    } else {
      item.status = "pending";
      item.doneAt = null;
      await item.save();
    }

    res.json({ ok: true });
  })
);

/* =========================
   14. exists
========================= */
router.get(
  "/exists/:id",
  safeAsync(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.json({ ok: true, exists: false });
    }

    const exists = await Inquiry.exists({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });

    res.json({ ok: true, exists: !!exists });
  })
);

/* =========================
   15. phone 조회
========================= */
router.get(
  "/phone/:phone",
  safeAsync(async (req, res) => {
    const items = await Inquiry.find(
      baseFilter({ phone: cleanPhone(req.params.phone) })
    ).sort({ createdAt: -1 });

    res.json({ ok: true, items });
  })
);

/* =========================
   16. latest one
========================= */
router.get(
  "/latest/one",
  safeAsync(async (req, res) => {
    const item = await Inquiry.findOne(baseFilter()).sort({ createdAt: -1 });
    res.json({ ok: true, item });
  })
);

/* =========================
   17. bulk-delete (관리자, soft delete)
========================= */
router.post(
  "/bulk-delete",
  auth,
  admin,
  safeAsync(async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(isValidObjectId) : [];

    if (!ids.length) {
      return res.status(400).json({ ok: false, message: "ids 없음" });
    }

    await Inquiry.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true } }
    );

    res.json({ ok: true });
  })
);

/* =========================
   18. health
========================= */
router.get("/health", (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

/* =========================
   19. debug all (관리자)
========================= */
router.get(
  "/debug/all",
  auth,
  admin,
  safeAsync(async (req, res) => {
    const items = await Inquiry.find().sort({ createdAt: -1 });
    res.json({ ok: true, items });
  })
);

/* =========================
   20. search
========================= */
router.get(
  "/search/all",
  auth,
  admin,
  safeAsync(async (req, res) => {
    const q = safeText(req.query.q);

    let items = [];
    if (!q) {
      items = await Inquiry.find(baseFilter()).sort({ createdAt: -1 }).limit(50);
    } else if (typeof Inquiry.searchSafe === "function") {
      items = await Inquiry.searchSafe(q);
    } else if (typeof Inquiry.searchFull === "function") {
      items = await Inquiry.searchFull(q);
    } else if (typeof Inquiry.search === "function") {
      items = await Inquiry.search(q);
    } else {
      items = await Inquiry.find({
        ...baseFilter(),
        $or: [
          { name: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
          { content: { $regex: q, $options: "i" } }
        ]
      }).sort({ createdAt: -1 });
    }

    res.json({ ok: true, items });
  })
);

/* =========================
   21. assign
========================= */
router.post(
  "/assign/:id",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    const item = await Inquiry.findById(req.params.id);
    if (!item || item.isDeleted) return res.status(404).json({ ok: false });

    const assignedTo = safeText(req.body.assignedTo || req.user.id);

    if (typeof item.assignSafe === "function") {
      await item.assignSafe(assignedTo);
    } else if (typeof item.assign === "function") {
      await item.assign(assignedTo);
    } else {
      item.assignedTo = assignedTo;
      await item.save();
    }

    res.json({ ok: true, item });
  })
);

/* =========================
   22. memo
========================= */
router.post(
  "/memo/:id",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    const item = await Inquiry.findById(req.params.id);
    if (!item || item.isDeleted) return res.status(404).json({ ok: false });

    const memo = safeText(req.body.memo);

    if (typeof item.updateMemoSafe === "function") {
      await item.updateMemoSafe(memo);
    } else if (typeof item.updateMemo === "function") {
      await item.updateMemo(memo);
    } else {
      item.memo = memo;
      await item.save();
    }

    res.json({ ok: true, item });
  })
);

/* =========================
   23. important
========================= */
router.post(
  "/important/:id",
  auth,
  admin,
  safeAsync(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    const item = await Inquiry.findById(req.params.id);
    if (!item || item.isDeleted) return res.status(404).json({ ok: false });

    const flag = req.body.flag !== false;

    if (typeof item.markImportant === "function") {
      await item.markImportant(flag);
    } else {
      item.isImportant = !!flag;
      await item.save();
    }

    res.json({ ok: true, item });
  })
);

/* =========================
   24. stats safe
========================= */
router.get(
  "/stats/safe",
  auth,
  admin,
  safeAsync(async (req, res) => {
    let stats;

    if (typeof Inquiry.getStatsFull === "function") {
      stats = await Inquiry.getStatsFull();
    } else if (typeof Inquiry.getStats === "function") {
      stats = await Inquiry.getStats();
    } else {
      const [pending, done, total] = await Promise.all([
        Inquiry.countDocuments(baseFilter({ status: "pending" })),
        Inquiry.countDocuments(baseFilter({ status: "done" })),
        Inquiry.countDocuments(baseFilter())
      ]);

      stats = { pending, done, total };
    }

    res.json({ ok: true, ...stats });
  })
);

module.exports = router;