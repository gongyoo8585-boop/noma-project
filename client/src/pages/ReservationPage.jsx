"use strict";

import React, { useEffect, useMemo, useState } from "react";
import shopApi from "../services/shop.api";
import reservationApi from "../services/reservation.api";

/**
 * =====================================================
 * 🔥 RESERVATION PAGE (ULTRA FINAL)
 * ✔ 매장 상세 → 예약 생성 → 결제 이동
 * ✔ 슬롯 기반 예약 (동시성 대응)
 * ✔ UX 개선 (선택 강조 / 다크테마)
 * ✔ 에러 / 로딩 / 상태 강화
 * ✔ 기존 기능 100% 유지 + 확장
 * =====================================================
 */

function ReservationPage({ navigate }) {
  const params = new URLSearchParams(window.location.search);
  const shopId = params.get("shopId");

  const [shop, setShop] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [memo, setMemo] = useState("");
  const [people, setPeople] = useState(1);

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const today = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  /* =========================
  🔥 매장 로드
  ========================= */
  useEffect(() => {
    if (!shopId) {
      setError("매장 정보가 없습니다.");
      return;
    }

    loadShop();
  }, [shopId]);

  /* =========================
  🔥 슬롯 로드
  ========================= */
  useEffect(() => {
    if (shopId && date) {
      loadSlots();
    }
  }, [shopId, date]);

  const loadShop = async () => {
    try {
      setLoading(true);
      const res = await shopApi.getDetail(shopId);
      const data = res.shop || res.item || res.data || null;

      setShop(data);

      if (data?.serviceTypes?.length > 0) {
        setServiceType(data.serviceTypes[0]);
      }
    } catch (e) {
      setError("매장 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async () => {
    try {
      const res = await reservationApi.getSlots(shopId, date);
      setSlots(res.slots || res.items || []);
    } catch (e) {
      setSlots([]);
    }
  };

  /* =========================
  🔥 검증
  ========================= */
  const validate = () => {
    if (!shopId) return "매장 정보 없음";
    if (!date) return "날짜 선택 필요";
    if (!time) return "시간 선택 필요";
    if (!serviceType) return "서비스 선택 필요";
    if (people < 1) return "인원 오류";
    return "";
  };

  /* =========================
  🔥 예약 생성
  ========================= */
  const handleSubmit = async () => {
    const msg = validate();

    if (msg) {
      alert(msg);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        shopId,
        date,
        time,
        serviceType,
        memo,
        people,
      };

      const res = await reservationApi.create(payload);
      const reservation = res.reservation || res.item || res.data;

      if (!reservation?._id) {
        alert("예약 실패 (ID 없음)");
        return;
      }

      navigate(`/payment?reservationId=${reservation._id}`);
    } catch (e) {
      alert(e.message || "예약 실패");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
  🔥 UI 상태
  ========================= */
  if (loading) {
    return <div style={{ padding: 20 }}>예약 페이지 로딩중...</div>;
  }

  if (error) {
    return <div style={{ padding: 20, color: "red" }}>{error}</div>;
  }

  /* =========================
  🔥 UI
  ========================= */
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 20,
        background: "#000",
        color: "#d4af37",
        minHeight: "100vh",
      }}
    >
      <h2>예약하기</h2>

      {/* 매장 */}
      {shop && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>{shop.name}</h3>
          <p style={subText}>{shop.address}</p>
          <p style={subText}>{shop.phone || "전화 없음"}</p>
        </div>
      )}

      <div style={{ display: "grid", gap: 15 }}>
        {/* 날짜 */}
        <label>
          <strong>날짜</strong>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime("");
            }}
            style={inputStyle}
          />
        </label>

        {/* 시간 */}
        <label>
          <strong>시간</strong>

          {slots.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {slots.map((slot) => {
                const value = slot.time || slot.startTime || slot;
                const disabled = slot.available === false || slot.isBooked;

                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setTime(value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border:
                        time === value ? "2px solid #d4af37" : "1px solid #333",
                      background: disabled
                        ? "#222"
                        : time === value
                        ? "#111"
                        : "#000",
                      color: "#d4af37",
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={inputStyle}
            />
          )}
        </label>

        {/* 서비스 */}
        <label>
          <strong>서비스</strong>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            style={inputStyle}
          >
            {(shop?.serviceTypes?.length
              ? shop.serviceTypes
              : ["기본 마사지"]
            ).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        {/* 인원 */}
        <label>
          <strong>인원</strong>
          <input
            type="number"
            min="1"
            max="10"
            value={people}
            onChange={(e) => setPeople(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        {/* 메모 */}
        <label>
          <strong>요청사항</strong>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>

        {/* 버튼 */}
        <button
          disabled={submitting}
          onClick={handleSubmit}
          style={{
            padding: 15,
            border: "none",
            borderRadius: 10,
            background: submitting ? "#555" : "#d4af37",
            color: "#000",
            fontSize: 16,
            fontWeight: "bold",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "예약 중..." : "예약하고 결제하기"}
        </button>
      </div>
    </div>
  );
}

/* =========================
스타일
========================= */
const inputStyle = {
  width: "100%",
  marginTop: 8,
  padding: 12,
  border: "1px solid #333",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
};

const cardStyle = {
  padding: 15,
  border: "1px solid #333",
  borderRadius: 12,
  marginBottom: 20,
  background: "#000",
};

const subText = {
  margin: "6px 0",
  color: "#888",
};

export default ReservationPage;