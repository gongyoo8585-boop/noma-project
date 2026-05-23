"use strict";

const mongoose = require("mongoose");

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function safeStr(v){ return String(v==null?"":v).replace(/[<>]/g,"").trim(); }
function safePhone(v){ return String(v==null?"":v).replace(/[^0-9]/g,""); }
function safeNum(v,d=0){ const n=Number(v); return Number.isFinite(n)?n:d; }
function uniq(arr){ return [...new Set((Array.isArray(arr)?arr:[]).map(v=>safeStr(v)).filter(Boolean))]; }
function minuteFloor(date){ if(!date)return null; const d=new Date(date); d.setSeconds(0,0); return d; }

/* =====================================================
🔥 CODE GENERATOR
===================================================== */
async function generateCode(Model,field,prefix){
  for(let i=0;i<10;i++){
    const code = prefix + Date.now() + Math.floor(Math.random()*10000);
    const exist = await Model.exists({[field]:code});
    if(!exist) return code;
  }
  return prefix + Date.now();
}

/* =====================================================
🔥 SCHEMA
===================================================== */
const schema = new mongoose.Schema({
  userId:{type:String,required:true,index:true},
  placeId:{type:String,required:true,index:true},
  time:{type:Date,required:true,index:true},

  status:{
    type:String,
    enum:["pending","confirmed","cancelled","completed","checked_in","checked_out","arrived","no_show"],
    default:"pending",
    index:true
  },

  people:{type:Number,default:1},
  memo:{type:String,default:""},

  isActive:{type:Boolean,default:true,index:true},
  isVisited:{type:Boolean,default:false},
  isReviewed:{type:Boolean,default:false},
  isNoShow:{type:Boolean,default:false,index:true},

  paymentStatus:{
    type:String,
    enum:["none","paid","refund","partial_refund","failed"],
    default:"none",
    index:true
  },

  paymentAmount:{type:Number,default:0},

  reserveCode:{type:String,index:true},
  visitCode:{type:String,index:true},

  confirmedAt:Date,
  cancelledAt:Date,
  completedAt:Date,
  checkInAt:Date,
  checkOutAt:Date,
  arrivalAt:Date,

  cancelReason:String,
  adminMemo:String,

  expireAt:{type:Date,index:true},

  contactPhone:String,
  specialRequest:String,

  lastUpdatedBy:String,

  shopId:{type:String,index:true},
  source:{type:String,default:"app",index:true},
  channel:{type:String,default:"app",index:true},
  device:String,

  isReminderSent:{type:Boolean,default:false,index:true},
  reminderAt:Date,

  paymentId:{type:String,index:true},

  reserveName:String,
  reserveEmail:String,

  isCompleted:{type:Boolean,default:false,index:true},

  updatedByLogs:[String],
  tags:[String],

  isDeleted:{type:Boolean,default:false,index:true},
  deletedAt:Date,

  /* 🔥 복구된 핵심 */
  statusLogs:[{
    status:String,
    at:{type:Date,default:Date.now},
    reason:String,
    by:String
  }],

  /* 🔥 확장 */
  metadata:{type:Object,default:{}},
  analytics:{
    clickCount:{type:Number,default:0},
    changeCount:{type:Number,default:0}
  }

},{timestamps:true});

/* =====================================================
🔥 PRE VALIDATE
===================================================== */
schema.pre("validate",function(next){
  try{
    this.userId=safeStr(this.userId);
    this.placeId=safeStr(this.placeId);

    this.memo=safeStr(this.memo);
    this.adminMemo=safeStr(this.adminMemo);
    this.specialRequest=safeStr(this.specialRequest);

    this.contactPhone=safePhone(this.contactPhone);

    this.people=Math.max(1,safeNum(this.people,1));

    this.tags=uniq(this.tags);
    this.updatedByLogs=uniq(this.updatedByLogs);

    if(this.time) this.time=minuteFloor(this.time);

    if(!this.userId||!this.placeId) return next(new Error("필수값 누락"));
    if(!this.time) return next(new Error("시간 오류"));

    next();
  }catch(e){ next(e); }
});

/* =====================================================
🔥 PRE SAVE
===================================================== */
schema.pre("save",async function(next){
  try{
    const Model=this.constructor;

    if(!this.reserveCode){
      this.reserveCode = await generateCode(Model,"reserveCode","R");
    }
    if(!this.visitCode){
      this.visitCode = await generateCode(Model,"visitCode","V");
    }

    if(!this.expireAt && this.time){
      this.expireAt = new Date(this.time.getTime()+3600000);
    }

    /* 🔥 상태 동기화 */
    if(this.status==="cancelled"){
      this.isActive=false;
      if(!this.cancelledAt) this.cancelledAt=new Date();
    }

    if(this.status==="completed"){
      this.isCompleted=true;
      this.isActive=false;
    }

    /* 🔥 상태 로그 */
    this.statusLogs.push({
      status:this.status,
      reason:this.cancelReason||"",
      by:this.lastUpdatedBy||""
    });

    /* 🔥 슬롯 제한 */
    const count = await Model.countDocuments({
      placeId:this.placeId,
      time:this.time,
      status:{$ne:"cancelled"},
      _id:{$ne:this._id}
    });

    if(count>=10){
      return next(new Error("예약 마감"));
    }

    next();
  }catch(e){ next(e); }
});

/* =====================================================
🔥 CORE METHODS
===================================================== */
schema.methods.cancelSafe=function(reason=""){
  this.status="cancelled";
  this.cancelReason=safeStr(reason);
  this.cancelledAt=new Date();
  this.isActive=false;
  return this.save();
};

schema.methods.confirm=function(adminId=""){
  this.status="confirmed";
  this.confirmedAt=new Date();
  this.lastUpdatedBy=safeStr(adminId);
  return this.save();
};

schema.methods.reschedule=function(time){
  this.time=minuteFloor(time);
  this.status="pending";
  this.analytics.changeCount++;
  return this.save();
};

schema.methods.setMemo=function(m){
  this.memo=safeStr(m);
  return this.save();
};

schema.methods.extendPeople=function(p){
  this.people=Math.max(1,safeNum(p,1));
  return this.save();
};

/* =====================================================
🔥 STATIC
===================================================== */
schema.statics.checkConflictFinal=async function(placeId,time){
  return !!(await this.exists({
    placeId:String(placeId),
    time:minuteFloor(time),
    status:{$ne:"cancelled"}
  }));
};

schema.statics.findUpcoming=function(){
  return this.find({
    time:{$gte:new Date()},
    status:{$ne:"cancelled"}
  }).sort({time:1});
};

schema.statics.getRevenue=async function(){
  const items=await this.find({paymentStatus:"paid"});
  return items.reduce((s,v)=>s+safeNum(v.paymentAmount),0);
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 RESERVATION FINAL ULTRA COMPLETE v3 READY");

module.exports =
  mongoose.models.Reservation ||
  mongoose.model("Reservation", schema);