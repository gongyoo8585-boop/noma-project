"use strict";

/**
 * =====================================================
 * 🔥 UPLOAD SERVICE (ULTRA FINAL)
 * ✔ 파일 URL 생성
 * ✔ base64 → 파일 저장
 * ✔ 단일 / 다중 이미지 처리
 * ✔ multer 결과와 완벽 호환
 * ✔ 기존 로직 영향 없음 (독립 서비스)
 * ✔ 에러 안전 처리
 * =====================================================
 */

const fs = require("fs");
const path = require("path");

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
  console.error("UPLOAD SERVICE DIR ERROR:", e.message);
}

/* =========================
🔥 파일 URL 생성
========================= */
function makeFileUrl(filename) {
  if (!filename) return null;
  return `/uploads/${filename}`;
}

/* =========================
🔥 base64 → 파일 저장
========================= */
function saveBase64Image(base64) {
  try {
    if (!base64 || typeof base64 !== "string") return null;

    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return null;

    const mime = matches[1];
    const ext = mime.split("/")[1] || "png";
    const buffer = Buffer.from(matches[2], "base64");

    const filename =
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 10) +
      "." +
      ext;

    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    return makeFileUrl(filename);
  } catch (e) {
    console.error("UPLOAD SERVICE BASE64 ERROR:", e.message);
    return null;
  }
}

/* =========================
🔥 단일 파일 처리 (multer)
========================= */
function handleSingle(file) {
  try {
    if (!file) return null;
    return makeFileUrl(file.filename);
  } catch (e) {
    console.error("UPLOAD SERVICE SINGLE ERROR:", e.message);
    return null;
  }
}

/* =========================
🔥 다중 파일 처리 (multer)
========================= */
function handleMultiple(files = []) {
  try {
    if (!Array.isArray(files)) return [];

    return files
      .map((f) => (f?.filename ? makeFileUrl(f.filename) : null))
      .filter(Boolean);
  } catch (e) {
    console.error("UPLOAD SERVICE MULTIPLE ERROR:", e.message);
    return [];
  }
}

/* =========================
🔥 base64 배열 처리
========================= */
function handleBase64List(list = []) {
  try {
    if (!Array.isArray(list)) return [];

    const result = [];

    for (const item of list) {
      if (typeof item === "string" && item.startsWith("data:")) {
        const saved = saveBase64Image(item);
        if (saved) result.push(saved);
      }
    }

    return result;
  } catch (e) {
    console.error("UPLOAD SERVICE BASE64 LIST ERROR:", e.message);
    return [];
  }
}

/* =========================
🔥 통합 처리 (자동 판단)
========================= */
function normalizeImages({ files, base64List }) {
  try {
    let result = [];

    if (files && Array.isArray(files)) {
      result = result.concat(handleMultiple(files));
    }

    if (base64List && Array.isArray(base64List)) {
      result = result.concat(handleBase64List(base64List));
    }

    return result;
  } catch (e) {
    console.error("UPLOAD SERVICE NORMALIZE ERROR:", e.message);
    return [];
  }
}

/* =========================
🔥 EXPORT
========================= */
module.exports = {
  makeFileUrl,
  saveBase64Image,
  handleSingle,
  handleMultiple,
  handleBase64List,
  normalizeImages,
};