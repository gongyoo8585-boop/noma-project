const express = require("express");
const router = express.Router();

const Point = require("../models/Point");
const auth = require("../middlewares/auth");
const admin = require("../middlewares/admin");

/* =========================
공통
========================= */
const ok = (res, data={}) => res.json({ ok:true, ...data });
const fail = (res, msg="ERROR", code=400) => res.status(code).json({ ok:false, msg });

/* =========================
1. 내 포인트 조회
========================= */
router.get("/me", auth, async (req,res)=>{
  const userId = req.user.id;
  const p = await Point.getOrCreate(userId);
  ok(res,{ point:p.getSummarySafe() });
});

/* =========================
2. 포인트 적립
========================= */
router.post("/add", auth, async (req,res)=>{
  try{
    const { amount, reason } = req.body;

    const p = await Point.getOrCreate(req.user.id);
    await p.addPointWithReason(amount, reason);

    ok(res,{ point:p.point });

  }catch(e){
    fail(res,e.message);
  }
});

/* =========================
3. 포인트 사용
========================= */
router.post("/use", auth, async (req,res)=>{
  try{
    const { amount } = req.body;

    const p = await Point.getOrCreate(req.user.id);
    await p.usePointWithReason(amount);

    ok(res,{ point:p.point });

  }catch(e){
    fail(res,e.message);
  }
});

/* =========================
4. 출석 체크
========================= */
router.post("/attendance", auth, async (req,res)=>{
  try{
    const p = await Point.getOrCreate(req.user.id);

    await p.markAttendanceSafe(10);

    ok(res,{ streak:p.streak, point:p.point });

  }catch(e){
    fail(res,e.message);
  }
});

/* =========================
5. 룰렛
========================= */
router.post("/roulette", auth, async (req,res)=>{
  try{
    const reward = Math.floor(Math.random()*50);

    const p = await Point.getOrCreate(req.user.id);
    await p.markRoulette(reward);

    ok(res,{ reward, point:p.point });

  }catch(e){
    fail(res,e.message);
  }
});

/* =========================
6. 랭킹
========================= */
router.get("/ranking", async (req,res)=>{
  const list = await Point.getTopUsersCached(20);
  ok(res,{ list });
});

/* =========================
7. streak 랭킹
========================= */
router.get("/ranking/streak", async (req,res)=>{
  const list = await Point.getTopStreakCached(20);
  ok(res,{ list });
});

/* =========================
8. 통계
========================= */
router.get("/stats", auth, admin, async (req,res)=>{
  const stats = await Point.getFullStats();
  ok(res, stats);
});

/* =========================
9. 관리자 지급
========================= */
router.post("/admin/add", auth, admin, async (req,res)=>{
  const { userId, amount } = req.body;

  const p = await Point.getOrCreate(userId);
  await p.addPointWithReason(amount, "admin");

  ok(res);
});

/* =========================
10. 관리자 차감
========================= */
router.post("/admin/use", auth, admin, async (req,res)=>{
  const { userId, amount } = req.body;

  const p = await Point.getOrCreate(userId);
  await p.usePointWithReason(amount);

  ok(res);
});

/* =========================
11. 관리자 잠금
========================= */
router.post("/admin/lock", auth, admin, async (req,res)=>{
  const { userId } = req.body;

  const p = await Point.getOrCreate(userId);
  await p.lockSafe();

  ok(res);
});

/* =========================
12. 관리자 해제
========================= */
router.post("/admin/unlock", auth, admin, async (req,res)=>{
  const { userId } = req.body;

  const p = await Point.getOrCreate(userId);
  await p.unlockSafe();

  ok(res);
});

/* =========================
13. 월간 초기화
========================= */
router.post("/admin/reset-month", auth, admin, async (req,res)=>{
  await Point.bulkResetMonthly();
  ok(res);
});

/* =========================
14. 포인트 이전
========================= */
router.post("/transfer", auth, async (req,res)=>{
  try{
    const { toUserId, amount } = req.body;

    const from = await Point.getOrCreate(req.user.id);
    const to = await Point.getOrCreate(toUserId);

    await from.transferOut(amount);
    await to.transferIn(amount);

    ok(res);

  }catch(e){
    fail(res,e.message);
  }
});

/* =========================
15. 만료 처리
========================= */
router.post("/expire", auth, admin, async (req,res)=>{
  const list = await Point.find({
    expireAt:{ $lte:new Date() }
  });

  for(const p of list){
    await p.expireSomePoint(100);
  }

  ok(res,{ count:list.length });
});

/* ========================= */
module.exports = router;