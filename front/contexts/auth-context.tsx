"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User, LoginRequest, RegisterRequest } from '@/lib/api';

interface RegisterOptions {
  skipRedirect?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest, options?: RegisterOptions) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      // Try to get user from API (cookie will be sent automatically)
      const userData = await authService.getMe();
      setUser(userData);
      authService.setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // Clear local user data if API call fails
      authService.removeUser();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Don't trust localStorage - always verify with API first
        // Cookie will be sent automatically
        const userData = await authService.getMe();
        setUser(userData);
        authService.setUser(userData);
      } catch (error) {
        console.error('Auth init error:', error);
        // Session invalid - clear everything
        authService.removeUser();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      // Token is now in HTTP-only cookie, just store user
      authService.setUser(response.user);
      setUser(response.user);
      router.push('/dashboard');
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest, options?: RegisterOptions) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      // Token is now in HTTP-only cookie, just store user
      authService.setUser(response.user);
      setUser(response.user);
      if (!options?.skipRedirect) {
        router.push('/dashboard');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    // Clear user state immediately to trigger ProtectedRoute redirect
    setUser(null);
    authService.removeUser();

    try {
      await authService.logout(); // Calls backend to clear cookie
    } catch (error) {
      console.error('Logout API error (ignored):', error);
    }

    // Force redirect to login
    router.replace('/login');
  }, [router]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


