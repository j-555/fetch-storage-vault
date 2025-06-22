import { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface DeleteVaultModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (key: string) => Promise<void>;
}

export function DeleteVaultModal({ isOpen, onClose, onConfirm }: DeleteVaultModalProps) {
  const [masterKey, setMasterKey] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isButtonDisabled = confirmText !== 'DELETE' || isLoading;

  const handleSubmit = async () => {
    setError('');
    if (!masterKey) {
      setError('Master key is required to confirm deletion.');
      return;
    }
    setIsLoading(true);
    try {
      await onConfirm(masterKey);
    } catch (err: any) {
      setError(err.message || 'Failed to delete vault. Check master key.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog as="div" className="relative z-50" open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black/75" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-red-700/50 p-6 shadow-xl transition-all">
            <Dialog.Title className="text-lg font-medium text-red-400 mb-2">Delete Vault</Dialog.Title>
            <p className="text-sm text-gray-400 mb-4">
              This is an irreversible action. All your data will be permanently deleted. To confirm, please enter your master key and type "DELETE" in the box below.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Master Key</label>
                <input
                  type="password"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter master key to confirm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Type "DELETE" to confirm</label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder='Type "DELETE"'
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

            <div className="flex justify-end space-x-3 mt-6">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-700/50 rounded-lg hover:bg-gray-700">Cancel</button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isButtonDisabled}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-800/50 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                {isLoading ? 'Deleting...' : 'Permanently Delete Vault'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}