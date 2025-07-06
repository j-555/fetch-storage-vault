import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldExclamationIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';
import { useLockoutStatus } from '../../hooks/useLockoutStatus';

interface ErrorPopupProps {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function ErrorPopup({ show, title, message, onClose }: ErrorPopupProps) {
  const { theme } = useTheme();
  const { isLockedOut, failedAttempts, maxAttempts, formattedRemainingTime } = useLockoutStatus();

  // Handle close with proper transition to prevent flash
  const handleClose = () => {
    // Clear the error immediately to prevent flash
    onClose();
  };

  // Determine error type and styling
  const isInvalidKey = title.includes('Invalid Master Key') || message.includes('Invalid master key');
  const isLockoutError = title.includes('Account locked') || message.includes('too many failed attempts');



  // iOS-style incremental messages
  const getIncrementalMessage = () => {
    if (isLockoutError) {
      return {
        title: "Account Locked",
        message: `Too many failed attempts. Please wait ${formattedRemainingTime} before trying again.`,
        icon: ShieldExclamationIcon,
        color: "text-red-500"
      };
    }

    if (isInvalidKey) {
      const remaining = maxAttempts - failedAttempts;

      if (failedAttempts === 0) {
        return {
          title: "Incorrect Master Key",
          message: "Please check your master key and try again.",
          icon: LockClosedIcon,
          color: "text-amber-500"
        };
      } else if (remaining > 1) {
        return {
          title: "Incorrect Master Key",
          message: `Please check your master key and try again. ${remaining} attempts remaining.`,
          icon: LockClosedIcon,
          color: "text-amber-500"
        };
      } else if (remaining === 1) {
        return {
          title: "Incorrect Master Key",
          message: "Please check your master key and try again. 1 attempt remaining before lockout.",
          icon: ExclamationTriangleIcon,
          color: "text-red-500"
        };
      }
    }

    return {
      title: title,
      message: message,
      icon: ExclamationTriangleIcon,
      color: "text-red-500"
    };
  };

  const errorInfo = getIncrementalMessage();
  const ErrorIcon = errorInfo.icon;

  // Modern minimal styling
  const getModalBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-white/95 backdrop-blur-xl';
      case 'dark':
        return 'bg-gray-900/95 backdrop-blur-xl';
      default:
        return 'bg-gray-900/95 backdrop-blur-xl';
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
        return 'text-gray-500';
      case 'dark':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getIconColor = () => {
    if (isLockoutError) return 'text-red-500';
    if (isInvalidKey && failedAttempts >= maxAttempts - 1) return 'text-red-500';
    if (isInvalidKey) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full max-w-sm transform overflow-hidden rounded-2xl ${getModalBackground()} shadow-2xl transition-all border border-white/10`}>
                
                {/* Close button - minimal and positioned absolutely */}
                <button
                  onClick={handleClose}
                  className={`absolute top-4 right-4 p-1 ${getSecondaryTextColor()} hover:${getTextColor()} transition-colors duration-200 z-10`}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>

                <div className="px-6 py-8 text-center">
                  <div className="flex justify-center mb-4">
                    <ErrorIcon className={`h-12 w-12 ${getIconColor()}`} />
                  </div>

                  <Dialog.Title className={`text-lg font-semibold ${getTextColor()} mb-2`}>
                    {errorInfo.title}
                  </Dialog.Title>

                  <p className={`text-sm ${getSecondaryTextColor()} mb-6 leading-relaxed`}>
                    {errorInfo.message}
                  </p>

                  {isInvalidKey && failedAttempts > 0 && !isLockedOut && (
                    <div className="mb-6">
                      <div className="flex justify-center space-x-2 mb-3">
                        {Array.from({ length: maxAttempts }, (_, i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full transition-all duration-300 ${
                              i < failedAttempts
                                ? 'bg-red-500 scale-110'
                                : i === failedAttempts
                                ? 'bg-amber-500 scale-110'
                                : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${getSecondaryTextColor()}`}>
                        {maxAttempts - failedAttempts} attempts remaining
                      </p>
                    </div>
                  )}

                  {isLockedOut && (
                    <div className="mb-6">
                      <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20">
                        <div className="text-xl font-mono font-bold text-red-400">
                          {formattedRemainingTime}
                        </div>
                      </div>
                      <p className={`text-xs ${getSecondaryTextColor()} mt-2`}>
                        Time remaining
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleClose}
                    className={`
                      w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200
                      ${isLockoutError
                        ? `${getSecondaryTextColor()} hover:${getTextColor()} border ${theme === 'dark' ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'}`
                        : 'text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                      }
                    `}
                  >
                    {isLockoutError ? 'OK' : 'Try Again'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}