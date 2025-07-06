import { useState, useRef, useEffect } from 'react';
import { Dialog } from '@headlessui/react';

interface MasterKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (masterKey: string, ...args: any[]) => Promise<void>;
  title: string;
  description: string;
  actionLabel: string;
  isLoading?: boolean;
  error?: string | null;
  clearError?: () => void;
  additionalArgs?: any[];
}

export function MasterKeyConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionLabel,
  isLoading,
  error: parentError,
  clearError,
  additionalArgs = [],
}: MasterKeyModalProps) {
  const [masterKey, setMasterKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setMasterKey('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setError(parentError || null);
  }, [parentError]);

  const handleClose = () => {
    setMasterKey('');
    setError(null);
    if (clearError) clearError();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKey.trim()) return;

    try {
      await onConfirm(masterKey, ...additionalArgs);
      handleClose();
    } catch (err) {
      console.error('Confirmation failed:', err);
    }
  };

  const inputClasses =
    'w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <Dialog
      as="div"
      className="relative z-50"
      onClose={handleClose}
      initialFocus={inputRef}
      open={isOpen}
    >
      <div className="fixed inset-0 bg-black/75" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-white mb-2">{title}</Dialog.Title>
            <p className="text-sm text-gray-400 mb-4">{description}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                ref={inputRef}
                type="password"
                id="masterKey-confirm-export"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                className={inputClasses}
                placeholder="Enter your master key"
                required
              />
              {error && (
                <p className="text-sm text-red-400">
                  {error.includes('InvalidMasterKey')
                    ? 'The master key you entered is incorrect.'
                    : error}
                </p>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-700/50 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Exporting...' : actionLabel}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}
