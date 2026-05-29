"use client";

import { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  FileText,
  Calendar as CalendarIcon,
  Loader2,
  Lock,
  Unlock,
  Link as LinkIcon,
  Shield,
  HardDrive,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useBlockchainFiles } from '@/hooks/use-blockchain-files';
import { useWallets } from '@/hooks/use-wallets-query';
import { useAccount, useSwitchChain } from '@/hooks/use-web3';
import { useFileLockContract, useReadEncryptedKey } from '@/hooks/use-file-lock-contract';
import { useEmbeddedFileLock } from '@/hooks/use-embedded-file-lock';
import { useSignMessage } from 'wagmi';
import { formatFileSize, formatShortDate, formatWalletAddress } from '@/lib/formatters';
import { BlockchainFileLock } from '@/lib/api/services/blockchain-files.service';
import { toast } from 'sonner';
import { Address, Hex } from 'viem';
import {
  encryptFileForBlockchain,
  decryptFileFromBlockchain,
  downloadDecryptedFile,
  getKeyDerivationMessage,
} from '@/lib/crypto/blockchain-file-encryption';
import { uploadToIPFS, fetchFromIPFS, isPinataConfigured } from '@/lib/ipfs';

const POLYGON_CHAIN_ID = 137;

type BlockchainFileLockStatus = 'LOCKED' | 'UNLOCKABLE' | 'UNLOCKED';

