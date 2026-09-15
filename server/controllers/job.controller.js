"use strict";

const fs = require("fs");
const mongoose = require("mongoose");
const Job = require("../models/Job");
const Shop = require("../models/Shop");

function loadShopLinkRequestModel() {
  const candidates = [
    "../models/ShopLinkRequest",
    "../../models/ShopLinkRequest",
  ];

  for (const modulePath of candidates) {
    try {
      const model = require(modulePath);
      if (model) return model;
    } catch (_) {
      // 다음 실제 후보 경로를 확인합니다.
    }
  }

  return mongoose.models?.ShopLinkRequest || null;
}

const ShopLinkRequest = loadShopLinkRequestModel();

function loadUserModel() {
  const candidates = ["../models/User", "../../models/User"];

  for (const modulePath of candidates) {
    try {
      const model = require(modulePath);
      if (model) return model;
    } catch (_) {
      // 다음 실제 후보 경로를 확인합니다.
    }
  }

  return mongoose.models?.User || mongoose.models?.user || null;
}

const User = loadUserModel();

const PUBLIC_STATUSES = ["recruiting", "closed"];
const ADMIN_STATUSES = ["draft", "recruiting", "closed", "hidden"];
const PAY_TYPES = ["hourly", "daily", "monthly", "case", "negotiable", "other"];

function ok(res, data = {}, status = 200) {
  return res.status(status).json({
    ok: true,
    ...data,
  });
}

