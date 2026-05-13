"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesService, FileLock, CreateFileLockRequest } from '@/lib/api';

const FILES_QUERY_KEY = ['files'];

export function useFiles() {
  const queryClient = useQueryClient();

  const { data: files = [], isLoading, error } = useQuery({
    queryKey: FILES_QUERY_KEY,
    queryFn: () => filesService.getAll(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const createFileLockMutation = useMutation({
    mutationFn: (data: CreateFileLockRequest) => filesService.create(data),
    onSuccess: (file) => {
      queryClient.setQueryData<FileLock[]>(FILES_QUERY_KEY, (old = []) => [...old, file]);
    },
  });

  const getFile = async (id: string) => {
    return await filesService.getById(id);
  };

  return {
    files,
    isLoading,
    error: error ? 'Erreur lors du chargement des fichiers' : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY }),
    createFileLock: createFileLockMutation.mutateAsync,
    getFile,
  };
}
