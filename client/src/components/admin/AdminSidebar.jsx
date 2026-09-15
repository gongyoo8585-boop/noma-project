"use strict";

import React from "react";
import { Link, useLocation } from "react-router-dom";

function AdminSidebar() {
  const location = useLocation();

  const isKaraokeAdmin = location.pathname.startsWith("/admin/karaoke");

  const massageMenus = [
    { label: "대시보드", path: "/admin/dashboard" },
    { label: "업체 관리", path: "/admin/shops" },
    { label: "채용 관리", path: "/admin/jobs" },
    { label: "유저 관리", path: "/admin/users" },
    { label: "업체 회원", path: "/admin/users/shop" },
    { label: "관리자", path: "/admin/users/admin" },
    { label: "예약 관리", path: "/admin/reservations" },
    { label: "결제 관리", path: "/admin/payments" },
    { label: "리뷰 관리", path: "/admin/reviews" },
    { label: "신고 관리", path: "/admin/reports" },
    { label: "약관 관리", path: "/admin/terms" },
    { label: "통계", path: "/admin/analytics" },
  ];

  const karaokeMenus = [
    { label: "대시보드", path: "/admin/karaoke/dashboard" },
    { label: "업체 관리", path: "/admin/karaoke/shops" },
    { label: "채용 관리", path: "/admin/karaoke/jobs" },
    { label: "유저 관리", path: "/admin/karaoke/users" },
    { label: "업체 회원", path: "/admin/karaoke/users/shop" },
    { label: "예약 관리", path: "/admin/karaoke/reservations" },
    { label: "결제 관리", path: "/admin/karaoke/payments" },
    { label: "리뷰 관리", path: "/admin/karaoke/reviews" },
    { label: "신고 관리", path: "/admin/karaoke/reports" },
    { label: "통계", path: "/admin/karaoke/analytics" },
  ];

  const menus = isKaraokeAdmin ? karaokeMenus : massageMenus;

  const isActivePath = (path) => {
    const pathname = String(location.pathname || "");
    const search = String(location.search || "");

    if (path === "/admin/dashboard") {
      return pathname === "/admin" || pathname === "/admin/dashboard";
    }

    if (path === "/admin/shops") {
      return pathname === "/admin/shops" || pathname === "/admin/massage/shops";
    }

    if (path === "/admin/jobs") {
      return (
        pathname === "/admin/jobs" ||
        pathname.startsWith("/admin/jobs/") ||
        pathname === "/admin/massage/jobs" ||
        pathname.startsWith("/admin/massage/jobs/")
      );
    }

    if (path === "/admin/karaoke/jobs") {
      return pathname === path || pathname.startsWith(`${path}/`);
    }

    if (pathname === path) {
      return true;
    }

    if (pathname.startsWith(`${path}/`)) {
      return true;
    }

    if (
      !isKaraokeAdmin &&
      pathname.startsWith("/admin/massage/") &&
      path.startsWith("/admin/")
    ) {
      const massageEquivalent = path.replace("/admin/", "/admin/massage/");
      if (pathname === massageEquivalent || pathname.startsWith(`${massageEquivalent}/`)) {
        return true;
      }
    }

    if (search && path.includes("?")) {
      const [targetPath, targetSearch] = path.split("?");
      return pathname === targetPath && search.includes(targetSearch);
    }

    return false;
  };

  const handleMenuClick = (event, path) => {
    try {
      event.preventDefault();

      if (window.location.pathname === path) {
        return;
      }

      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.dispatchEvent(new Event("auth-updated"));
    } catch (_) {
      window.location.href = path;
    }
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandWrap}>
        <div style={styles.brand}>NOMA ADMIN</div>
        <div style={styles.subBrand}>
          {isKaraokeAdmin ? "KARAOKE PLATFORM" : "MASSAGE PLATFORM"}
        </div>
      </div>

      <nav style={styles.menuList}>
        {menus.map((menu) => {
          const active = isActivePath(menu.path);

          return (
            <Link
              key={menu.path}
              to={menu.path}
              onClick={(event) => handleMenuClick(event, menu.path)}
              style={{
                ...styles.menu,
                ...(active ? styles.activeMenu : {}),
              }}
            >
              {menu.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 230,
    minWidth: 230,
    minHeight: "100vh",
    background: "#050505",
    borderRight: "1px solid #2b2b2b",
    color: "#fff",
    boxSizing: "border-box",
    padding: "22px 14px",
  },
  brandWrap: {
    padding: "0 10px 20px",
    borderBottom: "1px solid #292929",
    marginBottom: 14,
  },
  brand: {
    color: "#d4af37",
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 0.5,
  },
  subBrand: {
    color: "#777",
    marginTop: 5,
    fontSize: 11,
    fontWeight: 700,
  },
  menuList: {
    display: "grid",
    gap: 7,
  },
  menu: {
    display: "block",
    padding: "11px 12px",
    borderRadius: 8,
    border: "1px solid transparent",
    color: "#d7d7d7",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
    background: "transparent",
  },
  activeMenu: {
    color: "#d4af37",
    background: "#15120a",
    border: "1px solid #5d4b18",
  },
};

export default AdminSidebar;