function fail(res, status, message, extra = {}) {
  return res.status(status).json({
    ok: false,
    message,
    msg: message,
    ...extra,
  });
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeRegex(value) {
  const text = normalizeText(value);
  return text ? new RegExp(escapeRegExp(text), "i") : null;
}

function toSafeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toNullableNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toBoolean(value, fallback = false) {
  if (value === true || value === false) return value;

  const text = normalizeLower(value);

  if (["true", "1", "yes", "y", "on"].includes(text)) return true;
  if (["false", "0", "no", "n", "off"].includes(text)) return false;

  return fallback;
}

function normalizeServiceType(value) {
  const text = normalizeLower(value).replace(/[\s_-]+/g, "");

  if (
    text === "karaoke" ||
    text.includes("노래방") ||
    text.includes("가라오케") ||
    text.includes("karaoke")
  ) {
    return "karaoke";
  }

  if (
    text === "massage" ||
    text.includes("마사지") ||
    text.includes("테라피") ||
    text.includes("therapy") ||
    text.includes("massage")
  ) {
    return "massage";
  }

  return "";
}

function detectShopServiceType(shop = {}) {
  const directCandidates = [
    shop.serviceType,
    shop.category,
    shop.shopCategory,
    shop.businessType,
    shop.adminCategory,
    shop.type,
  ];

  for (const value of directCandidates) {
    const normalized = normalizeServiceType(value);
    if (normalized) return normalized;
  }

  const identity = [
    shop.name,
    shop.shopName,
    shop.title,
    shop.businessName,
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeServiceType(identity);
}

function getImageValue(value) {
  if (!value) return "";
  if (typeof value === "string") return normalizeText(value);

  if (typeof value === "object") {
    return normalizeText(
      value.url ||
        value.src ||
        value.path ||
        value.image ||
        value.imageUrl ||
        value.thumbnail ||
        value.thumbnailUrl ||
        value.mainImage ||
        value.representativeImage ||
        value.coverImage ||
        value.photo ||
        value.picture ||
        ""
    );
  }

  return "";
}

function collectImages(value = {}) {
  const result = [];
  const add = (item) => {
    if (!item) return;

    if (Array.isArray(item)) {
      item.forEach(add);
      return;
    }

    const image = getImageValue(item);
    if (image && !result.includes(image)) {
      result.push(image);
    }
  };

  add(value.images);
  add(value.photos);
  add(value.imageUrls);
  add(value.gallery);
  add(value.pictures);

  if (result.length === 0) {
    add(value.representativeImage);
    add(value.mainImage);
    add(value.thumbnail);
    add(value.coverImage);
    add(value.image);
    add(value.imageUrl);
  }

  return result.slice(0, 12);
}

function getRequestOrigin(req = {}) {
  const forwardedProto = normalizeText(req.headers?.["x-forwarded-proto"])
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = normalizeText(req.get?.("host") || req.headers?.host);

  if (!host) return "";
  return `${protocol}://${host}`;
}

function getUploadedJobImages(req = {}) {
  const files = Array.isArray(req.files) ? req.files : [];
  const origin = getRequestOrigin(req);
  const result = [];

  files.slice(0, 12).forEach((file) => {
    const filename = normalizeText(file?.filename);
    if (!filename) return;

    const url = origin
      ? `${origin}/uploads/${filename}`
      : `/uploads/${filename}`;

    if (!result.includes(url)) {
      result.push(url);
    }
  });

  return result;
}

function cleanupUploadedRequestFiles(req = {}) {
  const files = Array.isArray(req.files) ? req.files : [];

  files.forEach((file) => {
    const filePath = normalizeText(file?.path);
    if (!filePath) return;

    fs.unlink(filePath, (error) => {
      if (error && error.code !== "ENOENT") {
        console.warn("JOB IMAGE CLEANUP ERROR:", error?.message || error);
      }
    });
  });
}

function getAddress(value = {}) {
  return normalizeText(
    value.roadAddress ||
      value.address ||
      value.fullAddress ||
      value.locationText ||
      value.road_address_name ||
      value.location?.roadAddress ||
      value.location?.address ||
      ""
  );
}

function getRoadAddress(value = {}) {
  return normalizeText(
    value.roadAddress ||
      value.road_address_name ||
      value.fullAddress ||
      value.address ||
      value.locationText ||
      ""
  );
}

function getPhone(value = {}) {
  return normalizeText(
    value.virtualPhone ||
      value.phone ||
      value.phoneNumber ||
      value.tel ||
      value.mobile ||
      ""
  );
}

function getShopName(value = {}) {
  return normalizeText(
    value.name ||
      value.shopName ||
      value.title ||
      value.businessName ||
      ""
  );
}

function getRegionData(value = {}) {
  const region = normalizeText(
    value.region ||
      value.province ||
      value.sido ||
      value.location?.region ||
      ""
  );

  const province = normalizeText(
    value.province ||
      value.region ||
      value.sido ||
      ""
  );

  const city = normalizeText(
    value.city ||
      value.sigungu ||
      value.location?.city ||
      ""
  );

  const district = normalizeText(
    value.district ||
      value.dong ||
      value.eupmyeon ||
      value.location?.district ||
      ""
  );

  return {
    region,
    province,
    city,
    district,
  };
}

function getCoordinates(value = {}) {
  const directLat = toNullableNumber(
    value.lat ??
      value.latitude ??
      value.location?.lat ??
      value.location?.latitude
  );

  const directLng = toNullableNumber(
    value.lng ??
      value.longitude ??
      value.location?.lng ??
      value.location?.longitude
  );

  if (
    directLat !== null &&
    directLng !== null &&
    directLat >= -90 &&
    directLat <= 90 &&
    directLng >= -180 &&
    directLng <= 180
  ) {
    return {
      lat: directLat,
      lng: directLng,
    };
  }

  const coordinates = Array.isArray(value.location?.coordinates)
    ? value.location.coordinates
    : Array.isArray(value.coordinates)
    ? value.coordinates
    : [];

  const lng = toNullableNumber(coordinates[0]);
  const lat = toNullableNumber(coordinates[1]);

  if (
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return { lat, lng };
  }

  return {
    lat: null,
    lng: null,
  };
}

function buildShopSnapshot(shop = {}, requestedServiceType = "") {
  const images = collectImages(shop);
  const regionData = getRegionData(shop);
  const coordinates = getCoordinates(shop);
  const detectedServiceType = detectShopServiceType(shop);
  const normalizedRequestedServiceType = normalizeServiceType(requestedServiceType);

  if (
    normalizedRequestedServiceType &&
    detectedServiceType &&
    normalizedRequestedServiceType !== detectedServiceType
  ) {
    const error = new Error("SHOP_SERVICE_TYPE_MISMATCH");
    error.code = "SHOP_SERVICE_TYPE_MISMATCH";
    throw error;
  }

  return {
    serviceType:
      normalizedRequestedServiceType ||
      detectedServiceType ||
      "massage",
    shopName: getShopName(shop),
    ...regionData,
    address: getAddress(shop),
    roadAddress: getRoadAddress(shop),
    contactPhone: getPhone(shop),
    image: images[0] || "",
    images,
    lat: coordinates.lat,
    lng: coordinates.lng,
  };
}

function parseDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizePayType(value) {
  const text = normalizeLower(value);
  return PAY_TYPES.includes(text) ? text : "negotiable";
}

function normalizeTier(value) {
  return normalizeLower(value) === "premium" ? "premium" : "normal";
}

function normalizeStatus(value, fallback = "recruiting") {
  const text = normalizeLower(value);
  return ADMIN_STATUSES.includes(text) ? text : fallback;
}

function normalizePayloadFields(body = {}, current = {}) {
  const tier = normalizeTier(body.tier ?? current.tier);
  const status = normalizeStatus(body.status ?? current.status, current.status || "recruiting");

  const payMin = Math.max(0, toSafeNumber(body.payMin ?? current.payMin, 0));
  const payMax = Math.max(0, toSafeNumber(body.payMax ?? current.payMax, 0));

  return {
    title: normalizeText(body.title ?? current.title),
    payType: normalizePayType(body.payType ?? current.payType),
    payMin,
    payMax,
    payText: normalizeText(body.payText ?? current.payText) || "협의",
    workTime: normalizeText(body.workTime ?? current.workTime),
    workDays: normalizeText(body.workDays ?? current.workDays),
    conditions: normalizeText(body.conditions ?? current.conditions),
    beginnerAllowed: toBoolean(
      body.beginnerAllowed,
      current.beginnerAllowed === true
    ),
    lodgingProvided: toBoolean(
      body.lodgingProvided,
      current.lodgingProvided === true
    ),
    urgent: toBoolean(body.urgent, current.urgent === true),
    recommended: toBoolean(body.recommended, current.recommended === true),
    tier,
    premiumStartAt:
      tier === "premium"
        ? parseDate(body.premiumStartAt ?? current.premiumStartAt)
        : null,
    premiumEndAt:
      tier === "premium"
        ? parseDate(body.premiumEndAt ?? current.premiumEndAt)
        : null,
    status,
    contactPhone: normalizeText(body.contactPhone ?? current.contactPhone),
  };
}

function getAdminIdentity(req = {}) {
  return normalizeText(
    req.userId ||
      req.user?._id ||
      req.user?.id ||
      req.auth?.userId ||
      req.auth?.id ||
      "admin"
  );
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function isEffectivePremium(job = {}, now = new Date()) {
  if (normalizeTier(job.tier) !== "premium") {
    return false;
  }

  const start = parseDate(job.premiumStartAt);
  const end = parseDate(job.premiumEndAt);

  if (start && start.getTime() > now.getTime()) {
    return false;
  }

  if (end && end.getTime() < now.getTime()) {
    return false;
  }

  return true;
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const aLat = toNullableNumber(lat1);
  const aLng = toNullableNumber(lng1);
  const bLat = toNullableNumber(lat2);
  const bLng = toNullableNumber(lng2);

  if (
    aLat === null ||
    aLng === null ||
    bLat === null ||
    bLng === null
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1Rad = toRadians(aLat);
  const lat2Rad = toRadians(bLat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const distance =
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Number(distance.toFixed(2));
}

function makeJobResponse(job = {}, visitor = null) {
  const raw = job && typeof job.toObject === "function" ? job.toObject() : job || {};
  const populatedShop =
    raw.shop && typeof raw.shop === "object" && !Array.isArray(raw.shop)
      ? raw.shop
      : null;

  const customJobImages = collectImages({ images: raw.jobImages });
  const snapshotImages = collectImages(raw);
  const shopImages = collectImages(populatedShop || {});
  const images = customJobImages.length
    ? customJobImages
    : shopImages.length
    ? shopImages
    : snapshotImages;
  const jobCoords = getCoordinates(raw);
  const shopCoords = getCoordinates(populatedShop || {});
  const lat = jobCoords.lat !== null ? jobCoords.lat : shopCoords.lat;
  const lng = jobCoords.lng !== null ? jobCoords.lng : shopCoords.lng;
  const distanceKm = visitor
    ? getDistanceKm(visitor.lat, visitor.lng, lat, lng)
    : null;
  const premium = isEffectivePremium(raw);
  const confirmationDate = parseDate(
    raw.lastConfirmedAt || raw.updatedAt || raw.publishedAt || raw.createdAt
  );
  const needsConfirmation = confirmationDate
    ? Date.now() - confirmationDate.getTime() > 30 * 24 * 60 * 60 * 1000
    : true;
  const shopId = normalizeText(
    populatedShop?._id ||
      populatedShop?.id ||
      raw.shop?._id ||
      raw.shop ||
      ""
  );

  return {
    _id: normalizeText(raw._id || raw.id),
    id: normalizeText(raw._id || raw.id),
    shopId,
    serviceType:
      normalizeServiceType(raw.serviceType) ||
      detectShopServiceType(populatedShop || {}) ||
      "massage",
    title: normalizeText(raw.title),
    shopName:
      getShopName(populatedShop || {}) ||
      normalizeText(raw.shopName),
    region:
      normalizeText(raw.region) ||
      getRegionData(populatedShop || {}).region,
    province:
      normalizeText(raw.province) ||
      getRegionData(populatedShop || {}).province,
    city:
      normalizeText(raw.city) ||
      getRegionData(populatedShop || {}).city,
    district:
      normalizeText(raw.district) ||
      getRegionData(populatedShop || {}).district,
    address:
      getAddress(populatedShop || {}) ||
      normalizeText(raw.address),
    roadAddress:
      getRoadAddress(populatedShop || {}) ||
      normalizeText(raw.roadAddress),
    contactPhone:
      normalizeText(raw.contactPhone) ||
      getPhone(populatedShop || {}),
    image: images[0] || normalizeText(raw.image),
    images,
    jobImages: customJobImages,
    hasCustomImages: customJobImages.length > 0,
    lat,
    lng,
    distanceKm,
    payType: normalizePayType(raw.payType),
    payMin: Math.max(0, toSafeNumber(raw.payMin, 0)),
    payMax: Math.max(0, toSafeNumber(raw.payMax, 0)),
    payText: normalizeText(raw.payText) || "협의",
    workTime: normalizeText(raw.workTime),
    workDays: normalizeText(raw.workDays),
    conditions: normalizeText(raw.conditions),
    beginnerAllowed: raw.beginnerAllowed === true,
    lodgingProvided: raw.lodgingProvided === true,
    urgent: raw.urgent === true,
    recommended: raw.recommended === true,
    tier: normalizeTier(raw.tier),
    effectiveTier: premium ? "premium" : "normal",
    isPremium: premium,
    premiumStartAt: raw.premiumStartAt || null,
    premiumEndAt: raw.premiumEndAt || null,
    status: normalizeStatus(raw.status, "recruiting"),
    publishedAt: raw.publishedAt || null,
    closedAt: raw.closedAt || null,
    lastConfirmedAt: raw.lastConfirmedAt || null,
    needsConfirmation,
    views: Math.max(0, toSafeNumber(raw.views, 0)),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

function getVisitorPosition(query = {}) {
  const lat = toNullableNumber(query.lat ?? query.latitude);
  const lng = toNullableNumber(query.lng ?? query.longitude);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
}

function getFreshTimestamp(job = {}) {
  const values = [
    job.lastConfirmedAt,
    job.updatedAt,
    job.publishedAt,
    job.createdAt,
  ];

  for (const value of values) {
    const date = parseDate(value);
    if (date) return date.getTime();
  }

  return 0;
}

function sortPublicJobs(items = [], hasVisitorPosition = false) {
  return [...items].sort((a, b) => {
    if (hasVisitorPosition) {
      const aDistance = Number.isFinite(Number(a.distanceKm))
        ? Number(a.distanceKm)
        : Number.POSITIVE_INFINITY;
      const bDistance = Number.isFinite(Number(b.distanceKm))
        ? Number(b.distanceKm)
        : Number.POSITIVE_INFINITY;

      if (aDistance !== bDistance) {
        return aDistance - bDistance;
      }
    }

    return getFreshTimestamp(b) - getFreshTimestamp(a);
  });
}

function buildPublicQuery(query = {}) {
  const clauses = [
    {
      status: "recruiting",
    },
  ];

  const serviceType = normalizeServiceType(query.serviceType || query.category);
  if (serviceType) {
    clauses.push({ serviceType });
  }

  const keyword = makeRegex(query.keyword || query.search || query.q);
  if (keyword) {
    clauses.push({
      $or: [
        { title: keyword },
        { shopName: keyword },
        { address: keyword },
        { roadAddress: keyword },
        { conditions: keyword },
      ],
    });
  }

  const region = makeRegex(query.region || query.province);
  if (region) {
    clauses.push({
      $or: [
        { region },
        { province: region },
        { address: region },
        { roadAddress: region },
      ],
    });
  }

  const district = makeRegex(query.district || query.city);
  if (district) {
    clauses.push({
      $or: [
        { city: district },
        { district },
        { address: district },
        { roadAddress: district },
      ],
    });
  }

  const workTime = makeRegex(query.workTime);
  if (workTime) {
    clauses.push({ workTime });
  }

  const payType = normalizeLower(query.payType);
  if (PAY_TYPES.includes(payType)) {
    clauses.push({ payType });
  }

  const minPay = Math.max(0, toSafeNumber(query.minPay, 0));
  if (minPay > 0) {
    clauses.push({
      $or: [
        { payMax: { $gte: minPay } },
        { payMin: { $gte: minPay } },
      ],
    });
  }

  if (query.beginnerAllowed !== undefined && query.beginnerAllowed !== "") {
    clauses.push({
      beginnerAllowed: toBoolean(query.beginnerAllowed),
    });
  }

  if (query.lodgingProvided !== undefined && query.lodgingProvided !== "") {
    clauses.push({
      lodgingProvided: toBoolean(query.lodgingProvided),
    });
  }

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

function buildAdminQuery(query = {}) {
  const clauses = [];
  const serviceType = normalizeServiceType(query.serviceType || query.category);

  if (serviceType) {
    clauses.push({ serviceType });
  }

  const status = normalizeLower(query.status);
  if (ADMIN_STATUSES.includes(status)) {
    clauses.push({ status });
  }

  const tier = normalizeLower(query.tier);
  if (["normal", "premium"].includes(tier)) {
    clauses.push({ tier });
  }

  const keyword = makeRegex(query.keyword || query.search || query.q);
  if (keyword) {
    clauses.push({
      $or: [
        { title: keyword },
        { shopName: keyword },
        { address: keyword },
        { contactPhone: keyword },
      ],
    });
  }

  return clauses.length === 0
    ? {}
    : clauses.length === 1
    ? clauses[0]
    : { $and: clauses };
}

async function findShopById(shopId) {
  if (!isValidObjectId(shopId)) {
    return null;
  }

  return Shop.findById(shopId);
}

function getRequestUserId(req = {}) {
  return normalizeText(
    req.userId ||
      req.user?._id ||
      req.user?.userId ||
      req.user?.id ||
      req.auth?.userId ||
      req.auth?._id ||
      req.auth?.id ||
      ""
  );
}

function normalizeJobGrade(value) {
  return normalizeLower(value) === "premium" ? "premium" : "normal";
}

async function findRequestUserRecord(req = {}) {
  const userId = getRequestUserId(req);

  if (!userId || !User) {
    return null;
  }

  if (User?.collection && typeof User.collection.findOne === "function") {
    try {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        const byObjectId = await User.collection.findOne({
          _id: new mongoose.Types.ObjectId(userId),
        });
        if (byObjectId) return byObjectId;
      }

      const byLogin = await User.collection.findOne({
        $or: [
          { id: userId },
          { email: userId },
          { username: userId },
        ],
      });

      if (byLogin) return byLogin;
    } catch (error) {
      console.warn(
        "JOB WRITE USER RAW READ ERROR:",
        error?.message || error
      );
    }
  }

  try {
    if (mongoose.Types.ObjectId.isValid(userId)) {
      return await User.findById(userId).lean();
    }

    return await User.findOne({
      $or: [{ id: userId }, { email: userId }, { username: userId }],
    }).lean();
  } catch (error) {
    console.warn("JOB WRITE USER READ ERROR:", error?.message || error);
    return null;
  }
}

async function getJobWriteAccess(req = {}) {
  const user = await findRequestUserRecord(req);
  const role = normalizeLower(user?.role || user?.userRole || user?.type || "");
  const jobGrade = normalizeJobGrade(user?.jobGrade);
  const jobPostingEnabled = user?.jobPostingEnabled === true;

  return {
    user,
    role,
    jobGrade,
    jobPostingEnabled,
    canWrite: role === "shop" && jobPostingEnabled,
  };
}

function getJobShopLinkCollection() {
  try {
    if (ShopLinkRequest?.collection) {
      return ShopLinkRequest.collection;
    }

    const db = ShopLinkRequest?.db || Shop?.db || User?.db || mongoose.connection;
    if (db && typeof db.collection === "function") {
      return db.collection("shop_link_requests");
    }
  } catch (error) {
    console.warn(
      "JOB SHOP LINK COLLECTION RESOLVE ERROR:",
      error?.message || error
    );
  }

  return null;
}

async function findJobShopLinkRequest(userId, allowPending = false) {
  if (!userId) return null;

  const userValues = [userId, String(userId)];

  if (ShopLinkRequest) {
    try {
      let request = await ShopLinkRequest.findOne({
        user: { $in: userValues },
        status: "approved",
      })
        .sort({ reviewedAt: -1, updatedAt: -1, createdAt: -1 })
        .lean();

      if (!request && allowPending) {
        request = await ShopLinkRequest.findOne({
          user: { $in: userValues },
          status: "pending",
        })
          .sort({ requestedAt: -1, createdAt: -1 })
          .lean();
      }

      if (request) return request;
    } catch (error) {
      console.warn(
        "JOB SHOP LINK MODEL LOOKUP ERROR:",
        error?.message || error
      );
    }
  }

  const collection = getJobShopLinkCollection();
  if (!collection || typeof collection.findOne !== "function") {
    return null;
  }

  try {
    let request = await collection.findOne(
      {
        user: { $in: userValues },
        status: "approved",
      },
      {
        sort: { reviewedAt: -1, updatedAt: -1, createdAt: -1 },
      }
    );

    if (!request && allowPending) {
      request = await collection.findOne(
        {
          user: { $in: userValues },
          status: "pending",
        },
        {
          sort: { requestedAt: -1, createdAt: -1 },
        }
      );
    }

    return request || null;
  } catch (error) {
    console.warn(
      "JOB SHOP LINK RAW LOOKUP ERROR:",
      error?.message || error
    );
    return null;
  }
}

async function approveJobShopLinkRequest(linkRequest) {
  if (!linkRequest?._id) return false;

  const status = normalizeLower(linkRequest.status);
  if (status === "approved") return true;
  if (status !== "pending") return false;

  const setPayload = {
    status: "approved",
    reviewedAt: new Date(),
  };

  if (ShopLinkRequest) {
    try {
      const result = await ShopLinkRequest.updateOne(
        { _id: linkRequest._id, status: "pending" },
        { $set: setPayload }
      );

      const modified = Number(
        result?.modifiedCount ?? result?.nModified ?? result?.n ?? 0
      );

      if (modified > 0) return true;
    } catch (error) {
      console.warn(
        "JOB SHOP LINK MODEL APPROVE ERROR:",
        error?.message || error
      );
    }
  }

  const collection = getJobShopLinkCollection();
  if (!collection || typeof collection.updateOne !== "function") {
    return false;
  }

  try {
    const result = await collection.updateOne(
      { _id: linkRequest._id, status: "pending" },
      { $set: setPayload }
    );

    return Number(result?.modifiedCount || 0) > 0;
  } catch (error) {
    console.warn(
      "JOB SHOP LINK RAW APPROVE ERROR:",
      error?.message || error
    );
    return false;
  }
}

async function findShopByOwnerRaw(userId) {
  if (!Shop || !userId) return null;

  const ownerValues = [userId, String(userId)];

  if (Shop?.collection && typeof Shop.collection.findOne === "function") {
    try {
      const raw = await Shop.collection.findOne({
        owner: { $in: ownerValues },
        isDeleted: { $ne: true },
      });

      if (raw?._id) {
        const shop = await Shop.findById(raw._id);
        if (shop && shop.isDeleted !== true) return shop;
      }
    } catch (error) {
      console.warn("JOB SHOP RAW OWNER LOOKUP ERROR:", error?.message || error);
    }
  }

  try {
    return await Shop.findOne({
      owner: { $in: ownerValues },
      isDeleted: { $ne: true },
    });
  } catch (error) {
    console.warn("JOB SHOP OWNER LOOKUP ERROR:", error?.message || error);
    return null;
  }
}

async function findOwnedShopForRequest(req = {}, preloadedUser = null) {
  const user = preloadedUser || (await findRequestUserRecord(req));
  const rawRequestUserId = getRequestUserId(req);
  const resolvedUserId = normalizeText(user?._id || rawRequestUserId);

  if (!resolvedUserId || !user?._id) {
    return null;
  }

  const userObjectId = user._id;

  // 1) 이미 승인 완료되어 Shop.owner가 저장된 업체를 최우선으로 사용합니다.
  let shop = await findShopByOwnerRaw(userObjectId);

  if (shop) {
    return shop;
  }

  // 2) 관리자에서 채용정보 ON인 업체회원은 가입 시 선택한 pending 업체를
  //    승인된 연결 업체로 자동 복구합니다. 임의의 다른 업체는 연결하지 않습니다.
  const allowPending = user?.jobPostingEnabled === true;
  const linkRequest = await findJobShopLinkRequest(userObjectId, allowPending);

  if (!linkRequest?.shop) {
    return null;
  }

  shop = await Shop.findOne({
    _id: linkRequest.shop,
    isDeleted: { $ne: true },
  });

  if (!shop) {
    return null;
  }

  const serviceType = normalizeServiceType(user?.serviceType);
  const shopServiceType = normalizeServiceType(
    shop?.serviceType ||
      shop?.category ||
      shop?.shopCategory ||
      shop?.businessType ||
      shop?.adminCategory
  );

  if (serviceType && shopServiceType && serviceType !== shopServiceType) {
    return null;
  }

  const currentOwner = normalizeText(shop?.owner);

  if (currentOwner && currentOwner !== resolvedUserId) {
    return null;
  }

  try {
    if (Shop?.collection && typeof Shop.collection.updateOne === "function") {
      await Shop.collection.updateOne(
        { _id: shop._id },
        { $set: { owner: userObjectId } }
      );
    } else {
      shop.set("owner", userObjectId, { strict: false });
      await shop.save();
    }
  } catch (error) {
    console.warn("JOB SHOP OWNER REPAIR ERROR:", error?.message || error);
    return null;
  }

  if (normalizeLower(linkRequest.status) === "pending") {
    if (!allowPending) {
      return null;
    }

    const approved = await approveJobShopLinkRequest(linkRequest);
    if (!approved) {
      console.warn("JOB SHOP LINK REQUEST APPROVE FAILED");
      return null;
    }
  }

  try {
    shop.set("owner", userObjectId, { strict: false });
  } catch (_) {
    shop.owner = userObjectId;
  }

  return shop;
}

function getPremiumDurationDays(value) {
  const requested = Math.floor(toSafeNumber(value, 30));
  return [7, 15, 30].includes(requested) ? requested : 30;
}

function makeWriteContextShop(shop = {}) {
  const snapshot = buildShopSnapshot(shop);

  return {
    _id: normalizeText(shop?._id || shop?.id),
    id: normalizeText(shop?._id || shop?.id),
    name: snapshot.shopName,
    shopName: snapshot.shopName,
    serviceType: snapshot.serviceType,
    region: snapshot.region,
    province: snapshot.province,
    city: snapshot.city,
    district: snapshot.district,
    address: snapshot.address,
    roadAddress: snapshot.roadAddress,
    contactPhone: snapshot.contactPhone,
    phone: snapshot.contactPhone,
    image: snapshot.image,
    images: snapshot.images,
  };
}

function buildUserAccountSnapshot(user = {}) {
  const coordinates = getCoordinates(user);
  const serviceType = normalizeServiceType(user?.serviceType) || "massage";
  const shopName = normalizeText(
    user?.nickname ||
      user?.name ||
      user?.id ||
      user?.email ||
      "업체회원"
  );
  const address = normalizeText(user?.address || "");
  const phone = normalizeText(
    user?.phone ||
      user?.phoneNumber ||
      user?.mobile ||
      ""
  );

  return {
    serviceType,
    shopName,
    region: "",
    province: "",
    city: "",
    district: "",
    address,
    roadAddress: address,
    contactPhone: phone,
    image: "",
    images: [],
    lat: coordinates.lat,
    lng: coordinates.lng,
  };
}

function makeWriteContextUser(user = {}) {
  const snapshot = buildUserAccountSnapshot(user);

  return {
    _id: "",
    id: "",
    accountId: normalizeText(user?._id),
    loginId: normalizeText(user?.id),
    name: snapshot.shopName,
    shopName: snapshot.shopName,
    serviceType: snapshot.serviceType,
    region: snapshot.region,
    province: snapshot.province,
    city: snapshot.city,
    district: snapshot.district,
    address: snapshot.address,
    roadAddress: snapshot.roadAddress,
    contactPhone: snapshot.contactPhone,
    phone: snapshot.contactPhone,
    image: snapshot.image,
    images: snapshot.images,
  };
}

async function getWriteContext(req, res) {
  try {
    const userId = getRequestUserId(req);

    if (!userId) {
      return fail(res, 401, "AUTH_REQUIRED");
    }

    const access = await getJobWriteAccess(req);

    if (!access.user) {
      return fail(res, 401, "USER_NOT_FOUND");
    }

    if (access.role !== "shop") {
      return fail(res, 403, "SHOP_MEMBER_ONLY", {
        jobGrade: access.jobGrade,
        jobPostingEnabled: false,
        canWrite: false,
      });
    }

    if (!access.jobPostingEnabled) {
      return fail(res, 403, "JOB_POSTING_DISABLED", {
        jobGrade: access.jobGrade,
        jobPostingEnabled: false,
        canWrite: false,
      });
    }

    const shop = await findOwnedShopForRequest(req, access.user);

    return ok(res, {
      shop: shop
        ? makeWriteContextShop(shop)
        : makeWriteContextUser(access.user),
      tier: access.jobGrade,
      jobGrade: access.jobGrade,
      jobPostingEnabled: true,
      canWrite: true,
      durations: access.jobGrade === "premium" ? [7, 15, 30] : [],
    });
  } catch (error) {
    console.error("JOB WRITE CONTEXT ERROR:", error);
    return fail(res, 500, error?.message || "JOB_WRITE_CONTEXT_ERROR");
  }
}

async function createPremium(req, res) {
  try {
    const userId = getRequestUserId(req);

    if (!userId) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 401, "AUTH_REQUIRED");
    }

    const access = await getJobWriteAccess(req);

    if (!access.user) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 401, "USER_NOT_FOUND");
    }

    if (access.role !== "shop") {
      cleanupUploadedRequestFiles(req);
      return fail(res, 403, "SHOP_MEMBER_ONLY");
    }

    if (!access.jobPostingEnabled) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 403, "JOB_POSTING_DISABLED", {
        jobGrade: access.jobGrade,
        jobPostingEnabled: false,
      });
    }

    if (access.jobGrade !== "premium") {
      cleanupUploadedRequestFiles(req);
      return fail(res, 403, "JOB_GRADE_NOT_ALLOWED", {
        requiredGrade: "premium",
        jobGrade: access.jobGrade,
      });
    }

    const shop = await findOwnedShopForRequest(req, access.user);
    const body = req.body || {};
    let snapshot;

    try {
      snapshot = shop
        ? buildShopSnapshot(shop)
        : buildUserAccountSnapshot(access.user);
    } catch (error) {
      if (error?.code === "SHOP_SERVICE_TYPE_MISMATCH") {
        cleanupUploadedRequestFiles(req);
        return fail(res, 400, "SHOP_SERVICE_TYPE_MISMATCH");
      }
      throw error;
    }
    const uploadedJobImages = getUploadedJobImages(req);
    const fields = normalizePayloadFields(
      {
        ...body,
        tier: "premium",
        status: "recruiting",
      },
      {}
    );

    if (!fields.title) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 400, "JOB_TITLE_REQUIRED");
    }

    if (!normalizeText(body.conditions)) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 400, "JOB_CONDITIONS_REQUIRED");
    }

    if (fields.contactPhone) {
      snapshot.contactPhone = fields.contactPhone;
    }

    const enteredAddress = normalizeText(body.address || body.roadAddress);
    if (enteredAddress) {
      snapshot.address = enteredAddress;
      snapshot.roadAddress = enteredAddress;
    }

    const now = new Date();
    const durationDays = getPremiumDurationDays(body.durationDays);
    const premiumEndAt = new Date(
      now.getTime() + durationDays * 24 * 60 * 60 * 1000
    );

    const authorId = normalizeText(access.user?._id || userId);

    const job = await Job.create({
      shop: shop?._id || null,
      ...snapshot,
      ...fields,
      jobImages: uploadedJobImages,
      tier: "premium",
      premiumStartAt: now,
      premiumEndAt,
      status: "recruiting",
      publishedAt: now,
      closedAt: null,
      lastConfirmedAt: now,
      createdBy: authorId,
      updatedBy: authorId,
    });

    const populatedJob = await Job.findById(job._id).populate("shop").lean();

    return ok(
      res,
      {
        job: makeJobResponse(populatedJob),
        message: "PREMIUM_JOB_CREATED",
        durationDays,
      },
      201
    );
  } catch (error) {
    cleanupUploadedRequestFiles(req);
    console.error("JOB PREMIUM CREATE ERROR:", error);
    return fail(res, 500, error?.message || "PREMIUM_JOB_CREATE_ERROR");
  }
}

