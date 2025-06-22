import React from 'react';
import { Theme } from '../../hooks/useTheme';

interface ThemePreviewProps {
  theme: Theme;
  isSelected?: boolean;
  onClick?: () => void;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({ theme, isSelected = false, onClick }) => {
  const getThemeColors = (theme: Theme) => {
    switch (theme) {
      case 'light':
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-900',
          border: 'border-gray-300',
          accent: 'text-indigo-600',
          card: 'bg-gray-400',
          cardBorder: 'border-gray-200'
        };
      case 'dark':
        return {
          bg: 'bg-gray-900',
          text: 'text-gray-100',
          border: 'border-gray-700',
          accent: 'text-indigo-400',
          card: 'bg-gray-800',
          cardBorder: 'border-gray-700'
        };
      default:
        return {
          bg: 'bg-gray-900',
          text: 'text-gray-100',
          border: 'border-gray-700',
          accent: 'text-indigo-400',
          card: 'bg-gray-800',
          cardBorder: 'border-gray-700'
        };
    }
  };

  const colors = getThemeColors(theme);

  return (
    <div
      className={`relative w-32 h-24 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
          : `${colors.border} hover:border-gray-500`
      }`}
      onClick={onClick}
    >
      <div className={`w-full h-full ${colors.bg} rounded-lg p-2 flex flex-col space-y-1`}>
        {/* Header */}
        <div className={`h-2 ${colors.card} rounded`}></div>
        
        {/* Content area */}
        <div className="flex-1 flex space-x-1">
          {/* Sidebar */}
          <div className={`w-4 ${colors.card} rounded`}></div>
          
          {/* Main content */}
          <div className="flex-1 space-y-1">
            <div className={`h-1 ${colors.card} rounded`}></div>
            <div className={`h-1 ${colors.card} rounded w-3/4`}></div>
            <div className={`h-1 ${colors.card} rounded w-1/2`}></div>
          </div>
        </div>
        
        {/* Accent color indicator */}
        <div className={`h-1 ${colors.accent} rounded`}></div>
      </div>
    </div>
  );
}; 