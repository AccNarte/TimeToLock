# Code review — synthèse pour l'oral E6

> Récap des points forts à mettre en avant, des limitations à reconnaître
> honnêtement, et des questions probables du jury avec leurs réponses.
> Lire en diagonale la veille de l'oral.

---

## 1. Les 8 points forts à mettre en avant

### 1.1 Architecture multi-tier propre
- **3 VPS distincts** (front, back, BDD) au lieu d'un monolithe — bonne séparation
  des préoccupations + isolation de la surface d'attaque BDD.
- **Cloudflare** en front (DNS + proxy + TLS) avec `verify-full` jusqu'à la BDD.
- **nginx + pm2** standard, certbot DNS-01 (zéro coupure).
- **Co-tenant** prévu (mybaysy.dev) sur les mêmes machines sans conflit (cf. `docs/COTENANT-BRIEFING-mybaysy.md`).

### 1.2 Sécurité au-dessus de la moyenne d'un BTS
- **JWT en cookie HttpOnly** (pas `localStorage` → protection XSS).
- **Cross-domain** : `SameSite=None` + `Secure` correctement gérés en prod.
- **bcrypt** + **fallback plaintext** pour migrer les anciens comptes sans casser leur login.
- **Anti-rejeu** : challenge admin signé contient un timestamp validé à ±5 min.
- **Re-authentification** sur toutes les actions admin destructives.
- **Soft-delete enforced dans `JwtStrategy`** : un bannissement coupe la session active à la requête suivante (pas à l'expiration du JWT).
- **`pg_hba`** en `hostssl` restreint à l'IP du back.
- **Throttler** sur l'auth (5/min login, 3/min email verif).
- **Faille corrigée pendant le dev** : `validateUser` ne vérifiait pas le mdp à l'origine → trouvée et remédiée → bon exemple de processus de revue.

### 1.3 Blockchain bien intégrée
- **Pattern Factory + Vault** (standard du domaine), un Vault isolé par verrou.
- **OpenZeppelin** : `SafeERC20` + `ReentrancyGuard` (sécurité ERC-20).
- **Support natif MATIC + ERC-20** : `createLockNative` *payable* et `createLock`.
- **Adresses de Factory auto-stockées en BDD** (`factory_deployments`) — déploie une fois, tous les utilisateurs en profitent.

### 1.4 CRUD admin de niveau pro
- **Pagination + filtres + tri** côté serveur (pas client → reste rapide à 1M utilisateurs).
- **QueryBuilder TypeORM partagé** entre la liste paginée et l'export CSV → cohérence garantie.
- **Colonnes de tri whitelistées** (`ListUsersDto`) → pas d'injection.
- **Soft-delete réversible** (`status` + `banned_at` + `banned_reason`).
- **Export CSV RFC-4180** (quoting des virgules/retours ligne).
- **Journal d'audit auto-seedé** : on ne pré-remplit jamais `actions`/`entity_types` à la main.

### 1.5 Chiffrement client-side bien pensé
- **AES-256-GCM** (standard NIST, authentifié).
- **Clé dérivée d'une signature wallet** (déterministe → interopérable MetaMask ↔ embedded).
- **PBKDF2 100 000 itérations** (recommandation OWASP).
- Le **ciphertext seul** transite : ni la clé ni le clair ne quittent le navigateur.
- Web Crypto API du navigateur (implémentation native, pas du JS).

### 1.6 Wallet embarqué
- **Clé privée chiffrée par mot de passe** dans `user_wallets.encrypted_private_key`.
- **Déverrouillage à la demande** via modale globale (pattern `requestUnlock(): Promise<boolean>`).
- **`useRef` mirror** pour éviter la *stale closure* sur le déverrouillage (bug subtil corrigé).
- Permet à un utilisateur sans MetaMask de tout faire (création de verrou, signature, etc.).

### 1.7 Modèle de données rigoureux
- **15 tables** normalisées (3NF), MLD vérifié par parseur Mermaid.
- **`NUMERIC(78,0)`** pour `amount_wei` → uint256 sans perte.
- **`JSONB`** pour `metadata_json` du journal d'audit (indexable + flexible).
- **FK différenciées** : `CASCADE` sur les données possédées, `SET NULL` sur audit (préserve la trace), `RESTRICT` sur catalogues.
- **Contraintes d'unicité composées** : `token_contracts(token_id, network_id)`.

### 1.8 Documentation à jour
- `docs/HANDOVER.md` — doc de reprise complète (stack, IP, chemins, env, déploiement).
- `docs/diagrams.md` — MLD + archi en Mermaid, **vérifiés par parseur**.
- `docs/use-case-diagram.md` — UML cas d'utilisation, **également vérifié**.
- `docs/COTENANT-BRIEFING-mybaysy.md` — brief de co-déploiement.
- README + READMEs par sous-projet (backend, contracts, front).

---

## 2. Les 5 limitations à reconnaître honnêtement

### 2.1 Pas de tests automatisés
- Pas de Jest sur le backend, pas de tests E2E sur le front, pas de tests Hardhat
  sur les contracts (les anciens ont été supprimés lors d'un cleanup).
- **Réponse** : « Tests manuels intensifs pendant le dev, monitoring via logs
  pm2/nginx. La V2 commence par l'ajout d'une suite Jest sur le backend (les
  modules critiques : auth, admin, audit) et des tests Hardhat sur les Vaults. »

### 2.2 Migrations SQL manuelles (pas de versionning typeorm migration)
- `synchronize: false` en prod (très bien), mais les `ALTER TABLE` se font à
  la main via `psql` sur le back.
- **Réponse** : « V2 : passer aux migrations TypeORM versionnées
  (`typeorm migration:generate`), avec un dossier `migrations/` versionné
  dans le repo et un script de déploiement automatisé qui les exécute. »

### 2.3 Stubs résiduels côté UI
- Page `/settings` : « Changer l'email » et « Supprimer mon compte » sont des
  `alert()` non câblés.
- **Réponse** : « Décision consciente : le changement d'email côté self-service
  exige un flow de vérification du nouvel email (token, expiration, replay).
  C'est dans la roadmap mais pas prioritaire — l'admin peut le faire à la
  place de l'utilisateur en attendant. »

### 2.4 Pas de monitoring / observabilité centralisée
- Logs pm2 et nginx sur chaque serveur, pas d'agrégateur (pas de Sentry, pas
  d'ELK, pas de Loki/Grafana).
- **Réponse** : « V2 : Sentry sur le front pour les erreurs JS, et un Loki
  + Grafana pour agréger les logs pm2/nginx. Pour l'instant la volumétrie ne
  le justifie pas. »

### 2.5 Pas de 2FA
- L'authentification repose uniquement sur (mot de passe) **ou** (signature
  wallet). Pas de TOTP / WebAuthn.
- **Réponse** : « Pour un service grand public qui stocke de la valeur, la
  2FA serait obligatoire. C'est en roadmap V2 — l'idée est WebAuthn (clé
  matérielle / Touch ID) plutôt que TOTP. »

---

## 3. Questions probables du jury — réponses prêtes

### Q1. Pourquoi PostgreSQL et pas MongoDB ?
- **Relations fortes** : locks ↔ wallets ↔ users ↔ rôles → un modèle
  relationnel s'impose. MongoDB obligerait à dénormaliser ou à faire des
  jointures applicatives lentes.
- **Transactions ACID** : créer un verrou = écrire en BDD ET sur la
  blockchain — on n'a PAS le droit d'avoir une métadonnée orpheline.
- **Schéma stable** : pas de mutation fréquente du modèle qui justifierait
  du schemaless.

### Q2. Pourquoi NestJS plutôt qu'Express seul ?
- **Injection de dépendances native** (vs DI manuelle avec Express).
- **Structure modulaire claire** : chaque feature = un module = un dossier
  → facile à naviguer pour un nouveau dev.
- **Guards / pipes / interceptors first-class** (auth, validation, throttling).
- **Intégration TypeORM/JWT/throttler "batteries-included"** : moins de code
  glue, plus de focus sur le métier.

### Q3. Pourquoi Next.js plutôt que React + Vite ?
- **SSR / SSG** pour le SEO de la landing page.
- **App Router** : routes file-based, layouts imbriqués.
- **Output `standalone`** : un serveur Node autonome qu'on déploie tel quel
  avec pm2 — pas besoin de configurer Vercel/Netlify.
- **Support natif de l'auth basée cookie** (Server Actions, Server Components).

### Q4. Pourquoi Polygon plutôt qu'Ethereum mainnet ?
- **Frais de gas** : une création de verrou coûte ~0.005 € sur Polygon contre
  1-5 € sur Ethereum selon la congestion.
- **Vitesse** : ~2 sec de confirmation sur Polygon contre 12-15 sec sur Ethereum.
- **Compatibilité EVM** : même code Solidity, mêmes outils (Hardhat, ethers),
  même UX wallet — choix purement économique.
- Pour un service grand public, Ethereum est inutilisable côté coût.

### Q5. Comment l'utilisateur récupère son fichier si la plateforme disparaît ?
- **Kit de secours PDF** généré juste après la création :
  - CID IPFS,
  - adresse du Vault,
  - méthode pour dériver la clé manuellement à partir d'une signature wallet.
- Le **contrat reste lisible on-chain** indépendamment du site.
- Le **ciphertext reste sur IPFS** (Pinata + autres nœuds qui auraient pinné).
- L'utilisateur est donc 100 % autonome — c'est la promesse fondamentale du
  produit, pas un nice-to-have.

### Q6. Comment tu garantis que personne (même toi) ne peut ouvrir avant la date ?
- C'est le **smart contract** qui applique la règle, pas le backend.
- Le `Vault` refuse `retrieveKey()` tant que `block.timestamp < unlockTime`.
- Le code est **public** sur Polygonscan, auditable par n'importe qui.
- **Pas besoin de me faire confiance** — c'est tout l'intérêt d'une blockchain.

### Q7. Le chiffrement client-side, c'est vraiment sûr ?
- **AES-256-GCM** : standard NIST, utilisé partout (TLS, AWS, iCloud, Signal).
- **Clé dérivée d'une signature wallet** : aussi solide que la clé privée
  du wallet (256 bits d'entropie).
- **PBKDF2 100 000 itérations** : recommandation OWASP, ralentit le brute-force
  même si le ciphertext est exfiltré.
- **Web Crypto API du navigateur** : implémentation native (Rust/C++), pas
  une lib JS facilement compromettable.

### Q8. Le journal d'audit : pourquoi avec une table normalisée actions/entity_types ?
- **Économie de stockage** : un `INT` plutôt qu'un `VARCHAR` par log (multiplié
  par des millions de lignes potentielles).
- **Cohérence** : impossible d'avoir des typos qui créent des fausses lignes
  (`USER_LOGINN` vs `USER_LOGIN`).
- **Évolutif** : on peut enrichir le catalogue (description, criticité, etc.)
  sans toucher au schéma de `audit_logs`.
- **Auto-seeding** : pas besoin de pré-remplir manuellement le catalogue, le
  service crée les lignes au premier appel.

### Q9. Si je suspends un admin pendant qu'il est connecté, il garde l'accès jusqu'à l'expiration du JWT ?
- **Non**. La `JwtStrategy.validate()` est appelée à **chaque requête** et
  recharge l'utilisateur en base, donc :
  - elle voit `status === 'banned'` immédiatement,
  - elle lève `ForbiddenException`,
  - le front reçoit un 403 dès la prochaine requête.
- **Session coupée < 1 sec** après l'action de l'admin.

### Q10. Comment tu testes ?
- **Réponse honnête** : pas de tests automatisés à ce stade. Validation
  manuelle systématique sur le parcours utilisateur après chaque feature.
  Monitoring via pm2 logs + nginx access/error.
- C'est l'**axe d'évolution prioritaire** pour une V2 : suite Jest sur le
  backend (modules critiques d'abord : auth, admin, audit), puis tests
  Hardhat sur les contracts, puis E2E Playwright sur le front.

### Q11. Le `WALLET_ENCRYPTION_SECRET` — si ton serveur est compromis, les wallets embarqués sont déchiffrables ?
- **Oui, théoriquement**. C'est pourquoi :
  - le mot de passe utilisateur entre en jeu dans la dérivation (un attaquant
    qui a le secret serveur doit AUSSI casser le mot de passe utilisateur),
  - `pg_hba` restreint l'accès BDD à l'IP du back uniquement,
  - le secret est dans le `.env` du back, jamais committé.
- Modèle de menace : on protège contre un dump de BDD + reverse de l'API,
  pas contre un attaquant root sur le backend (qui aurait accès à tout
  de toute façon).

### Q12. Comment tu gères les migrations de schéma en prod sans casser ?
- `synchronize: false` (TypeORM ne touche jamais le schéma automatiquement).
- Migrations SQL **idempotentes** (`ADD COLUMN IF NOT EXISTS`) exécutées
  manuellement via `psql` sur le serveur backend (qui a la connexion BDD).
- Procédure documentée dans `docs/HANDOVER.md` § 8.3.
- **V2** : passer aux classes de migration TypeORM versionnées et un script
  de déploiement automatisé.

---

## 4. Phrases d'accroche utiles pour la soutenance

- *« La vraie innovation du projet, ce n'est pas le chiffrement — c'est de
  remplacer la confiance dans une entreprise par la confiance dans un
  programme public et inviolable. »*
- *« Tout le chiffrement vit dans le navigateur de l'utilisateur. Le backend
  ne voit que du ciphertext et des hashes. Si on me pirate demain, je n'ai
  rien à donner — même pas par malveillance. »*
- *« Le code des contrats est sur Polygonscan, public, vérifié. Le jury
  peut le lire en 2 min — c'est tout l'intérêt par rapport à un SaaS
  classique. »*
- *« La sécurité réelle d'un système, ce n'est pas l'absence d'attaques,
  c'est la rapidité de remédiation. La faille `validateUser` qui ne
  vérifiait pas le mot de passe en est un bon exemple : trouvée pendant
  le dev, fixée en 30 min avec rétrocompatibilité totale. »*

---

## 5. Liste rapide à imprimer pour le jour J
- ✅ URL prod : https://www.the21method.com
- ✅ Repo public : https://github.com/AccNarte/TimeToLock
- ✅ Doc technique : `docs/HANDOVER.md`
- ✅ MLD + archi : `docs/diagrams.md`
- ✅ Diagramme de cas d'utilisation : `docs/use-case-diagram.md`
- ✅ Compte démo jury : `jury-e6@the21method.com` / `JuryE6Demo2026`
