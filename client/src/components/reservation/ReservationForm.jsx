"use strict";

import React, { useEffect, useState } from "react";
import reservationApi from "../../services/reservation.api";
import ReservationSlotPicker from "./ReservationSlotPicker";

/**
 * =====================================================
 * 🔥 RESERVATION FORM (ULTRA FINAL COMPLETE)
 * ✔ 예약 생성 폼
 * ✔ create / createTx 지원
 * ✔ 슬롯 선택 연동
 * ✔ 입력 검증
 * ✔ 에러 / 로딩 처리
 * ✔ 기존 구조 100% 유지
 * ✔ UI 블랙 + 골드
 * ✔ 단일 파일 완성형
 * ✔ 최소 수정만 적용
 * ✔ invalid payload 방지
 * ✔ 숫자 안정화
 * ✔ trim 처리 추가
 * =====================================================
 */

function ReservationForm({ onCreated = null }) {
  /* =========================
  🔥 초기값
  ========================= */
  const params = new URLSearchParams(window.location.search);

  const [shopId, setShopId] = useState(params.get("shopId") || "");
  const [date, setDate] = useState(params.get("date") || "");
  const [time, setTime] = useState("");
  const [people, setPeople] = useState(1);
  const [serviceType, setServiceType] = useState("");
  const [memo, setMemo] = useState("");
  const [price, setPrice] = useState(Number(params.get("price") || 0));
  const [useTx, setUseTx] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================
  🔥 날짜 기본값
  ========================= */
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
    }
  }, [date]);

  /* =========================
  🔥 제출
  ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const safeShopId = String(shopId || "").trim();
    const safeDate = String(date || "").trim();
    const safeTime = String(time || "").trim();
    const safeServiceType = String(serviceType || "").trim();
    const safeMemo = String(memo || "").trim();

    const safePeople = Math.max(1, Number(people || 1));
    const safePrice = Math.max(0, Number(price || 0));

    if (!safeShopId) {
      setError("shopId 필요");
      return;
    }

    if (!safeDate) {
      setError("날짜 필요");
      return;
    }

    if (!safeTime) {
      setError("시간 선택 필요");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        shopId: safeShopId,
        date: safeDate,
        time: safeTime,
        people: safePeople,
        serviceType: safeServiceType,
        memo: safeMemo,
        price: safePrice,
      };

      const res = useTx
        ? await reservationApi.createTx(payload)
        : await reservationApi.create(payload);

      if (typeof onCreated === "function") {
        onCreated(res);
      }

      alert("예약 생성 완료");

      /* 초기화 */
      setTime("");
      setMemo("");
      setServiceType("");
      setPeople(1);

    } catch (e) {
      setError(
        e?.response?.data?.message ||
        e?.message ||
        "예약 생성 실패"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
  🔥 UI
  ========================= */
  return (
    <form style={styles.wrap} onSubmit={handleSubmit}>
      <h3 style={styles.title}>예약 정보 입력</h3>

      {error && <div style={styles.error}>{error}</div>}

      <label style={styles.label}>매장 ID</label>
      <input
        value={shopId}
        onChange={(e) => setShopId(e.target.value)}
        style={styles.input}
      />

      <label style={styles.label}>날짜</label>
      <input
        type="date"
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          setTime("");
        }}
        style={styles.input}
      />

      <ReservationSlotPicker
        shopId={shopId}
        date={date}
        value={time}
        onChange={setTime}
      />

      <label style={styles.label}>서비스</label>
      <input
        value={serviceType}
        onChange={(e) => setServiceType(e.target.value)}
        placeholder="예: 아로마 마사지"
        style={styles.input}
      />

      <label style={styles.label}>인원</label>
      <input
        type="number"
        min="1"
        value={people}
        onChange={(e) => setPeople(e.target.value)}
        style={styles.input}
      />

      <label style={styles.label}>금액</label>
      <input
        type="number"
        min="0"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        style={styles.input}
      />

      <label style={styles.label}>메모</label>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        style={styles.textarea}
      />

      <label style={styles.check}>
        <input
          type="checkbox"
          checked={useTx}
          onChange={(e) => setUseTx(e.target.checked)}
        />
        트랜잭션 예약 사용
      </label>

      <button type="submit" disabled={loading} style={styles.button}>
        {loading ? "예약중..." : "예약하기"}
      </button>
    </form>
  );
}

/* =========================
🔥 스타일
========================= */
const styles = {
  wrap: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 12,
    padding: 16,
    display: "grid",
    gap: 10,
  },
  title: {
    color: "#d4af37",
    marginBottom: 10,
  },
  label: {
    color: "#d4af37",
    fontWeight: "bold",
  },
  input: {
    padding: 10,
    background: "#000",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: 8,
  },
  textarea: {
    minHeight: 80,
    padding: 10,
    background: "#000",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: 8,
  },
  check: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    color: "#fff",
  },
  button: {
    marginTop: 10,
    padding: "12px",
    background: "#d4af37",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
  error: {
    padding: 10,
    color: "#ff6b6b",
    background: "#220000",
    borderRadius: 8,
  },
};

export default ReservationForm;