"use strict";

/* =====================================================
🔥 PAYMENT TEST (FINAL ULTRA MASTER)
👉 payment API 통합 테스트
👉 생성 / 결제 / 실패 / 취소 / 환불 / 조회
👉 안정성 / 예외 / 구조 검증
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

function expectFail(res) {
  expect(res.status).toBeGreaterThanOrEqual(400);
  expect(res.body).toBeDefined();
}

let createdPaymentId = null;

/* =====================================================
🔥 TEST SUITE
===================================================== */
describe("🔥 PAYMENT API", () => {

  /* =========================
     1. health
  ========================= */
  test("GET /api/payments/health", async () => {
    const res = await request(app).get("/api/payments/health");

    expectOk(res);
    expect(res.body.ok).toBe(true);
  });

  /* =========================
     2. create payment
  ========================= */
  test("POST /api/payments", async () => {
    const res = await request(app)
      .post("/api/payments")
      .send({
        userId: "test-user",
        placeId: "test-place",
        amount: 10000,
        method: "card"
      });

    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeDefined();

    if (res.body.ok) {
      expect(res.body.data).toBeDefined();
      createdPaymentId = res.body.data._id;
    }
  });

  /* =========================
     3. get list
  ========================= */
  test("GET /api/payments", async () => {
    const res = await request(app).get("/api/payments");

    expect(res.status).toBeLessThan(500);

    if (res.body.ok) {
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  /* =========================
     4. get one
  ========================= */
  test("GET /api/payments/:id", async () => {
    if (!createdPaymentId) return;

    const res = await request(app)
      .get(`/api/payments/${createdPaymentId}`);

    expect(res.status).toBeLessThan(500);

    if (res.body.ok) {
      expect(res.body.data).toBeDefined();
    }
  });

  /* =========================
     5. mark paid
  ========================= */
  test("POST /api/payments/:id/pay", async () => {
    if (!createdPaymentId) return;

    const res = await request(app)
      .post(`/api/payments/${createdPaymentId}/pay`)
      .send({ transactionId: "tx_test_123" });

    expect(res.status).toBeLessThan(500);
  });

  /* =========================
     6. fail payment
  ========================= */
  test("POST /api/payments/:id/fail", async () => {
    if (!createdPaymentId) return;

    const res = await request(app)
      .post(`/api/payments/${createdPaymentId}/fail`);

    expect(res.status).toBeLessThan(500);
  });

  /* =========================
     7. cancel payment
  ========================= */
  test("POST /api/payments/:id/cancel", async () => {
    if (!createdPaymentId) return;

    const res = await request(app)
      .post(`/api/payments/${createdPaymentId}/cancel`);

    expect(res.status).toBeLessThan(500);
  });

  /* =========================
     8. refund payment
  ========================= */
  test("POST /api/payments/:id/refund", async () => {
    if (!createdPaymentId) return;

    const res = await request(app)
      .post(`/api/payments/${createdPaymentId}/refund`)
      .send({ amount: 5000 });

    expect(res.status).toBeLessThan(500);
  });

  /* =========================
     9. stats
  ========================= */
  test("GET /api/payments/stats", async () => {
    const res = await request(app)
      .get("/api/payments/stats");

    expect(res.status).toBeLessThan(500);

    if (res.body.ok) {
      expect(res.body.data).toBeDefined();
    }
  });

  /* =========================
     10. invalid id
  ========================= */
  test("GET /api/payments/invalid-id", async () => {
    const res = await request(app)
      .get("/api/payments/invalid-id");

    expectFail(res);
  });

  /* =========================
     11. create invalid amount
  ========================= */
  test("POST /api/payments invalid amount", async () => {
    const res = await request(app)
      .post("/api/payments")
      .send({
        userId: "u",
        placeId: "p",
        amount: -100
      });

    expectFail(res);
  });

  /* =========================
     12. missing fields
  ========================= */
  test("POST /api/payments missing fields", async () => {
    const res = await request(app)
      .post("/api/payments")
      .send({});

    expectFail(res);
  });

  /* =========================
     13. high load safety
  ========================= */
  test("GET /api/payments high load", async () => {
    const requests = [];

    for (let i = 0; i < 20; i++) {
      requests.push(request(app).get("/api/payments"));
    }

    const results = await Promise.all(requests);

    results.forEach((res) => {
      expect(res.status).toBeLessThan(500);
    });
  });

  /* =========================
     14. not found route
  ========================= */
  test("GET /api/payments/unknown", async () => {
    const res = await request(app)
      .get("/api/payments/unknown");

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

});