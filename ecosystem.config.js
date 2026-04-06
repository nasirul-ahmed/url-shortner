module.exports = {
  apps: [
    {
      name: 'url-shortener',
      script: './dist/app.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
        LOG_LEVEL: 'debug',
        BASE_URL: 'http://localhost:4000',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/url-shortener',
        VISITOR_ID_SALT: 'dev-salt-change-in-production',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