async function createNormal(req, res) {
  try {
    const userId = getRequestUserId(req);

    if (!userId) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 401, "AUTH_REQUIRED");
    }

    const access = await getJobWriteAccess(req);

    if (!access.user) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 401, "USER_NOT_FOUND");
    }

    if (access.role !== "shop") {
      cleanupUploadedRequestFiles(req);
      return fail(res, 403, "SHOP_MEMBER_ONLY");
    }

    if (!access.jobPostingEnabled) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 403, "JOB_POSTING_DISABLED", {
        jobGrade: access.jobGrade,
        jobPostingEnabled: false,
      });
    }

    if (access.jobGrade !== "normal") {
      cleanupUploadedRequestFiles(req);
      return fail(res, 403, "JOB_GRADE_NOT_ALLOWED", {
        requiredGrade: "normal",
        jobGrade: access.jobGrade,
      });
    }

    const shop = await findOwnedShopForRequest(req, access.user);
    const body = req.body || {};
    let snapshot;

    try {
      snapshot = shop
        ? buildShopSnapshot(shop)
        : buildUserAccountSnapshot(access.user);
    } catch (error) {
      if (error?.code === "SHOP_SERVICE_TYPE_MISMATCH") {
        cleanupUploadedRequestFiles(req);
        return fail(res, 400, "SHOP_SERVICE_TYPE_MISMATCH");
      }
      throw error;
    }
    const uploadedJobImages = getUploadedJobImages(req);
    const fields = normalizePayloadFields(
      {
        ...body,
        tier: "normal",
        status: "recruiting",
      },
      {}
    );

    if (!fields.title) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 400, "JOB_TITLE_REQUIRED");
    }

    if (!normalizeText(body.conditions)) {
      cleanupUploadedRequestFiles(req);
      return fail(res, 400, "JOB_CONDITIONS_REQUIRED");
    }

    if (fields.contactPhone) {
      snapshot.contactPhone = fields.contactPhone;
    }

    const enteredAddress = normalizeText(body.address || body.roadAddress);
    if (enteredAddress) {
      snapshot.address = enteredAddress;
      snapshot.roadAddress = enteredAddress;
    }

    const now = new Date();

    const authorId = normalizeText(access.user?._id || userId);

    const job = await Job.create({
      shop: shop?._id || null,
      ...snapshot,
      ...fields,
      jobImages: uploadedJobImages,
      tier: "normal",
      premiumStartAt: null,
      premiumEndAt: null,
      status: "recruiting",
      publishedAt: now,
      closedAt: null,
      lastConfirmedAt: now,
      createdBy: authorId,
      updatedBy: authorId,
    });

    const populatedJob = await Job.findById(job._id).populate("shop").lean();

    return ok(
      res,
      {
        job: makeJobResponse(populatedJob),
        message: "NORMAL_JOB_CREATED",
      },
      201
    );
  } catch (error) {
    cleanupUploadedRequestFiles(req);
    console.error("JOB NORMAL CREATE ERROR:", error);
    return fail(res, 500, error?.message || "NORMAL_JOB_CREATE_ERROR");
  }
}

