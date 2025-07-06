import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, Theme } from '../../../hooks/useTheme';
import { ThemePreview } from '../ThemePreview';

const themeOptions = [
  {
    value: 'light' as Theme,
    label: 'Light'
  },
  {
    value: 'dark' as Theme,
    label: 'Dark'
  }
];

export const AppearanceSettings = () => {
  const { theme, changeTheme, themeVersion } = useTheme();
  const navigate = useNavigate();

  // force re-render when theme changes because react is fucking weird
  useEffect(() => {
    console.log('AppearanceSettings: Theme changed to', theme);
  }, [theme, themeVersion]); // chatgpt would have done better than this but just leave it because it works

  const getTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-900';
      case 'dark':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  const getSecondaryTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-600';
      case 'dark':
        return 'text-gray-300';
      default:
        return 'text-gray-300';
    }
  };

  const handleThemePreviewClick = async (themeValue: Theme) => {
    console.log('Theme preview clicked:', themeValue);
    try {
      await changeTheme(themeValue);
      console.log('Theme changed successfully to:', themeValue);
      
      // navigate back to main page to see theme change instantly because waiting is for chumps
      navigate('/');
    } catch (error) {
      console.error('Failed to change theme:', error);
    }
  };

  return (
    <div key={`${theme}-${themeVersion}`} className="p-2 space-y-8">
      {/* Theme Previews */}
      <div className="space-y-4">
        <div>
          <h3 className={`text-sm font-medium ${getTextColor()} mb-3`}>Choose Your Theme</h3>
          <p className={`text-xs ${getSecondaryTextColor()} mb-4`}>Click on any preview to switch themes</p>
          <p className={`text-xs ${getSecondaryTextColor()}`}>Current theme: {theme}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {themeOptions.map((option) => (
            <div key={option.value} className="flex flex-col items-center space-y-3">
              <ThemePreview
                theme={option.value}
                isSelected={option.value === theme}
                onClick={() => handleThemePreviewClick(option.value)}
              />
              <div className="text-center">
                <h4 className={`text-sm font-medium ${getTextColor()}`}>{option.label}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};