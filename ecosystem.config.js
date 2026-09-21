/**
 * Konfigurasi PM2 untuk VPS (self-hosted).
 *
 * Pakai:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *
 * Aplikasi hanya listen di 127.0.0.1:3000 — akses publik lewat Nginx
 * (lihat deploy/nginx-presensi.conf). Ganti host ke 0.0.0.0 hanya bila
 * ingin mengakses port 3000 langsung dari luar (kurang aman).
 */
module.exports = {
  apps: [
    {
      name: "presensi-digital",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "700M",
      kill_timeout: 10000,
      listen_timeout: 15000,
      wait_ready: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1",
      },
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