async function getPublicList(req, res) {
  try {
    const visitor = getVisitorPosition(req.query || {});
    const query = buildPublicQuery(req.query || {});
    const requestedLimit = Math.max(1, toSafeNumber(req.query?.limit, 100));
    const limit = Math.min(requestedLimit, 200);

    const jobs = await Job.find(query)
      .sort({ updatedAt: -1, publishedAt: -1 })
      .limit(limit)
      .populate("shop")
      .lean();

    const normalized = jobs.map((job) => makeJobResponse(job, visitor));
    const premiumJobs = sortPublicJobs(
      normalized.filter((job) => job.isPremium),
      !!visitor
    );
    const normalJobs = sortPublicJobs(
      normalized.filter((job) => !job.isPremium),
      !!visitor
    );

    return ok(res, {
      items: [...premiumJobs, ...normalJobs],
      premiumJobs,
      normalJobs,
      counts: {
        total: normalized.length,
        premium: premiumJobs.length,
        normal: normalJobs.length,
      },
      visitorLocationUsed: !!visitor,
    });
  } catch (error) {
    console.error("JOB PUBLIC LIST ERROR:", error);
    return fail(res, 500, error?.message || "JOB_LIST_ERROR");
  }
}

async function getPublicDetail(req, res) {
  try {
    const jobId = req.params?.jobId;

    if (!isValidObjectId(jobId)) {
      return fail(res, 400, "INVALID_JOB_ID");
    }

    const job = await Job.findOneAndUpdate(
      {
        _id: jobId,
        status: { $in: PUBLIC_STATUSES },
      },
      {
        $inc: { views: 1 },
      },
      {
        new: true,
      }
    )
      .populate("shop")
      .lean();

    if (!job || job.status === "hidden" || job.status === "draft") {
      return fail(res, 404, "JOB_NOT_FOUND");
    }

    const visitor = getVisitorPosition(req.query || {});

    return ok(res, {
      job: makeJobResponse(job, visitor),
    });
  } catch (error) {
    console.error("JOB PUBLIC DETAIL ERROR:", error);
    return fail(res, 500, error?.message || "JOB_DETAIL_ERROR");
  }
}

