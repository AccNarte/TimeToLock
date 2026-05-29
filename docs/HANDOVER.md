# TimeLock — Documentation de reprise

> Doc « tête froide » : tout ce qu'il faut pour reprendre le projet sans contexte.
> Dernière mise à jour : 2026-05-27.
> Diagrammes (MLD + archi) : voir [diagrams.md](diagrams.md).
>
> ⚠️ **Aucun secret réel n'est écrit dans ce fichier** (il vit dans le repo Git).
> Les emplacements `<À REMPLIR>` sont à compléter **localement, hors Git**.

---

## 1. C'est quoi TimeLock

Application de **verrouillage temporel décentralisé**. Deux fonctions :

- **TimeLock Crypto** : verrouiller des fonds (MATIC / ERC-20) dans un smart contract
  jusqu'à une date. Retrait impossible avant l'échéance, pour personne.
- **TimeLock Files** : chiffrer un fichier (AES-256-GCM, côté client), le stocker sur
  IPFS, et sceller la clé dans un smart contract jusqu'à une date.

Authentification par **wallet** (MetaMask/Rabby) ou **email/mot de passe** (avec un
**wallet embarqué** chiffré, déverrouillé par mot de passe).

---

## 2. Stack technique

| Couche | Techno |
|---|---|
| **Front** | Next.js 16 (webpack, `output: standalone`), React, TypeScript, TailwindCSS, wagmi v2, RainbowKit, ethers v6, viem, @tanstack/react-query, sonner (toasts), lucide-react |
| **Backend** | NestJS 10, TypeORM 0.3, PostgreSQL (pg), JWT (`@nestjs/jwt`) en **cookie HttpOnly**, passport-jwt, `@nestjs/throttler`, **bcrypt**, ethers v6, nodemailer, class-validator |
| **Smart contracts** | Solidity + Hardhat, OpenZeppelin (SafeERC20, ReentrancyGuard), pattern **Factory + Vault** (`TimelockFactory/Vault`, `FileLockFactory/Vault`), fonctions `createLock` / `createLockNative` / `createFileLock`. Réseau **Polygon Mainnet** (chainId 137) |
| **Stockage fichiers** | **IPFS via Pinata** (le ciphertext, uploadé côté client) |
| **Infra** | 3 serveurs **Vultr Ubuntu 26.04 LTS**, **Cloudflare** (DNS + proxy + TLS), **nginx** (reverse proxy), **pm2** (process manager, démarrage systemd), **ufw** (firewall), **Node 22** |
| **RPC blockchain** | `https://polygon-bor-rpc.publicnode.com` (public) |

---

## 3. Architecture & domaines

Domaine racine : **the21method.com** (DNS géré sur Cloudflare).

| Sous-domaine | Cible | Proxy Cloudflare | Sert |
|---|---|---|---|
| `www.the21method.com` | Serveur Front (136.244.113.26) | ✅ orange (proxied) | l'app Next.js |
| `api.the21method.com` | Serveur Backend (199.247.13.213) | ✅ orange (proxied) | l'API NestJS (`/api`) |
| `db.the21method.com` | Serveur BDD (216.128.183.19) | ⚪ **gris (DNS-only)** | PostgreSQL (port 5432, Cloudflare ne proxifie pas le 5432) |

> ⚠️ **`the21method.com` (apex nu)** pointe encore vers un **ancien déploiement Vercel** —
> voir §11 (Problèmes connus). Tester sur **www.** en attendant.

Flux : navigateur → Cloudflare → Front / API. Le backend se connecte à la BDD
**en direct en TLS** (hors Cloudflare). Le chiffrement AES et l'upload IPFS se font
**côté client** ; le backend ne stocke que des **métadonnées** (CID, hash de tx, adresse
du Vault, dates) — jamais le fichier en clair ni les fonds.

---

## 4. Les 3 serveurs en détail

