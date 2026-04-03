const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("DB 연결 성공"));

/* ===== 모델 ===== */
const User = mongoose.model("User", {
  username: String,
  password: String
});

const Place = mongoose.model("Place", {
  name: String,
  lat: Number,
  lng: Number,
  user: String,
  createdAt: { type: Date, default: Date.now }
});

/* ===== JWT 인증 ===== */
function auth(req,res,next){
  try{
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.username;
    next();
  }catch{
    res.status(401).json({message:"인증 실패"});
  }
}

/* ===== 회원가입 ===== */
app.post("/register", async (req,res)=>{
  const {username,password} = req.body;
  await User.create({username,password});
  res.json({message:"가입 성공"});
});

/* ===== 로그인 ===== */
app.post("/login", async (req,res)=>{
  const {username,password} = req.body;
  const user = await User.findOne({username,password});
  if(!user) return res.status(401).json({message:"로그인 실패"});

  const token = jwt.sign({username}, process.env.JWT_SECRET);
  res.json({token});
});

/* ===== 맛집 저장 ===== */
app.post("/place", auth, async (req,res)=>{
  const {name,lat,lng} = req.body;
  await Place.create({name,lat,lng,user:req.user});
  res.json({message:"저장 완료"});
});

/* ===== 리스트 ===== */
app.get("/place", auth, async (req,res)=>{
  const list = await Place.find({user:req.user});
  res.json(list);
});

/* ===== 서버 ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("서버 실행"));