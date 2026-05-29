# Brief d'infra — Co-déploiement de **mybaysy.dev** sur les serveurs TimeLock

> Doc à destination de la session **Claude Code de l'autre projet** (site Laravel + Vue.js,
> domaine `mybaysy.dev`). Tout est partagé avec un projet existant — **TimeLock**
> (`the21method.com`) — qui tourne déjà sur les 3 mêmes serveurs Vultr.
> **Ne casse rien de TimeLock** (cf. §3) et installe **à côté**.

---

## 1. Les 3 serveurs partagés

Tous : **Vultr · Ubuntu 26.04 LTS · accès SSH root par clé**.

| Rôle | IP | Domaine TimeLock | Services déjà en place |
|---|---|---|---|
| **Front** | `136.244.113.26` | `www.the21method.com` | Node 22, pm2, **nginx**, ufw, certbot. pm2 process **`timelock-front`** sur **:3010**, nginx vhost `the21method.com.conf` → `127.0.0.1:3010`. Code dans `/srv/timelock/front`. |
| **Backend** | `199.247.13.213` | `api.the21method.com` | Node 22, pm2, **nginx**, ufw, certbot, **psql** (client). pm2 process **`timelock-api`** sur **:3011** (préfixe `/api`), nginx vhost `api.the21method.com.conf` → `127.0.0.1:3011`. Code dans `/srv/timelock/backend`. |
| **BDD** | `216.128.183.19` | `db.the21method.com` (**DNS-only**) | **PostgreSQL 18** sur **:5432**, TLS Let's Encrypt (DNS-01 via Cloudflare), `pg_hba` en `hostssl` restreint à l'IP du back. Base `the21method_timelock`, rôle `timelock_user`. **Serveur dédié à la BDD — pas d'autre service**. |

**Accès SSH** : utilise les clés que l'utilisateur t'aura ajoutées à chaque serveur. Pour
le serveur BDD, c'est l'utilisateur qui le gère — demande-lui les modifs sensibles
(pg_hba, création de rôle/DB) plutôt que de tout faire seul.

---

## 2. Stack cible **mybaysy.dev**

- **Backend Laravel** (PHP) → serveur backend `199.247.13.213`
- **Front Vue.js** (build statique Vite) → serveur front `136.244.113.26` (servi en
  statique par nginx ; si SSR/Nuxt, on passera par Node + pm2 sur un nouveau port)
- **BDD** → **même cluster PostgreSQL 18** sur `216.128.183.19`, mais **nouvelle base + nouveau rôle**
  (cf. §6). Pas besoin de réinstaller Postgres.

Sous-domaines à prévoir côté DNS de `mybaysy.dev` :
- `www.mybaysy.dev` → A `136.244.113.26` (proxied Cloudflare conseillé)
- `mybaysy.dev` (apex) → A `136.244.113.26` (proxied), ou redirect 301 vers `www`
- `api.mybaysy.dev` → A `199.247.13.213` (proxied)
- (optionnel) `db.mybaysy.dev` → A `216.128.183.19` **DNS-only / gris** — pas obligatoire,
  le backend peut très bien se connecter via le hostname existant `db.the21method.com`
  (c'est l'IP qui compte, et le **certificat TLS Postgres est émis pour ce nom-là**).

---

## 3. ⚠️ Choses à NE PAS toucher (TimeLock est en prod)

- Fichiers `/srv/timelock/**` (les deux serveurs Node)
- Process pm2 `timelock-front`, `timelock-api` (ne pas `pm2 delete`, `restart`, `flush`)
- Vhosts nginx `the21method.com.conf` (front) et `api.the21method.com.conf` (back)
- Ports `:3010` (front Next.js) et `:3011` (back NestJS)
- Base `the21method_timelock`, rôle `timelock_user`, le contenu de `pg_hba.conf`
  existant
- L'enregistrement DNS `db.the21method.com` (doit rester **DNS-only/gris** —
  Cloudflare ne proxifie pas le port 5432)
- `iptables`/`ufw` rules existantes (ajoute, ne supprime pas)

**Avant d'éditer `nginx.conf`, `pg_hba.conf` ou tout fichier partagé** : fais
un backup `cp fichier fichier.bak.$(date +%s)` et teste avant de reload
(`nginx -t`, `systemctl reload nginx` ; pour Postgres, l'utilisateur préfère
être consulté avant un reload).

---

## 4. Conventions de coexistence

