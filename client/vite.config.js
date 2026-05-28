import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function createProxyConfig(target, websocket = false, rewritePath = null) {
  return {
    target,
    changeOrigin: true,
    secure: false,
    ws: websocket,
    ...(rewritePath
      ? {
          rewrite: rewritePath,
        }
      : {}),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const LOCAL_API_TARGET =
    env.VITE_LOCAL_API_TARGET || "https://api.nora365.co.kr";

  const WS_TARGET =
    env.VITE_LOCAL_WS_TARGET || "wss://api.nora365.co.kr";

  const DEV_SERVER_HOST = env.VITE_DEV_SERVER_HOST || "localhost";

  const DEV_SERVER_PROTOCOL = env.VITE_DEV_SERVER_PROTOCOL || "ws";

  const DEV_SERVER_CLIENT_PORT = Number(
    env.VITE_DEV_SERVER_CLIENT_PORT || 5173
  );

  const DEV_SERVER_PORT = Number(env.VITE_DEV_SERVER_PORT || 5173);

  const DEV_HMR_PATH = env.VITE_DEV_HMR_PATH || "/vite-hmr";

  return {
    plugins: [react()],

    base: "/",

    build: {
      outDir: "dist",
      assetsDir: "assets",
      emptyOutDir: true,
      sourcemap: false,
    },

    server: {
      host: "0.0.0.0",
      port: DEV_SERVER_PORT,
      strictPort: false,

      hmr: {
        protocol: DEV_SERVER_PROTOCOL,
        host: DEV_SERVER_HOST,
        clientPort: DEV_SERVER_CLIENT_PORT,
        path: DEV_HMR_PATH,
        overlay: true,
      },

      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "nora365.co.kr",
        "www.nora365.co.kr",
        "m.nora365.co.kr",
        "api.nora365.co.kr",
        "cdn.nora365.co.kr",
        ".nora365.co.kr",
      ],

      cors: true,

      proxy: {
        "/api": createProxyConfig(LOCAL_API_TARGET, true),

        "/ws": createProxyConfig(WS_TARGET, true),

        "/uploads": createProxyConfig(LOCAL_API_TARGET),

        "/shops": createProxyConfig(
          LOCAL_API_TARGET,
          false,
          (path) => path.replace(/^\/shops/, "/api/shops")
        ),

        "/reviews": createProxyConfig(
          LOCAL_API_TARGET,
          false,
          (path) => path.replace(/^\/reviews/, "/api/reviews")
        ),

        "/reservations": createProxyConfig(
          LOCAL_API_TARGET,
          false,
          (path) => path.replace(/^\/reservations/, "/api/reservations")
        ),

        "/payments": createProxyConfig(
          LOCAL_API_TARGET,
          false,
          (path) => path.replace(/^\/payments/, "/api/payments")
        ),

        "/payment": createProxyConfig(
          LOCAL_API_TARGET,
          false,
          (path) => path.replace(/^\/payment/, "/api/payment")
        ),

        "/auth": createProxyConfig(
          LOCAL_API_TARGET,
          false,
          (path) => path.replace(/^\/auth/, "/api/auth")
        ),

        "/admin": createProxyConfig(
          LOCAL_API_TARGET,
          false,
          (path) => {
            if (path === "/admin" || path.startsWith("/admin/")) {
              return path.replace(/^\/admin/, "/api/admin");
            }

            return path;
          }
        ),
      },
    },

    preview: {
      host: "0.0.0.0",
      port: 4173,

      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "nora365.co.kr",
        "www.nora365.co.kr",
        "m.nora365.co.kr",
        "api.nora365.co.kr",
        "cdn.nora365.co.kr",
        ".nora365.co.kr",
      ],
    },

    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
  };
});
