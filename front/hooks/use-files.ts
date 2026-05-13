"use client";

import { useState, useEffect, useCallback } from 'react';
import { filesService, FileLock, CreateFileLockRequest } from '@/lib/api';

export function useFiles() {
  const [files, setFiles] = useState<FileLock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await filesService.getAll();
      setFiles(data);
    } catch (err) {
      setError('Erreur lors du chargement des fichiers');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const createFileLock = async (data: CreateFileLockRequest) => {
    try {
      const file = await filesService.create(data);
      setFiles((prev) => [...prev, file]);
      return file;
    } catch (err) {
      setError('Erreur lors de la création du verrouillage');
      throw err;
    }
  };

  const getFile = async (id: string) => {
    try {
      return await filesService.getById(id);
    } catch (err) {
      setError('Erreur lors de la récupération du fichier');
      throw err;
    }
  };

  return {
    files,
    isLoading,
    error,
    refetch: fetchFiles,
    createFileLock,
    getFile,
  };
}


