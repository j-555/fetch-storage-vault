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
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { typeIcons } from '../../utils/constants';
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
      if (authError) clearAuthError();
    }, 200);
  }, [onCloseProp, authError, clearAuthError, content]);

  useEffect(() => {
    if (isOpen && item) {
      if (localStorage.getItem('requireKeyOnAccess') === 'true') {
        setViewMode('LOCKED');
      } else {
        setViewMode('LOADING');
        loadContent();
      }
    }
  }, [isOpen, item]);

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
      setViewMode('CONTENT_VISIBLE');
    } catch (err) {
      console.error('Error loading content:', err);
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

  const renderContentView = () => {
    console.log('Rendering content view for item:', item?.name, 'type:', item?.type, 'content:', content ? 'exists' : 'null');
    
    if (item?.type === 'image' && content) {
      console.log('Rendering image with URL:', content);
      return (
        <div className={`flex items-center justify-center p-4 ${getContentBackground()} rounded-lg`}>
          <img src={content} alt={item?.name} className="max-w-full max-h-[60vh] rounded-lg object-contain" />
        </div>
      );
    }

    if ((item?.type === 'text' || item?.type === 'key') && content) {
      console.log('Rendering text content');
      return (
        <div className={`relative group ${getContentBackground()} rounded-xl p-4 text-sm font-mono overflow-x-auto max-h-[60vh] prose prose-invert`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      );
    }

    if (item?.type === 'audio' && content) {
      console.log('Rendering audio player with URL:', content);
      return (
        <div className={`relative group ${getContentBackground()} rounded-xl p-4 text-sm font-mono overflow-x-auto max-h-[60vh]`}>
          <AudioPlayer audioUrl={content} fileName={item.name} />
        </div>
      );
    }

    if (item?.type === 'video' && content) {
      console.log('Rendering video player with URL:', content);
      return (
        <div className={`relative group ${getContentBackground()} rounded-xl p-4 text-sm font-mono overflow-x-auto max-h-[60vh]`}>
          <VideoPlayer videoUrl={content} fileName={item.name} />
        </div>
      );
    }

    console.log('No preview available for item type:', item?.type);
    return <div className={`text-center ${getSecondaryTextColor()} p-8`}>No preview available for this file type.</div>
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