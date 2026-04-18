"use strict";

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const app = express();

/* =========================
   ENV
========================= */
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());

/* =========================
   ROOT
========================= */
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "SERVER RUNNING"
  });
});

/* =========================
   HEALTH
========================= */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState
  });
});

/* =========================
   DB CONNECT
========================= */
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🔥 MongoDB CONNECTED");
  } catch (err) {
    console.error("❌ DB ERROR:", err.message);
    process.exit(1);
  }
}

/* =========================
   START
========================= */
async function start() {
  await connectDB();

  app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 SERVER START:", PORT);
  });
}

start();