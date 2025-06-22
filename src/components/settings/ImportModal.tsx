import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportResult {
  success_count: number;
  error_count: number;
  errors: string[];
}

export function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      });

      if (selected && typeof selected === 'string') {
        console.log('Selected file path:', selected);
        setSelectedFile(selected);
        setError(null);
      }
    } catch (err) {
      console.error('Error selecting file:', err);
      setError('Failed to select file');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImportResult(null);

    try {
      console.log('Starting import process...');
      console.log('File path:', selectedFile);
      
      const result = await invoke<ImportResult>('import_csv', { 
        args: { 
          file_path: selectedFile 
        }
      });
      console.log('Import result:', result);

      if (result.success_count > 0) {
        console.log(`Successfully imported ${result.success_count} items`);
        setError(null);
        onImportComplete();
        // close the modal after a short delay to show the success message because users are fucking slow
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const errorMessage = result.errors.length > 0 
          ? result.errors.join(', ') 
          : 'No items were imported';
        setError(`Import failed: ${errorMessage}`);
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      
      // handle string errors (our new format)
      if (typeof err === 'string') {
        setError(err);
      } else {
        // handle error objects
        setError(err.message || 'Import failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">Import Data</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </label>
          <button
            onClick={handleFileSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {selectedFile ? selectedFile.split('\\').pop() || selectedFile : 'Choose File'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {importResult && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            Successfully imported {importResult.success_count} items
            {importResult.error_count > 0 && (
              <div className="mt-2 text-sm">
                {importResult.error_count} errors occurred
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
} 