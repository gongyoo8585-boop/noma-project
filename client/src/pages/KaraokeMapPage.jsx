"use strict";

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import KakaoMap from "../components/KakaoMap";

import shopApi from "../services/shop.api";
import reviewApi from "../services/review.api";

import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

const REGION_MAP = {
  지역: ["구"],
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
  경남: ["거제시", "거창군", "고성군", "김해시", "남해군", "밀양시", "사천시", "산청시", "양산시", "의령군", "진주시", "창녕군", "창원시", "통영시", "하동군", "함안군", "함양군", "합천군"],
  제주: ["서귀포시", "제주시"],
};

const GIMHAE_DONG_OPTIONS = [
  "전체",
  "삼계동",
  "구산동",
  "내동",
  "외동",
  "부원동",
  "동상동",
  "회현동",
  "서상동",
  "봉황동",
  "대성동",
  "삼방동",
  "어방동",
  "안동",
  "지내동",
  "불암동",
  "대청동",
  "관동동",
  "율하동",
  "장유동",
  "진영읍",
  "주촌면",
  "진례면",
  "한림면",
  "생림면",
  "상동면",
  "대동면",
];

const REGION_ALIAS_MAP = {
  서울: ["서울", "서울시", "서울특별시"],
  부산: ["부산", "부산시", "부산광역시"],
  대구: ["대구", "대구시", "대구광역시"],
  인천: ["인천", "인천시", "인천광역시"],
  광주: ["광주", "광주시", "광주광역시"],
  대전: ["대전", "대전시", "대전광역시"],
  울산: ["울산", "울산시", "울산광역시"],
  세종: ["세종", "세종시", "세종특별자치시"],
  경기: ["경기", "경기도"],
  강원: ["강원", "강원도", "강원특별자치도"],
  충북: ["충북", "충청북도"],
  충남: ["충남", "충청남도"],
  전북: ["전북", "전라북도", "전북특별자치도"],
  전남: ["전남", "전라남도"],
  경북: ["경북", "경상북도"],
  경남: ["경남", "경상남도"],
  제주: ["제주", "제주도", "제주특별자치도"],
};

const BUSAN_CITY_HALL_POSITION = {
  lat: 35.1796,
  lng: 129.0756,
};

const LOCAL_SHOP_KEY = "noma_admin_shops_karaoke";
const LOCAL_PUBLIC_SHOP_KEY = "noma_local_shops_karaoke";
const LOCAL_ADMIN_KARAOKE_SHOP_KEY = "noma_admin_karaoke_shops";
const LOCAL_PUBLIC_KARAOKE_SHOP_KEY = "noma_public_karaoke_shops";
const SELECTED_SHOP_KEY = "noma_selected_shop";
const DELETED_SHOP_KEY = "noma_deleted_shop_ids";
const INITIAL_VISIBLE_COUNT = 20;
const VISIBLE_STEP = 12;

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000";

const FALLBACK_SHOP_IMAGES = [
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1591343395902-1adcb454c4e2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
];

const FALLBACK_SHOPS = [
  {
    _id: "local-noma-gimhae-main",
    id: "local-noma-gimhae-main",
    name: "더 스크럽 테라피",
    address: "경상남도 김해시 삼계동 1479-2",
    region: "경남",
    district: "김해시",
    dong: "삼계동",
    status: "active",
    lat: 35.2613,
    lng: 128.871,
    location: { lat: 35.2613, lng: 128.871 },
    phone: "010-0000-0001",
    virtualPhone: "0507-0000-0001",
    businessHours: "24시간",
    courses: ["건식 관리 60분", "아로마 관리 90분"],
    price: [45000, 50000],
    originalPrice: [80000, 82000],
    distance: "0.1km",
    rating: 5.0,
    reviewCount: 125,
    images: [FALLBACK_SHOP_IMAGES[0]],
    photos: [FALLBACK_SHOP_IMAGES[0]],
    imageUrls: [FALLBACK_SHOP_IMAGES[0]],
    isPremium: true,
    premium: true,
  },
  {
    _id: "local-noma-jangyu",
    id: "local-noma-jangyu",
    name: "가나다라 마사지",
    address: "경상남도 김해시 삼계동",
    region: "경남",
    district: "김해시",
    dong: "삼계동",
    status: "active",
    lat: 35.2638,
    lng: 128.8732,
    location: { lat: 35.2638, lng: 128.8732 },
    phone: "010-0000-0002",
    virtualPhone: "0507-0000-0002",
    businessHours: "10:00 - 03:00",
    courses: ["아로마 관리 90분", "마사지 90분"],
    price: [50000, 60000],
    originalPrice: [82000, 106800],
    distance: "0.1km",
    rating: 4.9,
    reviewCount: 256,
    images: [FALLBACK_SHOP_IMAGES[1]],
    photos: [FALLBACK_SHOP_IMAGES[1]],
    imageUrls: [FALLBACK_SHOP_IMAGES[1]],
    isPremium: true,
    premium: true,
  },
  {
    _id: "local-noma-gimhae-003",
    id: "local-noma-gimhae-003",
    name: "황제 마사지",
    address: "경상남도 김해시 내동 1123-4",
    region: "경남",
    district: "김해시",
    dong: "내동",
    status: "active",
    lat: 35.2584,
    lng: 128.8662,
    location: { lat: 35.2584, lng: 128.8662 },
    phone: "010-0000-0003",
    virtualPhone: "0507-0000-0003",
    businessHours: "11:00 - 04:00",
    courses: ["타이 관리 60분", "70분"],
    price: [55000, 90000],
    originalPrice: [100000, 160200],
    distance: "0.2km",
    rating: 4.8,
    reviewCount: 189,
    images: [FALLBACK_SHOP_IMAGES[2]],
    photos: [FALLBACK_SHOP_IMAGES[2]],
    imageUrls: [FALLBACK_SHOP_IMAGES[2]],
    isPremium: true,
    premium: true,
  },
  {
    _id: "local-noma-gimhae-004",
    id: "local-noma-gimhae-004",
    name: "휴안마로마 (김해)",
    address: "경상남도 김해시 구산동 999-8",
    region: "경남",
    district: "김해시",
    dong: "구산동",
    status: "active",
    lat: 35.2661,
    lng: 128.8685,
    location: { lat: 35.2661, lng: 128.8685 },
    phone: "010-0000-0004",
    virtualPhone: "0507-0000-0004",
    businessHours: "24시간",
    courses: ["아로마 관리 90분", "스웨디시 60분"],
    price: [50000, 80000],
    originalPrice: [80000, 142400],
    distance: "0.2km",
    rating: 4.8,
    reviewCount: 245,
    images: [FALLBACK_SHOP_IMAGES[3]],
    photos: [FALLBACK_SHOP_IMAGES[3]],
    imageUrls: [FALLBACK_SHOP_IMAGES[3]],
    isPremium: true,
    premium: true,
  },
  {
    _id: "local-noma-gimhae-005",
    id: "local-noma-gimhae-005",
    name: "펜트하우스 (박물관역)",
    address: "경상남도 김해시 삼방동 421-7",
    region: "경남",
    district: "김해시",
    dong: "삼방동",
    status: "active",
    lat: 35.2572,
    lng: 128.8782,
    location: { lat: 35.2572, lng: 128.8782 },
    phone: "010-0000-0005",
    virtualPhone: "0507-0000-0005",
    businessHours: "12:00 - 05:00",
    courses: ["타이 관리 60분", "아로마 관리 90분"],
    price: [40000, 65000],
    originalPrice: [60000, 98000],
    distance: "2.4km",
    rating: 4.9,
    reviewCount: 32,
    images: [FALLBACK_SHOP_IMAGES[4]],
    photos: [FALLBACK_SHOP_IMAGES[4]],
    imageUrls: [FALLBACK_SHOP_IMAGES[4]],
    isPremium: true,
    premium: true,
  },
  {
    _id: "local-noma-gimhae-006",
    id: "local-noma-gimhae-006",
    name: "시원타이 (내동)",
    address: "경상남도 김해시 외동 1264-3",
    region: "경남",
    district: "김해시",
    dong: "외동",
    status: "active",
    lat: 35.2527,
    lng: 128.8643,
    location: { lat: 35.2527, lng: 128.8643 },
    phone: "010-0000-0006",
    virtualPhone: "0507-0000-0006",
    businessHours: "10:00 - 02:00",
    courses: ["스웨디시 관리 90분", "건식 관리 60분"],
    price: [60000, 45000],
    originalPrice: [90000, 80000],
    distance: "2.6km",
    rating: 4.7,
    reviewCount: 40,
    images: [FALLBACK_SHOP_IMAGES[5]],
    photos: [FALLBACK_SHOP_IMAGES[5]],
    imageUrls: [FALLBACK_SHOP_IMAGES[5]],
    isPremium: true,
    premium: true,
  },
];

const FALLBACK_SHOP_ID_SET = new Set(
  FALLBACK_SHOPS.flatMap((shop) => [shop?._id, shop?.id]).filter(Boolean)
);

const FALLBACK_SHOP_NAME_SET = new Set(
  FALLBACK_SHOPS.map((shop) => String(shop?.name || "").replace(/\s+/g, "").trim()).filter(Boolean)
);

const FALLBACK_SHOP_ADDRESS_SET = new Set(
  FALLBACK_SHOPS.map((shop) => String(shop?.address || "").replace(/\s+/g, "").trim()).filter(Boolean)
);

const isFallbackSeedShop = (shop = {}) => {
  const id = shop?._id || shop?.id || "";

  return !!id && FALLBACK_SHOP_ID_SET.has(id);
};


const isKaraokeShop = (shop = {}) => {
  const typeText = String(
    shop?.type ||
      shop?.category ||
      shop?.businessType ||
      shop?.shopType ||
      ""
  ).toLowerCase();

  const titleText = String(
    shop?.title ||
      shop?.name ||
      shop?.shopName ||
      ""
  );

  return (
    typeText.includes("karaoke") ||
    typeText.includes("노래") ||
    typeText.includes("가라오케") ||
    titleText.includes("노래") ||
    titleText.includes("가라오케") ||
    titleText.includes("파티룸")
  );
};

const isMassageShop = (shop = {}) => {
  return !isKaraokeShop(shop);
};

