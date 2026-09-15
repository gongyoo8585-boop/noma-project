"use strict";

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import shopApi from "../../services/shop.api";
import jobApi from "../../services/job.api";
import AdminLayout from "../../components/admin/AdminLayout";

const GOLD = "#d4af37";

const INITIAL_FORM = {
  shopId: "",
  title: "",
  payType: "negotiable",
  payMin: "",
  payMax: "",
  payText: "협의",
  workTime: "",
  workDays: "",
  conditions: "",
  beginnerAllowed: false,
  lodgingProvided: false,
  urgent: false,
  recommended: false,
  tier: "normal",
  premiumStartAt: "",
  premiumEndAt: "",
  status: "recruiting",
  contactPhone: "",
};

function getEffectiveServiceType(propValue, pathname) {
  if (propValue === "karaoke" || propValue === "massage") {
    return propValue;
  }

  return String(pathname || "").startsWith("/admin/karaoke")
    ? "karaoke"
    : "massage";
}

function extractShopList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.shops)) return response.shops;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.list)) return response.list;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.shops)) return response.data.shops;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.list)) return response.data.list;
  return [];
}

function getShopId(shop = {}) {
  return String(shop?._id || shop?.id || shop?.shopId || "").trim();
}

function getShopName(shop = {}) {
  return String(shop?.name || shop?.shopName || shop?.title || "업체명 없음").trim();
}

function getShopPhone(shop = {}) {
  return String(
    shop?.virtualPhone || shop?.phone || shop?.phoneNumber || shop?.tel || ""
  ).trim();
}

function getShopAddress(shop = {}) {
  return String(
    shop?.roadAddress || shop?.address || shop?.fullAddress || shop?.locationText || ""
  ).trim();
}