Tout pour `mybaysy.dev` vit en `/srv/mybaysy/...`, en parallèle de `/srv/timelock/...`.

| Ressource | TimeLock (réservé) | mybaysy.dev (à toi) |
|---|---|---|
| Front — chemin | `/srv/timelock/front` | `/srv/mybaysy/frontend` |
| Back — chemin | `/srv/timelock/backend` | `/srv/mybaysy/backend` |
| Front — port Node (si SSR) | `:3010` | **`:3020`** suggéré |
| Back — port Node (n/a Laravel) | `:3011` | n/a (PHP-FPM via socket Unix) |
| pm2 — front | `timelock-front` | `mybaysy-front` (si Nuxt/SSR) |
| pm2 — back | `timelock-api` | n/a (Laravel = PHP-FPM, pas pm2) |
| nginx vhost — front | `the21method.com.conf` | `mybaysy.dev.conf` |
| nginx vhost — back | `api.the21method.com.conf` | `api.mybaysy.dev.conf` |
| PG — base | `the21method_timelock` | `mybaysy` |
| PG — rôle | `timelock_user` | `mybaysy_user` |

---

## 5. Front Vue.js — déploiement sur `136.244.113.26`

### a) Installer ce qui manque (à faire une fois)
Node 22 est déjà là. Si la build du front Vue se fait sur le serveur, c'est suffisant.
Si tu veux builder ailleurs et juste déposer le `dist/`, encore mieux (rien à installer).

### b) Si **SPA pure (Vite)** — recommandé, le plus simple
Build le projet **localement** ou sur le serveur :
```bash
cd /srv/mybaysy/frontend && npm ci && npm run build
# produit dist/
```
Puis nginx sert `dist/` en statique — pas de pm2, pas de Node tournant.

Vhost `/etc/nginx/sites-available/mybaysy.dev.conf` :
```nginx
server {
    listen 80;
    server_name mybaysy.dev www.mybaysy.dev;
    return 301 https://www.mybaysy.dev$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.mybaysy.dev;

    ssl_certificate     /etc/letsencrypt/live/mybaysy.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mybaysy.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    root /srv/mybaysy/frontend/dist;
    index index.html;

    # Vue Router en mode history : fallback sur index.html pour les routes SPA.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache long pour les assets versionnés générés par Vite.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```
Active :
```bash
sudo ln -s /etc/nginx/sites-available/mybaysy.dev.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### c) Si **SSR (Nuxt)** — alors pm2 sur `:3020`
- `/srv/mybaysy/frontend/ecosystem.config.js` avec `script: '.output/server/index.mjs'`,
  `env: { PORT: 3020, HOST: '127.0.0.1' }`, pm2 process `mybaysy-front`.
- nginx vhost proxy_pass `http://127.0.0.1:3020` (sinon mêmes blocs ssl/redirect).
- `pm2 start ecosystem.config.js && pm2 save`.

### d) TLS pour les nouveaux hostnames
```bash
sudo certbot --nginx -d mybaysy.dev -d www.mybaysy.dev
```
> Si Cloudflare proxifie en mode **strict**, préfère DNS-01 ou installe un
> **Origin Certificate Cloudflare** côté serveur (15 ans, simple).

---

## 6. Backend Laravel — déploiement sur `199.247.13.213`

### a) Installer ce qui manque
PHP n'est probablement pas là (le serveur héberge un back Node). À installer :
```bash
sudo apt update && sudo apt install -y \
    php8.3 php8.3-fpm php8.3-cli php8.3-pgsql php8.3-mbstring \
    php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-intl \
    php8.3-redis composer unzip
# vérifier
php -v && composer --version
sudo systemctl enable --now php8.3-fpm
```
PHP-FPM écoute par défaut sur le **socket Unix** `/run/php/php8.3-fpm.sock` —
**aucun conflit de port** avec NestJS (`:3011`).

### b) Déposer Laravel
```bash
sudo mkdir -p /srv/mybaysy/backend
sudo chown -R $USER:$USER /srv/mybaysy
cd /srv/mybaysy/backend
# clone du repo Laravel ou rsync depuis le poste
composer install --no-dev --optimize-autoloader
cp .env.example .env && php artisan key:generate
# remplir .env (DB, APP_URL, etc.)
php artisan migrate --force
php artisan storage:link
sudo chown -R www-data:www-data storage bootstrap/cache
```

