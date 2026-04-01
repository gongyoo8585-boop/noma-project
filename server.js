import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 현재 파일 경로 설정 (ESM용)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 public 폴더 연결
app.use(express.static(path.join(__dirname, "public")));

// 🔥 MongoDB 연결
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB 연결 성공"))
  .catch(err => console.log(err));

// 🔥 테스트 API
app.get("/api/test", (req, res) => {
  res.json({ message: "서버 정상 작동 🚀" });
});

// 🔥 위치 저장 API
app.post("/location", (req, res) => {
  const { lat, lng } = req.body;
  console.log("📍 위치:", lat, lng);
  res.json({ success: true });
});

// 🔥 index.html 연결
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔥 Render용 PORT
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🔥 서버 실행됨: ${PORT}`);
});