async function adminList(req, res) {
  try {
    const query = buildAdminQuery(req.query || {});
    const jobs = await Job.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("shop")
      .lean();

    const items = jobs.map((job) => makeJobResponse(job));

    return ok(res, {
      items,
      jobs: items,
      count: items.length,
    });
  } catch (error) {
    console.error("JOB ADMIN LIST ERROR:", error);
    return fail(res, 500, error?.message || "JOB_ADMIN_LIST_ERROR");
  }
}

async function adminDetail(req, res) {
  try {
    const jobId = req.params?.jobId;

    if (!isValidObjectId(jobId)) {
      return fail(res, 400, "INVALID_JOB_ID");
    }

    const job = await Job.findById(jobId).populate("shop").lean();

    if (!job) {
      return fail(res, 404, "JOB_NOT_FOUND");
    }

    return ok(res, {
      job: makeJobResponse(job),
    });
  } catch (error) {
    console.error("JOB ADMIN DETAIL ERROR:", error);
    return fail(res, 500, error?.message || "JOB_ADMIN_DETAIL_ERROR");
  }
}

async function adminCreate(req, res) {
  try {
    const body = req.body || {};
    const shopId = normalizeText(body.shopId || body.shop);

    if (!isValidObjectId(shopId)) {
      return fail(res, 400, "SHOP_REQUIRED");
    }

    const shop = await findShopById(shopId);

    if (!shop) {
      return fail(res, 404, "SHOP_NOT_FOUND");
    }

    let snapshot;

    try {
      snapshot = buildShopSnapshot(shop, body.serviceType);
    } catch (error) {
      if (error?.code === "SHOP_SERVICE_TYPE_MISMATCH") {
        return fail(res, 400, "SHOP_SERVICE_TYPE_MISMATCH");
      }
      throw error;
    }

    const fields = normalizePayloadFields(body, {});

    if (!fields.title) {
      return fail(res, 400, "JOB_TITLE_REQUIRED");
    }

    if (!snapshot.shopName) {
      return fail(res, 400, "SHOP_NAME_REQUIRED");
    }

    if (fields.contactPhone) {
      snapshot.contactPhone = fields.contactPhone;
    }

    const now = new Date();
    const adminIdentity = getAdminIdentity(req);

    const job = await Job.create({
      shop: shop._id,
      ...snapshot,
      ...fields,
      publishedAt: fields.status === "recruiting" ? now : null,
      closedAt: fields.status === "closed" ? now : null,
      lastConfirmedAt: now,
      createdBy: adminIdentity,
      updatedBy: adminIdentity,
    });

    const populatedJob = await Job.findById(job._id).populate("shop").lean();

    return ok(
      res,
      {
        job: makeJobResponse(populatedJob),
        message: "JOB_CREATED",
      },
      201
    );
  } catch (error) {
    console.error("JOB ADMIN CREATE ERROR:", error);
    return fail(res, 500, error?.message || "JOB_CREATE_ERROR");
  }
}

