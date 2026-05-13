"use client";

import { useState, useEffect, useCallback } from 'react';
import { cryptoService, CryptoLock, CreateCryptoLockRequest } from '@/lib/api';

export function useCryptoLocks() {
  const [locks, setLocks] = useState<CryptoLock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cryptoService.getAll();
      setLocks(data);
    } catch (err) {
      setError('Erreur lors du chargement des verrous crypto');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocks();
  }, [fetchLocks]);

  const createLock = async (data: CreateCryptoLockRequest) => {
    try {
      const lock = await cryptoService.lock(data);
      setLocks((prev) => [...prev, lock]);
      return lock;
    } catch (err) {
      setError('Erreur lors de la création du verrou');
      throw err;
    }
  };

  const getLock = async (id: string) => {
    try {
      return await cryptoService.getById(id);
    } catch (err) {
      setError('Erreur lors de la récupération du verrou');
      throw err;
    }
  };

  return {
    locks,
    isLoading,
    error,
    refetch: fetchLocks,
    createLock,
    getLock,
  };
}


