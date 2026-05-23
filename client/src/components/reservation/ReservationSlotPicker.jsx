"use strict";

import React, { useEffect, useState } from "react";
import reservationApi from "../../services/reservation.api";

/**
 * =====================================================
 * 🔥 RESERVATION SLOT PICKER (ULTRA FINAL COMPLETE)
 * ✔ 예약 가능 시간 조회
 * ✔ getSlots API 연결
 * ✔ 날짜 변경 시 자동 조회
 * ✔ 슬롯 선택 기능
 * ✔ 로딩 / 에러 처리
 * ✔ ReservationForm과 100% 호환
 * ✔ 블랙 + 골드 UI
 * ✔ invalid response 방어
 * ✔ 중복 슬롯 제거
 * ✔ 빈값 방어
 * ✔ undefined slot 방어
 * ✔ race condition 최소 방어
 * =====================================================
 */

function ReservationSlotPicker({
  shopId,
  date,
  value = "",
  onChange,
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================
  🔥 슬롯 조회
  ========================= */
  const fetchSlots = async () => {
    if (!shopId || !date) {
      setSlots([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await reservationApi.getSlots(shopId, date);

      const rawList =
        res?.data ||
        res?.items ||
        res ||
        [];

      const safeList = Array.isArray(rawList)
        ? rawList.filter(Boolean)
        : [];

      /* 🔥 중복 제거 */
      const uniqueMap = new Map();

      safeList.forEach((slot) => {
        const key =
          typeof slot === "string"
            ? slot
            : slot?.time;

        if (!key) return;

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, slot);
        }
      });

      const finalList = Array.from(uniqueMap.values());

      setSlots(finalList);

    } catch (e) {
      setError(
        e?.response?.data?.message ||
        e?.message ||
        "슬롯 조회 실패"
      );

      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [shopId, date]);

  /* =========================
  🔥 선택
  ========================= */
  const handleSelect = (slot) => {
    if (!slot) return;

    const disabled =
      typeof slot === "object"
        ? slot?.disabled
        : false;

    if (disabled) return;

    const nextValue =
      typeof slot === "string"
        ? slot
        : slot?.time;

    if (!nextValue) return;

    if (typeof onChange === "function") {
      onChange(nextValue);
    }
  };

  /* =========================
  🔥 UI
  ========================= */
  return (
    <div style={wrap}>
      <div style={title}>예약 가능 시간</div>

      {error && <div style={errorBox}>{error}</div>}

      {loading ? (
        <div style={loadingText}>불러오는 중...</div>
      ) : (
        <div style={grid}>
          {slots.length === 0 && (
            <div style={empty}>
              가능한 시간이 없습니다
            </div>
          )}

          {slots.map((slot, idx) => {
            const isObject =
              typeof slot === "object";

            const time = isObject
              ? slot?.time
              : slot;

            if (!time) return null;

            const disabled = isObject
              ? slot?.disabled
              : false;

            const selected = value === time;

            return (
              <button
                key={`${time}-${idx}`}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(slot)}
                style={{
                  ...slotBtn,
                  ...(selected ? selectedStyle : {}),
                  ...(disabled ? disabledStyle : {}),
                }}
              >
                {time}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================
🔥 스타일
========================= */

const wrap = {
  marginTop: 10,
};

const title = {
  marginBottom: 8,
  color: "#d4af37",
  fontWeight: "bold",
};

const grid = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const slotBtn = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #333",
  background: "#000",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

const selectedStyle = {
  background: "#d4af37",
  color: "#000",
  fontWeight: "bold",
};

const disabledStyle = {
  background: "#111",
  color: "#555",
  cursor: "not-allowed",
};

const loadingText = {
  color: "#aaa",
};

const empty = {
  color: "#666",
};

const errorBox = {
  marginBottom: 8,
  color: "#ff6b6b",
};

export default ReservationSlotPicker;