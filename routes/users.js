const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const auth = require("../middlewares/auth");

const JWT_SECRET = process.env.JWT_SECRET || "change_me";

/* =========================
   공통 유틸
========================= */
function cleanId(v) {
  return String(v || "").trim().toLowerCase();
}

function safeUser(user) {
  if (!user) return null;
  const obj = typeof user.toJSON === "function" ? user.toJSON() : { ...user };
  delete obj.password;
  delete obj.loginFailCount;
  delete obj.lockedUntil;
  return obj;
}

function isValidRole(role) {
  return ["user", "admin", "superAdmin"].includes(role);
}

function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("USERS ROUTE ERROR:", e);
      res.status(500).json({ ok: false, message: "server error" });
    });
  };
}

/* =========================
   1. 회원가입
========================= */
router.post("/register", safeAsync(async (req, res) => {
  const id = cleanId(req.body.id);
  const password = String(req.body.password || "");

  if (!id || !password) {
    return res.status(400).json({ ok: false, message: "필수값 없음" });
  }

  const exists = await User.findOne({ id });
  if (exists) {
    return res.status(409).json({ ok: false, message: "이미 존재" });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await User.create({
    id,
    password: hash,
    role: "user"
  });

  res.json({ ok: true, user: safeUser(user) });
}));

/* =========================
   2. 로그인
========================= */
router.post("/login", safeAsync(async (req, res) => {
  const id = cleanId(req.body.id);
  const password = String(req.body.password || "");

  if (!id || !password) {
    return res.status(400).json({ ok: false, message: "필수값 없음" });
  }

  const user = await User.findOne({ id });
  if (!user) {
    return res.status(404).json({ ok: false, message: "유저 없음" });
  }

  if (typeof user.canLogin === "function" && !user.canLogin()) {
    return res.status(403).json({ ok: false, message: "로그인 불가" });
  }

  if (!user.isActive) {
    return res.status(403).json({ ok: false, message: "비활성 계정" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    if (typeof user.increaseLoginFailSafe === "function") {
      await user.increaseLoginFailSafe();
    } else if (typeof user.increaseLoginFail === "function") {
      await user.increaseLoginFail();
    }
    return res.status(403).json({ ok: false, message: "비밀번호 오류" });
  }

  if (typeof user.recordLogin === "function") {
    await user.recordLogin({
      ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
      ua: req.headers["user-agent"] || ""
    });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email || "" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    ok: true,
    token,
    user: safeUser(user)
  });
}));

/* =========================
   3. 내 정보 조회
========================= */
router.get("/me", auth, safeAsync(async (req, res) => {
  const user = await User.findOne({ id: req.user.id });

  if (!user) {
    return res.status(404).json({ ok: false, message: "유저 없음" });
  }

  res.json({ ok: true, user: safeUser(user) });
}));

/* =========================
   4. 프로필 수정
========================= */
router.put("/me", auth, safeAsync(async (req, res) => {
  const user = await User.findOne({ id: req.user.id });
  if (!user) {
    return res.status(404).json({ ok: false, message: "유저 없음" });
  }

  const {
    password,
    nickname,
    email,
    phone,
    statusMessage,
    profileImage,
    marketingAgree,
    notificationEnabled
  } = req.body;

  if (password) {
    user.password = await bcrypt.hash(String(password), 10);
  }

  if (nickname != null) {
    user.nickname = String(nickname || "").replace(/[<>]/g, "").trim();
  }

  if (email != null) {
    user.email = String(email || "").trim().toLowerCase();
  }

  if (phone != null) {
    user.phone = String(phone || "").replace(/[^0-9]/g, "");
  }

  if (statusMessage != null) {
    user.statusMessage = String(statusMessage || "");
  }

  if (profileImage != null) {
    user.profileImage = String(profileImage || "");
  }

  if (marketingAgree != null) {
    user.marketingAgree = !!marketingAgree;
  }

  if (notificationEnabled != null) {
    user.notificationEnabled = !!notificationEnabled;
  }

  await user.save();

  res.json({ ok: true, user: safeUser(user) });
}));

/* =========================
   5. 비밀번호 변경
========================= */
router.post("/me/password", auth, safeAsync(async (req, res) => {
  const { currentPassword = "", newPassword = "" } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ ok: false, message: "필수값 없음" });
  }

  const user = await User.findOne({ id: req.user.id });
  if (!user) {
    return res.status(404).json({ ok: false, message: "유저 없음" });
  }

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    return res.status(403).json({ ok: false, message: "현재 비밀번호 오류" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ ok: true });
}));

/* =========================
   6. 로그아웃
========================= */
router.post("/logout", (req, res) => {
  res.json({ ok: true });
});

/* =========================
   7. 계정 삭제
========================= */
router.delete("/me", auth, safeAsync(async (req, res) => {
  const user = await User.findOne({ id: req.user.id });

  if (!user) {
    return res.status(404).json({ ok: false, message: "유저 없음" });
  }

  if (typeof user.softDelete === "function") {
    await user.softDelete();
  } else {
    user.isDeleted = true;
    user.isActive = false;
    await user.save();
  }

  res.json({ ok: true });
}));

