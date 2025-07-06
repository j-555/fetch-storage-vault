import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LockoutStatus } from '../types';

export function useLockoutStatus() {
  const [lockoutStatus, setLockoutStatus] = useState<LockoutStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLockoutStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await invoke<LockoutStatus>('get_lockout_status');
      setLockoutStatus(status);
      return status;
    } catch (err) {
      const errorMessage = String(err);
      setError(errorMessage);
      console.error('Failed to fetch lockout status:', errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetFailedAttempts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await invoke('reset_failed_attempts');
      // Refresh status after reset
      await fetchLockoutStatus();
      return true;
    } catch (err) {
      const errorMessage = String(err);
      setError(errorMessage);
      console.error('Failed to reset failed attempts:', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchLockoutStatus]);

  // Auto-refresh lockout status when locked out
  useEffect(() => {
    if (!lockoutStatus?.is_locked_out) {
      return;
    }

    const interval = setInterval(async () => {
      const status = await fetchLockoutStatus();
      
      // If lockout has expired, stop the interval
      if (status && !status.is_locked_out) {
        clearInterval(interval);
      }
    }, 1000); // Update every second for real-time countdown

    return () => clearInterval(interval);
  }, [lockoutStatus?.is_locked_out, fetchLockoutStatus]);

  // Initial fetch
  useEffect(() => {
    fetchLockoutStatus();
  }, [fetchLockoutStatus]);

  const formatRemainingTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `0:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    lockoutStatus,
    isLoading,
    error,
    fetchLockoutStatus,
    resetFailedAttempts,
    formatRemainingTime,
    clearError,
    // Computed properties for convenience
    isLockedOut: lockoutStatus?.is_locked_out ?? false,
    remainingSeconds: lockoutStatus?.remaining_seconds ?? 0,
    failedAttempts: lockoutStatus?.failed_attempts ?? 0,
    maxAttempts: lockoutStatus?.max_attempts ?? 5,
    formattedRemainingTime: lockoutStatus ? formatRemainingTime(lockoutStatus.remaining_seconds) : '0:00',
  };
}
