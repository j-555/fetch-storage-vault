import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  ExclamationTriangleIcon, 
  ClockIcon,
  ShieldExclamationIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useLockoutStatus } from '../../hooks/useLockoutStatus';
import { useTheme } from '../../hooks/useTheme';

interface LockoutWarningProps {
  show: boolean;
  onClose: () => void;
  allowReset?: boolean; // For admin/debug purposes
}

export function LockoutWarning({ show, onClose, allowReset = false }: LockoutWarningProps) {
  const { theme } = useTheme();
  const { 
    lockoutStatus, 
    isLoading, 
    formattedRemainingTime, 
    resetFailedAttempts,
    fetchLockoutStatus 
  } = useLockoutStatus();

  const handleReset = async () => {
    const success = await resetFailedAttempts();
    if (success) {
      onClose();
    }
  };

  const handleRefresh = () => {
    fetchLockoutStatus();
  };

  if (!lockoutStatus) return null;

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const textClass = isDark ? 'text-gray-100' : 'text-gray-900';
  const secondaryTextClass = isDark ? 'text-gray-300' : 'text-gray-600';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl ${bgClass} p-6 text-left align-middle shadow-xl transition-all border ${borderClass}`}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    <ShieldExclamationIcon className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <Dialog.Title as="h3" className={`text-lg font-medium ${textClass}`}>
                      Account Temporarily Locked
                    </Dialog.Title>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-800 dark:text-red-200">
                        Too Many Failed Attempts
                      </span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Your account has been temporarily locked due to {lockoutStatus.failed_attempts} failed login attempts.
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-blue-800 dark:text-blue-200">
                          Time Remaining
                        </span>
                      </div>
                      <button
                        onClick={handleRefresh}
                        className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
                        title="Refresh status"
                      >
                        <ArrowPathIcon className={`h-4 w-4 text-blue-600 dark:text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <div className="text-2xl font-mono font-bold text-blue-700 dark:text-blue-300">
                      {formattedRemainingTime}
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Please wait before trying again
                    </p>
                  </div>

                  <div className={`text-sm ${secondaryTextClass} space-y-2`}>
                    <div className="flex justify-between">
                      <span>Failed Attempts:</span>
                      <span className="font-medium">{lockoutStatus.failed_attempts} / {lockoutStatus.max_attempts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lockout Duration:</span>
                      <span className="font-medium">{lockoutStatus.lockout_duration_minutes} minutes</span>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      className={`flex-1 inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors`}
                      onClick={onClose}
                    >
                      Close
                    </button>
                    
                    {allowReset && (
                      <button
                        type="button"
                        className={`flex-1 inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={handleReset}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Resetting...' : 'Reset Lockout'}
                      </button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
