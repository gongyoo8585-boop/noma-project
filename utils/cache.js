const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

async function setCache(key, data, ttl = 5) {
  await redis.set(key, JSON.stringify(data), "EX", ttl);
}

async function getCache(key) {
  const v = await redis.get(key);
  return v ? JSON.parse(v) : null;
}

module.exports = {
  setCache,
  getCache
};