"use strict";

/**
 * =====================================================
 * 🔥 PRICING SERVICE (ULTRA FINAL)
 * ✔ Pricing 모델 기반 서비스
 * ✔ 매장 코스/금액 관리
 * ✔ 기존 구조 100% 호환
 * ✔ 트랜잭션/확장 고려
 * =====================================================
 */

const Pricing = require("../../models/Pricing");

/* =========================
UTIL
========================= */
const ok = (data = {}) => ({ ok: true, ...data });
const fail = (msg = "ERROR") => ({ ok: false, msg });

/* =========================
CREATE
========================= */
exports.createPricing = async ({ shopId, name, duration, price, discountPrice }) => {
  try {
    if (!shopId) return fail("shopId 필요");
    if (!name) return fail("name 필요");

    const doc = await Pricing.create({
      shopId,
      name,
      duration: Number(duration || 0),
      price: Number(price || 0),
      discountPrice: Number(discountPrice || 0),
    });

    return ok({ pricing: doc });
  } catch (e) {
    console.error("PRICING CREATE ERROR:", e.message);
    return fail(e.message);
  }
};

/* =========================
GET LIST
========================= */
exports.getPricingList = async ({ shopId }) => {
  try {
    if (!shopId) return fail("shopId 필요");

    const list = await Pricing.find({
      shopId,
      isDeleted: false,
    }).sort({ sortOrder: 1, createdAt: 1 });

    return ok({ list });
  } catch (e) {
    console.error("PRICING LIST ERROR:", e.message);
    return fail(e.message);
  }
};

/* =========================
GET ACTIVE
========================= */
exports.getActivePricing = async ({ shopId }) => {
  try {
    if (!shopId) return fail("shopId 필요");

    const list = await Pricing.getActiveByShop(shopId);

    return ok({ list });
  } catch (e) {
    console.error("PRICING ACTIVE ERROR:", e.message);
    return fail(e.message);
  }
};

/* =========================
UPDATE
========================= */
exports.updatePricing = async ({ id, data }) => {
  try {
    if (!id) return fail("id 필요");

    const doc = await Pricing.findById(id);
    if (!doc) return fail("pricing 없음");

    Object.assign(doc, data);

    await doc.save();

    return ok({ pricing: doc });
  } catch (e) {
    console.error("PRICING UPDATE ERROR:", e.message);
    return fail(e.message);
  }
};

/* =========================
DELETE (SOFT)
========================= */
exports.removePricing = async ({ id }) => {
  try {
    if (!id) return fail("id 필요");

    const doc = await Pricing.findById(id);
    if (!doc) return fail("pricing 없음");

    doc.isDeleted = true;
    doc.deletedAt = new Date();

    await doc.save();

    return ok();
  } catch (e) {
    console.error("PRICING DELETE ERROR:", e.message);
    return fail(e.message);
  }
};

/* =========================
BULK CREATE
========================= */
exports.bulkCreatePricing = async ({ shopId, items = [] }) => {
  try {
    if (!shopId) return fail("shopId 필요");

    if (!Array.isArray(items) || items.length === 0) {
      return ok({ list: [] });
    }

    const docs = items.map((item) => ({
      shopId,
      name: item.name,
      duration: Number(item.duration || 0),
      price: Number(item.price || 0),
      discountPrice: Number(item.discountPrice || 0),
      sortOrder: Number(item.sortOrder || 0),
    }));

    const result = await Pricing.insertMany(docs);

    return ok({ list: result });
  } catch (e) {
    console.error("PRICING BULK ERROR:", e.message);
    return fail(e.message);
  }
};

/* =========================
CALCULATE FINAL PRICE
========================= */
exports.getFinalPrice = async ({ pricingId }) => {
  try {
    if (!pricingId) return fail("pricingId 필요");

    const doc = await Pricing.findById(pricingId);
    if (!doc) return fail("pricing 없음");

    return ok({
      price: doc.getFinalPrice(),
    });
  } catch (e) {
    console.error("PRICING FINAL ERROR:", e.message);
    return fail(e.message);
  }
};