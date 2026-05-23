"use strict";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import EmptyState from "../common/EmptyState";

const DEFAULT_CENTER = {
  lat: 35.2283,
  lng: 128.8897,
};

const BUSAN_CITY_HALL_POSITION = {
  lat: 35.1796,
  lng: 129.0756,
};

const LOCAL_SHOP_KEY = "noma_admin_shops";
const LOCAL_PUBLIC_SHOP_KEY = "noma_local_shops";

const getKakaoKey = () => {
  const envKey =
    window.__ENV__?.KAKAO_KEY ||
    window.__ENV__?.KAKAO_MAP_KEY ||
    window.ENV?.KAKAO_MAP_KEY ||
    "";

  if (
    envKey &&
    typeof envKey === "string" &&
    envKey !== "undefined" &&
    envKey !== "null" &&
    !envKey.includes("%")
  ) {
    return envKey;
  }

  return "290ec1ed8354f004a77502dfef5cbd28";
};

const loadKakaoScript = () => {
  return new Promise((resolve, reject) => {
    if (
      window.kakao &&
      window.kakao.maps &&
      window.kakao.maps.load
    ) {
      window.kakao.maps.load(() => {
        resolve(window.kakao);
      });

      return;
    }

    const existing =
      document.getElementById("kakao-map-sdk");

    if (existing) {
      existing.onload = () => {
        if (
          window.kakao &&
          window.kakao.maps &&
          window.kakao.maps.load
        ) {
          window.kakao.maps.load(() => {
            resolve(window.kakao);
          });
        } else {
          reject(new Error("KAKAO_NOT_READY"));
        }
      };

      existing.onerror = () => {
        reject(new Error("KAKAO_LOAD_FAIL"));
      };

      if (
        window.kakao &&
        window.kakao.maps &&
        window.kakao.maps.load
      ) {
        window.kakao.maps.load(() => {
          resolve(window.kakao);
        });
      }

      return;
    }

    const key = getKakaoKey();

    if (!key) {
      reject(new Error("KAKAO_KEY_MISSING"));
      return;
    }

    const script =
      document.createElement("script");

    script.id = "kakao-map-sdk";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services,clusterer,drawing&autoload=false`;
    script.async = true;

    script.onload = () => {
      if (
        window.kakao &&
        window.kakao.maps &&
        window.kakao.maps.load
      ) {
        window.kakao.maps.load(() => {
          resolve(window.kakao);
        });
      } else {
        reject(new Error("KAKAO_NOT_READY"));
      }
    };

    script.onerror = () => {
      reject(new Error("KAKAO_LOAD_FAIL"));
    };

    document.head.appendChild(script);
  });
};

function MapContainer({
  shops = [],
  selectedShopId = "",
  onMarkerClick,
  onMapMove,
  center = null,
  height = "100vh",
  loading = false,
  error = "",
}) {
  const mapRef = useRef(null);

  const mapInstanceRef =
    useRef(null);

  const markersRef =
    useRef([]);

  const overlaysRef =
    useRef([]);

  const lastSafeCenterRef =
    useRef(DEFAULT_CENTER);

  const programMoveRef =
    useRef(false);

  const geocodeCacheRef =
    useRef({});

  const [mapReady, setMapReady] =
    useState(false);

  const [mapError, setMapError] =
    useState("");

  const [resolvedShops, setResolvedShops] =
    useState([]);

  const [localVersion, setLocalVersion] =
    useState(0);

  const isValidCoord = (
    lat,
    lng
  ) => {
    const latNum =
      Number(lat);

    const lngNum =
      Number(lng);

    return (
      Number.isFinite(
        latNum
      ) &&
      Number.isFinite(
        lngNum
      ) &&
      latNum !== 0 &&
      lngNum !== 0 &&
      latNum >= 33 &&
      latNum <= 39 &&
      lngNum >= 124 &&
      lngNum <= 132
    );
  };

  const isBusanCityHallCoord =
    (lat, lng) => {
      const latNum =
        Number(lat);

      const lngNum =
        Number(lng);

      if (
        !Number.isFinite(
          latNum
        ) ||
        !Number.isFinite(
          lngNum
        )
      ) {
        return false;
      }

      return (
        Math.abs(
          latNum -
            BUSAN_CITY_HALL_POSITION.lat
        ) < 0.002 &&
        Math.abs(
          lngNum -
            BUSAN_CITY_HALL_POSITION.lng
        ) < 0.002
      );
    };

  const getShopId = (
    shop = {},
    index = ""
  ) => {
    return (
      shop?._id ||
      shop?.id ||
      `${shop?.name || "shop"}-${
        shop?.address || "address"
      }-${index}`
    );
  };

  const getShopAddress = (
    shop = {}
  ) => {
    return String(
      shop?.roadAddress ||
        shop?.road_address_name ||
        shop?.address ||
        shop?.locationText ||
        ""
    ).trim();
  };

  const normalizeLocalArray = (
    value
  ) => {
    return Array.isArray(value)
      ? value.filter(
          (item) =>
            item &&
            typeof item === "object"
        )
      : [];
  };

  const readStorageArray = (
    storage,
    key
  ) => {
    try {
      const value =
        JSON.parse(
          storage.getItem(key) ||
            "[]"
        );

      return normalizeLocalArray(
        value
      );
    } catch (e) {
      return [];
    }
  };

  const mergeShopLists = (
    baseList = [],
    nextList = []
  ) => {
    const map = new Map();

    [
      ...normalizeLocalArray(
        baseList
      ),
      ...normalizeLocalArray(
        nextList
      ),
    ].forEach((shop, index) => {
      const key =
        getShopId(
          shop,
          index
        );

      if (!key) {
        return;
      }

      if (!map.has(String(key))) {
        map.set(
          String(key),
          shop
        );
        return;
      }

      const prev =
        map.get(String(key));

      const prevUpdated =
        new Date(
          prev?.updatedAt ||
            prev?.modifiedAt ||
            0
        ).getTime();

      const nextUpdated =
        new Date(
          shop?.updatedAt ||
            shop?.modifiedAt ||
            0
        ).getTime();

      const prevAddress =
        getShopAddress(prev);

      const nextAddress =
        getShopAddress(shop);

      const preferNext =
        nextUpdated >=
          prevUpdated ||
        (!!nextAddress &&
          nextAddress !==
            prevAddress);

      map.set(
        String(key),
        preferNext
          ? {
              ...prev,
              ...shop,
            }
          : {
              ...shop,
              ...prev,
            }
      );
    });

    return Array.from(
      map.values()
    );
  };

  const readLocalShops = () => {
    try {
      const adminLocal =
        readStorageArray(
          localStorage,
          LOCAL_SHOP_KEY
        );

      const publicLocal =
        readStorageArray(
          localStorage,
          LOCAL_PUBLIC_SHOP_KEY
        );

      const adminSession =
        readStorageArray(
          sessionStorage,
          LOCAL_SHOP_KEY
        );

      const publicSession =
        readStorageArray(
          sessionStorage,
          LOCAL_PUBLIC_SHOP_KEY
        );

      return mergeShopLists(
        mergeShopLists(
          publicLocal,
          adminLocal
        ),
        mergeShopLists(
          publicSession,
          adminSession
        )
      );
    } catch (e) {
      return [];
    }
  };

  const setMapCenterSafe = (
    lat,
    lng
  ) => {
    const map =
      mapInstanceRef.current;

    if (
      !map ||
      !window.kakao ||
      !window.kakao.maps
    ) {
      return;
    }

    const latNum =
      Number(lat);

    const lngNum =
      Number(lng);

    if (
      !isValidCoord(
        latNum,
        lngNum
      ) ||
      isBusanCityHallCoord(
        latNum,
        lngNum
      )
    ) {
      return;
    }

    programMoveRef.current =
      true;

    map.setCenter(
      new window.kakao.maps.LatLng(
        latNum,
        lngNum
      )
    );

    lastSafeCenterRef.current =
      {
        lat: latNum,
        lng: lngNum,
      };

    setTimeout(() => {
      programMoveRef.current =
        false;
    }, 350);
  };

  const clearMarkers = () => {
    markersRef.current.forEach(
      (marker) => {
        if (
          marker &&
          typeof marker.setMap ===
            "function"
        ) {
          marker.setMap(null);
        }
      }
    );

    overlaysRef.current.forEach(
      (overlay) => {
        if (
          overlay &&
          typeof overlay.setMap ===
            "function"
        ) {
          overlay.setMap(null);
        }
      }
    );

    markersRef.current = [];
    overlaysRef.current = [];
  };

  const geocodeShop = (
    shop
  ) => {
    return new Promise((resolve) => {
      try {
        const address =
          getShopAddress(shop);

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

        if (
          geocodeCacheRef.current[
            address
          ]
        ) {
          resolve(
            geocodeCacheRef.current[
              address
            ]
          );
          return;
        }

        const geocoder =
          new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(
          address,
          (result, status) => {
            if (
              status ===
                window.kakao.maps.services.Status.OK &&
              Array.isArray(result) &&
              result[0]
            ) {
              const roadItem =
                result.find(
                  (item) =>
                    item.road_address
                ) || result[0];

              const lat =
                Number(roadItem.y);

              const lng =
                Number(roadItem.x);

              if (
                isValidCoord(
                  lat,
                  lng
                ) &&
                !isBusanCityHallCoord(
                  lat,
                  lng
                )
              ) {
                const next = {
                  lat,
                  lng,
                };

                geocodeCacheRef.current[
                  address
                ] = next;

                resolve(next);
                return;
              }
            }

            resolve(null);
          }
        );
      } catch (e) {
        resolve(null);
      }
    });
  };

  const normalizeShopWithCoord =
    async (shop, index) => {
      const lat =
        shop?.lat ??
        shop?.latitude ??
        shop?.location?.lat ??
        shop?.location?.y ??
        shop?.geo?.coordinates?.[1] ??
        "";

      const lng =
        shop?.lng ??
        shop?.longitude ??
        shop?.location?.lng ??
        shop?.location?.x ??
        shop?.geo?.coordinates?.[0] ??
        "";

      const shopId =
        getShopId(shop, index);

      if (
        isValidCoord(
          lat,
          lng
        ) &&
        !isBusanCityHallCoord(
          lat,
          lng
        )
      ) {
        return {
          ...shop,
          _id:
            shop?._id ||
            shop?.id ||
            shopId,
          id:
            shop?.id ||
            shop?._id ||
            shopId,
          lat: Number(lat),
          lng: Number(lng),
          location: {
            ...(shop?.location || {}),
            lat: Number(lat),
            lng: Number(lng),
          },
        };
      }

      const geo =
        await geocodeShop(shop);

      if (
        geo &&
        isValidCoord(
          geo.lat,
          geo.lng
        )
      ) {
        return {
          ...shop,
          _id:
            shop?._id ||
            shop?.id ||
            shopId,
          id:
            shop?.id ||
            shop?._id ||
            shopId,
          lat: geo.lat,
          lng: geo.lng,
          location: {
            ...(shop?.location || {}),
            lat: geo.lat,
            lng: geo.lng,
          },
        };
      }

      return {
        ...shop,
        _id:
          shop?._id ||
          shop?.id ||
          shopId,
        id:
          shop?.id ||
          shop?._id ||
          shopId,
      };
    };

  useEffect(() => {
    let mounted = true;

    async function initKakao() {
      try {
        const kakao =
          await loadKakaoScript();

        if (!mounted) {
          return;
        }

        kakao.maps.load(() => {
          if (!mounted) {
            return;
          }

          setMapReady(true);
          setMapError("");
        });
      } catch (e) {
        if (!mounted) {
          return;
        }

        setMapError(
          "카카오맵 SDK 로딩 실패"
        );
      }
    }

    initKakao();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleLocalSync =
      () => {
        setLocalVersion(
          (prev) => prev + 1
        );
      };

    window.addEventListener(
      "shops-updated",
      handleLocalSync
    );

    window.addEventListener(
      "storage",
      handleLocalSync
    );

    return () => {
      window.removeEventListener(
        "shops-updated",
        handleLocalSync
      );

      window.removeEventListener(
        "storage",
        handleLocalSync
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (
        !Array.isArray(shops)
      ) {
        setResolvedShops([]);
        return;
      }

      const localShops =
        readLocalShops();

      const mergedShops =
        mergeShopLists(
          shops,
          localShops
        );

      const next =
        await Promise.all(
          mergedShops.map(
            (shop, index) =>
              normalizeShopWithCoord(
                shop,
                index
              )
          )
        );

      if (cancelled) {
        return;
      }

      setResolvedShops(next);
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [shops, mapReady, localVersion]);

  useEffect(() => {
    if (
      !mapReady ||
      !window.kakao ||
      !window.kakao.maps ||
      !mapRef.current ||
      mapInstanceRef.current
    ) {
      return;
    }

    const defaultCenter =
      center &&
      isValidCoord(
        center.lat,
        center.lng
      ) &&
      !isBusanCityHallCoord(
        center.lat,
        center.lng
      )
        ? new window.kakao.maps.LatLng(
            Number(
              center.lat
            ),
            Number(
              center.lng
            )
          )
        : new window.kakao.maps.LatLng(
            DEFAULT_CENTER.lat,
            DEFAULT_CENTER.lng
          );

    const map =
      new window.kakao.maps.Map(
        mapRef.current,
        {
          center:
            defaultCenter,
          level: 5,
        }
      );

    mapInstanceRef.current =
      map;

    if (
      center &&
      isValidCoord(
        center.lat,
        center.lng
      ) &&
      !isBusanCityHallCoord(
        center.lat,
        center.lng
      )
    ) {
      lastSafeCenterRef.current =
        {
          lat: Number(
            center.lat
          ),
          lng: Number(
            center.lng
          ),
        };

      setMapCenterSafe(
        Number(center.lat),
        Number(center.lng)
      );
    }

    if (
      typeof onMapMove ===
      "function"
    ) {
      window.kakao.maps.event.addListener(
        map,
        "dragend",
        () => {
          if (
            programMoveRef.current
          ) {
            return;
          }

          const mapCenter =
            map.getCenter();

          const lat =
            mapCenter.getLat();

          const lng =
            mapCenter.getLng();

          if (
            isValidCoord(
              lat,
              lng
            ) &&
            !isBusanCityHallCoord(
              lat,
              lng
            )
          ) {
            lastSafeCenterRef.current =
              {
                lat,
                lng,
              };

            onMapMove({
              lat,
              lng,
            });
          }
        }
      );
    }

    setTimeout(() => {
      try {
        window.kakao.maps.event.trigger(
          map,
          "resize"
        );

        map.setCenter(
          defaultCenter
        );
      } catch (e) {
        console.warn(
          "MAP RESIZE ERROR:",
          e.message
        );
      }
    }, 250);
  }, [
    mapReady,
    center,
    onMapMove,
  ]);

  useEffect(() => {
    const map =
      mapInstanceRef.current;

    if (
      !map ||
      !window.kakao ||
      !window.kakao.maps
    ) {
      return;
    }

    if (
      center &&
      isValidCoord(
        center.lat,
        center.lng
      ) &&
      !isBusanCityHallCoord(
        center.lat,
        center.lng
      )
    ) {
      setMapCenterSafe(
        Number(center.lat),
        Number(center.lng)
      );
    }
  }, [center]);

  useEffect(() => {
    const map =
      mapInstanceRef.current;

    if (
      !map ||
      !window.kakao ||
      !window.kakao.maps
    ) {
      return;
    }

    clearMarkers();

    const validShops =
      Array.isArray(resolvedShops)
        ? resolvedShops.filter(
            (shop) =>
              String(
                shop?._id ||
                  shop?.id ||
                  ""
              ) !==
                "my-location-marker" &&
              isValidCoord(
                shop?.lat,
                shop?.lng
              ) &&
              !isBusanCityHallCoord(
                shop?.lat,
                shop?.lng
              )
          )
        : [];

    validShops.forEach(
      (shop, index) => {
        const shopId =
          getShopId(
            shop,
            index
          );

        const markerPosition =
          new window.kakao.maps.LatLng(
            Number(
              shop.lat
            ),
            Number(
              shop.lng
            )
          );

        const isSelected =
          selectedShopId
            ? String(
                selectedShopId
              ) ===
              String(shopId)
            : validShops.length ===
              1;

        if (!isSelected) {
          return;
        }

        const markerContent =
          document.createElement(
            "button"
          );

        markerContent.type =
          "button";

        markerContent.setAttribute(
          "aria-label",
          shop?.name || "매장"
        );

        markerContent.style.width =
          "58px";
        markerContent.style.height =
          "58px";
        markerContent.style.border =
          "none";
        markerContent.style.padding =
          "0";
        markerContent.style.margin =
          "0";
        markerContent.style.background =
          "transparent";
        markerContent.style.cursor =
          "pointer";
        markerContent.style.pointerEvents =
          "auto";
        markerContent.style.position =
          "relative";

        markerContent.innerHTML = `
          <div
            style="
              width:58px;
              height:58px;
              position:relative;
              display:flex;
              align-items:center;
              justify-content:center;
              pointer-events:none;
            "
          >
            <div
              style="
                width:22px;
                height:22px;
                border-radius:50%;
                background:#ff2f92;
                border:3px solid #ffd5ea;
                box-shadow:
                  0 0 14px rgba(255,0,128,0.95),
                  0 0 34px rgba(255,0,128,0.82),
                  0 0 64px rgba(255,0,128,0.42);
                position:absolute;
                top:8px;
                left:50%;
                transform:translateX(-50%);
                z-index:2;
              "
            ></div>

            <div
              style="
                width:0;
                height:0;
                border-left:18px solid transparent;
                border-right:18px solid transparent;
                border-top:34px solid #ff2f92;
                position:absolute;
                top:18px;
                left:50%;
                transform:translateX(-50%);
                filter:
                  drop-shadow(0 0 12px rgba(255,0,128,0.82))
                  drop-shadow(0 0 24px rgba(255,0,128,0.52));
              "
            ></div>

            <div
              style="
                position:absolute;
                bottom:0;
                width:10px;
                height:10px;
                border-radius:50%;
                background:#ffd5ea;
                box-shadow:
                  0 0 10px rgba(255,0,128,0.92),
                  0 0 18px rgba(255,0,128,0.52);
              "
            ></div>
          </div>
        `;

        markerContent.onclick =
          (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (
              typeof onMarkerClick ===
              "function"
            ) {
              onMarkerClick(shop);
            }
          };

        const marker =
          new window.kakao.maps.CustomOverlay(
            {
              position:
                markerPosition,
              content:
                markerContent,
              xAnchor: 0.5,
              yAnchor: 1,
              zIndex: 30,
            }
          );

        marker.setMap(map);

        setMapCenterSafe(
          Number(shop.lat),
          Number(shop.lng)
        );

        markersRef.current.push(
          marker
        );
      }
    );

    return () => {
      clearMarkers();
    };
  }, [
    resolvedShops,
    selectedShopId,
    onMarkerClick,
  ]);

  if (mapError) {
    return (
      <ErrorMessage
        fullPage
        message={mapError}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height,
        position:
          "relative",
        background:
          "#000",
      }}
    >
      {(loading ||
        !mapReady) && (
        <div
          style={{
            position:
              "absolute",
            inset: 0,
            zIndex: 20,
            background:
              "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          <Loading message="지도 불러오는 중..." />
        </div>
      )}

      {!!error && (
        <div
          style={{
            position:
              "absolute",
            top: 20,
            left: 20,
            right: 20,
            zIndex: 20,
          }}
        >
          <ErrorMessage
            message={error}
          />
        </div>
      )}

      {!loading &&
        !error &&
        mapReady &&
        Array.isArray(
          resolvedShops
        ) &&
        resolvedShops.length ===
          0 && (
          <div
            style={{
              position:
                "absolute",
              top: 20,
              left: 20,
              right: 20,
              zIndex: 20,
            }}
          >
            <EmptyState message="표시할 매장이 없습니다." />
          </div>
        )}

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

export default MapContainer;