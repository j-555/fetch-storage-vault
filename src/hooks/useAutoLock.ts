import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'; 

export function useAutoLock(timeoutMinutes: number) {
  const { logout } = useAuth();
  
  const resetTimer = useCallback(() => {
    if (timeoutMinutes === 0) return;
    
    const existingTimer = window.localStorage.getItem('autoLockTimer');
    if (existingTimer) {
      window.clearTimeout(parseInt(existingTimer));
    }

    const timerId = window.setTimeout(async () => {
      await logout();
      
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        sendNotification({
          title: 'Vault Locked',
          body: 'Your Fetch vault has been automatically locked due to inactivity.',
        });
      }

      window.location.reload();
    }, timeoutMinutes * 60 * 1000);
    
    window.localStorage.setItem('autoLockTimer', timerId.toString());
  }, [timeoutMinutes, logout]);

  useEffect(() => {
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
    ];

    const handleActivity = () => {
      resetTimer();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      const existingTimer = window.localStorage.getItem('autoLockTimer');
      if (existingTimer) {
        window.clearTimeout(parseInt(existingTimer));
      }
    };
  }, [resetTimer]);
}