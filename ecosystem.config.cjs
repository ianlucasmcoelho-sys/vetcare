module.exports = {
  apps: [
    {
      name: 'vetcare-backend',
      script: 'src/index.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M',
      kill_timeout: 35000,
      listen_timeout: 15000,
      env_production: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 3001,
        TRUST_PROXY_HOPS: 1
      }
    }
  ]
};
