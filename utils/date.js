"use strict";

/* =====================================================
🔥 DATE UTIL (FINAL ULTRA COMPLETE MASTER)
👉 시간 / 범위 / 포맷 / 비교 / TTL / 통계용
👉 서비스 전역 시간 엔진
===================================================== */

/* =====================================================
🔥 CONFIG
===================================================== */
const DEFAULT_TZ = process.env.APP_TZ || "Asia/Seoul";

/* =====================================================
🔥 BASIC
===================================================== */
function now() {
  return Date.now();
}

function nowDate() {
  return new Date();
}

function toDate(input) {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  return new Date(input);
}

function toTimestamp(input) {
  return toDate(input).getTime();
}

/* =====================================================
🔥 SAFE
===================================================== */
function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

function safeDate(input, fallback = new Date()) {
  const d = toDate(input);
  return isValidDate(d) ? d : fallback;
}

/* =====================================================
🔥 FORMAT
===================================================== */
function pad(n) {
  return String(n).padStart(2, "0");
}

function format(date = new Date(), type = "YYYY-MM-DD HH:mm:ss") {
  const d = safeDate(date);

  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  switch (type) {
    case "date":
    case "YYYY-MM-DD":
      return `${YYYY}-${MM}-${DD}`;

    case "time":
    case "HH:mm:ss":
      return `${HH}:${mm}:${ss}`;

    case "iso":
      return d.toISOString();

    case "full":
    case "YYYY-MM-DD HH:mm:ss":
    default:
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
  }
}

/* =====================================================
🔥 START / END
===================================================== */
function startOfDay(date) {
  const d = safeDate(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = safeDate(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date) {
  const d = safeDate(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(date) {
  const d = safeDate(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfWeek(date, start = 1) {
  const d = safeDate(date);
  const day = d.getDay();
  const diff = (day < start ? 7 : 0) + day - start;
  return startOfDay(new Date(d.setDate(d.getDate() - diff)));
}

function endOfWeek(date, start = 1) {
  const startDay = startOfWeek(date, start);
  return endOfDay(new Date(startDay.getTime() + 6 * 86400000));
}

/* =====================================================
🔥 RANGE
===================================================== */
function todayRange() {
  return {
    start: startOfDay(),
    end: endOfDay()
  };
}

function yesterdayRange() {
  const d = new Date(now() - 86400000);
  return {
    start: startOfDay(d),
    end: endOfDay(d)
  };
}

function weekRange() {
  return {
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date())
  };
}

function monthRange() {
  return {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  };
}

function rangeBetween(start, end) {
  return {
    start: startOfDay(start),
    end: endOfDay(end)
  };
}

/* =====================================================
🔥 ADD / SUBTRACT
===================================================== */
function addDays(date, days = 0) {
  const d = safeDate(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addHours(date, hours = 0) {
  const d = safeDate(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function addMinutes(date, minutes = 0) {
  const d = safeDate(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function addSeconds(date, sec = 0) {
  const d = safeDate(date);
  d.setSeconds(d.getSeconds() + sec);
  return d;
}

/* =====================================================
🔥 DIFF
===================================================== */
function diffMs(a, b) {
  return toTimestamp(a) - toTimestamp(b);
}

function diffSec(a, b) {
  return Math.floor(diffMs(a, b) / 1000);
}

function diffMin(a, b) {
  return Math.floor(diffMs(a, b) / 60000);
}

function diffHour(a, b) {
  return Math.floor(diffMs(a, b) / 3600000);
}

function diffDay(a, b) {
  return Math.floor(diffMs(a, b) / 86400000);
}

/* =====================================================
🔥 COMPARE
===================================================== */
function isBefore(a, b) {
  return toTimestamp(a) < toTimestamp(b);
}

function isAfter(a, b) {
  return toTimestamp(a) > toTimestamp(b);
}

function isSameDay(a, b) {
  return format(a, "YYYY-MM-DD") === format(b, "YYYY-MM-DD");
}

function isBetween(target, start, end) {
  const t = toTimestamp(target);
  return t >= toTimestamp(start) && t <= toTimestamp(end);
}

/* =====================================================
🔥 TTL / EXPIRE
===================================================== */
function expiresIn(ms = 0) {
  return new Date(now() + ms);
}

function ttlSeconds(date) {
  return Math.max(0, Math.floor((toTimestamp(date) - now()) / 1000));
}

function isExpired(date) {
  return now() > toTimestamp(date);
}

/* =====================================================
🔥 HUMANIZE
===================================================== */
function fromNow(date) {
  const diff = now() - toTimestamp(date);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}h ago`;

  const day = Math.floor(hour / 24);
  return `${day}d ago`;
}

/* =====================================================
🔥 SCHEDULE
===================================================== */
function nextMinute() {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  return d;
}

function nextHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function nextDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

/* =====================================================
🔥 BUCKET (통계용)
===================================================== */
function groupByDay(dates = []) {
  const map = {};

  for (const d of dates) {
    const key = format(d, "YYYY-MM-DD");
    map[key] = (map[key] || 0) + 1;
  }

  return map;
}

/* =====================================================
🔥 DEBUG
===================================================== */
function debugNow() {
  return {
    now: now(),
    iso: new Date().toISOString(),
    local: format(),
    tz: DEFAULT_TZ
  };
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 DATE UTIL READY");

module.exports = {
  now,
  nowDate,
  toDate,
  toTimestamp,

  isValidDate,
  safeDate,

  format,

  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,

  todayRange,
  yesterdayRange,
  weekRange,
  monthRange,
  rangeBetween,

  addDays,
  addHours,
  addMinutes,
  addSeconds,

  diffMs,
  diffSec,
  diffMin,
  diffHour,
  diffDay,

  isBefore,
  isAfter,
  isSameDay,
  isBetween,

  expiresIn,
  ttlSeconds,
  isExpired,

  fromNow,

  nextMinute,
  nextHour,
  nextDay,

  groupByDay,

  debugNow
};