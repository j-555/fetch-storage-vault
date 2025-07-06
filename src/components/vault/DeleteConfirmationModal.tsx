import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
  isLoading: boolean;
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName, itemType, isLoading }: DeleteConfirmationModalProps) {
  const { theme } = useTheme();

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

  const getCancelButtonClasses = () => {
    switch (theme) {
      case 'light':
        return 'mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm';
      case 'dark':
        return 'mt-3 inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700/50 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:mt-0 sm:w-auto sm:text-sm';
      default:
        return 'mt-3 inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700/50 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:mt-0 sm:w-auto sm:text-sm';
    }
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
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className={`text-lg font-medium leading-6 ${getTextColor()}`}>
                      Delete {itemType === 'folder' ? 'Folder' : 'Item'} ({itemName})
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className={`text-sm ${getSecondaryTextColor()}`}>
                        Are you sure you want to delete "{itemName}"?
                        {itemType === 'folder' && (
                            <span className="font-semibold text-red-400"> This will permanently delete the folder and all of its contents.</span>
                        )}
                        {' '}This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse sm:px-4">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    onClick={onConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Delete'}
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