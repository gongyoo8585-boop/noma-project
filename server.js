const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// ===== 업로드 설정 =====
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// ===== DB =====
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/noma");

const User = mongoose.model("User", {
  username: String,
  password: String,
  kakao: String
});

const Place = mongoose.model("Place", {
  name: String,
  lat: Number,
  lng: Number,
  user: String,
  rating: Number,
  review: String,
  image: String
});

// ===== 인증 =====
function auth(req, res, next) {
  try {
    const decoded = jwt.verify(req.headers.authorization, "secretkey");
    req.user = decoded.username;
    next();
  } catch {
    res.status(401).json({ message: "인증 실패" });
  }
}

// ===== 회원가입 =====
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  await User.create({ username, password });
  res.json({ message: "회원가입 완료" });
});

// ===== 로그인 =====
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ message: "실패" });

  const token = jwt.sign({ username }, "secretkey");
  res.json({ token });
});

// ===== 카카오 로그인 =====
app.post("/kakao", async (req, res) => {
  const { kakaoId } = req.body;

  let user = await User.findOne({ kakao: kakaoId });
  if (!user) {
    user = await User.create({ kakao: kakaoId });
  }

  const token = jwt.sign({ username: kakaoId }, "secretkey");
  res.json({ token });
});

// ===== 이미지 업로드 + 저장 =====
app.post("/places", auth, upload.single("image"), async (req, res) => {
  const { name, lat, lng, rating, review } = req.body;

  await Place.create({
    name,
    lat,
    lng,
    rating,
    review,
    user: req.user,
    image: req.file ? "/uploads/" + req.file.filename : ""
  });

  res.json({ message: "저장 완료" });
});

// ===== 리스트 =====
app.get("/places", auth, async (req, res) => {
  const data = await Place.find({ user: req.user });
  res.json(data);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("서버 실행", PORT));