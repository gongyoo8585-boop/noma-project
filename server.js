const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

const SECRET = "mysecret";

// DB 연결
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/noma");

// 모델
const User = mongoose.model("User", {
  username: String,
  password: String,
});

const Place = mongoose.model("Place", {
  name: String,
  lat: Number,
  lng: Number,
  user: String,
  rating: Number,
  review: String,
  image: String,
});

// 업로드 설정
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// 인증 미들웨어
function auth(req, res, next) {
  try {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded.username;
    next();
  } catch {
    res.status(401).json({ message: "인증 실패" });
  }
}

// 회원가입
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  await User.create({ username, password });
  res.json({ message: "회원가입 성공" });
});

// 로그인
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });

  if (!user) return res.status(401).json({ message: "로그인 실패" });

  const token = jwt.sign({ username }, SECRET);
  res.json({ token });
});

// 맛집 저장
app.post("/places", auth, upload.single("image"), async (req, res) => {
  const { name, lat, lng, rating, review } = req.body;

  const place = await Place.create({
    name,
    lat,
    lng,
    rating,
    review,
    user: req.user,
    image: req.file ? req.file.filename : "",
  });

  res.json(place);
});

// 내 맛집 가져오기 (거리순)
app.get("/places", auth, async (req, res) => {
  const { lat, lng } = req.query;

  let places = await Place.find({ user: req.user });

  if (lat && lng) {
    places = places.map(p => {
      const dist = Math.sqrt(
        Math.pow(p.lat - lat, 2) + Math.pow(p.lng - lng, 2)
      );
      return { ...p._doc, dist };
    });

    places.sort((a, b) => a.dist - b.dist);
  }

  res.json(places);
});

app.listen(process.env.PORT || 10000, () => {
  console.log("서버 실행");
});