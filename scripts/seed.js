/**
 * =====================================================
 * 🔥 NOMA Seed Script (ULTIMATE FINAL PRO MAX)
 * =====================================================
 */

require("dotenv").config();
const mongoose = require("mongoose");

/* =========================
   🔥 모델 로드 (기존 유지)
========================= */
const User = require("../models/User");
const Shop = require("../models/Shop");
const Review = require("../models/Review");
const Reservation = require("../models/Reservation");

/* =========================
   🔥 DB 연결
========================= */
async function connectDB() {
  try {
    const uri =
      process.env.NODE_ENV === "production"
        ? process.env.MONGO_URI
        : process.env.MONGO_URI_DEV || process.env.MONGO_URI;

    if (!uri) throw new Error("MONGO_URI 없음");

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    console.log("✅ DB 연결 완료");
  } catch (err) {
    console.error("❌ DB 연결 실패:", err.message);
    process.exit(1);
  }
}

/* =========================
   🔥 초기 데이터 (기존 유지)
========================= */
const users = [
  { id: "admin", password: "1234", role: "admin" },
  { id: "user1", password: "1234", role: "user" }
];

const shops = [
  {
    name: "김해 힐링 마사지",
    region: "김해",
    lat: 35.2283,
    lng: 128.8892,
    likeCount: 10
  },
  {
    name: "부산 스파",
    region: "부산",
    lat: 35.1796,
    lng: 129.0756,
    likeCount: 20
  }
];

/* =========================
   🔥 유틸
========================= */
const bcrypt = require("bcryptjs");
const fs = require("fs");

async function hashPassword(pw) {
  return await bcrypt.hash(pw, 10);
}

/* 🔥 추가 위치 0 */
function log(msg){
  console.log(`[SEED] ${msg}`);
}

/* =========================
   🔥 Seed 실행
========================= */
async function runSeed() {
  log("SEED 시작");

  await Promise.all([
    User.deleteMany(),
    Shop.deleteMany(),
    Review.deleteMany(),
    Reservation.deleteMany()
  ]);

  log("기존 데이터 삭제 완료");

  const createdUsers = [];
  for (const u of users) {
    const hashed = await hashPassword(u.password);
    const user = await User.create({
      id: u.id,
      password: hashed,
      role: u.role,
      point: 0
    });
    createdUsers.push(user);
  }

  log("유저 생성 완료");

  const createdShops = await Shop.insertMany(
    shops.map((s) => ({
      ...s,
      viewCount: 0,
      ratingAvg: 0,
      isDeleted: false
    }))
  );

  log("매장 생성 완료");

  await Review.create({
    shopId: createdShops[0]._id,
    userId: createdUsers[1].id,
    rating: 5,
    content: "좋아요!"
  });

  await Reservation.create({
    shopId: createdShops[0]._id,
    userId: createdUsers[1].id,
    reserveAt: new Date(),
    status: "pending"
  });

  log("리뷰 + 예약 생성 완료");

  const stats = {
    users: await User.countDocuments(),
    shops: await Shop.countDocuments(),
    reviews: await Review.countDocuments(),
    reservations: await Reservation.countDocuments()
  };

  log("결과: " + JSON.stringify(stats));
}

/* =====================================================
   🔥 추가 기능 10개 (NEW)
===================================================== */

// 1️⃣ 실행 로그 파일 기록
function writeLogFile(msg){
  fs.appendFileSync("seed.log", `[${new Date().toISOString()}] ${msg}\n`);
}

// 2️⃣ seed dry-run
function dryRun(){
  log("DRY RUN - DB 변경 없음");
}

// 3️⃣ 환경 출력
function printEnv(){
  console.log({
    NODE_ENV: process.env.NODE_ENV,
    DB: process.env.MONGO_URI ? "OK" : "NONE"
  });
}

// 4️⃣ DB 상태 확인
function checkDB(){
  if(mongoose.connection.readyState !== 1){
    throw new Error("DB 연결 안됨");
  }
}

// 5️⃣ 데이터 검증
function validateSeedData(){
  if(!users.length || !shops.length){
    throw new Error("Seed 데이터 비어있음");
  }
}

// 6️⃣ 랜덤 매장 추가
async function addRandomShops(n=5){
  const arr = Array.from({length:n}).map((_,i)=>({
    name:"랜덤샵_"+i,
    region:"김해",
    lat:35+Math.random(),
    lng:128+Math.random()
  }));
  await Shop.insertMany(arr);
  log("랜덤 매장 추가 "+n);
}

// 7️⃣ 랜덤 리뷰
async function addRandomReviews(n=5){
  const shops = await Shop.find();
  const users = await User.find();

  for(let i=0;i<n;i++){
    await Review.create({
      shopId: shops[Math.floor(Math.random()*shops.length)]._id,
      userId: users[Math.floor(Math.random()*users.length)].id,
      rating: Math.ceil(Math.random()*5),
      content: "랜덤 리뷰"
    });
  }
}

// 8️⃣ 백업
async function backup(){
  const data = {
    users: await User.find(),
    shops: await Shop.find()
  };
  fs.writeFileSync("backup.json", JSON.stringify(data,null,2));
  log("백업 완료");
}

// 9️⃣ 실행 시간 측정
async function measure(fn){
  const start = Date.now();
  await fn();
  log("실행시간: "+(Date.now()-start)+"ms");
}

// 🔟 DB 초기화
async function resetDB(){
  await mongoose.connection.dropDatabase();
  log("DB 초기화 완료");
}

/* =====================================================
   🔥 CLI
===================================================== */
async function runCLI() {
  const cmd = process.argv[2];

  try {
    await connectDB();
    checkDB();
    validateSeedData();

    switch (cmd) {
      case "dry":
        dryRun();
        break;
      case "env":
        printEnv();
        break;
      case "random":
        await addRandomShops(10);
        break;
      case "review":
        await addRandomReviews(10);
        break;
      case "backup":
        await backup();
        break;
      case "reset":
        await resetDB();
        break;
      default:
        await measure(runSeed);
    }

    writeLogFile("seed run complete");
    process.exit();

  } catch (e) {
    console.error("❌ ERROR:", e.message);
    writeLogFile("error: "+e.message);
    process.exit(1);
  }
}

/* =========================
   🔥 실행
========================= */
runCLI();