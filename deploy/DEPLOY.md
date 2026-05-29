# Déploiement TimeLock — multi-machines

Cible : 3 machines Linux séparées, 2 domaines, HTTPS via Let's Encrypt.

```
           Internet
              │
   ┌──────────┴──────────┐
   │ timelock.app        │            ┌─────────────────────────┐
   │ (front machine)     │            │ api.timelock.app        │
   │                     │            │ (backend machine)       │
   │  nginx :443 ─────┐  │            │                         │
   │                  ▼  │            │  nginx :443 ─────┐      │
   │  Next.js :3010   │  │            │                  ▼      │
   │  (pm2)           │  │            │  NestJS :3011    │      │
   │                  │  │  ◄ XHR ►   │  (pm2)           │      │
   └──────────────────┘──┘            └────────┬─────────┘──────┘
                                               │
                                       ┌───────┴──────────────┐
                                       │ DB machine           │
                                       │ Postgres :5432       │
                                       │ (privé / VPN)        │
                                       └──────────────────────┘
```

---

## 0. Prérequis sur chaque machine

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ca-certificates git ufw

# Node.js LTS via nodesource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pm2
sudo npm install -g pm2

# nginx + certbot (front + back machines only)
sudo apt install -y nginx certbot python3-certbot-nginx

# Firewall basique
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

Crée un user système non-root pour faire tourner les services :

```bash
sudo useradd -m -s /bin/bash timelock
sudo mkdir -p /srv/timelock
sudo chown timelock:timelock /srv/timelock
```

---

## 1. Machine DB — Postgres

```bash
sudo apt install -y postgresql
sudo systemctl enable --now postgresql

sudo -u postgres psql <<'EOF'
CREATE USER timelock_user WITH PASSWORD 'STRONG_PASSWORD_FROM_OPENSSL';
CREATE DATABASE timelock OWNER timelock_user;
GRANT ALL PRIVILEGES ON DATABASE timelock TO timelock_user;
EOF
```

**Ouvrir l'accès depuis le réseau privé** (édite `/etc/postgresql/16/main/postgresql.conf` et `pg_hba.conf`) :

```conf
# postgresql.conf
listen_addresses = '10.0.0.42'    # ou '*' si VPN/WireGuard
```

```conf
# pg_hba.conf — autoriser uniquement l'IP du backend
host    timelock    timelock_user    10.0.0.43/32    scram-sha-256
```

```bash
sudo systemctl restart postgresql
sudo ufw allow from 10.0.0.43 to any port 5432
```

### Migrer depuis NeonDB

```bash
# Depuis la machine backend (ou ton poste), avec accès aux deux DBs :
pg_dump 'postgresql://...neondb...' \
  --no-owner --no-privileges --no-tablespaces \
  -Fc -f timelock.dump

# Restore sur la nouvelle machine
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d 'postgresql://timelock_user:PASS@10.0.0.42:5432/timelock' \
  timelock.dump
```

### Backups quotidiens (cron)

```bash
sudo crontab -e
# Ajoute :
0 3 * * * pg_dump -U timelock_user timelock -Fc -f /var/backups/timelock-$(date +\%F).dump && find /var/backups/timelock-*.dump -mtime +14 -delete
```

---

## 2. Machine Backend — NestJS

```bash
sudo -i -u timelock
cd /srv/timelock
git clone <your-repo-url> .
cd backend

# Dépendances + build
npm ci
npm run build

# Config
cp .env.production.example .env
nano .env   # remplir DATABASE_URL, JWT_SECRET, WALLET_ENCRYPTION_SECRET, etc.

# Premier boot — pm2 prend la suite
pm2 start ecosystem.config.js --env production
pm2 save
exit  # retour au user sudo

# Faire démarrer pm2 au boot pour le user `timelock`
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u timelock --hp /home/timelock
```

Vérifie : `sudo -iu timelock pm2 status` et `curl localhost:3011/api/factory/current?chainId=137`.

### nginx + HTTPS

```bash
sudo cp /srv/timelock/deploy/nginx/timelock-api.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/timelock-api.conf /etc/nginx/sites-enabled/
sudo nginx -t

# Mettre les DNS A api.timelock.app → IP backend AVANT certbot
sudo certbot --nginx -d api.timelock.app
sudo systemctl reload nginx
```