### 4.1 — Serveur FRONT
- **IP** : `136.244.113.26` — domaine `www.the21method.com`
- **OS** : Ubuntu 26.04 LTS · **Node** v22 · **pm2** process `timelock-front`
- **Port applicatif** : `3010` (nginx → 127.0.0.1:3010)
- **Chemin projet** : `/srv/timelock/front`
- **Fichier env** : `/srv/timelock/front/.env.production`
- **pm2** : `/srv/timelock/front/ecosystem.config.js` (script `.next/standalone/server.js`)
- **nginx** : `/etc/nginx/sites-enabled/the21method.com.conf` (proxy_pass `http://127.0.0.1:3010`)
- **Build** : `.next/standalone/` (serveur autonome) + assets copiés (`public`, `.next/static`)

### 4.2 — Serveur BACKEND
- **IP** : `199.247.13.213` — domaine `api.the21method.com`
- **OS** : Ubuntu 26.04 LTS · **Node** v22 · **pm2** process `timelock-api`
- **Port applicatif** : `3011` · **Préfixe global** : `/api`
- **Chemin projet** : `/srv/timelock/backend`
- **Fichier env** : `/srv/timelock/backend/.env`
- **pm2** : `/srv/timelock/backend/ecosystem.config.js` (script **`dist/src/main.js`**)
- **nginx** : `/etc/nginx/sites-enabled/api.the21method.com.conf` (proxy_pass `http://127.0.0.1:3011`)
- **Build** : `npm run build` → `dist/` (note : `dist/src/main.js`, pas `dist/main.js`, à cause de `ormconfig.ts` à la racine)
- **psql** installé (utile pour les migrations vers la BDD distante)

### 4.3 — Serveur BDD
- **IP** : `216.128.183.19` — domaine `db.the21method.com` (**DNS-only / gris**)
- **SGBD** : **PostgreSQL 18** · base `the21method_timelock` · rôle `timelock_user`
- **Port** : `5432` · **TLS** : certificat **Let's Encrypt** (certbot DNS-01 via Cloudflare)
- **Accès réseau** : `pg_hba.conf` en `hostssl` restreint à l'IP du backend
- **Chemins** (Ubuntu standard, à confirmer sur place) :
  `/var/lib/postgresql/18/main` (données), `/etc/postgresql/18/main/` (config)
- **Chaîne de connexion** (utilisée par le backend) :
  `postgresql://timelock_user:<MDP>@db.the21method.com:5432/the21method_timelock?sslmode=verify-full`
- ⚠️ **Serveur validé/terminé — ne pas reconfigurer.** Migré depuis NeonDB.
- 🔑 Je (Claude) n'ai **pas** d'accès SSH à ce serveur (tu le gères) — accès key only.

---

## 5. Identifiants de connexion — À REMPLIR (hors Git !)

> Ne **jamais** committer ce tableau rempli. Garde-le dans un gestionnaire de mots de
> passe / un fichier local non suivi.

| Quoi | Valeur |
|---|---|
| SSH Front `root@136.244.113.26` | `<À REMPLIR>` (accès par clé SSH) |
| SSH Backend `root@199.247.13.213` | `<À REMPLIR>` (accès par clé SSH) |
| SSH BDD `root@216.128.183.19` | `<À REMPLIR>` |
| BDD — rôle `timelock_user` (mot de passe) | `<À REMPLIR — À RÉGÉNÉRER, voir §11>` |
| Compte admin de l'app | `<À REMPLIR>` |
| Cloudflare (compte) | `<À REMPLIR>` |
| Vultr (compte) | `<À REMPLIR>` |
| Pinata (clés API / JWT) | `<À REMPLIR — À RÉGÉNÉRER, voir §11>` |
| WalletConnect Project ID | `<À REMPLIR>` |
| Registrar du domaine | `<À REMPLIR>` |

---

## 6. Structure du repo (poste de dev)

