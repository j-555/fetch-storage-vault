import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [themeVersion, setThemeVersion] = useState(0); // chatgpt would have done better than this but just leave it because it works

  // apply theme immediately on mount to prevent flickering because flickering is fucking annoying
  useEffect(() => {
    // try to get theme from localStorage first as fallback localStorage is our backup bitch
    const savedTheme = localStorage.getItem('theme') as Theme;
    const initialTheme = isValidTheme(savedTheme) ? savedTheme : 'dark';
    
    // apply initial theme immediately no waiting around, you impatient fuck
    setTheme(initialTheme);
    applyTheme(initialTheme);
    
    // then load the actual theme from backend the real shit
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      setIsLoading(true);
      const savedTheme = await invoke<string>('get_theme');
      const validTheme = isValidTheme(savedTheme) ? savedTheme as Theme : 'dark';
      setTheme(validTheme);
      applyTheme(validTheme);
      // update localStorage to match backend keep that shit in sync
      localStorage.setItem('theme', validTheme);
    } catch (error) {
      console.error('Failed to load theme:', error);
      // keep the initial theme if backend fails don't let the backend fuck us over
    } finally {
      setIsLoading(false);
    }
  };

  const changeTheme = useCallback(async (newTheme: Theme) => {
    try {
      console.log('Changing theme to:', newTheme);
      
      // update state immediately for instant ui changes because waiting is for chumps
      setTheme(newTheme);
      
      // apply theme to dom immediately make that shit happen now
      applyTheme(newTheme);
      
      // update localStorage immediately don't forget about our backup bitch
      localStorage.setItem('theme', newTheme);
      
      // force re-render by incrementing version force that shit to update
      setThemeVersion(prev => prev + 1);
      
      // save to backend (don't wait for this to complete) fire and forget
      invoke('set_theme', { theme: newTheme }).catch(error => {
        console.error('Failed to save theme to backend:', error);
      });
      
    } catch (error) {
      console.error('Failed to change theme:', error);
    }
  }, []);

  const applyTheme = useCallback((themeValue: Theme) => {
    console.log('Applying theme:', themeValue);
    const html = document.documentElement;
    // remove all theme classes clean slate
    html.classList.remove('dark');
    
    if (themeValue === 'light') {
      // light theme no additional classes needed light mode is for weaklings
      console.log('Applied light theme (no classes)');
    } else if (themeValue === 'dark') {
      html.classList.add('dark');
      console.log('Applied dark theme');
    }
    
    console.log('Current HTML classes:', html.className);
  }, []);

  const isValidTheme = (theme: string): theme is Theme => {
    return ['light', 'dark'].includes(theme);
  };

  return {
    theme,
    isLoading,
    changeTheme,
    applyTheme,
    themeVersion, // chatgpt would have done better than this but just leave it because it works
  };
}; 