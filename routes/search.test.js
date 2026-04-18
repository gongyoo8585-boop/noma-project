"use strict";

/* =====================================================
🔥 SEARCH TEST (FINAL ULTRA MASTER)
👉 search API 통합 테스트
👉 supertest 기반
👉 health / search / autocomplete / advanced / trending
👉 통째로 교체 가능한 완성형
===================================================== */

const request = require("supertest");
const app = require("../app");

/* =====================================================
🔥 UTIL
===================================================== */
function expectOk(res) {
  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.status).toBeLessThan(300);
  expect(res.body).toBeDefined();
  expect(typeof res.body.ok).toBe("boolean");
}

function expectArray(v) {
  expect(Array.isArray(v)).toBe(true);
}

function expectObject(v) {
  expect(v).toBeDefined();
  expect(typeof v).toBe("object");
  expect(Array.isArray(v)).toBe(false);
}

/* =====================================================
🔥 TEST SUITE
===================================================== */
describe("🔥 SEARCH API", () => {
  /* =========================
     1. health
  ========================= */
  test("GET /api/search/health", async () => {
    const res = await request(app).get("/api/search/health");

    expectOk(res);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  /* =========================
     2. debug
  ========================= */
  test("GET /api/search/debug", async () => {
    const res = await request(app).get("/api/search/debug");

    expectOk(res);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  /* =========================
     3. metrics
  ========================= */
  test("GET /api/search/metrics", async () => {
    const res = await request(app).get("/api/search/metrics");

    expectOk(res);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expectObject(res.body.metrics);
  });

  /* =========================
     4. basic search
  ========================= */
  test("GET /api/search?q=test", async () => {
    const res = await request(app)
      .get("/api/search")
      .query({ q: "test" });

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();
    expect(typeof res.body.ok).toBe("boolean");

    if (res.body.ok) {
      expectArray(res.body.data);
    }
  });

  /* =========================
     5. search with filters
  ========================= */
  test("GET /api/search with region/service/tags", async () => {
    const res = await request(app)
      .get("/api/search")
      .query({
        q: "마사지",
        region: "서울",
        service: "thai",
        tags: "힐링,추천",
        limit: 5,
        sort: "score"
      });

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();

    if (res.body.ok) {
      expectArray(res.body.data);
    }
  });

  /* =========================
     6. autocomplete
  ========================= */
  test("GET /api/search/autocomplete?q=마", async () => {
    const res = await request(app)
      .get("/api/search/autocomplete")
      .query({ q: "마", limit: 5 });

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();

    if (res.body.ok) {
      expectArray(res.body.data);
    }
  });

  /* =========================
     7. advanced
  ========================= */
  test("GET /api/search/advanced", async () => {
    const res = await request(app)
      .get("/api/search/advanced")
      .query({
        minRating: 3,
        maxPrice: 100000,
        region: "서울",
        tags: "추천,인기",
        limit: 10
      });

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();

    if (res.body.ok) {
      expectArray(res.body.data);
    }
  });

  /* =========================
     8. trending
  ========================= */
  test("GET /api/search/trending", async () => {
    const res = await request(app).get("/api/search/trending");

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();

    if (res.body.ok) {
      expectArray(res.body.data);
    }
  });

  /* =========================
     9. popular
  ========================= */
  test("GET /api/search/popular", async () => {
    const res = await request(app).get("/api/search/popular");

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();

    if (res.body.ok) {
      expectArray(res.body.data);
    }
  });

  /* =========================
     10. related
  ========================= */
  test("GET /api/search/related?q=마사지", async () => {
    const res = await request(app)
      .get("/api/search/related")
      .query({ q: "마사지" });

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();

    if (res.body.ok) {
      expectArray(res.body.data);
    }
  });

  /* =========================
     11. recommend
  ========================= */
  test("GET /api/search/recommend?q=마사지", async () => {
    const res = await request(app)
      .get("/api/search/recommend")
      .query({ q: "마사지" });

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();

    if (res.body.ok) {
      expectArray(res.body.data);
    }
  });

  /* =========================
     12. empty search
  ========================= */
  test("GET /api/search?q=''", async () => {
    const res = await request(app)
      .get("/api/search")
      .query({ q: "" });

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();
  });

  /* =========================
     13. bad limit safe
  ========================= */
  test("GET /api/search with invalid limit", async () => {
    const res = await request(app)
      .get("/api/search")
      .query({ q: "마사지", limit: "abc" });

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();
  });

  /* =========================
     14. route not found under search
  ========================= */
  test("GET /api/search/unknown-route", async () => {
    const res = await request(app).get("/api/search/unknown-route");

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body).toBeDefined();
    expect(typeof res.body.ok).toBe("boolean");
  });
});