### c) Vhost nginx → PHP-FPM
`/etc/nginx/sites-available/api.mybaysy.dev.conf` :
```nginx
server {
    listen 80;
    server_name api.mybaysy.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.mybaysy.dev;

    ssl_certificate     /etc/letsencrypt/live/api.mybaysy.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.mybaysy.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    root /srv/mybaysy/backend/public;
    index index.php;

    # CORS si le front Vue est sur un autre origine (www.mybaysy.dev).
    # Laravel peut aussi gérer ça (fruitcake/laravel-cors → config/cors.php).

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    location ~ /\.(?!well-known).* { deny all; }
}
```
Active + cert :
```bash
sudo ln -s /etc/nginx/sites-available/api.mybaysy.dev.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.mybaysy.dev
```

### d) Si tu utilises **Octane** ou des **queues**
- Octane (Swoole/RoadRunner) → tourne sur un port (ex. `:8000`). Mets-le derrière
  pm2 ou systemd, et fais le proxy_pass nginx vers ce port à la place de PHP-FPM.
- Queues (`php artisan queue:work`) → systemd unit dédié, **pas** pm2 (convention
  Laravel). Ou Supervisor.

---

## 7. Base de données — partager le cluster PostgreSQL 18

Le cluster existant gère parfaitement plusieurs DB/rôles. **N'installe pas un autre
Postgres**, n'ouvre pas un autre port.

