import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,

    proxy: {
      "/api": {
        target: "http://localhost:10000",
        changeOrigin: true,
        secure: false,
      },

      "/shops": {
        target: "http://localhost:10000",
        changeOrigin: true,
        secure: false,
      },

      "/reviews": {
        target: "http://localhost:10000",
        changeOrigin: true,
        secure: false,
      },

      "/reservations": {
        target: "http://localhost:10000",
        changeOrigin: true,
        secure: false,
      },

      "/payments": {
        target: "http://localhost:10000",
        changeOrigin: true,
        secure: false,
      },

      "/auth": {
        target: "http://localhost:10000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: "0.0.0.0",
    port: 4173,
  },

  /* 🔥 최소 수정 (process 에러 완전 차단) */
  define: {
    process: {},
    "process.env": {},
  },
});