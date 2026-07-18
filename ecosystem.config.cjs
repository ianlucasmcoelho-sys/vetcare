module.exports = {
  apps: [
    {
      name: 'vetcare-backend',
      script: 'src/index.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        ALLOWED_ORIGINS: 'http://localhost:5173,http://192.168.1.163:5173,http://192.168.1.163:80'
      }
    },
    {
      name: 'vetcare-frontend',
      script: 'serve',
      env: {
        PM2_SERVE_PATH: './frontend/dist',
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html'
      }
    },
    {
      name: 'vetcare-backup',
      script: 'backup_db.js',
      cron_restart: '0 0 * * *', // Todo dia à meia-noite
      autorestart: false
    }
  ]
};
