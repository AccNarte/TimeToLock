# TimeLock Smart Contracts

Smart contracts pour le système de verrouillage temporel de cryptomonnaies.

## Architecture

Ce projet utilise le pattern **Factory + Vault** :

- **TimelockFactory** : Contrat unique déployé qui crée des instances de locks
- **TimelockVault** : Contrat individuel par lock, détient les tokens verrouillés

## Structure du Projet

```
contracts/
├── contracts/
│   ├── TimelockFactory.sol      # Factory pour créer des locks
│   ├── TimelockVault.sol        # Vault individuel pour chaque lock
│   └── interfaces/
│       └── ITimelockVault.sol   # Interface du vault
├── scripts/
│   ├── deploy-factory.ts        # Script de déploiement
│   └── copy-abis.js             # Copie des ABIs vers backend/frontend
├── test/
│   ├── TimelockFactory.test.ts  # Tests du factory
│   └── TimelockVault.test.ts    # Tests du vault
└── hardhat.config.ts            # Configuration Hardhat
```

## Installation

```bash
npm install
```

## Configuration

1. Copier `.env.example` vers `.env`
2. Remplir les variables :
   - `DEPLOYER_PRIVATE_KEY` : Clé privée du wallet déployeur
   - `POLYGON_RPC_URL` : URL RPC Polygon mainnet
   - `POLYGONSCAN_API_KEY` : API key pour la vérification

## Commandes

### Compilation

```bash
npm run compile
```

### Tests

```bash
# Tests unitaires
npm test

# Tests avec coverage
npm run test:coverage
```

### Déploiement

```bash
# Déployer sur Polygon Amoy (testnet)
npm run deploy:amoy

# Déployer sur Polygon mainnet
npm run deploy:polygon
```

### Vérification sur PolygonScan

```bash
npm run verify:polygon <CONTRACT_ADDRESS>
```

### Copier les ABIs

```bash
npm run copy-abis
```

Copie les ABIs compilés vers :
- `backend/src/modules/blockchain/abis/`
- `front/lib/contracts/`

## Fonctionnalités

### TimelockVault

- **lock()** : Reçoit et verrouille les tokens (appelé par factory)
- **withdraw()** : Permet au propriétaire de retirer après unlockTime
- **getStatus()** : Retourne LOCKED | UNLOCKABLE | WITHDRAWN

### TimelockFactory

- **createLock(token, amount, unlockTime)** : Crée un nouveau vault
- **getUserLocks(address)** : Retourne tous les locks d'un utilisateur
- **getAllLocks()** : Retourne tous les locks créés

## Sécurité

- Utilise OpenZeppelin (audité)
- ReentrancyGuard pour prévenir les attaques
- SafeERC20 pour les transferts sécurisés
- Variables immutables (gas optimisé)
- Tests avec coverage >90%

## Gas Estimations

- Déploiement factory : ~1.5M gas
- Création d'un lock : ~300k gas
- Withdrawal : ~50k gas

## Déploiements

### Polygon Mainnet (137)

- Factory : `TBD après déploiement`

### Polygon Amoy Testnet (80002)

- Factory : `TBD après déploiement`

## License

MIT
