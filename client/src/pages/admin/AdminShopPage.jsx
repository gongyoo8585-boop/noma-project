"use strict";

import React, { useEffect, useRef, useState } from "react";
import shopApi from "../../services/shop.api";
import Loading from "../../components/common/Loading";
import ErrorMessage from "../../components/common/ErrorMessage";
import EmptyState from "../../components/common/EmptyState";

const ADMIN_SHOP_CACHE_KEY = "nora_admin_shops_cache_v1";
const MAP_ADMIN_SHOP_KEY = "noma_admin_shops";
const MAP_PUBLIC_SHOP_KEY = "noma_local_shops";
const SELECTED_SHOP_KEY = "noma_selected_shop";

const safeText = (value) => String(value || "").trim();

const getShopKey = (shop) =>
  String(
    shop?._id ||
      shop?.id ||
      `${safeText(shop?.name)}__${safeText(shop?.address)}__${safeText(shop?.phone)}`
  );

const getStoredAdminShops = () => {
  try {
    const raw = localStorage.getItem(ADMIN_SHOP_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
};

const getStoredMapShops = () => {
  try {
    const adminSaved = JSON.parse(localStorage.getItem(MAP_ADMIN_SHOP_KEY) || "[]");
    const publicSaved = JSON.parse(localStorage.getItem(MAP_PUBLIC_SHOP_KEY) || "[]");
    const adminSession = JSON.parse(sessionStorage.getItem(MAP_ADMIN_SHOP_KEY) || "[]");
    const publicSession = JSON.parse(sessionStorage.getItem(MAP_PUBLIC_SHOP_KEY) || "[]");

    return [
      ...(Array.isArray(adminSaved) ? adminSaved : []),
      ...(Array.isArray(publicSaved) ? publicSaved : []),
      ...(Array.isArray(adminSession) ? adminSession : []),
      ...(Array.isArray(publicSession) ? publicSession : []),
    ].filter(Boolean);
  } catch (e) {
    return [];
  }
};

const setStoredAdminShops = (shops) => {
  try {
    localStorage.setItem(
      ADMIN_SHOP_CACHE_KEY,
      JSON.stringify(Array.isArray(shops) ? shops.filter(Boolean) : [])
    );
  } catch (e) {
    return;
  }
};

const setStoredMapShops = (shops) => {
  try {
    const next = Array.isArray(shops)
      ? shops.filter(Boolean).filter((shop) => normalizePremiumValue(shop))
      : [];

    localStorage.setItem(MAP_ADMIN_SHOP_KEY, JSON.stringify(next));
    localStorage.setItem(MAP_PUBLIC_SHOP_KEY, JSON.stringify(next));
    sessionStorage.setItem(MAP_ADMIN_SHOP_KEY, JSON.stringify(next));
    sessionStorage.setItem(MAP_PUBLIC_SHOP_KEY, JSON.stringify(next));

    window.dispatchEvent(
      new CustomEvent("shops-updated", {
        detail: {
          shops: next,
        },
      })
    );
  } catch (e) {
    return;
  }
};

const normalizePremiumValue = (shop) => {
  const premiumType = String(
    shop?.premiumType ||
      shop?.premiumLevel ||
      ""
  )
    .toLowerCase()
    .trim();

  return (
    shop?.premium === true ||
    shop?.isPremium === true ||
    premiumType === "premium" ||
    premiumType === "vip"
  );
};

const getImageValue = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "object") {
    return safeText(
      value.url ||
        value.src ||
        value.path ||
        value.location ||
        value.image ||
        value.imageUrl ||
        value.thumbnail ||
        value.thumbnailUrl ||
        value.mainImage ||
        value.representativeImage ||
        value.coverImage ||
        value.photo ||
        value.picture ||
        ""
    );
  }

  return "";
};

const normalizeImageList = (value) => {
  const result = [];

  const pushValue = (item) => {
    if (!item) {
      return;
    }

    if (Array.isArray(item)) {
      item.forEach((child) => pushValue(child));
      return;
    }

    if (typeof item === "string") {
      item
        .split(",")
        .map((text) => text.trim())
        .filter(Boolean)
        .forEach((text) => result.push(text));

      return;
    }

    const imageValue = getImageValue(item);

    if (imageValue) {
      result.push(imageValue);
    }
  };

  pushValue(value);

  return result.filter((item, index, array) => array.indexOf(item) === index);
};

const normalizeShopSnapshot = (shop) => {
  const images = normalizeImageList(
    Array.isArray(shop?.images)
      ? shop.images
      : Array.isArray(shop?.photos)
      ? shop.photos
      : Array.isArray(shop?.imageUrls)
      ? shop.imageUrls
      : Array.isArray(shop?.gallery)
      ? shop.gallery
      : Array.isArray(shop?.files)
      ? shop.files
      : shop?.images ||
        shop?.photos ||
        shop?.imageUrls ||
        shop?.representativeImage ||
        shop?.mainImage ||
        shop?.thumbnail ||
        shop?.coverImage ||
        shop?.image ||
        shop?.imageUrl ||
        shop?.photo ||
        shop?.picture ||
        ""
  );

  const premium = normalizePremiumValue(shop);

  return {
    ...shop,
    premium,
    isPremium: premium,
    premiumType: premium ? "premium" : "normal",
    images,
    photos: images,
    imageUrls: images,
    representativeImage: images[0] || "",
    mainImage: images[0] || "",
    thumbnail: images[0] || "",
    coverImage: images[0] || "",
  };
};

