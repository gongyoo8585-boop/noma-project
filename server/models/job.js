"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

const JOB_STATUS = ["draft", "recruiting", "closed", "hidden"];
const JOB_TIER = ["normal", "premium"];
const SERVICE_TYPES = ["massage", "karaoke"];
const PAY_TYPES = ["hourly", "daily", "monthly", "case", "negotiable", "other"];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeImageArray(value) {
  const list = Array.isArray(value)
    ? value
    : value
    ? [value]
    : [];

  return list
    .flatMap((item) => {
      if (!item) return [];
      if (typeof item === "string") return [item];
      if (typeof item === "object") {
        return [
          item.url ||
            item.src ||
            item.path ||
            item.image ||
            item.imageUrl ||
            item.thumbnail ||
            item.mainImage ||
            item.representativeImage ||
            "",
        ];
      }
      return [];
    })
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, 12);
}

const JobSchema = new Schema(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: false,
      default: null,
      index: true,
    },

    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },

    shopName: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    region: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    province: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    district: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    roadAddress: {
      type: String,
      trim: true,
      default: "",
    },

    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },

    images: {
      type: [String],
      default: [],
      set: normalizeImageArray,
    },

    // 채용글 작성자가 직접 등록한 홍보 사진.
    // 비어 있으면 기존 업체 대표사진/업체 사진을 사용합니다.
    jobImages: {
      type: [String],
      default: [],
      set: normalizeImageArray,
    },

    lat: {
      type: Number,
      default: null,
      index: true,
    },

    lng: {
      type: Number,
      default: null,
      index: true,
    },

    payType: {
      type: String,
      enum: PAY_TYPES,
      default: "negotiable",
      index: true,
    },

    payMin: {
      type: Number,
      default: 0,
      min: 0,
    },

    payMax: {
      type: Number,
      default: 0,
      min: 0,
    },

    payText: {
      type: String,
      trim: true,
      default: "협의",
      maxlength: 120,
    },

    workTime: {
      type: String,
      trim: true,
      default: "",
      maxlength: 160,
    },

    workDays: {
      type: String,
      trim: true,
      default: "",
      maxlength: 160,
    },

    conditions: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },

    beginnerAllowed: {
      type: Boolean,
      default: false,
      index: true,
    },

    lodgingProvided: {
      type: Boolean,
      default: false,
      index: true,
    },

    urgent: {
      type: Boolean,
      default: false,
      index: true,
    },

    recommended: {
      type: Boolean,
      default: false,
      index: true,
    },

    tier: {
      type: String,
      enum: JOB_TIER,
      default: "normal",
      index: true,
    },

    premiumStartAt: {
      type: Date,
      default: null,
      index: true,
    },

    premiumEndAt: {
      type: Date,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: JOB_STATUS,
      default: "recruiting",
      index: true,
    },

    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    lastConfirmedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    createdBy: {
      type: String,
      trim: true,
      default: "",
    },

    updatedBy: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    minimize: false,
    versionKey: false,
  }
);

JobSchema.index({ status: 1, serviceType: 1, tier: 1, updatedAt: -1 });
JobSchema.index({ serviceType: 1, region: 1, district: 1, updatedAt: -1 });
JobSchema.index({ shop: 1, status: 1, updatedAt: -1 });
JobSchema.index({ title: "text", shopName: "text", address: "text", conditions: "text" });

JobSchema.pre("validate", function normalizeJob(next) {
  try {
    this.title = normalizeText(this.title);
    this.shopName = normalizeText(this.shopName);
    this.region = normalizeText(this.region);
    this.province = normalizeText(this.province);
    this.city = normalizeText(this.city);
    this.district = normalizeText(this.district);
    this.address = normalizeText(this.address);
    this.roadAddress = normalizeText(this.roadAddress);
    this.contactPhone = normalizeText(this.contactPhone);
    this.payText = normalizeText(this.payText) || "협의";
    this.workTime = normalizeText(this.workTime);
    this.workDays = normalizeText(this.workDays);
    this.conditions = normalizeText(this.conditions);
    this.images = normalizeImageArray(this.images);
    this.jobImages = normalizeImageArray(this.jobImages);
    this.image = normalizeText(this.image) || this.images[0] || "";

    const min = Number(this.payMin || 0);
    const max = Number(this.payMax || 0);

    this.payMin = Number.isFinite(min) && min > 0 ? min : 0;
    this.payMax = Number.isFinite(max) && max > 0 ? max : 0;

    if (this.payMin > 0 && this.payMax > 0 && this.payMin > this.payMax) {
      const temp = this.payMin;
      this.payMin = this.payMax;
      this.payMax = temp;
    }

    if (this.tier !== "premium") {
      this.premiumStartAt = null;
      this.premiumEndAt = null;
    }

    if (this.status === "closed" && !this.closedAt) {
      this.closedAt = new Date();
    }

    if (this.status === "recruiting") {
      this.closedAt = null;
      if (!this.publishedAt) {
        this.publishedAt = new Date();
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports =
  mongoose.models.Job ||
  mongoose.model("Job", JobSchema);