---

## 3. Machine Frontend — Next.js

```bash
sudo -i -u timelock
cd /srv/timelock
git clone <your-repo-url> .  # ou rsync depuis ton poste
cd front

# Build
npm ci
cp .env.production.example .env.production
nano .env.production  # NEXT_PUBLIC_API_URL=https://api.timelock.app/api, etc.
npm run build

# Copier les assets dans le bundle standalone (Next.js convention)
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# Démarrer via pm2
pm2 start ecosystem.config.js --env production
pm2 save
exit

sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u timelock --hp /home/timelock
```

### nginx + HTTPS

```bash
sudo cp /srv/timelock/deploy/nginx/timelock-front.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/timelock-front.conf /etc/nginx/sites-enabled/
sudo nginx -t

# DNS A timelock.app + www.timelock.app → IP front
sudo certbot --nginx -d timelock.app -d www.timelock.app
sudo systemctl reload nginx
```

---

## 4. DNS (chez ton registrar)

| Record | Valeur                |
|--------|-----------------------|
| `A   ` | `timelock.app` → IP front machine |
| `A   ` | `www.timelock.app` → IP front machine |
| `A   ` | `api.timelock.app` → IP backend machine |

TTL : 300s pour pouvoir corriger vite si besoin, puis monter à 3600s.

---

## 5. Validation post-déploiement

```bash
# Front
curl -I https://timelock.app/                              # 200
curl https://timelock.app/_next/static/                    # not 404

# API
curl https://api.timelock.app/api/factory/current?chainId=137   # JSON

# Cross-domain cookie (auth)
# Depuis une fenêtre privée du navigateur : login → vérifier que le cookie
# `access_token` apparaît dans devtools → Application → Cookies → api.timelock.app
# avec SameSite=None, Secure=true, HttpOnly=true.
```

Si le cookie n'est pas posé :
- Vérifie que `FRONTEND_URLS` contient bien `https://timelock.app` (sans slash final)
- Vérifie que la requête front est en HTTPS (sinon `Secure` cookie refusé)
- Vérifie `app.set('trust proxy', 1)` actif → header `X-Forwarded-Proto: https`

---

## 6. Promouvoir le premier admin

Une fois le backend en marche et l'utilisateur créé :

```bash
sudo -iu timelock
cd /srv/timelock/backend
ADMIN_WALLET=0xTonAdresse npm run seed:admin
```

Puis depuis l'UI, déploie les factories via `/deploy` (un nouveau déploiement on-chain par environnement).

---

## 7. Maintenance courante

```bash
# Déploiement d'une nouvelle version (depuis le user timelock)
cd /srv/timelock
git pull
cd backend && npm ci && npm run build && pm2 restart timelock-api
cd ../front && npm ci && npm run build && \
  cp -r public .next/standalone/public && \
  cp -r .next/static .next/standalone/.next/static && \
  pm2 restart timelock-front

# Logs
pm2 logs timelock-api --lines 200
pm2 logs timelock-front --lines 200

# Renouvellement Let's Encrypt — déjà automatique via certbot.timer
sudo systemctl status certbot.timer
```

---

## 8. Gotchas connus

| Problème | Cause | Fix |
|---|---|---|
| `Cookie n'est pas envoyé sur les requêtes API` | SameSite=Lax en cross-domain | Vérifier `NODE_ENV=production` côté backend → `SameSite=None` automatique |
| `Cookie posé mais browser le refuse` | `Secure` sans HTTPS | TLS doit être actif sur **les deux** domaines |
| `502 Bad Gateway` au démarrage | pm2 pas démarré ou port différent | `pm2 status` + vérifier ports dans `ecosystem.config.js` |
| `synchronize a écrasé mes tables` | NODE_ENV pas mis sur production | `synchronize` est `false` uniquement quand `NODE_ENV=production` |
| `Origin not allowed by CORS` | URL du front pas dans `FRONTEND_URLS` | Ajouter avec **schéma exact** (`https://timelock.app`, pas `timelock.app`) |
