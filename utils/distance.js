/* ========================= */
/* 🔥 기존 코드 유지 */
/* ========================= */
function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;

  /* 🔥 수정: 안전 변환 */
  lat1 = safeNumber(lat1, NaN);
  lng1 = safeNumber(lng1, NaN);
  lat2 = safeNumber(lat2, NaN);
  lng2 = safeNumber(lng2, NaN);

  if (!isValidCoord(lat1, lng1) || !isValidCoord(lat2, lng2)) {
    return 9999;
  }

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const result = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (!isFinite(result)) return 9999;

  return result;
}

/* ========================= */
function calcDistanceMeter(lat1, lng1, lat2, lng2) {
  return calcDistanceKm(lat1, lng1, lat2, lng2) * 1000;
}

/* ========================= */
function formatDistance(distanceKm) {
  const d = safeNumber(distanceKm, 0);

  if (d < 1) return `${Math.round(d * 1000)}m`;

  return `${d.toFixed(2)}km`;
}

/* ========================= */
function calcDistanceScore(distanceKm) {
  const d = safeNumber(distanceKm);

  if (d < 1) return 100;
  if (d < 3) return 70;
  if (d < 5) return 40;
  if (d < 10) return 10;

  return 0;
}

/* ========================= */
function isValidCoord(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/* ========================= */
function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

/* ========================= */
function clamp(value, min, max) {
  value = safeNumber(value);

  /* 🔥 수정: min/max 역전 방지 */
  if (min > max) [min, max] = [max, min];

  return Math.min(Math.max(value, min), max);
}

/* ========================= */
function normalizeDistance(distanceKm, maxKm = 10) {
  if (!maxKm) return 0;

  const d = safeNumber(distanceKm, maxKm);
  return clamp(1 - d / maxKm, 0, 1);
}

/* ========================= */
function calcDistanceWeight(distanceKm) {
  const norm = normalizeDistance(distanceKm, 10);
  return Math.round(norm * 100);
}

/* ========================= */
function isWithinDistance(distanceKm, maxKm = 5) {
  const d = safeNumber(distanceKm, 9999);
  return d <= maxKm;
}

/* ========================= */
function getDistanceLevel(distanceKm) {
  const d = safeNumber(distanceKm);

  if (d < 1) return "very-near";
  if (d < 3) return "near";
  if (d < 5) return "mid";
  if (d < 10) return "far";

  return "very-far";
}

/* ========================= */
function sortByDistance(items = []) {
  return [...items].sort((a, b) => {
    return safeNumber(a.distanceKm, 9999) - safeNumber(b.distanceKm, 9999);
  });
}

/* ========================= */
function getAverageDistance(items = []) {
  if (!items.length) return 0;

  const sum = items.reduce((acc, i) => {
    return acc + safeNumber(i.distanceKm, 0);
  }, 0);

  return sum / items.length;
}

/* ===================================================== */
/* 🔥🔥🔥 추가 기능 10개 */
/* ===================================================== */

// 13️⃣ 거리 디버그
function debugDistance(lat1, lng1, lat2, lng2){
  console.log("DIST:", calcDistanceKm(lat1,lng1,lat2,lng2));
}

// 14️⃣ 거리 비교
function compareDistance(a,b){
  return safeNumber(a) - safeNumber(b);
}

// 15️⃣ 거리 필터
function filterByDistance(items=[], maxKm=5){
  return items.filter(i=>isWithinDistance(i.distanceKm,maxKm));
}

// 16️⃣ bounding box
function getBoundingBox(lat, lng, km=5){
  const d = km / 111;
  return {
    minLat: lat - d,
    maxLat: lat + d,
    minLng: lng - d,
    maxLng: lng + d
  };
}

// 17️⃣ 거리 배열 계산
function calcDistanceList(origin, points=[]){
  return points.map(p=>({
    ...p,
    distanceKm: calcDistanceKm(origin.lat, origin.lng, p.lat, p.lng)
  }));
}

// 18️⃣ nearest 찾기
function findNearest(origin, items=[]){
  return sortByDistance(calcDistanceList(origin,items))[0] || null;
}

// 19️⃣ percentile
function getDistancePercentile(items=[]){
  const sorted = sortByDistance(items);
  const mid = Math.floor(sorted.length/2);
  return sorted[mid]?.distanceKm || 0;
}

// 20️⃣ 그룹 카운트
function getDistanceStats(items=[]){
  const stats = { near:0, mid:0, far:0 };

  items.forEach(i=>{
    const level = getDistanceLevel(i.distanceKm);
    if(level.includes("near")) stats.near++;
    else if(level==="mid") stats.mid++;
    else stats.far++;
  });

  return stats;
}

// 21️⃣ 추천 점수
function calcRecommendScore(item){
  return (
    calcDistanceWeight(item.distanceKm) +
    safeNumber(item.likeCount)*2 +
    safeNumber(item.ratingAvg)*10
  );
}

// 22️⃣ 캐시 (간단)
let distanceCache = {};
function cacheDistance(key, value){
  distanceCache[key]=value;
}
function getCachedDistance(key){
  return distanceCache[key];
}

/* ========================= */
module.exports = {
  calcDistanceKm,
  calcDistanceMeter,
  formatDistance,
  calcDistanceScore,
  isValidCoord,

  safeNumber,
  clamp,
  normalizeDistance,
  calcDistanceWeight,

  isWithinDistance,
  getDistanceLevel,
  sortByDistance,
  getAverageDistance,

  /* 🔥 추가 */
  debugDistance,
  compareDistance,
  filterByDistance,
  getBoundingBox,
  calcDistanceList,
  findNearest,
  getDistancePercentile,
  getDistanceStats,
  calcRecommendScore,
  cacheDistance,
  getCachedDistance
};