const mergeShopLists = (baseList, storedList) => {
  const map = new Map();

  (Array.isArray(baseList) ? baseList : []).filter(Boolean).forEach((shop) => {
    map.set(getShopKey(shop), normalizeShopSnapshot(shop));
  });

  (Array.isArray(storedList) ? storedList : []).filter(Boolean).forEach((shop) => {
    const key = getShopKey(shop);
    const current = map.get(key);
    const normalizedShop = normalizeShopSnapshot(shop);

    map.set(key, {
      ...(current || {}),
      ...normalizedShop,
      _id: current?._id || normalizedShop?._id,
      id: current?.id || normalizedShop?.id,
    });
  });

  return Array.from(map.values());
};

const persistShopSnapshot = (shop) => {
  if (!shop || !shop.name || !shop.address) {
    return;
  }

  const normalizedShop = normalizeShopSnapshot(shop);
  const stored = mergeShopLists(getStoredAdminShops(), getStoredMapShops());
  const key = getShopKey(normalizedShop);
  const next = stored.filter((item) => getShopKey(item) !== key);

  next.unshift(normalizedShop);

  const nextList = next.slice(0, 200);

  setStoredAdminShops(nextList);
  setStoredMapShops(nextList);

  try {
    localStorage.setItem(SELECTED_SHOP_KEY, JSON.stringify(normalizedShop));
    sessionStorage.setItem(SELECTED_SHOP_KEY, JSON.stringify(normalizedShop));
  } catch (e) {
    return;
  }
};

