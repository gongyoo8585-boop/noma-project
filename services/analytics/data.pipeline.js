"use strict";

/* =====================================================
🔥 DATA PIPELINE SERVICE
👉 ETL (Extract → Transform → Load)
👉 analytics / queue / cache / logger 연동
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let analyticsService = null;
let cacheService = null;
let queueService = null;
let logger = null;

try { analyticsService = require("./analyticsService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { queueService = require("./queueService"); } catch (_) {}
try { logger = require("./logger.elk"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class DataPipelineService {
  constructor() {
    this.jobs = new Map();
    this.last = null;
  }

  /* =====================================================
  🔥 REGISTER PIPELINE
  ===================================================== */
  register(name, pipeline = {}) {
    assert(name, "PIPELINE_NAME_REQUIRED");

    this.jobs.set(name, pipeline);

    logger?.info("pipeline_registered", { name });

    return true;
  }

  /* =====================================================
  🔥 RUN PIPELINE
  ===================================================== */
  async run(name, input = {}) {
    const pipeline = this.jobs.get(name);

    if (!pipeline) {
      throw new Error("PIPELINE_NOT_FOUND");
    }

    const {
      extract,
      transform,
      load,
    } = pipeline;

    /* 1️⃣ EXTRACT */
    const raw = extract ? await extract(input) : input;

    /* 2️⃣ TRANSFORM */
    const transformed = transform
      ? await transform(raw)
      : raw;

    /* 3️⃣ LOAD */
    const result = load
      ? await load(transformed)
      : transformed;

    this.last = {
      name,
      result,
    };

    analyticsService?.track({
      type: "pipeline_run",
      payload: { name },
    });

    return result;
  }

  /* =====================================================
  🔥 RUN ASYNC (QUEUE)
  ===================================================== */
  async runAsync(name, input) {
    if (!queueService) {
      return this.run(name, input);
    }

    return queueService.add({
      type: "pipeline",
      payload: { name, input },
      handler: async ({ name, input }) =>
        this.run(name, input),
    });
  }

  /* =====================================================
  🔥 CACHE WRAPPED PIPELINE
  ===================================================== */
  async runCached(name, input, ttl = 60) {
    const key = `pipeline:${name}:${JSON.stringify(input)}`;

    if (cacheService) {
      const cached = cacheService.get(key);
      if (cached) return cached;
    }

    const result = await this.run(name, input);

    cacheService?.set(key, result, ttl);

    return result;
  }

  /* =====================================================
  🔥 STREAM PROCESSING (ARRAY)
  ===================================================== */
  async processBatch(name, list = []) {
    assert(Array.isArray(list), "ARRAY_REQUIRED");

    const results = [];

    for (const item of list) {
      try {
        const res = await this.run(name, item);
        results.push({ success: true, res });
      } catch (err) {
        logger?.error("pipeline_batch_error", {
          error: err.message,
        });

        results.push({ success: false, error: err.message });
      }
    }

    return results;
  }

  /* =====================================================
  🔥 PIPELINE LIST
  ===================================================== */
  list() {
    return Array.from(this.jobs.keys());
  }

  /* =====================================================
  🔥 REMOVE PIPELINE
  ===================================================== */
  remove(name) {
    this.jobs.delete(name);
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
    this.jobs.clear();
    this.last = null;
    return true;
  }
}

module.exports = new DataPipelineService();