Racine locale : `c:\Users\user\loak\TimeToLock\`

```
TimeToLock/
├─ backend/        API NestJS (modules/, dist/, .env, ecosystem.config.js, ormconfig.ts)
├─ front/          App Next.js (app/, components/, hooks/, lib/, contexts/, ecosystem.config.js)
├─ contracts/      Smart contracts Hardhat (Factory/Vault) + ABI exportés vers front/lib/contracts/
├─ deploy/         Modèles nginx, DEPLOY.md, runbooks (db-the21method-runbook.conf, etc.)
└─ docs/           diagrams.md (MLD + archi), HANDOVER.md (ce fichier)
```

Modules backend clés : `auth`, `users`, `wallets`, `admin`, `roles`, `timelock-crypto`,
`timelock-files`, `timelock-files-blockchain`, `tokens`, `crypto-networks`,
`factory-deployments`, `ipfs`, `audit`, `email`.

---

## 7. Variables d'environnement (clés, sans valeurs)

**Backend** (`/srv/timelock/backend/.env`) :
```
NODE_ENV, PORT
DATABASE_URL, DATABASE_SSL_REJECT_UNAUTHORIZED
JWT_SECRET, JWT_EXPIRES, WALLET_ENCRYPTION_SECRET
FRONTEND_URLS, COOKIE_DOMAIN
POLYGON_RPC_URL
PINATA_API_KEY, PINATA_SECRET_KEY, PINATA_GATEWAY   # vides → unpin/destruction désactivé
```

**Front** (`/srv/timelock/front/.env.production`) :
```
NEXT_PUBLIC_API_URL              # https://api.the21method.com/api
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
NEXT_PUBLIC_ETHERSCAN_API_KEY
NEXT_PUBLIC_PINATA_JWT           # upload IPFS côté client
NEXT_PUBLIC_PINATA_GATEWAY
```
> ⚠️ Tout ce qui est `NEXT_PUBLIC_*` est **exposé au navigateur** (normal pour le front,
> mais ne jamais y mettre un secret backend).

---

## 8. Déploiement (procédures réelles)

> Méthode actuelle : éditer en local → `scp` les sources modifiées → build sur le serveur
> → `pm2 restart`. Les chemins contenant `(app)` cassent `scp` : passer par `/tmp` puis `cp`.

### 8.1 — Déployer le FRONT
```bash
# 1. envoyer les fichiers modifiés (ex.)
scp front/lib/.../x.ts root@136.244.113.26:/srv/timelock/front/lib/.../x.ts
# chemin avec (app) :
scp "front/app/(app)/admin/page.tsx" root@136.244.113.26:/tmp/p.tsx
ssh root@136.244.113.26 "cp /tmp/p.tsx '/srv/timelock/front/app/(app)/admin/page.tsx'"

# 2. build + assets standalone + restart
ssh root@136.244.113.26 "cd /srv/timelock/front && \
  NODE_OPTIONS='--max-old-space-size=1800' npm run build && \
  rm -rf .next/standalone/.next/static .next/standalone/public && \
  cp -r public .next/standalone/public && \
  cp -r .next/static .next/standalone/.next/static && \
  pm2 restart timelock-front --update-env"
```

### 8.2 — Déployer le BACKEND
```bash
scp backend/src/.../x.ts root@199.247.13.213:/srv/timelock/backend/src/.../x.ts
ssh root@199.247.13.213 "cd /srv/timelock/backend && npm run build && pm2 restart timelock-api --update-env"
```

### 8.3 — Migration de schéma BDD
> `synchronize` est **false** en prod (voir §12) : les changements de schéma se font
> **à la main** en SQL idempotent, depuis le backend (qui a `psql` + l'accès BDD).
```bash
ssh root@199.247.13.213 'cd /srv/timelock/backend && \
  DBURL=$(grep -E "^DATABASE_URL=" .env | cut -d= -f2-) && \
  PGSSLROOTCERT=/etc/ssl/certs/ca-certificates.crt psql "$DBURL" -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...;"'
```
> Le `PGSSLROOTCERT=...ca-certificates.crt` est nécessaire car `sslmode=verify-full`
> exige un certificat racine (sinon erreur « root certificate file does not exist »).

---

## 9. Commandes utiles (exploitation)

```bash
# statut / logs (sur chaque serveur)
pm2 ls
pm2 logs timelock-front --lines 100      # ou timelock-api
pm2 restart timelock-front