async function adminUpdate(req, res) {
  try {
    const jobId = req.params?.jobId;

    if (!isValidObjectId(jobId)) {
      return fail(res, 400, "INVALID_JOB_ID");
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return fail(res, 404, "JOB_NOT_FOUND");
    }

    const body = req.body || {};
    const nextShopId = normalizeText(body.shopId || body.shop || job.shop);
    const shop = await findShopById(nextShopId);

    if (!shop) {
      return fail(res, 404, "SHOP_NOT_FOUND");
    }

    const requestedServiceType =
      body.serviceType !== undefined
        ? body.serviceType
        : job.serviceType;

    let snapshot;

    try {
      snapshot = buildShopSnapshot(shop, requestedServiceType);
    } catch (error) {
      if (error?.code === "SHOP_SERVICE_TYPE_MISMATCH") {
        return fail(res, 400, "SHOP_SERVICE_TYPE_MISMATCH");
      }
      throw error;
    }

    const fields = normalizePayloadFields(body, job.toObject());

    if (!fields.title) {
      return fail(res, 400, "JOB_TITLE_REQUIRED");
    }

    if (fields.contactPhone) {
      snapshot.contactPhone = fields.contactPhone;
    } else if (job.contactPhone) {
      snapshot.contactPhone = job.contactPhone;
    }

    const now = new Date();

    job.shop = shop._id;
    Object.assign(job, snapshot, fields);
    job.lastConfirmedAt = now;
    job.updatedBy = getAdminIdentity(req);

    if (job.status === "recruiting") {
      job.closedAt = null;
      if (!job.publishedAt) {
        job.publishedAt = now;
      }
    }

    if (job.status === "closed" && !job.closedAt) {
      job.closedAt = now;
    }

    await job.save();

    const populatedJob = await Job.findById(job._id).populate("shop").lean();

    return ok(res, {
      job: makeJobResponse(populatedJob),
      message: "JOB_UPDATED",
    });
  } catch (error) {
    console.error("JOB ADMIN UPDATE ERROR:", error);
    return fail(res, 500, error?.message || "JOB_UPDATE_ERROR");
  }
}

