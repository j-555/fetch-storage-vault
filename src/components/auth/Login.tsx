import { useState, Fragment, useEffect } from 'react';
import { LockClosedIcon, ArrowPathIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { Listbox, Transition } from '@headlessui/react';
import { strengthOptions } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';
import { useLockoutStatus } from '../../hooks/useLockoutStatus';
import { LockoutWarning } from './LockoutWarning';

interface LoginProps {
  isInitialized: boolean;
  onInitialize: (masterKey: string, strength: string) => Promise<boolean>;
  onLogin: (masterKey: string) => Promise<boolean>;
}

export function Login({ isInitialized, onInitialize, onLogin }: LoginProps) {
  const [masterKey, setMasterKey] = useState('');
  const [confirmMasterKey, setConfirmMasterKey] = useState('');
  const [strength, setStrength] = useState(strengthOptions[0]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLockoutWarning, setShowLockoutWarning] = useState(false);
  const { theme } = useTheme();
  const {
    isLockedOut,
    failedAttempts,
    maxAttempts,
    formattedRemainingTime,
    fetchLockoutStatus
  } = useLockoutStatus();

  // Check lockout status when component mounts and when attempting login
  useEffect(() => {
    fetchLockoutStatus();
  }, [fetchLockoutStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Check lockout status before attempting login
      await fetchLockoutStatus();
      if (isLockedOut) {
        setShowLockoutWarning(true);
        setIsLoading(false);
        return;
      }

      // Security: Input validation
      if (!masterKey || masterKey.length < 1) {
        setError('Master key cannot be empty');
        setIsLoading(false);
        return;
      }

      if (masterKey.length > 1000) {
        setError('Master key too long');
        setIsLoading(false);
        return;
      }

      if (!isInitialized) {
        if (masterKey !== confirmMasterKey) {
          setError('Master keys do not match');
          setIsLoading(false);
          return;
        }

        // Security: Enhanced password validation for new vaults
        if (masterKey.length < 12) {
          setError('Master key must be at least 12 characters long');
          setIsLoading(false);
          return;
        }

        const success = await onInitialize(masterKey, strength.id);
        if (!success) setError('Failed to initialize vault');
      } else {
        const success = await onLogin(masterKey);
        if (!success) setError('Invalid master key');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getBackgroundClass = () => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-b from-gray-50 to-gray-100';
      case 'dark':
        return 'bg-gradient-to-b from-gray-900 to-black';
      default:
        return 'bg-gradient-to-b from-gray-900 to-black';
    }
  };

  const getModalBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-white/90 backdrop-blur-sm border-gray-200';
      case 'dark':
        return 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50';
      default:
        return 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50';
    }
  };

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
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getInputClasses = () => {
    switch (theme) {
      case 'light':
        return 'appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm';
      case 'dark':
        return 'appearance-none rounded-lg block w-full px-3 py-2 border border-gray-600 bg-gray-700/50 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm';
      default:
        return 'appearance-none rounded-lg block w-full px-3 py-2 border border-gray-600 bg-gray-700/50 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm';
    }
  };

  const getDropdownBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-white';
      case 'dark':
        return 'bg-gray-800';
      default:
        return 'bg-gray-800';
    }
  };

  const getDropdownTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-900';
      case 'dark':
        return 'text-gray-300';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${getBackgroundClass()}`}>
      <div className={`max-w-md w-full mx-auto p-8 ${getModalBackground()} rounded-xl border`}>
        <h2 className={`text-center text-3xl font-extrabold ${getTextColor()}`}>
          Welcome to Fetch
        </h2>
        <p className={`mt-2 text-center text-sm ${getSecondaryTextColor()}`}>
          {isInitialized
            ? 'Enter your master key to unlock the vault'
            : 'Create a master key to initialize your vault'}
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              id="masterKey"
              name="masterKey"
              type="password"
              required
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              className={getInputClasses()}
              placeholder={isInitialized ? 'Enter your master key' : 'Create your master key'}
            />

            {!isInitialized && (
              <>
                <input
                  id="confirmMasterKey"
                  name="confirmMasterKey"
                  type="password"
                  required
                  value={confirmMasterKey}
                  onChange={(e) => setConfirmMasterKey(e.target.value)}
                  className={getInputClasses()}
                  placeholder="Confirm your master key"
                />
                <div>
                    <Listbox value={strength} onChange={setStrength}>
                        <div className="relative">
                            <Listbox.Label className={`block text-xs font-medium ${getSecondaryTextColor()} mb-1`}>Key Strength</Listbox.Label>
                            <Listbox.Button className={`${getInputClasses()} relative text-left`}>
                                <span className="block truncate">{strength.name}</span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <ChevronDownIcon className={`h-5 w-5 ${getSecondaryTextColor()}`} />
                                </span>
                            </Listbox.Button>
                            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                <Listbox.Options className={`absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md ${getDropdownBackground()} py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm`}>
                                    {strengthOptions.map((option) => (
                                        <Listbox.Option key={option.id} value={option} className={({active}) => `relative cursor-default select-none py-2 px-4 ${active ? 'bg-indigo-600 text-white' : getDropdownTextColor()}`}>
                                            {option.name}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                </div>
              </>
            )}
          </div>

          {error && <div className="text-red-400 text-sm text-center">{error}</div>}

          {/* Failed attempts warning */}
          {isInitialized && failedAttempts > 0 && !isLockedOut && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div className="text-sm">
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">
                    Warning: {failedAttempts} of {maxAttempts} failed attempts
                  </span>
                  <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                    {maxAttempts - failedAttempts} attempts remaining before lockout
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lockout status */}
          {isLockedOut && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="font-medium text-red-800 dark:text-red-200">
                    Account Locked
                  </span>
                </div>
                <div className="text-lg font-mono font-bold text-red-700 dark:text-red-300">
                  {formattedRemainingTime}
                </div>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Too many failed attempts. Please wait before trying again.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isLockedOut}
            className={`group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition-colors ${
              isLockedOut
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50'
            }`}
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              {isLoading ? (
                <ArrowPathIcon className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400 animate-spin" />
              ) : (
                <LockClosedIcon className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" />
              )}
            </span>
            {isLockedOut
              ? `Locked (${formattedRemainingTime})`
              : isLoading
              ? isInitialized
                ? 'Unlocking...'
                : 'Initializing...'
              : isInitialized
              ? 'Unlock Vault'
              : 'Initialize Vault'}
          </button>
        </form>
      </div>

      {/* Lockout Warning Modal */}
      <LockoutWarning
        show={showLockoutWarning}
        onClose={() => setShowLockoutWarning(false)}
        allowReset={import.meta.env.DEV} // Only allow reset in development
      />
    </div>
  );
}