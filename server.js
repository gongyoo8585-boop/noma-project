const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public")); // 🔥 중요

// DB 연결
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB 연결 성공"))
.catch(err=>console.log(err));

// 모델
const User = mongoose.model("User", {
  username: String,
  password: String
});

// 회원가입
app.post("/register", async (req,res)=>{
  const user = new User(req.body);
  await user.save();
  res.json({success:true});
});

// 로그인
app.post("/login", async (req,res)=>{
  const user = await User.findOne(req.body);
  if(!user) return res.json({success:false});

  const token = jwt.sign({id:user._id}, process.env.JWT_SECRET);
  res.json({success:true, token});
});

// 🔥 카카오 로그인
app.get("/kakao/login", (req,res)=>{
  const url = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_REST_KEY}&redirect_uri=${process.env.KAKAO_REDIRECT}&response_type=code`;
  res.redirect(url);
});

// 카카오 콜백
app.get("/kakao/callback", async (req,res)=>{
  res.send("카카오 로그인 성공 🎉");
});

// 서버 실행
app.listen(10000, ()=>console.log("서버 실행"));