"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  blockchainFilesService,
  BlockchainFileLock,
  CreateBlockchainFileLockRequest,
  BlockchainFileLockStats,
} from '@/lib/api/services/blockchain-files.service';

export function useBlockchainFiles() {
  const [files, setFiles] = useState<BlockchainFileLock[]>([]);
  const [stats, setStats] = useState<BlockchainFileLockStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [filesData, statsData] = await Promise.all([
        blockchainFilesService.getAll(),
        blockchainFilesService.getStats(),
      ]);
      setFiles(filesData);
      setStats(statsData);
    } catch (err) {
      setError('Erreur lors du chargement des fichiers blockchain');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const createFileLock = async (data: CreateBlockchainFileLockRequest) => {
    try {
      const file = await blockchainFilesService.create(data);
      setFiles((prev) => [file, ...prev]);
      return file;
    } catch (err) {
      setError('Erreur lors de la creation du verrouillage');
      throw err;
    }
  };

  const getFile = async (id: string) => {
    try {
      return await blockchainFilesService.getById(id);
    } catch (err) {
      setError('Erreur lors de la recuperation du fichier');
      throw err;
    }
  };

  const getIpfsUrl = async (id: string) => {
    try {
      const result = await blockchainFilesService.getIpfsUrl(id);
      return result.url;
    } catch (err) {
      setError('Erreur lors de la recuperation de l\'URL IPFS');
      throw err;
    }
  };

  const markAsUnlocked = async (id: string) => {
    try {
      const updatedFile = await blockchainFilesService.markAsUnlocked(id);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? updatedFile : f))
      );
      return updatedFile;
    } catch (err) {
      setError('Erreur lors du marquage comme deverrouille');
      throw err;
    }
  };

  const syncStatus = async (id: string) => {
    try {
      const updatedFile = await blockchainFilesService.syncStatus(id);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? updatedFile : f))
      );
      return updatedFile;
    } catch (err) {
      console.error('Error syncing status:', err);
      throw err;
    }
  };

  const deleteFile = async (id: string) => {
    try {
      await blockchainFilesService.delete(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError('Erreur lors de la suppression');
      throw err;
    }
  };

  return {
    files,
    stats,
    isLoading,
    error,
    refetch: fetchFiles,
    createFileLock,
    getFile,
    getIpfsUrl,
    markAsUnlocked,
    syncStatus,
    deleteFile,
  };
}
