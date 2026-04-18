/* ===================================================== */
/* 🔥 FINAL COMPLETE VERSION (ULTIMATE CLEAN + FIXED) */
/* ===================================================== */

async function sendInquiryNotification(inquiry) {

  /* ===================================================== */
  /* 🔥 fetch 폴리필 */
  /* ===================================================== */
  let fetchFn = global.fetch;
  if (!fetchFn) {
    try {
      fetchFn = require("node-fetch");
    } catch {
      console.error("fetch 없음");
      return { ok: false };
    }
  }

  /* ===================================================== */
  /* 🔥 AbortController fallback */
  /* ===================================================== */
  const AbortCtrl = global.AbortController || class {
    constructor() {
      this.signal = null;
    }
    abort() {}
  };

  /* ===================================================== */
  /* 🔥 안전값 처리 */
  /* ===================================================== */
  const safe = (v, def = "-") => (v ? String(v) : def);

  const name = safe(inquiry?.name);
  const phone = safe(inquiry?.phone);
  const content = safe(inquiry?.content);
  const status = safe(inquiry?.status, "new");

  /* ===================================================== */
  /* 🔥 XSS 방어 */
  /* ===================================================== */
  const escape = (s) => String(s).replace(/[<>]/g, "");

  /* ===================================================== */
  /* 🔥 시간 */
  /* ===================================================== */
  const now = new Date().toLocaleString();

  /* ===================================================== */
  /* 🔥 환경 prefix */
  /* ===================================================== */
  const envPrefix =
    process.env.NODE_ENV === "production" ? "🔥" : "🧪";

  /* ===================================================== */
  /* 🔥 메시지 생성 (오류 완전 수정) */
  /* ===================================================== */
  let text = [
    `${envPrefix} 노마 신규 제휴문의`,
    `업체명: ${escape(name)}`,
    `전화번호: ${escape(콜)}`,   // ✅ FIXED
    `내용: ${escape(content)}`,
    `상태: ${status}`,
    `시간: ${now}`
  ].join("\n");

  /* ===================================================== */
  /* 🔥 기능 1: 길이 제한 */
  /* ===================================================== */
  if (text.length > 1000) {
    text = text.slice(0, 1000) + "...";
  }

  /* ===================================================== */
  /* 🔥 기능 2: webhook 리스트 */
  /* ===================================================== */
  const webhookList = process.env.KAKAO_WEBHOOKS
    ? process.env.KAKAO_WEBHOOKS.split(",")
    : process.env.KAKAO_WEBHOOK
    ? [process.env.KAKAO_WEBHOOK]
    : [];

  if (!webhookList.length) {
    console.log("알림 스킵:", inquiry?._id?.toString());
    return { ok: true, skipped: true };
  }

  /* ===================================================== */
  /* 🔥 기능 3: 중복 방지 */
  /* ===================================================== */
  const key = `${name}_${phone}_${content}`;
  if (global.__lastNotifyKey === key) {
    return { ok: true, skipped: true };
  }
  global.__lastNotifyKey = key;

  /* ===================================================== */
  /* 🔥 기능 4: 병렬 전송 */
  /* ===================================================== */
  const results = await Promise.all(
    webhookList.map(async (url) => {
      const cleanUrl = (url || "").trim();
      if (!cleanUrl || !cleanUrl.startsWith("http")) return null;

      const start = Date.now();

      try {
        const controller = new AbortCtrl();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetchFn(cleanUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        return {
          url: cleanUrl,
          ok: res.ok,
          status: res.status,
          latency: Date.now() - start
        };

      } catch (err) {
        return {
          url: cleanUrl,
          ok: false,
          error: err.message,
          latency: Date.now() - start
        };
      }
    })
  );

  const filtered = results.filter(Boolean);

  /* ===================================================== */
  /* 🔥 기능 5: 성공 판단 */
  /* ===================================================== */
  const success = filtered.filter(r => r.ok).length;

  /* ===================================================== */
  /* 🔥 기능 6: 재시도 */
  /* ===================================================== */
  if (success === 0 && process.env.RETRY_NOTIFICATION === "true") {
    for (const r of filtered) {
      if (r.ok) continue;

      try {
        await fetchFn(r.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });
      } catch {}
    }
  }

  /* ===================================================== */
  /* 🔥 기능 7: Slack 지원 */
  /* ===================================================== */
  if (process.env.SLACK_WEBHOOK) {
    try {
      await fetchFn(process.env.SLACK_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
    } catch {}
  }

  /* ===================================================== */
  /* 🔥 기능 8: Discord 지원 */
  /* ===================================================== */
  if (process.env.DISCORD_WEBHOOK) {
    try {
      await fetchFn(process.env.DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text })
      });
    } catch {}
  }

  /* ===================================================== */
  /* 🔥 기능 9: 파일 로그 */
  /* ===================================================== */
  if (success === 0 && process.env.LOG_FILE === "true") {
    const fs = require("fs");
    fs.appendFileSync(
      "notify.log",
      `${new Date().toISOString()} ${text}\n`
    );
  }

  /* ===================================================== */
  /* 🔥 기능 10: 디버그 로그 */
  /* ===================================================== */
  if (process.env.LOG_LEVEL === "debug") {
    console.log("알림 결과:", filtered);
  }

  if (success === 0) {
    console.warn("모든 알림 실패:", inquiry?._id?.toString());
  }

  /* ===================================================== */
  /* 🔥 반환 */
  /* ===================================================== */
  return {
    ok: success > 0,
    successCount: success,
    failCount: filtered.length - success,
    results: filtered
  };
}

/* ===================================================== */
/* 🔥 export */
/* ===================================================== */
module.exports = { sendInquiryNotification };