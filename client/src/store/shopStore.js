import { create } from "zustand";

const DEFAULT_REGION = "전체";

const normalizeRegion = (value) => {
  if (!value) return "";

  return String(value).trim();
};

const regionMatch = (shop, region) => {
  if (!region || region === DEFAULT_REGION) {
    return true;
  }

  const targetRegion = normalizeRegion(region);

  return (
    normalizeRegion(shop?.region) === targetRegion ||
    normalizeRegion(shop?.area) === targetRegion ||
    normalizeRegion(shop?.district) === targetRegion ||
    normalizeRegion(shop?.city) === targetRegion ||
    normalizeRegion(shop?.address)?.includes(targetRegion)
  );
};

const queryMatch = (shop, query) => {
  if (!query) {
    return true;
  }

  const keyword = String(query).toLowerCase().trim();

  if (!keyword) {
    return true;
  }

  return [
    shop?.name,
    shop?.title,
    shop?.region,
    shop?.area,
    shop?.district,
    shop?.city,
    shop?.address,
    shop?.category,
  ]
    .filter(Boolean)
    .some((value) =>
      String(value).toLowerCase().includes(keyword)
    );
};

const filterShops = (shops = [], region = DEFAULT_REGION, query = "") => {
  return shops.filter((shop) => {
    return (
      regionMatch(shop, region) &&
      queryMatch(shop, query)
    );
  });
};

const useShopStore = create((set, get) => ({
  shops: [],
  filteredShops: [],
  activeRegion: DEFAULT_REGION,
  query: "",

  setShops: (shops = []) => {
    const { activeRegion, query } = get();

    set({
      shops,
      filteredShops: filterShops(
        shops,
        activeRegion,
        query
      ),
    });
  },

  setActiveRegion: (region = DEFAULT_REGION) => {
    const { shops, query } = get();

    set({
      activeRegion: region,
      filteredShops: filterShops(
        shops,
        region,
        query
      ),
    });
  },

  setQuery: (query = "") => {
    const { shops, activeRegion } = get();

    set({
      query,
      filteredShops: filterShops(
        shops,
        activeRegion,
        query
      ),
    });
  },

  clearRegionFilter: () => {
    const { shops, query } = get();

    set({
      activeRegion: DEFAULT_REGION,
      filteredShops: filterShops(
        shops,
        DEFAULT_REGION,
        query
      ),
    });
  },

  clearQuery: () => {
    const { shops, activeRegion } = get();

    set({
      query: "",
      filteredShops: filterShops(
        shops,
        activeRegion,
        ""
      ),
    });
  },
}));

export default useShopStore;