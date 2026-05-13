import { WalletItemProps, FileItemProps, CryptoLockProps, RecentAction } from './types';

export const mockWallets: WalletItemProps[] = [
  {
    id: '1',
    type: 'Externe',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    createdAt: new Date('2024-11-15'),
    status: 'Actif'
  },
  {
    id: '2',
    type: 'Interne',
    address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    createdAt: new Date('2024-12-01'),
    status: 'Actif'
  },
  {
    id: '3',
    type: 'Externe',
    address: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
    createdAt: new Date('2024-10-20'),
    status: 'Actif'
  }
];

export const mockFiles: FileItemProps[] = [
  {
    id: '1',
    name: 'contrat-important.pdf',
    size: 2457600,
    unlockDate: new Date('2025-06-15'),
    status: 'Locked'
  },
  {
    id: '2',
    name: 'testament.pdf',
    size: 1048576,
    unlockDate: new Date('2025-01-01'),
    status: 'Unlockable',
    downloadUrl: '/files/testament.pdf'
  },
  {
    id: '3',
    name: 'document-confidentiel.docx',
    size: 524288,
    unlockDate: new Date('2024-12-01'),
    status: 'Unlocked',
    downloadUrl: '/files/document-confidentiel.docx'
  },
  {
    id: '4',
    name: 'backup-cles.zip',
    size: 5242880,
    unlockDate: new Date('2026-01-01'),
    status: 'Locked'
  }
];

export const mockCryptoLocks: CryptoLockProps[] = [
  {
    id: '1',
    token: 'MATIC',
    amount: 1000,
    unlockDate: new Date('2025-03-15'),
    contractStatus: 'Active',
    canWithdraw: false
  },
  {
    id: '2',
    token: 'USDC',
    amount: 5000,
    unlockDate: new Date('2025-01-10'),
    contractStatus: 'Active',
    canWithdraw: true
  },
  {
    id: '3',
    token: 'ETH',
    amount: 2.5,
    unlockDate: new Date('2025-12-25'),
    contractStatus: 'Active',
    canWithdraw: false
  }
];

export const mockRecentActions: RecentAction[] = [
  {
    id: '1',
    type: 'file',
    description: 'Fichier "contrat-important.pdf" verrouillé',
    timestamp: new Date('2024-12-03T14:30:00')
  },
  {
    id: '2',
    type: 'crypto',
    description: '1000 MATIC verrouillés jusqu\'au 15/03/2025',
    timestamp: new Date('2024-12-02T10:15:00')
  },
  {
    id: '3',
    type: 'wallet',
    description: 'Nouveau wallet externe connecté',
    timestamp: new Date('2024-12-01T16:45:00')
  },
  {
    id: '4',
    type: 'file',
    description: 'Fichier "document-confidentiel.docx" déverrouillé',
    timestamp: new Date('2024-12-01T09:00:00')
  }
];