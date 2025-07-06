import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { listen } from '@tauri-apps/api/event';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'json' | 'csv' | 'http', masterKey: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
  clearError?: () => void;
}

interface ExportProgress {
  current: number;
  total: number;
  message: string;
}

export function ExportOptionsModal({
  isOpen,
  onClose,
  onExport,
  isLoading,
  error: parentError,
  clearError,
}: ExportOptionsModalProps) {
  const [masterKey, setMasterKey] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'http'>('json');
  const [internalError, setInternalError] = useState('');
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const error = parentError || internalError;

  useEffect(() => {
    if (isOpen && isLoading) {
      // Listen for progress events
      const unlisten = listen('export-progress', (event) => {
        const progressData = event.payload as ExportProgress;
        setProgress(progressData);
      });

      return () => {
        unlisten.then(fn => fn());
      };
    } else if (!isLoading) {
      setProgress(null);
    }
  }, [isOpen, isLoading]);

  const handleClose = () => {
    setMasterKey('');
    setInternalError('');
    setProgress(null);
    clearError?.();
    onClose();
  };

  const handleExport = async () => {
    setInternalError('');
    clearError?.();

    if (!masterKey) {
      setInternalError('Master key is required.');
      return;
    }

    await onExport(selectedFormat, masterKey);
  };

  const inputClasses =
    'w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const selectClasses =
    'w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const formatDescriptions = {
    json: 'Structured data format, good for backup and migration',
    csv: 'Spreadsheet format, easy to view in Excel or similar',
    http: 'Simple text format, readable in any text editor'
  };

  const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog
      as="div"
      className="relative z-50"
      onClose={handleClose}
      open={isOpen}
    >
      <div className="fixed inset-0 bg-black/75" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-white mb-2">
              Export Decrypted Vault
            </Dialog.Title>
            <p className="text-sm text-gray-400 mb-4">
              Export all your vault data to a readable, unencrypted file. Handle with care.
            </p>
            
            <div className="space-y-4">
              {!isLoading && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Export Format
                    </label>
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value as 'json' | 'csv' | 'http')}
                      className={selectClasses}
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="http">HTTP</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDescriptions[selectedFormat]}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Master Key
                    </label>
                    <input
                      type="password"
                      value={masterKey}
                      onChange={(e) => setMasterKey(e.target.value)}
                      className={inputClasses}
                      placeholder="Enter your master key"
                      required
                    />
                  </div>
                </>
              )}

              {isLoading && progress && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-300 text-center">
                    {progress.message}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    {progress.current} of {progress.total} items
                  </div>
                </div>
              )}

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
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-700/50 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {isLoading ? 'Close' : 'Cancel'}
                </button>
                {!isLoading && (
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    Export as {selectedFormat.toUpperCase()}
                  </button>
                )}
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
} 