import React, { useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme, Theme } from '../../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, changeTheme, isLoading } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <SunIcon className="h-4 w-4" />, label: 'Light' },
    { value: 'dark', icon: <MoonIcon className="h-4 w-4" />, label: 'Dark' },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[1];

  const handleThemeChange = async (newTheme: Theme) => {
    await changeTheme(newTheme);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isLoading}
        className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Change theme"
      >
        {currentTheme.icon}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg border border-gray-700 shadow-lg z-50">
          <div className="py-1">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => handleThemeChange(themeOption.value)}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                  themeOption.value === theme ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-300'
                }`}
              >
                {themeOption.icon}
                <span>{themeOption.label}</span>
                {themeOption.value === theme && (
                  <div className="ml-auto w-2 h-2 bg-indigo-400 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* backdrop to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}; 