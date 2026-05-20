"use strict";

/**
 * =====================================================
 * 🔥 UPLOAD MIDDLEWARE (ULTRA FINAL)
 * ✔ multer 기반 파일 업로드
 * ✔ 이미지 파일만 허용
 * ✔ 파일 크기 제한
 * ✔ 단일 / 다중 업로드 지원
 * ✔ base64 업로드 fallback 지원
 * ✔ 에러 처리 강화
 * ✔ 기존 구조 영향 없음 (독립 모듈)
 * =====================================================
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =========================
🔥 업로드 경로
========================= */
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/* 🔥 폴더 없으면 생성 */
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  console.error("UPLOAD DIR ERROR:", e.message);
}

/* =========================
🔥 STORAGE 설정
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name =
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 10) +
      ext;

    cb(null, name);
  },
});

/* =========================
🔥 FILE FILTER (이미지만)
========================= */
const fileFilter = (req, file, cb) => {
  try {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (allowed.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error("이미지 파일만 업로드 가능"), false);
  } catch (e) {
    cb(e);
  }
};

/* =========================
🔥 MULTER INSTANCE
========================= */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/* =========================
🔥 BASE64 처리 (fallback)
========================= */
const saveBase64Image = (base64) => {
  try {
    if (!base64 || typeof base64 !== "string") return null;

    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1].split("/")[1] || "png";
    const buffer = Buffer.from(matches[2], "base64");

    const filename =
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 10) +
      "." +
      ext;

    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    return `/uploads/${filename}`;
  } catch (e) {
    console.error("BASE64 SAVE ERROR:", e.message);
    return null;
  }
};

/* =========================
🔥 미들웨어 (단일)
========================= */
const single = (field = "file") => [
  upload.single(field),
  (req, res, next) => {
    try {
      if (req.file) {
        req.fileUrl = `/uploads/${req.file.filename}`;
      }
      next();
    } catch (e) {
      next(e);
    }
  },
];

/* =========================
🔥 미들웨어 (다중)
========================= */
const multiple = (field = "files", max = 5) => [
  upload.array(field, max),
  (req, res, next) => {
    try {
      if (req.files && req.files.length > 0) {
        req.fileUrls = req.files.map(
          (f) => `/uploads/${f.filename}`
        );
      }
      next();
    } catch (e) {
      next(e);
    }
  },
];

/* =========================
🔥 BASE64 미들웨어
========================= */
const base64 = (field = "images") => (req, res, next) => {
  try {
    const list = req.body?.[field];

    if (!Array.isArray(list)) return next();

    const urls = [];

    for (const item of list) {
      if (typeof item === "string" && item.startsWith("data:")) {
        const saved = saveBase64Image(item);
        if (saved) urls.push(saved);
      }
    }

    req.fileUrls = urls;

    next();
  } catch (e) {
    next(e);
  }
};

/* =========================
🔥 EXPORT
========================= */
module.exports = {
  upload,
  single,
  multiple,
  base64,
};