### a) Côté serveur DB (à demander à l'utilisateur — il administre ce serveur)
```sql
-- créer un rôle dédié + DB dédiée
CREATE ROLE mybaysy_user WITH LOGIN PASSWORD '<MOT_DE_PASSE_FORT>';
CREATE DATABASE mybaysy OWNER mybaysy_user;
```
Puis dans `/etc/postgresql/18/main/pg_hba.conf` (l'utilisateur fera le reload) :
```
hostssl   mybaysy   mybaysy_user   199.247.13.213/32   scram-sha-256
```
(même IP de backend qu'TimeLock — le filtrage se fait par couple base/rôle).
Reload : `sudo systemctl reload postgresql`.

### b) Côté Laravel (`.env`)
Connexion via le hostname **existant** `db.the21method.com` (le certificat TLS y est
émis ; le nom de domaine n'a pas besoin d'être lié à mybaysy.dev) :
```
DB_CONNECTION=pgsql
DB_HOST=db.the21method.com
DB_PORT=5432
DB_DATABASE=mybaysy
DB_USERNAME=mybaysy_user
DB_PASSWORD=<MOT_DE_PASSE_FORT>
DB_SSLMODE=verify-full
PGSSLROOTCERT=/etc/ssl/certs/ca-certificates.crt
```
> Le `verify-full` exige un root cert. Le bundle système Ubuntu (`ca-certificates.crt`)
> contient Let's Encrypt — c'est suffisant. Si Laravel/PDO ne le trouve pas tout seul,
> exporte `PGSSLROOTCERT` dans le service php-fpm (`Environment=PGSSLROOTCERT=...`
> dans le drop-in systemd).

### c) Si tu préfères un sous-domaine **`db.mybaysy.dev`**
Possible mais inutile : le certificat actuel ne couvre que `db.the21method.com`.
Pour un nouveau hostname, il faudrait soit un certificat SAN (re-issue avec les deux
noms, plus complexe), soit `sslmode=require` (chiffré mais sans vérif du hostname).
**Reste sur `db.the21method.com`** sauf raison impérieuse — c'est juste un nom.

---

## 8. DNS Cloudflare (recommandé) pour `mybaysy.dev`

Si tu reproduis l'archi TimeLock :
- `www.mybaysy.dev` → A `136.244.113.26` · Proxy : **orange (proxied)**
- `mybaysy.dev` (`@`) → A `136.244.113.26` · Proxy : **orange**
  (et configure la redirection apex→www côté nginx)
- `api.mybaysy.dev` → A `199.247.13.213` · Proxy : **orange**
- (si tu fais §7c) `db.mybaysy.dev` → A `216.128.183.19` · Proxy : **gris / DNS-only**
  (Cloudflare ne proxifie pas le port 5432)

Mode TLS Cloudflare : **Full** (ou **Full strict** si tu utilises des Origin Certificates).

---

## 9. Plan de déploiement, dans l'ordre

1. **Lire la doc TimeLock** : `TimeToLock/docs/HANDOVER.md` (overview infra) +
   `TimeToLock/docs/diagrams.md` (archi). Donne le contexte des conventions.
2. **DNS** : créer les enregistrements `www.mybaysy.dev`, `mybaysy.dev`,
   `api.mybaysy.dev` chez Cloudflare. Propager.
3. **Front (serveur 136.244.113.26)** :
   - `mkdir -p /srv/mybaysy/frontend` (sans toucher `/srv/timelock/`)
   - déposer le code, build (`npm run build`)
   - écrire `mybaysy.dev.conf` (cf. §5), activer, `nginx -t`, reload
   - certbot (`certbot --nginx -d mybaysy.dev -d www.mybaysy.dev`)
   - tester `https://www.mybaysy.dev/`
4. **Backend (serveur 199.247.13.213)** :
   - **installer PHP 8.3 + composer** (cf. §6a)
   - `mkdir -p /srv/mybaysy/backend`, déposer Laravel, `composer install`,
     `php artisan key:generate`, remplir `.env` (DB pas encore migrée — voir 5.)
   - écrire `api.mybaysy.dev.conf` (cf. §6c), activer, reload nginx
   - certbot (`certbot --nginx -d api.mybaysy.dev`)
5. **BDD (avec l'utilisateur)** :
   - lui demander de créer **rôle + DB** + ajouter la ligne `pg_hba` (cf. §7a),
     puis `systemctl reload postgresql`
   - `php artisan migrate --force` depuis le serveur back
6. **Validation** :
   - `curl https://www.mybaysy.dev/` → 200 + index Vue
   - `curl https://api.mybaysy.dev/healthcheck` (ou route /up) → 200
   - DB OK via `php artisan tinker` → `DB::select('select 1');`
   - **vérifier que TimeLock n'a pas bougé** : `pm2 ls` (timelock-front/api toujours
     online), `curl https://www.the21method.com/` → 200, `curl https://api.the21method.com/api/auth/me` → 401.

---

## 10. Idents / secrets à demander à l'utilisateur

- SSH aux 3 serveurs (clé)
- Mot de passe à choisir pour `mybaysy_user` (la création se fait côté serveur DB)
- Accès Cloudflare (DNS + éventuellement Origin Certs)
- Repo Git du projet Laravel/Vue (pour rsync ou clone)

**Ne jamais committer** ces secrets dans un fichier Git. Le `.env` Laravel n'est pas
versionné par convention — laisse-le sur le serveur uniquement.

---

## 11. Récap visuel — qui tourne où après le co-déploiement

```
Serveur Front (136.244.113.26)
  ├─ nginx vhost the21method.com.conf  → 127.0.0.1:3010 (Next.js standalone, pm2 timelock-front)
  └─ nginx vhost mybaysy.dev.conf      → /srv/mybaysy/frontend/dist (statique Vite)

Serveur Backend (199.247.13.213)
  ├─ nginx vhost api.the21method.com.conf → 127.0.0.1:3011 (NestJS, pm2 timelock-api)
  └─ nginx vhost api.mybaysy.dev.conf     → php-fpm 8.3 (Laravel /srv/mybaysy/backend/public)

Serveur BDD (216.128.183.19)  — PostgreSQL 18, port 5432, TLS verify-full
  ├─ base the21method_timelock  · rôle timelock_user
  └─ base mybaysy               · rôle mybaysy_user           ← à créer
```

---

## 12. En cas de problème

- **TimeLock cassé après tes modifs nginx** : `nginx -t` (montre l'erreur) ; recharger le
  `*.bak.<ts>` du vhost incriminé. Les vhosts TimeLock à protéger : `the21method.com.conf`,
  `api.the21method.com.conf`.
- **Port déjà pris** : `ss -tlnp | grep :PORT` pour voir qui écoute. Choisir un autre
  port libre (table §4).
- **TLS qui foire derrière Cloudflare** : passer Cloudflare en mode **Full** (pas strict)
  le temps du `certbot`, puis remonter ; ou utiliser DNS-01 ; ou utiliser un Origin
  Certificate Cloudflare et désactiver l'orange brièvement.
- **PG verify-full « root certificate file does not exist »** : c'est le PGSSLROOTCERT
  qui manque — pointe-le vers `/etc/ssl/certs/ca-certificates.crt`.

---

Bonne installation. En cas de doute sur un changement qui touche un fichier partagé
(`nginx.conf`, `pg_hba.conf`, `/etc/php/...`), pose la question avant — c'est moins coûteux
qu'une régression sur TimeLock.
