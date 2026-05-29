# TimeLock — Diagrammes (MLD + Architecture technique)

> Généré à partir du code réel (entités TypeORM + déploiement de production).
> Les diagrammes sont en **Mermaid** : collables tels quels dans
> [mermaid.live](https://mermaid.live), GitHub, Notion, VS Code (extension Mermaid), etc.

---

## 1. MLD — Modèle Logique de Données

15 tables. Les noms de colonnes sont ceux réellement créés en base (PostgreSQL 18, snake_case).

```mermaid
erDiagram
    roles ||--o{ users : "attribué à"
    users ||--o{ user_wallets : "possède"
    users ||--o{ file_locks : "détient"
    users ||--o{ blockchain_file_locks : "détient"
    users ||--o{ email_verifications : "reçoit"
    users |o--o{ audit_logs : "auteur"
    users |o..o{ factory_deployments : "déployée par (réf. logique)"
    user_wallets ||--o{ crypto_locks : "verrouille"
    user_wallets ||--o{ blockchain_file_locks : "signe"
    user_wallets |o--o{ audit_logs : "via wallet"
    files ||--o{ file_locks : "chiffré dans"
    tokens ||--o{ token_contracts : "instancié en"
    crypto_networks ||--o{ token_contracts : "héberge"
    token_contracts ||--o{ crypto_locks : "référencé par"
    entity_types ||--o{ audit_logs : "type"
    actions ||--o{ audit_logs : "action"

    roles {
        integer id PK
        varchar name UK "unique"
        text description "nullable"
    }

    users {
        integer id PK
        varchar email UK "unique, nullable"
        varchar password_hash "nullable, bcrypt"
        boolean is_email_verified "defaut false"
        varchar login_method "defaut password"
        integer role_id FK "nullable"
        varchar status "defaut active"
        timestamp banned_at "nullable"
        varchar banned_reason "nullable"
        timestamp created_at
        timestamp updated_at
    }

    email_verifications {
        integer id PK
        integer user_id FK
        varchar token UK "unique"
        timestamp expires_at
        boolean is_used "defaut false"
        timestamp created_at
    }

    user_wallets {
        integer id PK
        integer user_id FK
        varchar type "external ou internal"
        varchar address UK "unique"
        varchar provider "nullable"
        text encrypted_private_key "nullable, wallet embarqué"
        text encrypted_mnemonic "nullable"
        varchar salt "nullable"
        timestamp created_at
        timestamp updated_at
    }

    files {
        integer id PK
        varchar filename "nullable"
        varchar mime_type "nullable"
        integer size_bytes "nullable"
        timestamp created_at
    }

    file_locks {
        integer id PK
        integer user_id FK
        integer file_id FK
        varchar title "nullable"
        text ciphertext "AES-256-GCM (stocké en base)"
        varchar iv
        varchar salt
        varchar auth_tag
        varchar hash_checksum "nullable"
        timestamp unlock_at
        timestamp unlocked_at "nullable"
        varchar status "defaut LOCKED"
        timestamp created_at
        timestamp updated_at
    }

    blockchain_file_locks {
        integer id PK
        integer user_id FK
        integer wallet_id FK
        varchar title "nullable"
        varchar filename
        varchar mime_type "defaut application/octet-stream"
        bigint size_bytes
        varchar ipfs_hash "CID IPFS"
        varchar locked_tx_hash
        varchar lock_contract_address "Vault on-chain"
        integer chain_id
        timestamp unlock_at
        timestamp unlocked_at "nullable"
        varchar status "defaut LOCKED"
        timestamp created_at
        timestamp updated_at
    }

    crypto_networks {
        integer id PK
        varchar name UK "unique"
        integer chain_id
    }

    tokens {
        integer id PK
        varchar symbol
        integer decimals
    }

    token_contracts {
        integer id PK
        integer token_id FK "unique (token_id, network_id)"
        integer network_id FK "unique (token_id, network_id)"
        varchar contract_address
    }

    crypto_locks {
        integer id PK
        integer user_wallet_id FK
        integer token_contract_id FK
        numeric amount_wei "NUMERIC(78,0) en wei"
        timestamp unlock_at
        varchar locked_tx_hash "nullable"
        varchar lock_contract_address "nullable, Vault on-chain"
        varchar withdraw_tx_hash "nullable"
        varchar status "defaut LOCKED"
        timestamp created_at
        timestamp updated_at
    }

    factory_deployments {
        integer id PK
        integer chain_id
        varchar contract_type "defaut crypto_timelock"
        varchar address "adresse de la Factory"
        varchar tx_hash "nullable"
        integer deployed_by_user_id "nullable, réf. logique users"
        boolean is_active "defaut true"
        timestamp created_at
    }

    audit_logs {
        integer id PK
        integer user_id FK "nullable, SET NULL"
        integer user_wallet_id FK "nullable, SET NULL"
        integer entity_type_id FK
        integer entity_id
        integer action_id FK
        jsonb metadata_json "nullable"
        timestamp created_at
    }

    entity_types {
        integer id PK
        varchar name UK "unique (USER, WALLET, ...)"
    }

    actions {
        integer id PK
        varchar name UK "unique"
        text description "nullable"
    }
```

### Notes de lecture du MLD

- **Cardinalités** : `||--o{` = 1 à 0..N (FK obligatoire) ; `|o--o{` = 0..1 à 0..N
  (FK *nullable*, ex. `users.role_id`, `audit_logs.user_id`).
- **Lien en pointillés** (`users ..o{ factory_deployments`) : `deployed_by_user_id`
  est une **référence logique** vers `users` mais **sans contrainte FK** en base
  (colonne simple, pas de relation TypeORM) — d'où le trait discontinu.
- **Deux mécanismes de verrou de fichier** :
  - `file_locks` (+ `files`) : chiffré **AES-256-GCM**, le *ciphertext* est stocké
    **en base** (colonne `ciphertext`).
  - `blockchain_file_locks` : le fichier chiffré part sur **IPFS** (`ipfs_hash`) et
    le verrou est un **contrat Vault on-chain** (`lock_contract_address`).
- **Suppressions** : la plupart des FK sont en `ON DELETE CASCADE` ; `audit_logs`
  conserve la trace même si l'utilisateur/wallet est supprimé (`ON DELETE SET NULL`) ;
  `entity_types`/`actions` sont protégés (`ON DELETE RESTRICT`).
- **Catalogue crypto** : `tokens` × `crypto_networks` → `token_contracts`
  (une adresse de contrat par couple token/réseau, contrainte d'unicité).

---

## 2. Architecture technique

Déploiement réel : 3 serveurs Vultr distincts (front / back / BDD) derrière
Cloudflare, plus les services décentralisés (IPFS, Polygon).

```mermaid
flowchart TB
    subgraph CLIENT["Navigateur (utilisateur)"]
        UI["Front Next.js 16<br/>React · wagmi · RainbowKit"]
        AES["Chiffrement AES-256-GCM<br/>(côté client)"]
        EW["Wallet embarqué<br/>ethers.js · clé privée chiffrée"]
        XW["Wallet externe<br/>MetaMask / Rabby"]
    end

    subgraph CF["Cloudflare — DNS + proxy TLS"]
        CFP["Proxy HTTPS / WAF"]
    end

    subgraph FRONTSRV["Serveur Front · Vultr<br/>www.the21method.com"]
        NEXT["Next.js standalone<br/>nginx + pm2 :3010"]
    end

    subgraph BACKSRV["Serveur Backend · Vultr<br/>api.the21method.com"]
        NEST["API NestJS<br/>nginx + pm2 :3011<br/>JWT en cookie HttpOnly"]
    end

    subgraph DBSRV["Serveur BDD · Vultr<br/>db.the21method.com (DNS-only)"]
        PG[("PostgreSQL 18<br/>TLS")]
    end

    subgraph EXT["Services décentralisés / externes"]
        IPFS["IPFS via Pinata<br/>(fichiers chiffrés)"]
        RPC["RPC public Polygon"]
        subgraph CHAIN["Polygon Mainnet"]
            FACT["Factory<br/>crypto_timelock · file_lock"]
            VAULT["Vault<br/>verrou + date de déblocage"]
        end
    end

    UI --> AES
    UI --> EW
    UI --> XW

    UI -->|"HTTPS — pages"| CFP
    CFP --> NEXT
    UI -->|"HTTPS — /api · cookie JWT"| CFP
    CFP --> NEST

    NEST -->|"TLS 5432 — direct, hors proxy"| PG

    AES -->|"upload / lecture du ciphertext"| IPFS
    NEST -->|"unpin à la destruction"| IPFS

    XW -->|"signe + envoie tx"| RPC
    EW -->|"signe + envoie tx"| RPC
    RPC --> FACT
    FACT -->|"crée un"| VAULT
```

### Notes de lecture de l'architecture

- **Front et API** passent par **Cloudflare** (DNS + TLS + proxy). La **BDD** est en
  **DNS-only** (gris) : Cloudflare ne proxifie pas le port 5432, le backend s'y
  connecte donc **directement en TLS**.
- **Chiffrement côté client** : la clé AES n'est jamais transmise ; pour les locks
  *blockchain*, elle est dérivée d'une **signature wallet** (même message → même clé).
- **Upload IPFS** : effectué **directement par le navigateur** vers Pinata ; le
  **backend** ne contacte Pinata que pour le *unpin* (destruction d'un fichier).
- **Transactions on-chain** : signées par le **wallet** (externe *ou* embarqué) et
  envoyées via un **RPC public Polygon** ; la `Factory` instancie un `Vault` par verrou.
- **Persistance** : le backend NestJS ne stocke en base que les **métadonnées**
  (CID IPFS, hash de tx, adresse du Vault, dates), jamais les fonds ni le fichier clair.
```
