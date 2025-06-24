import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { getVersion } from '@tauri-apps/api/app';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    if (isOpen) {
      getVersion().then(setAppVersion);
    }
  }, [isOpen]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/75" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <InformationCircleIcon className="h-6 w-6 text-indigo-400" />
                        <Dialog.Title className="text-lg font-medium text-white">About Fetch</Dialog.Title>
                    </div>
                  <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50"><XMarkIcon className="h-5 w-5" /></button>
                </div>
                <div className="text-left space-y-4 text-sm text-gray-300">
                    <p>
                        <span className="font-semibold text-white">Fetch version:</span> {appVersion || 'Loading...'}
                    </p>
                    <p>
                        Fetch is a modern, secure digital vault designed to keep your sensitive information safe. All your data is encrypted locally on your device using industry-standard AES-256-GCM encryption.
                    </p>
                    <div className="pt-2">
                        <a 
                            href="https://github.com/j-555/fetch-storage-vault"
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Visit our GitHub page for more information.
                        </a>
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