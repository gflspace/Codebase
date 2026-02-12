// QwickServices CIS — PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'cis-backend',
      cwd: './src/backend',
      script: 'dist/index.js',
      instances: 'max',         // Cluster mode: 1 worker per CPU
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Graceful shutdown
      kill_timeout: 10000,       // Wait 10s for graceful shutdown
      listen_timeout: 8000,      // Wait 8s for app to be ready
      shutdown_with_message: true,

      // Logging
      error_file: '/var/log/cis/backend-error.log',
      out_file: '/var/log/cis/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      merge_logs: true,

      // Log rotation
      max_size: '50M',
      retain: '14',
      compress: true,

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
