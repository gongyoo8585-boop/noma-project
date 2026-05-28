module.exports = {
  apps: [
    {
      name: "nora-api",

      cwd: "/home/ubuntu/noma-project",

      script: "./server.js",

      instances: 1,

      exec_mode: "fork",

      autorestart: true,

      watch: false,

      max_memory_restart: "500M",

      node_args: "--max-old-space-size=512",

      env: {
        NODE_ENV: "production",

        PORT: "10000",

        HOST: "0.0.0.0",

        TZ: "Asia/Seoul",

        SERVER_NAME: "nora-platform",

        SERVER_HOST: "https://api.nora365.co.kr",

        PUBLIC_SERVER_HOST: "https://api.nora365.co.kr",

        CLIENT_URL: "https://www.nora365.co.kr",

        ADMIN_URL: "https://www.nora365.co.kr/admin",

        MOBILE_URL: "https://m.nora365.co.kr",

        CDN_URL: "https://cdn.nora365.co.kr",

        API_BASE_URL: "https://api.nora365.co.kr/api",

        MONGO_URI:
          "mongodb+srv://noma:noma1234abcd@cluster0.rrqqqvu.mongodb.net/mazzang?retryWrites=true&w=majority&appName=Cluster0",

        DB_NAME: "mazzang",

        KAKAO_ADMIN_KEY:
          "cc016dc4e9e250a4c7d1efaa685c8bc8",

        CORS_ORIGIN:
          "https://nora365.co.kr,https://www.nora365.co.kr,https://m.nora365.co.kr,https://api.nora365.co.kr,https://cdn.nora365.co.kr,http://localhost:5173,http://127.0.0.1:5173",

        TRUST_PROXY_HOPS: "1",

        SOCKET_ENABLED: "true",

        SOCKET_PATH: "/ws",

        CACHE_ENABLED: "true",

        CACHE_TTL: "300",

        MONGOOSE_AUTO_INDEX: "false",

        MONGOOSE_AUTO_CREATE: "false",

        MONGO_SERVER_SELECTION_TIMEOUT_MS: "10000",

        MONGO_CONNECT_TIMEOUT_MS: "10000",

        MONGO_SOCKET_TIMEOUT_MS: "45000",

        MONGO_WAIT_TIMEOUT_MS: "15000",

        MONGO_RETRY_MIN_DELAY_MS: "1000",

        MONGO_RETRY_MAX_DELAY_MS: "10000",

        MONGO_HEARTBEAT_MS: "10000",

        MONGO_MAX_IDLE_TIME_MS: "30000",

        MONGO_MAX_POOL_SIZE: "10",

        MONGO_MIN_POOL_SIZE: "1",

        RANKING_DB_STABLE_DELAY_MS: "5000",

        RANKING_HOT_CACHE_INITIAL_DELAY_MS: "15000",

        RANKING_HOT_CACHE_INTERVAL_MS: "30000",

        RANKING_QUERY_TIMEOUT_MS: "5000",

        SYSTEM_ID: "nora-core",

        INSTANCE_ID: "production-01",
      },

      env_development: {
        NODE_ENV: "development",

        PORT: "10000",

        HOST: "0.0.0.0",

        TZ: "Asia/Seoul",

        SERVER_NAME: "nora-platform-dev",

        SERVER_HOST: "http://localhost:10000",

        PUBLIC_SERVER_HOST: "http://localhost:10000",

        CLIENT_URL: "http://localhost:5173",

        ADMIN_URL: "http://localhost:5173/admin",

        MOBILE_URL: "http://localhost:5173",

        CDN_URL: "http://localhost:10000",

        API_BASE_URL: "http://localhost:10000/api",

        MONGO_URI:
          "mongodb+srv://noma:noma1234abcd@cluster0.rrqqqvu.mongodb.net/mazzang?retryWrites=true&w=majority&appName=Cluster0",

        DB_NAME: "mazzang",

        KAKAO_ADMIN_KEY:
          "cc016dc4e9e250a4c7d1efaa685c8bc8",

        CORS_ORIGIN:
          "http://localhost:5173,http://127.0.0.1:5173,http://localhost:10000,http://127.0.0.1:10000,https://www.nora365.co.kr,https://api.nora365.co.kr,https://m.nora365.co.kr,https://cdn.nora365.co.kr",

        TRUST_PROXY_HOPS: "1",

        SOCKET_ENABLED: "true",

        SOCKET_PATH: "/ws",

        CACHE_ENABLED: "false",

        CACHE_TTL: "300",

        MONGOOSE_AUTO_INDEX: "false",

        MONGOOSE_AUTO_CREATE: "false",

        MONGO_SERVER_SELECTION_TIMEOUT_MS: "10000",

        MONGO_CONNECT_TIMEOUT_MS: "10000",

        MONGO_SOCKET_TIMEOUT_MS: "45000",

        MONGO_WAIT_TIMEOUT_MS: "15000",

        MONGO_RETRY_MIN_DELAY_MS: "1000",

        MONGO_RETRY_MAX_DELAY_MS: "10000",

        MONGO_HEARTBEAT_MS: "10000",

        MONGO_MAX_IDLE_TIME_MS: "30000",

        MONGO_MAX_POOL_SIZE: "10",

        MONGO_MIN_POOL_SIZE: "1",

        RANKING_DB_STABLE_DELAY_MS: "5000",

        RANKING_HOT_CACHE_INITIAL_DELAY_MS: "15000",

        RANKING_HOT_CACHE_INTERVAL_MS: "30000",

        RANKING_QUERY_TIMEOUT_MS: "5000",

        SYSTEM_ID: "nora-core-dev",

        INSTANCE_ID: "development-01",
      },

      env_production: {
        NODE_ENV: "production",

        PORT: "10000",

        HOST: "0.0.0.0",

        TZ: "Asia/Seoul",

        MONGO_URI:
          "mongodb+srv://noma:noma1234abcd@cluster0.rrqqqvu.mongodb.net/mazzang?retryWrites=true&w=majority&appName=Cluster0",

        DB_NAME: "mazzang",

        KAKAO_ADMIN_KEY:
          "cc016dc4e9e250a4c7d1efaa685c8bc8",
      },

      error_file: "/home/ubuntu/.pm2/logs/nora-api-error.log",

      out_file: "/home/ubuntu/.pm2/logs/nora-api-out.log",

      log_file: "/home/ubuntu/.pm2/logs/nora-api-combined.log",

      time: true,

      merge_logs: true,

      kill_timeout: 10000,

      listen_timeout: 30000,

      restart_delay: 5000,

      min_uptime: "15s",

      max_restarts: 10,

      exp_backoff_restart_delay: 1000,
    },
  ],
};
