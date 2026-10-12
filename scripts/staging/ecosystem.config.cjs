/**
 * MASTERHRMS — PM2 Process Manager Staging Configuration
 * Usage: pm2 start scripts/staging/ecosystem.config.cjs --env staging
 */

module.exports = {
  apps: [
    {
      name: "masterhrms-backend-staging",
      script: "server/dist/index.js",
      cwd: "./server",
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "1G",
      restart_delay: 3000,
      env_staging: {
        NODE_ENV: "staging",
        PORT: 4000,
      },
      error_file: "/var/log/masterhrms/backend-error.log",
      out_file: "/var/log/masterhrms/backend-out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "masterhrms-frontend-staging",
      script: "node_modules/.bin/vite",
      args: "preview --port 5173 --host 0.0.0.0",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      restart_delay: 3000,
      env_staging: {
        NODE_ENV: "staging",
        PORT: 5173,
      },
      error_file: "/var/log/masterhrms/frontend-error.log",
      out_file: "/var/log/masterhrms/frontend-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
