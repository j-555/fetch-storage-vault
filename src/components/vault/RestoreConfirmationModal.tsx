import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

interface RestoreConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (includeContents: boolean) => void;
  itemName: string;
  isLoading: boolean;
  isFolder?: boolean;
}

export function RestoreConfirmationModal({ isOpen, onClose, onConfirm, itemName, isLoading, isFolder }: RestoreConfirmationModalProps) {
  const { theme } = useTheme();
  const [includeContents, setIncludeContents] = useState(true);

  const getModalBackground = () => {
    return theme === 'light' ? 'bg-white/90 backdrop-blur-sm border-gray-200' : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50';
  };

  const getTextColor = () => {
    return theme === 'light' ? 'text-gray-900' : 'text-white';
  };

  const getSecondaryTextColor = () => {
    return theme === 'light' ? 'text-gray-600' : 'text-gray-400';
  };
  
  const getCheckboxLabelColor = () => {
    return theme === 'light' ? 'text-gray-800' : 'text-gray-200';
  }

  const getCancelButtonClasses = () => {
    return theme === 'light' 
      ? 'mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm'
      : 'mt-3 inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700/50 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm';
  };

  const handleConfirm = () => {
    onConfirm(isFolder ? includeContents : false);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75" />
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
              <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl ${getModalBackground()} p-6 text-left align-middle shadow-xl transition-all`}>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <ArrowUturnLeftIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className={`text-lg font-medium leading-6 ${getTextColor()}`}>
                      Restore {isFolder ? 'Folder' : 'Item'}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className={`text-sm ${getSecondaryTextColor()}`}>
                        Are you sure you want to restore "{itemName}"?
                      </p>
                      {isFolder && (
                        <div className="mt-4">
                            <div className="flex items-center">
                                <input
                                    id="include-contents"
                                    name="include-contents"
                                    type="checkbox"
                                    checked={includeContents}
                                    onChange={(e) => setIncludeContents(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-500 bg-transparent text-indigo-500 focus:ring-indigo-600"
                                />
                                <label htmlFor="include-contents" className={`ml-3 block text-sm ${getCheckboxLabelColor()}`}>
                                    Also restore all contents inside this folder.
                                </label>
                            </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse sm:px-4">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    onClick={handleConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Restoring...' : 'Restore'}
                  </button>
                  <button
                    type="button"
                    className={getCancelButtonClasses()}
                    onClick={onClose}
                  >
                    Cancel
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