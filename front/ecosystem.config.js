// pm2 ecosystem — front machine
//
// Build first, then start. The Next.js `standalone` output produces a
// self-contained `.next/standalone/server.js` with only the deps the app
// actually uses — that's what we run.
//
//   cd /srv/timelock/front
//   npm ci
//   npm run build
//   # Copy public + static into standalone (Next.js convention)
//   cp -r public .next/standalone/public
//   cp -r .next/static .next/standalone/.next/static
//   pm2 start ecosystem.config.js --env production
//   pm2 save
//   pm2 startup

module.exports = {
  apps: [
    {
      name: 'timelock-front',
      script: '.next/standalone/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      max_memory_restart: '512M',

      env_production: {
        NODE_ENV: 'production',
        // Next.js standalone honors PORT + HOSTNAME env vars.
        PORT: 3010,
        HOSTNAME: '127.0.0.1', // bind localhost only; nginx fronts it
      },

      merge_logs: true,
      time: true,
    },
  ],
};
