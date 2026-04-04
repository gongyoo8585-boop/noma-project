require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "1234";
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID || "";
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || "";
const ADMIN_KAKAO_ID = process.env.ADMIN_KAKAO_ID || "";

/* =========================
   DB
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("DB 연결 성공"))
  .catch((err) => console.log("DB 연결 실패:", err.message));

/* =========================
   Models
========================= */
const userSchema = new mongoose.Schema(
  {
    loginId: { type: String, unique: true, sparse: true },
    password: String,
    kakaoId: { type: String, unique: true, sparse: true },
    nickname: String,
    role: { type: String, default: "user" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }]
  },
  { timestamps: true }
);

const placeSchema = new mongoose.Schema(
  {
    name: String,
    address: String,
    region: String,
    district: String,
    serviceType: String,
    theme: String,
    price: Number,
    phone: String,
    reservePhone: String,
    description: String,
    lat: Number,
    lng: Number,
    eventText: { type: String, default: "" },
    tags: [String],
    approved: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ratingAvg: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const inquirySchema = new mongoose.Schema(
  {
    company: String,
    phone: String,
    content: String,
    checkedRobot: Boolean
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    authorNickname: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const reviewSchema = new mongoose.Schema(
  {
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    nickname: String,
    rating: Number,
    content: String
  },
  { timestamps: true }
);

const eventSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Place = mongoose.model("Place", placeSchema);
const Inquiry = mongoose.model("Inquiry", inquirySchema);
const Post = mongoose.model("Post", postSchema);
const Review = mongoose.model("Review", reviewSchema);
const Event = mongoose.model("Event", eventSchema);

/* =========================
   Utils
========================= */
function signUser(user) {
  return jwt.sign(
    {
      id: String(user._id),
      role: user.role,
      kakaoId: user.kakaoId || "",
      loginId: user.loginId || ""
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.replace("Bearer ", "").trim();
    if (!token) {
      return res.status(401).json({ ok: false, message: "로그인 필요" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: "토큰 오류" });
  }
}

function adminOnly(req, res, next) {
  if (req.role !== "admin") {
    return res.status(403).json({ ok: false, message: "관리자만 가능" });
  }
  next();
}

function toRad(v) {
  return (v * Math.PI) / 180;
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* =========================
   Auth - 일반 회원가입 / 로그인
========================= */
app.post("/api/register", async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ ok: false, message: "아이디와 비밀번호를 입력하세요" });
    }

    const exists = await User.findOne({ loginId: id });
    if (exists) {
      return res.status(400).json({ ok: false, message: "이미 존재하는 아이디입니다" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      loginId: id,
      password: hashed,
      nickname: id,
      role: "user",
      likes: []
    });

    const token = signUser(user);

    res.json({
      ok: true,
      message: "회원가입 성공",
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        role: user.role
      }
    });
  } catch (err) {
    console.log("회원가입 오류:", err.message);
    res.status(500).json({ ok: false, message: "회원가입 오류" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { id, password } = req.body;

    const user = await User.findOne({ loginId: id });
    if (!user) {
      return res.status(400).json({ ok: false, message: "아이디 또는 비밀번호 오류" });
    }

    const same = await bcrypt.compare(password, user.password || "");
    if (!same) {
      return res.status(400).json({ ok: false, message: "아이디 또는 비밀번호 오류" });
    }

    const token = signUser(user);

    res.json({
      ok: true,
      message: "로그인 성공",
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        role: user.role
      }
    });
  } catch (err) {
    console.log("로그인 오류:", err.message);
    res.status(500).json({ ok: false, message: "로그인 오류" });
  }
});

/* =========================
   Auth - 카카오 로그인
========================= */
app.get("/auth/kakao", (req, res) => {
  const url =
    "https://kauth.kakao.com/oauth/authorize" +
    `?client_id=${encodeURIComponent(KAKAO_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}` +
    "&response_type=code";

  res.redirect(url);
});

app.get("/auth/kakao/callback", async (req, res) => {
  try {
    const code = req.query.code;

    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: KAKAO_REDIRECT_URI,
        code
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.log("카카오 토큰 응답:", tokenData);
      return res.send(`
        <script>
          alert("카카오 토큰 발급 실패");
          location.href="/";
        </script>
      `);
    }

    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userRes.json();
    const kakaoId = String(userData.id);
    const nickname =
      userData.properties?.nickname ||
      userData.kakao_account?.profile?.nickname ||
      "카카오사용자";

    let user = await User.findOne({ kakaoId });

    if (!user) {
      user = await User.create({
        kakaoId,
        nickname,
        role: ADMIN_KAKAO_ID && ADMIN_KAKAO_ID === kakaoId ? "admin" : "user",
        likes: []
      });
    }

    if (ADMIN_KAKAO_ID && ADMIN_KAKAO_ID === kakaoId && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    const token = signUser(user);

    res.redirect(
      `/?token=${encodeURIComponent(token)}&nickname=${encodeURIComponent(
        user.nickname
      )}&role=${encodeURIComponent(user.role)}`
    );
  } catch (err) {
    console.log("카카오 로그인 오류:", err.message);
    res.send(`
      <script>
        alert("카카오 로그인 오류");
        location.href="/";
      </script>
    `);
  }
});

app.get("/api/me", auth, async (req, res) => {
  const user = await User.findById(req.userId).lean();
  if (!user) {
    return res.status(404).json({ ok: false, message: "사용자 없음" });
  }

  res.json({
    ok: true,
    user: {
      id: user._id,
      nickname: user.nickname,
      role: user.role,
      likes: user.likes || []
    }
  });
});

/* =========================
   Places
========================= */
app.get("/api/places", async (req, res) => {
  const items = await Place.find({ approved: true }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, items });
});

app.get("/api/places/search", async (req, res) => {
  const {
    q = "",
    region = "",
    district = "",
    serviceType = "",
    theme = "",
    priceMax = ""
  } = req.query;

  const filter = { approved: true };

  if (q) {
    filter.$or = [
      { name: new RegExp(q, "i") },
      { address: new RegExp(q, "i") },
      { region: new RegExp(q, "i") },
      { district: new RegExp(q, "i") }
    ];
  }

  if (region) filter.region = region;
  if (district) filter.district = district;
  if (serviceType) filter.serviceType = serviceType;
  if (theme) filter.theme = theme;
  if (priceMax) filter.price = { $lte: Number(priceMax) };

  const items = await Place.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, items });
});

app.get("/api/places/near", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  const items = await Place.find({ approved: true }).lean();

  const sorted = items
    .map((item) => ({
      ...item,
      distanceKm: getDistanceKm(lat, lng, item.lat, item.lng)
    }))
    .sort((a,