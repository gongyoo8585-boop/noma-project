module.exports = {
  apps: [
    {
      name: "nora-api",

      cwd: "/noma-project",

      script: "./src/server.js",

      instances: 1,

      exec_mode: "fork",

      autorestart: true,

      watch: false,

      max_memory_restart: "500M",

      node_args: "--max-old-space-size=512",

      env: {
        NODE_ENV: "production",

        PORT: 10000,

        HOST: "0.0.0.0",

        TZ: "Asia/Seoul",
      },

      error_file:
        "/home/ubuntu/.pm2/logs/nora-api-error.log",

      out_file:
        "/home/ubuntu/.pm2/logs/nora-api-out.log",

      log_file:
        "/home/ubuntu/.pm2/logs/nora-api-combined.log",

      time: true,

      merge_logs: true,

      kill_timeout: 5000,

      listen_timeout: 10000,

      restart_delay: 3000,

      min_uptime: "10s",

      max_restarts: 10,
    },
  ],
};
