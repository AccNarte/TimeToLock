# Migration vers les hooks React Query optimisés

## Problèmes résolus

Les nouveaux hooks avec React Query résolvent les problèmes suivants :

1. **Cache intelligent** - Les données sont mises en cache pendant 2-5 minutes
2. **Pas de requêtes dupliquées** - React Query déduplique automatiquement les requêtes
3. **Pas de boucles infinies** - Les dépendances sont correctement gérées
4. **Meilleure performance** - Réduction drastique du nombre d'appels API

## Hooks disponibles

### Anciens hooks (à éviter)
- `use-wallets.ts` - ❌ Boucle infinie de dépendances
- `use-files.ts` - ❌ Boucle infinie de dépendances
- `use-crypto-locks.ts` - ❌ Boucle infinie de dépendances
- `use-audit.ts` - ❌ Boucle infinie de dépendances

### Nouveaux hooks (recommandés)
- `use-wallets-query.ts` - ✅ Optimisé avec React Query
- `use-files-query.ts` - ✅ Optimisé avec React Query
- `use-crypto-locks-query.ts` - ✅ Optimisé avec React Query
- `use-audit-query.ts` - ✅ Optimisé avec React Query

## Migration

### Avant (ancien hook)
```typescript
import { useWallets } from '@/hooks/use-wallets';

function MyComponent() {
  const { wallets, isLoading } = useWallets();
  // ...
}
```

### Après (nouveau hook)
```typescript
import { useWallets } from '@/hooks/use-wallets-query';

function MyComponent() {
  const { wallets, isLoading } = useWallets();
  // L'API est identique, juste changer l'import !
}
```

## Avantages

### Performance
- **Avant** : 4 appels API à chaque montage de composant
- **Après** : 1 seul appel API, partagé entre tous les composants

### Cache
- **Avant** : Aucun cache, refetch à chaque render
- **Après** : Cache de 2-5 minutes, refetch intelligent

### Réseau
- **Avant** : ~45-60 requêtes RPC blockchain par page
- **Après** : ~5-10 requêtes RPC avec batching multicall

## Exemples

### Dashboard
```typescript
// ✅ Migration du dashboard
import { useWallets } from '@/hooks/use-wallets-query';
import { useFiles } from '@/hooks/use-files-query';
import { useCryptoLocks } from '@/hooks/use-crypto-locks-query';
import { useAudit } from '@/hooks/use-audit-query';

// Toutes les données sont automatiquement mises en cache et partagées
```

### Mutations
```typescript
const { createInternal } = useWallets();

// Automatiquement met à jour le cache après création
await createInternal({ name: 'Mon wallet' });
// Pas besoin de refetch manuel !
```
