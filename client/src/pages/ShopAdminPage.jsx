"use strict";

import React, { useEffect, useState } from "react";
import shopApi from "../services/shop.api";

import AdminLayout from "../components/admin/AdminLayout";

import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

const REGION_MAP = {
  지역: ["구"],
  서울: [
    "강남구",
    "강동구",
    "강북구",
    "강서구",
    "관악구",
    "광진구",
    "구로구",
    "금천구",
    "노원구",
    "도봉구",
    "동대문구",
    "동작구",
    "마포구",
    "서대문구",
    "서초구",
    "성동구",
    "성북구",
    "송파구",
    "양천구",
    "영등포구",
    "용산구",
    "은평구",
    "종로구",
    "중구",
    "중랑구",
  ],
  부산: [
    "강서구",
    "금정구",
    "기장군",
    "남구",
    "동구",
    "동래구",
    "부산진구",
    "북구",
    "사상구",
    "사하구",
    "서구",
    "수영구",
    "연제구",
    "영도구",
    "중구",
    "해운대구",
  ],
};

const EMPTY_FORM = {
  name: "",
  address: "",
  courses: [],
  courseInput: "",
  price: [],
  priceInput: "",
  status: "active",
  isPremium: false,
  images: [],
  representativeImage: "",
};

const LOCAL_SHOP_KEY = "noma_admin_shops";
const LOCAL_PUBLIC_SHOP_KEY = "noma_local_shops";

function ShopAdminPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("지역");
  const [district, setDistrict] = useState("구");

  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState("");

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s/g, "")
      .trim();

  const getTodayKey = () => {
    return new Date().toISOString().slice(0, 10);
  };

  const getMonthlyValue = (dailyObject = {}) => {
    if (!dailyObject || typeof dailyObject !== "object") {
      return 0;
    }

    const start = statsStartDate || "1900-01-01";
    const end = statsEndDate || "2999-12-31";

    return Object.entries(dailyObject).reduce((sum, [date, value]) => {
      if (date >= start && date <= end) {
        return sum + Number(value || 0);
      }

      return sum;
    }, 0);
  };

  const getShopId = (shop = {}) => {
    return shop?._id || shop?.id || "";
  };

  const getImageValue = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value.trim();
    }

    if (typeof value === "object") {
      return String(
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
      ).trim();
    }

    return "";
  };

  const makeSafeImageArray = (value) => {
    const result = [];

    const pushImage = (item) => {
      if (item === null || item === undefined || item === "") {
        return;
      }

      if (Array.isArray(item)) {
        item.forEach((child) => pushImage(child));
        return;
      }

      if (typeof item === "string") {
        const text = item.trim();

        if (!text) {
          return;
        }

        if (
          text.startsWith("data:image/") ||
          text.startsWith("blob:") ||
          text.startsWith("http://") ||
          text.startsWith("https://") ||
          text.startsWith("/")
        ) {
          result.push(text);
          return;
        }

        text
          .split(",")
          .map((itemText) => itemText.trim())
          .filter(Boolean)
          .forEach((itemText) => result.push(itemText));

        return;
      }

      const imageValue = getImageValue(item);

      if (imageValue) {
        result.push(imageValue);
      }
    };

    pushImage(value);

    return result.filter((item, itemIndex, array) => array.indexOf(item) === itemIndex);
  };

  const getShopImages = (shop = {}) => {
    return Array.from(
      new Set(
        [
          ...makeSafeImageArray(shop?.representativeImage),
          ...makeSafeImageArray(shop?.mainImage),
          ...makeSafeImageArray(shop?.thumbnail),
          ...makeSafeImageArray(shop?.coverImage),
          ...makeSafeImageArray(shop?.image),
          ...makeSafeImageArray(shop?.imageUrl),
          ...makeSafeImageArray(shop?.photo),
          ...makeSafeImageArray(shop?.picture),
          ...makeSafeImageArray(shop?.images),
          ...makeSafeImageArray(shop?.photos),
          ...makeSafeImageArray(shop?.imageUrls),
          ...makeSafeImageArray(shop?.gallery),
          ...makeSafeImageArray(shop?.pictures),
          ...makeSafeImageArray(shop?.files),
        ].filter(Boolean)
      )
    );
  };

  const normalizeShopForStorage = (shop = {}, index = 0) => {
    const id = getShopId(shop) || `local-shop-${Date.now()}-${index}`;

    const images = getShopImages(shop);

    const representativeImage =
      getImageValue(shop?.representativeImage) ||
      getImageValue(shop?.mainImage) ||
      getImageValue(shop?.thumbnail) ||
      getImageValue(shop?.coverImage) ||
      images[0] ||
      "";

    return {
      ...shop,
      _id: shop?._id || id,
      id: shop?.id || id,
      name: shop?.name || "",
      address: shop?.address || "",
      courses: Array.isArray(shop?.courses) ? shop.courses : [],
      price: Array.isArray(shop?.price)
        ? shop.price
        : shop?.price !== undefined && shop?.price !== null && shop?.price !== ""
        ? [shop.price]
        : [],
      status: shop?.status || "active",
      isPremium: shop?.isPremium === true || shop?.premium === true,
      premium: shop?.isPremium === true || shop?.premium === true,
      visible: shop?.visible === false ? false : true,
      approved: shop?.approved === false ? false : true,
      images,
      photos: images,
      imageUrls: images,
      representativeImage,
      mainImage: representativeImage,
      thumbnail: representativeImage,
      coverImage: representativeImage,
      lat: shop?.lat || shop?.latitude || shop?.location?.lat || "",
      lng: shop?.lng || shop?.longitude || shop?.location?.lng || "",
      location:
        shop?.location && typeof shop.location === "object"
          ? shop.location
          : {
              lat: shop?.lat || "",
              lng: shop?.lng || "",
            },
    };
  };

  const mergeShopLists = (baseList = [], nextList = []) => {
    const map = new Map();

    [...baseList, ...nextList].forEach((shop, index) => {
      if (!shop) {
        return;
      }

      const normalized = normalizeShopForStorage(shop, index);
      const key = String(getShopId(normalized) || `${normalized.name}-${index}`);

      if (!map.has(key)) {
        map.set(key, normalized);
        return;
      }

      const current = map.get(key);
      const mergedImages = Array.from(
        new Set([
          ...getShopImages(current),
          ...getShopImages(normalized),
        ].filter(Boolean))
      );

      const representativeImage =
        mergedImages.find((image) => image === normalized.representativeImage) ||
        mergedImages.find((image) => image === current.representativeImage) ||
        normalized.representativeImage ||
        current.representativeImage ||
        mergedImages[0] ||
        "";

      map.set(key, {
        ...current,
        ...normalized,
        images: mergedImages,
        photos: mergedImages,
        imageUrls: mergedImages,
        representativeImage,
        mainImage: representativeImage,
        thumbnail: representativeImage,
        coverImage: representativeImage,
        isPremium: normalized.isPremium === true || current.isPremium === true,
        premium: normalized.premium === true || current.premium === true,
      });
    });

    return Array.from(map.values());
  };

  const readLocalShops = () => {
    try {
      const adminSaved = JSON.parse(localStorage.getItem(LOCAL_SHOP_KEY) || "[]");
      const publicSaved = JSON.parse(localStorage.getItem(LOCAL_PUBLIC_SHOP_KEY) || "[]");
      const adminSession = JSON.parse(sessionStorage.getItem(LOCAL_SHOP_KEY) || "[]");
      const publicSession = JSON.parse(sessionStorage.getItem(LOCAL_PUBLIC_SHOP_KEY) || "[]");

      return mergeShopLists(
        mergeShopLists(
          Array.isArray(adminSaved) ? adminSaved : [],
          Array.isArray(publicSaved) ? publicSaved : []
        ),
        mergeShopLists(
          Array.isArray(publicSession) ? publicSession : [],
          Array.isArray(adminSession) ? adminSession : []
        )
      );
    } catch (e) {
      return [];
    }
  };

  const saveLocalShops = (items = []) => {
    try {
      const nextItems = mergeShopLists([], Array.isArray(items) ? items : []);

      localStorage.setItem(LOCAL_SHOP_KEY, JSON.stringify(nextItems));
      localStorage.setItem(LOCAL_PUBLIC_SHOP_KEY, JSON.stringify(nextItems));
      sessionStorage.setItem(LOCAL_SHOP_KEY, JSON.stringify(nextItems));
      sessionStorage.setItem(LOCAL_PUBLIC_SHOP_KEY, JSON.stringify(nextItems));

      window.dispatchEvent(
        new CustomEvent("shops-updated", {
          detail: {
            shops: nextItems,
          },
        })
      );
    } catch (e) {
      console.warn("SHOP ADMIN LOCAL SAVE ERROR:", e.message);
    }
  };

  const geocodeAddress = (address = "") => {
    return new Promise((resolve) => {
      try {
        const safeAddress = String(address || "").trim();

        if (
          !safeAddress ||
          !window.kakao ||
          !window.kakao.maps ||
          !window.kakao.maps.services ||
          !window.kakao.maps.services.Geocoder
        ) {
          resolve(null);
          return;
        }

        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(safeAddress, (result, status) => {
          if (
            status === window.kakao.maps.services.Status.OK &&
            Array.isArray(result) &&
            result[0]
          ) {
            resolve({
              lat: Number(result[0].y),
              lng: Number(result[0].x),
              location: {
                lat: Number(result[0].y),
                lng: Number(result[0].x),
              },
              roadAddress:
                result[0]?.road_address?.address_name ||
                result[0]?.address_name ||
                safeAddress,
            });
            return;
          }

          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  };

  const getSubmitPayload = () => {
    const courseInput = String(form.courseInput || "").trim();
    const priceInput = String(form.priceInput || "").trim();

    const nextCourses = courseInput
      ? [...form.courses, courseInput]
      : form.courses;

    const priceValue = Number(
      priceInput
        .replaceAll(",", "")
        .replaceAll("원", "")
        .trim()
    );

    const nextPrice =
      priceInput && !Number.isNaN(priceValue)
        ? [...form.price, priceValue]
        : form.price;

    const representativeImage =
      form.representativeImage ||
      form.images[0] ||
      "";

    return {
      name: form.name,
      address: form.address,
      courses: nextCourses,
      price: nextPrice,
      status: form.status,
      isPremium: form.isPremium === true,
      premium: form.isPremium === true,
      visible: form.status !== "inactive",
      approved: form.status !== "inactive",
      images: form.images,
      photos: form.images,
      imageUrls: form.images,
      representativeImage,
      mainImage: representativeImage,
      thumbnail: representativeImage,
      coverImage: representativeImage,
    };
  };

  const getFilteredList = () => {
    const safeKeyword = normalizeText(keyword);

    const safeRegion =
      region === "지역"
        ? ""
        : normalizeText(region);

    const safeDistrict =
      district === "구"
        ? ""
        : normalizeText(district);

    return list.filter((shop) => {
      const name = normalizeText(shop?.name);
      const address = normalizeText(shop?.address);
      const searchTarget = `${name}${address}`;

      const keywordOk =
        !safeKeyword ||
        searchTarget.includes(safeKeyword);

      const regionOk =
        !safeRegion ||
        address.includes(safeRegion);

      const districtOk =
        !safeDistrict ||
        address.includes(safeDistrict);

      return keywordOk && regionOk && districtOk;
    });
  };

  const isDbNotConnectedError = (e) => {
    const message = String(e?.message || e || "");

    return (
      message.includes("DB_NOT_CONNECTED") ||
      message.includes("DB NOT CONNECTED")
    );
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const localItems = readLocalShops();

      const res = await shopApi.getList();

      const items =
        res?.items ||
        res?.data ||
        res?.shops ||
        res?.list ||
        [];

      const mergedItems = mergeShopLists(
        Array.isArray(items) ? items : [],
        localItems
      );

      setList(mergedItems);
      saveLocalShops(mergedItems);
    } catch (e) {
      const localItems = readLocalShops();

      if (isDbNotConnectedError(e)) {
        setError("");
        setList(localItems);
      } else {
        setError(localItems.length ? "" : e.message || "업체 목록 실패");
        setList(localItems);
      }
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized) {
      return;
    }

    load();
  }, [initialized]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onPhotoChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) {
      return;
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = () => resolve(reader.result || "");
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
          })
      )
    ).then((items) => {
      const nextImages = items.filter(Boolean);

      if (!nextImages.length) {
        return;
      }

      setForm((prev) => {
        const mergedImages = [...prev.images, ...nextImages];

        return {
          ...prev,
          images: mergedImages,
          representativeImage: prev.representativeImage || mergedImages[0] || "",
        };
      });
    });

    e.target.value = "";
  };

  const onSetRepresentativeImage = (image) => {
    setForm((prev) => ({
      ...prev,
      representativeImage: image,
    }));
  };

  const onRemoveFormImage = (image) => {
    setForm((prev) => {
      const nextImages = prev.images.filter((item) => item !== image);
      const nextRepresentative =
        prev.representativeImage === image
          ? nextImages[0] || ""
          : prev.representativeImage;

      return {
        ...prev,
        images: nextImages,
        representativeImage: nextRepresentative,
      };
    });
  };

  const onSearch = async () => {
    try {
      setLoading(true);
      setError("");

      const localItems = readLocalShops();

      const res = await shopApi.getList();

      const items =
        res?.items ||
        res?.data ||
        res?.shops ||
        res?.list ||
        [];

      const mergedItems = mergeShopLists(
        Array.isArray(items) ? items : [],
        localItems
      );

      setList(mergedItems);
      saveLocalShops(mergedItems);
    } catch (e) {
      const localItems = readLocalShops();

      if (isDbNotConnectedError(e)) {
        setError("");
        setList(localItems);
      } else {
        setError(localItems.length ? "" : e.message || "검색 실패");
        setList(localItems);
      }
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async () => {
    try {
      if (submitting) {
        return;
      }

      setSubmitting(true);

      const submitPayload = getSubmitPayload();
      const geocoded = await geocodeAddress(submitPayload.address);
      const payload = {
        ...submitPayload,
        ...(geocoded || {}),
      };

      const created = await shopApi.create(payload);
      const createdShop =
        created?.data ||
        created?.shop ||
        created?.item ||
        created ||
        payload;

      const nextShop = normalizeShopForStorage(
        {
          ...payload,
          ...createdShop,
        },
        list.length
      );

      const nextList = mergeShopLists(list, [nextShop]);

      setList(nextList);
      saveLocalShops(nextList);
      setForm(EMPTY_FORM);
      setEditingId("");

      await load();

      alert("업체 생성 완료");
    } catch (e) {
      const submitPayload = getSubmitPayload();
      const geocoded = await geocodeAddress(submitPayload.address);
      const localId = `local-shop-${Date.now()}`;
      const fallbackShop = normalizeShopForStorage(
        {
          ...submitPayload,
          ...(geocoded || {}),
          _id: localId,
          id: localId,
        },
        list.length
      );

      const nextList = mergeShopLists(list, [fallbackShop]);

      setList(nextList);
      saveLocalShops(nextList);
      setForm(EMPTY_FORM);
      setEditingId("");
      setError("");
      alert("업체 생성 완료");
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = (shop) => {
    const shopId = getShopId(shop);

    if (!shopId) {
      return;
    }

    setEditingId(shopId);
    setForm({
      name: shop?.name || "",
      address: shop?.address || "",
      courses: Array.isArray(shop?.courses) ? shop.courses : [],
      courseInput: "",
      price: Array.isArray(shop?.price)
        ? shop.price
        : shop?.price !== undefined && shop?.price !== null && shop?.price !== ""
        ? [shop.price]
        : [],
      priceInput: "",
      status: shop?.status || "active",
      isPremium: shop?.isPremium === true || shop?.premium === true,
      images: getShopImages(shop),
      representativeImage:
        getImageValue(shop?.representativeImage) ||
        getImageValue(shop?.mainImage) ||
        getImageValue(shop?.thumbnail) ||
        getImageValue(shop?.coverImage) ||
        getShopImages(shop)[0] ||
        "",
    });

    try {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  };

  const onCancelEdit = () => {
    setEditingId("");
    setForm(EMPTY_FORM);
  };

  const onUpdate = async () => {
    try {
      if (submitting || !editingId) {
        return;
      }

      setSubmitting(true);

      const oldShop = list.find((shop) => String(getShopId(shop)) === String(editingId)) || {};
      const submitPayload = getSubmitPayload();
      const geocoded = await geocodeAddress(submitPayload.address);

      const payload = {
        ...oldShop,
        ...submitPayload,
        ...(geocoded || {}),
        _id: oldShop?._id || editingId,
        id: oldShop?.id || editingId,
      };

      if (shopApi.update) {
        try {
          await shopApi.update(editingId, payload);
        } catch (e) {
          if (!isDbNotConnectedError(e)) {
            console.warn("SHOP UPDATE API ERROR:", e.message);
          }
        }
      }

      const nextList = list.map((shop, index) => {
        const shopId = getShopId(shop);

        if (String(shopId) === String(editingId)) {
          return normalizeShopForStorage(
            {
              ...shop,
              ...payload,
            },
            index
          );
        }

        return shop;
      });

      setList(nextList);
      saveLocalShops(nextList);
      setForm(EMPTY_FORM);
      setEditingId("");
      setError("");

      alert("업체 수정 완료");
    } catch (e) {
      setError(e.message || "수정 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (shop) => {
    const shopId = getShopId(shop);

    if (!shopId) {
      return;
    }

    const ok = window.confirm("업체를 삭제하시겠습니까?");

    if (!ok) {
      return;
    }

    try {
      if (shopApi.remove) {
        try {
          await shopApi.remove(shopId);
        } catch (e) {
          if (!isDbNotConnectedError(e)) {
            console.warn("SHOP DELETE API ERROR:", e.message);
          }
        }
      }

      const nextList = list.filter((item) => String(getShopId(item)) !== String(shopId));

      setList(nextList);
      saveLocalShops(nextList);

      if (String(editingId) === String(shopId)) {
        setEditingId("");
        setForm(EMPTY_FORM);
      }

      alert("업체 삭제 완료");
    } catch (e) {
      setError(e.message || "삭제 실패");
    }
  };

  const onToggleStatus = async (shop) => {
    const shopId = getShopId(shop);

    if (!shopId) {
      return;
    }

    const currentStatus = String(shop?.status || "active").toLowerCase();
    const nextStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      const payload = {
        ...shop,
        status: nextStatus,
        visible: nextStatus === "active",
        approved: nextStatus === "active",
      };

      if (shopApi.update) {
        try {
          await shopApi.update(shopId, payload);
        } catch (e) {
          if (!isDbNotConnectedError(e)) {
            console.warn("SHOP STATUS API ERROR:", e.message);
          }
        }
      }

      const nextList = list.map((item, index) => {
        if (String(getShopId(item)) === String(shopId)) {
          return normalizeShopForStorage(
            {
              ...item,
              ...payload,
            },
            index
          );
        }

        return item;
      });

      setList(nextList);
      saveLocalShops(nextList);
      alert(nextStatus === "active" ? "업체 활성화 완료" : "업체 비활성화 완료");
    } catch (e) {
      setError(e.message || "상태 변경 실패");
    }
  };

  const onTogglePremium = async (shop) => {
    const shopId = getShopId(shop);

    if (!shopId) {
      return;
    }

    const nextPremium = !(shop?.isPremium === true || shop?.premium === true);

    try {
      const payload = {
        ...shop,
        isPremium: nextPremium,
        premium: nextPremium,
      };

      if (shopApi.update) {
        try {
          await shopApi.update(shopId, payload);
        } catch (e) {
          if (!isDbNotConnectedError(e)) {
            console.warn("SHOP PREMIUM API ERROR:", e.message);
          }
        }
      }

      const nextList = list.map((item, index) => {
        if (String(getShopId(item)) === String(shopId)) {
          return normalizeShopForStorage(
            {
              ...item,
              ...payload,
            },
            index
          );
        }

        return item;
      });

      setList(nextList);
      saveLocalShops(nextList);
      alert(nextPremium ? "PREMIUM 활성화 완료" : "PREMIUM 비활성화 완료");
    } catch (e) {
      setError(e.message || "PREMIUM 변경 실패");
    }
  };

  const onAddCourse = () => {
    const value = String(form.courseInput || "").trim();

    if (!value) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      courses: [...prev.courses, value],
      courseInput: "",
    }));
  };

  const onRemoveCourse = (index) => {
    setForm((prev) => ({
      ...prev,
      courses: prev.courses.filter((_, idx) => idx !== index),
    }));
  };

  const onAddPrice = () => {
    const value = String(form.priceInput || "").trim();

    if (!value) {
      return;
    }

    const priceValue = Number(
      value
        .replaceAll(",", "")
        .replaceAll("원", "")
        .trim()
    );

    if (Number.isNaN(priceValue)) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      price: [...prev.price, priceValue],
      priceInput: "",
    }));
  };

  const onRemovePrice = (index) => {
    setForm((prev) => ({
      ...prev,
      price: prev.price.filter((_, idx) => idx !== index),
    }));
  };

  const filteredList = getFilteredList();

  if (loading) {
    return <Loading message="업체 목록 로딩 중..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={load}
      />
    );
  }

  return (
    <AdminLayout title="업체 관리">
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>업체 관리</h1>

          <p style={styles.desc}>
            업체명 / 주소 / 전화번호 / 영업시간 / 코스 / 금액 / 상태 / 사진 / 대표사진 / PREMIUM 관리
          </p>
        </div>

        <div style={styles.searchPanel}>
          <div style={styles.regionRow}>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setDistrict("구");
              }}
              style={styles.regionSelect}
            >
              {Object.keys(REGION_MAP).map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <select
              value={district}
              onChange={(e) =>
                setDistrict(e.target.value)
              }
              style={styles.regionSelect}
            >
              {(REGION_MAP[region] || ["구"]).map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>

          <div style={styles.searchRow}>
            <input
              value={keyword}
              onChange={(e) =>
                setKeyword(e.target.value)
              }
              placeholder="지역 / 업체명 / 전화번호 / 영업시간을 입력해주세요."
              style={styles.searchInput}
            />

            <button
              type="button"
              onClick={onSearch}
              style={styles.searchBtn}
            >
              검색
            </button>

            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setRegion("지역");
                setDistrict("구");
                load();
              }}
              style={styles.resetBtn}
            >
              초기화
            </button>
          </div>
        </div>

        <div style={styles.form}>
          <input
            name="name"
            placeholder="업체명"
            value={form.name}
            onChange={onChange}
            style={styles.input}
          />

          <input
            name="address"
            placeholder="주소"
            value={form.address}
            onChange={onChange}
            style={styles.input}
          />

          <div style={styles.photoPremiumRow}>
            <label style={styles.photoButton}>
              사진 등록
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onPhotoChange}
                style={styles.fileInput}
              />
            </label>

            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  isPremium: !prev.isPremium,
                }))
              }
              style={
                form.isPremium
                  ? styles.premiumActiveButton
                  : styles.premiumInactiveButton
              }
            >
              PREMIUM {form.isPremium ? "활성화" : "비활성화"}
            </button>

            <span style={styles.photoHelpText}>
              여러 장 선택 가능 / 아래 미리보기에서 대표 사진 선택
            </span>
          </div>

          {!!form.images.length && (
            <div style={styles.formPreviewRow}>
              {form.images.map((image, index) => (
                <div key={`${image}-${index}`} style={styles.formPreviewWrap}>
                  <img
                    src={image}
                    alt={`form-preview-${index}`}
                    style={styles.formPreviewImage}
                  />

                  {form.representativeImage === image && (
                    <span style={styles.representativeBadge}>
                      대표
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onSetRepresentativeImage(image)}
                    style={styles.representativeBtn}
                  >
                    대표
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveFormImage(image)}
                    style={styles.imageRemoveBtn}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={styles.formInlineRow}>
            <input
              name="courseInput"
              placeholder="코스 입력"
              value={form.courseInput}
              onChange={onChange}
              style={styles.input}
            />

            <button
              type="button"
              style={styles.smallGoldBtn}
              onClick={onAddCourse}
            >
              코스 등록
            </button>
          </div>

          {!!form.courses.length && (
            <div style={styles.tagRow}>
              {form.courses.map((item, index) => (
                <span key={`${item}-${index}`} style={styles.tag}>
                  {item}
                  <button
                    type="button"
                    style={styles.tagRemove}
                    onClick={() => onRemoveCourse(index)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={styles.formInlineRow}>
            <input
              name="priceInput"
              placeholder="금액 입력"
              value={form.priceInput}
              onChange={onChange}
              style={styles.input}
            />

            <button
              type="button"
              style={styles.smallGoldBtn}
              onClick={onAddPrice}
            >
              금액 등록
            </button>
          </div>

          {!!form.price.length && (
            <div style={styles.tagRow}>
              {form.price.map((item, index) => (
                <span key={`${item}-${index}`} style={styles.tag}>
                  {Number(item || 0).toLocaleString()}원
                  <button
                    type="button"
                    style={styles.tagRemove}
                    onClick={() => onRemovePrice(index)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <select
            name="status"
            value={form.status}
            onChange={onChange}
            style={styles.input}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>

          {editingId ? (
            <div style={styles.formButtonRow}>
              <button
                type="button"
                style={styles.updateBtn}
                onClick={onUpdate}
                disabled={submitting}
              >
                {submitting ? "처리 중..." : "업체 수정 완료"}
              </button>

              <button
                type="button"
                style={styles.resetBtn}
                onClick={onCancelEdit}
                disabled={submitting}
              >
                수정 취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              style={styles.createBtn}
              onClick={onCreate}
              disabled={submitting}
            >
              {submitting ? "처리 중..." : "업체 생성"}
            </button>
          )}
        </div>

        {!filteredList.length ? (
          <EmptyState message="등록된 업체가 없습니다." />
        ) : (
          <div style={styles.list}>
            {filteredList.map((shop) => {
              const todayKey = getTodayKey();

              const dailyCalls =
                shop?.dailyCalls || {};

              const dailyClicks =
                shop?.dailyClicks || {};

              const dailyConversions =
                shop?.dailyConversions || {};

              const dailyReviews =
                shop?.dailyReviews || {};

              const todayCallCount = Number(
                dailyCalls[todayKey] || 0
              );

              const todayClickCount = Number(
                dailyClicks[todayKey] || 0
              );

              const todayConversionCount = Number(
                dailyConversions[todayKey] || 0
              );

              const todayReviewCount = Number(
                dailyReviews[todayKey] || 0
              );

              const monthlyCallCount =
                getMonthlyValue(dailyCalls);

              const monthlyClickCount =
                getMonthlyValue(dailyClicks);

              const monthlyConversionCount =
                getMonthlyValue(
                  dailyConversions
                );

              const monthlyReviewCount =
                getMonthlyValue(
                  dailyReviews
                );

              const shopImages = getShopImages(shop);

              const representativeImage =
                getImageValue(shop?.representativeImage) ||
                getImageValue(shop?.mainImage) ||
                getImageValue(shop?.thumbnail) ||
                getImageValue(shop?.coverImage) ||
                shopImages[0] ||
                "";

              const shopId = getShopId(shop);

              const isPremiumActive =
                shop?.isPremium === true || shop?.premium === true;

              return (
                <div key={shopId || shop?.name}>
                  <div style={styles.card}>
                    <div style={styles.cardTop}>
                      <div>
                        {!!shopImages.length && (
                          <div style={styles.previewRow}>
                            {shopImages.slice(0, 4).map((image, index) => (
                              <div key={`${image}-${index}`} style={styles.previewWrap}>
                                <img
                                  src={image}
                                  alt={`${shop?.name || "shop"}-${index}`}
                                  style={styles.previewImage}
                                />

                                {representativeImage === image && (
                                  <span style={styles.representativeBadge}>
                                    대표
                                  </span>
                                )}

                                {isPremiumActive && index === 0 && (
                                  <span style={styles.premiumImageBadge}>
                                    PREMIUM
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={styles.shopName}>
                          {shop?.name ||
                            "업체명 없음"}
                        </div>

                        <div style={styles.address}>
                          {shop?.address ||
                            "주소 없음"}
                        </div>
                      </div>

                      <div style={styles.statusColumn}>
                        <div style={styles.status}>
                          {shop?.status ||
                            "active"}
                        </div>

                        <div
                          style={
                            isPremiumActive
                              ? styles.premiumActiveBadge
                              : styles.premiumInactiveBadge
                          }
                        >
                          {isPremiumActive ? "PREMIUM 활성화" : "PREMIUM 비활성"}
                        </div>
                      </div>
                    </div>

                    <div style={styles.section}>
                      <strong>전화번호:</strong>{" "}
                      {shop?.phone || shop?.virtualPhone || "-"}
                    </div>

                    <div style={styles.section}>
                      <strong>영업시간:</strong>{" "}
                      {shop?.businessHours || "-"}
                    </div>

                    <div style={styles.section}>
                      <strong>코스:</strong>{" "}
                      {Array.isArray(
                        shop?.courses
                      )
                        ? shop.courses.join(", ")
                        : "-"}
                    </div>

                    <div style={styles.section}>
                      <strong>금액:</strong>{" "}
                      {Array.isArray(
                        shop?.price
                      )
                        ? shop.price
                            .map(
                              (v) =>
                                `${Number(
                                  v
                                ).toLocaleString()}원`
                            )
                            .join(", ")
                        : `${Number(
                            shop?.price || 0
                          ).toLocaleString()}원`}
                    </div>

                    <div style={styles.actionRow}>
                      <button
                        type="button"
                        style={styles.editBtn}
                        onClick={() => onEdit(shop)}
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        style={styles.deleteBtn}
                        onClick={() => onDelete(shop)}
                      >
                        삭제
                      </button>

                      <button
                        type="button"
                        style={styles.statusBtn}
                        onClick={() => onToggleStatus(shop)}
                      >
                        {String(shop?.status || "active").toLowerCase() === "active"
                          ? "비활성화"
                          : "활성화"}
                      </button>

                      <button
                        type="button"
                        style={isPremiumActive ? styles.premiumOffBtn : styles.premiumOnBtn}
                        onClick={() => onTogglePremium(shop)}
                      >
                        {isPremiumActive ? "PREMIUM 비활성" : "PREMIUM 활성화"}
                      </button>
                    </div>
                  </div>

                  <div style={styles.statsBox}>
                    <div style={styles.statsHeader}>
                      <div style={styles.statsTitle}>
                        업체 통계 분석
                      </div>

                      <div style={styles.statsDateRow}>
                        <input
                          type="date"
                          value={statsStartDate}
                          onChange={(e) =>
                            setStatsStartDate(
                              e.target.value
                            )
                          }
                          style={styles.dateInput}
                        />

                        <input
                          type="date"
                          value={statsEndDate}
                          onChange={(e) =>
                            setStatsEndDate(
                              e.target.value
                            )
                          }
                          style={styles.dateInput}
                        />
                      </div>
                    </div>

                    <div style={styles.statsGrid}>
                      <div style={styles.statsCard}>
                        <div style={styles.statsLabel}>
                          일일 콜수
                        </div>

                        <div style={styles.statsValue}>
                          {todayCallCount}
                        </div>

                        <div style={styles.statsMonth}>
                          월간: {monthlyCallCount}
                        </div>
                      </div>

                      <div style={styles.statsCard}>
                        <div style={styles.statsLabel}>
                          일일 클릭수
                        </div>

                        <div style={styles.statsValue}>
                          {todayClickCount}
                        </div>

                        <div style={styles.statsMonth}>
                          월간: {monthlyClickCount}
                        </div>
                      </div>

                      <div style={styles.statsCard}>
                        <div style={styles.statsLabel}>
                          일일 전환수
                        </div>

                        <div style={styles.statsValue}>
                          {todayConversionCount}
                        </div>

                        <div style={styles.statsMonth}>
                          월간: {monthlyConversionCount}
                        </div>
                      </div>

                      <div style={styles.statsCard}>
                        <div style={styles.statsLabel}>
                          일일 리뷰수
                        </div>

                        <div style={styles.statsValue}>
                          {todayReviewCount}
                        </div>

                        <div style={styles.statsMonth}>
                          월간: {monthlyReviewCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
  },

  header: {
    marginBottom: 20,
  },

  title: {
    margin: 0,
    color: "#d4af37",
    fontSize: 28,
  },

  desc: {
    marginTop: 8,
    color: "#999",
  },

  searchPanel: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },

  regionRow: {
    display: "flex",
    gap: 10,
    marginBottom: 10,
  },

  regionSelect: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    border: "1px solid #444",
    background: "#000",
    color: "#d4af37",
  },

  searchRow: {
    display: "flex",
    gap: 10,
  },

  searchInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
  },

  searchBtn: {
    padding: "12px 18px",
    borderRadius: 8,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
  },

  resetBtn: {
    padding: "12px 18px",
    borderRadius: 8,
    border: "1px solid #444",
    background: "#222",
    color: "#fff",
  },

  form: {
    display: "grid",
    gap: 10,
    marginBottom: 30,
    background: "#111",
    border: "1px solid #333",
    padding: 16,
    borderRadius: 10,
  },

  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
  },

  photoPremiumRow: {
    display: "grid",
    gridTemplateColumns: "120px 190px 1fr",
    gap: 10,
    alignItems: "center",
  },

  photoButton: {
    height: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "none",
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
  },

  fileInput: {
    display: "none",
  },

  photoHelpText: {
    color: "#aaa",
    fontSize: 13,
  },

  premiumActiveButton: {
    height: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #ff006e",
    borderRadius: 8,
    background: "#ff006e",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 0 12px rgba(255,0,110,0.45)",
  },

  premiumInactiveButton: {
    height: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #444",
    borderRadius: 8,
    background: "#000",
    color: "#d4af37",
    fontWeight: "bold",
    cursor: "pointer",
  },

  premiumLabel: {
    height: 44,
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #333",
    borderRadius: 8,
    background: "#000",
    padding: "0 12px",
    cursor: "pointer",
  },

  premiumCheckbox: {
    width: 18,
    height: 18,
    accentColor: "#ff006e",
    cursor: "pointer",
  },

  premiumText: {
    color: "#ff4fa3",
    fontWeight: "bold",
  },

  formPreviewRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    padding: 10,
    border: "1px solid #222",
    borderRadius: 8,
    background: "#050505",
  },

  formPreviewWrap: {
    position: "relative",
    width: 120,
    height: 90,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #333",
    background: "#000",
  },

  formPreviewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  representativeBtn: {
    position: "absolute",
    right: 5,
    bottom: 5,
    border: "none",
    borderRadius: 4,
    background: "#d4af37",
    color: "#000",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
    padding: "3px 5px",
  },

  imageRemoveBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    border: "none",
    borderRadius: "50%",
    background: "rgba(244, 67, 54, 0.95)",
    color: "#fff",
    fontSize: 14,
    lineHeight: "22px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  formInlineRow: {
    display: "grid",
    gridTemplateColumns: "1fr 120px",
    gap: 10,
  },

  formButtonRow: {
    display: "flex",
    gap: 10,
  },

  createBtn: {
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: "#d4af37",
    color: "#000",
    fontWeight: "bold",
  },

  updateBtn: {
    flex: 1,
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: "#1b5e20",
    color: "#fff",
    fontWeight: "bold",
  },

  smallGoldBtn: {
    padding: "0 14px",
    border: "none",
    borderRadius: 8,
    background: "#6b5600",
    color: "#fff",
    fontWeight: "bold",
  },

  tagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 8,
    background: "#151515",
    color: "#ddd",
    border: "1px solid #222",
  },

  tagRemove: {
    border: "none",
    background: "transparent",
    color: "#f44336",
    cursor: "pointer",
    fontSize: 16,
  },

  list: {
    display: "grid",
    gap: 20,
  },

  card: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 10,
    padding: 16,
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 16,
  },

  previewRow: {
    display: "flex",
    gap: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  },

  previewWrap: {
    position: "relative",
    width: 122,
    height: 90,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #333",
    background: "#000",
  },

  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  representativeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    background: "#d4af37",
    color: "#000",
    borderRadius: 4,
    padding: "3px 6px",
    fontSize: 12,
    fontWeight: "bold",
  },

  premiumImageBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    background: "#ff006e",
    color: "#fff",
    borderRadius: 4,
    padding: "3px 6px",
    fontSize: 11,
    fontWeight: "bold",
    boxShadow: "0 0 8px rgba(255,0,110,0.55)",
  },

  shopName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#d4af37",
  },

  address: {
    marginTop: 4,
    color: "#aaa",
    fontSize: 13,
  },

  statusColumn: {
    display: "grid",
    gap: 8,
    justifyItems: "end",
  },

  status: {
    color: "#4caf50",
  },

  premiumActiveBadge: {
    color: "#ff4fa3",
    border: "1px solid rgba(255,0,110,0.65)",
    background: "rgba(255,0,110,0.12)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: "bold",
    boxShadow: "0 0 10px rgba(255,0,110,0.22)",
  },

  premiumInactiveBadge: {
    color: "#777",
    border: "1px solid #333",
    background: "#000",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: "bold",
  },

  section: {
    marginTop: 8,
    color: "#ddd",
  },

  actionRow: {
    display: "flex",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
  },

  editBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    background: "#2196f3",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  deleteBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    background: "#f44336",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  statusBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    background: "#ff9800",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  premiumOnBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    background: "#ff006e",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  premiumOffBtn: {
    padding: "10px 16px",
    border: "1px solid #ff006e",
    borderRadius: 8,
    background: "#1a0010",
    color: "#ff7fbd",
    fontWeight: "bold",
    cursor: "pointer",
  },

  statsBox: {
    marginTop: 10,
    background: "#111",
    border: "1px solid #d4af37",
    borderRadius: 10,
    padding: 16,
  },

  statsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
    flexWrap: "wrap",
  },

  statsTitle: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "bold",
  },

  statsDateRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  dateInput: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },

  statsCard: {
    background: "#000",
    border: "1px solid #333",
    borderRadius: 10,
    padding: 18,
  },

  statsLabel: {
    color: "#aaa",
    marginBottom: 8,
    fontSize: 14,
  },

  statsValue: {
    color: "#d4af37",
    fontSize: 32,
    fontWeight: "bold",
  },

  statsMonth: {
    marginTop: 10,
    color: "#fff",
    fontSize: 14,
  },
};

export default ShopAdminPage;