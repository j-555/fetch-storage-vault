import { useState, useRef, useEffect, Fragment } from 'react';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import { KeyIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { strengthOptions } from '../../utils/constants';

interface UpdateMasterKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (currentKey: string, newKey: string, strength: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function UpdateMasterKeyModal({ isOpen, onClose, onConfirm, isLoading, error }: UpdateMasterKeyModalProps) {
  const [currentKey, setCurrentKey] = useState('');
  const [newKey, setNewKey] = useState('');
  const [confirmNewKey, setConfirmNewKey] = useState('');
  const [strength, setStrength] = useState(strengthOptions[0]);
  const [validationError, setValidationError] = useState('');
  
  const initialFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
        setCurrentKey('');
        setNewKey('');
        setConfirmNewKey('');
        setValidationError('');
        setStrength(strengthOptions[0]);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (newKey !== confirmNewKey) {
      setValidationError("The new master keys do not match.");
      return;
    }
    // Security: Enhanced password validation
    if (newKey.length < 12) {
        setValidationError("The new key must be at least 12 characters long.");
        return;
    }

    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(newKey);
    const hasLowerCase = /[a-z]/.test(newKey);
    const hasNumbers = /\d/.test(newKey);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newKey);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        setValidationError("Password must contain uppercase, lowercase, numbers, and special characters.");
        return;
    }

    // Check for common weak patterns
    if (/(.)\1{2,}/.test(newKey)) {
        setValidationError("Password cannot contain repeated characters (e.g., 'aaa').");
        return;
    }

    if (/123|abc|qwe|password|admin/i.test(newKey)) {
        setValidationError("Password cannot contain common patterns or words.");
        return;
    }
    
    try {
        await onConfirm(currentKey, newKey, strength.id);
    } catch (err) {
        console.error("Update master key failed:", err);
    }
  };
  
  if (!isOpen) {
      return null;
  }

  const inputClasses = "w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <Dialog as="div" className="relative z-50" initialFocus={initialFocusRef} open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black/75" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-gradient-to-b from-gray-900 to-black backdrop-blur-sm border border-gray-700/50 p-6 shadow-xl transition-all">
            <div className="flex items-center space-x-3 mb-4">
              <KeyIcon className="h-6 w-6 text-indigo-400" />
              <Dialog.Title className="text-lg font-medium text-white">
                  Update Master Key
              </Dialog.Title>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Current Master Key</label>
                  <input 
                      ref={initialFocusRef} 
                      type="password"
                      value={currentKey}
                      onChange={(e) => setCurrentKey(e.target.value)}
                      className={inputClasses}
                      required
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">New Master Key</label>
                  <input 
                      type="password"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className={inputClasses}
                      required
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Master Key</label>
                  <input 
                      type="password"
                      value={confirmNewKey}
                      onChange={(e) => setConfirmNewKey(e.target.value)}
                      className={inputClasses}
                      required
                  />
              </div>
              
              <div>
                  <Listbox value={strength} onChange={setStrength}>
                      <div className="relative">
                          <Listbox.Label className="block text-sm font-medium text-gray-300 mb-1">New Key Strength</Listbox.Label>
                          <Listbox.Button className={`${inputClasses} relative text-left`}>
                              <span className="block truncate">{strength.name}</span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                              </span>
                          </Listbox.Button>
                          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
                                  {strengthOptions.map((option) => (
                                      <Listbox.Option key={option.id} value={option} className={({active}) => `relative cursor-default select-none py-2 px-4 ${active ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>
                                          {option.name}
                                      </Listbox.Option>
                                  ))}
                              </Listbox.Options>
                          </Transition>
                      </div>
                  </Listbox>
              </div>

              {validationError && <p className="text-sm text-yellow-400 text-center">{validationError}</p>}
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}

              <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      {isLoading ? 'Updating...' : 'Update Key'}
                  </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}