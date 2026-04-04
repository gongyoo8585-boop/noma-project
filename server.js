app.get("/kakao", (req, res) => {
  const REST_API_KEY = process.env.KAKAO_REST_API_KEY;

  const redirect_uri = "https://noma-project-1.onrender.com/kakao/callback";

  const kakaoAuthURL =
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${REST_API_KEY}` +
    `&redirect_uri=${redirect_uri}` +
    `&response_type=code`;

  console.log("카카오 로그인 요청:", kakaoAuthURL);

  res.redirect(kakaoAuthURL); // 🔥 핵심
});