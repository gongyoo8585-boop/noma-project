"use strict";

/* =====================================================
🔥 AB TEST SERVICE
👉 실험 / 그룹 분배 / 성과 분석
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;
let analyticsService = null;

try { cacheService = require("./cacheService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class ABTestService {
  constructor() {
    this.tests = new Map();
    this.last = null;
  }

  /* =====================================================
  🔥 REGISTER TEST
  ===================================================== */
  register(name, config = {}) {
    assert(name, "TEST_NAME_REQUIRED");

    const {
      variants = ["A", "B"],
      weights = null, // ex: [0.5, 0.5]
    } = config;

    this.tests.set(name, {
      variants,
      weights,
      stats: {},
    });

    return true;
  }

  /* =====================================================
  🔥 ASSIGN USER
  ===================================================== */
  assign(testName, userId) {
    assert(testName, "TEST_REQUIRED");
    assert(userId, "USER_REQUIRED");

    const test = this.tests.get(testName);
    if (!test) throw new Error("TEST_NOT_FOUND");

    const cacheKey = `ab:${testName}:${userId}`;

    if (cacheService) {
      const cached = cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const h = hash(userId + testName);

    let variant;

    if (test.weights && test.weights.length === test.variants.length) {
      const r = (h % 1000) / 1000;

      let acc = 0;
      for (let i = 0; i < test.variants.length; i++) {
        acc += test.weights[i];
        if (r <= acc) {
          variant = test.variants[i];
          break;
        }
      }
    } else {
      variant = test.variants[h % test.variants.length];
    }

    cacheService?.set(cacheKey, variant, 86400);

    analyticsService?.track({
      type: "ab_assign",
      userId,
      payload: { testName, variant },
    });

    return variant;
  }

  /* =====================================================
  🔥 TRACK EVENT
  ===================================================== */
  track(testName, userId, event = "view") {
    const variant = this.assign(testName, userId);

    const test = this.tests.get(testName);
    if (!test) return;

    if (!test.stats[variant]) {
      test.stats[variant] = {
        view: 0,
        conversion: 0,
      };
    }

    test.stats[variant][event] =
      (test.stats[variant][event] || 0) + 1;

    analyticsService?.track({
      type: "ab_event",
      userId,
      payload: { testName, variant, event },
    });

    return true;
  }

  /* =====================================================
  🔥 CONVERSION RATE
  ===================================================== */
  getResult(testName) {
    const test = this.tests.get(testName);
    if (!test) throw new Error("TEST_NOT_FOUND");

    const result = {};

    for (const [variant, stat] of Object.entries(test.stats)) {
      const view = stat.view || 0;
      const conv = stat.conversion || 0;

      result[variant] = {
        view,
        conversion: conv,
        rate: view ? (conv / view).toFixed(4) : 0,
      };
    }

    this.last = result;

    return result;
  }

  /* =====================================================
  🔥 BEST VARIANT
  ===================================================== */
  getWinner(testName) {
    const result = this.getResult(testName);

    let best = null;
    let bestRate = -1;

    for (const [variant, data] of Object.entries(result)) {
      const rate = Number(data.rate);

      if (rate > bestRate) {
        bestRate = rate;
        best = variant;
      }
    }

    return {
      variant: best,
      rate: bestRate,
    };
  }

  /* =====================================================
  🔥 LIST TESTS
  ===================================================== */
  list() {
    return Array.from(this.tests.keys());
  }

  /* =====================================================
  🔥 REMOVE TEST
  ===================================================== */
  remove(name) {
    this.tests.delete(name);
    return true;
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.last;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.tests.clear();
    this.last = null;
    return true;
  }
}

module.exports = new ABTestService();