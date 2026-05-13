"use client";

import { useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useDeployFactory } from '@/hooks/use-deploy-factory';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, AlertCircle, Copy, ExternalLink } from 'lucide-react';

const POLYGON_CHAIN_ID = 137;

export default function DeployPage() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [showInstructions, setShowInstructions] = useState(false);

  const {
    deploy,
    isPending,
    isConfirming,
    isConfirmed,
    deployedAddress,
    hash,
    error,
    isDeploying,
  } = useDeployFactory();

  const handleDeploy = async () => {
    if (!isConnected) {
      toast.error('Veuillez connecter votre wallet');
      return;
    }

    if (chainId !== POLYGON_CHAIN_ID) {
      toast.info('Changement de réseau vers Polygon...');
      try {
        await switchChain({ chainId: POLYGON_CHAIN_ID });
      } catch (err) {
        toast.error('Impossible de changer de réseau');
        return;
      }
    }

    try {
      await deploy();
      toast.success('Transaction envoyée ! Attendez la confirmation...');
    } catch (err: any) {
      console.error('Deploy error:', err);
      toast.error(err.message || 'Erreur lors du déploiement');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  const openPolygonScan = (hash: string) => {
    window.open(`https://polygonscan.com/tx/${hash}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Déployer TimelockFactory</h1>
        <p className="text-gray-600 mb-6">
          Déployez le contrat factory sur Polygon mainnet en signant avec votre wallet.
        </p>

        {/* Warning Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 mb-1">Important</p>
            <ul className="text-amber-800 space-y-1 list-disc list-inside">
              <li>Vous devez être connecté à Polygon mainnet</li>
              <li>Assurez-vous d'avoir ~0.5 MATIC pour les frais de gas</li>
              <li>Le déploiement coûte environ 0.03 MATIC (~0.02€)</li>
              <li>Cette action ne peut pas être annulée une fois confirmée</li>
            </ul>
          </div>
        </div>

        {/* Wallet Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Wallet connecté</span>
            <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '✓ Connecté' : '✗ Non connecté'}
            </span>
          </div>
          {address && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Adresse</span>
              <span className="text-sm font-mono text-gray-600">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Réseau</span>
            <span className={`text-sm ${chainId === POLYGON_CHAIN_ID ? 'text-green-600' : 'text-amber-600'}`}>
              {chainId === POLYGON_CHAIN_ID ? 'Polygon' : chainId ? `ChainId: ${chainId}` : 'Non connecté'}
            </span>
          </div>
        </div>

        {/* Deploy Button */}
        {!isConfirmed && (
          <button
            onClick={handleDeploy}
            disabled={!isConnected || isDeploying}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
              isDeploying
                ? 'bg-blue-400 cursor-not-allowed'
                : !isConnected
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isDeploying ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                {isPending ? 'Signature en cours...' : 'Déploiement en cours...'}
              </>
            ) : (
              'Déployer TimelockFactory'
            )}
          </button>
        )}

        {/* Transaction Status */}
        {hash && (
          <div className="mt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                {isConfirming && <Loader2 className="animate-spin" size={18} />}
                {isConfirmed && <CheckCircle2 className="text-green-600" size={18} />}
                Transaction Hash
              </h3>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-blue-800 break-all flex-1">{hash}</code>
                <button
                  onClick={() => copyToClipboard(hash, 'Hash')}
                  className="p-2 hover:bg-blue-100 rounded transition-colors"
                  title="Copier"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => openPolygonScan(hash)}
                  className="p-2 hover:bg-blue-100 rounded transition-colors"
                  title="Voir sur PolygonScan"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>

            {isConfirmed && deployedAddress && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="text-green-600" size={18} />
                  Contrat Déployé avec Succès !
                </h3>
                <div className="mb-3">
                  <p className="text-sm font-medium text-green-900 mb-1">Adresse du Factory</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-green-800 break-all flex-1 bg-white p-2 rounded">
                      {deployedAddress}
                    </code>
                    <button
                      onClick={() => copyToClipboard(deployedAddress, 'Adresse')}
                      className="p-2 hover:bg-green-100 rounded transition-colors"
                      title="Copier"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="text-sm text-green-700 hover:text-green-800 font-medium underline"
                >
                  {showInstructions ? 'Masquer' : 'Voir'} les prochaines étapes
                </button>

                {showInstructions && (
                  <div className="mt-4 bg-white rounded-lg p-4 text-sm space-y-3">
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">1. Mettre à jour le backend</p>
                      <p className="text-gray-700 mb-2">
                        Ajoutez cette ligne dans <code className="bg-gray-100 px-1 rounded">backend/backend/.env</code>:
                      </p>
                      <div className="bg-gray-50 p-2 rounded font-mono text-xs break-all">
                        FACTORY_ADDRESS_POLYGON={deployedAddress}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 mb-1">2. Mettre à jour le frontend</p>
                      <p className="text-gray-700 mb-2">
                        Ajoutez cette ligne dans <code className="bg-gray-100 px-1 rounded">front/.env.local</code>:
                      </p>
                      <div className="bg-gray-50 p-2 rounded font-mono text-xs break-all">
                        NEXT_PUBLIC_FACTORY_ADDRESS_POLYGON={deployedAddress}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 mb-1">3. Redémarrer les services</p>
                      <div className="bg-gray-50 p-2 rounded font-mono text-xs">
                        <div>cd backend/backend && npm run start:dev</div>
                        <div>cd front && npm run dev</div>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 mb-1">4. Vérifier sur PolygonScan</p>
                      <a
                        href={`https://polygonscan.com/address/${deployedAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                      >
                        Voir le contrat sur PolygonScan
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertCircle size={18} />
              Erreur
            </h3>
            <p className="text-sm text-red-800">{error.message}</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-3">À propos du déploiement</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Qu'est-ce que TimelockFactory ?</strong> C'est le contrat principal qui permet
              de créer des coffres-forts (vaults) pour verrouiller des tokens ERC20 jusqu'à une date spécifique.
            </p>
            <p>
              <strong>Pourquoi déployer via le frontend ?</strong> Cette méthode est plus sécurisée car
              vous n'avez pas besoin de fournir votre clé privée au backend. Vous signez directement
              avec MetaMask.
            </p>
            <p>
              <strong>Combien ça coûte ?</strong> Le déploiement coûte environ 1.5M de gas, soit ~0.03 MATIC
              (environ 0.02€ au prix actuel). Le coût exact dépend du prix du gas au moment du déploiement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
