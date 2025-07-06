import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Function to check if an error should be shown to the user
function shouldShowError(error: string): boolean {
  const knownErrors = [
    'InvalidMasterKey',
    'VaultAlreadyInitialized',
    'ItemNotFound',
    'VaultLocked',
    'InvalidInput',
    'Io',
    'Crypto',
    'Storage',
    'Serialization'
  ];

  return knownErrors.some(knownError => error.includes(knownError));
}

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
  const clearTimeoutRef = useRef<number | null>(null);

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
      const errorString = String(err);
      if (shouldShowError(errorString)) {
        setError(errorString);
      } else {
        console.error('Unexpected error during vault status check:', errorString);
      }
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
      const errorString = String(err);
      // Only set error if we're not in the middle of clearing AND it's a known error
      if (!clearTimeoutRef.current && shouldShowError(errorString)) {
        setError(errorString);
      } else if (!shouldShowError(errorString)) {
        // Log unexpected errors to console instead of showing popup
        console.error('Unexpected error during vault initialization:', errorString);
      }
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
      const errorString = String(err);
      // Only set error if we're not in the middle of clearing AND it's a known error
      if (!clearTimeoutRef.current && shouldShowError(errorString)) {
        setError(errorString);
      } else if (!shouldShowError(errorString)) {
        // Log unexpected errors to console instead of showing popup
        console.error('Unexpected error during login:', errorString);
      }
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
      const errorString = String(err);
      if (shouldShowError(errorString)) {
        setError(errorString);
      } else {
        console.error('Unexpected error during logout:', errorString);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    // Clear any pending error timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }

    setError(null);

    // Prevent immediate error re-setting for a brief moment
    clearTimeoutRef.current = setTimeout(() => {
      clearTimeoutRef.current = null;
    }, 100);
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