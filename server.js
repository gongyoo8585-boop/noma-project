const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// 🔥 환경변수
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 10000;

// 🔥 MongoDB 연결
mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 MongoDB 연결 성공"))
  .catch(err => console.log(err));

// 🔥 기본 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 public 폴더 연결 (여기 중요)
app.use(express.static(path.join(__dirname, "public")));

// 🔥 기본 라우트
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔥 서버 실행
app.listen(PORT, () => {
  console.log(`🔥 서버 실행: http://localhost:${PORT}`);
});