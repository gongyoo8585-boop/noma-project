"use strict";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_LOCATION = {
  lat: 37.5665,
  lng: 126.978,
};

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

function normalizeCategory(shop) {
  const category =
    shop?.category ||
    shop?.type ||
    shop?.shopType ||
    "";

  const lower = String(category).toLowerCase();

  if (
    lower.includes("karaoke") ||
    lower.includes("노래") ||
    lower.includes("코인")
  ) {
    return "karaoke";
  }

  return "massage";
}

function sortNearbyShops(shops, location) {
  return [...shops]
    .map((shop) => {
      const lat =
        shop?.lat ??
        shop?.latitude ??
        shop?.location?.lat ??
        shop?.coords?.lat;

      const lng =
        shop?.lng ??
        shop?.longitude ??
        shop?.location?.lng ??
        shop?.coords?.lng;

      const premium =
        shop?.premium === true ||
        shop?.isPremium === true ||
        shop?.premiumActive === true;

      return {
        ...shop,
        premium,
        distanceKm: getDistanceKm(
          location.lat,
          location.lng,
          lat,
          lng
        ),
      };
    })
    .sort((a, b) => {
      if (a.premium !== b.premium) {
        return a.premium ? -1 : 1;
      }

      return a.distanceKm - b.distanceKm;
    });
}

export default function useNearbyShops(shops = []) {
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [locationLoaded, setLocationLoaded] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationLoaded(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        setLocationLoaded(true);
      },
      () => {
        setUserLocation(DEFAULT_LOCATION);
        setLocationLoaded(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  }, []);

  const groupedShops = useMemo(() => {
    const massage = [];
    const karaoke = [];

    shops.forEach((shop) => {
      const category = normalizeCategory(shop);

      if (category === "karaoke") {
        karaoke.push(shop);
        return;
      }

      massage.push(shop);
    });

    const sortedMassage = sortNearbyShops(
      massage,
      userLocation
    ).slice(0, 3);

    const sortedKaraoke = sortNearbyShops(
      karaoke,
      userLocation
    ).slice(0, 3);

    return {
      massage: sortedMassage,
      karaoke: sortedKaraoke,
      all: [...sortedMassage, ...sortedKaraoke],
    };
  }, [shops, userLocation]);

  return {
    userLocation,
    locationLoaded,
    nearbyMassageShops: groupedShops.massage,
    nearbyKaraokeShops: groupedShops.karaoke,
    nearbyShops: groupedShops.all,
  };
}