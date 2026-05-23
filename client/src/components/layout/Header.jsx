import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === "/" || location.pathname === "/home";

  return (
    <header
      style={{
        width: "100%",
        height: "96px",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.96)",
        borderBottom: "1px solid rgba(255,187,0,0.35)",
        boxShadow:
          "0 0 30px rgba(255,170,0,0.18), inset 0 -1px 0 rgba(255,187,0,0.2)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            margin: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "64px",
              fontWeight: "900",
              letterSpacing: "-4px",
              lineHeight: 1,
              color: "#fff",
              textShadow:
                "0 0 6px #ff008c, 0 0 12px #ff008c, 0 0 24px #ff008c, 0 0 42px #ff008c",
              fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
            }}
          >
            노라
          </span>
        </button>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <Link
            to="/community"
            style={{
              ...menuButtonStyle,
              ...(location.pathname === "/community" ? activeButtonStyle : {}),
            }}
          >
            커뮤니티
          </Link>

          <Link
            to="/login"
            style={{
              ...menuButtonStyle,
              ...(location.pathname === "/login" ? activeButtonStyle : {}),
            }}
          >
            로그인
          </Link>

          <Link
            to="/register"
            style={{
              ...menuButtonStyle,
              ...(location.pathname === "/register" ? activeButtonStyle : {}),
            }}
          >
            회원가입
          </Link>

          <Link
            to="/partnership"
            style={{
              ...menuButtonStyle,
              ...(location.pathname === "/partnership"
                ? activeButtonStyle
                : {}),
            }}
          >
            제휴 문의
          </Link>
        </nav>
      </div>

      {isHome && (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(255,187,0,0.8), transparent)",
            boxShadow: "0 0 14px rgba(255,187,0,0.9)",
          }}
        />
      )}
    </header>
  );
};

const menuButtonStyle = {
  minWidth: "118px",
  height: "52px",
  padding: "0 22px",
  borderRadius: "10px",
  border: "1px solid rgba(255,187,0,0.75)",
  background:
    "linear-gradient(180deg, rgba(16,16,16,0.96) 0%, rgba(0,0,0,1) 100%)",
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  boxShadow:
    "0 0 12px rgba(255,187,0,0.55), inset 0 0 12px rgba(255,187,0,0.15)",
  textShadow:
    "0 0 6px rgba(255,255,255,0.45), 0 0 12px rgba(255,255,255,0.2)",
  transition: "all 0.2s ease",
  fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
};

const activeButtonStyle = {
  boxShadow:
    "0 0 18px rgba(255,187,0,0.9), inset 0 0 16px rgba(255,187,0,0.2)",
  border: "1px solid rgba(255,221,120,1)",
};

export default Header;