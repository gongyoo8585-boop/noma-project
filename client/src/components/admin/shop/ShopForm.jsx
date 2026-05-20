"use strict";

import React, { useEffect, useState } from "react";
import Loading from "../../common/Loading";
import ErrorMessage from "../../common/ErrorMessage";
import EmptyState from "../../common/EmptyState";

function ShopForm({
  initialData = {},
  loading = false,
  error = "",
  saving = false,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(getEmptyForm());

  useEffect(() => {
    if (!initialData) {
      return;
    }

    const premiumValue =
      initialData.premium === true ||
      initialData.isPremium === true;

    setForm({
      ...getEmptyForm(),
      ...initialData,

      tags: Array.isArray(initialData.tags)
        ? initialData.tags.join(", ")
        : initialData.tags || "",

      serviceTypes: Array.isArray(initialData.serviceTypes)
        ? initialData.serviceTypes.join(", ")
        : initialData.serviceTypes || "",

      courses: Array.isArray(initialData.courses)
        ? initialData.courses.join(", ")
        : initialData.courses || "",

      price: Array.isArray(initialData.price)
        ? initialData.price.join(", ")
        : initialData.price || "",

      images: Array.isArray(initialData.images)
        ? initialData.images.join("\n")
        : initialData.images || "",

      virtualPhone:
        initialData.virtualPhone ||
        initialData.fakePhone ||
        initialData.callNumber ||
        "",

      businessHours:
        initialData.businessHours ||
        initialData.openingHours ||
        initialData.hours ||
        "",

      visible: initialData.visible !== false,

      approved: initialData.approved !== false,

      premium: premiumValue,

      isPremium: premiumValue,

      isReservable: initialData.isReservable !== false,

      status:
        initialData.status === "inactive"
          ? "inactive"
          : "active",
    });
  }, [initialData]);

  function getEmptyForm() {
    return {
      name: "",
      region: "",
      district: "",
      address: "",
      detailAddress: "",
      phone: "",
      virtualPhone: "",
      businessHours: "",
      lat: "",
      lng: "",
      description: "",
      tags: "",
      serviceTypes: "",
      courses: "",
      price: "",
      images: "",
      status: "active",
      visible: true,
      approved: true,
      premium: false,
      isPremium: false,
      isReservable: true,
    };
  }

  const update = (key, value) => {
    setForm((prev) => {
      if (key === "premium" || key === "isPremium") {
        return {
          ...prev,
          premium: value,
          isPremium: value,
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const normalizeArray = (value) => {
    return String(value || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const normalizeImages = (value) => {
    return String(value || "")
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const normalizePriceArray = (value) => {
    return String(value || "")
      .split(",")
      .map((v) =>
        Number(
          String(v)
            .replaceAll(",", "")
            .replaceAll("원", "")
            .trim()
        )
      )
      .filter((v) => Number.isFinite(v));
  };

  const submit = (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("상호명을 입력하세요.");
      return;
    }

    if (!form.address.trim()) {
      alert("주소를 입력하세요.");
      return;
    }

    const premiumValue =
      form.premium === true ||
      form.isPremium === true;

    const payload = {
      ...form,

      lat: Number(form.lat || 0),

      lng: Number(form.lng || 0),

      tags: normalizeArray(form.tags),

      serviceTypes: normalizeArray(form.serviceTypes),

      courses: normalizeArray(form.courses),

      price: normalizePriceArray(form.price),

      images: normalizeImages(form.images),

      premium: premiumValue,

      isPremium: premiumValue,

      status:
        form.status === "inactive"
          ? "inactive"
          : "active",
    };

    if (onSubmit) {
      onSubmit(payload);
    }
  };

  if (loading) {
    return <Loading message="매장 정보 불러오는 중..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!form) {
    return <EmptyState message="매장 데이터가 없습니다." />;
  }

  return (
    <form onSubmit={submit} style={styles.container}>
      <div style={styles.grid}>
        <FormInput
          label="상호명"
          value={form.name}
          onChange={(v) => update("name", v)}
        />

        <FormInput
          label="지역"
          value={form.region}
          onChange={(v) => update("region", v)}
        />

        <FormInput
          label="구 / 동"
          value={form.district}
          onChange={(v) => update("district", v)}
        />

        <FormInput
          label="전화번호"
          value={form.phone}
          onChange={(v) => update("phone", v)}
        />

        <FormInput
          label="가상번호"
          value={form.virtualPhone}
          onChange={(v) => update("virtualPhone", v)}
        />

        <FormInput
          label="영업시간"
          value={form.businessHours}
          onChange={(v) => update("businessHours", v)}
        />

        <FormInput
          label="위도"
          value={form.lat}
          onChange={(v) => update("lat", v)}
        />

        <FormInput
          label="경도"
          value={form.lng}
          onChange={(v) => update("lng", v)}
        />
      </div>

      <FormInput
        label="주소"
        value={form.address}
        onChange={(v) => update("address", v)}
      />

      <FormInput
        label="상세주소"
        value={form.detailAddress}
        onChange={(v) => update("detailAddress", v)}
      />

      <TextArea
        label="설명"
        value={form.description}
        onChange={(v) => update("description", v)}
      />

      <FormInput
        label="태그 (쉼표 구분)"
        value={form.tags}
        onChange={(v) => update("tags", v)}
      />

      <FormInput
        label="서비스 타입 (쉼표 구분)"
        value={form.serviceTypes}
        onChange={(v) => update("serviceTypes", v)}
      />

      <FormInput
        label="코스명 (쉼표 구분)"
        value={form.courses}
        onChange={(v) => update("courses", v)}
      />

      <FormInput
        label="코스 가격 (쉼표 구분)"
        value={form.price}
        onChange={(v) => update("price", v)}
      />

      <TextArea
        label="이미지 URL (줄바꿈 구분)"
        value={form.images}
        onChange={(v) => update("images", v)}
        rows={5}
      />

      <label style={styles.label}>
        상태

        <select
          value={form.status}
          onChange={(e) => update("status", e.target.value)}
          style={styles.input}
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </label>

      <div style={styles.checkWrap}>
        <CheckRow
          label="노출"
          checked={form.visible}
          onChange={(v) => update("visible", v)}
        />

        <CheckRow
          label="승인"
          checked={form.approved}
          onChange={(v) => update("approved", v)}
        />

        <CheckRow
          label={form.premium ? "PREMIUM 활성화" : "PREMIUM 비활성"}
          checked={form.premium}
          onChange={(v) => update("premium", v)}
          premium
        />

        <CheckRow
          label="예약 가능"
          checked={form.isReservable}
          onChange={(v) => update("isReservable", v)}
        />
      </div>

      <div style={styles.buttonRow}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={styles.cancelBtn}>
            취소
          </button>
        )}

        <button type="submit" style={styles.submitBtn} disabled={saving}>
          {saving ? "저장중..." : "저장"}
        </button>
      </div>
    </form>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}) {
  return (
    <label style={styles.label}>
      {label}

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}) {
  return (
    <label style={styles.label}>
      {label}

      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...styles.input,
          resize: "vertical",
          minHeight: 120,
        }}
      />
    </label>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
  premium = false,
}) {
  return (
    <label
      style={{
        ...styles.checkRow,
        ...(premium && checked ? styles.premiumActiveRow : null),
      }}
    >
      <span style={premium ? styles.premiumText : null}>{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={premium ? styles.premiumCheckbox : null}
      />
    </label>
  );
}

const styles = {
  container: {
    background: "#000",
    border: "1px solid #222",
    borderRadius: 16,
    padding: 24,
    color: "#fff",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },

  label: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 14,
    color: "#d4af37",
    fontSize: 14,
    fontWeight: 600,
  },

  input: {
    width: "100%",
    background: "#111",
    border: "1px solid #333",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    marginTop: 6,
    outline: "none",
    boxSizing: "border-box",
  },

  checkWrap: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 10,
  },

  checkRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#111",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#fff",
  },

  premiumActiveRow: {
    border: "1px solid rgba(255,0,110,0.72)",
    background: "rgba(255,0,110,0.12)",
    boxShadow: "0 0 12px rgba(255,0,110,0.28)",
  },

  premiumText: {
    color: "#ff4fa3",
    fontWeight: 900,
  },

  premiumCheckbox: {
    accentColor: "#ff006e",
  },

  buttonRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },

  submitBtn: {
    background: "#d4af37",
    color: "#000",
    border: "none",
    borderRadius: 10,
    padding: "12px 22px",
    cursor: "pointer",
    fontWeight: 700,
  },

  cancelBtn: {
    background: "#222",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 10,
    padding: "12px 22px",
    cursor: "pointer",
  },
};

export default ShopForm;