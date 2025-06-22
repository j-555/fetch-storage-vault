import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

declare global {
  interface Window {
    __TAURI__?: {
      invoke: typeof invoke;
    };
  }
}

export function useAuth() {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkVaultStatus();
  }, []);

  const checkVaultStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const initialized = await invoke<boolean>('is_vault_initialized');
      setIsInitialized(initialized);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const initializeVault = async (masterKey: string, strength: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await invoke('initialize_vault', { args: { masterKey, strength } });
      setIsInitialized(true);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (masterKey: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await invoke('unlock_vault', { masterKey });
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await invoke('lock_vault');
      setIsAuthenticated(false);
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const refreshVaultStatus = async () => {
    await checkVaultStatus();
    setIsAuthenticated(false);
  };

  return {
    isInitialized,
    isAuthenticated,
    isLoading,
    error,
    initializeVault,
    login,
    logout,
    checkVaultStatus,
    refreshVaultStatus,
    clearError,
  };
}