module.exports = {
  apps: [{
    name: "url-shortener",
    script: "./dist/app.js",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "development",
      PORT: 3000
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
};