# TimeLock — Diagramme de cas d'utilisation (UML)

> Construit à partir du code réellement branché (routes/contrôleurs/composants
> existants). Les actions en stub (`alert()` non câblées) sont exclues.

---

## (a) Liste des cas d'utilisation par acteur

### Acteur **Visiteur** (non authentifié)
Routes publiques : `/`, `/explication`, `/login`, `/register`, `/verify-email`,
et endpoints `POST /api/auth/register|login|wallet-login|verify-email`.

- **V1** Consulter la landing page (`/`)
- **V2** Consulter la page Explication (`/explication`)
- **V3** S'inscrire avec email + mot de passe
- **V4** Se connecter avec email + mot de passe
- **V5** Se connecter par signature wallet (MetaMask / Rabby / WalletConnect)
- **V6** Vérifier son email via le lien reçu (token)

### Acteur **Utilisateur authentifié** (hérite du Visiteur)
Pages `(app)/*`, JWT en cookie HttpOnly requis.

- **U1** Se déconnecter
- **U2** Consulter son dashboard (résumé global + activité récente)
- **U3** Créer un wallet embarqué (clé privée chiffrée en base)
- **U4** Lier un wallet externe à son compte
- **U5** Déverrouiller le wallet embarqué par mot de passe (pour signer)
- **U6** Renvoyer l'email de vérification
- **U7** Changer son mot de passe (comptes email uniquement)
- **U8** Créer un verrou crypto **natif** (MATIC, payable on-chain)
- **U9** Créer un verrou crypto **ERC-20** (approve + createLock)
- **U10** Retirer les fonds d'un verrou crypto arrivé à échéance
- **U11** Télécharger le kit de secours PDF post-création (`CryptoRescueKitModal`)
- **U12** Verrouiller un fichier on-chain (AES-256-GCM client → IPFS → Vault)
- **U13** Déchiffrer un fichier après échéance (fetch IPFS + signature → clé AES)
- **U14** Détruire un fichier verrouillé (unpin Pinata + suppression base)
- **U15** Consulter ses verrous (crypto + fichiers)

### Acteur **Administrateur** (hérite de l'Utilisateur authentifié)
Sidebar « Administration », endpoints `/api/admin/**` gardés par `ensureAdmin`.

- **A1** Consulter le panel admin (stats globales)
- **A2** Lister les utilisateurs (pagination + filtres + tri + recherche)
- **A3** Modifier l'email d'un utilisateur
- **A4** Modifier le rôle d'un utilisateur
- **A5** Réinitialiser le mot de passe d'un utilisateur (comptes email)
- **A6** Suspendre un utilisateur *(soft-delete)*
- **A7** Réactiver un utilisateur suspendu
- **A8** Supprimer définitivement un utilisateur
- **A9** Exporter la liste filtrée des utilisateurs en CSV (RFC-4180)
- **A10** Consulter le journal d'audit (paginé + filtré action/entité)
- **A11** Déployer un smart contract Factory (`crypto_timelock` / `file_lock`)

### Acteurs secondaires (systèmes externes)
- **Polygon Mainnet** (RPC public + smart contracts Factory/Vault) — destinataire de toute signature on-chain.
- **IPFS / Pinata** — stockage du ciphertext (upload depuis le navigateur, *unpin* depuis le backend).
- **Service email** (nodemailer côté backend) — envoi des emails de vérification.

### Relations **«include»** et **«extend»** observées dans le code
| Cas de base | Type | Cas inclus / extension |
|---|---|---|
| V5 Connexion wallet | «include» | Signer le message d'authentification (avec timestamp anti-rejeu) |
| U8 / U9 / U10 Verrous crypto | «include» | Signer une transaction on-chain |
| U12 Verrouiller un fichier | «include» | Chiffrer le fichier (AES-256-GCM) **+** Signer la transaction on-chain |
| A11 Déployer une Factory | «include» | Signer une transaction on-chain |
| A3 / A4 / A5 / A6 / A8 Action admin sensible | «include» | Re-s'authentifier (mot de passe **ou** signature wallet) |
| Signer une transaction on-chain | «extend» | U5 Déverrouiller le wallet embarqué *(seulement si wallet embarqué utilisé)* |
| U8 / U9 Création de verrou crypto | «extend» | U11 Télécharger le kit de secours PDF *(proposé après création)* |

---

## (b) Diagramme Mermaid (flowchart LR)

> Mermaid ne supporte pas bien le diagramme *use-case* natif → on utilise un
> `flowchart LR` avec : acteurs en cercles à gauche, cas d'utilisation en
> stades dans le sous-graphe « Système TimeLock », acteurs secondaires à droite.
> **Syntaxe validée par le parseur Mermaid v11.**

