"use strict";

import React from "react";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

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
  대구: [
    "군위군",
    "남구",
    "달서구",
    "달성군",
    "동구",
    "북구",
    "서구",
    "수성구",
    "중구",
  ],
  인천: [
    "강화군",
    "계양구",
    "남동구",
    "동구",
    "미추홀구",
    "부평구",
    "서구",
    "연수구",
    "옹진군",
    "중구",
  ],
  광주: [
    "광산구",
    "남구",
    "동구",
    "북구",
    "서구",
  ],
  대전: [
    "대덕구",
    "동구",
    "서구",
    "유성구",
    "중구",
  ],
  울산: [
    "남구",
    "동구",
    "북구",
    "울주군",
    "중구",
  ],
  세종: ["세종"],
  경기: [
    "가평군",
    "고양시",
    "과천시",
    "광명시",
    "광주시",
    "구리시",
    "군포시",
    "김포시",
    "남양주시",
    "동두천시",
    "부천시",
    "성남시",
    "수원시",
    "시흥시",
    "안산시",
    "안성시",
    "안양시",
    "양주시",
    "양평군",
    "여주시",
    "연천군",
    "오산시",
    "용인시",
    "의왕시",
    "의정부시",
    "이천시",
    "파주시",
    "평택시",
    "포천시",
    "하남시",
    "화성시",
  ],
  강원: [
    "강릉시",
    "고성군",
    "동해시",
    "삼척시",
    "속초시",
    "양구군",
    "양양군",
    "영월군",
    "원주시",
    "인제군",
    "정선군",
    "철원군",
    "춘천시",
    "태백시",
    "평창군",
    "홍천군",
    "화천군",
    "횡성군",
  ],
  충북: [
    "괴산군",
    "단양군",
    "보은군",
    "영동군",
    "옥천군",
    "음성군",
    "제천시",
    "증평군",
    "진천군",
    "청주시",
    "충주시",
  ],
  충남: [
    "계룡시",
    "공주시",
    "금산군",
    "논산시",
    "당진시",
    "보령시",
    "부여군",
    "서산시",
    "서천군",
    "아산시",
    "예산군",
    "천안시",
    "청양군",
    "태안군",
    "홍성군",
  ],
  전북: [
    "고창군",
    "군산시",
    "김제시",
    "남원시",
    "무주군",
    "부안군",
    "순창군",
    "완주군",
    "익산시",
    "임실군",
    "장수군",
    "전주시",
    "정읍시",
    "진안군",
  ],
  전남: [
    "강진군",
    "고흥군",
    "곡성군",
    "광양시",
    "구례군",
    "나주시",
    "담양군",
    "목포시",
    "무안군",
    "보성군",
    "순천시",
    "신안군",
    "여수시",
    "영광군",
    "영암군",
    "완도군",
    "장성군",
    "장흥군",
    "진도군",
    "함평군",
    "해남군",
    "화순군",
  ],
  경북: [
    "경산시",
    "경주시",
    "고령군",
    "구미시",
    "김천시",
    "문경시",
    "봉화군",
    "상주시",
    "성주군",
    "안동시",
    "영덕군",
    "영양군",
    "영주시",
    "영천시",
    "예천군",
    "울릉군",
    "울진군",
    "의성군",
    "청도군",
    "청송군",
    "칠곡군",
    "포항시",
  ],
  경남: [
    "거제시",
    "거창군",
    "고성군",
    "김해시",
    "남해군",
    "밀양시",
    "사천시",
    "산청군",
    "양산시",
    "의령군",
    "진주시",
    "창녕군",
    "창원시",
    "통영시",
    "하동군",
    "함안군",
    "함양군",
    "합천군",
  ],
  제주: [
    "서귀포시",
    "제주시",
  ],
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "https://api.nora365.co.kr";

const getImageValue = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return (
      value.url ||
      value.src ||
      value.path ||
      value.location ||
      value.image ||
      value.imageUrl ||
      ""
    );
  }

  return "";
};

