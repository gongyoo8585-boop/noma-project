/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./client/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./client/src/**/*.{js,jsx,ts,tsx}",
  ],

  darkMode: "class",

  theme: {
    extend: {
      colors: {
        background: "#050505",

        neon: {
          gold: "#FFD400",
          pink: "#FF006E",
          black: "#050505",
          card: "#0A0A0A",
          border: "#1A1A1A",
        },
      },

      fontFamily: {
        sans: [
          "Pretendard",
          "Noto Sans KR",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],

        neon: [
          "Pretendard",
          "Noto Sans KR",
          "sans-serif",
        ],
      },

      backgroundImage: {
        "neon-gold":
          "linear-gradient(180deg, rgba(255,212,0,0.16) 0%, rgba(255,212,0,0.03) 100%)",

        "neon-pink":
          "linear-gradient(180deg, rgba(255,0,110,0.18) 0%, rgba(255,0,110,0.04) 100%)",

        "neon-dark":
          "linear-gradient(180deg, rgba(5,5,5,0.98) 0%, rgba(0,0,0,1) 100%)",

        "gold-button":
          "linear-gradient(180deg, rgba(32,24,0,1) 0%, rgba(10,8,0,1) 100%)",

        "pink-button":
          "linear-gradient(180deg, #FF006E 0%, #D1005B 100%)",

        "dark-overlay":
          "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.82) 100%)",
      },

      boxShadow: {
        "neon-gold":
          "0 0 6px rgba(255,212,0,0.95), 0 0 18px rgba(255,212,0,0.55)",

        "neon-gold-lg":
          "0 0 10px rgba(255,212,0,1), 0 0 24px rgba(255,212,0,0.7), 0 0 40px rgba(255,212,0,0.35)",

        "neon-pink":
          "0 0 8px rgba(255,0,110,0.95), 0 0 22px rgba(255,0,110,0.6)",

        "neon-pink-lg":
          "0 0 12px rgba(255,0,110,1), 0 0 30px rgba(255,0,110,0.7), 0 0 46px rgba(255,0,110,0.35)",

        "card-gold":
          "0 0 8px rgba(255,212,0,0.65), 0 0 22px rgba(255,212,0,0.25), inset 0 0 8px rgba(255,212,0,0.08)",

        "card-hover":
          "0 0 14px rgba(255,212,0,0.95), 0 0 34px rgba(255,212,0,0.55), 0 0 56px rgba(255,212,0,0.25)",

        "popup-pink":
          "0 0 14px rgba(255,0,110,0.95), 0 0 30px rgba(255,0,110,0.65)",

        soft:
          "0 12px 28px rgba(0,0,0,0.55)",
      },

      textShadow: {
        gold:
          "0 0 6px rgba(255,212,0,0.9), 0 0 18px rgba(255,212,0,0.45)",

        pink:
          "0 0 8px rgba(255,0,110,0.95), 0 0 22px rgba(255,0,110,0.55)",

        white:
          "0 0 10px rgba(255,255,255,0.55)",
      },

      borderRadius: {
        neon: "18px",
        card: "16px",
        popup: "22px",
      },

      borderColor: {
        gold: "#FFD400",
        pink: "#FF006E",
      },

      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
      },

      backdropBlur: {
        xs: "2px",
      },

      keyframes: {
        neonPulse: {
          "0%, 100%": {
            opacity: "0.85",
            transform: "scale(1)",
          },

          "50%": {
            opacity: "1",
            transform: "scale(1.06)",
          },
        },

        neonFloat: {
          "0%, 100%": {
            transform: "translateY(0px)",
          },

          "50%": {
            transform: "translateY(-3px)",
          },
        },

        neonGlow: {
          "0%, 100%": {
            boxShadow:
              "0 0 8px rgba(255,212,0,0.75), 0 0 20px rgba(255,212,0,0.35)",
          },

          "50%": {
            boxShadow:
              "0 0 14px rgba(255,212,0,1), 0 0 34px rgba(255,212,0,0.65)",
          },
        },

        pinkGlow: {
          "0%, 100%": {
            boxShadow:
              "0 0 10px rgba(255,0,110,0.75), 0 0 24px rgba(255,0,110,0.35)",
          },

          "50%": {
            boxShadow:
              "0 0 16px rgba(255,0,110,1), 0 0 40px rgba(255,0,110,0.65)",
          },
        },
      },

      animation: {
        "neon-pulse":
          "neonPulse 2s ease-in-out infinite",

        "neon-float":
          "neonFloat 2.4s ease-in-out infinite",

        "neon-glow":
          "neonGlow 2.2s ease-in-out infinite",

        "pink-glow":
          "pinkGlow 2s ease-in-out infinite",
      },

      screens: {
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },

  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".text-shadow-gold": {
          textShadow:
            "0 0 6px rgba(255,212,0,0.9), 0 0 18px rgba(255,212,0,0.45)",
        },

        ".text-shadow-pink": {
          textShadow:
            "0 0 8px rgba(255,0,110,0.95), 0 0 22px rgba(255,0,110,0.55)",
        },

        ".text-shadow-white": {
          textShadow:
            "0 0 10px rgba(255,255,255,0.55)",
        },

        ".neon-border-gold": {
          border:
            "1px solid rgba(255,212,0,0.95)",

          boxShadow:
            "0 0 6px rgba(255,212,0,0.85), 0 0 18px rgba(255,212,0,0.45)",
        },

        ".neon-border-pink": {
          border:
            "1px solid rgba(255,0,110,0.95)",

          boxShadow:
            "0 0 8px rgba(255,0,110,0.95), 0 0 24px rgba(255,0,110,0.5)",
        },

        ".cyberpunk-bg": {
          background:
            "radial-gradient(circle at top, rgba(255,0,110,0.08), transparent 24%), radial-gradient(circle at right, rgba(255,212,0,0.08), transparent 24%), #050505",
        },

        ".dark-map-filter": {
          filter:
            "brightness(0.38) contrast(1.2) saturate(0.8)",
        },

        ".glass-dark": {
          background:
            "rgba(0,0,0,0.68)",

          backdropFilter:
            "blur(10px)",
        },
      });
    },
  ],
};