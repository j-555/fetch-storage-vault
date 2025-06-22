import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, DocumentArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  parentId?: string | null;
}

export function CsvImportModal({ isOpen, onClose, onSuccess, parentId }: CsvImportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      setError(null);
      
      // generate preview (let's see what we're working with, you data wizard!)
      const generatePreview = () => {
        try {
          const lines = content.split('\n');
          const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));
          const requiredHeaders = ["Account", "Login Name", "Password", "Web Site", "Comments"];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          if (missingHeaders.length > 0) {
            setError(`Missing required columns: ${missingHeaders.join(', ')}`);
            setPreviewData([]);
            return;
          }
          const preview = lines.slice(1, 6).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers?.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          }).filter(row => Object.values(row).some(v => v !== ''));
          
          setPreviewData(preview);
        } catch (err) {
          console.error('Error parsing CSV preview:', err);
        }
      };
      generatePreview();
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setError('Please select a CSV file first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await invoke('import_csv', {
        args: {
          csvContent: csvContent,
          parentId: parentId,
        }
      });

      await onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error importing CSV:', err);
      setError(err.message || 'Failed to import CSV file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCsvContent('');
    setPreviewData([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const getModalBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-white border-gray-200';
      case 'dark':
        return 'bg-gray-900 border-gray-700';
      default:
        return 'bg-gray-900 border-gray-700';
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
        return 'text-gray-300';
      default:
        return 'text-gray-300';
    }
  };

  const getTertiaryTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-500';
      case 'dark':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getBorderColor = () => {
    switch (theme) {
      case 'light':
        return 'border-gray-300';
      case 'dark':
        return 'border-gray-600';
      default:
        return 'border-gray-600';
    }
  };

  const getTableHeaderBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-100';
      case 'dark':
        return 'bg-gray-700/50';
      default:
        return 'bg-gray-700/50';
    }
  };

  const getTableBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-50';
      case 'dark':
        return 'bg-gray-800';
      default:
        return 'bg-gray-800';
    }
  };

  const getTableBorderColor = () => {
    switch (theme) {
      case 'light':
        return 'border-gray-200';
      case 'dark':
        return 'border-gray-700/30';
      default:
        return 'border-gray-700/30';
    }
  };

  const getButtonClasses = () => {
    switch (theme) {
      case 'light':
        return 'px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors';
      case 'dark':
        return 'px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors';
      default:
        return 'px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors';
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
              <Dialog.Panel className={`w-full max-w-2xl transform overflow-hidden rounded-2xl ${getModalBackground()} p-6 text-left align-middle shadow-xl transition-all`}>
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className={`text-lg font-semibold ${getTextColor()} flex items-center gap-2`}>
                    <DocumentArrowUpIcon className="h-5 w-5 text-indigo-400" />
                    Import CSV
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className={`${getSecondaryTextColor()} hover:${getTextColor()} transition-colors`}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* File Upload Section */}
                  <div>
                    <label className={`block text-sm font-medium ${getSecondaryTextColor()} mb-2`}>
                      Select CSV File
                    </label>
                    <div className={`border-2 border-dashed ${getBorderColor()} rounded-lg p-6 text-center hover:border-indigo-500 transition-colors`}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                      >
                        <DocumentArrowUpIcon className="h-5 w-5" />
                        Choose CSV File
                      </button>
                      <div className={`text-xs ${getTertiaryTextColor()} mt-2`}>
                        Supported format: CSV with columns: Account, Login Name, Password, Web Site, Comments, url, username, password, httpRealm, formActionOrigin, guid, timeCreated, timeLastUsed, timePasswordChanged
                      </div>
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                      <span className="text-red-300 text-sm">{error}</span>
                    </div>
                  )}

                  {/* Preview Section */}
                  {previewData.length > 0 && (
                    <div>
                      <h4 className={`text-sm font-medium ${getSecondaryTextColor()} mb-3`}>Preview (first 5 rows)</h4>
                      <div className={`${getTableBackground()} rounded-lg overflow-hidden`}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className={getTableHeaderBackground()}>
                                {Object.keys(previewData[0] || {}).map((header) => (
                                  <th key={header} className={`px-3 py-2 text-left ${getSecondaryTextColor()} font-medium`}>
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.map((row, index) => (
                                <tr key={index} className={`border-t ${getTableBorderColor()}`}>
                                  {Object.entries(row).map(([header, value], cellIndex) => {
                                    let displayValue = String(value);
                                    if (header === 'Web Site') {
                                      displayValue = displayValue.replace(/https?:\/\//g, '').replace(/www\./g, '');
                                    }
                                    return (
                                      <td key={cellIndex} className={`px-3 py-2 ${getTertiaryTextColor()}`}>
                                        {displayValue.length > 20 
                                          ? displayValue.substring(0, 20) + '...'
                                          : displayValue
                                        }
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={handleClose}
                      className={getButtonClasses()}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={isLoading || !csvContent.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Import'
                      )}
                    </button>
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