```mermaid
flowchart LR
    %% ── Acteurs primaires (cercles UML) ─────────────────────────────────
    V(("Visiteur"))
    U(("Utilisateur<br/>authentifié"))
    A(("Administrateur"))

    %% Généralisation des acteurs (UML : flèche du spécialisé vers le général)
    A -->|"hérite de"| U
    U -->|"hérite de"| V

    %% ── Acteurs secondaires (systèmes externes) ─────────────────────────
    BC["Polygon Mainnet<br/>RPC + smart contracts"]
    IP["IPFS / Pinata"]
    EM["Service email<br/>(nodemailer)"]

    %% ── Système ─────────────────────────────────────────────────────────
    subgraph SYS["Système TimeLock"]
        direction TB

        UC_land(["Consulter la landing"])
        UC_expl(["Consulter la page Explication"])
        UC_reg(["S'inscrire (email + mot de passe)"])
        UC_login(["Se connecter (email + mot de passe)"])
        UC_wlog(["Se connecter par signature wallet"])
        UC_vmail(["Vérifier son email (lien token)"])

        UC_out(["Se déconnecter"])
        UC_dash(["Consulter le dashboard"])
        UC_mkint(["Créer un wallet embarqué"])
        UC_mkext(["Lier un wallet externe"])
        UC_unlw(["Déverrouiller le wallet embarqué"])
        UC_sendv(["Renvoyer l'email de vérification"])
        UC_chgpw(["Changer son mot de passe"])
        UC_cnat(["Créer un verrou crypto natif (MATIC)"])
        UC_cerc(["Créer un verrou crypto ERC-20"])
        UC_wdraw(["Retirer les fonds d'un verrou crypto"])
        UC_rkit(["Télécharger le kit de secours PDF"])
        UC_clock(["Verrouiller un fichier on-chain"])
        UC_decy(["Déchiffrer un fichier verrouillé"])
        UC_kill(["Détruire un fichier verrouillé"])
        UC_list(["Consulter ses verrous"])

        UC_panel(["Consulter le panel admin (stats)"])
        UC_users(["Lister les utilisateurs"])
        UC_eedt(["Modifier l'email d'un utilisateur"])
        UC_role(["Modifier le rôle d'un utilisateur"])
        UC_reset(["Réinitialiser le mot de passe d'un utilisateur"])
        UC_ban(["Suspendre un utilisateur"])
        UC_rest(["Réactiver un utilisateur"])
        UC_del(["Supprimer un utilisateur"])
        UC_csv(["Exporter les utilisateurs (CSV)"])
        UC_audit(["Consulter le journal d'audit"])
        UC_deploy(["Déployer une Factory on-chain"])

        UC_sign(["Signer une transaction on-chain"])
        UC_aes(["Chiffrer le fichier (AES-256-GCM)"])
        UC_authsig(["Signer le message d'authentification"])
        UC_reauth(["Re-s'authentifier (mdp ou signature)"])
    end

    %% ── Acteur Visiteur → cas publics ───────────────────────────────────
    V --> UC_land
    V --> UC_expl
    V --> UC_reg
    V --> UC_login
    V --> UC_wlog
    V --> UC_vmail

    %% ── Acteur Utilisateur → cas authentifiés ───────────────────────────
    U --> UC_out
    U --> UC_dash
    U --> UC_mkint
    U --> UC_mkext
    U --> UC_unlw
    U --> UC_sendv
    U --> UC_chgpw
    U --> UC_cnat
    U --> UC_cerc
    U --> UC_wdraw
    U --> UC_clock
    U --> UC_decy
    U --> UC_kill
    U --> UC_list

    %% ── Acteur Administrateur → cas admin ───────────────────────────────
    A --> UC_panel
    A --> UC_users
    A --> UC_eedt
    A --> UC_role
    A --> UC_reset
    A --> UC_ban
    A --> UC_rest
    A --> UC_del
    A --> UC_csv
    A --> UC_audit
    A --> UC_deploy

    %% ── Relations «include» (lien pointillé) ────────────────────────────
    UC_wlog -.->|"«include»"| UC_authsig
    UC_cnat -.->|"«include»"| UC_sign
    UC_cerc -.->|"«include»"| UC_sign
    UC_wdraw -.->|"«include»"| UC_sign
    UC_clock -.->|"«include»"| UC_sign
    UC_clock -.->|"«include»"| UC_aes
    UC_deploy -.->|"«include»"| UC_sign
    UC_eedt -.->|"«include»"| UC_reauth
    UC_role -.->|"«include»"| UC_reauth
    UC_reset -.->|"«include»"| UC_reauth
    UC_ban -.->|"«include»"| UC_reauth
    UC_del -.->|"«include»"| UC_reauth

    %% ── Relations «extend» ──────────────────────────────────────────────
    UC_unlw -.->|"«extend»"| UC_sign
    UC_rkit -.->|"«extend»"| UC_cnat
    UC_rkit -.->|"«extend»"| UC_cerc

    %% ── Interactions avec acteurs secondaires ───────────────────────────
    UC_sign --> BC
    UC_clock --> IP
    UC_decy --> IP
    UC_kill --> IP
    UC_sendv --> EM
```

### Notes de lecture
- **Cercles** = acteurs primaires (UML). **Stades** = cas d'utilisation. **Rectangles à droite** = acteurs secondaires (systèmes externes).
- **Flèches pleines** entre acteur ↔ cas = associations standard.
- **Flèches pointillées** étiquetées `«include»` / `«extend»` = relations UML entre cas d'utilisation (lecture : la flèche pointe **vers le cas inclus / l'extension**).
- **Généralisation des acteurs** : `Administrateur → Utilisateur → Visiteur` (le spécialisé pointe vers le général ; l'admin hérite donc de tout ce que peut faire un utilisateur authentifié, qui hérite lui-même de tout ce que peut faire un visiteur).
- L'**«extend»** « Déverrouiller le wallet embarqué » sur « Signer une transaction » modélise le cas où l'utilisateur signe avec son wallet *interne* (la confirmation par mot de passe est alors nécessaire) — avec un wallet externe (MetaMask/Rabby) cette extension n'a pas lieu.