const normalizeImageUrl = (value) => {
  const imageValue = getImageValue(value);

  if (!imageValue) {
    return "";
  }

  if (
    imageValue.startsWith("http://") ||
    imageValue.startsWith("https://") ||
    imageValue.startsWith("data:") ||
    imageValue.startsWith("blob:")
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

const getShopImage = (shop) => {
  const imageCandidates = [
    shop?.representativeImage,
    shop?.mainImage,
    shop?.thumbnail,
    shop?.thumb,
    shop?.image,
    shop?.imageUrl,
    shop?.photo,
    shop?.photoUrl,
    Array.isArray(shop?.images) ? shop.images[0] : "",
    Array.isArray(shop?.photos) ? shop.photos[0] : "",
    Array.isArray(shop?.imageUrls) ? shop.imageUrls[0] : "",
    Array.isArray(shop?.files) ? shop.files[0] : "",
  ];

  for (const imageCandidate of imageCandidates) {
    const imageUrl = normalizeImageUrl(imageCandidate);

    if (imageUrl) {
      return imageUrl;
    }
  }

  return "";
};

function ShopSearchPanel({
  keyword = "",
  setKeyword,
  region = "지역",
  setRegion,
  district = "구",
  setDistrict,
  onSearch,
  loading = false,
  error = "",
  shops = [],
  selectedShopId = "",
  onShopClick,
}) {
  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>📍 매장 목록</h3>

      <div style={styles.searchBox}>
        <div style={styles.regionRow}>
          <select
            value={region}
            onChange={(e) => {
              if (typeof setRegion === "function") {
                setRegion(e.target.value);
              }

              if (typeof setDistrict === "function") {
                setDistrict("구");
              }
            }}
            style={styles.regionSelect}
          >
            {Object.keys(REGION_MAP).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={district}
            onChange={(e) => {
              if (typeof setDistrict === "function") {
                setDistrict(e.target.value);
              }
            }}
            style={styles.regionSelect}
          >
            {(REGION_MAP[region] || ["구"]).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <input
          value={keyword}
          onChange={(e) => {
            if (typeof setKeyword === "function") {
              setKeyword(e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (typeof onSearch === "function") {
                onSearch();
              }
            }
          }}
          placeholder="지역 또는 매장명을 입력해주세요."
          style={styles.input}
        />

        <button
          type="button"
          onClick={() => {
            if (typeof onSearch === "function") {
              onSearch();
            }
          }}
          style={styles.searchBtn}
        >
          검색
        </button>
      </div>

      {loading && (
        <Loading message="매장 불러오는 중..." />
      )}

      {!!error && !loading && (
        <ErrorMessage message={error} />
      )}

      {!loading &&
        !error &&
        (!Array.isArray(shops) ||
          shops.length === 0) && (
          <EmptyState message="표시할 매장이 없습니다." />
        )}

      {!loading &&
        !error &&
        Array.isArray(shops) &&
        shops.length > 0 && (
          <div style={styles.list}>
            {shops.map((shop, index) => {
              const shopId =
                shop?._id ||
                shop?.id ||
                `shop-${index}`;

              const image = getShopImage(shop);

              const isSelected =
                String(selectedShopId || "") ===
                String(shopId);

              return (
                <div
                  key={shopId}
                  onClick={() => {
                    if (
                      typeof onShopClick ===
                      "function"
                    ) {
                      onShopClick(shop);
                    }
                  }}
                  style={{
                    ...styles.shopCard,
                    border:
                      isSelected
                        ? "1px solid #d4af37"
                        : "1px solid #333",
                  }}
                >
                  {!!image && (
                    <img
                      src={image}
                      alt={shop?.name || "shop"}
                      style={styles.shopImage}
                    />
                  )}

                  <div style={styles.shopContent}>
                    <div style={styles.shopName}>
                      {shop?.name || "매장"}
                    </div>

                    <div style={styles.shopAddress}>
                      {shop?.address ||
                        shop?.region ||
                        "주소 없음"}
                    </div>

                    {!!shop?.phone && (
                      <div style={styles.shopPhone}>
                        {shop.phone}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    height: "100%",
    background: "#000",
    color: "#d4af37",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  title: {
    margin: "0 0 12px",
    color: "#d4af37",
    fontSize: 22,
    fontWeight: "bold",
  },

  searchBox: {
    marginBottom: 12,
  },

  regionRow: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
  },

  regionSelect: {
    flex: 1,
    padding: 12,
    border: "1px solid #444",
    borderRadius: 20,
    background: "#111",
    color: "#d4af37",
    outline: "none",
    fontWeight: "bold",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #444",
    borderRadius: 8,
    background: "#111",
    color: "#fff",
    outline: "none",
  },

  searchBtn: {
    width: "100%",
    marginTop: 8,
    padding: 12,
    cursor: "pointer",
    background: "#d4af37",
    border: "none",
    borderRadius: 8,
    color: "#000",
    fontWeight: "bold",
    fontSize: 15,
  },

  list: {
    flex: 1,
    overflowY: "auto",
    display: "grid",
    gap: 10,
    paddingRight: 4,
  },

  shopCard: {
    background: "#111",
    borderRadius: 10,
    overflow: "hidden",
    cursor: "pointer",
    transition: "0.2s ease",
  },

  shopImage: {
    width: "100%",
    height: 180,
    objectFit: "cover",
    display: "block",
    borderBottom: "1px solid #222",
  },

  shopContent: {
    padding: 12,
  },

  shopName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  shopAddress: {
    marginTop: 6,
    color: "#999",
    fontSize: 13,
    lineHeight: 1.4,
  },

  shopPhone: {
    marginTop: 6,
    color: "#d4af37",
    fontSize: 13,
  },
};

export default ShopSearchPanel;
