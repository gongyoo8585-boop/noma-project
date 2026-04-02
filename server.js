const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* ===== 업로드 ===== */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

/* ===== DB ===== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB 연결 성공"));

/* ===== 모델 ===== */
const User = mongoose.model("User", {
  username: String,
  password: String
});

const Place = mongoose.model("Place", {
  name: String,
  lat: Number,
  lng: Number,
  user: String,
  rating: Number,
  review: String,
  image: String,
  favorite: Boolean
});

/* ===== 인증 ===== */
function auth(req, res, next) {
  try {
    const decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
    req.user = decoded.username;
    next();
  } catch {
    res.status(401).json({ message: "인증 실패" });
  }
}

/* ===== 회원 ===== */
app.post("/register", async (req, res) => {
  await User.create(req.body);
  res.json({ message: "회원가입 완료" });
});

app.post("/login", async (req, res) => {
  const user = await User.findOne(req.body);
  if (!user) return res.status(401).json({ message: "실패" });

  const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET);
  res.json({ token });
});

/* ===== 저장 ===== */
app.post("/places", auth, upload.single("image"), async (req, res) => {

  const { name, lat, lng, rating, review } = req.body;

  await Place.create({
    name,
    lat,
    lng,
    rating,
    review,
    image: req.file ? req.file.filename : "",
    favorite: false,
    user: req.user
  });

  res.json({ message: "저장 완료" });
});

/* ===== 조회 ===== */
app.get("/places", auth, async (req, res) => {
  const places = await Place.find({ user: req.user });
  res.json(places);
});

/* ===== 즐겨찾기 ===== */
app.patch("/favorite/:id", auth, async (req, res) => {
  const place = await Place.findById(req.params.id);
  place.favorite = !place.favorite;
  await place.save();
  res.json(place);
});

/* ===== 삭제 ===== */
app.delete("/places/:id", auth, async (req, res) => {
  await Place.deleteOne({ _id: req.params.id });
  res.json({ message: "삭제" });
});

app.listen(process.env.PORT || 10000, () => console.log("서버 실행"));