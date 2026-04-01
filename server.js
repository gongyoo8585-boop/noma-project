require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err));

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    placeId: { type: String, required: true },
    placeName: { type: String, required: true },
    addressName: { type: String, default: "" },
    roadAddressName: { type: String, default: "" },
    phone: { type: String, default: "" },
    placeUrl: { type: String, default: "" },
    categoryName: { type: String, default: "" },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    distance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, placeId: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
const Favorite = mongoose.model("Favorite", favoriteSchema);

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: "14d" }
  );
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "아이디, 이메일, 비밀번호를 입력하세요." });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: "비밀번호는 4자 이상이어야 합니다." });
    }

    const exists = await User.findOne({
      $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }]
    });

    if (exists) {
      return res.status(409).json({ message: "이미 존재하는 아이디 또는 이메일입니다." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash
    });

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: "회원가입 실패", detail: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      return res.status(400).json({ message: "아이디/이메일과 비밀번호를 입력하세요." });
    }

    const user = await User.findOne({
      $or: [{ username: account.trim() }, { email: account.trim().toLowerCase() }]
    });

    if (!user) {
      return res.status(401).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(401).json({ message: "비밀번호가 틀렸습니다." });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: "로그인 실패", detail: err.message });
  }
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  const user = await User.findById(req.user.id).select("_id username email");
  if (!user) {
    return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
  }

  res.json({
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email
    }
  });
});

app.get("/api/favorites", authRequired, async (req, res) => {
  try {
    const items = await Favorite.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "즐겨찾기 조회 실패", detail: err.message });
  }
});

app.post("/api/favorites", authRequired, async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.placeId || !payload.placeName) {
      return res.status(400).json({ message: "placeId와 placeName이 필요합니다." });
    }

    const existing = await Favorite.findOne({
      userId: req.user.id,
      placeId: payload.placeId
    });

    if (existing) {
      return res.json({ success: true, favorite: existing, duplicated: true });
    }

    const favorite = await Favorite.create({
      userId: req.user.id,
      placeId: payload.placeId,
      placeName: payload.placeName,
      addressName: payload.addressName || "",
      roadAddressName: payload.roadAddressName || "",
      phone: payload.phone || "",
      placeUrl: payload.placeUrl || "",
      categoryName: payload.categoryName || "",
      x: Number(payload.x || 0),
      y: Number(payload.y || 0),
      distance: Number(payload.distance || 0)
    });

    res.json({ success: true, favorite });
  } catch (err) {
    res.status(500).json({ message: "즐겨찾기 저장 실패", detail: err.message });
  }
});

app.delete("/api/favorites/:placeId", authRequired, async (req, res) => {
  try {
    await Favorite.findOneAndDelete({
      userId: req.user.id,
      placeId: req.params.placeId
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "즐겨찾기 삭제 실패", detail: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🔥 http://localhost:${PORT}`);
});