# nginx
nginx -t && systemctl reload nginx

# vérifs santé
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010/        # front local
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3011/api/auth/me   # back local (401 = OK)
curl -s -o /dev/null -w '%{http_code}\n' https://www.the21method.com/        # public

# tester l'origine en contournant un cache DNS local (utile si VPN/DNS douteux)
curl -k --resolve www.the21method.com:443:136.244.113.26 https://www.the21method.com/
```

---

## 10. Base de données

15 tables. Schéma complet + relations : voir [diagrams.md](diagrams.md) (MLD Mermaid vérifié).
Tables principales : `users`, `roles`, `user_wallets`, `email_verifications`,
`files` + `file_locks` (verrou « classique », ciphertext en base),
`blockchain_file_locks` (verrou IPFS + on-chain), `crypto_locks`,
`tokens` × `crypto_networks` → `token_contracts`, `factory_deployments`,
`audit_logs` + `entity_types` + `actions`.

---

## 11. ⚠️ Problèmes connus & TODO (à traiter)

1. **DNS apex** : `the21method.com` (sans www) sert encore l'**ancien Vercel**
   (`Server: Vercel`, 404 sur `/explication`). `www` est correct (→ self-hosted).
   **Fix** : dans Cloudflare DNS, faire pointer `@` comme `www` (proxied → 136.244.113.26),
   **supprimer les enregistrements Vercel** (A `76.76.21.x` / CNAME `cname.vercel-dns.com`),
   et idéalement ajouter une redirection apex → www.
2. **Secrets exposés (chat)** → **à régénérer avant lancement public** :
   - mot de passe BDD `timelock_user` (+ supprimer le rôle Neon restant) ;
   - clés Pinata (API key / secret / JWT).
3. **Pinata backend vide** : `PINATA_*` du `.env` backend non remplis → la **destruction
   (unpin) de fichiers IPFS est désactivée**. Remplir après régénération.
4. **WalletConnect Project ID** : vérifier que `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
   est un **vrai** ID (pas le placeholder `YOUR_PROJECT_ID`) ; sinon le mettre et rebuild front.
5. **Commits** : penser à committer les correctifs de build/déploiement dans le repo Git.
6. **Cloudflare TLS** : possibilité de passer en **Full (strict)** + Origin Certificates
   (actuellement self-signed + Full) — optionnel.

---

## 12. Sécurité / précautions (à NE PAS casser)

- **`synchronize = false`** en production (NODE_ENV=production). Ne **jamais** le repasser à
  `true` : TypeORM pourrait **drop/altérer des tables**. Migrations SQL à la main (§8.3).
- **Serveur BDD = terminé** : validé, données migrées, TLS + pg_hba OK. **Ne pas reconfigurer.**
- **Enregistrement `db.the21method.com` = DNS-only (gris)** : Cloudflare ne peut pas
  proxifier le 5432. Ne pas l'orangir.
- **Mots de passe** : hashés en **bcrypt** (avec fallback legacy plaintext pour les vieux
  comptes, upgradés au prochain changement). Le login **vérifie réellement** le mot de passe
  (un trou historique où n'importe quel mot de passe passait a été corrigé).
- **Cookies cross-domain** : JWT en cookie `HttpOnly`, `SameSite=None` + `Secure` en prod
  (sinon le navigateur drop le cookie entre `www.` et `api.`).
- **Comptes bannis** : refusés au login **et** à chaque requête (vérif dans la JwtStrategy).
- **Wallet embarqué** : clé privée **chiffrée** en base (`encrypted_private_key`),
  déverrouillée par le mot de passe / une signature, jamais stockée en clair.

---

## 13. Démarrage local (dev)

```bash
# Backend
cd backend && npm install && npm run start:dev      # nécessite un .env (DATABASE_URL local ou distant)

# Front
cd front && npm install && npm run dev              # .env.local (voir env.local.example)
```
> En dev, les cookies sont en `SameSite=Lax` (front+back sur localhost). En prod c'est
> `None`+`Secure` (logique dans `backend/src/modules/auth/auth.controller.ts`).