export default function FilesBlockchainPage() {
  const { files, stats, isLoading, error, refetch, createFileLock, markAsUnlocked, getIpfsUrl, deleteFile } = useBlockchainFiles();
  const [fileToDestroy, setFileToDestroy] = useState<BlockchainFileLock | null>(null);
  const [isDestroying, setIsDestroying] = useState(false);

  const handleDestroy = async () => {
    if (!fileToDestroy) return;
    setIsDestroying(true);
    try {
      const result = await deleteFile(fileToDestroy.id);
      if (result.unpinned) {
        toast.success(`${fileToDestroy.filename} détruit. Pinata ne le sert plus.`);
      } else {
        toast.warning(
          `${fileToDestroy.filename} supprimé en DB, mais l'unpin Pinata a échoué — le fichier peut encore être servi temporairement.`,
        );
      }
      setFileToDestroy(null);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la destruction');
    } finally {
      setIsDestroying(false);
    }
  };

  const { wallets, isLoading: walletsLoading } = useWallets();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // Embedded (internal) wallet support — lets email/password users lock files
  // without MetaMask, mirroring the crypto page.
  const embeddedFile = useEmbeddedFileLock();
  const embeddedWallet = wallets.find((w) => w.type === 'internal');
  const hasEmbeddedWallet = !!embeddedWallet;
  // The app is "ready to interact" if an external wallet is connected OR the
  // account has an embedded wallet.
  const effectiveConnected = isConnected || hasEmbeddedWallet;
  const effectiveAddress = isConnected ? address : embeddedWallet?.address;

  // File lock contract hooks
  const {
    createFileLock: createLockOnChain,
    isCreating,
    isCreateSuccess,
    createReceipt,
    createFileLockHash,
    parseLockAddress,
    retrieveKey,
    isRetrievingKey,
    isRetrieveKeySuccess,
    factoryAddress,
    chainId: CONTRACT_CHAIN_ID,
  } = useFileLockContract();

  // Sign message hook for key derivation
  const { signMessageAsync } = useSignMessage();

  // Hook to read encrypted key from contract
  const { readEncryptedKey } = useReadEncryptedKey();

  // State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Pending lock data (for saving to DB after blockchain confirmation)
  const [pendingLockData, setPendingLockData] = useState<{
    walletId: number;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    ipfsHash: string;
    unlockAt: string;
  } | null>(null);

  // Handle create lock success - save to DB
  useEffect(() => {
    if (isCreateSuccess && createReceipt && pendingLockData && isSubmitting) {
      handleSaveLockToDb();
    }
  }, [isCreateSuccess, createReceipt]);

  const handleSaveLockToDb = async () => {
    if (!createReceipt || !pendingLockData) return;

    try {
      setCurrentStep('Sauvegarde en base de donnees...');

      // Parse lock address from receipt
      const lockContractAddress = parseLockAddress(createReceipt);
      if (!lockContractAddress) {
        throw new Error('Impossible de recuperer l\'adresse du contrat');
      }

      // Save to database
      await createFileLock({
        walletId: pendingLockData.walletId,
        filename: pendingLockData.filename,
        mimeType: pendingLockData.mimeType,
        sizeBytes: pendingLockData.sizeBytes,
        ipfsHash: pendingLockData.ipfsHash,
        txHash: createReceipt.transactionHash,
        lockContractAddress,
        chainId: CONTRACT_CHAIN_ID,
        unlockAt: pendingLockData.unlockAt,
      });

      toast.success('Fichier verrouille avec succes sur la blockchain !');

      // Reset form
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setSelectedWallet('');
      setUnlockDate('');
      setIsSubmitting(false);
      setPendingLockData(null);
      setCurrentStep('');
      refetch();
    } catch (error: any) {
      console.error('Save to DB error:', error);
      setSubmitError('Lock cree mais erreur lors de la sauvegarde');
      setIsSubmitting(false);
      setCurrentStep('');
    }
  };

  const handleUpload = () => {
    setSubmitError(null);
    // Pre-select a sensible default wallet: the connected external one if any,
    // otherwise the embedded wallet (so email/password users don't have to pick).
    if (!selectedWallet) {
      const external = wallets.find((w) => isConnected && w.address.toLowerCase() === address?.toLowerCase());
      const preset = external ?? embeddedWallet ?? wallets[0];
      if (preset) setSelectedWallet(preset.id);
    }
    setIsUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !unlockDate || !selectedWallet) return;

    // The signing wallet is the one picked in the dropdown.
    const selWallet = wallets.find((w) => w.id === selectedWallet);
    const useEmbedded = selWallet?.type === 'internal';

    if (!useEmbedded && !address) {
      setSubmitError('Connecte ton wallet externe (MetaMask) ou choisis ton wallet embarqué.');
      return;
    }

    // Check Pinata configuration
    if (!isPinataConfigured()) {
      setSubmitError('IPFS (Pinata) non configure. Verifiez les variables d\'environnement.');
      return;
    }

    // External wallets must be on Polygon; embedded talks to Polygon RPC directly.
    if (!useEmbedded && chainId !== CONTRACT_CHAIN_ID) {
      try {
        await switchChain({ chainId: CONTRACT_CHAIN_ID });
      } catch (error) {
        setSubmitError('Veuillez basculer sur le reseau Polygon');
        return;
      }
    }

    // Factory must be deployed (same address regardless of wallet type).
    const fileFactory = useEmbedded ? embeddedFile.factoryAddress : factoryAddress;
    if (!fileFactory) {
      setSubmitError('Factory non configuree. Veuillez deployer les contrats d\'abord.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Sign message for key derivation (embedded ⇒ ethers, else MetaMask)
      setCurrentStep(useEmbedded
        ? 'Signature avec le wallet embarqué (mot de passe)...'
        : 'Signature du message pour la derivation de cle...');
      const signature = useEmbedded
        ? await embeddedFile.signKeyDerivation()
        : await signMessageAsync({ message: getKeyDerivationMessage() });

      // Step 2: Encrypt file
      setCurrentStep('Chiffrement du fichier...');
      const { encryptedFile, encryptedKey, fileHash, originalSize } = await encryptFileForBlockchain(
        selectedFile,
        signature
      );

      // Step 3: Upload to IPFS
      setCurrentStep('Upload sur IPFS...');
      const ipfsResult = await uploadToIPFS(
        encryptedFile,
        `encrypted-${selectedFile.name}`,
        { originalName: selectedFile.name, fileHash, encrypted: 'true' }
      );

      const unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);

      if (useEmbedded) {
        // ===== EMBEDDED FLOW — synchronous (await receipt), save inline =====
        setCurrentStep('Creation du verrou sur la blockchain (wallet embarqué)...');
        const { txHash, lockAddress } = await embeddedFile.createFileLock({
          ipfsHash: ipfsResult.ipfsHash,
          encryptedKey: encryptedKey,
          unlockTimestamp,
        });
        if (!lockAddress) throw new Error('Impossible de recuperer l\'adresse du contrat');

        setCurrentStep('Sauvegarde en base de donnees...');
        await createFileLock({
          walletId: parseInt(selectedWallet),
          filename: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          sizeBytes: originalSize,
          ipfsHash: ipfsResult.ipfsHash,
          txHash,
          lockContractAddress: lockAddress,
          chainId: CONTRACT_CHAIN_ID,
          unlockAt: new Date(unlockDate).toISOString(),
        });

        toast.success('Fichier verrouille avec succes sur la blockchain !');
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setSelectedWallet('');
        setUnlockDate('');
        setIsSubmitting(false);
        setCurrentStep('');
        refetch();
      } else {
        // ===== EXTERNAL FLOW — fire-and-forget, useEffect saves on confirmation =====
        setCurrentStep('Creation du verrou sur la blockchain...');
        setPendingLockData({
          walletId: parseInt(selectedWallet),
          filename: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          sizeBytes: originalSize,
          ipfsHash: ipfsResult.ipfsHash,
          unlockAt: new Date(unlockDate).toISOString(),
        });
        await createLockOnChain({
          ipfsHash: ipfsResult.ipfsHash,
          encryptedKey: encryptedKey as Hex,
          unlockTimestamp,
        });
        // useEffect handles DB save + reset
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setSubmitError(err.shortMessage || err.message || 'Erreur lors du verrouillage');
      setIsSubmitting(false);
      setCurrentStep('');
      setPendingLockData(null);
    }
  };

  const handleUnlock = async (file: BlockchainFileLock) => {
    if (!file.lockContractAddress) {
      toast.error('Adresse du contrat non disponible');
      return;
    }

    // The file must be unlocked with the SAME wallet that locked it (the key is
    // derived from that wallet's signature). We detect it from the lock's wallet.
    const useEmbedded = file.wallet?.type === 'internal' || (!isConnected && hasEmbeddedWallet);

    if (!useEmbedded && !address) {
      toast.error('Connecte le wallet externe qui a verrouillé ce fichier.');
      return;
    }

    // External wallets must be on Polygon; embedded uses the RPC directly.
    if (!useEmbedded && chainId !== CONTRACT_CHAIN_ID) {
      try {
        await switchChain({ chainId: CONTRACT_CHAIN_ID });
      } catch (error) {
        toast.error('Veuillez basculer sur le reseau Polygon');
        return;
      }
    }

    setDownloadingFileId(file.id);

    try {
      // Step 1: Sign message for key derivation
      toast.info(useEmbedded
        ? 'Etape 1/5 : Signature avec le wallet embarqué...'
        : 'Etape 1/5 : Signature du message...');
      const signature = useEmbedded
        ? await embeddedFile.signKeyDerivation()
        : await signMessageAsync({ message: getKeyDerivationMessage() });

      // Step 2: Read encrypted key from blockchain (public getter - no restrictions)
      toast.info('Etape 2/5 : Recuperation de la cle depuis la blockchain...');
      const encryptedKeyHex = await readEncryptedKey(file.lockContractAddress as Address);

      if (!encryptedKeyHex) {
        throw new Error('Impossible de recuperer la cle chiffree depuis le contrat');
      }

      // Step 3: Fetch encrypted file from IPFS
      toast.info('Etape 3/5 : Telechargement depuis IPFS...');
      const encryptedFileBuffer = await fetchFromIPFS(file.ipfsHash);

      // Step 4: Decrypt file using the encrypted key and signature
      toast.info('Etape 4/5 : Dechiffrement du fichier...');
      const decryptedFile = await decryptFileFromBlockchain(
        encryptedFileBuffer,
        encryptedKeyHex,
        signature
      );

      // Step 5: Download the decrypted file
      toast.info('Etape 5/5 : Telechargement du fichier...');
      downloadDecryptedFile(decryptedFile, file.filename, file.mimeType);

      // Mark as unlocked in DB (only if not already unlocked)
      if (file.status === 'UNLOCKABLE') {
        await markAsUnlocked(file.id);

        // Optionally call retrieveKey to mark as UNLOCKED on blockchain too
        // This is not strictly necessary for decryption but updates the on-chain state
        try {
          if (useEmbedded) {
            await embeddedFile.retrieveKey(file.lockContractAddress);
          } else {
            await retrieveKey(file.lockContractAddress as Address);
          }
        } catch (e) {
          // Ignore blockchain state update errors - file is already decrypted
          console.log('Note: Could not update blockchain state, but file was decrypted successfully');
        }
      }

      toast.success('Fichier dechiffre et telecharge avec succes !');
      refetch();
    } catch (err: any) {
      console.error('Unlock error:', err);

      // Provide more helpful error messages
      if (err.message?.includes('NotUnlockableYet')) {
        toast.error('Le fichier n\'est pas encore deverrouillable. Attendez la date de deverrouillage.');
      } else if (err.message?.includes('signature')) {
        toast.error('Erreur de signature. Assurez-vous d\'utiliser le meme wallet que lors du verrouillage.');
      } else {
        toast.error(err.message || 'Erreur lors du deverrouillage');
      }
    } finally {
      setDownloadingFileId(null);
    }
  };

  const getStatusBadge = (status: BlockchainFileLockStatus) => {
    const variants: Record<BlockchainFileLockStatus, string> = {
      LOCKED: 'bg-error/20 text-error border-error/30',
      UNLOCKABLE: 'bg-warning/20 text-warning border-warning/30',
      UNLOCKED: 'bg-success/20 text-success border-success/30',
    };
    const labels: Record<BlockchainFileLockStatus, string> = {
      LOCKED: 'Verrouille',
      UNLOCKABLE: 'Deverrouillable',
      UNLOCKED: 'Deverrouille',
    };
    return { className: variants[status], label: labels[status] };
  };

  if (isLoading || walletsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-neon animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-white mb-2">TimeLock Fichiers Blockchain</h1>
          <p className="text-text-secondary text-body">
            Verrouillez vos fichiers sur IPFS avec un smart contract
          </p>
        </div>
        <Button onClick={handleUpload} className="glass-button gap-2" disabled={!effectiveConnected}>
          <Upload className="w-4 h-4" />
          Verrouiller un fichier
        </Button>
      </div>

      {!effectiveConnected && (
        <div className="p-4 rounded-lg bg-warning/20 border border-warning/30 text-warning">
          Connectez un wallet (ou créez un wallet embarqué) pour utiliser cette fonctionnalité.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-error/20 border border-error/30 text-error">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                Total fichiers
              </CardTitle>
              <FileText className="w-5 h-5 text-cyan-neon" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                Verrouilles
              </CardTitle>
              <Lock className="w-5 h-5 text-error" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.locked}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                Deverrouillables
              </CardTitle>
              <Unlock className="w-5 h-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.unlockable}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                Stockage total
              </CardTitle>
              <HardDrive className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {formatFileSize(stats.totalSizeBytes)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Banner */}
      <Card className="glass-card border-cyan-neon/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-cyan-neon flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-1">Securite Blockchain</h3>
              <p className="text-text-secondary text-sm">
                Vos fichiers sont chiffres localement, stockes sur IPFS, et la cle de dechiffrement
                est verrouillee dans un smart contract sur Polygon jusqu'a la date que vous definissez.
                Personne ne peut acceder a vos fichiers avant cette date.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-heading-3 text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-neon" />
            Fichiers verrouilles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              Aucun fichier verrouille. Verrouillez votre premier fichier sur la blockchain!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-glass-border hover:bg-transparent">
                  <TableHead className="text-text-secondary">Nom du fichier</TableHead>
                  <TableHead className="text-text-secondary">Taille</TableHead>
                  <TableHead className="text-text-secondary">IPFS</TableHead>
                  <TableHead className="text-text-secondary">Date de deverrouillage</TableHead>
                  <TableHead className="text-text-secondary">Statut</TableHead>
                  <TableHead className="text-text-secondary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => {
                  const statusBadge = getStatusBadge(file.status);
                  const canUnlock = file.status === 'UNLOCKABLE' || file.status === 'UNLOCKED';

                  return (
                    <TableRow
                      key={file.id}
                      className="border-glass-border hover:bg-glass-surface/30"
                    >
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-neon" />
                          {file.filename}
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {formatFileSize(file.sizeBytes)}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-neon hover:underline flex items-center gap-1"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {file.ipfsHash.slice(0, 8)}...
                        </a>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {formatShortDate(new Date(file.unlockAt))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canUnlock && (
                            <Button
                              size="sm"
                              onClick={() => handleUnlock(file)}
                              disabled={downloadingFileId === file.id}
                              className="glass-button h-8 gap-2"
                            >
                              {downloadingFileId === file.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Deverrouillage...
                                </>
                              ) : file.status === 'UNLOCKED' ? (
                                <>
                                  <Download className="w-3 h-3" />
                                  Telecharger
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  Deverrouiller
                                </>
                              )}
                            </Button>
                          )}
                          {file.status === 'UNLOCKED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setFileToDestroy(file)}
                              className="h-8 px-2 text-error hover:text-error hover:bg-error/10"
                              title="Détruire définitivement (unpin IPFS + suppression DB)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="glass-card border-glass-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-heading-3 text-white">
              Verrouiller un fichier sur la blockchain
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitUpload} className="space-y-6 py-4">
            {submitError && (
              <div className="p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
                {submitError}
              </div>
            )}

            {currentStep && (
              <div className="p-3 rounded-lg bg-cyan-neon/10 border border-cyan-neon/30 text-cyan-neon text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {currentStep}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="wallet" className="text-text-secondary">
                Wallet
              </Label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger className="bg-dark-blue-lighter border-glass-border text-white">
                  <SelectValue placeholder="Selectionnez un wallet" />
                </SelectTrigger>
                <SelectContent className="bg-glass-surface border-glass-border">
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {formatWalletAddress(wallet.address)} ({wallet.type === 'external' ? 'Externe' : 'Interne'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file" className="text-text-secondary">
                Fichier a verrouiller
              </Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                required
                disabled={isSubmitting}
                className="bg-dark-blue-lighter border-glass-border text-white file:bg-cyan-neon/20 file:text-cyan-neon file:border-0 file:rounded file:px-3 file:py-1 file:mr-3"
              />
              {selectedFile && (
                <p className="text-xs text-text-muted">
                  {selectedFile.name} - {formatFileSize(selectedFile.size)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unlockDate" className="text-text-secondary">
                Date de deverrouillage
              </Label>
              <Input
                id="unlockDate"
                type="datetime-local"
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
                required
                disabled={isSubmitting}
                min={new Date().toISOString().slice(0, 16)}
                className="bg-dark-blue-lighter border-glass-border text-white"
              />
            </div>

            <div className="p-3 rounded-lg bg-dark-blue-lighter border border-glass-border">
              <p className="text-xs text-text-muted">
                <strong>Comment ca marche:</strong>
                <br />
                1. Votre fichier sera chiffre localement
                <br />
                2. Le fichier chiffre sera uploade sur IPFS
                <br />
                3. La cle de chiffrement sera verrouillee dans un smart contract
                <br />
                4. Vous pourrez recuperer la cle et dechiffrer le fichier apres la date choisie
              </p>
            </div>

            <Button
              type="submit"
              className="w-full glass-button"
              disabled={isSubmitting || !selectedFile || !selectedWallet || !unlockDate}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verrouillage en cours...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Verrouiller sur la blockchain
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Destroy confirmation dialog */}
      <Dialog open={!!fileToDestroy} onOpenChange={(open) => !open && !isDestroying && setFileToDestroy(null)}>
        <DialogContent className="bg-dark-blue-lighter border-error/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-error flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Détruire définitivement
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <p className="text-text-secondary text-sm">
              Tu vas détruire <span className="text-white font-mono">{fileToDestroy?.filename}</span>{' '}
              de manière permanente :
            </p>

            <ul className="text-sm text-text-secondary space-y-1.5 list-disc list-inside ml-2">
              <li>Le fichier sera <strong className="text-white">unpinned de Pinata</strong> (plus servi par notre infrastructure)</li>
              <li>L'entrée en base de données est <strong className="text-white">supprimée</strong></li>
              <li>Même les admins ne pourront plus y accéder via notre app</li>
              <li>Le contrat on-chain reste, mais la clé chiffrée qu'il contient est inutile sans le fichier</li>
            </ul>

            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-warning/90">
                Cette action est <strong>irréversible</strong>. Assure-toi d'avoir bien téléchargé
                ton fichier déchiffré avant de continuer.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setFileToDestroy(null)}
                disabled={isDestroying}
                className="flex-1 border-glass-border text-text-secondary hover:text-white"
              >
                Annuler
              </Button>
              <Button
                onClick={handleDestroy}
                disabled={isDestroying}
                className="flex-1 bg-error hover:bg-error/90 text-white"
              >
                {isDestroying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Destruction...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Détruire
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
