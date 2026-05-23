"use strict";

import React from "react";

/**
=====================================================

🔥 NORA SHOP TAG (ULTRA FINAL COMPLETE)
✔ 실제 프리미엄 골드 컬러 적용
✔ 블랙 + 골드 + 핑크 네온
✔ glow 유지
✔ hover 유지
✔ 선택 상태 유지
✔ size 지원
✔ rounded 유지
✔ outline 유지
✔ 런타임 에러 방지

=====================================================
*/

function ShopTag({
  text = "",
  children,
  selected = false,
  color = "gold",
  size = "md",
  outlined = false,
  rounded = true,
  onClick,
  style = {},
}) {
  const content =
    children || text || "NORA";

  const isPink =
    color === "pink";

  const sizeStyle =
    sizes[size] ||
    sizes.md;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() =>
        onClick &&
        onClick()
      }
      onKeyDown={(e) => {
        if (
          e.key === "Enter" ||
          e.key === " "
        ) {
          onClick &&
            onClick();
        }
      }}
      style={{
        ...styles.tag,

        ...sizeStyle,

        borderRadius:
          rounded
            ? 999
            : 12,

        background:
          outlined
            ? "transparent"
            : isPink
            ? selected
              ? "linear-gradient(135deg, #ff005d 0%, #ff4da6 100%)"
              : "linear-gradient(135deg, rgba(255,0,128,0.16) 0%, rgba(255,77,166,0.16) 100%)"
            : selected
            ? "linear-gradient(135deg, #fff8d6 0%, #f3d36b 32%, #d4af37 58%, #b8860b 100%)"
            : "linear-gradient(135deg, rgba(243,211,107,0.12) 0%, rgba(184,134,11,0.16) 100%)",

        color: outlined
          ? isPink
            ? "#ff4da6"
            : "#f3d36b"
          : isPink
          ? "#fff"
          : selected
          ? "#000"
          : "#f3d36b",

        border: outlined
          ? isPink
            ? "1px solid rgba(255,77,166,0.52)"
            : "1px solid rgba(243,211,107,0.52)"
          : isPink
          ? "1px solid rgba(255,77,166,0.24)"
          : "1px solid rgba(243,211,107,0.24)",

        boxShadow: outlined
          ? isPink
            ? `
              0 0 12px rgba(255,77,166,0.18)
            `
            : `
              0 0 12px rgba(243,211,107,0.18)
            `
          : isPink
          ? `
            0 0 12px rgba(255,0,128,0.18),
            0 0 28px rgba(255,0,128,0.08)
          `
          : `
            0 0 12px rgba(243,211,107,0.18),
            0 0 28px rgba(212,175,55,0.08)
          `,

        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform =
          "translateY(-2px) scale(1.03)";

        e.currentTarget.style.boxShadow =
          isPink
            ? `
              0 0 18px rgba(255,0,128,0.32),
              0 0 42px rgba(255,0,128,0.14)
            `
            : `
              0 0 18px rgba(243,211,107,0.32),
              0 0 42px rgba(212,175,55,0.14)
            `;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform =
          "translateY(0px) scale(1)";

        e.currentTarget.style.boxShadow =
          outlined
            ? isPink
              ? `
                0 0 12px rgba(255,77,166,0.18)
              `
              : `
                0 0 12px rgba(243,211,107,0.18)
              `
            : isPink
            ? `
              0 0 12px rgba(255,0,128,0.18),
              0 0 28px rgba(255,0,128,0.08)
            `
            : `
              0 0 12px rgba(243,211,107,0.18),
              0 0 28px rgba(212,175,55,0.08)
            `;
      }}
    >
      {content}
    </div>
  );
}

const sizes = {
  sm: {
    minHeight: 28,
    padding: "4px 10px",
    fontSize: 11,
  },

  md: {
    minHeight: 36,
    padding: "8px 14px",
    fontSize: 13,
  },

  lg: {
    minHeight: 44,
    padding: "10px 18px",
    fontSize: 15,
  },
};

const styles = {
  tag: {
    position: "relative",

    display: "inline-flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    gap: 6,

    fontWeight: 800,

    lineHeight: 1,

    letterSpacing: 0.4,

    cursor: "pointer",

    userSelect: "none",

    transition:
      "all 0.22s ease",

    backdropFilter:
      "blur(10px)",

    WebkitBackdropFilter:
      "blur(10px)",

    textShadow:
      `
      0 0 10px rgba(255,255,255,0.04)
    `,

    overflow: "hidden",

    boxSizing:
      "border-box",
  },
};

export default ShopTag;