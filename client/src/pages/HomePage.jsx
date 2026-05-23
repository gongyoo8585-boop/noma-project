"use strict";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

const GOLD = "#ffd400";
const GOLD_DARK = "#a77c00";
const PINK = "#ff006e";

const DEFAULT_LAT = 35.2613;
const DEFAULT_LNG = 128.871;

const LOCAL_SHOP_KEY = "noma_admin_shops";
const LOCAL_PUBLIC_SHOP_KEY = "noma_local_shops";
const LOCAL_KARAOKE_SHOP_KEY = "noma_admin_shops_karaoke";
const LOCAL_PUBLIC_KARAOKE_SHOP_KEY = "noma_local_shops_karaoke";
const LOCAL_ADMIN_KARAOKE_SHOP_KEY = "noma_admin_karaoke_shops";
const LOCAL_PUBLIC_ADMIN_KARAOKE_SHOP_KEY = "noma_public_karaoke_shops";

const REGION_TABS = ["전체", "서울", "경기", "부산", "대구", "인천", "광주", "대전"];

const PROVINCE_OPTIONS = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경상남도",
  "제주",
];

const CITY_OPTIONS_MAP = {
  서울: ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"],
  부산: ["강서구", "금정구", "기장군", "남구", "동구", "동래구", "부산진구", "북구", "사상구", "사하구", "서구", "수영구", "연제구", "영도구", "중구", "해운대구"],
  대구: ["군위군", "남구", "달서구", "달성군", "동구", "북구", "서구", "수성구", "중구"],
  인천: ["강화군", "계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "옹진군", "중구"],
  광주: ["광산구", "남구", "동구", "북구", "서구"],
  대전: ["대덕구", "동구", "서구", "유성구", "중구"],
  울산: ["남구", "동구", "북구", "울주군", "중구"],
  세종: ["세종"],
  경기: ["가평군", "고양시", "과천시", "광명시", "광주시", "구리시", "군포시", "김포시", "남양주시", "동두천시", "부천시", "성남시", "수원시", "시흥시", "안산시", "안성시", "안양시", "양주시", "양평군", "여주시", "연천군", "오산시", "용인시", "의왕시", "의정부시", "이천시", "파주시", "평택시", "포천시", "하남시", "화성시"],
  강원: ["강릉시", "고성군", "동해시", "삼척시", "속초시", "양구군", "양양군", "영월군", "원주시", "인제군", "정선군", "철원군", "춘천시", "태백시", "평창군", "홍천군", "화천군", "횡성군"],
  충북: ["괴산군", "단양군", "보은군", "영동군", "옥천군", "음성군", "제천시", "증평군", "진천군", "청주시", "충주시"],
  충남: ["계룡시", "공주시", "금산군", "논산시", "당진시", "보령시", "부여군", "서산시", "서천군", "아산시", "예산군", "천안시", "청양군", "태안군", "홍성군"],
  전북: ["고창군", "군산시", "김제시", "남원시", "무주군", "부안군", "순창군", "완주군", "익산시", "임실군", "장수군", "전주시", "정읍시", "진안군"],
  전남: ["강진군", "고흥군", "곡성군", "광양시", "구례군", "나주시", "담양군", "목포시", "무안군", "보성군", "순천시", "신안군", "여수시", "영광군", "영암군", "완도군", "장성군", "장흥군", "진도군", "함평군", "해남군", "화순군"],
  경북: ["경산시", "경주시", "고령군", "구미시", "김천시", "문경시", "봉화군", "상주시", "성주군", "안동시", "영덕군", "영양군", "영주시", "영천시", "예천군", "울릉군", "울진군", "의성군", "청도군", "청송군", "칠곡군", "포항시"],
  경상남도: ["김해시", "창원시", "진주시", "양산시", "거제시", "통영시", "사천시", "밀양시", "남해군", "함안군", "창녕군", "하동군", "산청군", "거창군", "고성군", "의령군", "함양군", "합천군"],
  제주: ["서귀포시", "제주시"],
};

const DISTRICT_OPTIONS_MAP = {
  김해시: [
    "전체동(읍면)",
    "삼계동",
    "내동",
    "외동",
    "부원동",
    "동상동",
    "회현동",
    "북부동",
    "활천동",
    "삼안동",
    "불암동",
    "장유동",
    "진영읍",
    "주촌면",
    "진례면",
    "한림면",
    "생림면",
    "상동면",
    "대동면",
  ],
};

const ALL_CITY_OPTIONS = Object.values(CITY_OPTIONS_MAP).flat();
const ALL_DISTRICT_OPTIONS = Object.values(DISTRICT_OPTIONS_MAP).flat();

const getCityOptions = (province) =>
  CITY_OPTIONS_MAP[province] && CITY_OPTIONS_MAP[province].length > 0
    ? CITY_OPTIONS_MAP[province]
    : ["전체"];

const getDistrictOptions = (city) =>
  DISTRICT_OPTIONS_MAP[city] && DISTRICT_OPTIONS_MAP[city].length > 0
    ? DISTRICT_OPTIONS_MAP[city]
    : ["전체동(읍면)"];

const PREMIUM_SHOPS = [];

function normalizeImageArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();

    if (!text) return [];

    if (text.startsWith("data:image/")) {
      return [text];
    }

    return text
      .split(",")
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeProvinceName(value = "") {
  const text = String(value || "").trim();

  if (!text) return "";

  if (text === "경남") return "경상남도";
  if (text === "경북") return "경북";
  if (text === "전북") return "전북";
  if (text === "전남") return "전남";
  if (text === "충북") return "충북";
  if (text === "충남") return "충남";

  return text;
}

function getProvinceFromAddress(address = "") {
  const text = String(address || "");

  if (text.includes("경상남도") || text.includes("경남")) return "경상남도";
  if (text.includes("서울")) return "서울";
  if (text.includes("부산")) return "부산";
  if (text.includes("대구")) return "대구";
  if (text.includes("인천")) return "인천";
  if (text.includes("광주")) return "광주";
  if (text.includes("대전")) return "대전";
  if (text.includes("울산")) return "울산";
  if (text.includes("세종")) return "세종";
  if (text.includes("경기")) return "경기";
  if (text.includes("강원")) return "강원";
  if (text.includes("충북") || text.includes("충청북도")) return "충북";
  if (text.includes("충남") || text.includes("충청남도")) return "충남";
  if (text.includes("전북") || text.includes("전라북도")) return "전북";
  if (text.includes("전남") || text.includes("전라남도")) return "전남";
  if (text.includes("경북") || text.includes("경상북도")) return "경북";
  if (text.includes("제주")) return "제주";

  return "";
}

function getCityFromAddress(address = "") {
  const match = String(address || "").match(/[가-힣]+(시|군|구)/);

  return match ? match[0] : "";
}

function normalizeHomeShop(shop, index = 0) {
  const images = [];

  [
    ...normalizeImageArray(shop?.images),
    ...normalizeImageArray(shop?.photos),
    ...normalizeImageArray(shop?.imageUrls),
    ...normalizeImageArray(shop?.image),
    ...normalizeImageArray(shop?.representativeImage),
    ...normalizeImageArray(shop?.mainImage),
    ...normalizeImageArray(shop?.thumbnail),
    ...normalizeImageArray(shop?.coverImage),
  ].forEach((image) => {
    if (image && !images.includes(image)) {
      images.push(image);
    }
  });

  const address = String(shop?.address || shop?.roadAddress || shop?.locationText || "").trim();
  const representativeImage =
    shop?.representativeImage ||
    shop?.mainImage ||
    shop?.thumbnail ||
    shop?.coverImage ||
    shop?.image ||
    images[0] ||
    "";

  const normalizedType = isKaraokeShop(shop) ? "karaoke" : "massage";
  const id = shop?._id || shop?.id || `home-shop-${index}`;
  const province = normalizeProvinceName(
    shop?.province || shop?.region || getProvinceFromAddress(address)
  );
  const city = shop?.city || shop?.district || getCityFromAddress(address);
  const district = shop?.dong || shop?.neighborhood || getDongFromAddress(address);

  return {
    ...shop,
    _id: id,
    id,
    type: normalizedType,
    premium: shop?.premium === true || shop?.isPremium === true,
    isPremium: shop?.premium === true || shop?.isPremium === true,
    title: shop?.title || shop?.name || shop?.shopName || "업체명 없음",
    name: shop?.name || shop?.shopName || shop?.title || "업체명 없음",
    address,
    province,
    region: province,
    city,
    district,
    course:
      Array.isArray(shop?.courses) && shop.courses[0]
        ? String(shop.courses[0])
        : shop?.course || "관리 60분",
    courses: Array.isArray(shop?.courses) ? shop.courses : [shop?.course].filter(Boolean),
    price: Array.isArray(shop?.price)
      ? shop.price
      : shop?.price !== undefined && shop?.price !== null && shop?.price !== ""
      ? [shop.price]
      : [],
    originalPrice: Array.isArray(shop?.originalPrice)
      ? shop.originalPrice
      : shop?.originalPrice !== undefined && shop?.originalPrice !== null && shop?.originalPrice !== ""
      ? [shop.originalPrice]
      : [],
    sale: getSaleText(shop),
    original: getOriginalText(shop),
    discount: getDiscountText(shop),
    rating: String(shop?.rating || shop?.ratingAvg || shop?.avgRating || "4.9"),
    review: String(shop?.review || shop?.reviewCount || shop?.reviewsCount || "0"),
    representativeImage,
    mainImage: representativeImage,
    thumbnail: representativeImage,
    coverImage: representativeImage,
    image: representativeImage,
    images: images.length ? images : representativeImage ? [representativeImage] : [],
    photos: images.length ? images : representativeImage ? [representativeImage] : [],
    imageUrls: images.length ? images : representativeImage ? [representativeImage] : [],
    lat: Number(shop?.lat || shop?.latitude || shop?.location?.lat || DEFAULT_LAT),
    lng: Number(shop?.lng || shop?.longitude || shop?.location?.lng || DEFAULT_LNG),
    location: {
      lat: Number(shop?.lat || shop?.latitude || shop?.location?.lat || DEFAULT_LAT),
      lng: Number(shop?.lng || shop?.longitude || shop?.location?.lng || DEFAULT_LNG),
    },
  };
}

function getDongFromAddress(address = "") {
  const match = String(address || "").match(/[가-힣]+(동|읍|면)/);

  return match ? match[0] : "";
}

function getSaleText(shop) {
  const price = Array.isArray(shop?.price) ? shop.price[0] : shop?.price;

  if (price !== undefined && price !== null && price !== "") {
    return `${Number(price || 0).toLocaleString()}원`;
  }

  return shop?.sale || "50,000원";
}

function getOriginalText(shop) {
  const originalPrice = Array.isArray(shop?.originalPrice)
    ? shop.originalPrice[0]
    : shop?.originalPrice;

  if (originalPrice !== undefined && originalPrice !== null && originalPrice !== "") {
    return `${Number(originalPrice || 0).toLocaleString()}원`;
  }

  return shop?.original || "80,000원";
}

function getDiscountText(shop) {
  if (shop?.discount) return shop.discount;

  const price = Array.isArray(shop?.price) ? Number(shop.price[0] || 0) : Number(shop?.price || 0);
  const originalPrice = Array.isArray(shop?.originalPrice)
    ? Number(shop.originalPrice[0] || 0)
    : Number(shop?.originalPrice || 0);

  if (price > 0 && originalPrice > price) {
    return `${Math.round(((originalPrice - price) / originalPrice) * 100)}%`;
  }

  return "39%";
}

function readLocalHomeShops() {
  try {
    const adminSaved = JSON.parse(localStorage.getItem(LOCAL_SHOP_KEY) || "[]");
    const publicSaved = JSON.parse(localStorage.getItem(LOCAL_PUBLIC_SHOP_KEY) || "[]");
    const karaokeSaved = JSON.parse(localStorage.getItem(LOCAL_KARAOKE_SHOP_KEY) || "[]");
    const publicKaraokeSaved = JSON.parse(localStorage.getItem(LOCAL_PUBLIC_KARAOKE_SHOP_KEY) || "[]");
    const adminKaraokeSaved = JSON.parse(localStorage.getItem(LOCAL_ADMIN_KARAOKE_SHOP_KEY) || "[]");
    const publicAdminKaraokeSaved = JSON.parse(localStorage.getItem(LOCAL_PUBLIC_ADMIN_KARAOKE_SHOP_KEY) || "[]");

    const adminSession = JSON.parse(sessionStorage.getItem(LOCAL_SHOP_KEY) || "[]");
    const publicSession = JSON.parse(sessionStorage.getItem(LOCAL_PUBLIC_SHOP_KEY) || "[]");
    const karaokeSession = JSON.parse(sessionStorage.getItem(LOCAL_KARAOKE_SHOP_KEY) || "[]");
    const publicKaraokeSession = JSON.parse(sessionStorage.getItem(LOCAL_PUBLIC_KARAOKE_SHOP_KEY) || "[]");
    const adminKaraokeSession = JSON.parse(sessionStorage.getItem(LOCAL_ADMIN_KARAOKE_SHOP_KEY) || "[]");
    const publicAdminKaraokeSession = JSON.parse(sessionStorage.getItem(LOCAL_PUBLIC_ADMIN_KARAOKE_SHOP_KEY) || "[]");

    return [
      ...(Array.isArray(adminSaved) ? adminSaved : []),
      ...(Array.isArray(publicSaved) ? publicSaved : []),
      ...(Array.isArray(karaokeSaved) ? karaokeSaved : []),
      ...(Array.isArray(publicKaraokeSaved) ? publicKaraokeSaved : []),
      ...(Array.isArray(adminKaraokeSaved) ? adminKaraokeSaved : []),
      ...(Array.isArray(publicAdminKaraokeSaved) ? publicAdminKaraokeSaved : []),
      ...(Array.isArray(adminSession) ? adminSession : []),
      ...(Array.isArray(publicSession) ? publicSession : []),
      ...(Array.isArray(karaokeSession) ? karaokeSession : []),
      ...(Array.isArray(publicKaraokeSession) ? publicKaraokeSession : []),
      ...(Array.isArray(adminKaraokeSession) ? adminKaraokeSession : []),
      ...(Array.isArray(publicAdminKaraokeSession) ? publicAdminKaraokeSession : []),
    ];
  } catch (e) {
    return [];
  }
}

function mergeHomeShopLists(baseList = [], nextList = []) {
  const map = new Map();

  [...baseList, ...nextList].forEach((shop, index) => {
    const normalized = normalizeHomeShop(shop, index);
    const key = String(normalized?._id || normalized?.id || normalized?.name || index);

    if (!map.has(key)) {
      map.set(key, normalized);
      return;
    }

    const prev = map.get(key);

    map.set(key, {
      ...prev,
      ...normalized,
      premium: prev.premium === true || normalized.premium === true,
      isPremium: prev.isPremium === true || normalized.isPremium === true,
      representativeImage:
        normalized.representativeImage ||
        prev.representativeImage ||
        "",
      mainImage:
        normalized.mainImage ||
        prev.mainImage ||
        "",
      thumbnail:
        normalized.thumbnail ||
        prev.thumbnail ||
        "",
      coverImage:
        normalized.coverImage ||
        prev.coverImage ||
        "",
      image:
        normalized.image ||
        prev.image ||
        "",
      images:
        normalized.images && normalized.images.length
          ? normalized.images
          : prev.images || [],
      photos:
        normalized.photos && normalized.photos.length
          ? normalized.photos
          : prev.photos || [],
      imageUrls:
        normalized.imageUrls && normalized.imageUrls.length
          ? normalized.imageUrls
          : prev.imageUrls || [],
    });
  });

  return Array.from(map.values());
}

function getShopImage(shop) {
  return (
    shop?.representativeImage ||
    shop?.mainImage ||
    shop?.thumbnail ||
    shop?.coverImage ||
    shop?.image ||
    (Array.isArray(shop?.images) ? shop.images[0] : "") ||
    (Array.isArray(shop?.photos) ? shop.photos[0] : "") ||
    (Array.isArray(shop?.imageUrls) ? shop.imageUrls[0] : "") ||
    ""
  );
}

function isKaraokeShop(shop) {
  const typeText = String(shop?.type || shop?.category || shop?.businessType || "").toLowerCase();
  const titleText = String(shop?.title || shop?.name || shop?.shopName || "");

  return (
    typeText.includes("karaoke") ||
    typeText.includes("노래") ||
    typeText.includes("가라오케") ||
    titleText.includes("노래") ||
    titleText.includes("가라오케") ||
    titleText.includes("파티룸")
  );
}

function isMassageShop(shop) {
  return !isKaraokeShop(shop);
}

function HomePage() {
  const navigate = useNavigate();

  const getSavedAuthToken = () =>
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("local-admin-token") ||
    sessionStorage.getItem("adminToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("jwt") ||
    sessionStorage.getItem("local-admin-token") ||
    "";

  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getSavedAuthToken());

  const [userLocation, setUserLocation] = useState({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });

  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [selectedProvince, setSelectedProvince] = useState("경상남도");
  const [selectedCity, setSelectedCity] = useState("김해시");
  const [selectedDistrict, setSelectedDistrict] = useState("전체동(읍면)");
  const [localPremiumShops, setLocalPremiumShops] = useState([]);

  useEffect(() => {
    const syncAuthState = () => {
      setIsLoggedIn(!!getSavedAuthToken());
    };

    syncAuthState();

    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);
    window.addEventListener("auth-updated", syncAuthState);
    window.addEventListener("popstate", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
      window.removeEventListener("auth-updated", syncAuthState);
      window.removeEventListener("popstate", syncAuthState);
    };
  }, []);

  useEffect(() => {
    const syncLocalPremiumShops = () => {
      const nextLocalShops = readLocalHomeShops()
        .map((shop, index) => normalizeHomeShop(shop, index))
        .filter((shop) => shop.premium === true);

      setLocalPremiumShops(nextLocalShops);
    };

    syncLocalPremiumShops();

    window.addEventListener("storage", syncLocalPremiumShops);
    window.addEventListener("shops-updated", syncLocalPremiumShops);

    return () => {
      window.removeEventListener("storage", syncLocalPremiumShops);
      window.removeEventListener("shops-updated", syncLocalPremiumShops);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const queryLat = Number(params.get("lat"));
    const queryLng = Number(params.get("lng"));
    const queryRegion = params.get("region");
    const queryProvince = params.get("province");
    const queryCity = params.get("city");
    const queryDistrict = params.get("district");

    if (queryRegion && REGION_TABS.includes(queryRegion)) {
      setSelectedRegion(queryRegion);
    }

    if (queryProvince && PROVINCE_OPTIONS.includes(queryProvince)) {
      setSelectedProvince(queryProvince);
    }

    if (queryCity && ALL_CITY_OPTIONS.includes(queryCity)) {
      setSelectedCity(queryCity);
    }

    if (queryDistrict && ALL_DISTRICT_OPTIONS.includes(queryDistrict)) {
      setSelectedDistrict(queryDistrict);
    }

    if (Number.isFinite(queryLat) && Number.isFinite(queryLng)) {
      setUserLocation({
        lat: queryLat,
        lng: queryLng,
      });
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setUserLocation({
          lat: DEFAULT_LAT,
          lng: DEFAULT_LNG,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 4500,
        maximumAge: 60000,
      }
    );
  }, []);

  const sortedPremiumShops = useMemo(() => {
    const premiumOnlyShops = mergeHomeShopLists(PREMIUM_SHOPS, localPremiumShops)
      .map((shop, index) => normalizeHomeShop(shop, index))
      .filter((shop) => shop.premium === true);

    const regionFilteredShops =
      selectedRegion === "전체"
        ? premiumOnlyShops
        : premiumOnlyShops.filter(
            (shop) =>
              shop.region === selectedRegion ||
              shop.province === selectedRegion ||
              normalizeProvinceName(shop.region) === normalizeProvinceName(selectedRegion) ||
              normalizeProvinceName(shop.province) === normalizeProvinceName(selectedRegion)
          );

    const areaFilteredShops = regionFilteredShops.filter((shop) => {
      const provinceMatched =
        !selectedProvince ||
        normalizeProvinceName(shop.province) === normalizeProvinceName(selectedProvince) ||
        normalizeProvinceName(shop.region) === normalizeProvinceName(selectedProvince);
      const cityMatched = !selectedCity || selectedCity === "전체" || shop.city === selectedCity;
      const districtMatched =
        selectedDistrict === "전체동(읍면)" || shop.district === selectedDistrict;

      return provinceMatched && cityMatched && districtMatched;
    });

    return areaFilteredShops
      .map((shop) => ({
        ...shop,
        representativeImage: getShopImage(shop),
        distanceKm: getDistanceKm(
          userLocation.lat,
          userLocation.lng,
          shop.lat,
          shop.lng
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [userLocation, selectedRegion, selectedProvince, selectedCity, selectedDistrict, localPremiumShops]);

  const displayedPremiumShops = useMemo(() => {
    const massageShops = sortedPremiumShops
      .filter((shop) => isMassageShop(shop))
      .slice(0, 3)
      .map((shop, index) => ({
        ...shop,
        premiumSlotColumn: `${index + 1} / ${index + 2}`,
      }));

    const karaokeShops = sortedPremiumShops
      .filter((shop) => isKaraokeShop(shop))
      .slice(0, 3)
      .map((shop, index) => ({
        ...shop,
        premiumSlotColumn: `${index + 4} / ${index + 5}`,
      }));

    return [...massageShops, ...karaokeShops];
  }, [sortedPremiumShops]);

  const handleProvinceChange = (event) => {
    const value = event.target.value;
    const nextCity = getCityOptions(value)[0] || "전체";
    const nextDistrict = "전체동(읍면)";

    setSelectedProvince(value);
    setSelectedCity(nextCity);
    setSelectedDistrict(nextDistrict);

    const params = new URLSearchParams(window.location.search);
    params.set("province", value);
    params.set("city", nextCity);
    params.delete("district");

    const queryString = params.toString();

    window.history.replaceState(
      null,
      "",
      queryString ? `?${queryString}` : window.location.pathname
    );
  };

  const handleCityChange = (event) => {
    const value = event.target.value;

    setSelectedCity(value);
    setSelectedDistrict("전체동(읍면)");

    const params = new URLSearchParams(window.location.search);
    params.set("city", value);
    params.delete("district");

    const queryString = params.toString();

    window.history.replaceState(
      null,
      "",
      queryString ? `?${queryString}` : window.location.pathname
    );
  };

  const handleDistrictChange = (event) => {
    const value = event.target.value;

    setSelectedDistrict(value);

    const params = new URLSearchParams(window.location.search);

    if (value === "전체동(읍면)") {
      params.delete("district");
    } else {
      params.set("district", value);
    }

    const queryString = params.toString();

    window.history.replaceState(
      null,
      "",
      queryString ? `?${queryString}` : window.location.pathname
    );
  };

  const handleShopCardClick = (shop) => {
    if (!shop) return;

    const id = shop._id || shop.id;

    if (!id) return;

    const selectedShop = {
      ...shop,
      _id: id,
      id,
      name: shop.name || shop.title,
      shopName: shop.name || shop.title,
      title: shop.title || shop.name,
      address: shop.address || `${shop.province || ""} ${shop.city || ""} ${shop.district || ""}`.trim(),
      roadAddress: shop.address || `${shop.province || ""} ${shop.city || ""} ${shop.district || ""}`.trim(),
      locationText: shop.address || `${shop.province || ""} ${shop.city || ""} ${shop.district || ""}`.trim(),
      region: shop.province || shop.region || "",
      district: shop.city || "",
      dong: shop.district || "",
      location: {
        lat: shop.lat,
        lng: shop.lng,
      },
      lat: shop.lat,
      lng: shop.lng,
      courses: Array.isArray(shop.courses) ? shop.courses : [shop.course].filter(Boolean),
      price: Array.isArray(shop.price) ? shop.price : [],
      originalPrice: Array.isArray(shop.originalPrice) ? shop.originalPrice : [],
      premium: shop.premium === true,
      isPremium: shop.premium === true,
      representativeImage: getShopImage(shop),
      mainImage: getShopImage(shop),
      thumbnail: getShopImage(shop),
      coverImage: getShopImage(shop),
      image: getShopImage(shop),
      images: Array.isArray(shop.images) && shop.images.length ? shop.images : [getShopImage(shop)].filter(Boolean),
      photos: Array.isArray(shop.photos) && shop.photos.length ? shop.photos : [getShopImage(shop)].filter(Boolean),
      imageUrls: Array.isArray(shop.imageUrls) && shop.imageUrls.length ? shop.imageUrls : [getShopImage(shop)].filter(Boolean),
      status: "active",
    };

    try {
      localStorage.setItem("noma_selected_shop", JSON.stringify(selectedShop));
      sessionStorage.setItem("noma_selected_shop", JSON.stringify(selectedShop));
    } catch (e) {
      console.warn("HOME SELECTED SHOP SAVE ERROR:", e.message);
    }

    navigate(isKaraokeShop(selectedShop) ? `/karaoke/shop-detail/${id}` : `/shop-detail/${id}`, {
      state: {
        shop: selectedShop,
      },
    });
  };

  const goMassageMap = () => {
    navigate("/massage/map");
  };

  const goKaraokeMap = () => {
    navigate("/karaoke/map");
  };

  const goCommunity = () => {
    navigate("/community");
  };

  const goLogin = () => {
    navigate("/login");
  };

  const goSignup = () => {
    navigate("/signup");
  };

  const handleLogout = () => {
    [
      "token",
      "accessToken",
      "authToken",
      "adminToken",
      "jwt",
      "user",
      "local-admin-token",
      "local-admin",
      "isAdmin",
      "adminLoggedIn",
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    setIsLoggedIn(false);

    try {
      window.dispatchEvent(new Event("auth-updated"));
    } catch (e) {
      console.warn("AUTH LOGOUT EVENT FAIL:", e.message);
    }

    navigate("/");
  };

  const goPartnerInquiry = () => {
    navigate("/partner-inquiry");
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button type="button" onClick={() => navigate("/")} style={styles.logo}>
          노라
        </button>

        <nav style={styles.nav}>
          <button type="button" onClick={goCommunity} style={styles.navButton}>
            커뮤니티
          </button>
          <button
            type="button"
            onClick={isLoggedIn ? handleLogout : goLogin}
            style={styles.navButton}
          >
            {isLoggedIn ? "로그아웃" : "회원가입/로그인"}
          </button>
          <button type="button" onClick={goPartnerInquiry} style={styles.navButton}>
            제휴 문의
          </button>
        </nav>
      </header>

      <main style={styles.hero}>
        <section style={styles.leftVisual}>
          <img
            src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=1800&auto=format&fit=crop"
            alt="마사지"
            style={styles.visualImage}
          />
          <div style={styles.leftVisualOverlay} />
          <div style={styles.bed} />
          <div style={styles.candleShelf} />
        </section>

        <section style={styles.rightVisual}>
          <img
            src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1800&auto=format&fit=crop"
            alt="가라오케"
            style={styles.visualImage}
          />
          <div style={styles.rightVisualOverlay} />
          <div style={styles.neonSign}>
            NORA
            <br />
            KARAOKE
          </div>
          <div style={styles.mic} />
        </section>

        <section style={styles.centerText}>
          <p style={styles.subTitle}>오늘의 피로는 힐링으로</p>

          <h1 style={styles.mainTitle}>
            오늘의 <span style={styles.goldText}>즐거움은</span> 노래로
          </h1>

          <p style={styles.desc}>마사지와 노래방을 한 번에!</p>
          <p style={styles.desc}>노라에서 특별한 하루를 완성하세요</p>

          <div style={styles.ctaRow}>
            <button type="button" onClick={goMassageMap} style={styles.massageButton}>
              <span style={styles.ctaIcon}>♙</span>
              <span style={styles.ctaText}>
                <strong style={styles.ctaTitle}>마사지 매장 찾기</strong>
                <small style={styles.ctaSmall}>편안한 휴식</small>
              </span>
              <span style={styles.arrow}>→</span>
            </button>

            <button type="button" onClick={goKaraokeMap} style={styles.karaokeButton}>
              <span style={styles.ctaIcon}>♬</span>
              <span style={styles.ctaText}>
                <strong style={styles.ctaTitle}>노래방 매장 찾기</strong>
                <small style={styles.ctaSmall}>신나는 즐거움</small>
              </span>
              <span style={styles.arrow}>→</span>
            </button>
          </div>
        </section>

        <section style={styles.featureBar}>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}>▣</span>
            <div>
              <strong style={styles.featureTitle}>간편한 예약</strong>
              <p style={styles.featureText}>원하는 시간에 빠르게</p>
            </div>
          </div>

          <div style={styles.featureItem}>
            <span style={styles.featureIcon}>♧</span>
            <div>
              <strong style={styles.featureTitle}>다양한 선택</strong>
              <p style={styles.featureText}>전국의 다양한 매장</p>
            </div>
          </div>

          <div style={styles.featureItem}>
            <span style={styles.featureIcon}>%</span>
            <div>
              <strong style={styles.featureTitle}>실시간 할인</strong>
              <p style={styles.featureText}>특가 & 이벤트 제공</p>
            </div>
          </div>

          <div style={styles.featureItem}>
            <span style={styles.featureIcon}>▣</span>
            <div>
              <strong style={styles.featureTitle}>안전한 이용</strong>
              <p style={styles.featureText}>검증된 매장만 제공</p>
            </div>
          </div>

          <div style={styles.featureItem}>
            <span style={styles.featureIcon}>◎</span>
            <div>
              <strong style={styles.featureTitle}>포인트 혜택</strong>
              <p style={styles.featureText}>예약할 때마다 적립</p>
            </div>
          </div>
        </section>

        <section style={styles.premium}>
          <div style={styles.premiumTop}>
            <h2 style={styles.premiumTitle}>지역별 프리미엄</h2>
          </div>

          <div style={styles.shopListHeader}>
            <h2 style={styles.shopListTitle}>매장 목록</h2>

            <div style={styles.areaSelectRow}>
              <select
                value={selectedProvince}
                onChange={handleProvinceChange}
                style={styles.areaSelect}
              >
                {PROVINCE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={handleCityChange}
                style={styles.areaSelect}
              >
                {getCityOptions(selectedProvince).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={selectedDistrict}
                onChange={handleDistrictChange}
                style={styles.areaSelect}
              >
                {getDistrictOptions(selectedCity).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.cardGrid}>
            {displayedPremiumShops.map((item, index) => {
              const image = getShopImage(item);

              return (
                <article
                  key={`${item.id || item.title}-${index}`}
                  style={{
                    ...styles.card,
                    gridColumn: item.premiumSlotColumn,
                  }}
                  onClick={() => handleShopCardClick(item)}
                >
                  <div style={styles.cardImage}>
                    {!!image ? (
                      <img
                        src={image}
                        alt={item.title || item.name}
                        style={styles.cardPhoto}
                      />
                    ) : (
                      <div style={item.type === "massage" ? styles.spaGlow : styles.karaokeGlow} />
                    )}

                    {item.premium && (
                      <span style={styles.premiumBadge}>
                        PREMIUM
                      </span>
                    )}
                  </div>

                  <div style={styles.cardBody}>
                    <h3 style={styles.cardTitle}>{item.title}</h3>

                    <div style={styles.meta}>
                      <span style={styles.star}>★</span>
                      <strong style={styles.rating}>{item.rating}</strong>
                      <span style={styles.review}>({item.review})</span>
                      <span style={styles.divider}>|</span>
                      <span style={styles.district}>{item.district}</span>
                    </div>

                    <p style={styles.course}>{item.course}</p>

                    <div style={styles.priceRow}>
                      <span style={styles.discount}>{item.discount}</span>
                      <span style={styles.original}>{item.original}</span>
                      <strong style={styles.sale}>{item.sale}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const aLat = Number(lat1);
  const aLng = Number(lng1);
  const bLat = Number(lat2);
  const bLng = Number(lng2);

  if (
    !Number.isFinite(aLat) ||
    !Number.isFinite(aLng) ||
    !Number.isFinite(bLat) ||
    !Number.isFinite(bLng)
  ) {
    return 999999;
  }

  const radius = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const distance =
    2 * radius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Number(distance.toFixed(2));
}

const styles = {
  page: {
    width: "100vw",
    minWidth: 1280,
    minHeight: "100vh",
    overflowX: "hidden",
    overflowY: "auto",
    background: "#000",
    color: "#fff",
    fontFamily:
      "Pretendard, Noto Sans KR, -apple-system, BlinkMacSystemFont, system-ui, Segoe UI, sans-serif",
  },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px 0 22px",
    boxSizing: "border-box",
  },

  logo: {
    border: "none",
    background: "transparent",
    color: "#fff",
    fontSize: 56,
    lineHeight: "58px",
    fontWeight: 500,
    letterSpacing: "-4px",
    cursor: "pointer",
    textShadow: `0 0 3px #fff, 0 0 8px ${PINK}, 0 0 18px ${PINK}, 0 0 30px rgba(255, 0, 110, 0.88)`,
  },

  nav: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  navButton: {
    height: 52,
    minWidth: 116,
    padding: "0 22px",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 6,
    background: "linear-gradient(180deg, rgba(8,8,8,0.96), rgba(0,0,0,1))",
    color: "#fff",
    fontSize: 18,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow:
      "0 0 10px rgba(255,212,0,0.65), inset 0 0 10px rgba(255,212,0,0.1)",
    textShadow: "0 0 7px rgba(255,255,255,0.35)",
  },

  hero: {
    position: "relative",
    width: "100vw",
    minWidth: 1280,
    minHeight: 1080,
    background:
      "radial-gradient(circle at 28% 34%, rgba(255,174,0,0.18), transparent 22%), radial-gradient(circle at 78% 30%, rgba(255,0,180,0.18), transparent 24%), #000",
    overflowX: "hidden",
    overflowY: "visible",
    paddingBottom: 52,
    boxSizing: "border-box",
  },

  leftVisual: {
    position: "absolute",
    left: 0,
    top: 70,
    width: "40%",
    height: 430,
    background: "#000",
    overflow: "hidden",
  },

  rightVisual: {
    position: "absolute",
    right: 0,
    top: 70,
    width: "40%",
    height: 430,
    background: "#000",
    overflow: "hidden",
  },

  visualImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center",
    opacity: 0.94,
  },

  leftVisualOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    background:
      "linear-gradient(90deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.18) 52%, rgba(0,0,0,0.86) 100%), linear-gradient(180deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.38) 100%)",
  },

  rightVisualOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    background:
      "linear-gradient(90deg, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.18) 48%, rgba(0,0,0,0.03) 100%), linear-gradient(180deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.38) 100%)",
  },

  bed: {
    display: "none",
  },

  candleShelf: {
    display: "none",
  },

  neonSign: {
    position: "absolute",
    zIndex: 2,
    top: 85,
    left: 105,
    width: 180,
    height: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #ff33d8",
    color: "#ff4fd8",
    fontSize: 33,
    lineHeight: "38px",
    textAlign: "center",
    letterSpacing: "1px",
    textShadow:
      "0 0 7px #fff, 0 0 14px #ff00d4, 0 0 28px rgba(255,0,212,0.9)",
    boxShadow:
      "0 0 12px rgba(255,0,212,0.8), inset 0 0 16px rgba(255,0,212,0.22)",
  },

  mic: {
    position: "absolute",
    zIndex: 2,
    right: 72,
    top: 92,
    width: 70,
    height: 250,
    borderRadius: 35,
    background:
      "linear-gradient(90deg, rgba(255,255,255,0.75), rgba(40,40,40,0.95), rgba(255,255,255,0.45))",
    transform: "rotate(-28deg)",
    boxShadow:
      "0 0 22px rgba(255,255,255,0.35), 0 0 35px rgba(255,0,180,0.45)",
  },

  centerText: {
    position: "absolute",
    top: 100,
    left: "50%",
    zIndex: 5,
    width: 760,
    transform: "translateX(-50%)",
    textAlign: "center",
  },

  subTitle: {
    margin: 0,
    color: "#eee",
    fontSize: 35,
    fontWeight: 300,
    letterSpacing: "-1px",
    textShadow: "0 0 10px rgba(255,255,255,0.3)",
  },

  mainTitle: {
    margin: "20px 0 16px",
    color: "#fff",
    fontSize: 64,
    lineHeight: "72px",
    fontWeight: 900,
    letterSpacing: "-4px",
    textShadow:
      "0 0 8px rgba(255,255,255,0.55), 0 0 18px rgba(255,255,255,0.26)",
  },

  goldText: {
    color: "#ffb400",
    textShadow:
      "0 0 8px rgba(255,180,0,0.85), 0 0 20px rgba(255,180,0,0.58)",
  },

  desc: {
    margin: "8px 0",
    color: "#fff",
    fontSize: 24,
    lineHeight: "30px",
    fontWeight: 300,
    textShadow: "0 0 8px rgba(255,255,255,0.18)",
  },

  ctaRow: {
    display: "flex",
    justifyContent: "center",
    gap: 24,
    marginTop: 36,
  },

  massageButton: {
    width: 320,
    height: 102,
    display: "grid",
    gridTemplateColumns: "62px 1fr 44px",
    alignItems: "center",
    gap: 12,
    padding: "0 24px",
    border: "2px solid #ffb400",
    borderRadius: 16,
    background:
      "linear-gradient(90deg, rgba(255,180,0,0.24), rgba(0,0,0,0.68))",
    color: GOLD,
    cursor: "pointer",
    boxShadow:
      "0 0 16px rgba(255,180,0,0.9), inset 0 0 18px rgba(255,180,0,0.16)",
  },

  karaokeButton: {
    width: 320,
    height: 102,
    display: "grid",
    gridTemplateColumns: "62px 1fr 44px",
    alignItems: "center",
    gap: 12,
    padding: "0 24px",
    border: `2px solid ${PINK}`,
    borderRadius: 16,
    background:
      "linear-gradient(90deg, rgba(255,0,110,0.24), rgba(0,0,0,0.72))",
    color: "#fff",
    cursor: "pointer",
    boxShadow:
      "0 0 16px rgba(255,0,110,0.9), inset 0 0 18px rgba(255,0,110,0.16)",
  },

  ctaIcon: {
    fontSize: 44,
    lineHeight: "44px",
    textShadow: "0 0 12px currentColor",
  },

  ctaText: {
    display: "block",
    textAlign: "left",
  },

  ctaTitle: {
    display: "block",
    fontSize: 23,
    lineHeight: "30px",
    color: "#fff",
  },

  ctaSmall: {
    display: "block",
    marginTop: 6,
    fontSize: 17,
    color: "#ffe680",
  },

  arrow: {
    fontSize: 42,
    color: "#fff",
    textShadow: "0 0 12px currentColor",
  },

  featureBar: {
    position: "absolute",
    left: 34,
    right: 34,
    top: 490,
    zIndex: 6,
    height: 92,
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 12,
    background: "rgba(0,0,0,0.82)",
    boxShadow:
      "0 0 12px rgba(255,212,0,0.58), inset 0 0 18px rgba(255,212,0,0.06)",
  },

  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "0 30px",
    borderRight: "1px solid rgba(167,124,0,0.45)",
  },

  featureIcon: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: GOLD,
    fontSize: 31,
    border: "1px solid rgba(255,212,0,0.42)",
    background: "rgba(255,170,0,0.12)",
    boxShadow: "0 0 14px rgba(255,212,0,0.65)",
  },

  featureTitle: {
    display: "block",
    color: GOLD,
    fontSize: 20,
    lineHeight: "26px",
    fontWeight: 600,
  },

  featureText: {
    margin: "6px 0 0",
    color: "#fff",
    fontSize: 15,
    lineHeight: "20px",
  },

  premium: {
    position: "absolute",
    left: 28,
    right: 28,
    top: 600,
    bottom: "auto",
    zIndex: 6,
    paddingBottom: 48,
    boxSizing: "border-box",
  },

  premiumTop: {
    height: 62,
    display: "flex",
    alignItems: "center",
    gap: 18,
  },

  premiumTitle: {
    margin: 0,
    width: 300,
    height: 52,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `2px solid ${PINK}`,
    borderRadius: 8,
    color: "#fff",
    fontSize: 31,
    fontWeight: 500,
    letterSpacing: "-2px",
    textShadow: `0 0 5px #fff, 0 0 12px ${PINK}, 0 0 20px rgba(255,0,110,0.85)`,
    boxShadow:
      "0 0 12px rgba(255,0,110,0.88), inset 0 0 10px rgba(255,0,110,0.08)",
  },

  tabs: {
    display: "none",
  },

  tab: {
    border: "none",
    borderRight: `1px solid ${GOLD_DARK}`,
    padding: "0 24px 0 0",
    background: "transparent",
    color: "#ddd",
    fontSize: 18,
    cursor: "pointer",
  },

  activeTab: {
    height: 48,
    minWidth: 92,
    border: `2px solid ${GOLD}`,
    borderRadius: 24,
    background: "rgba(255,180,0,0.16)",
    color: GOLD,
    fontSize: 20,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 0 14px rgba(255,212,0,0.85)",
  },

  moreButton: {
    display: "none",
    border: "none",
    background: "transparent",
    color: "#fff",
    fontSize: 21,
    cursor: "pointer",
  },

  shopListHeader: {
    marginTop: 16,
    marginBottom: 14,
    padding: "18px 20px 20px",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 12,
    background: "rgba(0,0,0,0.88)",
    boxShadow:
      "0 0 12px rgba(255,212,0,0.5), inset 0 0 16px rgba(255,212,0,0.06)",
    boxSizing: "border-box",
  },

  shopListTitle: {
    margin: "0 0 16px",
    color: GOLD,
    fontSize: 25,
    lineHeight: "32px",
    fontWeight: 800,
    letterSpacing: "-1px",
    textShadow: "0 0 10px rgba(255,212,0,0.75)",
  },

  areaSelectRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },

  areaSelect: {
    width: "100%",
    height: 46,
    padding: "0 16px",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 7,
    background: "#050505",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    outline: "none",
    cursor: "pointer",
    boxShadow:
      "0 0 10px rgba(255,212,0,0.52), inset 0 0 12px rgba(255,212,0,0.04)",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 18,
    marginTop: 8,
    paddingBottom: 56,
    overflow: "visible",
    boxSizing: "border-box",
  },

  card: {
    minHeight: 316,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 9,
    overflow: "hidden",
    background: "rgba(0,0,0,0.9)",
    boxShadow:
      "0 0 12px rgba(255,212,0,0.5), inset 0 0 14px rgba(255,212,0,0.04)",
    boxSizing: "border-box",
    cursor: "pointer",
  },

  cardImage: {
    position: "relative",
    height: 150,
    background: "linear-gradient(135deg, rgba(255,190,70,0.18), rgba(0,0,0,0.85))",
    overflow: "hidden",
  },

  cardPhoto: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    filter: "contrast(1.12) saturate(1.18) brightness(0.72)",
  },

  spaGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 40% 70%, rgba(255,190,70,0.85), transparent 18%), radial-gradient(circle at 72% 28%, rgba(255,130,0,0.45), transparent 22%), linear-gradient(135deg, #241000, #000)",
  },

  karaokeGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 55% 44%, rgba(255,0,180,0.55), transparent 20%), radial-gradient(circle at 30% 30%, rgba(20,80,255,0.72), transparent 24%), linear-gradient(135deg, #050014, #000)",
  },

  premiumBadge: {
    position: "absolute",
    zIndex: 3,
    top: 12,
    left: 12,
    padding: "6px 13px",
    borderRadius: 5,
    background: "linear-gradient(180deg, #ff4fb3, #ff006e)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: "0.5px",
    boxShadow: "0 0 12px rgba(255,0,110,0.82)",
  },

  cardBody: {
    padding: "16px 14px 18px",
    boxSizing: "border-box",
  },

  cardTitle: {
    margin: 0,
    color: "#fff",
    fontSize: 22,
    lineHeight: "28px",
    fontWeight: 500,
    letterSpacing: "-1px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  meta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },

  star: {
    color: GOLD,
    fontSize: 18,
    textShadow: "0 0 8px rgba(255,212,0,0.8)",
  },

  rating: {
    color: GOLD,
    fontSize: 17,
  },

  review: {
    color: "#ddd",
    fontSize: 15,
  },

  divider: {
    color: GOLD_DARK,
    margin: "0 4px",
  },

  district: {
    color: GOLD,
    fontSize: 15,
  },

  course: {
    margin: "18px 0",
    color: "#fff",
    fontSize: 15,
  },

  priceRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  discount: {
    minWidth: 50,
    height: 31,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${PINK}`,
    borderRadius: 4,
    color: PINK,
    fontSize: 18,
    fontWeight: 700,
    boxShadow: "0 0 8px rgba(255,0,110,0.58)",
  },

  original: {
    color: "#aaa",
    fontSize: 14,
    textDecoration: "line-through",
    marginLeft: "auto",
  },

  sale: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 500,
    textShadow: "0 0 8px rgba(255,255,255,0.28)",
  },
};

export default HomePage;