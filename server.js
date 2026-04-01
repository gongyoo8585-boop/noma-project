const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 10000;

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 MongoDB 연결 성공"))
  .catch(err => console.log(err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🔥 서버 실행`);
});