function KaraokeMapPage({ navigate }) {
  const routerNavigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hiddenShopId, setHiddenShopId] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [position, setPosition] = useState(null);
  const [region, setRegion] = useState("경남");
  const [district, setDistrict] = useState("김해시");
  const [dong, setDong] = useState("전체");
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [myLocationMarker, setMyLocationMarker] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const mapMoveLoadingRef = useRef(false);
  const userLocationLockRef = useRef(false);
  const userLocationFixedRef = useRef(false);
  const mountedRef = useRef(true);

  const normalizeSearchText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .trim();

  const normalizeDeletedShopText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .trim();

  const readDeletedShopIds = () => {
    try {
      const localValue = JSON.parse(localStorage.getItem(DELETED_SHOP_KEY) || "[]");
      const sessionValue = JSON.parse(sessionStorage.getItem(DELETED_SHOP_KEY) || "[]");

      return Array.from(
        new Set(
          [
            ...(Array.isArray(localValue) ? localValue : []),
            ...(Array.isArray(sessionValue) ? sessionValue : []),
          ]
            .flatMap((value) => [
              String(value || "").trim(),
              normalizeDeletedShopText(value),
            ])
            .filter(Boolean)
        )
      );
    } catch (e) {
      return [];
    }
  };

  const getDeletedShopIdentityValues = (shop = {}) => {
    const name = normalizeDeletedShopText(shop?.name || shop?.shopName || shop?.title);
    const address = normalizeDeletedShopText(
      shop?.address || shop?.roadAddress || shop?.fullAddress || shop?.locationText
    );
    const phone = normalizeDeletedShopText(
      shop?.phone || shop?.tel || shop?.virtualPhone || shop?.fakePhone || shop?.callNumber
    );

    return Array.from(
      new Set(
        [
          shop?._id,
          shop?.id,
          shop?.shopId,
          shop?.uuid,
          shop?.slug,
          name ? `name:${name}` : "",
          name && address ? `name-address:${name}:${address}` : "",
          phone ? `phone:${phone}` : "",
          name,
          address,
          phone,
          name && address ? `${name}::${address}` : "",
          name && address ? `${name}_${address}` : "",
        ]
          .flatMap((value) => [
            String(value || "").trim(),
            normalizeDeletedShopText(value),
          ])
          .filter(Boolean)
      )
    );
  };

  const isDeletedShop = (shop = {}) => {
    const deletedIds = readDeletedShopIds();

    if (!deletedIds.length) {
      return false;
    }

    const deletedSet = new Set(
      deletedIds
        .flatMap((value) => [
          String(value || "").trim(),
          normalizeDeletedShopText(value),
        ])
        .filter(Boolean)
    );

    return getDeletedShopIdentityValues(shop).some((value) => deletedSet.has(value));
  };

  const filterDeletedShops = (list = []) =>
    Array.isArray(list) ? list.filter((shop) => !isDeletedShop(shop)) : [];

  const normalize = (res) => {
    return Array.isArray(res)
      ? res
      : Array.isArray(res?.shops)
      ? res.shops
      : Array.isArray(res?.list)
      ? res.list
      : Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.data?.shops)
      ? res.data.shops
      : Array.isArray(res?.data?.list)
      ? res.data.list
      : Array.isArray(res?.data?.items)
      ? res.data.items
      : Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data?.data?.shops)
      ? res.data.data.shops
      : Array.isArray(res?.data?.data?.items)
      ? res.data.data.items
      : [];
  };

  const getAddressRegion = (address = "") => {
    const text = String(address || "");

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
    if (text.includes("경남") || text.includes("경상남도")) return "경남";
    if (text.includes("제주")) return "제주";

    return "";
  };

  const getAddressDistrict = (address = "") => {
    const text = String(address || "");
    const match = text.match(/[가-힣]+(시|군|구)/);

    return match ? match[0] : "";
  };

  const getAddressDong = (address = "") => {
    const text = String(address || "");
    const match = text.match(/[가-힣]+(동|읍|면)/);

    return match ? match[0] : "";
  };


  const isValidShopImageText = (value) => {
    const text = String(value || "").trim();

    if (!text) return false;
    if (text === "undefined" || text === "null" || text === "[object Object]") return false;
    if (text.includes("undefined") || text.includes("[object Object]")) return false;
    if (text === "data:" || text === "data:," || text.startsWith("data:,")) return false;
    if (text === "blob:" || text.startsWith("blob:")) return false;

    return (
      text.startsWith("data:image/") ||
      text.startsWith("http://") ||
      text.startsWith("https://") ||
      text.startsWith("//") ||
      text.startsWith("/")
    );
  };

  const collectShopImages = (shop = {}) => {
    const candidates = [];
    const pushImageValue = (value) => {
      if (value === null || value === undefined || value === "") return;

      if (Array.isArray(value)) {
        value.forEach((item) => pushImageValue(item));
        return;
      }

      if (typeof value === "object") {
        pushImageValue(
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
        return;
      }

      const text = String(value || "").trim();

      if (!text) return;

      if (isValidShopImageText(text)) {
        candidates.push(text);
        return;
      }

      if (
        text.startsWith("data:image/") ||
        text.startsWith("blob:") ||
        text.startsWith("http://") ||
        text.startsWith("https://") ||
        text.startsWith("//") ||
        text.startsWith("/")
      ) {
        return;
      }

      text
        .split(",")
        .map((item) => item.trim())
        .filter((item) => isValidShopImageText(item))
        .forEach((item) => candidates.push(item));
    };

    pushImageValue(shop?.representativeImage);
    pushImageValue(shop?.mainImage);
    pushImageValue(shop?.thumbnail);
    pushImageValue(shop?.coverImage);
    pushImageValue(shop?.images);
    pushImageValue(shop?.photos);
    pushImageValue(shop?.imageUrls);
    pushImageValue(shop?.gallery);
    pushImageValue(shop?.files);
    pushImageValue(shop?.image);
    pushImageValue(shop?.imageUrl);
    pushImageValue(shop?.photo);
    pushImageValue(shop?.picture);

    return candidates
      .map((item) => String(item || "").trim())
      .filter((item) => isValidShopImageText(item))
      .filter((item, index, array) => array.indexOf(item) === index);
  };

  const normalizeShopItem = (shop = {}, index = 0) => {
    const images = collectShopImages(shop);

    const lat =
      shop?.lat ||
      shop?.latitude ||
      shop?.y ||
      shop?.location?.lat ||
      shop?.location?.y ||
      shop?.geo?.coordinates?.[1] ||
      "";

    const lng =
      shop?.lng ||
      shop?.longitude ||
      shop?.x ||
      shop?.location?.lng ||
      shop?.location?.x ||
      shop?.geo?.coordinates?.[0] ||
      "";

    const address =
      shop?.address ||
      shop?.roadAddress ||
      shop?.locationText ||
      shop?.road_address_name ||
      "";

    const normalizedLat = Number(lat) || "";
    const normalizedLng = Number(lng) || "";

    return {
      ...shop,
      _id: shop?._id || shop?.id || `${shop?.name || "shop"}-${index}`,
      id: shop?.id || shop?._id || `${shop?.name || "shop"}-${index}`,
      name: shop?.name || shop?.shopName || shop?.title || "이름 없음",
      address,
      roadAddress:
        shop?.address ||
        shop?.roadAddress ||
        shop?.road_address_name ||
        address,
      locationText: shop?.locationText || address,
      region: shop?.region || getAddressRegion(address),
      district: shop?.district || getAddressDistrict(address),
      dong: shop?.dong || shop?.neighborhood || getAddressDong(address),
      status: String(shop?.status || "active").toLowerCase(),
      visible: shop?.visible === false ? false : true,
      approved: shop?.approved === false ? false : true,
      isReservable: shop?.isReservable === false ? false : true,
      isPremium: shop?.isPremium === true || shop?.premium === true,
      premium: shop?.isPremium === true || shop?.premium === true,
      lat: normalizedLat,
      lng: normalizedLng,
      location:
        shop?.location && typeof shop.location === "object"
          ? {
              ...shop.location,
              lat: normalizedLat || shop.location.lat || "",
              lng: normalizedLng || shop.location.lng || "",
            }
          : {
              lat: normalizedLat,
              lng: normalizedLng,
            },
      images,
      photos: images,
      imageUrls: images,
      representativeImage:
        shop?.representativeImage ||
        shop?.mainImage ||
        shop?.thumbnail ||
        shop?.coverImage ||
        images[0] ||
        "",
      mainImage:
        shop?.mainImage ||
        shop?.representativeImage ||
        shop?.thumbnail ||
        shop?.coverImage ||
        images[0] ||
        "",
      thumbnail:
        shop?.thumbnail ||
        shop?.representativeImage ||
        shop?.mainImage ||
        shop?.coverImage ||
        images[0] ||
        "",
      coverImage:
        shop?.coverImage ||
        shop?.representativeImage ||
        shop?.mainImage ||
        shop?.thumbnail ||
        images[0] ||
        "",
      courses: Array.isArray(shop?.courses) ? shop.courses : [],
      price: Array.isArray(shop?.price)
        ? shop.price
        : shop?.price !== undefined && shop?.price !== null && shop?.price !== ""
        ? [shop.price]
        : [],
      updatedAt: shop?.updatedAt || shop?.modifiedAt || "",
    };
  };

  const getShopId = (shop, index = "") =>
    shop?._id ||
    shop?.id ||
    `${shop?.name || "shop"}-${shop?.address || "address"}-${index}`;

  const getShopMergeKey = (shop, index = "") => {
    const nameKey = normalizeSearchText(shop?.name);

    if (nameKey) {
      return `name:${nameKey}`;
    }

    return `id:${getShopId(shop, index)}`;
  };

  const filterActiveShops = (list = []) => {
    return Array.isArray(list)
      ? list.filter((shop) => {
          const status = String(shop?.status || "active").toLowerCase();

          return (
            !isDeletedShop(shop) &&
            !isFallbackSeedShop(shop) &&
            isKaraokeShop(shop) &&
            shop?.visible !== false &&
            shop?.approved !== false &&
            (status === "active" ||
              status === "open" ||
              status === "approved" ||
              status === "enable" ||
              status === "enabled" ||
              status === "")
          );
        })
      : [];
  };

  const ensureVisibleList = (list = []) => {
    const normalizedList = filterActiveShops(
      normalize(list).map((shop, index) => normalizeShopItem(shop, index))
    );

    if (normalizedList.length > 0) {
      return normalizedList;
    }

    return [];
  };

  const mergeShopLists = (nearbyList = [], fullList = []) => {
    const map = new Map();

    [...nearbyList, ...fullList].forEach((shop, index) => {
      if (!shop || isDeletedShop(shop)) return;

      const normalizedShop = normalizeShopItem(shop, index);

      if (isDeletedShop(normalizedShop)) return;
      const key = String(getShopMergeKey(normalizedShop, index));

      if (!map.has(key)) {
        map.set(key, normalizedShop);
      } else {
        const prevShop = map.get(key);
        const prevUpdatedAt = new Date(prevShop?.updatedAt || 0).getTime();
        const nextUpdatedAt = new Date(normalizedShop?.updatedAt || 0).getTime();
        const shouldPreferNext =
          nextUpdatedAt >= prevUpdatedAt ||
          String(normalizedShop?.address || "").trim() !== String(prevShop?.address || "").trim();

        const primaryShop = shouldPreferNext ? normalizedShop : prevShop;
        const secondaryShop = shouldPreferNext ? prevShop : normalizedShop;

        map.set(key, {
          ...secondaryShop,
          ...primaryShop,
          address:
            primaryShop.address ||
            primaryShop.roadAddress ||
            secondaryShop.address ||
            secondaryShop.roadAddress ||
            "",
          roadAddress:
            primaryShop.address ||
            primaryShop.roadAddress ||
            secondaryShop.address ||
            secondaryShop.roadAddress ||
            "",
          locationText:
            primaryShop.address ||
            primaryShop.locationText ||
            secondaryShop.address ||
            secondaryShop.locationText ||
            "",
          region:
            primaryShop.region ||
            secondaryShop.region ||
            "",
          district:
            primaryShop.district ||
            secondaryShop.district ||
            "",
          dong:
            primaryShop.dong ||
            secondaryShop.dong ||
            "",
          images: collectShopImages({
            images: [
              ...(primaryShop.images || []),
              ...(secondaryShop.images || []),
            ],
            photos: [
              ...(primaryShop.photos || []),
              ...(secondaryShop.photos || []),
            ],
            imageUrls: [
              ...(primaryShop.imageUrls || []),
              ...(secondaryShop.imageUrls || []),
            ],
            representativeImage:
              primaryShop.representativeImage || secondaryShop.representativeImage || "",
            mainImage: primaryShop.mainImage || secondaryShop.mainImage || "",
            thumbnail: primaryShop.thumbnail || secondaryShop.thumbnail || "",
            coverImage: primaryShop.coverImage || secondaryShop.coverImage || "",
            image: primaryShop.image || secondaryShop.image || "",
            imageUrl: primaryShop.imageUrl || secondaryShop.imageUrl || "",
            photo: primaryShop.photo || secondaryShop.photo || "",
            picture: primaryShop.picture || secondaryShop.picture || "",
          }),
          photos: collectShopImages({
            images: [
              ...(primaryShop.images || []),
              ...(secondaryShop.images || []),
            ],
            photos: [
              ...(primaryShop.photos || []),
              ...(secondaryShop.photos || []),
            ],
            imageUrls: [
              ...(primaryShop.imageUrls || []),
              ...(secondaryShop.imageUrls || []),
            ],
            representativeImage:
              primaryShop.representativeImage || secondaryShop.representativeImage || "",
            mainImage: primaryShop.mainImage || secondaryShop.mainImage || "",
            thumbnail: primaryShop.thumbnail || secondaryShop.thumbnail || "",
            coverImage: primaryShop.coverImage || secondaryShop.coverImage || "",
            image: primaryShop.image || secondaryShop.image || "",
            imageUrl: primaryShop.imageUrl || secondaryShop.imageUrl || "",
            photo: primaryShop.photo || secondaryShop.photo || "",
            picture: primaryShop.picture || secondaryShop.picture || "",
          }),
          imageUrls: collectShopImages({
            images: [
              ...(primaryShop.images || []),
              ...(secondaryShop.images || []),
            ],
            photos: [
              ...(primaryShop.photos || []),
              ...(secondaryShop.photos || []),
            ],
            imageUrls: [
              ...(primaryShop.imageUrls || []),
              ...(secondaryShop.imageUrls || []),
            ],
            representativeImage:
              primaryShop.representativeImage || secondaryShop.representativeImage || "",
            mainImage: primaryShop.mainImage || secondaryShop.mainImage || "",
            thumbnail: primaryShop.thumbnail || secondaryShop.thumbnail || "",
            coverImage: primaryShop.coverImage || secondaryShop.coverImage || "",
            image: primaryShop.image || secondaryShop.image || "",
            imageUrl: primaryShop.imageUrl || secondaryShop.imageUrl || "",
            photo: primaryShop.photo || secondaryShop.photo || "",
            picture: primaryShop.picture || secondaryShop.picture || "",
          }),
          representativeImage:
            collectShopImages({
              representativeImage: primaryShop.representativeImage || secondaryShop.representativeImage || "",
              mainImage: primaryShop.mainImage || secondaryShop.mainImage || "",
              thumbnail: primaryShop.thumbnail || secondaryShop.thumbnail || "",
              coverImage: primaryShop.coverImage || secondaryShop.coverImage || "",
              images: [
                ...(primaryShop.images || []),
                ...(secondaryShop.images || []),
              ],
              photos: [
                ...(primaryShop.photos || []),
                ...(secondaryShop.photos || []),
              ],
              imageUrls: [
                ...(primaryShop.imageUrls || []),
                ...(secondaryShop.imageUrls || []),
              ],
            })[0] || "",
          mainImage:
            collectShopImages({
              mainImage: primaryShop.mainImage || secondaryShop.mainImage || "",
              representativeImage: primaryShop.representativeImage || secondaryShop.representativeImage || "",
              images: [
                ...(primaryShop.images || []),
                ...(secondaryShop.images || []),
              ],
            })[0] || "",
          thumbnail:
            collectShopImages({
              thumbnail: primaryShop.thumbnail || secondaryShop.thumbnail || "",
              representativeImage: primaryShop.representativeImage || secondaryShop.representativeImage || "",
              images: [
                ...(primaryShop.images || []),
                ...(secondaryShop.images || []),
              ],
            })[0] || "",
          coverImage:
            collectShopImages({
              coverImage: primaryShop.coverImage || secondaryShop.coverImage || "",
              representativeImage: primaryShop.representativeImage || secondaryShop.representativeImage || "",
              images: [
                ...(primaryShop.images || []),
                ...(secondaryShop.images || []),
              ],
            })[0] || "",
          isPremium:
            primaryShop.isPremium === true ||
            primaryShop.premium === true ||
            secondaryShop.isPremium === true ||
            secondaryShop.premium === true,
          premium:
            primaryShop.isPremium === true ||
            primaryShop.premium === true ||
            secondaryShop.isPremium === true ||
            secondaryShop.premium === true,
        });
      }
    });

    return Array.from(map.values());
  };

  const readLocalShops = () => {
    try {
      const adminSaved = JSON.parse(localStorage.getItem(LOCAL_SHOP_KEY) || "[]");
      const publicSaved = JSON.parse(localStorage.getItem(LOCAL_PUBLIC_SHOP_KEY) || "[]");
      const adminKaraokeSaved = JSON.parse(localStorage.getItem(LOCAL_ADMIN_KARAOKE_SHOP_KEY) || "[]");
      const publicKaraokeSaved = JSON.parse(localStorage.getItem(LOCAL_PUBLIC_KARAOKE_SHOP_KEY) || "[]");
      const adminSession = JSON.parse(sessionStorage.getItem(LOCAL_SHOP_KEY) || "[]");
      const publicSession = JSON.parse(sessionStorage.getItem(LOCAL_PUBLIC_SHOP_KEY) || "[]");
      const adminKaraokeSession = JSON.parse(sessionStorage.getItem(LOCAL_ADMIN_KARAOKE_SHOP_KEY) || "[]");
      const publicKaraokeSession = JSON.parse(sessionStorage.getItem(LOCAL_PUBLIC_KARAOKE_SHOP_KEY) || "[]");

      return filterDeletedShops(
        mergeShopLists(
          mergeShopLists(
            mergeShopLists(
              Array.isArray(publicSaved) ? publicSaved : [],
              Array.isArray(adminSaved) ? adminSaved : []
            ),
            mergeShopLists(
              Array.isArray(publicKaraokeSaved) ? publicKaraokeSaved : [],
              Array.isArray(adminKaraokeSaved) ? adminKaraokeSaved : []
            )
          ),
          mergeShopLists(
            mergeShopLists(
              Array.isArray(publicSession) ? publicSession : [],
              Array.isArray(adminSession) ? adminSession : []
            ),
            mergeShopLists(
              Array.isArray(publicKaraokeSession) ? publicKaraokeSession : [],
              Array.isArray(adminKaraokeSession) ? adminKaraokeSession : []
            )
          )
        )
      );
    } catch (e) {
      return [];
    }
  };

  const saveLocalShops = (items) => {
    try {
      const nextItems = filterDeletedShops(mergeShopLists([], ensureVisibleList(items)));

      localStorage.setItem(LOCAL_SHOP_KEY, JSON.stringify(nextItems));
      localStorage.setItem(LOCAL_PUBLIC_SHOP_KEY, JSON.stringify(nextItems));
      localStorage.setItem(LOCAL_ADMIN_KARAOKE_SHOP_KEY, JSON.stringify(nextItems));
      localStorage.setItem(LOCAL_PUBLIC_KARAOKE_SHOP_KEY, JSON.stringify(nextItems));
      sessionStorage.setItem(LOCAL_SHOP_KEY, JSON.stringify(nextItems));
      sessionStorage.setItem(LOCAL_PUBLIC_SHOP_KEY, JSON.stringify(nextItems));
      sessionStorage.setItem(LOCAL_ADMIN_KARAOKE_SHOP_KEY, JSON.stringify(nextItems));
      sessionStorage.setItem(LOCAL_PUBLIC_KARAOKE_SHOP_KEY, JSON.stringify(nextItems));

      window.dispatchEvent(
        new CustomEvent("shops-updated", {
          detail: {
            shops: nextItems,
          },
        })
      );
    } catch (e) {
      console.warn("MAP SHOP LOCAL SAVE ERROR:", e.message);
    }
  };

  const saveSelectedShop = (shop) => {
    try {
      if (!shop) return;

      localStorage.setItem(SELECTED_SHOP_KEY, JSON.stringify(shop));
      sessionStorage.setItem(SELECTED_SHOP_KEY, JSON.stringify(shop));
    } catch (e) {
      console.warn("SELECTED SHOP SAVE ERROR:", e.message);
    }
  };

  const filterRegionSearch = (list = []) => {
    const safeKeyword = String(keyword || "").trim().toLowerCase();
    const normalizedKeyword = normalizeSearchText(keyword);
    const safeRegion = region === "지역" ? "" : String(region || "").trim();
    const safeDistrict = district === "구" ? "" : String(district || "").trim();
    const safeDong = dong === "전체" ? "" : String(dong || "").trim();

    const regionAliases =
      safeRegion && REGION_ALIAS_MAP[safeRegion]
        ? REGION_ALIAS_MAP[safeRegion]
        : safeRegion
        ? [safeRegion]
        : [];

    return filterActiveShops(list).filter((shop) => {
      const name = String(shop?.name || "").toLowerCase();
      const address = String(shop?.address || "").toLowerCase();
      const shopRegion = String(shop?.region || "").toLowerCase();
      const districtText = String(shop?.district || "").toLowerCase();
      const dongText = String(shop?.dong || "").toLowerCase();

      const normalizedName = normalizeSearchText(shop?.name);
      const normalizedAddress = normalizeSearchText(shop?.address);
      const normalizedRegion = normalizeSearchText(shop?.region);
      const normalizedDistrict = normalizeSearchText(shop?.district);
      const normalizedDong = normalizeSearchText(shop?.dong);
      const normalizedSafeDistrict = normalizeSearchText(safeDistrict);
      const normalizedSafeDong = normalizeSearchText(safeDong);

      const keywordOk =
        !safeKeyword ||
        name.includes(safeKeyword) ||
        address.includes(safeKeyword) ||
        shopRegion.includes(safeKeyword) ||
        districtText.includes(safeKeyword) ||
        dongText.includes(safeKeyword) ||
        (!!normalizedKeyword &&
          (normalizedName.includes(normalizedKeyword) ||
            normalizedAddress.includes(normalizedKeyword) ||
            normalizedRegion.includes(normalizedKeyword) ||
            normalizedDistrict.includes(normalizedKeyword) ||
            normalizedDong.includes(normalizedKeyword)));

      const districtMatched =
        !!safeDistrict &&
        (address.includes(safeDistrict.toLowerCase()) ||
          districtText.includes(safeDistrict.toLowerCase()) ||
          normalizedAddress.includes(normalizedSafeDistrict) ||
          normalizedDistrict.includes(normalizedSafeDistrict));

      const dongMatched =
        !!safeDong &&
        (address.includes(safeDong.toLowerCase()) ||
          dongText.includes(safeDong.toLowerCase()) ||
          normalizedAddress.includes(normalizedSafeDong) ||
          normalizedDong.includes(normalizedSafeDong));

      const regionOk =
        !safeRegion ||
        regionAliases.some((item) => {
          const alias = String(item || "").toLowerCase();

          return (
            address.includes(alias) ||
            shopRegion.includes(alias) ||
            normalizedAddress.includes(normalizeSearchText(alias)) ||
            normalizedRegion.includes(normalizeSearchText(alias))
          );
        }) ||
        districtMatched ||
        dongMatched;

      const districtOk = !safeDistrict || districtMatched;
      const dongOk = !safeDong || dongMatched;

      return keywordOk && regionOk && districtOk && dongOk;
    });
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

  const normalizeImageUrl = (value) => {
    const imageValue = getImageValue(value);

    if (!imageValue) {
      return "";
    }

    if (!isValidShopImageText(imageValue)) {
      return "";
    }

    if (
      imageValue.startsWith("http://") ||
      imageValue.startsWith("https://") ||
      imageValue.startsWith("data:image/")
    ) {
      return imageValue;
    }

    if (imageValue.startsWith("//")) {
      return `${window.location.protocol}${imageValue}`;
    }

    if (imageValue.startsWith("/")) {
      return `${API_BASE_URL}${imageValue}`;
    }

    return `${API_BASE_URL}/${imageValue}`;
  };

  const getRepresentativeImage = (shop) => {
    const images = collectShopImages(shop);

    return normalizeImageUrl(
      shop?.representativeImage ||
        shop?.mainImage ||
        shop?.thumbnail ||
        shop?.coverImage ||
        images[0] ||
        shop?.image ||
        shop?.imageUrl ||
        shop?.photo ||
        shop?.picture ||
        ""
    );
  };

  const isPremiumShop = (shop) => {
    return shop?.isPremium === true || shop?.premium === true;
  };

  const getCoursePriceRows = (shop) => {
    const courses = Array.isArray(shop?.courses) ? shop.courses : [];

    const prices = Array.isArray(shop?.price)
      ? shop.price
      : shop?.price !== undefined && shop?.price !== null
      ? [shop.price]
      : [];

    const max = Math.max(courses.length, prices.length);

    if (!max) {
      return [];
    }

    return Array.from({ length: max }).map((_, index) => ({
      course: courses[index] || "-",
      price:
        prices[index] !== undefined &&
        prices[index] !== null &&
        prices[index] !== ""
          ? `${Number(prices[index]).toLocaleString()}원`
          : "-",
    }));
  };

  const toPriceNumber = (value) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const numberValue = Number(String(value).replace(/[^\d.-]/g, ""));

    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const normalizeCoursePricingRows = (shop = {}) => {
    const sources = [
      shop?.coursePricing,
      shop?.pricing,
      shop?.priceTable,
      shop?.courseSections,
      shop?.menuPrices,
      shop?.menus,
      shop?.courseMenus,
    ];

    const rows = [];

    const pushRows = (source, fallbackTitle = "") => {
      if (!source) {
        return;
      }

      if (Array.isArray(source)) {
        source.forEach((item, index) => pushRows(item, fallbackTitle || `관리 ${index + 1}`));
        return;
      }

      if (typeof source !== "object") {
        return;
      }

      const title =
        source.title ||
        source.name ||
        source.courseName ||
        source.category ||
        source.categoryName ||
        fallbackTitle ||
        "";

      const collectPeriodRows = (periodRows, period) => {
        (Array.isArray(periodRows) ? periodRows : []).forEach((row) => {
          const duration =
            row?.duration ||
            row?.time ||
            row?.minute ||
            row?.minutes ||
            row?.courseTime ||
            row?.label ||
            "";

          const originalPrice = toPriceNumber(
            row?.originalPrice ||
              row?.originPrice ||
              row?.regularPrice ||
              row?.normalPrice ||
              row?.priceBeforeDiscount
          );

          const salePrice = toPriceNumber(
            row?.salePrice ||
              row?.discountPrice ||
              row?.finalPrice ||
              row?.price ||
              row?.amount
          );

          if (String(duration || "").trim() && originalPrice > 0 && salePrice > 0) {
            rows.push({
              title,
              period,
              duration: String(duration || "").trim(),
              originalPrice,
              salePrice,
              discountRate:
                originalPrice > salePrice
                  ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
                  : 0,
              dayStartTime:
                row?.dayStartTime ||
                source?.dayStartTime ||
                source?.dayStart ||
                source?.dayOpenTime ||
                source?.dayFrom ||
                "",
              dayEndTime:
                row?.dayEndTime ||
                source?.dayEndTime ||
                source?.dayEnd ||
                source?.dayCloseTime ||
                source?.dayTo ||
                "",
              nightStartTime:
                row?.nightStartTime ||
                source?.nightStartTime ||
                source?.nightStart ||
                source?.nightOpenTime ||
                source?.nightFrom ||
                "",
              nightEndTime:
                row?.nightEndTime ||
                source?.nightEndTime ||
                source?.nightEnd ||
                source?.nightCloseTime ||
                source?.nightTo ||
                "",
            });
          }
        });
      };

      collectPeriodRows(source.day || source.daytime || source["주간"], "day");
      collectPeriodRows(source.night || source.nighttime || source["야간"], "night");

      if (Array.isArray(source.rows) || Array.isArray(source.items) || Array.isArray(source.courses) || Array.isArray(source.prices)) {
        collectPeriodRows(source.rows || source.items || source.courses || source.prices, "day");
      }
    };

    sources.forEach((source) => pushRows(source));

    return rows;
  };

  const getCourseTimerMinutes = (value) => {
    const match = String(value || "").match(/(\d{1,2})\s*:\s*(\d{1,2})/);

    if (!match) {
      return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }

    return hour * 60 + minute;
  };

  const isNowInCourseTimerRange = (startValue, endValue) => {
    const startMinutes = getCourseTimerMinutes(startValue);
    const endMinutes = getCourseTimerMinutes(endValue);

    if (startMinutes === null || endMinutes === null) {
      return false;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (startMinutes === endMinutes) {
      return true;
    }

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  };

  const getTimedCoursePricingRow = (shop = {}, index = 0) => {
    const rows = normalizeCoursePricingRows(shop);

    if (!rows.length) {
      return null;
    }

    const dayRows = rows.filter((row) => row.period === "day");
    const nightRows = rows.filter((row) => row.period === "night");

    const timedDayRows = dayRows.filter((row) =>
      isNowInCourseTimerRange(row.dayStartTime, row.dayEndTime)
    );

    const timedNightRows = nightRows.filter((row) =>
      isNowInCourseTimerRange(row.nightStartTime, row.nightEndTime)
    );

    if (timedDayRows.length) {
      return timedDayRows[index] || timedDayRows[0] || null;
    }

    if (timedNightRows.length) {
      return timedNightRows[index] || timedNightRows[0] || null;
    }

    if (dayRows.length) {
      return dayRows[index] || dayRows[0] || null;
    }

    return rows[index] || rows[0] || null;
  };

  const getPrimaryCoursePricingRow = (shop = {}, index = 0) => {
    return getTimedCoursePricingRow(shop, index);
  };

  const getMinutesFromBusinessTimeText = (value) => {
    const text = String(value || "")
      .replace(/다음날/g, "")
      .replace(/영업/g, "")
      .trim();

    if (!text) {
      return null;
    }

    const timeMatch = text.match(/(\d{1,2})\s*:\s*(\d{1,2})/);

    if (timeMatch) {
      const hour = Number(timeMatch[1]);
      const minute = Number(timeMatch[2]);

      if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return null;
      }

      return hour * 60 + minute;
    }

    const koreanMatch = text.match(/(오전|오후|새벽)?\s*(\d{1,2})\s*(?::\s*(\d{1,2}))?\s*시?/);

    if (!koreanMatch) {
      return null;
    }

    const meridiem = koreanMatch[1] || "";
    let hour = Number(koreanMatch[2]);
    const minute = Number(koreanMatch[3] || 0);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }

    if (meridiem === "오후" && hour < 12) {
      hour += 12;
    }

    if ((meridiem === "오전" || meridiem === "새벽") && hour === 12) {
      hour = 0;
    }

    return hour * 60 + minute;
  };

  const isShopBusinessOpen = (businessHours = "") => {
    const text = String(businessHours || "").replace(/\s+/g, "");

    if (!text) {
      return true;
    }

    if (text.includes("24시간")) {
      return true;
    }

    const parts = text.split(/~|-|–|—/).filter(Boolean);

    if (parts.length < 2) {
      return true;
    }

    const startMinutes = getMinutesFromBusinessTimeText(parts[0]);
    const endMinutes = getMinutesFromBusinessTimeText(parts[1]);

    if (startMinutes === null || endMinutes === null) {
      return true;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (startMinutes === endMinutes) {
      return true;
    }

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  };


  const isValidCoord = (lat, lng) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    return (
      Number.isFinite(latNum) &&
      Number.isFinite(lngNum) &&
      latNum !== 0 &&
      lngNum !== 0
    );
  };

  const getDistanceKm = (fromLat, fromLng, toLat, toLng) => {
    const lat1 = Number(fromLat);
    const lng1 = Number(fromLng);
    const lat2 = Number(toLat);
    const lng2 = Number(toLng);

    if (!isValidCoord(lat1, lng1) || !isValidCoord(lat2, lng2)) {
      return Number.POSITIVE_INFINITY;
    }

    const earthRadiusKm = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const rLat1 = (lat1 * Math.PI) / 180;
    const rLat2 = (lat2 * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rLat1) *
        Math.cos(rLat2) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  };

  const formatDistance = (distanceKm) => {
    if (!Number.isFinite(distanceKm)) {
      return "";
    }

    if (distanceKm < 1) {
      return `${Math.max(0.1, distanceKm).toFixed(1)}km`;
    }

    return `${distanceKm.toFixed(1)}km`;
  };

  const sortShopsByDistance = (list = [], lat, lng) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!isValidCoord(latNum, lngNum)) {
      return ensureVisibleList(list);
    }

    return ensureVisibleList(list)
      .map((shop, index) => {
        const shopLat = Number(shop?.lat || shop?.location?.lat);
        const shopLng = Number(shop?.lng || shop?.location?.lng);
        const distanceKm = getDistanceKm(latNum, lngNum, shopLat, shopLng);

        return {
          ...shop,
          distance: Number.isFinite(distanceKm)
            ? formatDistance(distanceKm)
            : shop?.distance || "",
          distanceKm,
          sortIndex: index,
        };
      })
      .sort((a, b) => {
        const aDistance = Number.isFinite(Number(a.distanceKm))
          ? Number(a.distanceKm)
          : Number.POSITIVE_INFINITY;

        const bDistance = Number.isFinite(Number(b.distanceKm))
          ? Number(b.distanceKm)
          : Number.POSITIVE_INFINITY;

        if (aDistance === bDistance) {
          return Number(a.sortIndex || 0) - Number(b.sortIndex || 0);
        }

        return aDistance - bDistance;
      });
  };

  const isBusanCityHallJump = (lat, lng) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    return (
      Math.abs(latNum - BUSAN_CITY_HALL_POSITION.lat) < 0.002 &&
      Math.abs(lngNum - BUSAN_CITY_HALL_POSITION.lng) < 0.002
    );
  };

  const isFallbackShopJump = (lat, lng) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    return FALLBACK_SHOPS.some((shop) => {
      return (
        Math.abs(latNum - Number(shop.lat)) < 0.002 &&
        Math.abs(lngNum - Number(shop.lng)) < 0.002
      );
    });
  };

  const geocodeShopPosition = (shop) => {
    return new Promise((resolve) => {
      try {
        const address =
          shop?.address ||
          shop?.roadAddress ||
          shop?.locationText ||
          shop?.region ||
          "";

        if (
          !address ||
          !window.kakao ||
          !window.kakao.maps ||
          !window.kakao.maps.services ||
          !window.kakao.maps.services.Geocoder
        ) {
          resolve(null);
          return;
        }

        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(address, (result, status) => {
          if (
            status === window.kakao.maps.services.Status.OK &&
            Array.isArray(result) &&
            result.length > 0
          ) {
            const roadItem = result.find((item) => item.road_address) || result[0];

            const nextLat = Number(roadItem.y);
            const nextLng = Number(roadItem.x);

            if (isValidCoord(nextLat, nextLng)) {
              resolve({
                lat: nextLat,
                lng: nextLng,
              });

              return;
            }
          }

          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  };

  const hydrateShopCoordinates = async (list = []) => {
    const normalizedList = ensureVisibleList(list);

    const nextList = await Promise.all(
      normalizedList.map(async (shop, index) => {
        const normalizedShop = normalizeShopItem(shop, index);

        if (isValidCoord(normalizedShop?.lat, normalizedShop?.lng)) {
          return normalizedShop;
        }

        const geo = await geocodeShopPosition(normalizedShop);

        if (!geo || !isValidCoord(geo.lat, geo.lng)) {
          return normalizedShop;
        }

        return normalizeShopItem(
          {
            ...normalizedShop,
            lat: geo.lat,
            lng: geo.lng,
            location: {
              ...(normalizedShop.location || {}),
              lat: geo.lat,
              lng: geo.lng,
            },
          },
          index
        );
      })
    );

    return nextList;
  };

  const loadShops = async (basePosition = position) => {
    try {
      setLoading(true);
      setError("");

      const localList = ensureVisibleList(readLocalShops());

      if (localList.length) {
        setShops(
          basePosition && isValidCoord(basePosition.lat, basePosition.lng)
            ? sortShopsByDistance(localList, basePosition.lat, basePosition.lng)
            : localList
        );
      }

      const res = await Promise.race([
        shopApi.getList(),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              items: localList,
            });
          }, 2500);
        }),
      ]);

      const apiList = ensureVisibleList(res);
      const list = filterDeletedShops(mergeShopLists(apiList, localList));
      const geocodedList = await hydrateShopCoordinates(list);
      const nextList =
        basePosition && isValidCoord(basePosition.lat, basePosition.lng)
          ? sortShopsByDistance(geocodedList, basePosition.lat, basePosition.lng)
          : geocodedList;

      if (!mountedRef.current) return;

      setShops(nextList);
      saveLocalShops(nextList);
      setSelected(null);
      setHiddenShopId("");
      setSelectedImage("");
      setVisibleCount(INITIAL_VISIBLE_COUNT);
    } catch (e) {
      const localList = ensureVisibleList(readLocalShops());
      const geocodedList = await hydrateShopCoordinates(localList);
      const nextList =
        basePosition && isValidCoord(basePosition.lat, basePosition.lng)
          ? sortShopsByDistance(geocodedList, basePosition.lat, basePosition.lng)
          : geocodedList;

      if (!mountedRef.current) return;

      setShops(nextList);
      setSelected(null);
      setHiddenShopId("");
      setSelectedImage("");
      setError("");
      setVisibleCount(INITIAL_VISIBLE_COUNT);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleMapMove = async ({ lat, lng }) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return;
    }

    if (userLocationFixedRef.current) {
      setPosition({
        lat: latNum,
        lng: lngNum,
      });

      setShops((prev) => sortShopsByDistance(prev, latNum, lngNum));

      return;
    }

    try {
      if (mapMoveLoadingRef.current) {
        return;
      }

      if (position && isBusanCityHallJump(latNum, lngNum)) {
        return;
      }

      if (position && userLocationFixedRef.current && isFallbackShopJump(latNum, lngNum)) {
        return;
      }

      if (position && !userLocationLockRef.current && isFallbackShopJump(latNum, lngNum)) {
        return;
      }

      mapMoveLoadingRef.current = true;

      const localList = ensureVisibleList(readLocalShops());

      if (localList.length) {
        setShops((prev) =>
          sortShopsByDistance(mergeShopLists(prev, localList), latNum, lngNum)
        );
      }

      const allRes = await Promise.race([
        shopApi.getList(),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              items: localList,
            });
          }, 2500);
        }),
      ]);

      const allList = filterDeletedShops(mergeShopLists(ensureVisibleList(allRes), localList));

      if (shopApi.getNearby) {
        const res = await Promise.race([
          shopApi.getNearby(latNum, lngNum),
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                items: allList,
              });
            }, 2500);
          }),
        ]);

        const nearbyList = ensureVisibleList(res);
        const mergedList = filterDeletedShops(filterActiveShops(mergeShopLists(nearbyList, allList)));
        const geocodedList = await hydrateShopCoordinates(mergedList);
        const sortedList = sortShopsByDistance(geocodedList, latNum, lngNum);

        if (!sortedList || sortedList.length === 0) {
          await loadShops();
        } else if (mountedRef.current) {
          setShops(sortedList);
          saveLocalShops(sortedList);
          setSelected(null);
          setSelectedImage("");
          setVisibleCount(INITIAL_VISIBLE_COUNT);
        }
      } else if (allList.length > 0) {
        const geocodedList = await hydrateShopCoordinates(allList);
        const sortedList = sortShopsByDistance(geocodedList, latNum, lngNum);

        if (mountedRef.current) {
          setShops(sortedList);
          saveLocalShops(sortedList);
          setSelected(null);
          setSelectedImage("");
          setVisibleCount(INITIAL_VISIBLE_COUNT);
        }
      } else {
        await loadShops();
      }
    } catch (e) {
      console.error("nearby error", e);

      const localList = ensureVisibleList(readLocalShops());

      if (localList.length) {
        const geocodedList = await hydrateShopCoordinates(localList);
        const sortedList = sortShopsByDistance(geocodedList, latNum, lngNum);

        if (mountedRef.current) {
          setShops(sortedList);
          setSelected(null);
          setSelectedImage("");
          setVisibleCount(INITIAL_VISIBLE_COUNT);
        }

        return;
      }

      await loadShops();
    } finally {
      mapMoveLoadingRef.current = false;
      userLocationLockRef.current = false;
    }
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      alert("현재 위치를 사용할 수 없습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        const lat = Number(latitude);
        const lng = Number(longitude);

        if (!isValidCoord(lat, lng)) {
          alert("현재 위치 좌표를 확인할 수 없습니다.");
          return;
        }

        userLocationLockRef.current = true;
        userLocationFixedRef.current = true;

        setPosition({
          lat,
          lng,
        });

        setSelected(null);
        setHiddenShopId("");
        setSelectedImage("");
        setMyLocationMarker({
          _id: "my-location-marker",
          id: "my-location-marker",
          name: "내 위치",
          address: "현재 위치",
          region: "",
          district: "",
          dong: "",
          status: "active",
          lat,
          lng,
          location: {
            lat,
            lng,
          },
          images: [],
          photos: [],
          imageUrls: [],
          courses: [],
          price: [],
        });

        const localList = ensureVisibleList(readLocalShops());

        if (localList.length) {
          setShops((prev) =>
            sortShopsByDistance(mergeShopLists(prev, localList), lat, lng)
          );
        } else {
          setShops((prev) => sortShopsByDistance(prev, lat, lng));
        }

        setVisibleCount(INITIAL_VISIBLE_COUNT);

        loadShops({
          lat,
          lng,
        });

        handleMapMove({
          lat,
          lng,
        });
      },
      () => {
        alert("현재 위치 권한을 허용해주세요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  const handleLandingMassageClick = () => {
    routerNavigate("/massage/map");
  };

  const handleLandingKaraokeClick = () => {
    routerNavigate("/karaoke/map");
  };

  const handleMoreShops = () => {
    setVisibleCount((prev) => prev + VISIBLE_STEP);
  };

  useEffect(() => {
    mountedRef.current = true;

    const currentPath = window.location.pathname;

    if (currentPath === "/") {
      return () => {
        mountedRef.current = false;
      };
    }

    const params = new URLSearchParams(window.location.search);

    const qLat = params.get("lat");
    const qLng = params.get("lng");

    loadShops();

    if (qLat && qLng) {
      const latNum = Number(qLat);
      const lngNum = Number(qLng);

      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        setPosition({
          lat: latNum,
          lng: lngNum,
        });

        userLocationLockRef.current = true;
        userLocationFixedRef.current = true;

        loadShops({
          lat: latNum,
          lng: lngNum,
        });

        handleMapMove({
          lat: latNum,
          lng: lngNum,
        });

        return () => {
          mountedRef.current = false;
        };
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mountedRef.current) return;

          const { latitude, longitude } = pos.coords;

          const lat = Number(latitude);
          const lng = Number(longitude);

          if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return;
          }

          userLocationLockRef.current = true;
          userLocationFixedRef.current = true;

          setPosition({
            lat,
            lng,
          });

          loadShops({
            lat,
            lng,
          });

          handleMapMove({
            lat,
            lng,
          });
        },
        () => {},
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const syncLocalShops = async () => {
      const localList = ensureVisibleList(readLocalShops());

      if (!localList.length) {
        return;
      }

      const nextLocalList = await hydrateShopCoordinates(localList);

      if (!mountedRef.current) {
        return;
      }

      setShops((prev) => {
        const nextList = mergeShopLists(prev, nextLocalList);

        return position && isValidCoord(position.lat, position.lng)
          ? sortShopsByDistance(nextList, position.lat, position.lng)
          : nextList;
      });

      if (selected) {
        const selectedId = selected?._id || selected?.id;

        const updatedSelected = nextLocalList.find((item) => {
          const itemId = item?._id || item?.id;

          return String(itemId) === String(selectedId);
        });

        if (updatedSelected) {
          setSelected(updatedSelected);

          if (isValidCoord(updatedSelected?.lat, updatedSelected?.lng)) {
            setPosition({
              lat: Number(updatedSelected.lat),
              lng: Number(updatedSelected.lng),
            });
          }
        }
      }
    };

    window.addEventListener("shops-updated", syncLocalShops);
    window.addEventListener("storage", syncLocalShops);

    return () => {
      window.removeEventListener("shops-updated", syncLocalShops);
      window.removeEventListener("storage", syncLocalShops);
    };
  }, [selected, position]);

  const handleSearch = async () => {
    try {
      userLocationFixedRef.current = false;
      setLoading(true);
      setError("");

      const params = {};

      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }

      if (region !== "지역") {
        params.region = region;
      }

      if (district !== "구") {
        params.district = district;
      }

      if (dong !== "전체") {
        params.dong = dong;
      }

      const localList = ensureVisibleList(readLocalShops());

      if (localList.length) {
        setShops((prev) => mergeShopLists(prev, localList));
      }

      const res =
        shopApi.search && keyword.trim()
          ? await Promise.race([
              shopApi.search(keyword),
              new Promise((resolve) => {
                setTimeout(() => {
                  resolve({
                    items: localList,
                  });
                }, 2500);
              }),
            ])
          : await Promise.race([
              shopApi.getList(params),
              new Promise((resolve) => {
                setTimeout(() => {
                  resolve({
                    items: localList,
                  });
                }, 2500);
              }),
            ]);

      const apiList = ensureVisibleList(res);
      const filteredApiList = filterRegionSearch(filterDeletedShops(mergeShopLists(apiList, localList)));

      const fallbackRes = await Promise.race([
        shopApi.getList(),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              items: localList,
            });
          }, 2500);
        }),
      ]);

      const fallbackList = filterRegionSearch(
        filterDeletedShops(mergeShopLists(ensureVisibleList(fallbackRes), localList))
      );

      const list = filteredApiList.length > 0 ? filteredApiList : fallbackList;
      const geocodedList = await hydrateShopCoordinates(list);

      if (!mountedRef.current) return;

      setShops(geocodedList);
      saveLocalShops(geocodedList);
      setSelected(null);
      setHiddenShopId("");
      setSelectedImage("");
      setMyLocationMarker(null);
      setVisibleCount(INITIAL_VISIBLE_COUNT);
    } catch (e) {
      const localList = ensureVisibleList(readLocalShops());
      const list = filterRegionSearch(localList);
      const geocodedList = await hydrateShopCoordinates(list);

      if (!mountedRef.current) return;

      setShops(geocodedList);
      setSelected(null);
      setHiddenShopId("");
      setSelectedImage("");
      setError("");
      setMyLocationMarker(null);
      setVisibleCount(INITIAL_VISIBLE_COUNT);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleMarkerClick = async (shop) => {
    const status = String(shop?.status || "active").toLowerCase();

    if (
      status !== "active" &&
      status !== "open" &&
      status !== "approved" &&
      status !== "enable" &&
      status !== "enabled"
    ) {
      return;
    }

    const currentId = selected?._id || selected?.id;
    const nextId = shop?._id || shop?.id;

    if (currentId && nextId && String(currentId) === String(nextId)) {
      setSelected(null);
      setHiddenShopId(String(nextId));
      setSelectedImage("");
      setMyLocationMarker(null);
      return;
    }

    userLocationFixedRef.current = false;
    setHiddenShopId("");
    setSelected(shop);
    setSelectedImage("");
    setMyLocationMarker(null);

    const lat = Number(shop?.lat);
    const lng = Number(shop?.lng);

    if (isValidCoord(lat, lng)) {
      setPosition({
        lat,
        lng,
      });

      return;
    }

    const geo = await geocodeShopPosition(shop);

    if (geo && isValidCoord(geo.lat, geo.lng) && mountedRef.current) {
      const nextShop = normalizeShopItem({
        ...shop,
        lat: geo.lat,
        lng: geo.lng,
        location: {
          lat: geo.lat,
          lng: geo.lng,
        },
      });

      setSelected(nextShop);
      setPosition({
        lat: geo.lat,
        lng: geo.lng,
      });

      setShops((prev) =>
        filterActiveShops(
          prev.map((item) => {
            const itemId = item?._id || item?.id;
            const shopId = shop?._id || shop?.id;

            if (itemId && shopId && String(itemId) === String(shopId)) {
              return nextShop;
            }

            return item;
          })
        )
      );
    }
  };

  const handleListClick = async (shop) => {
    const status = String(shop?.status || "active").toLowerCase();

    if (
      status !== "active" &&
      status !== "open" &&
      status !== "approved" &&
      status !== "enable" &&
      status !== "enabled"
    ) {
      return;
    }

    const currentId = selected?._id || selected?.id;
    const nextId = shop?._id || shop?.id;

    if (currentId && nextId && String(currentId) === String(nextId)) {
      setSelected(null);
      setHiddenShopId(String(nextId));
      setSelectedImage("");
      setMyLocationMarker(null);
      return;
    }

    userLocationFixedRef.current = false;
    setHiddenShopId("");
    setSelected(shop);
    setSelectedImage("");
    setMyLocationMarker(null);

    const lat = Number(shop?.lat);
    const lng = Number(shop?.lng);

    if (isValidCoord(lat, lng)) {
      setPosition({
        lat,
        lng,
      });

      return;
    }

    const geo = await geocodeShopPosition(shop);

    if (
      geo &&
      isValidCoord(geo.lat, geo.lng) &&
      !(position && isBusanCityHallJump(geo.lat, geo.lng)) &&
      mountedRef.current
    ) {
      const nextShop = normalizeShopItem({
        ...shop,
        lat: geo.lat,
        lng: geo.lng,
        location: {
          lat: geo.lat,
          lng: geo.lng,
        },
      });

      setSelected(nextShop);

      setPosition({
        lat: geo.lat,
        lng: geo.lng,
      });

      setShops((prev) =>
        filterActiveShops(
          prev.map((item) => {
            const itemId = item?._id || item?.id;
            const shopId = shop?._id || shop?.id;

            if (itemId && shopId && String(itemId) === String(shopId)) {
              return nextShop;
            }

            return item;
          })
        )
      );
    }
  };

  useEffect(() => {
    if (!selected) {
      setReviews([]);
      return;
    }

    loadReviews(selected._id || selected.id);
  }, [selected]);

  const loadReviews = async (shopId) => {
    try {
      setReviewLoading(true);

      if (!reviewApi || typeof reviewApi.getByShop !== "function") {
        setReviews([]);
        return;
      }

      const res = await reviewApi.getByShop(shopId);
      const list = res?.list || res?.data || res?.items || [];

      setReviews(Array.isArray(list) ? list : []);
    } catch (e) {
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  };

  const goReservation = () => {
    if (!selected) return;

    const id = selected._id || selected.id;

    if (!id) return;

    saveSelectedShop(selected);

    routerNavigate(`/karaoke/shop-detail/${id}`, {
      state: {
        shop: selected,
      },
    });
  };

  const getShopRating = (shop, index = 0) => {
    const value = Number(shop?.rating || shop?.avgRating || shop?.averageRating || 0);

    if (value > 0) {
      return value.toFixed(1);
    }

    return index % 3 === 0 ? "5.0" : index % 3 === 1 ? "4.9" : "4.8";
  };

  const getShopReviewCount = (shop, index = 0) => {
    const value = Number(shop?.reviewCount || shop?.reviewsCount || shop?.reviewTotal || 0);

    if (value > 0) {
      return value;
    }

    return [125, 256, 189, 245, 32, 40][index % 6];
  };

  const getShopDistance = (shop, index = 0) => {
    const userLat = Number(position?.lat);
    const userLng = Number(position?.lng);
    const shopLat = Number(shop?.lat || shop?.location?.lat);
    const shopLng = Number(shop?.lng || shop?.location?.lng);

    if (isValidCoord(userLat, userLng) && isValidCoord(shopLat, shopLng)) {
      const distanceKm = getDistanceKm(userLat, userLng, shopLat, shopLng);
      const formattedDistance = formatDistance(distanceKm);

      if (formattedDistance) {
        return formattedDistance;
      }
    }

    if (shop?.distance) {
      return shop.distance;
    }

    return ["0.1km", "0.1km", "0.2km", "0.2km", "2.4km", "2.6km"][index % 6];
  };

  const getOriginalPrice = (shop, index = 0) => {
    const pricingRow = getPrimaryCoursePricingRow(shop, index);

    if (pricingRow?.originalPrice > 0) {
      return pricingRow.originalPrice;
    }

    if (Array.isArray(shop?.originalPrice) && shop.originalPrice[index] !== undefined) {
      return Number(shop.originalPrice[index]) || 0;
    }

    if (shop?.originalPrice !== undefined && shop?.originalPrice !== null && shop?.originalPrice !== "") {
      return Number(shop.originalPrice) || 0;
    }

    const prices = Array.isArray(shop?.price) ? shop.price : [];
    const price = Number(prices[index] || prices[0] || 0);

    if (!price) return 0;

    return Math.round(price * 1.78);
  };

  const getSalePrice = (shop, index = 0) => {
    const pricingRow = getPrimaryCoursePricingRow(shop, index);

    if (pricingRow?.salePrice > 0) {
      return pricingRow.salePrice;
    }

    const prices = Array.isArray(shop?.price)
      ? shop.price
      : shop?.price !== undefined && shop?.price !== null && shop?.price !== ""
      ? [shop.price]
      : [];

    const price = Number(prices[index] || prices[0] || 0);

    return price || [45000, 50000, 55000, 50000, 40000, 60000][index % 6];
  };

  const getDiscountRate = (shop, index = 0) => {
    const pricingRow = getPrimaryCoursePricingRow(shop, index);

    if (pricingRow && pricingRow.originalPrice > 0 && pricingRow.salePrice > 0) {
      return pricingRow.discountRate || 0;
    }

    const sale = getSalePrice(shop, index);
    const original = getOriginalPrice(shop, index);

    if (sale > 0 && original > sale) {
      return Math.max(1, Math.round(((original - sale) / original) * 100));
    }

    return [44, 39, 45, 38, 33, 33][index % 6];
  };

  const getCourseLabel = (shop, index = 0) => {
    const pricingRow = getPrimaryCoursePricingRow(shop, index);

    if (pricingRow) {
      return [pricingRow.title, pricingRow.period === "night" ? "야간" : "주간", pricingRow.duration]
        .filter(Boolean)
        .join(" ");
    }

    const rows = getCoursePriceRows(shop);

    if (rows[index]?.course && rows[index].course !== "-") {
      return rows[index].course;
    }

    if (rows[0]?.course && rows[0].course !== "-") {
      return rows[0].course;
    }

    return ["건식 관리 60분", "아로마 관리 90분", "타이 관리 60분", "스웨디시 관리 90분"][index % 4];
  };

  const visibleShops = Array.isArray(filterRegionSearch(filterActiveShops(filterDeletedShops(shops))))
    ? filterRegionSearch(filterActiveShops(filterDeletedShops(shops)))
    : [];

  const displayShops = visibleShops.length > 0 ? visibleShops : [];

  const displayedShopList = displayShops.slice(0, visibleCount);

  const mapShops = selected && !isDeletedShop(selected)
    ? [selected].filter(Boolean)
    : filterDeletedShops(displayShops).filter((shop, index) => {
        const shopId = getShopId(shop, index);

        return !hiddenShopId || String(shopId) !== String(hiddenShopId);
      });

  const selectedForPopup = selected || null;

  if (window.location.pathname === "/") {
    return (
      <div style={styles.landingPage}>
        <header style={styles.landingHeader}>
          <button
            type="button"
            onClick={() => routerNavigate("/")}
            style={styles.landingLogo}
          >
            노라
          </button>

          <div style={styles.landingMenu}>
            <button type="button" style={styles.landingHeaderButton}>커뮤니티</button>
            <button type="button" style={styles.landingHeaderButton} onClick={() => routerNavigate("/login")}>로그인</button>
            <button type="button" style={styles.landingHeaderButton} onClick={() => routerNavigate("/signup")}>회원가입</button>
            <button type="button" style={styles.landingHeaderButton}>제휴 문의</button>
          </div>
        </header>

        <main style={styles.landingHero}>
          <div style={styles.landingSpaSide}>
            <div style={styles.landingBed} />
            <div style={styles.landingCandleShelf} />
          </div>

          <div style={styles.landingKaraokeSide}>
            <div style={styles.landingNeonSign}>NORA<br />KARAOKE</div>
            <div style={styles.landingMic} />
          </div>

          <section style={styles.landingCenter}>
            <p style={styles.landingSubTitle}>오늘의 피로는 힐링으로</p>
            <h1 style={styles.landingTitle}>
              오늘의 <span style={styles.landingTitleGold}>즐거움은</span> 노래로
            </h1>
            <p style={styles.landingDesc}>마사지와 노래방을 한 번에!</p>
            <p style={styles.landingDesc}>노라에서 특별한 하루를 완성하세요</p>

            <div style={styles.landingCtaRow}>
              <button type="button" onClick={handleLandingMassageClick} style={styles.landingMassageButton}>
                <span style={styles.landingCtaIcon}>♙</span>
                <span>
                  <strong style={styles.landingCtaTitle}>마사지 매장 찾기</strong>
                  <small style={styles.landingCtaSmall}>편안한 휴식</small>
                </span>
                <span style={styles.landingCtaArrow}>→</span>
              </button>

              <button type="button" onClick={handleLandingKaraokeClick} style={styles.landingKaraokeButton}>
                <span style={styles.landingCtaIcon}>♬</span>
                <span>
                  <strong style={styles.landingCtaTitle}>노래방 매장 찾기</strong>
                  <small style={styles.landingCtaSmall}>신나는 즐거움</small>
                </span>
                <span style={styles.landingCtaArrow}>→</span>
              </button>
            </div>
          </section>

          <section style={styles.landingFeatureBar}>
            <div style={styles.landingFeatureItem}>
              <span style={styles.landingFeatureIcon}>▣</span>
              <div>
                <strong style={styles.landingFeatureTitle}>간편한 예약</strong>
                <p style={styles.landingFeatureText}>원하는 시간에 빠르게</p>
              </div>
            </div>

            <div style={styles.landingFeatureItem}>
              <span style={styles.landingFeatureIcon}>♧</span>
              <div>
                <strong style={styles.landingFeatureTitle}>다양한 선택</strong>
                <p style={styles.landingFeatureText}>전국의 다양한 매장</p>
              </div>
            </div>

            <div style={styles.landingFeatureItem}>
              <span style={styles.landingFeatureIcon}>%</span>
              <div>
                <strong style={styles.landingFeatureTitle}>실시간 할인</strong>
                <p style={styles.landingFeatureText}>특가 & 이벤트 제공</p>
              </div>
            </div>

            <div style={styles.landingFeatureItem}>
              <span style={styles.landingFeatureIcon}>▣</span>
              <div>
                <strong style={styles.landingFeatureTitle}>안전한 이용</strong>
                <p style={styles.landingFeatureText}>검증된 매장만 제공</p>
              </div>
            </div>

            <div style={styles.landingFeatureItem}>
              <span style={styles.landingFeatureIcon}>◎</span>
              <div>
                <strong style={styles.landingFeatureTitle}>포인트 혜택</strong>
                <p style={styles.landingFeatureText}>예약할 때마다 적립</p>
              </div>
            </div>
          </section>

          <section style={styles.landingPremium}>
            <div style={styles.landingPremiumTop}>
              <h2 style={styles.landingPremiumTitle}>지역별 프리미엄</h2>

              <div style={styles.landingTabs}>
                {["전체", "서울", "경기", "부산", "대구", "인천", "광주", "대전"].map((item, index) => (
                  <button
                    type="button"
                    key={item}
                    style={index === 0 ? styles.landingTabActive : styles.landingTab}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <button type="button" style={styles.landingMore}>더보기 ›</button>
            </div>

            <div style={styles.landingCards}>
              {[
                ["마사지", "프리미엄 힐링 스파", "4.9", "230", "강남구", "아로마 관리 90분", "39%", "82,000원", "50,000원"],
                ["마사지", "아로마 힐링 스파", "4.8", "178", "서초구", "타이 관리 60분", "38%", "80,000원", "50,000원"],
                ["마사지", "타이 마사지 명가", "4.9", "312", "송파구", "타이 관리 90분", "44%", "90,000원", "50,000원"],
                ["노래방", "스타코인 노래연습장", "4.8", "156", "강남구", "주간 2시간", "37%", "32,000원", "20,000원"],
                ["노래방", "럭셔리 룸 노래방", "4.9", "214", "서초구", "주간 2시간", "35%", "31,000원", "20,000원"],
                ["노래방", "퍼펙트 파티룸", "5.0", "161", "송파구", "야간 3시간", "40%", "50,000원", "30,000원"],
              ].map((item, index) => (
                <div key={`${item[1]}-${index}`} style={styles.landingCard}>
                  <div style={styles.landingCardImage}>
                    <span style={item[0] === "마사지" ? styles.landingCardTypeMassage : styles.landingCardTypeKaraoke}>
                      {item[0]}
                    </span>
                    <span style={styles.landingCardHeart}>♡</span>
                    <div style={index < 3 ? styles.landingCardSpaGlow : styles.landingCardKaraokeGlow} />
                  </div>

                  <div style={styles.landingCardBody}>
                    <h3 style={styles.landingCardTitle}>{item[1]}</h3>
                    <div style={styles.landingCardMeta}>
                      <span style={styles.landingStar}>★</span>
                      <strong style={styles.landingRating}>{item[2]}</strong>
                      <span style={styles.landingReview}>({item[3]})</span>
                      <span style={styles.landingDivider}>|</span>
                      <span style={styles.landingDistrict}>{item[4]}</span>
                    </div>
                    <p style={styles.landingCourse}>{item[5]}</p>
                    <div style={styles.landingPriceRow}>
                      <span style={styles.landingDiscount}>{item[6]}</span>
                      <span style={styles.landingOriginal}>{item[7]}</span>
                      <strong style={styles.landingSale}>{item[8]}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topHeader}>
        <button type="button" onClick={() => routerNavigate("/")} style={styles.logoBtn}>
          노라
        </button>

        <div style={styles.headerMenu}>
          <button type="button" style={styles.headerButton}>커뮤니티</button>
          <button type="button" style={styles.headerButton} onClick={() => routerNavigate("/login")}>로그인</button>
          <button type="button" style={styles.headerButton} onClick={() => routerNavigate("/signup")}>회원가입</button>
          <button type="button" style={styles.headerButton}>제휴 문의</button>
        </div>
      </div>

      <div style={styles.mainWrap}>
        <aside style={styles.left}>
          <h3 style={styles.title}>노래방 목록</h3>

          <div style={styles.searchBox}>
            <div style={styles.regionRow}>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setDistrict(REGION_MAP[e.target.value]?.[0] || "구");
                  setDong("전체");
                }}
                style={styles.regionSelect}
              >
                {Object.keys(REGION_MAP)
                  .filter((item) => item !== "지역")
                  .map((item) => (
                    <option key={item} value={item} style={styles.regionOption}>
                      {item === "경남" ? "경상남도" : item}
                    </option>
                  ))}
              </select>

              <select
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setDong("전체");
                }}
                style={styles.regionSelect}
              >
                {(REGION_MAP[region] || ["구"]).map((item) => (
                  <option key={item} value={item} style={styles.regionOption}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={dong}
                onChange={(e) => setDong(e.target.value)}
                style={styles.regionSelect}
              >
                {(district === "김해시" ? GIMHAE_DONG_OPTIONS : ["전체"]).map((item) => (
                  <option key={item} value={item} style={styles.regionOption}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.searchInputWrap}>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="지역, 매장명으로 검색"
                style={styles.input}
              />

              <button type="button" onClick={handleSearch} style={styles.inputSearchButton}>
                ⌕
              </button>
            </div>
          </div>

          {loading && (
            <div style={styles.stateBox}>
              <Loading message="매장 불러오는 중..." />
            </div>
          )}

          {error && (
            <div style={styles.stateBox}>
              <ErrorMessage message={error} onRetry={loadShops} />
            </div>
          )}

          {!loading && !error && displayShops.length === 0 && (
            <div style={styles.stateBox}>
              <EmptyState message="표시할 매장이 없습니다." />
            </div>
          )}

          {!loading && !error && displayShops.length > 0 && (
            <div style={styles.list}>
              {displayedShopList.map((shop, idx) => {
                const id = getShopId(shop, idx);
                const representativeImage = getRepresentativeImage(shop);
                const isPremiumActive = isPremiumShop(shop);
                const active =
                  (selected?._id || selected?.id) === (shop?._id || shop?.id);
                const businessOpen = isShopBusinessOpen(shop?.businessHours || shop?.openingHours || shop?.hours || "");

                return (
                  <div
                    key={id}
                    onClick={() => handleListClick(shop)}
                    style={{
                      ...styles.shopCard,
                      ...(isPremiumActive ? styles.premiumShopCard : {}),
                      ...(!businessOpen ? styles.closedShopCard : {}),
                      ...(active ? styles.shopCardActive : {}),
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 0 18px rgba(255, 204, 0, 0.78), inset 0 0 14px rgba(255, 204, 0, 0.12)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        active
                          ? styles.shopCardActive.boxShadow
                          : isPremiumActive
                          ? styles.premiumShopCard.boxShadow
                          : styles.shopCard.boxShadow;
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.opacity = businessOpen ? styles.shopCard.opacity || "" : styles.closedShopCard.opacity;
                      e.currentTarget.style.filter = businessOpen ? styles.shopCard.filter || "" : styles.closedShopCard.filter;
                    }}
                  >
                    <div style={styles.cardImageWrap}>
                      {!!representativeImage ? (
                        <img
                          src={representativeImage}
                          alt={shop?.name || "shop"}
                          style={styles.shopThumb}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div style={styles.shopThumbFallback}>
                          <div style={styles.fallbackGlowOne} />
                          <div style={styles.fallbackGlowTwo} />
                        </div>
                      )}

                      {isPremiumActive && (
                        <span style={styles.bestBadge}>PREMIUM</span>
                      )}
                    </div>

                    <div style={styles.cardBody}>
                      <div style={styles.cardTitleRow}>
                        <strong style={styles.shopName}>
                          {shop?.name || "이름 없음"}
                        </strong>

                        <span style={businessOpen ? styles.businessOpenInlineText : styles.businessReadyInlineText}>
                          {businessOpen ? "ⓘ 영업중 입니다." : "ⓘ 영업 준비중입니다."}
                        </span>

                        {idx < 3 && <span style={styles.bestSmallBadge}>BEST</span>}

                        <button
                          type="button"
                          style={styles.heartButton}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          ♡
                        </button>
                      </div>

                      <div style={styles.courseText}>{getCourseLabel(shop, idx)}</div>

                      <div style={styles.ratingRow}>
                        <span style={styles.star}>★</span>
                        <span style={styles.cardAddress}>
                          {shop?.address || shop?.roadAddress || shop?.locationText || "주소 정보 없음"}
                        </span>
                        <span style={styles.distanceIcon}>⌖</span>
                        <span style={styles.distance}>{getShopDistance(shop, idx)}</span>
                      </div>

                      <div style={styles.priceRow}>
                        <span style={styles.discountBox}>{getDiscountRate(shop, idx)}%</span>
                        <span style={styles.originalPrice}>
                          {getOriginalPrice(shop, idx).toLocaleString()}원
                        </span>
                        <strong style={styles.salePrice}>
                          {getSalePrice(shop, idx).toLocaleString()}원
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {displayShops.length > visibleCount && (
            <button type="button" onClick={handleMoreShops} style={styles.moreButton}>
              더 많은 매장 보기 <span style={styles.moreArrow}>›</span>
            </button>
          )}
        </aside>

        <section style={styles.right}>
          <div style={styles.mapFrame}>
            <KakaoMap
              shops={Array.isArray(mapShops) ? mapShops : []}
              selectedShopId={selected ? (selected._id || selected.id) : ""}
              onMarkerClick={handleMarkerClick}
              onMapMove={handleMapMove}
              onMyLocation={handleMyLocation}
              center={position}
              height="100%"
            />

            <div style={styles.mapTint} />
            <div style={styles.mapGrid} />
            <div style={styles.mapDeepOverlay} />

            {(selected || myLocationMarker) && (
              <div style={styles.activePin}>
                <div style={styles.activePinDot} />
              </div>
            )}

            {selectedForPopup && (
              <div style={styles.popupCard}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setSelectedImage("");
                  }}
                  style={styles.popupClose}
                >
                  ×
                </button>

                <div style={styles.popupImageWrap}>
                  {!!getRepresentativeImage(selectedForPopup) ? (
                    <img
                      src={getRepresentativeImage(selectedForPopup)}
                      alt={selectedForPopup?.name || "selected-shop"}
                      style={styles.popupImage}
                    />
                  ) : (
                    <div style={styles.popupImageFallback}>
                      <div style={styles.popupFallbackGlowOne} />
                      <div style={styles.popupFallbackGlowTwo} />
                    </div>
                  )}

                  {isPremiumShop(selectedForPopup) && (
                    <span style={styles.popupBestBadge}>PREMIUM</span>
                  )}
                </div>

                <div style={styles.popupTitleRow}>
                  <strong style={styles.popupTitle}>
                    {selectedForPopup?.name || "더 스크럽 테라피"}
                  </strong>
                  <span style={styles.bestSmallBadge}>BEST</span>
                </div>

                <div style={isShopBusinessOpen(selectedForPopup?.businessHours || selectedForPopup?.openingHours || selectedForPopup?.hours || "") ? styles.businessOpenText : styles.businessReadyText}>
                  {isShopBusinessOpen(selectedForPopup?.businessHours || selectedForPopup?.openingHours || selectedForPopup?.hours || "") ? "ⓘ 영업중 입니다." : "ⓘ 영업 준비중입니다."}
                </div>

                <div style={styles.popupMetaRow}>
                  <span style={styles.distanceIcon}>⌖</span>
                  <span style={styles.popupSmallText}>{getShopDistance(selectedForPopup, 0)}</span>
                </div>

                <div style={styles.popupAddress}>
                  ⌖ {selectedForPopup?.address || "경상남도 김해시 삼계동 1479-2"}
                </div>

                <div style={styles.popupCourse}>{getCourseLabel(selectedForPopup, 0)}</div>

                <div style={styles.popupPriceRow}>
                  <span style={styles.popupDiscount}>{getDiscountRate(selectedForPopup, 0)}%</span>
                  <span style={styles.popupOriginal}>
                    {getOriginalPrice(selectedForPopup, 0).toLocaleString()}원
                  </span>
                  <strong style={styles.popupSale}>
                    {getSalePrice(selectedForPopup, 0).toLocaleString()}원
                  </strong>
                </div>

                <button type="button" onClick={goReservation} style={styles.detailButton}>
                  상세보기
                </button>

              </div>
            )}
          </div>

          {!!selectedImage && (
            <div style={styles.imageModal} onClick={() => setSelectedImage("")}>
              <button
                type="button"
                style={styles.imageModalClose}
                onClick={() => setSelectedImage("")}
              >
                닫기
              </button>

              <img
                src={selectedImage}
                alt="shop-large"
                style={styles.imageModalImg}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const GOLD = "#ffd400";
const GOLD_DARK = "#a77c00";
const PINK = "#ff006e";

const styles = {
  landingPage: {
    width: "100vw",
    minWidth: 1280,
    minHeight: "100vh",
    overflow: "hidden",
    background: "#000",
    color: "#fff",
    fontFamily:
      "Pretendard, Noto Sans KR, -apple-system, BlinkMacSystemFont, system-ui, Segoe UI, sans-serif",
  },
  landingHeader: {
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
  landingLogo: {
    border: "none",
    background: "transparent",
    color: "#fff",
    fontSize: 56,
    lineHeight: "58px",
    fontWeight: 500,
    letterSpacing: "-4px",
    cursor: "pointer",
    textShadow:
      `0 0 3px #fff, 0 0 8px ${PINK}, 0 0 18px ${PINK}, 0 0 30px rgba(255, 0, 110, 0.88)`,
  },
  landingMenu: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  landingHeaderButton: {
    height: 52,
    minWidth: 116,
    padding: "0 22px",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 6,
    background: "linear-gradient(180deg, rgba(8, 8, 8, 0.96), rgba(0, 0, 0, 1))",
    color: "#fff",
    fontSize: 18,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow:
      "0 0 10px rgba(255, 212, 0, 0.65), inset 0 0 10px rgba(255, 212, 0, 0.1)",
    textShadow: "0 0 7px rgba(255, 255, 255, 0.35)",
  },
  landingHero: {
    position: "relative",
    width: "100vw",
    minWidth: 1280,
    height: "100vh",
    background:
      "radial-gradient(circle at 28% 34%, rgba(255, 174, 0, 0.18), transparent 22%), radial-gradient(circle at 78% 30%, rgba(255, 0, 180, 0.18), transparent 24%), #000",
    overflow: "hidden",
  },
  landingSpaSide: {
    position: "absolute",
    left: 0,
    top: 70,
    width: "40%",
    height: 430,
    background:
      "linear-gradient(90deg, rgba(0,0,0,0.18), rgba(0,0,0,0.72)), radial-gradient(circle at 18% 70%, rgba(255, 185, 48, 0.95), transparent 28%), linear-gradient(135deg, #0a0501 0%, #1b0d03 42%, #000 100%)",
    overflow: "hidden",
  },
  landingBed: {
    position: "absolute",
    left: 28,
    bottom: 38,
    width: 345,
    height: 120,
    borderRadius: "55px 55px 18px 18px",
    background:
      "linear-gradient(180deg, rgba(255, 199, 102, 0.95), rgba(88, 45, 12, 0.95))",
    boxShadow:
      "0 0 40px rgba(255, 178, 52, 0.48), inset 0 0 24px rgba(0,0,0,0.45)",
  },
  landingCandleShelf: {
    position: "absolute",
    top: 34,
    left: 210,
    width: 260,
    height: 180,
    background:
      "repeating-linear-gradient(90deg, rgba(255, 174, 42, 0.28) 0 12px, transparent 12px 34px), repeating-linear-gradient(0deg, rgba(255, 174, 42, 0.28) 0 3px, transparent 3px 60px)",
    filter: "drop-shadow(0 0 18px rgba(255, 190, 58, 0.75))",
  },
  landingKaraokeSide: {
    position: "absolute",
    right: 0,
    top: 70,
    width: "40%",
    height: 430,
    background:
      "radial-gradient(circle at 56% 12%, rgba(245, 0, 255, 0.55), transparent 12%), radial-gradient(circle at 86% 62%, rgba(255, 0, 120, 0.58), transparent 18%), linear-gradient(135deg, #050015 0%, #13001d 46%, #000 100%)",
    overflow: "hidden",
  },
  landingNeonSign: {
    position: "absolute",
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
      "0 0 7px #fff, 0 0 14px #ff00d4, 0 0 28px rgba(255, 0, 212, 0.9)",
    boxShadow:
      "0 0 12px rgba(255,0,212,0.8), inset 0 0 16px rgba(255,0,212,0.22)",
  },
  landingMic: {
    position: "absolute",
    right: 72,
    top: 92,
    width: 70,
    height: 250,
    borderRadius: "35px",
    background:
      "linear-gradient(90deg, rgba(255,255,255,0.75), rgba(40,40,40,0.95), rgba(255,255,255,0.45))",
    transform: "rotate(-28deg)",
    boxShadow:
      "0 0 22px rgba(255,255,255,0.35), 0 0 35px rgba(255,0,180,0.45)",
  },
  landingCenter: {
    position: "absolute",
    top: 100,
    left: "50%",
    zIndex: 5,
    width: 760,
    transform: "translateX(-50%)",
    textAlign: "center",
  },
  landingSubTitle: {
    margin: 0,
    color: "#eee",
    fontSize: 35,
    fontWeight: 300,
    letterSpacing: "-1px",
    textShadow: "0 0 10px rgba(255,255,255,0.3)",
  },
  landingTitle: {
    margin: "20px 0 16px",
    color: "#fff",
    fontSize: 64,
    lineHeight: "72px",
    fontWeight: 900,
    letterSpacing: "-4px",
    textShadow:
      "0 0 8px rgba(255,255,255,0.55), 0 0 18px rgba(255,255,255,0.26)",
  },
  landingTitleGold: {
    color: "#ffb400",
    textShadow:
      "0 0 8px rgba(255, 180, 0, 0.85), 0 0 20px rgba(255, 180, 0, 0.58)",
  },
  landingDesc: {
    margin: "8px 0",
    color: "#fff",
    fontSize: 24,
    lineHeight: "30px",
    fontWeight: 300,
    textShadow: "0 0 8px rgba(255,255,255,0.18)",
  },
  landingCtaRow: {
    display: "flex",
    justifyContent: "center",
    gap: 24,
    marginTop: 36,
  },
  landingMassageButton: {
    width: 320,
    height: 102,
    display: "grid",
    gridTemplateColumns: "62px 1fr 44px",
    alignItems: "center",
    gap: 12,
    padding: "0 24px",
    border: `2px solid #ffb400`,
    borderRadius: 16,
    background:
      "linear-gradient(90deg, rgba(255,180,0,0.24), rgba(0,0,0,0.68))",
    color: GOLD,
    cursor: "pointer",
    boxShadow:
      "0 0 16px rgba(255,180,0,0.9), inset 0 0 18px rgba(255,180,0,0.16)",
  },
  landingKaraokeButton: {
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
      `0 0 16px rgba(255,0,110,0.9), inset 0 0 18px rgba(255,0,110,0.16)`,
  },
  landingCtaIcon: {
    fontSize: 44,
    lineHeight: "44px",
    textShadow: "0 0 12px currentColor",
  },
  landingCtaTitle: {
    display: "block",
    fontSize: 23,
    lineHeight: "30px",
    color: "#fff",
    textAlign: "left",
    textShadow: "0 0 8px rgba(255,255,255,0.28)",
  },
  landingCtaSmall: {
    display: "block",
    marginTop: 6,
    fontSize: 17,
    color: "#ffe680",
    textAlign: "left",
  },
  landingCtaArrow: {
    fontSize: 42,
    color: "#fff",
    textShadow: "0 0 12px currentColor",
  },
  landingFeatureBar: {
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
      "0 0 12px rgba(255, 212, 0, 0.58), inset 0 0 18px rgba(255, 212, 0, 0.06)",
  },
  landingFeatureItem: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "0 30px",
    borderRight: "1px solid rgba(167,124,0,0.45)",
  },
  landingFeatureIcon: {
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
  landingFeatureTitle: {
    display: "block",
    color: GOLD,
    fontSize: 20,
    lineHeight: "26px",
    fontWeight: 600,
  },
  landingFeatureText: {
    margin: "6px 0 0",
    color: "#fff",
    fontSize: 15,
    lineHeight: "20px",
  },
  landingPremium: {
    position: "absolute",
    left: 28,
    right: 28,
    top: 600,
    bottom: 20,
    zIndex: 6,
  },
  landingPremiumTop: {
    height: 62,
    display: "grid",
    gridTemplateColumns: "300px 1fr 110px",
    alignItems: "center",
    gap: 18,
  },
  landingPremiumTitle: {
    margin: 0,
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
    textShadow:
      `0 0 5px #fff, 0 0 12px ${PINK}, 0 0 20px rgba(255,0,110,0.85)`,
    boxShadow: `0 0 12px rgba(255,0,110,0.88), inset 0 0 10px rgba(255,0,110,0.08)`,
  },
  landingTabs: {
    display: "flex",
    alignItems: "center",
    gap: 22,
    justifyContent: "center",
  },
  landingTab: {
    border: "none",
    borderRight: `1px solid ${GOLD_DARK}`,
    padding: "0 24px 0 0",
    background: "transparent",
    color: "#ddd",
    fontSize: 18,
    cursor: "pointer",
  },
  landingTabActive: {
    height: 48,
    minWidth: 92,
    border: `2px solid ${GOLD}`,
    borderRadius: 24,
    background: "rgba(255, 180, 0, 0.16)",
    color: GOLD,
    fontSize: 20,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 0 14px rgba(255,212,0,0.85)",
  },
  landingMore: {
    border: "none",
    background: "transparent",
    color: "#fff",
    fontSize: 21,
    cursor: "pointer",
  },
  landingCards: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 18,
    marginTop: 8,
  },
  landingCard: {
    minHeight: 316,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 9,
    overflow: "hidden",
    background: "rgba(0,0,0,0.9)",
    boxShadow:
      "0 0 12px rgba(255, 212, 0, 0.5), inset 0 0 14px rgba(255, 212, 0, 0.04)",
  },
  landingCardImage: {
    position: "relative",
    height: 150,
    background:
      "linear-gradient(135deg, rgba(255,190,70,0.18), rgba(0,0,0,0.85))",
    overflow: "hidden",
  },
  landingCardSpaGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 40% 70%, rgba(255,190,70,0.85), transparent 18%), radial-gradient(circle at 72% 28%, rgba(255,130,0,0.45), transparent 22%), linear-gradient(135deg, #241000, #000)",
  },
  landingCardKaraokeGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 55% 44%, rgba(255,0,180,0.55), transparent 20%), radial-gradient(circle at 30% 30%, rgba(20,80,255,0.72), transparent 24%), linear-gradient(135deg, #050014, #000)",
  },
  landingCardTypeMassage: {
    position: "absolute",
    zIndex: 3,
    top: 12,
    left: 12,
    padding: "6px 13px",
    borderRadius: 5,
    background: "linear-gradient(180deg, #f0a21a, #b86500)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
  },
  landingCardTypeKaraoke: {
    position: "absolute",
    zIndex: 3,
    top: 12,
    left: 12,
    padding: "6px 13px",
    borderRadius: 5,
    background: "linear-gradient(180deg, #9b22c9, #5a087a)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
  },
  landingCardHeart: {
    position: "absolute",
    zIndex: 3,
    right: 14,
    top: 12,
    color: GOLD,
    fontSize: 32,
    lineHeight: "32px",
    textShadow: "0 0 10px rgba(255,212,0,0.8)",
  },
  landingCardBody: {
    padding: "16px 14px 14px",
  },
  landingCardTitle: {
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
  landingCardMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  landingStar: {
    color: GOLD,
    fontSize: 18,
    textShadow: "0 0 8px rgba(255,212,0,0.8)",
  },
  landingRating: {
    color: GOLD,
    fontSize: 17,
  },
  landingReview: {
    color: "#ddd",
    fontSize: 15,
  },
  landingDivider: {
    color: GOLD_DARK,
    margin: "0 4px",
  },
  landingDistrict: {
    color: GOLD,
    fontSize: 15,
  },
  landingCourse: {
    margin: "18px 0",
    color: "#fff",
    fontSize: 15,
  },
  landingPriceRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  landingDiscount: {
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
    boxShadow: `0 0 8px rgba(255,0,110,0.58)`,
  },
  landingOriginal: {
    color: "#aaa",
    fontSize: 14,
    textDecoration: "line-through",
    marginLeft: "auto",
  },
  landingSale: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 500,
    textShadow: "0 0 8px rgba(255,255,255,0.28)",
  },
  page: {
    width: "100vw",
    minWidth: 1280,
    height: "100vh",
    overflow: "hidden",
    background: "#000",
    color: "#fff",
    fontFamily:
      "Pretendard, Noto Sans KR, -apple-system, BlinkMacSystemFont, system-ui, Segoe UI, sans-serif",
  },
  topHeader: {
    height: 76,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px 0 22px",
    background: "#000",
  },
  logoBtn: {
    border: "none",
    background: "transparent",
    color: "#fff",
    fontSize: 50,
    lineHeight: "52px",
    fontWeight: 400,
    letterSpacing: "-3px",
    cursor: "pointer",
    textShadow:
      `0 0 3px #fff, 0 0 8px ${PINK}, 0 0 18px ${PINK}, 0 0 30px rgba(255, 0, 110, 0.88)`,
  },
  headerMenu: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerButton: {
    height: 52,
    minWidth: 118,
    padding: "0 23px",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 6,
    background: "linear-gradient(180deg, rgba(8, 8, 8, 0.98), rgba(0, 0, 0, 1))",
    color: "#fff",
    fontSize: 19,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow:
      "0 0 8px rgba(255, 212, 0, 0.48), inset 0 0 10px rgba(255, 212, 0, 0.1)",
    textShadow: "0 0 7px rgba(255, 255, 255, 0.35)",
  },
  mainWrap: {
    height: "calc(100vh - 76px)",
    display: "flex",
    gap: 12,
    padding: "0 8px 8px 8px",
    background: "#000",
  },
  left: {
    width: 700,
    height: "100%",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 12,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "16px 14px 0",
    background:
      "linear-gradient(180deg, rgba(6, 6, 6, 0.98), rgba(0, 0, 0, 0.99))",
    color: GOLD,
    boxShadow:
      "0 0 10px rgba(255, 212, 0, 0.34), inset 0 0 18px rgba(255, 212, 0, 0.04)",
    scrollbarWidth: "thin",
    scrollbarColor: `${GOLD} #050505`,
  },
  right: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    position: "relative",
    background: "#000",
  },
  title: {
    margin: "0 0 16px",
    color: GOLD,
    fontSize: 24,
    lineHeight: "28px",
    fontWeight: 500,
    letterSpacing: "-1px",
    textShadow: "0 0 9px rgba(255, 212, 0, 0.56)",
  },
  searchBox: {
    marginBottom: 14,
  },
  regionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 14,
    marginBottom: 11,
  },
  regionSelect: {
    height: 44,
    padding: "0 14px",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 6,
    background:
      "linear-gradient(180deg, rgba(6, 6, 6, 0.98), rgba(0, 0, 0, 1))",
    color: "#fff",
    outline: "none",
    fontWeight: 500,
    fontSize: 16,
    boxShadow:
      "0 0 7px rgba(255, 212, 0, 0.36), inset 0 0 8px rgba(255, 212, 0, 0.06)",
  },
  regionOption: {
    color: "#111",
    background: "#fff",
  },
  searchInputWrap: {
    position: "relative",
    width: "100%",
  },
  input: {
    width: "100%",
    height: 44,
    boxSizing: "border-box",
    padding: "0 52px 0 15px",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 5,
    background: "#030303",
    color: "#fff",
    outline: "none",
    fontSize: 15,
    boxShadow:
      "0 0 7px rgba(255, 212, 0, 0.25), inset 0 0 10px rgba(255, 212, 0, 0.04)",
  },
  inputSearchButton: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 48,
    height: 44,
    border: "none",
    background: "transparent",
    color: GOLD,
    fontSize: 30,
    lineHeight: "40px",
    cursor: "pointer",
    textShadow: "0 0 10px rgba(255, 212, 0, 0.8)",
    transform: "rotate(-15deg)",
  },
  stateBox: {
    color: "#fff",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    boxShadow: "0 0 8px rgba(255, 212, 0, 0.28)",
  },
  list: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  shopCard: {
    height: 310,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 7,
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    background:
      "linear-gradient(180deg, rgba(4, 4, 4, 0.99), rgba(0, 0, 0, 1))",
    boxShadow:
      "0 0 8px rgba(255, 212, 0, 0.24), inset 0 0 10px rgba(255, 212, 0, 0.03)",
    transition: "transform 160ms ease, box-shadow 160ms ease",
  },
  shopCardActive: {
    boxShadow:
      "0 0 16px rgba(255, 212, 0, 0.7), inset 0 0 14px rgba(255, 212, 0, 0.08)",
  },
  premiumShopCard: {
    border: `2px solid ${GOLD}`,
    boxShadow:
      "0 0 18px rgba(255, 212, 0, 0.95), 0 0 34px rgba(255, 180, 0, 0.42), inset 0 0 16px rgba(255, 212, 0, 0.12)",
  },
  closedShopCard: {
    opacity: 0.58,
    filter: "brightness(0.62) saturate(0.72)",
  },
  cardImageWrap: {
    width: "100%",
    height: 180,
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
    background: "#050505",
  },
  shopThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    filter: "contrast(1.18) saturate(1.25) brightness(0.7)",
  },
  shopThumbFallback: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 20% 30%, rgba(0, 76, 255, 0.9), transparent 24%), radial-gradient(circle at 80% 40%, rgba(255, 0, 110, 0.72), transparent 22%), linear-gradient(135deg, #041144 0%, #060018 46%, #0b0007 100%)",
  },
  fallbackGlowOne: {
    position: "absolute",
    width: 160,
    height: 4,
    left: 10,
    top: 62,
    background: "#006EFF",
    boxShadow: "0 0 14px #006EFF, 0 0 28px #006EFF",
    transform: "rotate(8deg)",
  },
  fallbackGlowTwo: {
    position: "absolute",
    width: 140,
    height: 3,
    right: 0,
    top: 112,
    background: PINK,
    boxShadow: `0 0 14px ${PINK}, 0 0 28px ${PINK}`,
    transform: "rotate(-18deg)",
  },
  bestBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: "4px 13px",
    borderRadius: 4,
    color: "#fff",
    background: PINK,
    fontSize: 20,
    fontWeight: 900,
    boxShadow: `0 0 10px rgba(255, 0, 110, 0.82)`,
  },
  heartButton: {
    display: "none",
    marginLeft: "auto",
    border: "none",
    background: "transparent",
    color: GOLD,
    fontSize: 24,
    lineHeight: "24px",
    cursor: "pointer",
    textShadow: "0 0 10px rgba(255, 212, 0, 0.8)",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    padding: "14px 14px 12px",
    display: "flex",
    flexDirection: "column",
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minHeight: 23,
  },
  shopName: {
    color: "#fff",
    fontSize: 19,
    lineHeight: "24px",
    fontWeight: 500,
    letterSpacing: "-0.8px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textShadow: "0 0 6px rgba(255,255,255,0.2)",
  },
  bestSmallBadge: {
    display: "none",
    padding: "2px 5px",
    borderRadius: 2,
    color: "#fff",
    background: PINK,
    fontSize: 10,
    fontWeight: 900,
    boxShadow: `0 0 7px rgba(255, 0, 110, 0.65)`,
  },
  ratingRow: {
    display: "flex",
    height: 22,
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    fontSize: 14,
  },
  star: {
    color: GOLD,
    fontSize: 17,
    textShadow: "0 0 7px rgba(255, 212, 0, 0.8)",
  },
  rating: {
    color: GOLD,
    fontSize: 14,
    fontWeight: 600,
  },
  reviewCount: {
    color: "#bcbcbc",
    fontSize: 13,
  },
  cardAddress: {
    minWidth: 0,
    color: "#d6d6d6",
    fontSize: 13,
    lineHeight: "20px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  distanceIcon: {
    color: GOLD,
    marginLeft: "auto",
    fontSize: 16,
    textShadow: "0 0 7px rgba(255, 212, 0, 0.8)",
  },
  distance: {
    color: "#d5d5d5",
    fontSize: 13,
  },
  courseText: {
    marginTop: 4,
    paddingBottom: 0,
    borderBottom: "none",
    color: "#bdbdbd",
    fontSize: 15,
    lineHeight: "22px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  businessOpenText: {
    marginTop: 6,
    color: GOLD,
    fontSize: 20,
    fontWeight: 600,
  },
  businessReadyText: {
    marginTop: 6,
    color: "#ff4d4d",
    fontSize: 20,
    fontWeight: 700,
    textShadow: "0 0 8px rgba(255, 77, 77, 0.45)",
  },
  businessOpenInlineText: {
    marginLeft: "auto",
    color: GOLD,
    fontSize: 19,
    lineHeight: "24px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    textAlign: "right",
  },
  businessReadyInlineText: {
    marginLeft: "auto",
    color: "#ff4d4d",
    fontSize: 19,
    lineHeight: "24px",
    fontWeight: 900,
    whiteSpace: "nowrap",
    textAlign: "right",
    textShadow: "0 0 10px rgba(255, 77, 77, 0.58)",
  },
  priceRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: "auto",
  },
  discountBox: {
    minWidth: 51,
    height: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${PINK}`,
    borderRadius: 3,
    color: "#fff",
    fontSize: 20,
    fontWeight: 500,
    boxShadow: `0 0 7px rgba(255, 0, 110, 0.55)`,
  },
  originalPrice: {
    color: "#9a9a9a",
    fontSize: 14,
    textDecoration: "line-through",
    marginLeft: "auto",
  },
  salePrice: {
    color: "#fff",
    fontSize: 21,
    fontWeight: 500,
    textShadow: "0 0 8px rgba(255, 255, 255, 0.32)",
  },
  moreButton: {
    width: "100%",
    height: 38,
    marginTop: 12,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: "0 0 8px 8px",
    background: "#030303",
    color: "#fff",
    fontSize: 15,
    fontWeight: 400,
    cursor: "pointer",
    boxShadow:
      "0 0 8px rgba(255, 212, 0, 0.28), inset 0 0 8px rgba(255, 212, 0, 0.04)",
  },
  moreArrow: {
    float: "right",
    paddingRight: 8,
    color: GOLD,
    fontSize: 26,
    lineHeight: "18px",
  },
  mapFrame: {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 12,
    background: "#000",
    boxShadow:
      "0 0 10px rgba(255, 212, 0, 0.32), inset 0 0 18px rgba(255, 212, 0, 0.04)",
  },
  mapTint: {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
    zIndex: 2,
    background:
      "linear-gradient(90deg, rgba(0,0,0,0.42), rgba(0,0,0,0.34)), radial-gradient(circle at 52% 42%, rgba(255,0,110,0.025), transparent 18%), rgba(0,0,0,0.12)",
    backdropFilter: "blur(0.15px)",
    mixBlendMode: "multiply",
  },
  mapGrid: {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
    zIndex: 3,
    opacity: 0.12,
    backgroundImage:
      "linear-gradient(rgba(255, 148, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 148, 0, 0.07) 1px, transparent 1px)",
    backgroundSize: "120px 120px",
    boxShadow: "inset 0 0 80px rgba(0, 0, 0, 0.42)",
  },
  mapDeepOverlay: {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
    zIndex: 4,
    background:
      "radial-gradient(circle at 53% 41%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.12) 30%, rgba(0,0,0,0.38) 100%)",
  },
  activePin: {
    position: "absolute",
    zIndex: 12,
    top: "27%",
    left: "50%",
    width: 58,
    height: 58,
    borderRadius: "50% 50% 50% 0",
    background: "rgba(255, 0, 110, 0.92)",
    border: "3px solid #fff",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    boxShadow:
      `0 0 10px ${PINK},
       0 0 22px ${PINK},
       0 0 42px rgba(255,0,110,0.82)`,
    pointerEvents: "none",
  },
  activePinDot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    background: "#ffe5ef",
    transform: "translate(-50%, -50%)",
    boxShadow:
      `0 0 8px #fff,
       0 0 18px ${PINK},
       0 0 28px ${PINK}`,
  },
  popupCard: {
    position: "absolute",
    zIndex: 9,
    left: "36%",
    top: "34%",
    width: 320,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 12,
    padding: 12,
    background: "rgba(0, 0, 0, 0.97)",
    color: "#fff",
    boxShadow:
      "0 0 18px rgba(255, 212, 0, 0.7), inset 0 0 14px rgba(255, 212, 0, 0.08)",
  },
  popupClose: {
    position: "absolute",
    top: 8,
    right: 10,
    zIndex: 2,
    border: "none",
    background: "transparent",
    color: "#ff493f",
    fontSize: 30,
    lineHeight: "28px",
    cursor: "pointer",
    textShadow: "0 0 8px rgba(255, 73, 63, 0.8)",
  },
  popupImageWrap: {
    position: "relative",
    width: "100%",
    height: 150,
    overflow: "hidden",
    borderRadius: 7,
    background: "#070707",
  },
  popupImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    filter: "contrast(1.18) saturate(1.25) brightness(0.72)",
  },
  popupImageFallback: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 20% 28%, rgba(0, 76, 255, 0.92), transparent 25%), radial-gradient(circle at 78% 45%, rgba(255, 0, 110, 0.74), transparent 24%), linear-gradient(135deg, #041144 0%, #060018 46%, #0b0007 100%)",
  },
  popupFallbackGlowOne: {
    position: "absolute",
    width: 220,
    height: 4,
    left: 18,
    top: 44,
    background: "#006EFF",
    boxShadow: "0 0 18px #006EFF, 0 0 36px #006EFF",
    transform: "rotate(8deg)",
  },
  popupFallbackGlowTwo: {
    position: "absolute",
    width: 180,
    height: 3,
    right: 10,
    top: 72,
    background: PINK,
    boxShadow: `0 0 18px ${PINK}, 0 0 36px ${PINK}`,
    transform: "rotate(-18deg)",
  },
  popupBestBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    padding: "2px 8px",
    borderRadius: 3,
    color: "#fff",
    background: PINK,
    fontSize: 12,
    fontWeight: 900,
    boxShadow: `0 0 9px rgba(255, 0, 110, 0.75)`,
  },
  popupTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
  },
  popupTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 500,
    letterSpacing: "-1px",
    textShadow: "0 0 7px rgba(255,255,255,0.2)",
  },
  popupMetaRow: {
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
    marginTop: 4,
    borderBottom: "1px solid rgba(255, 212, 0, 0.14)",
    paddingBottom: 8,
  },
  heartPink: {
    color: PINK,
    marginLeft: 14,
    fontSize: 17,
    textShadow: `0 0 7px ${PINK}`,
  },
  popupSmallText: {
    color: "#d6d6d6",
    fontSize: 13,
  },
  popupAddress: {
    marginTop: 12,
    color: "#bfbfbf",
    fontSize: 13,
    lineHeight: "22px",
  },
  popupCourse: {
    marginTop: 14,
    color: "#fff",
    fontSize: 16,
  },
  popupPriceRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 9,
  },
  popupDiscount: {
    minWidth: 66,
    height: 34,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${PINK}`,
    borderRadius: 4,
    color: "#fff",
    fontSize: 26,
    fontWeight: 500,
    boxShadow: `0 0 8px rgba(255, 0, 110, 0.52)`,
  },
  popupOriginal: {
    color: "#8d8d8d",
    fontSize: 15,
    textDecoration: "line-through",
    marginLeft: "auto",
  },
  popupSale: {
    color: "#fff",
    fontSize: 26,
    fontWeight: 500,
    textShadow: "0 0 10px rgba(255,255,255,0.3)",
  },
  detailButton: {
    width: "100%",
    height: 47,
    marginTop: 15,
    border: "none",
    borderRadius: 4,
    background: "linear-gradient(180deg, #f20056, #c60045)",
    color: "#fff",
    fontSize: 18,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: `0 0 13px rgba(255, 0, 110, 0.58)`,
  },
  popupReviewText: {
    marginTop: 8,
    color: "#888",
    fontSize: 12,
  },
  imageModal: {
    position: "absolute",
    inset: 0,
    zIndex: 50,
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  imageModalImg: {
    maxWidth: "92%",
    maxHeight: "88%",
    objectFit: "contain",
    borderRadius: 12,
    border: `2px solid ${GOLD}`,
    background: "#111",
    boxShadow: "0 0 26px rgba(255, 212, 0, 0.82)",
  },
  imageModalClose: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 51,
    background: GOLD,
    color: "#000",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 0 14px rgba(255, 212, 0, 0.82)",
  },
};

export default KaraokeMapPage;