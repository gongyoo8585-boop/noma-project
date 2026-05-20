"use strict";

/* =====================================================
🔥 BACKUP SERVICE
👉 DB / 파일 백업
👉 스케줄 / 압축 / 로그 / 알림
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let queueService = null;
let logger = null;
let slack = null;

try { queueService = require("./queueService"); } catch (_) {}
try { logger = require("./logger.elk"); } catch (_) {}
try { slack = require("./slack.alert"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";
const MONGO_URI = process.env.MONGO_URI || "";
const DB_NAME = process.env.DB_NAME || "app";

/* =====================================================
🔥 HELPER
===================================================== */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/* =====================================================
🔥 SERVICE
===================================================== */
class BackupService {
  constructor() {
    this.last = null;

    ensureDir(BACKUP_DIR);
  }

  /* =====================================================
  🔥 DB BACKUP (mongodump)
  ===================================================== */
  async backupDB() {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI_MISSING");
    }

    const file = path.join(
      BACKUP_DIR,
      `db-${timestamp()}.gz`
    );

    const cmd = `
      mongodump \
      --uri="${MONGO_URI}" \
      --archive="${file}" \
      --gzip
    `;

    return new Promise((resolve, reject) => {
      exec(cmd, (err) => {
        if (err) {
          logger?.error("backup_db_fail", { error: err.message });
          slack?.error?.(err);
          return reject(err);
        }

        logger?.info("backup_db_success", { file });

        this.last = file;

        resolve({ file });
      });
    });
  }

  /* =====================================================
  🔥 FILE BACKUP
  ===================================================== */
  async backupFiles(sourceDir = "./uploads") {
    ensureDir(BACKUP_DIR);

    const file = path.join(
      BACKUP_DIR,
      `files-${timestamp()}.zip`
    );

    const cmd = `zip -r ${file} ${sourceDir}`;

    return new Promise((resolve, reject) => {
      exec(cmd, (err) => {
        if (err) {
          logger?.error("backup_files_fail", { error: err.message });
          return reject(err);
        }

        logger?.info("backup_files_success", { file });

        resolve({ file });
      });
    });
  }

  /* =====================================================
  🔥 FULL BACKUP
  ===================================================== */
  async fullBackup() {
    try {
      const db = await this.backupDB();
      const files = await this.backupFiles();

      const result = {
        db,
        files,
        createdAt: new Date(),
      };

      this.last = result;

      slack?.info?.("백업 완료", result);

      return result;
    } catch (err) {
      slack?.error?.(err);
      throw err;
    }
  }

  /* =====================================================
  🔥 ASYNC BACKUP
  ===================================================== */
  async runAsync(type = "full") {
    if (!queueService) {
      return this.run(type);
    }

    return queueService.add({
      type: "backup",
      payload: { type },
      handler: async ({ type }) => this.run(type),
    });
  }

  /* =====================================================
  🔥 RUN
  ===================================================== */
  async run(type) {
    switch (type) {
      case "db":
        return this.backupDB();

      case "files":
        return this.backupFiles();

      default:
        return this.fullBackup();
    }
  }

  /* =====================================================
  🔥 CLEAN OLD BACKUPS
  ===================================================== */
  clean(days = 7) {
    const files = fs.readdirSync(BACKUP_DIR);

    const now = Date.now();

    for (const file of files) {
      const fullPath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(fullPath);

      const age = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);

      if (age > days) {
        fs.unlinkSync(fullPath);

        logger?.info("backup_deleted", { file });
      }
    }

    return true;
  }

  /* =====================================================
  🔥 LIST BACKUPS
  ===================================================== */
  list() {
    return fs.readdirSync(BACKUP_DIR);
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.last;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.last = null;
    return true;
  }
}

module.exports = new BackupService();