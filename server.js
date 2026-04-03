const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ===== DB ===== */
mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("DB 연결 성공"))
  .catch(err=>console.log(err));

/* ===== 모델 ===== */
const User = mongoose.model("User", {
  username: String,
  password: String
});

/* ===== 회원가입 ===== */
app.post("/register", async (req,res)=>{
  try{
    const {username,password} = req.body;
    await User.create({username,password});
    res.json({message:"가입 성공"});
  }catch{
    res.status(500).json({message:"서버 오류"});
  }
});

/* ===== 로그인 ===== */
app.post("/login", async (req,res)=>{
  const {username,password} = req.body;

  const user = await User.findOne({username,password});

  if(!user){
    return res.json({error:true});
  }

  const token = jwt.sign({username}, process.env.JWT_SECRET);
  res.json({token});
});

/* ===== 🔥 카카오 로그인 (안전버전) ===== */
app.get("/kakao", (req,res)=>{
  res.send(`
    <h1>카카오 로그인 준비중</h1>
    <p>현재 테스트 모드입니다</p>
    <a href="/">돌아가기</a>
  `);
});

/* ===== 서버 ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("서버 실행"));