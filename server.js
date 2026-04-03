onst express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ===== DB ===== */
mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("DB 연결 성공"));

/* ===== 모델 ===== */
const User = mongoose.model("User", {
  username: String,
  password: String
});

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

  if(!user){
    return res.status(401).json({message:"로그인 실패"});
  }

  const token = jwt.sign({username}, process.env.JWT_SECRET);
  res.json({token});
});

/* ===== 카카오 로그인 시작 ===== */
app.get("/kakao", (req,res)=>{
  const url = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_REST_KEY}&redirect_uri=${process.env.KAKAO_REDIRECT}&response_type=code`;
  res.redirect(url);
});

/* ===== 카카오 콜백 ===== */
app.get("/kakao/callback", async (req,res)=>{
  const code = req.query.code;

  try{
    const tokenRes = await axios.post("https://kauth.kakao.com/oauth/token", null, {
      params:{
        grant_type:"authorization_code",
        client_id:process.env.KAKAO_REST_KEY,
        redirect_uri:process.env.KAKAO_REDIRECT,
        code
      }
    });

    const access_token = tokenRes.data.access_token;

    const userRes = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers:{ Authorization:`Bearer ${access_token}` }
    });

    const kakaoId = userRes.data.id;

    const token = jwt.sign(
      {username:"kakao_"+kakaoId},
      process.env.JWT_SECRET
    );

    res.redirect(`/?token=${token}`);

  }catch(err){
    console.log(err.response?.data || err);
    res.send("카카오 로그인 실패");
  }
});

/* ===== 서버 ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("서버 실행"));