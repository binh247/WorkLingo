// PM2 — chạy Bloóm (Next.js) production trên server tự host.
// Dùng: pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "bloom",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname + "/..",
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: "production" },
    },
  ],
};
