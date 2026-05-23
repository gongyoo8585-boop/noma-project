import React, { useMemo } from "react";

function RegionTabs({
  regions = [],
  activeRegion = "전체",
  onChange,
  query = {},
  setQuery,
  shops = [],
}) {
  /* =========================================
   * REGION NORMALIZE
   * =======================================*/
  const safeRegions = useMemo(() => {
    if (Array.isArray(regions) && regions.length > 0) {
      return regions;
    }

    return [
      "전체",
      "서울",
      "경기",
      "부산",
      "대구",
      "인천",
      "광주",
      "대전",
    ];
  }, [regions]);

  /* =========================================
   * ACTIVE
   * =======================================*/
  const currentRegion =
    activeRegion ||
    query?.region ||
    query?.sido ||
    "전체";

  /* =========================================
   * CLICK
   * =======================================*/
  const handleClick = (region) => {
    try {
      if (typeof onChange === "function") {
        onChange(region);
      }

      if (typeof setQuery === "function") {
        setQuery((prev) => ({
          ...(prev || {}),
          region:
            region === "전체" ? "" : region,
          sido:
            region === "전체" ? "" : region,
        }));
      }
    } catch (e) {
      console.error("RegionTabs click error", e);
    }
  };

  /* =========================================
   * FILTERED COUNT
   * =======================================*/
  const getCount = (region) => {
    try {
      if (!Array.isArray(shops)) return 0;

      if (region === "전체") {
        return shops.length;
      }

      return shops.filter((shop) => {
        const target =
          shop?.region ||
          shop?.sido ||
          shop?.address ||
          "";

        return String(target).includes(region);
      }).length;
    } catch (e) {
      return 0;
    }
  };

  return (
    <div className="region-tabs">
      {safeRegions.map((region) => {
        const active =
          currentRegion === region;

        return (
          <button
            key={region}
            type="button"
            onClick={() => handleClick(region)}
            className={`region-tab ${
              active ? "active" : ""
            }`}
          >
            <span>{region}</span>

            <span className="region-count">
              {getCount(region)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default RegionTabs;