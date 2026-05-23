"use strict";

/* =====================================================
🔥 CRYPTO UTIL (FINAL ULTRA COMPLETE MASTER)
👉 해시 / HMAC / 토큰 / 암복호화 / webhook 검증
👉 프로젝트 전역 공통 보안 유틸
👉 통째로 교체 가능한 완성형
===================================================== */

const crypto = require("crypto");

/* =====================================================
🔥 CONFIG
===================================================== */
const DEFAULT_SECRET =
  process.env.APP_SECRET ||
  process.env.JWT_SECRET ||
  "SUPER_SECRET_KEY_CHANGE_THIS";

const DEFAULT_ALGORITHM = "sha256";
const AES_ALGORITHM = "aes-256-cbc";

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function safeStr(v, d = "") {
  return typeof v === "string" ? v : d;
}

function normalizeSecret(secret = DEFAULT_SECRET) {
  return safeStr(secret, DEFAULT_SECRET) || DEFAULT_SECRET;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${pairs.join(",")}}`;
}

function normalizePayload(payload) {
  if (typeof payload === "string") return payload;
  if (Buffer.isBuffer(payload)) return payload.toString("utf8");
  return stableStringify(payload);
}

function shaBuffer(input, algorithm = DEFAULT_ALGORITHM) {
  return crypto.createHash(algorithm).update(String(input)).digest();
}

function shaHex(input, algorithm = DEFAULT_ALGORITHM) {
  return crypto.createHash(algorithm).update(String(input)).digest("hex");
}

function shaBase64(input, algorithm = DEFAULT_ALGORITHM) {
  return crypto.createHash(algorithm).update(String(input)).digest("base64");
}

function randomHex(size = 16) {
  return crypto.randomBytes(Math.max(1, size)).toString("hex");
}

function randomBase64(size = 16) {
  return crypto.randomBytes(Math.max(1, size)).toString("base64");
}

function randomToken(size = 32) {
  return crypto.randomBytes(Math.max(1, size)).toString("hex");
}

function randomId(prefix = "ID") {
  return `${prefix}_${Date.now()}_${randomHex(6)}`;
}

function nonce(size = 16) {
  return randomHex(size);
}

function salt(size = 16) {
  return randomHex(size);
}

function toBase64(input = "") {
  return Buffer.from(String(input), "utf8").toString("base64");
}

function fromBase64(input = "") {
  return Buffer.from(String(input), "base64").toString("utf8");
}

function toHex(input = "") {
  return Buffer.from(String(input), "utf8").toString("hex");
}

function fromHex(input = "") {
  return Buffer.from(String(input), "hex").toString("utf8");
}

/* =====================================================
🔥 HASH / COMPARE
===================================================== */
function hash(input, algorithm = DEFAULT_ALGORITHM) {
  return shaHex(input, algorithm);
}

function hashBase64(input, algorithm = DEFAULT_ALGORITHM) {
  return shaBase64(input, algorithm);
}

function doubleHash(input, algorithm = DEFAULT_ALGORITHM) {
  return shaHex(shaHex(input, algorithm), algorithm);
}

function compareHash(input, hashed, algorithm = DEFAULT_ALGORITHM) {
  return timingSafeEqual(hash(input, algorithm), String(hashed || ""));
}

function sha1(input) {
  return shaHex(input, "sha1");
}

function sha256(input) {
  return shaHex(input, "sha256");
}

function sha512(input) {
  return shaHex(input, "sha512");
}

function md5(input) {
  return shaHex(input, "md5");
}

/* =====================================================
🔥 HMAC SIGN / VERIFY
===================================================== */
function hmac(input, secret = DEFAULT_SECRET, algorithm = DEFAULT_ALGORITHM, encoding = "hex") {
  return crypto
    .createHmac(algorithm, normalizeSecret(secret))
    .update(String(input))
    .digest(encoding);
}

function sign(payload, secret = DEFAULT_SECRET, algorithm = DEFAULT_ALGORITHM) {
  return hmac(normalizePayload(payload), secret, algorithm, "hex");
}

function signBase64(payload, secret = DEFAULT_SECRET, algorithm = DEFAULT_ALGORITHM) {
  return hmac(normalizePayload(payload), secret, algorithm, "base64");
}

function verify(payload, signature, secret = DEFAULT_SECRET, algorithm = DEFAULT_ALGORITHM) {
  const expected = sign(payload, secret, algorithm);
  return timingSafeEqual(expected, String(signature || ""));
}

function verifyBase64(payload, signature, secret = DEFAULT_SECRET, algorithm = DEFAULT_ALGORITHM) {
  const expected = signBase64(payload, secret, algorithm);
  return timingSafeEqual(expected, String(signature || ""));
}

/* =====================================================
🔥 TIMING SAFE COMPARE
===================================================== */
function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));

  if (left.length !== right.length) return false;

  try {
    return crypto.timingSafeEqual(left, right);
  } catch (_) {
    return false;
  }
}

/* =====================================================
🔥 PASSWORD-LIKE HASH HELPERS
👉 bcrypt 없을 때 fallback 용
===================================================== */
function pbkdf2Hash(password, secret = DEFAULT_SECRET, iterations = 100000, keylen = 64, digest = "sha512") {
  const saltValue = normalizeSecret(secret);
  return crypto.pbkdf2Sync(String(password), saltValue, iterations, keylen, digest).toString("hex");
}

function pbkdf2Verify(password, hashed, secret = DEFAULT_SECRET, iterations = 100000, keylen = 64, digest = "sha512") {
  const expected = pbkdf2Hash(password, secret, iterations, keylen, digest);
  return timingSafeEqual(expected, String(hashed || ""));
}

/* =====================================================
🔥 KEY DERIVATION
===================================================== */
function deriveKey(secret = DEFAULT_SECRET, length = 32) {
  return crypto
    .createHash("sha256")
    .update(normalizeSecret(secret))
    .digest()
    .subarray(0, Math.max(16, length));
}

function deriveIv(secret = DEFAULT_SECRET) {
  return crypto
    .createHash("md5")
    .update(normalizeSecret(secret))
    .digest()
    .subarray(0, 16);
}

/* =====================================================
🔥 AES ENCRYPT / DECRYPT
===================================================== */
function encrypt(text = "", secret = DEFAULT_SECRET) {
  const key = deriveKey(secret, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);

  let encrypted = cipher.update(String(text), "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(payload = "", secret = DEFAULT_SECRET) {
  const [ivHex, encrypted] = String(payload || "").split(":");
  if (!ivHex || !encrypted) {
    throw new Error("invalid encrypted payload");
  }

  const key = deriveKey(secret, 32);
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function encryptJSON(obj = {}, secret = DEFAULT_SECRET) {
  return encrypt(JSON.stringify(obj || {}), secret);
}

function decryptJSON(payload = "", secret = DEFAULT_SECRET) {
  return JSON.parse(decrypt(payload, secret));
}

/* =====================================================
🔥 WEBHOOK SIGNATURE
===================================================== */
function signWebhook(payload, secret = DEFAULT_SECRET) {
  return sign(payload, secret, "sha256");
}

function verifyWebhook(payload, signature, secret = DEFAULT_SECRET) {
  return verify(payload, signature, secret, "sha256");
}

/* =====================================================
🔥 IDEMPOTENCY / REQUEST KEYS
===================================================== */
function createIdempotencyKey(parts = []) {
  const base = Array.isArray(parts) ? parts.join("|") : String(parts || "");
  return sha256(base);
}

function createRequestSignature({
  method = "GET",
  path = "/",
  userId = "",
  timestamp = now(),
  body = {}
} = {}, secret = DEFAULT_SECRET) {
  const payload = stableStringify({
    method: String(method).toUpperCase(),
    path: String(path),
    userId: String(userId),
    timestamp: Number(timestamp),
    body
  });

  return sign(payload, secret);
}

function verifyRequestSignature(data = {}, signature = "", secret = DEFAULT_SECRET) {
  const expected = createRequestSignature(data, secret);
  return timingSafeEqual(expected, signature);
}

/* =====================================================
🔥 JWT-LIKE LIGHT TOKEN HELPERS
👉 실제 JWT 대체 아님. 내부 서명 토큰용
===================================================== */
function encodeToken(payload = {}, secret = DEFAULT_SECRET) {
  const body = toBase64(stableStringify(payload));
  const signature = sign(body, secret);
  return `${body}.${signature}`;
}

function decodeToken(token = "", secret = DEFAULT_SECRET) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) {
    throw new Error("invalid token");
  }

  if (!verify(body, signature, secret)) {
    throw new Error("invalid token signature");
  }

  return JSON.parse(fromBase64(body));
}

/* =====================================================
🔥 CHECKSUM
===================================================== */
function checksum(input = "") {
  return crc32(String(input));
}

/* simple crc32 */
function crc32(str = "") {
  let crc = 0 ^ -1;

  for (let i = 0; i < str.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ str.charCodeAt(i)) & 0xff];
  }

  return ((crc ^ -1) >>> 0).toString(16);
}

const CRC_TABLE = (() => {
  let c;
  const table = [];

  for (let n = 0; n < 256; n += 1) {
    c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  return table;
})();

/* =====================================================
🔥 MISC HELPERS
===================================================== */
function mask(value = "", visible = 4) {
  const s = String(value || "");
  if (s.length <= visible) return s;
  return `${"*".repeat(Math.max(0, s.length - visible))}${s.slice(-visible)}`;
}

function fingerprint(input = "") {
  return sha256(String(input)).slice(0, 16);
}

function createApiKey(prefix = "sk") {
  return `${prefix}_${randomHex(24)}`;
}

function createSecretPair(prefix = "app") {
  return {
    key: `${prefix}_key_${randomHex(12)}`,
    secret: `${prefix}_secret_${randomHex(24)}`
  };
}

/* =====================================================
🔥 DEBUG / HEALTH
===================================================== */
function getHealth() {
  return {
    ok: true,
    algorithm: DEFAULT_ALGORITHM,
    aes: AES_ALGORITHM,
    secretConfigured: !!DEFAULT_SECRET
  };
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 CRYPTO UTIL READY");

module.exports = {
  // util
  now,
  safeStr,
  stableStringify,
  normalizePayload,

  // random
  randomHex,
  randomBase64,
  randomToken,
  randomId,
  nonce,
  salt,

  // convert
  toBase64,
  fromBase64,
  toHex,
  fromHex,

  // hash
  hash,
  hashBase64,
  doubleHash,
  compareHash,
  sha1,
  sha256,
  sha512,
  md5,

  // hmac
  hmac,
  sign,
  signBase64,
  verify,
  verifyBase64,

  // compare
  timingSafeEqual,

  // password-like
  pbkdf2Hash,
  pbkdf2Verify,

  // key derivation
  deriveKey,
  deriveIv,

  // aes
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON,

  // webhook
  signWebhook,
  verifyWebhook,

  // request / idempotency
  createIdempotencyKey,
  createRequestSignature,
  verifyRequestSignature,

  // token-like
  encodeToken,
  decodeToken,

  // misc
  checksum,
  crc32,
  mask,
  fingerprint,
  createApiKey,
  createSecretPair,

  // health
  getHealth
};