async function adminClose(req, res) {
  try {
    const jobId = req.params?.jobId;

    if (!isValidObjectId(jobId)) {
      return fail(res, 400, "INVALID_JOB_ID");
    }

    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: {
          status: "closed",
          closedAt: new Date(),
          lastConfirmedAt: new Date(),
          updatedBy: getAdminIdentity(req),
        },
      },
      { new: true }
    )
      .populate("shop")
      .lean();

    if (!job) {
      return fail(res, 404, "JOB_NOT_FOUND");
    }

    return ok(res, {
      job: makeJobResponse(job),
      message: "JOB_CLOSED",
    });
  } catch (error) {
    console.error("JOB ADMIN CLOSE ERROR:", error);
    return fail(res, 500, error?.message || "JOB_CLOSE_ERROR");
  }
}

async function adminDelete(req, res) {
  try {
    const jobId = req.params?.jobId;

    if (!isValidObjectId(jobId)) {
      return fail(res, 400, "INVALID_JOB_ID");
    }

    const job = await Job.findByIdAndDelete(jobId);

    if (!job) {
      return fail(res, 404, "JOB_NOT_FOUND");
    }

    return ok(res, {
      deleted: true,
      jobId: normalizeText(job._id),
      message: "JOB_DELETED",
    });
  } catch (error) {
    console.error("JOB ADMIN DELETE ERROR:", error);
    return fail(res, 500, error?.message || "JOB_DELETE_ERROR");
  }
}

module.exports = {
  getPublicList,
  getPublicDetail,
  getWriteContext,
  createPremium,
  createNormal,
  adminList,
  adminDetail,
  adminCreate,
  adminUpdate,
  adminClose,
  adminDelete,
};