function toDatetimeLocal(value) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function AdminJobFormPage({ serviceType = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const effectiveServiceType = getEffectiveServiceType(
    serviceType,
    location.pathname
  );
  const isKaraoke = effectiveServiceType === "karaoke";
  const basePath = isKaraoke ? "/admin/karaoke/jobs" : "/admin/jobs";
  const jobId = params.jobId || "";
  const isEdit = !!jobId;

  const [shops, setShops] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const shopPromise = shopApi.getList({
          category: effectiveServiceType,
          shopCategory: effectiveServiceType,
          serviceType: effectiveServiceType,
          businessType: effectiveServiceType,
          adminCategory: effectiveServiceType,
          admin: true,
          adminMode: true,
          adminList: true,
          forAdmin: true,
          management: true,
        });

        const [shopResult, jobResult] = await Promise.all([
          shopPromise,
          isEdit ? jobApi.adminGetDetail(jobId) : Promise.resolve(null),
        ]);

        if (!mounted) return;

        const nextShops = extractShopList(shopResult)
          .filter(Boolean)
          .filter((shop, index, array) => {
            const id = getShopId(shop);
            return id && array.findIndex((item) => getShopId(item) === id) === index;
          });

        setShops(nextShops);

        if (isEdit) {
          const job = jobResult?.job || jobResult?.data?.job || null;

          if (!job) {
            throw new Error("수정할 채용공고를 찾을 수 없습니다.");
          }

          setForm({
            shopId: String(job.shopId || ""),
            title: String(job.title || ""),
            payType: String(job.payType || "negotiable"),
            payMin: Number(job.payMin || 0) > 0 ? String(job.payMin) : "",
            payMax: Number(job.payMax || 0) > 0 ? String(job.payMax) : "",
            payText: String(job.payText || "협의"),
            workTime: String(job.workTime || ""),
            workDays: String(job.workDays || ""),
            conditions: String(job.conditions || ""),
            beginnerAllowed: job.beginnerAllowed === true,
            lodgingProvided: job.lodgingProvided === true,
            urgent: job.urgent === true,
            recommended: job.recommended === true,
            tier: job.tier === "premium" ? "premium" : "normal",
            premiumStartAt: toDatetimeLocal(job.premiumStartAt),
            premiumEndAt: toDatetimeLocal(job.premiumEndAt),
            status: String(job.status || "recruiting"),
            contactPhone: String(job.contactPhone || ""),
          });
        }
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError?.message || "채용공고 등록 정보를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [effectiveServiceType, isEdit, jobId]);

  const selectedShop = useMemo(
    () => shops.find((shop) => getShopId(shop) === String(form.shopId || "")) || null,
    [shops, form.shopId]
  );

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleShopChange = (value) => {
    const shop = shops.find((item) => getShopId(item) === value) || null;

    setForm((prev) => ({
      ...prev,
      shopId: value,
      contactPhone: getShopPhone(shop) || prev.contactPhone,
    }));
  };

  const handleTierChange = (value) => {
    setForm((prev) => ({
      ...prev,
      tier: value,
      premiumStartAt: value === "premium" ? prev.premiumStartAt : "",
      premiumEndAt: value === "premium" ? prev.premiumEndAt : "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.shopId) {
      setError("NORA에 등록된 업체를 선택해주세요.");
      return;
    }

    if (!String(form.title || "").trim()) {
      setError("채용 제목을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        shopId: form.shopId,
        serviceType: effectiveServiceType,
        title: String(form.title || "").trim(),
        payType: form.payType,
        payMin: form.payMin ? Number(form.payMin) : 0,
        payMax: form.payMax ? Number(form.payMax) : 0,
        payText: String(form.payText || "").trim() || "협의",
        workTime: String(form.workTime || "").trim(),
        workDays: String(form.workDays || "").trim(),
        conditions: String(form.conditions || "").trim(),
        beginnerAllowed: form.beginnerAllowed === true,
        lodgingProvided: form.lodgingProvided === true,
        urgent: form.urgent === true,
        recommended: form.recommended === true,
        tier: form.tier,
        premiumStartAt: form.tier === "premium" ? form.premiumStartAt || null : null,
        premiumEndAt: form.tier === "premium" ? form.premiumEndAt || null : null,
        status: form.status,
        contactPhone: String(form.contactPhone || "").trim(),
      };

      if (isEdit) {
        await jobApi.adminUpdate(jobId, payload);
      } else {
        await jobApi.adminCreate(payload);
      }

      navigate(basePath);
    } catch (saveError) {
      setError(saveError?.message || "채용공고 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title={isEdit ? "채용공고 수정" : "채용공고 등록"}>
      <div style={styles.page}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>{isEdit ? "채용공고 수정" : "채용공고 등록"}</h1>
            <p style={styles.subTitle}>
              {isKaraoke ? "가라오케" : "마사지"} NORA 등록 업체를 선택해 채용정보를 관리합니다.
            </p>
          </div>
          <button type="button" onClick={() => navigate(basePath)} style={styles.cancelTopButton}>
            목록으로
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading ? (
          <div style={styles.stateBox}>등록 정보를 불러오는 중...</div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>업체 선택</h2>

              <label style={styles.label}>
                NORA 등록 업체 <span style={styles.required}>*</span>
                <select
                  value={form.shopId}
                  onChange={(event) => handleShopChange(event.target.value)}
                  style={styles.input}
                  required
                >
                  <option value="">업체를 선택하세요</option>
                  {shops.map((shop) => (
                    <option key={getShopId(shop)} value={getShopId(shop)}>
                      {getShopName(shop)} {getShopAddress(shop) ? `- ${getShopAddress(shop)}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedShop && (
                <div style={styles.shopPreview}>
                  <strong style={{ color: GOLD }}>{getShopName(selectedShop)}</strong>
                  <span>{getShopAddress(selectedShop) || "주소 정보 없음"}</span>
                  <span>{getShopPhone(selectedShop) || "연락처 정보 없음"}</span>
                </div>
              )}
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>기본 채용정보</h2>

              <label style={styles.label}>
                채용 제목 <span style={styles.required}>*</span>
                <input
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="예: 야간 마사지 매니저 급구"
                  style={styles.input}
                  required
                />
              </label>

              <div style={styles.twoColumns}>
                <label style={styles.label}>
                  근무시간
                  <input
                    value={form.workTime}
                    onChange={(event) => update("workTime", event.target.value)}
                    placeholder="예: 12:00 ~ 03:00"
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  근무일
                  <input
                    value={form.workDays}
                    onChange={(event) => update("workDays", event.target.value)}
                    placeholder="예: 주 5일 / 협의"
                    style={styles.input}
                  />
                </label>
              </div>

              <label style={styles.label}>
                기타 조건
                <textarea
                  value={form.conditions}
                  onChange={(event) => update("conditions", event.target.value)}
                  placeholder="근무 조건, 우대사항 등을 입력하세요."
                  style={styles.textarea}
                />
              </label>

              <label style={styles.label}>
                연락처
                <input
                  value={form.contactPhone}
                  onChange={(event) => update("contactPhone", event.target.value)}
                  placeholder="업체 전화번호"
                  style={styles.input}
                />
              </label>

              <div style={styles.checkGrid}>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.beginnerAllowed} onChange={(event) => update("beginnerAllowed", event.target.checked)} />
                  초보 가능
                </label>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.lodgingProvided} onChange={(event) => update("lodgingProvided", event.target.checked)} />
                  숙소 제공
                </label>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.urgent} onChange={(event) => update("urgent", event.target.checked)} />
                  급구 표시
                </label>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.recommended} onChange={(event) => update("recommended", event.target.checked)} />
                  추천 표시
                </label>
              </div>
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>급여</h2>

              <div style={styles.threeColumns}>
                <label style={styles.label}>
                  급여 형태
                  <select value={form.payType} onChange={(event) => update("payType", event.target.value)} style={styles.input}>
                    <option value="negotiable">협의</option>
                    <option value="hourly">시급</option>
                    <option value="daily">일급</option>
                    <option value="monthly">월급</option>
                    <option value="case">건별</option>
                    <option value="other">기타</option>
                  </select>
                </label>

                <label style={styles.label}>
                  최소 금액
                  <input type="number" min="0" value={form.payMin} onChange={(event) => update("payMin", event.target.value)} style={styles.input} />
                </label>

                <label style={styles.label}>
                  최대 금액
                  <input type="number" min="0" value={form.payMax} onChange={(event) => update("payMax", event.target.value)} style={styles.input} />
                </label>
              </div>

              <label style={styles.label}>
                화면 표시 급여
                <input
                  value={form.payText}
                  onChange={(event) => update("payText", event.target.value)}
                  placeholder="예: 월 400만원 이상 / 일급 협의"
                  style={styles.input}
                />
              </label>
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>노출 등급 / 상태</h2>

              <div style={styles.twoColumns}>
                <label style={styles.label}>
                  채용 등급
                  <select value={form.tier} onChange={(event) => handleTierChange(event.target.value)} style={styles.input}>
                    <option value="normal">NORMAL</option>
                    <option value="premium">PREMIUM</option>
                  </select>
                </label>

                <label style={styles.label}>
                  모집 상태
                  <select value={form.status} onChange={(event) => update("status", event.target.value)} style={styles.input}>
                    <option value="recruiting">모집중</option>
                    <option value="closed">모집마감</option>
                    <option value="draft">임시저장</option>
                    <option value="hidden">숨김</option>
                  </select>
                </label>
              </div>

              <div style={styles.noticeBox}>
                채용 PREMIUM은 기존 업체의 Shop PREMIUM과 별도로 관리됩니다.
              </div>

              {form.tier === "premium" && (
                <div style={styles.twoColumns}>
                  <label style={styles.label}>
                    PREMIUM 시작
                    <input type="datetime-local" value={form.premiumStartAt} onChange={(event) => update("premiumStartAt", event.target.value)} style={styles.input} />
                  </label>
                  <label style={styles.label}>
                    PREMIUM 종료
                    <input type="datetime-local" value={form.premiumEndAt} onChange={(event) => update("premiumEndAt", event.target.value)} style={styles.input} />
                  </label>
                </div>
              )}
            </section>

            <div style={styles.actionRow}>
              <button type="button" onClick={() => navigate(basePath)} style={styles.cancelButton} disabled={saving}>
                취소
              </button>
              <button type="submit" style={styles.saveButton} disabled={saving}>
                {saving ? "저장 중..." : isEdit ? "수정 저장" : "채용공고 등록"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}

const styles = {
  page: { width: "100%", boxSizing: "border-box", color: "#fff" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 18 },
  title: { margin: 0, fontSize: 28 },
  subTitle: { margin: "7px 0 0", color: "#999", fontSize: 13 },
  cancelTopButton: { minHeight: 40, padding: "0 14px", border: "1px solid #444", borderRadius: 7, background: "#0b0b0b", color: "#ccc", fontWeight: 800, cursor: "pointer" },
  errorBox: { marginBottom: 14, padding: 13, border: "1px solid #792039", borderRadius: 7, background: "#18050b", color: "#ff9cb2" },
  stateBox: { padding: 35, border: "1px solid #333", borderRadius: 8, textAlign: "center", color: "#888", background: "#080808" },
  form: { display: "grid", gap: 15 },
  section: { padding: 18, border: "1px solid #303030", borderRadius: 9, background: "#080808" },
  sectionTitle: { margin: "0 0 15px", paddingBottom: 10, borderBottom: "1px solid #292929", color: GOLD, fontSize: 18 },
  label: { display: "grid", gap: 7, marginBottom: 13, color: "#ccc", fontSize: 12, fontWeight: 800 },
  required: { color: "#ff6b87" },
  input: { width: "100%", minHeight: 43, padding: "0 11px", boxSizing: "border-box", border: "1px solid #3d3d3d", borderRadius: 7, background: "#0d0d0d", color: "#fff", outline: "none" },
  textarea: { width: "100%", minHeight: 100, padding: 11, boxSizing: "border-box", resize: "vertical", border: "1px solid #3d3d3d", borderRadius: 7, background: "#0d0d0d", color: "#fff", outline: "none", fontFamily: "inherit" },
  twoColumns: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  threeColumns: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  checkGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 5 },
  checkLabel: { display: "flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 11px", border: "1px solid #333", borderRadius: 7, background: "#0c0c0c", color: "#ddd", fontSize: 12, fontWeight: 800 },
  shopPreview: { display: "grid", gap: 4, padding: 12, border: `1px solid ${GOLD}`, borderRadius: 7, background: "#171303", color: "#bbb", fontSize: 11 },
  noticeBox: { marginBottom: 13, padding: 11, border: "1px solid #5f5118", borderRadius: 7, background: "#151102", color: "#dfca6e", fontSize: 11, lineHeight: 1.6 },
  actionRow: { display: "grid", gridTemplateColumns: "140px minmax(0, 1fr)", gap: 10, position: "sticky", bottom: 10, padding: 9, border: "1px solid #363636", borderRadius: 9, background: "rgba(6,6,6,.96)", zIndex: 20 },
  cancelButton: { minHeight: 48, border: "1px solid #4a4a4a", borderRadius: 7, background: "#111", color: "#ccc", fontWeight: 900, cursor: "pointer" },
  saveButton: { minHeight: 48, border: `1px solid ${GOLD}`, borderRadius: 7, background: "#2a2203", color: GOLD, fontWeight: 900, cursor: "pointer" },
};

export default AdminJobFormPage;
