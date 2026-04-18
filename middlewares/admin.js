const jwt = require("jsonwebtoken");

/* =========================
   🔥 기본 설정
========================= */
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

/* 🔥 추가 위치 20 */
const ADMIN_AUDIT_LOG = [];

/* ========================= */
function isAdminRole(role){
  return role === "admin" || role === "superAdmin";
}

/* =========================
   🔥 기본 관리자 미들웨어 (수정 + 확장)
========================= */
function admin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "인증 필요"
      });
    }

    if (!isAdminRole(req.user.role)) {
      return res.status(403).json({
        ok: false,
        message: "관리자 권한 필요"
      });
    }

    /* 🔥 추가 위치 21 */
    ADMIN_AUDIT_LOG.push({
      user: req.user.id,
      role: req.user.role,
      path: req.originalUrl,
      method: req.method,
      time: Date.now()
    });

    next();

  } catch (err) {
    console.error("ADMIN MIDDLEWARE ERROR:", err.message);

    return res.status(500).json({
      ok: false,
      message: "서버 오류"
    });
  }
}

module.exports = admin;

/* =========================
   🔥 기존 기능 유지
========================= */

// 1️⃣ 특정 역할 허용
module.exports.allowRoles = function (...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok:false, message:"인증 필요" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok:false, message:"권한 없음" });
    }

    next();
  };
};

// 2️⃣ 관리자 OR 본인
module.exports.adminOrOwner = function (getUserId) {
  return (req, res, next) => {
    const targetId = getUserId(req);

    if (
      req.user &&
      (isAdminRole(req.user.role) ||
        String(req.user.id) === String(targetId))
    ) {
      return next();
    }

    return res.status(403).json({ ok:false, message:"권한 없음" });
  };
};

// 3️⃣ IP 제한
module.exports.ipWhitelist = function (ips = []) {
  return (req, res, next) => {
    if (!ips.length) return next();

    let ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "";

    if (ip.includes(",")) ip = ip.split(",")[0].trim();

    if (!ips.includes(ip)) {
      return res.status(403).json({ ok:false, message:"허용되지 않은 IP" });
    }

    next();
  };
};

// 4️⃣ 관리자 로그
module.exports.logAdmin = function (req, res, next) {
  console.log("ADMIN ACTION:", {
    user: req.user?.id,
    role: req.user?.role,
    path: req.originalUrl,
    method: req.method,
    ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
    time: new Date().toISOString()
  });
  next();
};

// 5️⃣ 관리자 여부
module.exports.hasAdmin = function (req) {
  return req.user && isAdminRole(req.user.role);
};

// 6️⃣ 관리자 강제
module.exports.requireAdmin = function (req, res, next) {
  if (!module.exports.hasAdmin(req)) {
    return res.status(403).json({ ok:false, message:"관리자 필요" });
  }
  next();
};

// 7️⃣ 디버그
module.exports.debugAdmin = function (req) {
  console.log("ADMIN DEBUG:", req?.user || null);
};

// 8️⃣ rate limit
const adminCallMap = new Map();

module.exports.limitAdmin = function (ms = 200) {
  return (req, res, next) => {
    const key = req.user?.id || "global";
    const now = Date.now();

    const last = adminCallMap.get(key) || 0;

    if (now - last < ms) {
      return res.status(429).json({ ok:false, message:"요청 과다" });
    }

    adminCallMap.set(key, now);
    next();
  };
};

// 9️⃣ 헤더 체크
module.exports.requireHeader = function (headerName) {
  return (req, res, next) => {
    const key = headerName.toLowerCase();

    if (!req.headers[key]) {
      return res.status(400).json({ ok:false, message:"헤더 필요" });
    }

    next();
  };
};

// 🔟 관리자 정보
module.exports.getAdminInfo = function (req) {
  if (!req.user) return null;

  return {
    id: req.user.id,
    role: req.user.role,
    isAdmin: isAdminRole(req.user.role)
  };
};

/* =========================
   🔥 추가 기능 13개 (정확히)
========================= */

// 1
module.exports.countAdminCall = function(req,res,next){
  req.adminCallCount = (req.adminCallCount||0)+1;
  next();
};

// 2
module.exports.onlyJson = function(req,res,next){
  if(!req.headers["content-type"]?.includes("application/json")){
    return res.status(400).json({ok:false,message:"JSON 필요"});
  }
  next();
};

// 3
module.exports.timeBlock = function(start=0,end=24){
  return (req,res,next)=>{
    const h = new Date().getHours();
    if(h < start || h > end){
      return res.status(403).json({ok:false,message:"접근 시간 아님"});
    }
    next();
  };
};

// 4
module.exports.attachAdminId = function(req,res,next){
  req.adminReqId = Date.now()+"_"+Math.random();
  next();
};

// 5
module.exports.getAdminLogs = function(){
  return ADMIN_AUDIT_LOG.slice(-100);
};

// 6
module.exports.clearAdminLogs = function(){
  ADMIN_AUDIT_LOG.length = 0;
};

// 7
module.exports.measureTime = function(req,res,next){
  const start = Date.now();
  res.on("finish",()=>{
    console.log("ADMIN TIME:", Date.now()-start);
  });
  next();
};

// 8
module.exports.checkSession = function(req,res,next){
  if(!req.user?.id){
    return res.status(401).json({ok:false});
  }
  next();
};