function AdminShopPage({ navigate }) {
  const [shops, setShops] = useState([]);
  const [selected, setSelected] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(getEmptyForm());

  const [stats, setStats] = useState([]);
  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState("");

  const initialLoadedRef = useRef(false);
  const loadingRef = useRef(false);
  const statsLoadingRef = useRef(false);

  useEffect(() => {
    if (initialLoadedRef.current) {
      return;
    }

    initialLoadedRef.current = true;

    loadShops();
    loadStats();
  }, []);

  function getEmptyForm() {
    return {
      name: "",
      region: "",
      district: "",
      address: "",
      phone: "",
      virtualPhone: "",
      businessHours: "",
      lat: "",
      lng: "",
      priceOriginal: "",
      priceDiscount: "",
      description: "",
      tags: "",
      serviceTypes: "",
      courses: "",
      price: "",
      images: "",
      visible: true,
      approved: true,
      premium: false,
      isReservable: true,
      status: "active",
    };
  }

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const keepShopRoute = () => {
    if (window.location.pathname !== "/admin/shops") {
      window.history.replaceState({}, "", "/admin/shops");
    }
  };

  const normalizeShopList = (res) => {
    const list =
      (Array.isArray(res) && res) ||
      (Array.isArray(res?.data) && res.data) ||
      (Array.isArray(res?.items) && res.items) ||
      (Array.isArray(res?.shops) && res.shops) ||
      (Array.isArray(res?.list) && res.list) ||
      (Array.isArray(res?.data?.items) && res.data.items) ||
      (Array.isArray(res?.data?.shops) && res.data.shops) ||
      (Array.isArray(res?.data?.list) && res.data.list) ||
      (Array.isArray(res?.result) && res.result) ||
      (Array.isArray(res?.data?.result) && res.data.result) ||
      [];

    return mergeShopLists(
      mergeShopLists(list.filter(Boolean), getStoredAdminShops()),
      getStoredMapShops()
    ).filter((shop) => normalizePremiumValue(shop));
  };

  const normalizeStatsList = (res) => {
    const list =
      (Array.isArray(res) && res) ||
      (Array.isArray(res?.data) && res.data) ||
      (Array.isArray(res?.shopStats) && res.shopStats) ||
      (Array.isArray(res?.items) && res.items) ||
      (Array.isArray(res?.list) && res.list) ||
      (Array.isArray(res?.data?.shopStats) && res.data.shopStats) ||
      (Array.isArray(res?.data?.items) && res.data.items) ||
      (Array.isArray(res?.data?.list) && res.data.list) ||
      [];

    return list.filter(Boolean);
  };

  const goDashboard = () => {
    if (typeof navigate === "function") {
      navigate("/admin/dashboard");
      return;
    }

    window.location.href = "/admin/dashboard";
  };

  const normalizeStringArray = (value) =>
    String(value || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const normalizeNumberArray = (value) =>
    String(value || "")
      .split(",")
      .map((v) =>
        Number(
          String(v || "")
            .replaceAll(",", "")
            .replaceAll("원", "")
            .trim()
        )
      )
      .filter((v) => Number.isFinite(v));

  const normalizePayload = () => {
    const images = normalizeImageList(form.images);

    return {
      ...form,
      lat: form.lat === "" ? "" : Number(form.lat || 0),
      lng: form.lng === "" ? "" : Number(form.lng || 0),
      priceOriginal: Number(form.priceOriginal || 0),
      priceDiscount: Number(form.priceDiscount || 0),
      status: form.status === "inactive" ? "inactive" : "active",
      tags: normalizeStringArray(form.tags),
      serviceTypes: normalizeStringArray(form.serviceTypes),
      courses: normalizeStringArray(form.courses),
      price: normalizeNumberArray(form.price),
      premium: form.premium === true,
      isPremium: form.premium === true,
      premiumType: form.premium === true ? "premium" : "normal",
      images,
      photos: images,
      imageUrls: images,
      representativeImage: images[0] || "",
      mainImage: images[0] || "",
      thumbnail: images[0] || "",
      coverImage: images[0] || "",
    };
  };

  const loadStats = async () => {
    if (statsLoadingRef.current) {
      return;
    }

    try {
      statsLoadingRef.current = true;

      if (!shopApi.getStats) {
        setStats([]);
        return;
      }

      const params = {};

      if (statsStartDate) {
        params.startDate = statsStartDate;
      }

      if (statsEndDate) {
        params.endDate = statsEndDate;
      }

      const res = await shopApi.getStats(params);

      setStats(normalizeStatsList(res));
    } catch (e) {
      setStats([]);
    } finally {
      statsLoadingRef.current = false;
    }
  };

  const handleSearch = async () => {
    await loadShops();
    await loadStats();
  };

  const getShopStats = (shop) => {
    const shopId = String(shop?._id || shop?.id || "");

    return (
      stats.find(
        (item) =>
          String(
            item.shopId ||
              item._id ||
              item.id ||
              ""
          ) === shopId
      ) || {}
    );
  };

  const sumObjectValues = (value) => {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return 0;
    }

    return Object.values(value).reduce(
      (sum, item) =>
        sum + Number(item || 0),
      0
    );
  };

  const getDefaultMonthRange = () => {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    );

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  };

  const getDateRangeRows = (shop, shopStats) => {
    const range = getDefaultMonthRange();

    const startDate =
      statsStartDate || range.start;

    const endDate =
      statsEndDate || range.end;

    const start =
      new Date(startDate);

    const end =
      new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return [];
    }

    const dailyCalls =
      shopStats.dailyCalls ||
      shop.dailyCalls ||
      {};

    const dailyClicks =
      shopStats.dailyClicks ||
      shop.dailyClicks ||
      {};

    const dailyConversions =
      shopStats.dailyConversions ||
      shop.dailyConversions ||
      {};

    const dailyReviews =
      shopStats.dailyReviews ||
      shop.dailyReviews ||
      {};

    const rows = [];

    const current =
      new Date(start);

    while (current <= end) {
      const key =
        current
          .toISOString()
          .slice(0, 10);

      rows.push({
        date: key,
        calls:
          Number(
            dailyCalls[key] || 0
          ),
        clicks:
          Number(
            dailyClicks[key] || 0
          ),
        conversions:
          Number(
            dailyConversions[key] || 0
          ),
        reviews:
          Number(
            dailyReviews[key] || 0
          ),
      });

      current.setDate(
        current.getDate() + 1
      );
    }

    return rows;
  };

  const loadShops = async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;

      setLoading(true);
      setError("");

      const res = await shopApi.getList({
        keyword,
        limit: 100,
      });

      const normalized = normalizeShopList(res);

      setShops(normalized);
      setStoredMapShops(normalized);
    } catch (e) {
      setError(
        e?.message ||
          "매장 목록 불러오기 실패"
      );

      const fallbackList = mergeShopLists(getStoredAdminShops(), getStoredMapShops()).filter((shop) =>
        normalizePremiumValue(shop)
      );

      setShops(fallbackList);
      setStoredMapShops(fallbackList);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const selectShop = (shop) => {
    const normalizedShop = normalizeShopSnapshot(shop);

    setSelected(normalizedShop);

    setForm({
      name: normalizedShop.name || "",
      region: normalizedShop.region || "",
      district: normalizedShop.district || "",
      address: normalizedShop.address || "",
      phone: normalizedShop.phone || "",
      virtualPhone:
        normalizedShop.virtualPhone ||
        normalizedShop.fakePhone ||
        normalizedShop.callNumber ||
        "",
      businessHours:
        normalizedShop.businessHours ||
        normalizedShop.openingHours ||
        normalizedShop.hours ||
        "",
      lat: normalizedShop.lat || "",
      lng: normalizedShop.lng || "",
      priceOriginal:
        normalizedShop.priceOriginal || "",
      priceDiscount:
        normalizedShop.priceDiscount || "",
      description:
        normalizedShop.description || "",
      tags: Array.isArray(
        normalizedShop.tags
      )
        ? normalizedShop.tags.join(",")
        : "",
      serviceTypes:
        Array.isArray(
          normalizedShop.serviceTypes
        )
          ? normalizedShop.serviceTypes.join(
              ","
            )
          : "",
      courses:
        Array.isArray(normalizedShop.courses)
          ? normalizedShop.courses.join(",")
          : "",
      price:
        Array.isArray(normalizedShop.price)
          ? normalizedShop.price.join(",")
          : normalizedShop.price || "",
      images:
        normalizeImageList(
          Array.isArray(normalizedShop.images)
            ? normalizedShop.images
            : Array.isArray(normalizedShop.photos)
            ? normalizedShop.photos
            : Array.isArray(normalizedShop.imageUrls)
            ? normalizedShop.imageUrls
            : normalizedShop.representativeImage || ""
        ).join(","),
      visible:
        normalizedShop.visible !== false,
      approved:
        normalizedShop.approved !== false,
      premium: normalizePremiumValue(normalizedShop),
      isReservable:
        normalizedShop.isReservable !== false,
      status:
        normalizedShop.status ===
        "inactive"
          ? "inactive"
          : "active",
    });
  };

  const resetForm = () => {
    setSelected(null);
    setForm(getEmptyForm());
  };

  const saveShop = async () => {
    if (!form.name.trim()) {
      alert("상호명을 입력하세요.");
      return;
    }

    if (!form.address.trim()) {
      alert("주소를 입력하세요.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload =
        normalizePayload();

      const token =
        localStorage.getItem(
          "token"
        ) ||
        localStorage.getItem(
          "accessToken"
        ) ||
        localStorage.getItem(
          "adminToken"
        );

      if (!token) {
        throw new Error(
          "INVALID_TOKEN"
        );
      }

      if (selected?._id) {
        if (shopApi.update) {
          await shopApi.update(
            selected._id,
            payload
          );
        } else if (
          shopApi.updateShop
        ) {
          await shopApi.updateShop(
            selected._id,
            payload
          );
        } else {
          throw new Error(
            "UPDATE_API_NOT_FOUND"
          );
        }

        const updatedShopSnapshot = normalizeShopSnapshot({
          ...selected,
          ...payload,
          _id: selected._id,
          id: selected.id,
        });

        persistShopSnapshot(updatedShopSnapshot);

        setShops((prev) => {
          const nextList = mergeShopLists(
            (Array.isArray(prev) ? prev : []).map((item) =>
              getShopKey(item) === getShopKey(updatedShopSnapshot)
                ? updatedShopSnapshot
                : item
            ),
            getStoredMapShops()
          ).filter((shop) => normalizePremiumValue(shop));

          setStoredMapShops(nextList);

          return nextList;
        });

        alert("수정 완료");
      } else {
        let createdShop = null;

        if (shopApi.create) {
          createdShop = await shopApi.create(
            payload
          );
        } else if (
          shopApi.createShop
        ) {
          createdShop = await shopApi.createShop(
            payload
          );
        } else {
          throw new Error(
            "CREATE_API_NOT_FOUND"
          );
        }

        const normalizedCreatedShop =
          createdShop?.data?.shop ||
          createdShop?.data ||
          createdShop?.shop ||
          createdShop?.result ||
          createdShop ||
          {};

        persistShopSnapshot({
          ...payload,
          ...normalizedCreatedShop,
          name:
            normalizedCreatedShop.name ||
            payload.name,
          region:
            normalizedCreatedShop.region ||
            payload.region,
          district:
            normalizedCreatedShop.district ||
            payload.district,
          address:
            normalizedCreatedShop.address ||
            payload.address,
          phone:
            normalizedCreatedShop.phone ||
            payload.phone,
          virtualPhone:
            normalizedCreatedShop.virtualPhone ||
            payload.virtualPhone,
          businessHours:
            normalizedCreatedShop.businessHours ||
            payload.businessHours,
          premium: payload.premium,
          isPremium: payload.isPremium,
          premiumType: payload.premiumType,
          images: payload.images,
          photos: payload.photos,
          imageUrls: payload.imageUrls,
          representativeImage: payload.representativeImage,
          mainImage: payload.mainImage,
          thumbnail: payload.thumbnail,
          coverImage: payload.coverImage,
        });

        alert("등록 완료");

        keepShopRoute();
      }

      resetForm();

      const refreshed = await shopApi.getList({
        keyword,
        limit: 100,
      });

      const refreshedList = normalizeShopList(refreshed);

      setShops(refreshedList);
      setStoredMapShops(refreshedList);

      await loadStats();

      keepShopRoute();
    } catch (e) {
      console.error(
        "SHOP_SAVE_ERROR:",
        e
      );

      setError(
        e?.response?.data
          ?.message ||
          e?.message ||
          "매장 저장 실패"
      );

      alert(
        e?.response?.data
          ?.message ||
          e?.message ||
          "매장 저장 실패"
      );
    } finally {
      loadingRef.current = false;
      setSaving(false);
    }
  };

  const deleteShop = async (
    shop
  ) => {
    if (
      !window.confirm(
        `${shop.name} 매장을 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      setError("");

      if (shopApi.remove) {
        await shopApi.remove(
          shop._id
        );
      } else if (
        shopApi.deleteShop
      ) {
        await shopApi.deleteShop(
          shop._id
        );
      } else {
        throw new Error(
          "DELETE_API_NOT_FOUND"
        );
      }

      const key = getShopKey(shop);
      const nextList = getStoredAdminShops().filter(
        (item) => getShopKey(item) !== key
      );

      setStoredAdminShops(nextList);
      setStoredMapShops(nextList);

      alert("삭제 완료");

      await loadShops();
      await loadStats();
    } catch (e) {
      setError(
        e?.message || "삭제 실패"
      );

      alert(
        e?.message || "삭제 실패"
      );
    }
  };

  const toggleShopStatus = async (
    shop
  ) => {
    const nextStatus =
      shop.status === "inactive"
        ? "active"
        : "inactive";

    if (
      !window.confirm(
        `${shop.name} 매장을 ${
          nextStatus === "active"
            ? "활성화"
            : "비활성화"
        }하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (shopApi.update) {
        await shopApi.update(
          shop._id,
          {
            status: nextStatus,
          }
        );
      } else if (
        shopApi.updateShop
      ) {
        await shopApi.updateShop(
          shop._id,
          {
            status: nextStatus,
          }
        );
      } else {
        throw new Error(
          "UPDATE_API_NOT_FOUND"
        );
      }

      persistShopSnapshot({
        ...shop,
        status: nextStatus,
      });

      alert(
        nextStatus === "active"
          ? "활성화 완료"
          : "비활성화 완료"
      );

      await loadShops();

      if (
        selected?._id ===
        shop._id
      ) {
        setSelected((prev) =>
          prev
            ? {
                ...prev,
                status:
                  nextStatus,
              }
            : prev
        );

        update(
          "status",
          nextStatus
        );
      }
    } catch (e) {
      setError(
        e?.message ||
          "상태 변경 실패"
      );

      alert(
        e?.message ||
          "상태 변경 실패"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleLikeViewReset =
    async (type) => {
      try {
        setError("");

        if (
          type === "view" &&
          shopApi.resetView
        ) {
          await shopApi.resetView();
        }

        if (
          type === "like" &&
          shopApi.resetLike
        ) {
          await shopApi.resetLike();
        }

        alert("처리 완료");

        await loadShops();
        await loadStats();
      } catch (e) {
        setError("처리 실패");
        alert("처리 실패");
      }
    };

  return (
    <div style={page}>
      <div style={header}>
        <h2
          style={{
            margin: 0,
            color: "#d4af37",
          }}
        >
          노마 관리자 - 매장 관리
        </h2>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            style={secondaryBtn}
            onClick={goDashboard}
          >
            대시보드
          </button>

          <button
            style={primaryBtn}
            onClick={resetForm}
          >
            신규 등록
          </button>
        </div>
      </div>

      {error && (
        <ErrorMessage
          message={error}
        />
      )}

      <div style={layout}>
        <section style={panel}>
          <h3 style={title}>
            프리미엄 매장 목록
          </h3>

          <div style={searchBox}>
            <input
              value={keyword}
              onChange={(e) =>
                setKeyword(
                  e.target.value
                )
              }
              placeholder="매장명 / 지역 검색"
              style={input}
            />

            <button
              style={primaryBtn}
              onClick={handleSearch}
            >
              검색
            </button>
          </div>

          <div
            style={
              statsFilterBox
            }
          >
            <input
              type="date"
              value={
                statsStartDate
              }
              onChange={(e) =>
                setStatsStartDate(
                  e.target.value
                )
              }
              style={input}
            />

            <input
              type="date"
              value={
                statsEndDate
              }
              onChange={(e) =>
                setStatsEndDate(
                  e.target.value
                )
              }
              style={input}
            />

            <button
              style={smallBtn}
              onClick={
                loadStats
              }
            >
              통계 조회
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <button
              onClick={() =>
                toggleLikeViewReset(
                  "view"
                )
              }
              style={smallBtn}
            >
              조회수 초기화
            </button>

            <button
              onClick={() =>
                toggleLikeViewReset(
                  "like"
                )
              }
              style={smallBtn}
            >
              좋아요 초기화
            </button>
          </div>

          {loading && <Loading />}

          {!loading &&
            shops.length ===
              0 && (
              <EmptyState message="등록된 프리미엄 업체가 없습니다." />
            )}

          <div style={listWrap}>
            {shops.map(
              (shop) => {
                const shopStats =
                  getShopStats(
                    shop
                  );

                const monthlyRows =
                  getDateRangeRows(
                    shop,
                    shopStats
                  );

                const callCount =
                  Number(
                    shopStats.callCount ||
                      shop.callCount ||
                      shop.stats
                        ?.callCount ||
                      0
                  ) ||
                  sumObjectValues(
                    shopStats.dailyCalls ||
                      shop.dailyCalls
                  );

                const clickCount =
                  Number(
                    shopStats.clickCount ||
                      shop.clickCount ||
                      shop.viewCount ||
                      shop.stats
                        ?.clickCount ||
                      0
                  ) ||
                  sumObjectValues(
                    shopStats.dailyClicks ||
                      shop.dailyClicks
                  );

                const conversionCount =
                  Number(
                    shopStats.conversionCount ||
                      shop.conversionCount ||
                      shop.stats
                        ?.conversionCount ||
                      shop.stats
                        ?.reservationCount ||
                      0
                  ) ||
                  sumObjectValues(
                    shopStats.dailyConversions ||
                      shop.dailyConversions
                  );

                const reviewCount =
                  Number(
                    shopStats.reviewCount ||
                      shop.reviewCount ||
                      shop.rating
                        ?.count ||
                      shop.stats
                        ?.reviewCount ||
                      0
                  ) ||
                  sumObjectValues(
                    shopStats.dailyReviews ||
                      shop.dailyReviews
                  );

                return (
                  <React.Fragment
                    key={
                      shop._id ||
                      shop.id ||
                      shop.name
                    }
                  >
                    <div
                      style={{
                        ...shopItem,
                        borderColor:
                          selected?._id ===
                            shop._id ||
                          selected?.id ===
                            shop.id
                            ? "#d4af37"
                            : "#333",
                      }}
                      onClick={() =>
                        selectShop(
                          shop
                        )
                      }
                    >
                      <strong>
                        {
                          shop.name
                        }
                      </strong>

                      <div
                        style={
                          muted
                        }
                      >
                        {
                          shop.region
                        }{" "}
                        {
                          shop.district
                        }
                      </div>

                      <div
                        style={
                          muted
                        }
                      >
                        {
                          shop.address
                        }
                      </div>

                      <div
                        style={
                          muted
                        }
                      >
                        전화번호:{" "}
                        {shop.phone ||
                          "-"}
                      </div>

                      <div
                        style={
                          muted
                        }
                      >
                        가상번호:{" "}
                        {shop.virtualPhone ||
                          shop.fakePhone ||
                          shop.callNumber ||
                          "-"}
                      </div>

                      <div
                        style={
                          muted
                        }
                      >
                        영업시간:{" "}
                        {shop.businessHours ||
                          shop.openingHours ||
                          shop.hours ||
                          "-"}
                      </div>

                      <div
                        style={
                          muted
                        }
                      >
                        코스:{" "}
                        {Array.isArray(shop.courses)
                          ? shop.courses.join(", ")
                          : "-"}
                      </div>

                      <div
                        style={
                          muted
                        }
                      >
                        금액:{" "}
                        {Array.isArray(shop.price)
                          ? shop.price.join(", ")
                          : shop.price || "-"}
                      </div>

                      <div
                        style={
                          badgeRow
                        }
                      >
                        <span
                          style={
                            shop.status ===
                            "inactive"
                              ? dangerBadge
                              : badge
                          }
                        >
                          {shop.status ===
                          "inactive"
                            ? "비활성"
                            : "활성"}
                        </span>

                        {normalizePremiumValue(shop) && (
                          <span style={premiumBadge}>
                            PREMIUM
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 6,
                          marginTop: 10,
                        }}
                      >
                        <button
                          style={
                            smallBtn
                          }
                          onClick={(
                            e
                          ) => {
                            e.stopPropagation();

                            toggleShopStatus(
                              shop
                            );
                          }}
                        >
                          {shop.status ===
                          "inactive"
                            ? "활성화"
                            : "비활성화"}
                        </button>

                        <button
                          style={
                            dangerBtn
                          }
                          onClick={(
                            e
                          ) => {
                            e.stopPropagation();

                            deleteShop(
                              shop
                            );
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    <div
                      style={
                        shopStatsPanel
                      }
                    >
                      <div
                        style={
                          shopStatsTitle
                        }
                      >
                        <strong>
                          {
                            shop.name
                          } 업체 통계
                        </strong>

                        <span>
                          {(statsStartDate || getDefaultMonthRange().start)} ~ {(statsEndDate || getDefaultMonthRange().end)}
                        </span>
                      </div>

                      <div
                        style={
                          statGrid
                        }
                      >
                        <span>
                          일일 콜수{" "}
                          {
                            callCount
                          }
                        </span>

                        <span>
                          일일 클릭수{" "}
                          {
                            clickCount
                          }
                        </span>

                        <span>
                          일일 전환수{" "}
                          {
                            conversionCount
                          }
                        </span>

                        <span>
                          일일 리뷰수{" "}
                          {
                            reviewCount
                          }
                        </span>
                      </div>

                      <div
                        style={
                          monthlyStatsBox
                        }
                      >
                        <div
                          style={
                            monthlyStatsHeader
                          }
                        >
                          <strong>
                            월간 기간별 일일 통계
                          </strong>

                          <span>
                            월간 기간설정 조회
                          </span>
                        </div>

                        <div
                          style={
                            monthlyStatsGrid
                          }
                        >
                          <div
                            style={
                              monthlyStatsHead
                            }
                          >
                            날짜
                          </div>

                          <div
                            style={
                              monthlyStatsHead
                            }
                          >
                            콜수
                          </div>

                          <div
                            style={
                              monthlyStatsHead
                            }
                          >
                            클릭수
                          </div>

                          <div
                            style={
                              monthlyStatsHead
                            }
                          >
                            전환수
                          </div>

                          <div
                            style={
                              monthlyStatsHead
                            }
                          >
                            리뷰수
                          </div>

                          {monthlyRows.map((row) => (
                            <React.Fragment
                              key={`${shop._id || shop.id || shop.name}-${row.date}`}
                            >
                              <div
                                style={
                                  monthlyStatsCell
                                }
                              >
                                {row.date}
                              </div>

                              <div
                                style={
                                  monthlyStatsCell
                                }
                              >
                                {row.calls}
                              </div>

                              <div
                                style={
                                  monthlyStatsCell
                                }
                              >
                                {row.clicks}
                              </div>

                              <div
                                style={
                                  monthlyStatsCell
                                }
                              >
                                {row.conversions}
                              </div>

                              <div
                                style={
                                  monthlyStatsCell
                                }
                              >
                                {row.reviews}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              }
            )}
          </div>
        </section>

        <section style={panel}>
          <h3 style={title}>
            {selected
              ? "매장 수정"
              : "매장 등록"}
          </h3>

          <FormInput
            label="상호명"
            value={form.name}
            onChange={(v) =>
              update(
                "name",
                v
              )
            }
          />

          <FormInput
            label="지역"
            value={form.region}
            onChange={(v) =>
              update(
                "region",
                v
              )
            }
          />

          <FormInput
            label="구/동"
            value={
              form.district
            }
            onChange={(v) =>
              update(
                "district",
                v
              )
            }
          />

          <FormInput
            label="주소"
            value={form.address}
            onChange={(v) =>
              update(
                "address",
                v
              )
            }
          />

          <FormInput
            label="전화번호"
            value={form.phone}
            onChange={(v) =>
              update(
                "phone",
                v
              )
            }
          />

          <FormInput
            label="가상번호"
            value={
              form.virtualPhone
            }
            onChange={(v) =>
              update(
                "virtualPhone",
                v
              )
            }
          />

          <FormInput
            label="영업시간"
            value={
              form.businessHours
            }
            onChange={(v) =>
              update(
                "businessHours",
                v
              )
            }
          />

          <FormInput
            label="위도"
            value={form.lat}
            onChange={(v) =>
              update(
                "lat",
                v
              )
            }
          />

          <FormInput
            label="경도"
            value={form.lng}
            onChange={(v) =>
              update(
                "lng",
                v
              )
            }
          />

          <FormInput
            label="원가"
            value={
              form.priceOriginal
            }
            onChange={(v) =>
              update(
                "priceOriginal",
                v
              )
            }
          />

          <FormInput
            label="할인가"
            value={
              form.priceDiscount
            }
            onChange={(v) =>
              update(
                "priceDiscount",
                v
              )
            }
          />

          <FormInput
            label="코스"
            value={form.courses}
            onChange={(v) =>
              update(
                "courses",
                v
              )
            }
          />

          <FormInput
            label="금액"
            value={form.price}
            onChange={(v) =>
              update(
                "price",
                v
              )
            }
          />

          <div style={photoPremiumRow}>
            <div style={photoInputBox}>
              <FormInput
                label="사진"
                value={form.images}
                onChange={(v) =>
                  update(
                    "images",
                    v
                  )
                }
              />
            </div>

            <label style={premiumBox}>
              <span style={premiumText}>
                PREMIUM
              </span>

              <input
                type="checkbox"
                checked={form.premium}
                onChange={(e) =>
                  update(
                    "premium",
                    e.target.checked
                  )
                }
                style={premiumCheck}
              />
            </label>
          </div>

          <FormInput
            label="설명"
            value={
              form.description
            }
            onChange={(v) =>
              update(
                "description",
                v
              )
            }
          />

          <FormInput
            label="태그"
            value={form.tags}
            onChange={(v) =>
              update(
                "tags",
                v
              )
            }
          />

          <FormInput
            label="서비스 타입"
            value={
              form.serviceTypes
            }
            onChange={(v) =>
              update(
                "serviceTypes",
                v
              )
            }
          />

          <label
            style={
              labelStyle
            }
          >
            상태

            <select
              value={
                form.status
              }
              onChange={(e) =>
                update(
                  "status",
                  e.target.value
                )
              }
              style={input}
            >
              <option value="active">
                active
              </option>

              <option value="inactive">
                inactive
              </option>
            </select>
          </label>

          <CheckRow
            label="노출"
            checked={
              form.visible
            }
            onChange={(v) =>
              update(
                "visible",
                v
              )
            }
          />

          <CheckRow
            label="승인"
            checked={
              form.approved
            }
            onChange={(v) =>
              update(
                "approved",
                v
              )
            }
          />

          <CheckRow
            label="예약 가능"
            checked={
              form.isReservable
            }
            onChange={(v) =>
              update(
                "isReservable",
                v
              )
            }
          />

          <button
            onClick={saveShop}
            style={primaryBtn}
            disabled={saving}
          >
            {saving
              ? "저장중..."
              : selected
              ? "수정"
              : "생성"}
          </button>
        </section>
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}) {
  return (
    <label style={labelStyle}>
      {label}

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        style={input}
      />
    </label>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}) {
  return (
    <label style={checkRow}>
      <span>{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
      />
    </label>
  );
}

const page = {
  background: "#000",
  minHeight: "100vh",
  color: "#fff",
  padding: 24,
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const layout = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: 20,
};

const panel = {
  background: "#0a0a0a",
  border: "1px solid #222",
  borderRadius: 14,
  padding: 20,
};

const title = {
  color: "#d4af37",
  marginBottom: 20,
};

const searchBox = {
  display: "flex",
  gap: 8,
  marginBottom: 16,
};

const statsFilterBox = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr auto",
  gap: 8,
  marginBottom: 16,
};

const input = {
  width: "100%",
  background: "#111",
  border: "1px solid #333",
  color: "#fff",
  padding: 12,
  borderRadius: 8,
  outline: "none",
  marginTop: 6,
};

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  marginBottom: 14,
  color: "#d4af37",
  fontSize: 14,
};

const listWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  maxHeight: 700,
  overflowY: "auto",
};

const shopItem = {
  border: "1px solid #333",
  background: "#000",
  padding: 14,
  borderRadius: 12,
  cursor: "pointer",
};

const muted = {
  color: "#999",
  fontSize: 13,
  marginTop: 4,
};

const shopStatsPanel = {
  border: "1px solid #333",
  background: "#050505",
  padding: 14,
  borderRadius: 12,
  marginTop: -4,
};

const shopStatsTitle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#d4af37",
  fontSize: 13,
  marginBottom: 10,
};

const statGrid = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr 1fr 1fr",
  gap: 8,
  marginTop: 10,
  color: "#d4af37",
  fontSize: 12,
};

const monthlyStatsBox = {
  marginTop: 12,
  padding: 12,
  border: "1px solid #333",
  borderRadius: 10,
  background: "#050505",
};

const monthlyStatsHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#d4af37",
  fontSize: 12,
  marginBottom: 10,
};

const monthlyStatsGrid = {
  display: "grid",
  gridTemplateColumns:
    "1.4fr 1fr 1fr 1fr 1fr",
  gap: 1,
  background: "#222",
  border: "1px solid #222",
  maxHeight: 220,
  overflowY: "auto",
};

const monthlyStatsHead = {
  background: "#111",
  color: "#d4af37",
  fontSize: 11,
  fontWeight: "bold",
  padding: "8px 6px",
  textAlign: "center",
};

const monthlyStatsCell = {
  background: "#000",
  color: "#fff",
  fontSize: 11,
  padding: "7px 6px",
  textAlign: "center",
};

const badgeRow = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 10,
};

const badge = {
  background: "#0f5132",
  color: "#fff",
  padding: "4px 10px",
  borderRadius: 30,
  fontSize: 12,
};

const dangerBadge = {
  background: "#842029",
  color: "#fff",
  padding: "4px 10px",
  borderRadius: 30,
  fontSize: 12,
};

const premiumBadge = {
  background: "#d4af37",
  color: "#000",
  padding: "4px 10px",
  borderRadius: 30,
  fontSize: 12,
  fontWeight: "bold",
};

const primaryBtn = {
  background: "#d4af37",
  color: "#000",
  border: "none",
  padding: "12px 18px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryBtn = {
  background: "#222",
  color: "#fff",
  border: "1px solid #444",
  padding: "12px 18px",
  borderRadius: 8,
  cursor: "pointer",
};

const smallBtn = {
  background: "#222",
  color: "#fff",
  border: "1px solid #444",
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
};

const dangerBtn = {
  background: "#842029",
  color: "#fff",
  border: "none",
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
};

const checkRow = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  marginBottom: 14,
  color: "#fff",
};

const photoPremiumRow = {
  display: "grid",
  gridTemplateColumns: "1fr 150px",
  gap: 10,
  alignItems: "start",
};

const photoInputBox = {
  minWidth: 0,
};

const premiumBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 44,
  marginTop: 20,
  background: "#d4af37",
  color: "#000",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const premiumText = {
  fontSize: 13,
  letterSpacing: 0.5,
};

const premiumCheck = {
  cursor: "pointer",
};

export default AdminShopPage;