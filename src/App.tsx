import { Routes, Route, Navigate } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { VaultPage } from './components/vault/VaultPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { Login } from './components/auth/Login';
import { useAuth } from './hooks/useAuth';
import { ErrorPopup } from './components/auth/ErrorPopup';
import { useTheme } from './hooks/useTheme';

import './App.css';

function getFormattedError(error: string): { title: string; description: string } | null {
  if (error.includes('InvalidMasterKey')) {
    return {
      title: 'Invalid Master Key',
      description: 'The key you entered is incorrect. Please double-check and try again.',
    };
  }
  if (error.includes('VaultAlreadyInitialized')) {
      return {
          title: 'Vault Already Initialized',
          description: "A vault already exists. Please enter your master key to unlock it instead of creating a new one."
      }
  }
  if (error.includes('ItemNotFound')) {
    return {
      title: 'Item Not Found',
      description: 'The requested item could not be found in your vault.',
    };
  }
  if (error.includes('VaultLocked')) {
    return {
      title: 'Vault Locked',
      description: 'Your vault is locked. Please unlock it to perform this action.',
    };
  }
  if (error.includes('InvalidInput')) {
    const detail = error.split('InvalidInput: ').pop() || "Please check your input.";
    return {
      title: 'Invalid Input',
      description: `There was an issue with the data you provided: ${detail}`,
    };
  }
  if (error.includes('Io')) {
    return {
      title: 'File System Error',
      description: 'A file system error occurred. Please check file permissions or available disk space.',
    };
  }
  if (error.includes('Crypto')) {
    return {
      title: 'Encryption Error',
      description: 'An encryption error occurred. Please try again or contact support.',
    };
  }
  if (error.includes('Storage')) {
    return {
      title: 'Database Error',
      description: 'A storage error occurred. Please try again or restart the application.',
    };
  }
  if (error.includes('Serialization')) {
    return {
      title: 'Data Error',
      description: 'There was an issue processing data. Please try again.',
    };
  }
  
  console.error('Unexpected error occurred:', error);
  return null;
}

function App() {
  const {
    isAuthenticated,
    isInitialized,
    isLoading,
    error,
    initializeVault,
    login,
    clearError,
  } = useAuth();
  
  const { theme, themeVersion } = useTheme();
  const errorInfo = getFormattedError(error || '');
  const errorTitle = errorInfo?.title || '';
  const errorDescription = errorInfo?.description || '';

  if (import.meta.env.DEV) {
    console.log('App: Vault status - isInitialized:', isInitialized, 'isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  }

  const getLoadingBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-b from-gray-50 to-gray-100';
      case 'dark':
        return 'bg-gradient-to-b from-gray-900 to-black';
      default:
        return 'bg-gradient-to-b from-gray-900 to-black';
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${getLoadingBackground()} flex items-center justify-center`}>
        <div className="flex flex-col items-center space-y-4">
          <ArrowPathIcon className="h-8 w-8 text-indigo-500 animate-spin" />
          <div className="text-gray-400">Loading vault...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div key={themeVersion} className={`min-h-screen ${getLoadingBackground()}`}>
        <Routes>
          {isAuthenticated ? (
            <>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/recycling-bin" element={<VaultPage showRecyclingBin />} />
              <Route path="/*" element={<VaultPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route
              path="*"
              element={
                <Login
                  isInitialized={isInitialized ?? false}
                  onInitialize={initializeVault}
                  onLogin={login}
                />
              }
            />
          )}
        </Routes>
      </div>
      <ErrorPopup
        show={!!error && error.trim() !== '' && !!errorInfo}
        title={errorTitle}
        message={errorDescription}
        onClose={clearError}
      />
    </>
  );
}

export default App;