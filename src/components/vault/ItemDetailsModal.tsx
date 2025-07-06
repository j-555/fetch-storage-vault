import { Fragment, useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { invoke } from '@tauri-apps/api/core';
import {
  XMarkIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  LockClosedIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,

  TrashIcon,
  PlusCircleIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { typeIcons, ISSUER_NAME } from '../../utils/constants';
import { getExtensionFromMime, cleanUrlForDisplay } from '../../utils/helpers';
import { VaultItem } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../../hooks/useTheme';
import { AudioPlayer } from './AudioPlayer';
import { VideoPlayer } from './VideoPlayer';

interface ItemDetailsModalProps {
  item: VaultItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemDetailsModal({ item, isOpen, onClose: onCloseProp }: ItemDetailsModalProps) {
  type ViewMode = 'LOCKED' | 'CONFIRMING' | 'LOADING' | 'CONTENT_VISIBLE' | 'ERROR';
  const [viewMode, setViewMode] = useState<ViewMode>('LOCKED');

  const [content, setContent] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState('');
  const [copyStatus, setCopyStatus] = useState<{ username: boolean; password: boolean; totp: boolean; totpSecret: boolean }>({ username: false, password: false, totp: false, totpSecret: false });
  const [showPassword, setShowPassword] = useState(false);

  // TOTP State
  const [showAddTotp, setShowAddTotp] = useState(false);
  const [totpSecretInput, setTotpSecretInput] = useState('');
  // const [validationTotpCode, setValidationTotpCode] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [currentDisplayTotp, setCurrentDisplayTotp] = useState<string | null>(null);
  const [totpCountdown, setTotpCountdown] = useState(30);
  const [showManageTotp, setShowManageTotp] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [showRawSecret, setShowRawSecret] = useState(false);
  const [isSavingTotp, setIsSavingTotp] = useState(false);
  const [isRemovingTotp, setIsRemovingTotp] = useState(false);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);

  const totpIntervalRef = useRef<number | null>(null); // Changed NodeJS.Timeout to number
  const countdownIntervalRef = useRef<number | null>(null); // Changed NodeJS.Timeout to number


  const { login, error: authError, clearError: clearAuthError } = useAuth();
  const { theme, themeVersion } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const resetAndClose = useCallback(() => {
    // cleanup blob URL if it exists
    if (content && content.startsWith('blob:')) {
      URL.revokeObjectURL(content);
    }
    
    onCloseProp();
    setTimeout(() => {
      setContent(null);
      setMasterKey('');
      // Reset TOTP states
      setShowAddTotp(false);
      setTotpSecretInput('');
      // setValidationTotpCode(null);
      setValidationError(null);
      setCurrentDisplayTotp(null);
      setTotpCountdown(30);
      setShowManageTotp(false);
      setQrCodeImage(null);
      setShowRawSecret(false);
      if (totpIntervalRef.current) clearInterval(totpIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      if (authError) clearAuthError();
    }, 200);
  }, [onCloseProp, authError, clearAuthError, content]);

  const fetchAndUpdateTotp = useCallback(async () => {
    if (item?.totp_secret) {
      try {
        const code = await invoke<string>('generate_totp', { secret: item.totp_secret });
        setCurrentDisplayTotp(code);
        setTotpCountdown(30 - (new Date().getSeconds() % 30));
      } catch (err) {
        console.error("Failed to fetch TOTP:", err);
        setCurrentDisplayTotp("Error");
      }
    }
  }, [item]);

  useEffect(() => {
    if (isOpen && item) {
      if (localStorage.getItem('requireKeyOnAccess') === 'true') {
        setViewMode('LOCKED');
      } else {
        setViewMode('LOADING');
        loadContent(); // This will also trigger TOTP loading if secret exists
      }
       // Initial TOTP fetch and setup interval if secret exists and modal is open
      if (item.totp_secret) {
        fetchAndUpdateTotp();
        totpIntervalRef.current = setInterval(fetchAndUpdateTotp, 1000 * 30); // Update every 30s
        countdownIntervalRef.current = setInterval(() => {
          setTotpCountdown(prev => (prev > 1 ? prev - 1 : 30));
        }, 1000);
      }
    } else {
        // Clear intervals when modal is closed or no item
        if (totpIntervalRef.current) clearInterval(totpIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
     // Cleanup intervals on component unmount or when item changes
    return () => {
      if (totpIntervalRef.current) clearInterval(totpIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen, item, fetchAndUpdateTotp]);


  useEffect(() => {
    if (viewMode === 'CONFIRMING') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [viewMode]);

  // cleanup blob URLs when content changes
  useEffect(() => {
    return () => {
      if (content && content.startsWith('blob:')) {
        URL.revokeObjectURL(content);
      }
    };
  }, [content]);

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authError) clearAuthError();
    setViewMode('LOADING');

    const success = await login(masterKey);
    if (success) {
      setMasterKey('');
      loadContent();
    } else {
      setViewMode('CONFIRMING');
    }
  };

  const loadContent = async () => {
    if (!item) return;

    try {
      // Only load item content if it's not a folder
      // Folders don't have content to load, but they might have TOTP
      if (item.item_type !== "folder") {
        const result = await invoke<number[]>('get_item_content', { id: item.id });
        const uint8Array = new Uint8Array(result);
        
        if (item.type === 'text' || item.type === 'key') {
          setContent(new TextDecoder().decode(uint8Array)); // Decodes to string
        } else {
          // for media files, create blob with proper mime type
          let mimeType = item.item_type;
          
          // ensure we have a valid mime type for blob creation
          if (!mimeType || mimeType === 'unknown') {
            // fallback mime types based on file extension
            const extension = item.name.split('.').pop()?.toLowerCase();
            switch (extension) {
              case 'jpg':
              case 'jpeg':
                mimeType = 'image/jpeg';
                break;
              case 'png':
                mimeType = 'image/png';
                break;
              case 'gif':
                mimeType = 'image/gif';
                break;
              case 'webp':
                mimeType = 'image/webp';
                break;
              case 'mp4':
                mimeType = 'video/mp4';
                break;
              case 'mov':
                mimeType = 'video/quicktime';
                break;
              case 'avi':
                mimeType = 'video/x-msvideo';
                break;
              case 'mkv':
                mimeType = 'video/x-matroska';
                break;
              case 'webm':
                mimeType = 'video/webm';
                break;
              case 'mp3':
                mimeType = 'audio/mpeg';
                break;
              case 'wav':
                mimeType = 'audio/wav';
                break;
              case 'ogg':
                mimeType = 'audio/ogg';
                break;
              case 'flac':
                mimeType = 'audio/flac';
                break;
              case 'm4a':
                mimeType = 'audio/mp4';
                break;
              default:
                mimeType = 'application/octet-stream';
            }
          }
          
          console.log('Creating blob with mime type:', mimeType, 'for item:', item.name);
          const blob = new Blob([uint8Array], { type: mimeType });
          const url = URL.createObjectURL(blob);
          console.log('Created blob URL:', url);
          setContent(url);
        }
      } // End of if item.item_type !== "folder"
      
      // If the item has a TOTP secret, start fetching/updating it
      if (item.totp_secret) {
        fetchAndUpdateTotp(); // Initial fetch
        if (totpIntervalRef.current) clearInterval(totpIntervalRef.current);
        totpIntervalRef.current = setInterval(fetchAndUpdateTotp, 1000 * 30); // Update every 30s
        
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
          setTotpCountdown(prev => (prev > 1 ? prev - 1 : 30));
        }, 1000);
      } else {
        // Ensure TOTP display is cleared if no secret
        setCurrentDisplayTotp(null);
        if (totpIntervalRef.current) clearInterval(totpIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }

      setViewMode('CONTENT_VISIBLE');
    } catch (err) {
      console.error('Error loading content or TOTP:', err);
      setViewMode('ERROR');
    }
  };

  const handleDownload = async () => {
    if (!item || !content) return;
    try {
      const extension = getExtensionFromMime(item.item_type);
      const filename = item.name.includes('.') ? item.name : `${item.name}.${extension}`;

      const a = document.createElement('a');
      a.href = content;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error preparing download:', err);
    }
  };

  const getModalBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-white/90 backdrop-blur-sm border-gray-300';
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

  const getInputBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200 border-gray-400 text-gray-900 placeholder-gray-600';
      case 'dark':
        return 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400';
      default:
        return 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400';
    }
  };

  const getButtonBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200 hover:bg-gray-300 text-gray-700';
      case 'dark':
        return 'bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-white';
      default:
        return 'bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-white';
    }
  };

  const getContentBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200 text-gray-800';
      case 'dark':
        return 'bg-gray-900/50 text-gray-300';
      default:
        return 'bg-gray-900/50 text-gray-300';
    }
  };

  const renderLockedView = () => (
    <div className="py-8 text-center">
      <button
        onClick={() => setViewMode('CONFIRMING')}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
      >
        <LockClosedIcon className="h-5 w-5" />
        <span>Unlock to View Content</span>
      </button>
    </div>
  );

  const renderConfirmingView = () => (
    <div className="py-8 text-center">
      <h3 className={`text-lg font-medium leading-6 ${getTextColor()} mb-2`}>Confirm Access</h3>
      <p className={`text-sm ${getSecondaryTextColor()} mb-4`}>Please enter your master key to view this item.</p>
      <form onSubmit={handleConfirmAction} className="space-y-4 max-w-sm mx-auto">
        <input
          ref={inputRef}
          type="password"
          value={masterKey}
          onChange={(e) => setMasterKey(e.target.value)}
          className={`w-full px-3 py-2 ${getInputBackground()} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          placeholder="Enter your master key"
          required
        />
        {authError && <p className="text-sm text-red-400">Invalid master key. Please try again.</p>}
        <div className="flex justify-center space-x-3">
          <button type="button" onClick={() => setViewMode('LOCKED')} className={`px-4 py-2 text-sm font-medium ${getButtonBackground()} rounded-lg`}>
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            Unlock
          </button>
        </div>
      </form>
    </div>
  );

  const renderLoadingView = () => (
    <div className="flex justify-center items-center h-full p-8">
      <ArrowPathIcon className="h-8 w-8 text-indigo-400 animate-spin" />
    </div>
  );

  // Helper to extract username/password/url from key content
  const parseKeyContent = (content: string | null) => {
    const result = { username: '', password: '' };
    if (!content) return result;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Username:')) {
        result.username = line.substring(9).trim();
      } else if (line.startsWith('Password:')) {
        result.password = line.substring(9).trim();
      }
    }
    return result;
  };

  const handleCopy = async (field: 'username' | 'password' | 'totp' | 'totpSecret', value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopyStatus((prev) => ({ ...prev, [field]: true }));
    setTimeout(() => setCopyStatus((prev) => ({ ...prev, [field]: false })), 2000);
  };

  const handleTotpSecretInputChange = async (secret: string) => {
    setTotpSecretInput(secret);
    setValidationError(null);
  };

  const handleSaveTotpSecret = async () => {
    if (!item || !totpSecretInput.trim()) return;
    setIsSavingTotp(true);
    const trimmedSecret = totpSecretInput.trim();
    try {
      // Base64 encode the secret before saving
      const base64Secret = btoa(trimmedSecret);
      await invoke('update_item', {
        args: {
          id: item.id,
          name: item.name,
          content: item.type === 'key' || item.type === 'text' ? content || '' : '', 
          item_type: item.item_type,
          tags: item.tags,
          parent_id: item.parent_id,
          totp_secret: base64Secret, // Save the Base64 encoded secret
        }
      });
      
      if (item) item.totp_secret = base64Secret; // Update local item with Base64 secret
      setShowAddTotp(false);
      setTotpSecretInput(''); // Clear the raw input
      setValidationError(null); // Clear validation error on successful save

      // Immediately fetch and display the first TOTP code
      await fetchAndUpdateTotp();
      
      // Set up the intervals for auto-updating
      if (totpIntervalRef.current) clearInterval(totpIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      totpIntervalRef.current = setInterval(fetchAndUpdateTotp, 1000 * 30); // Update every 30s
      countdownIntervalRef.current = setInterval(() => {
        setTotpCountdown(prev => (prev > 1 ? prev - 1 : 30));
      }, 1000);

      // Initialize the countdown to the correct value
      setTotpCountdown(30 - (new Date().getSeconds() % 30));
    } catch (err: any) {
        console.error("Error saving TOTP secret:", err);
        if (err instanceof DOMException && err.name === 'InvalidCharacterError') {
            setValidationError("Secret contains invalid characters for Base64 encoding. Cannot save.");
        } else {
            setValidationError(err.message || "Failed to save secret. Please try again.");
        }
    } finally {
      setIsSavingTotp(false);
    }
  };
  
  const handleManageTotp = async () => {
    if (!item || !item.totp_secret) return;
    setShowManageTotp(true);
    try {
      const qr = await invoke<string>('generate_qr_code', {
        itemName: item.name,
        issuer: ISSUER_NAME, // Use a constant or configurable issuer name
        secret: item.totp_secret,
      });
      setQrCodeImage(qr);
    } catch (err) {
      console.error("Error generating QR code:", err);
      setQrCodeImage(null); // Or a placeholder error image/message
    }
  };

  const handleRemoveTotp = async () => {
    if (!item) return;
    setShowRemoveConfirmation(true);
  };

  const confirmRemoveTotp = async () => {
    if (!item) return;
    setIsRemovingTotp(true);
    try {
      await invoke('update_item', {
        args: {
          id: item.id,
          name: item.name,
          content: item.type === 'key' || item.type === 'text' ? content || '' : '',
          item_type: item.item_type,
          tags: item.tags,
          parent_id: item.parent_id,
          totp_secret: null, // Set to null to remove
        }
      });
      if (item) item.totp_secret = undefined; // Update local item state
      setCurrentDisplayTotp(null);
      if (totpIntervalRef.current) clearInterval(totpIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowManageTotp(false);
      setQrCodeImage(null);
      setShowRemoveConfirmation(false);
    } catch (err) {
      console.error("Error removing TOTP secret:", err);
      // Show error to user
    } finally {
      setIsRemovingTotp(false);
    }
  };

  const cancelRemoveTotp = () => {
    setShowRemoveConfirmation(false);
  };

  const renderRemoveConfirmationDialog = () => (
    <Transition appear show={showRemoveConfirmation} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={cancelRemoveTotp}>
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
              <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl ${theme === 'light' ? 'bg-white/90 backdrop-blur-sm border-gray-200' : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'} p-6 text-left align-middle shadow-xl transition-all`}>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title className={`text-lg font-medium leading-6 ${getTextColor()}`}>
                      Remove One-Time Password
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className={`text-sm ${getSecondaryTextColor()}`}>
                        Are you sure you want to remove the One-Time Password? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse sm:px-4">
                  <button
                    onClick={confirmRemoveTotp}
                    disabled={isRemovingTotp}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isRemovingTotp ? 'Removing...' : 'Remove'}
                  </button>
                  <button
                    onClick={cancelRemoveTotp}
                    className={`mt-3 inline-flex w-full justify-center rounded-md border ${theme === 'light' ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-600 bg-gray-700/50 text-white hover:bg-gray-700'} px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${theme === 'dark' ? 'focus:ring-offset-gray-800' : ''} sm:mt-0 sm:w-auto sm:text-sm`}
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

  const renderContentView = () => {
    console.log('Rendering content view for item:', item?.name, 'type:', item?.type, 'content:', content ? 'exists' : 'null');
    
    const isLoginItem = item?.type === 'key'; // Assuming 'key' is for login items

    return (
      <>
        {item?.type === 'image' && content && (
          <div className={`flex items-center justify-center p-4 ${getContentBackground()} rounded-lg`}>
            <img src={content} alt={item?.name} className="max-w-full max-h-[60vh] rounded-lg object-contain" />
          </div>
        )}

        {(item?.type === 'text' || item?.type === 'key') && content && (
          item.type === 'key' ? (
            <div className={`relative group ${getContentBackground()} rounded-xl p-4 text-sm font-mono overflow-x-auto max-h-[60vh] space-y-4`}>
              {parseKeyContent(content).username && (
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Username:</span>
                  <span className="break-all">{parseKeyContent(content).username}</span>
                  <button
                    onClick={() => handleCopy('username', parseKeyContent(content).username)}
                    className="ml-2 text-gray-400 hover:text-white transition"
                    title="Copy username"
                  >
                    {copyStatus.username ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                  </button>
                </div>
              )}
              {parseKeyContent(content).password && (
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Password:</span>
                  <span className="break-all">
                    {showPassword ? parseKeyContent(content).password : '•'.repeat(parseKeyContent(content).password.length)}
                  </span>
                  <button
                    onClick={() => setShowPassword((v) => !v)}
                    className="ml-2 text-gray-400 hover:text-white transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleCopy('password', parseKeyContent(content).password)}
                    className="ml-2 text-gray-400 hover:text-white transition"
                    title="Copy password"
                  >
                    {copyStatus.password ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                  </button>
                </div>
              )}
              <div className="pt-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.split('\n').filter(l => !l.startsWith('Username:') && !l.startsWith('Password:')).join('\n')}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className={`relative group ${getContentBackground()} rounded-xl p-4 text-sm font-mono overflow-x-auto max-h-[60vh] prose prose-invert`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )
        )}

        {item?.type === 'audio' && content && (
          <div className={`relative group ${getContentBackground()} rounded-xl p-4 text-sm font-mono overflow-x-auto max-h-[60vh]`}>
            <AudioPlayer audioUrl={content} fileName={item.name} />
          </div>
        )}

        {item?.type === 'video' && content && (
          <div className={`relative group ${getContentBackground()} rounded-xl p-4 text-sm font-mono overflow-x-auto max-h-[60vh]`}>
            <VideoPlayer videoUrl={content} fileName={item.name} />
          </div>
        )}
        
        {/* TOTP Section */}
        {isLoginItem && (
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            {!item.totp_secret && !showAddTotp && (
              <button
                onClick={() => setShowAddTotp(true)}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg ${getButtonBackground()} hover:bg-opacity-80 transition-colors`}
              >
                <PlusCircleIcon className="h-5 w-5" />
                <span>Add One-Time Password</span>
              </button>
            )}

            {showAddTotp && (
              <div className="space-y-3">
                <h4 className={`text-sm font-medium ${getSecondaryTextColor()}`}>Add One-Time Password Key</h4>
                <input
                  type="password"
                  value={totpSecretInput}
                  onChange={(e) => handleTotpSecretInputChange(e.target.value)}
                  placeholder="Paste secret key here"
                  className={`w-full px-3 py-2 ${getInputBackground()} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
                {validationError && <p className="text-xs text-red-400">{validationError}</p>}
                <div className="flex justify-end space-x-2">
                  <button onClick={() => { setShowAddTotp(false); setTotpSecretInput(''); setValidationError(null); }} className={`px-3 py-1.5 text-xs ${getButtonBackground()} rounded-md`}>Cancel</button>
                  <button 
                    onClick={handleSaveTotpSecret} 
                    disabled={!totpSecretInput.trim() || isSavingTotp}
                    className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSavingTotp ? 'Saving...' : 'Save Key'}
                  </button>
                </div>
              </div>
            )}

            {item.totp_secret && !showAddTotp && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${getSecondaryTextColor()}`}>One-Time Password</h4>
                    <button onClick={handleManageTotp} className={`p-1 rounded-md ${getButtonBackground()} hover:bg-opacity-80`} title="Manage TOTP">
                        <Cog6ToothIcon className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="relative h-6 w-6">
                      <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
                        <circle className="text-gray-600/50" strokeWidth="3" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                        <circle
                          className="text-indigo-500"
                          strokeWidth="3"
                          strokeDasharray={`${(totpCountdown / 30) * 100}, 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="16"
                          cx="18"
                          cy="18"
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-xs ${getTextColor()}`}>{totpCountdown}</span>
                    </div>
                    <span className={`text-2xl font-semibold tracking-wider ${getTextColor()}`}>{currentDisplayTotp || '------'}</span>
                  </div>
                  <button
                    onClick={() => currentDisplayTotp && handleCopy('totp', currentDisplayTotp)}
                    disabled={!currentDisplayTotp || currentDisplayTotp === "Error"}
                    className={`p-1.5 rounded-md ${getButtonBackground()} hover:bg-opacity-80 disabled:opacity-50`}
                    title="Copy code"
                  >
                    {copyStatus.totp ? <CheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                  </button>
                </div>

                {showManageTotp && (
                  <div className="p-3 bg-gray-700/40 rounded-lg space-y-3">
                    {qrCodeImage ? (
                      <div className="flex flex-col items-center">
                        <img src={`data:image/png;base64,${qrCodeImage}`} alt="TOTP QR Code" className="w-40 h-40 rounded-md border border-gray-600" />
                        <p className={`text-xs mt-1 ${getSecondaryTextColor()}`}>Scan with your authenticator app.</p>
                      </div>
                    ) : (
                      <p className={`text-xs text-center ${getSecondaryTextColor()}`}>Loading QR code...</p>
                    )}
                    <div className="space-y-1">
                        <p className={`text-xs font-medium ${getSecondaryTextColor()}`}>Secret Key:</p>
                        <div className="flex items-center space-x-2 p-2 bg-gray-800/50 rounded-md">
                        <span className={`flex-grow text-xs font-mono ${getTextColor()}`}>{showRawSecret ? item.totp_secret : '••••••••••••••••••••••••••••'}</span>
                        <button onClick={() => setShowRawSecret(!showRawSecret)} className={`p-1 ${getButtonBackground()} rounded`}>
                            {showRawSecret ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                        <button 
                            onClick={() => item.totp_secret && handleCopy('totpSecret', item.totp_secret)}
                            className={`p-1 ${getButtonBackground()} rounded`} title="Copy secret key"
                        >
                            {copyStatus.totpSecret ? <CheckIcon className="h-4 w-4 text-green-400" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                        </button>
                        </div>
                    </div>
                    <button 
                        onClick={handleRemoveTotp}
                        disabled={isRemovingTotp}
                        className={`w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-900/30 hover:bg-red-900/50 rounded-md disabled:opacity-50`}
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                        <span>{isRemovingTotp ? 'Removing...' : 'Remove TOTP'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Fallback for non-previewable content or folders */}
        {!(item?.type === 'image' && content) &&
         !((item?.type === 'text' || item?.type === 'key') && content) &&
         !(item?.type === 'audio' && content) &&
         !(item?.type === 'video' && content) &&
         (item?.item_type !== 'folder' || !isLoginItem) && /* For folders, only show if not a login item with TOTP */
          <div className={`text-center ${getSecondaryTextColor()} p-8`}>
            {item?.item_type === 'folder' ? 'This is a folder.' : 'No preview available for this file type.'}
          </div>
        }
        {renderRemoveConfirmationDialog()}
      </>
    );
  };

  const renderModalContent = () => {
    switch (viewMode) {
      case 'LOCKED': return renderLockedView();
      case 'CONFIRMING': return renderConfirmingView();
      case 'LOADING': return renderLoadingView();
      case 'CONTENT_VISIBLE': return renderContentView();
      case 'ERROR': return <div className="text-center text-red-400 p-8">Failed to load content.</div>;
      default: return null;
    }
  };

  if (!item) return null;

  const Icon = typeIcons[item.type as keyof typeof typeIcons] || FolderIcon;
  const displayName = cleanUrlForDisplay(item.name);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={resetAndClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/75" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel key={themeVersion} className={`w-full max-w-2xl transform overflow-hidden rounded-2xl ${getModalBackground()} p-6 shadow-xl transition-all`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-6 w-6 text-indigo-400" />
                    <Dialog.Title className={`text-lg font-medium ${getTextColor()}`}>{displayName}</Dialog.Title>
                  </div>
                  <button onClick={resetAndClose} className={`${getSecondaryTextColor()} hover:text-white`}><XMarkIcon className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className={`flex items-center space-x-2 text-sm ${getSecondaryTextColor()}`}>
                      <ClockIcon className="h-4 w-4" />
                      <span>Created: {new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (<span key={tag} className="inline-flex items-center px-2 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 text-sm">{tag}</span>))}
                    </div>
                  )}
                  <div className="relative pt-2 min-h-[12rem] flex flex-col justify-center">
                    {renderModalContent()}
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={handleDownload}
                      disabled={viewMode !== 'CONTENT_VISIBLE'}
                      className={`flex items-center space-x-2 px-3 py-1.5 ${getButtonBackground()} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span>Download</span>
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