/* =========================
   8. ping
========================= */
router.get("/ping", (req, res) => {
  res.json({ ok: true });
});

/* =========================
   9. 유저 수
========================= */
router.get("/count", safeAsync(async (req, res) => {
  const count = await User.countDocuments({ isDeleted: { $ne: true } });
  res.json({ ok: true, count });
}));

/* =========================
   10. 최근 가입 유저
========================= */
router.get("/recent", safeAsync(async (req, res) => {
  const items = await User.find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({ ok: true, items: items.map(safeUser) });
}));

/* =========================
   11. 활성 유저
========================= */
router.get("/active", safeAsync(async (req, res) => {
  const items = await User.find({
    isActive: true,
    isDeleted: { $ne: true }
  }).sort({ createdAt: -1 });

  res.json({ ok: true, items: items.map(safeUser) });
}));

/* =========================
   12. 유저 차단
========================= */
router.post("/ban/:id", safeAsync(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ ok: false, message: "유저 없음" });

  u.isActive = false;
  u.banReason = String(req.body.reason || "admin ban");
  await u.save();

  res.json({ ok: true });
}));

/* =========================
   13. 유저 차단 해제
========================= */
router.post("/unban/:id", safeAsync(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ ok: false, message: "유저 없음" });

  u.isActive = true;
  u.banReason = "";
  u.lockedUntil = null;
  u.loginFailCount = 0;
  await u.save();

  res.json({ ok: true });
}));

/* =========================
   14. 역할 조회
========================= */
router.get("/role/:id", safeAsync(async (req, res) => {
  const u = await User.findById(req.params.id);
  res.json({ ok: true, role: u?.role || null });
}));

/* =========================
   15. 역할 변경
========================= */
router.post("/role/:id", safeAsync(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ ok: false, message: "유저 없음" });

  const role = String(req.body.role || "user");
  if (!isValidRole(role)) {
    return res.status(400).json({ ok: false, message: "role 오류" });
  }

  u.role = role;
  await u.save();

  res.json({ ok: true, role: u.role });
}));

/* =========================
   16. 아이디 존재 확인
========================= */
router.get("/exists/:id", safeAsync(async (req, res) => {
  const e = await User.exists({ id: cleanId(req.params.id) });
  res.json({ ok: true, exists: !!e });
}));

/* =========================
   17. debug me
========================= */
router.get("/debug/me", auth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

/* =========================
   18. 레벨 조회
========================= */
router.get("/level/:id", safeAsync(async (req, res) => {
  const u = await User.findById(req.params.id);
  res.json({ ok: true, level: u?.level || 1 });
}));

/* =========================
   19. 유저 상태 리셋
========================= */
router.post("/reset/:id", safeAsync(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ ok: false, message: "유저 없음" });

  u.point = 0;
  u.level = 1;
  u.exp = 0;
  u.loginFailCount = 0;
  u.lockedUntil = null;
  await u.save();

  res.json({ ok: true });
}));

