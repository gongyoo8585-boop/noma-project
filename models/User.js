"use strict";

const mongoose = require("mongoose");

/* ========================= */
/* 🔥 BASE SCHEMA */
/* ========================= */
const schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },

  nickname: { type: String, default: "" },

  role: {
    type: String,
    enum: ["user", "admin", "superAdmin"],
    default: "user",
    index: true
  },

  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],

  point: { type: Number, default: 0 },
  attendanceCount: { type: Number, default: 0 },
  lastAttendAt: { type: Date, default: null },

  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false, index: true },

  email: { type: String, default: "", index: true },
  phone: { type: String, default: "" },

  profileImage: { type: String, default: "" },

  lastLoginAt: { type: Date, default: null },
  loginCount: { type: Number, default: 0 },

  statusMessage: { type: String, default: "" },

  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },

  banReason: { type: String, default: "" },

  lastIp: { type: String, default: "" },
  lastUserAgent: { type: String, default: "" },

  loginFailCount: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },

  notificationEnabled: { type: Boolean, default: true },
  marketingAgree: { type: Boolean, default: false },

  lastActionAt: { type: Date, default: null },
  deviceCount: { type: Number, default: 0 }

}, { timestamps: true });

/* ========================= */
/* 🔥 UTIL */
/* ========================= */
function safeCompareId(a, b) {
  return String(a) === String(b);
}

function isValidEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/* ========================= */
/* 🔥 PRE SAVE (통합) */
/* ========================= */
schema.pre("save", async function(next){
  try{
    // email normalize
    if(this.email){
      this.email = this.email.toLowerCase().trim();
      if(!isValidEmail(this.email)) this.email = "";
    }

    // phone normalize
    if(this.phone){
      this.phone = String(this.phone).replace(/[^0-9]/g,"");
    }

    // nickname sanitize
    if(this.nickname){
      this.nickname = this.nickname.replace(/[<>]/g,"").trim();
    }

    // favorites dedupe
    if(Array.isArray(this.favorites)){
      this.favorites = [...new Set(this.favorites.map(v=>String(v)))];
    }

    // exp → level sync
    this.level = Math.floor(this.exp / 100) + 1;

    // point protect
    if(this.point < 0) this.point = 0;

    // loginCount limit
    if(this.loginCount > 1000000) this.loginCount = 1000000;

    // device protect
    if(this.deviceCount < 0) this.deviceCount = 0;

    // last action
    this.lastActionAt = new Date();

    next();
  }catch(e){
    next(e);
  }
});

/* ========================= */
/* 🔥 CORE METHODS */
/* ========================= */
schema.methods.isAdmin = function(){
  return ["admin","superAdmin"].includes(this.role);
};

schema.methods.isLocked = function(){
  return this.lockedUntil && Date.now() < new Date(this.lockedUntil);
};

schema.methods.canLogin = function(){
  if(this.isDeleted || !this.isActive) return false;
  if(this.isLocked()) return false;
  return true;
};

schema.methods.recordLogin = function(meta={}){
  this.lastLoginAt = new Date();
  this.loginCount++;
  this.lastIp = meta.ip || this.lastIp;
  this.lastUserAgent = meta.ua || this.lastUserAgent;
  this.loginFailCount = 0;
  this.lockedUntil = null;
  return this.save();
};

schema.methods.increaseLoginFail = function(){
  this.loginFailCount++;
  if(this.loginFailCount >= 5){
    this.lockedUntil = new Date(Date.now()+600000);
  }
  return this.save();
};

/* ========================= */
/* 🔥 FAVORITES */
/* ========================= */
schema.methods.addFavorite = function(id){
  if(!this.favorites.some(v=>safeCompareId(v,id))){
    this.favorites.push(id);
  }
  return this.save();
};

schema.methods.removeFavorite = function(id){
  this.favorites = this.favorites.filter(v=>!safeCompareId(v,id));
  return this.save();
};

/* ========================= */
/* 🔥 POINT / LEVEL */
/* ========================= */
schema.methods.addPoint = function(n){
  this.point += Number(n||0);
  return this.save();
};

schema.methods.addExp = function(n){
  this.exp += Number(n||0);
  return this.save();
};

/* ========================= */
/* 🔥 PROFILE */
/* ========================= */
schema.methods.updateNickname = function(n){
  this.nickname = String(n||"");
  return this.save();
};

schema.methods.updatePhone = function(p){
  this.phone = String(p||"").replace(/[^0-9]/g,"");
  return this.save();
};

schema.methods.updateEmail = function(e){
  if(isValidEmail(e)) this.email = e;
  return this.save();
};

/* ========================= */
/* 🔥 ADMIN / SECURITY */
/* ========================= */
schema.methods.ban = function(reason){
  this.isActive = false;
  this.banReason = reason;
  return this.save();
};

schema.methods.unlock = function(){
  this.loginFailCount = 0;
  this.lockedUntil = null;
  return this.save();
};

schema.methods.softDelete = function(){
  this.isDeleted = true;
  return this.save();
};

/* ========================= */
/* 🔥 STATIC */
/* ========================= */
schema.statics.findSafe = function(q={}){
  return this.find({ ...q, isDeleted:false });
};

schema.statics.findAdmins = function(){
  return this.find({ role:{ $in:["admin","superAdmin"] } });
};

schema.statics.topPointUsers = function(limit=10){
  return this.find().sort({ point:-1 }).limit(limit);
};

/* ========================= */
/* 🔥 JSON SAFE */
/* ========================= */
schema.methods.toJSON = function(){
  const obj = this.toObject();
  delete obj.password;
  delete obj.loginFailCount;
  delete obj.lockedUntil;
  return obj;
};

console.log("🔥 USER MODEL FINAL STABLE READY");

module.exports = mongoose.model("User", schema);