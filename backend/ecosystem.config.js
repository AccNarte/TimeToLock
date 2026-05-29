// pm2 ecosystem — backend machine
//
// Usage on the backend machine:
//   cd /srv/timelock/backend
//   npm ci
//   npm run build
//   pm2 start ecosystem.config.js --env production
//   pm2 save
//   pm2 startup           # one-shot: configures systemd to relaunch pm2 at boot

module.exports = {
  apps: [
    {
      name: 'timelock-api',
      // tsc émet dist/src/main.js (et non dist/main.js) car ormconfig.ts à la
      // racine fait remonter le rootDir commun. Voir tsconfig.
      script: 'dist/src/main.js',
      cwd: __dirname,
      instances: 1, // bump to 'max' for clustered mode once you've verified
                    // that JWT cookies + in-memory caches (factory addresses)
                    // are not assumed to be unique-per-process
      exec_mode: 'fork',

      // Auto-restart on crash, max 10 within 60s otherwise mark as errored.
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',

      // Restart if RSS goes above 512 MB (safety net for any leak).
      max_memory_restart: '512M',

      env_production: {
        NODE_ENV: 'production',
        // PORT etc. read from .env (loaded by Nest's ConfigModule).
      },

      // Logs in ~/.pm2/logs/ by default. Override for centralised logging:
      // out_file: '/var/log/timelock/api-out.log',
      // error_file: '/var/log/timelock/api-err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
