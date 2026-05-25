import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const PRODUCTION_API_TARGET = "https://api.nora365.co.kr";
const DEVELOPMENT_API_FALLBACK = "https://api.nora365.co.kr";

function normalizeTarget(value, fallback, mode = "development") {
  const target = String(value || "").trim();
  const safeFallback = mode === "production" ? PRODUCTION_API_TARGET : fallback;

  if (!target || target === "undefined" || target === "null") {
    return safeFallback;
  }

  if (mode === "production" && isLocalApiTarget(target)) {
    return PRODUCTION_API_TARGET;
  }

  return target.replace(/\/+$/, "");
}

function isLocalApiTarget(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(
    String(value || "").trim()
  );
}

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
    configure(proxy) {
      proxy.on("proxyReq", (proxyReq, req) => {
        const method = req && req.method ? req.method : "";
        const url = req && req.url ? req.url : "";

        if (
          url.startsWith("/api") ||
          url.startsWith("/shops") ||
          url.startsWith("/auth") ||
          url.startsWith("/admin")
        ) {
          console.log(`[VITE PROXY] ${method} ${url} -> ${target}`);
        }
      });

      proxy.on("proxyRes", (proxyRes, req) => {
        const method = req && req.method ? req.method : "";
        const url = req && req.url ? req.url : "";
        const statusCode = proxyRes && proxyRes.statusCode ? proxyRes.statusCode : "";

        if (
          url.startsWith("/api") ||
          url.startsWith("/shops") ||
          url.startsWith("/auth") ||
          url.startsWith("/admin")
        ) {
          console.log(`[VITE PROXY RESPONSE] ${method} ${url} -> ${statusCode}`);
        }
      });

      proxy.on("error", (err, req, res) => {
        const message = err && err.message ? err.message : "PROXY_ERROR";
        const url = req && req.url ? req.url : "";
        const method = req && req.method ? req.method : "";

        console.error(`[VITE PROXY ERROR] ${method} ${url} -> ${target}: ${message}`);

        if (res && !res.headersSent) {
          res.writeHead(502, {
            "Content-Type": "application/json; charset=utf-8",
          });
        }

        if (res && !res.writableEnded) {
          res.end(
            JSON.stringify({
              ok: false,
              message: "API_PROXY_ERROR",
              error: message,
              target,
              url,
              method,
            })
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const DEV_SERVER_HOST = env.VITE_DEV_SERVER_HOST || "localhost";

  const DEV_SERVER_PROTOCOL = env.VITE_DEV_SERVER_PROTOCOL || "ws";

  const DEV_SERVER_CLIENT_PORT = Number(
    env.VITE_DEV_SERVER_CLIENT_PORT || 5173
  );

  const DEV_SERVER_PORT = Number(env.VITE_DEV_SERVER_PORT || 5173);

  const DEV_HMR_PATH = env.VITE_DEV_HMR_PATH || "/vite-hmr";

  const LOCAL_API_TARGET = normalizeTarget(
    env.VITE_LOCAL_API_TARGET ||
      env.VITE_API_PROXY_TARGET ||
      env.VITE_API_SERVER_URL ||
      env.VITE_SERVER_URL ||
      env.VITE_API_URL ||
      env.VITE_API_BASE_URL,
    DEVELOPMENT_API_FALLBACK,
    mode
  );

  const WS_TARGET = normalizeTarget(
    env.VITE_LOCAL_WS_TARGET ||
      env.VITE_WS_PROXY_TARGET ||
      env.VITE_SOCKET_URL,
    LOCAL_API_TARGET.replace(/^http:/, "ws:").replace(/^https:/, "wss:"),
    mode
  );

  const apiProxy = createProxyConfig(LOCAL_API_TARGET, true);
  const wsProxy = createProxyConfig(WS_TARGET, true);

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
        "/api": apiProxy,

        "/ws": wsProxy,

        "/socket.io": wsProxy,

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
      "import.meta.env.VITE_RESOLVED_API_TARGET": JSON.stringify(
        isLocalApiTarget(LOCAL_API_TARGET)
          ? PRODUCTION_API_TARGET
          : LOCAL_API_TARGET
      ),
      "import.meta.env.VITE_SAFE_API_BASE_URL": JSON.stringify(
        `${PRODUCTION_API_TARGET}/api`
      ),
    },
  };
});