// 9
module.exports.attachAdminHeader = function(req,res,next){
  res.setHeader("x-admin","true");
  next();
};

// 10
module.exports.getCacheKey = function(req){
  return "admin_"+(req.user?.id||"guest");
};

// 11
module.exports.getRoleString = function(req){
  return req.user?.role || "guest";
};

// 12
module.exports.isAdminBool = function(req){
  return !!(req.user && isAdminRole(req.user.role));
};

// 13
module.exports.printLogs = function(){
  console.log("ADMIN LOGS:", ADMIN_AUDIT_LOG.length);
};

/* =========================
   🔥 기존 확장 유지
========================= */

// superAdmin 전용
module.exports.superAdminOnly = function(req,res,next){
  if(req.user?.role !== "superAdmin"){
    return res.status(403).json({ ok:false, message:"슈퍼 관리자 필요" });
  }
  next();
};

// 권한 레벨 체크
module.exports.minRole = function(role){
  const order = ["user","admin","superAdmin"];

  return (req,res,next)=>{
    if(!req.user) return res.status(401).json({ok:false});

    if(order.indexOf(req.user.role) < order.indexOf(role)){
      return res.status(403).json({ok:false,message:"권한 부족"});
    }

    next();
  };
};

// 여러 헤더 필요
module.exports.requireHeaders = function(headers=[]){
  return (req,res,next)=>{
    for(const h of headers){
      if(!req.headers[h.toLowerCase()]){
        return res.status(400).json({ok:false,message:`${h} 필요`});
      }
    }
    next();
  };
};

// 관리자 응답 래퍼
module.exports.adminResponse = function(res, data){
  return res.json({
    ok:true,
    admin:true,
    data
  });
};

/* =====================================================
🔥 FINAL ADD-ONLY EXTENSION (ADMIN MIDDLEWARE HARDENING)
👉 위치: 파일 맨 마지막
===================================================== */

/* =========================
1. ADMIN LOG 자동 컷 (메모리 보호)
========================= */
setInterval(()=>{
  if(ADMIN_AUDIT_LOG.length > 1000){
    ADMIN_AUDIT_LOG.splice(0, ADMIN_AUDIT_LOG.length - 500);
  }
}, 10000);

/* =========================
2. req.user 안전 보장
========================= */
function ensureUser(req){
  if(!req.user){
    return {
      id: "unknown",
      role: "guest"
    };
  }
  return req.user;
}

/* =========================
3. role 강제 sanitize
========================= */
function sanitizeRole(role){
  const allowed = ["user","admin","superAdmin"];
  return allowed.includes(role) ? role : "user";
}

/* =========================
4. admin 강화 wrapper
========================= */
module.exports.secureAdmin = function(req,res,next){
  const user = ensureUser(req);

  user.role = sanitizeRole(user.role);

  if(!isAdminRole(user.role)){
    return res.status(403).json({ ok:false });
  }

  next();
};

/* =========================
5. audit log 안전 push
========================= */
function safeAuditPush(data){
  try{
    ADMIN_AUDIT_LOG.push(data);
  }catch(e){
    console.error("AUDIT PUSH FAIL");
  }
}

/* =========================
6. audit wrapper
========================= */
module.exports.audit = function(req,res,next){
  const user = ensureUser(req);

  safeAuditPush({
    user:user.id,
    role:user.role,
    path:req.originalUrl,
    method:req.method,
    time:Date.now()
  });

  next();
};

/* =========================
7. admin + rate limit 결합
========================= */
module.exports.secureLimitAdmin = function(ms=200){
  const limiter = module.exports.limitAdmin(ms);

  return (req,res,next)=>{
    limiter(req,res,(err)=>{
      if(err) return;
      module.exports.requireAdmin(req,res,next);
    });
  };
};

/* =========================
8. JWT 검증 보조 (옵션)
========================= */
module.exports.verifyAdminToken = function(req,res,next){
  const token = req.headers.authorization?.replace("Bearer ","");

  if(!token){
    return res.status(401).json({ ok:false });
  }

  try{
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  }catch{
    return res.status(401).json({ ok:false });
  }
};

/* =========================
9. 관리자 요청 추적 ID
========================= */
module.exports.traceId = function(req,res,next){
  req.traceId = "ADM_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  next();
};

/* =========================
10. 응답에 traceId 추가
========================= */
module.exports.attachTrace = function(req,res,next){
  res.setHeader("x-trace-id", req.traceId || "none");
  next();
};

/* =========================
11. 관리자 요청 통계
========================= */
const ADMIN_STATS = {
  total:0
};

module.exports.countAdmin = function(req,res,next){
  ADMIN_STATS.total++;
  next();
};

module.exports.getAdminStats = function(){
  return ADMIN_STATS;
};

/* =========================
12. 관리자 강제 로그 출력
========================= */
module.exports.dumpLogs = function(){
  console.log("ADMIN LOG SNAPSHOT:", ADMIN_AUDIT_LOG.slice(-20));
};

/* =========================
13. emergency lock (전체 관리자 차단)
========================= */
let ADMIN_LOCK = false;

module.exports.lockAdmin = function(){
  ADMIN_LOCK = true;
};

module.exports.unlockAdmin = function(){
  ADMIN_LOCK = false;
};

module.exports.checkAdminLock = function(req,res,next){
  if(ADMIN_LOCK){
    return res.status(503).json({ ok:false, message:"관리자 잠금 상태" });
  }
  next();
};