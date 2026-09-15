"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const JOB_UPLOAD_DIR = path.resolve(
  PROJECT_ROOT,
  process.env.UPLOAD_PATH || "uploads"
);
const MAX_JOB_IMAGE_COUNT = 12;
const MAX_JOB_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_JOB_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

fs.mkdirSync(JOB_UPLOAD_DIR, { recursive: true });

function getImageExtension(file = {}) {
  const mimeType = String(file?.mimetype || "").toLowerCase();
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

const premiumImageStorage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, JOB_UPLOAD_DIR);
  },
  filename(req, file, callback) {
    const random = Math.random().toString(36).slice(2, 11);
    const filename = `job-${Date.now()}-${random}${getImageExtension(file)}`;
    callback(null, filename);
  },
});

const premiumImageUpload = multer({
  storage: premiumImageStorage,
  limits: {
    files: MAX_JOB_IMAGE_COUNT,
    fileSize: MAX_JOB_IMAGE_SIZE,
  },
  fileFilter(req, file, callback) {
    const mimeType = String(file?.mimetype || "").toLowerCase();

    if (!ALLOWED_JOB_IMAGE_TYPES.has(mimeType)) {
      const error = new Error("INVALID_JOB_IMAGE_TYPE");
      error.code = "INVALID_JOB_IMAGE_TYPE";
      return callback(error, false);
    }

    return callback(null, true);
  },
});

function cleanupPartiallyUploadedImages(req = {}) {
  const files = Array.isArray(req.files) ? req.files : [];

  files.forEach((file) => {
    const filePath = String(file?.path || "").trim();
    if (!filePath) return;

    fs.unlink(filePath, (unlinkError) => {
      if (unlinkError && unlinkError.code !== "ENOENT") {
        console.warn("JOB PARTIAL IMAGE CLEANUP ERROR:", unlinkError?.message || unlinkError);
      }
    });
  });
}

function premiumImageUploadMiddleware(req, res, next) {
  premiumImageUpload.array("images", MAX_JOB_IMAGE_COUNT)(req, res, (error) => {
    if (!error) return next();

    cleanupPartiallyUploadedImages(req);

    const code = String(error?.code || error?.message || "JOB_IMAGE_UPLOAD_ERROR");

    if (code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        ok: false,
        success: false,
        message: "JOB_IMAGE_TOO_LARGE",
        msg: "JOB_IMAGE_TOO_LARGE",
      });
    }

    if (code === "LIMIT_FILE_COUNT" || code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        ok: false,
        success: false,
        message: "JOB_IMAGE_LIMIT_EXCEEDED",
        msg: "JOB_IMAGE_LIMIT_EXCEEDED",
      });
    }

    if (code === "INVALID_JOB_IMAGE_TYPE") {
      return res.status(400).json({
        ok: false,
        success: false,
        message: "INVALID_JOB_IMAGE_TYPE",
        msg: "INVALID_JOB_IMAGE_TYPE",
      });
    }

    console.error("JOB IMAGE UPLOAD ERROR:", error);
    return res.status(400).json({
      ok: false,
      success: false,
      message: "JOB_IMAGE_UPLOAD_ERROR",
      msg: "JOB_IMAGE_UPLOAD_ERROR",
    });
  });
}

function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    console.warn("[job.routes] require fail:", modulePath, error?.message || error);
    return null;
  }
}

function pickFunction(moduleValue, keys = []) {
  if (typeof moduleValue === "function") {
    return moduleValue;
  }

  for (const key of keys) {
    if (typeof moduleValue?.[key] === "function") {
      return moduleValue[key];
    }
  }

  return null;
}

const controller =
  safeRequire("../../server/controllers/job.controller") ||
  safeRequire("../../server/controllers/job/job.controller") ||
  safeRequire("../../controllers/job.controller") ||
  safeRequire("../../controllers/job/job.controller") ||
  {};

const authModule =
  safeRequire("../../server/middlewares/auth") ||
  safeRequire("../../server/middleware/auth") ||
  safeRequire("../../middlewares/auth") ||
  safeRequire("../../middleware/auth") ||
  null;

const adminModule =
  safeRequire("../../server/middlewares/admin") ||
  safeRequire("../../server/middleware/admin") ||
  safeRequire("../../middlewares/admin") ||
  safeRequire("../../middleware/admin") ||
  null;

const auth =
  pickFunction(authModule, ["auth", "verifyToken", "authenticate", "requireAuth"]) ||
  function missingJobAuth(req, res) {
    return res.status(500).json({
      ok: false,
      success: false,
      message: "JOB_AUTH_MIDDLEWARE_NOT_AVAILABLE",
    });
  };

const admin =
  pickFunction(adminModule, ["admin", "adminGuard", "requireAdmin", "isAdmin"]) ||
  function missingJobAdmin(req, res) {
    return res.status(500).json({
      ok: false,
      success: false,
      message: "JOB_ADMIN_MIDDLEWARE_NOT_AVAILABLE",
    });
  };

function controllerAction(name) {
  const action = controller?.[name];

  if (typeof action === "function") {
    return action;
  }

  return function missingJobControllerAction(req, res) {
    return res.status(501).json({
      ok: false,
      success: false,
      message: `JOB_CONTROLLER_ACTION_NOT_AVAILABLE:${name}`,
    });
  };
}

/* =====================================================
 * 관리자 채용정보
 * - 기존 관리자 인증 체계를 그대로 사용
 * ===================================================== */
router.get("/admin/list", auth, admin, controllerAction("adminList"));
router.get("/admin/:jobId", auth, admin, controllerAction("adminDetail"));
router.post("/admin", auth, admin, controllerAction("adminCreate"));
router.patch("/admin/:jobId", auth, admin, controllerAction("adminUpdate"));
router.post("/admin/:jobId/close", auth, admin, controllerAction("adminClose"));
router.delete("/admin/:jobId", auth, admin, controllerAction("adminDelete"));

/* =====================================================
 * 업체회원 프리미엄 채용정보 등록
 * - 연결 승인된 업체만 작성 가능
 * - 반드시 /:jobId 보다 먼저 선언
 * ===================================================== */
router.get("/write-context", auth, controllerAction("getWriteContext"));
router.post(
  "/premium",
  auth,
  premiumImageUploadMiddleware,
  controllerAction("createPremium")
);
router.post(
  "/normal",
  auth,
  premiumImageUploadMiddleware,
  controllerAction("createNormal")
);

/* =====================================================
 * 공개 채용정보
 * ===================================================== */
router.get("/", controllerAction("getPublicList"));
router.get("/:jobId", controllerAction("getPublicDetail"));

module.exports = router;
