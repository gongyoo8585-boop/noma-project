"use strict";

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../server/models/User");
const Shop = require("../server/models/Shop");
const Review = require("../server/models/Review");
const Reservation = require("../server/models/Reservation");

/* 🔥 최소 추가 */
let Pricing = null;
try {
  Pricing = require("../server/models/Pricing");
} catch (e) {
  console.warn("PRICING MODEL LOAD FAIL");
}

async function connectDB() {
  const uri =
    process.env.NODE_ENV === "production"
      ? process.env.MONGO_URI
      : process.env.MONGO_URI_DEV || process.env.MONGO_URI;

  if (!uri) throw new Error("MONGO_URI 없음");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    autoIndex: true,
  });

  console.log("✅ DB 연결 완료");
}

function log(msg) {
  console.log(`[SEED] ${msg}`);
}

async function runSeed() {
  log("SEED 시작");

  await Promise.all([
    User.deleteMany({}),
    Shop.deleteMany({}),
    Review.deleteMany({}),
    Reservation.deleteMany({}),
    /* 🔥 최소 추가 */
    Pricing ? Pricing.deleteMany({}) : Promise.resolve(),
  ]);

  log("기존 데이터 삭제 완료");

  const adminPassword = await bcrypt.hash("1234", 10);
  const userPassword = await bcrypt.hash("1234", 10);

  const userResult = await User.collection.insertMany([
    {
      id: "admin",
      password: adminPassword,
      role: "admin",
      point: 0,
      blocked: false,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "user1",
      password: userPassword,
      role: "user",
      point: 0,
      blocked: false,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const adminId = userResult.insertedIds[0];
  const userId = userResult.insertedIds[1];

  log("유저 생성 완료");

  const shopResult = await Shop.collection.insertMany([
    {
      name: "김해 힐링 마사지",
      region: "김해",
      address: "김해",
      lat: 35.2283,
      lng: 128.8892,
      location: {
        type: "Point",
        coordinates: [128.8892, 35.2283],
      },
      likeCount: 10,
      viewCount: 0,
      ratingAvg: 0,
      isDeleted: false,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "부산 스파",
      region: "부산",
      address: "부산",
      lat: 35.1796,
      lng: 129.0756,
      location: {
        type: "Point",
        coordinates: [129.0756, 35.1796],
      },
      likeCount: 20,
      viewCount: 0,
      ratingAvg: 0,
      isDeleted: false,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const shopId = shopResult.insertedIds[0];

  log("매장 생성 완료");

  /* 🔥 최소 추가: Pricing 더미 데이터 */
  if (Pricing) {
    await Pricing.collection.insertMany([
      {
        shopId,
        name: "기본 코스 60분",
        duration: 60,
        price: 10000,
        discountPrice: 8000,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        shopId,
        name: "프리미엄 코스 90분",
        duration: 90,
        price: 20000,
        discountPrice: 15000,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    log("코스(가격) 데이터 생성 완료");
  }

  const reservationResult = await Reservation.collection.insertOne({
    user: userId,
    userId,
    shop: shopId,
    shopId,
    date: "2026-01-01",
    time: "10:00",
    serviceType: "기본 관리",
    memo: "시드 예약",
    people: 1,
    price: 10000,
    reservedAt: new Date(),
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const reservationId = reservationResult.insertedId;

  const reviewResult = await Review.collection.insertOne({
    user: userId,
    userId,
    shop: shopId,
    shopId,
    reservation: reservationId,
    reservationId,
    rating: 5,
    content: "좋아요!",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await Reservation.collection.updateOne(
    { _id: reservationId },
    { $set: { review: reviewResult.insertedId } }
  );

  log("리뷰 + 예약 생성 완료");

  const testUser = await User.findOne({ id: "admin" }).select("+password");
  if (testUser) {
    const ok = await bcrypt.compare("1234", testUser.password);
    console.log("🔐 LOGIN TEST:", ok ? "SUCCESS" : "FAIL");
  } else {
    console.log("❌ LOGIN TEST: USER NOT FOUND");
  }

  const stats = {
    users: await User.countDocuments(),
    shops: await Shop.countDocuments(),
    reviews: await Review.countDocuments(),
    reservations: await Reservation.countDocuments(),
    /* 🔥 최소 추가 */
    pricings: Pricing ? await Pricing.countDocuments() : 0,
  };

  log("결과: " + JSON.stringify(stats));
}

async function runCLI() {
  try {
    await connectDB();
    await runSeed();
    process.exit(0);
  } catch (e) {
    console.error("❌ ERROR:", e.message);
    process.exit(1);
  }
}

runCLI();