/* =========================
   20. health
========================= */
router.get("/health", (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

/* =========================
   21. register safe
========================= */
router.post("/register-safe", safeAsync(async (req, res) => {
  const id = cleanId(req.body.id);
  const password = String(req.body.password || "");

  if (!id || !password) {
    return res.status(400).json({ ok: false, message: "필수값 없음" });
  }

  if (password.length < 4) {
    return res.status(400).json({ ok: false, message: "비밀번호 너무 짧음" });
  }

  const exists = await User.findOne({ id });
  if (exists) {
    return res.status(409).json({ ok: false, message: "이미 존재" });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await User.create({
    id,
    password: hash,
    role: "user"
  });

  res.json({ ok: true, user: safeUser(user) });
}));

/* =========================
   22. login safe
========================= */
router.post("/login-safe", safeAsync(async (req, res) => {
  const id = cleanId(req.body.id);
  const password = String(req.body.password || "");

  if (!id || !password) {
    return res.status(400).json({ ok: false, message: "필수값 없음" });
  }

  const user = await User.findOne({ id });
  if (!user) {
    return res.status(404).json({ ok: false, message: "유저 없음" });
  }

  if (typeof user.canLogin === "function" && !user.canLogin()) {
    return res.status(403).json({ ok: false, message: "로그인 불가" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    if (typeof user.increaseLoginFailSafe === "function") {
      await user.increaseLoginFailSafe();
    } else if (typeof user.increaseLoginFail === "function") {
      await user.increaseLoginFail();
    }
    return res.status(403).json({ ok: false, message: "비밀번호 오류" });
  }

  if (typeof user.recordLogin === "function") {
    await user.recordLogin({
      ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
      ua: req.headers["user-agent"] || ""
    });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email || "" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    ok: true,
    token,
    user: safeUser(user)
  });
}));

/* =========================
   23. 내 프로필 상세 수정
========================= */
router.patch("/me/profile", auth, safeAsync(async (req, res) => {
  const user = await User.findOne({ id: req.user.id });
  if (!user) return res.status(404).json({ ok: false, message: "유저 없음" });

  const {
    nickname,
    email,
    phone,
    statusMessage,
    profileImage,
    marketingAgree,
    notificationEnabled
  } = req.body;

  if (nickname != null) {
    user.nickname = String(nickname || "").replace(/[<>]/g, "").trim();
  }

  if (email != null) {
    user.email = String(email || "").trim().toLowerCase();
  }

  if (phone != null) {
    user.phone = String(phone || "").replace(/[^0-9]/g, "");
  }

  if (statusMessage != null) {
    user.statusMessage = String(statusMessage || "");
  }

  if (profileImage != null) {
    user.profileImage = String(profileImage || "");
  }

  if (marketingAgree != null) {
    user.marketingAgree = !!marketingAgree;
  }

  if (notificationEnabled != null) {
    user.notificationEnabled = !!notificationEnabled;
  }

  await user.save();

  res.json({ ok: true, user: safeUser(user) });
}));

/* =========================
   24. 내 요약 정보
========================= */
router.get("/me/summary", auth, safeAsync(async (req, res) => {
  const user = await User.findOne({ id: req.user.id });
  if (!user) return res.status(404).json({ ok: false, message: "유저 없음" });

  const summary =
    typeof user.getSummary === "function"
      ? user.getSummary()
      : {
          id: user.id,
          nickname: user.nickname,
          role: user.role,
          point: user.point,
          level: user.level
        };

  res.json({ ok: true, summary });
}));

/* =========================
   25. 내 찜 목록
========================= */
router.get("/me/favorites", auth, safeAsync(async (req, res) => {
  const user = await User.findOne({ id: req.user.id }).populate({
    path: "favorites",
    match: { isDeleted: { $ne: true } }
  });

  if (!user) {
    return res.status(404).json({ ok: false, message: "유저 없음" });
  }

  res.json({
    ok: true,
    items: Array.isArray(user.favorites) ? user.favorites : []
  });
}));

/* =========================
   26. 포인트 지급
========================= */
router.post("/point/:id", safeAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ ok: false, message: "유저 없음" });

  const amount = Number(req.body.amount || 0);
  if (!Number.isFinite(amount)) {
    return res.status(400).json({ ok: false, message: "amount 오류" });
  }

  if (typeof user.addPoint === "function") {
    await user.addPoint(amount);
  } else {
    user.point = Math.max(0, Number(user.point || 0) + amount);
    await user.save();
  }

  res.json({ ok: true, point: user.point });
}));

/* =========================
   27. 포인트 차감
========================= */
router.post("/point/:id/deduct", safeAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ ok: false, message: "유저 없음" });

  const amount = Number(req.body.amount || 0);
  if (amount < 0) {
    return res.status(400).json({ ok: false, message: "amount 오류" });
  }

  if (typeof user.deductPoint === "function") {
    await user.deductPoint(amount);
  } else {
    if (Number(user.point || 0) < amount) {
      return res.status(400).json({ ok: false, message: "포인트 부족" });
    }
    user.point = Number(user.point || 0) - amount;
    await user.save();
  }

  res.json({ ok: true, point: user.point });
}));

/* =========================
   28. 유저 검색
========================= */
router.get("/search", safeAsync(async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (!q) {
    const items = await User.find().sort({ createdAt: -1 }).limit(20);
    return res.json({ ok: true, items: items.map(safeUser) });
  }

  let items = [];
  if (typeof User.searchAdvanced === "function") {
    items = await User.searchAdvanced(q);
  } else {
    items = await User.find({
      $or: [
        { id: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { nickname: { $regex: q, $options: "i" } }
      ]
    }).limit(20);
  }

  res.json({ ok: true, items: items.map(safeUser) });
}));

/* =========================
   29. 계정 잠금 해제
========================= */
router.post("/unlock/:id", safeAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ ok: false, message: "유저 없음" });

  if (typeof user.unlock === "function") {
    await user.unlock();
  } else if (typeof user.resetLoginFail === "function") {
    await user.resetLoginFail();
  } else {
    user.loginFailCount = 0;
    user.lockedUntil = null;
    await user.save();
  }

  res.json({ ok: true });
}));

/* =========================
   30. 관리자 목록
========================= */
router.get("/admins", safeAsync(async (req, res) => {
  let items = [];
  if (typeof User.findAdmins === "function") {
    items = await User.findAdmins();
  } else {
    items = await User.find({
      role: { $in: ["admin", "superAdmin"] },
      isDeleted: false
    }).sort({ createdAt: -1 });
  }

  res.json({ ok: true, items: items.map(safeUser) });
}));

/* =========================
   31. 로그인 가능 여부 체크
========================= */
router.get("/can-login/:id", safeAsync(async (req, res) => {
  const user = await User.findOne({ id: cleanId(req.params.id) });
  if (!user) {
    return res.json({ ok: true, canLogin: false, exists: false });
  }

  const canLogin =
    typeof user.canLogin === "function"
      ? user.canLogin()
      : !!(user.isActive && !user.isDeleted);

  res.json({
    ok: true,
    exists: true,
    canLogin
  });
}));

module.exports = router;