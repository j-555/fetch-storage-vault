import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  FolderIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { ItemDetailsModal } from './ItemDetailsModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal'; 
import { VaultItem } from '../../types';
import { typeIcons } from '../../utils/constants';
import { getExtensionFromMime, cleanUrlForDisplay } from '../../utils/helpers';
import { useTheme } from '../../hooks/useTheme';
import { AddItemModal } from './AddItemModal';

interface ItemCardProps {
  item: VaultItem;
  onDelete: () => Promise<void>;
  onFolderClick: (item: VaultItem) => void;
  onItemUpdated: () => Promise<void>;
}

export function ItemCard({ item, onDelete, onFolderClick, onItemUpdated }: ItemCardProps) {
  const { theme, themeVersion } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // prevent default drag behavior globally because browsers are fucking stupid
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('dragover', preventDefault);
    document.addEventListener('drop', preventDefault);

    return () => {
      document.removeEventListener('dragover', preventDefault);
      document.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleCardClick = () => {
    if (item.type === 'folder') {
      onFolderClick(item);
    } else {
      setIsDetailsOpen(true);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localStorage.getItem('requireKeyOnAccess') === 'true') {
        setIsDetailsOpen(true);
        return;
    }
    try {
      const result = await invoke<number[]>('get_item_content', { id: item.id });
      const blob = new Blob([new Uint8Array(result)], { type: item.item_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // use getextensionfrommime to determine download filename because file extensions are fucking important
      const extension = getExtensionFromMime(item.item_type);
      a.download = `${item.name}.${extension}`; // ensure proper extension on download don't fuck up the file type jake you absolute muppet
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download item');
      console.error('Error downloading item:', err);
    }
  };

  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await invoke('delete_item', { id: item.id });
      await onDelete();
      setIsDeleteModalOpen(false);
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error deleting item:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const handleEdit = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent the click from bubbling up to the card because event bubbling is a fucking nightmare
    
    try {
      if (item.type === 'text' || item.type === 'key') {
        // for text and key items, fetch the content first because we need that shit
        console.log('Fetching content for item:', item.id, 'type:', item.type);
        
        const contentBytes = await invoke<number[]>('get_item_content', { id: item.id });
        console.log('Received content bytes:', contentBytes);
        
        // convert binary content to string because binary is fucking useless to humans
        const content = new TextDecoder().decode(new Uint8Array(contentBytes));
        console.log('Decoded content:', content);
        
        // create an editing item with the content make that shit editable
        const editingItem: any = {
          ...item,
          content,
        };
        
        console.log('Created editing item:', editingItem);
        
        // store it temporarily and open modal because modals are fucking cool
        setEditingItem(editingItem);
        setIsEditModalOpen(true);
      } else {
        // for other items, just open the modal because not everything needs content
        console.log('Opening edit modal for non-text item:', item);
        setEditingItem(item);
        setIsEditModalOpen(true);
      }
    } catch (err) {
      console.error('Error in handleEdit:', err);
      setError('Failed to load item content for editing. Please try again.');
      // don't open the modal if there's an error because fuck that shit
      setEditingItem(null);
      setIsEditModalOpen(false);
    }
  };

  // drag and drop handlers for folders because folders are special little snowflakes
  const handleDragStart = (e: React.DragEvent) => {
    // prevent text selection when dragging because text selection is fucking annoying
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (item.type === 'folder') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (item.type === 'folder') {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (item.type === 'folder') {
      e.preventDefault();
      e.stopPropagation();
      // only set drag over to false if we're leaving the element entirely because drag events are fucking weird
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (item.type !== 'folder') return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      for (const file of files) {
        console.log('Uploading file:', file.name, 'to folder:', item.name);
        
        // read the file content and create a text item or file item based on type because file types matter
        const reader = new FileReader();
        
        await new Promise<void>((resolve, reject) => {
          reader.onload = async (event) => {
            try {
              const content = event.target?.result as string;
              
              // determine the item type based on file type because we're not fucking stupid
              let itemType: string;
              if (file.type.startsWith('text/') || file.type === 'application/json') {
                itemType = 'text';
              } else if (file.type.startsWith('image/')) {
                itemType = 'image';
              } else if (file.type.startsWith('video/')) {
                itemType = 'video';
              } else if (file.type.startsWith('audio/')) {
                itemType = 'audio';
              } else {
                itemType = 'file';
              }

              // for text files, create a text item because text is fucking simple
              if (itemType === 'text') {
                await invoke('add_text_item', {
                  name: file.name,
                  content: content,
                  parentId: item.id,
                  tags: []
                });
              } else {
                // for binary files, we need to handle them differently because binary is fucking complicated
                // for now, create a text item with base64 content because fuck it, that's why
                const base64Content = btoa(content);
                await invoke('add_text_item', {
                  name: file.name,
                  content: base64Content,
                  parentId: item.id,
                  tags: []
                });
              }
              
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });
      }
      
      await onItemUpdated();
    } catch (err) {
      console.error('Error uploading files:', err);
      setError('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const getCardBackground = () => {
    if (isDragOver && item.type === 'folder') {
      return theme === 'light' ? 'bg-green-100 border-green-400' : 'bg-green-900/30 border-green-500';
    }
    
    switch (theme) {
      case 'light':
        return 'bg-white/80 hover:bg-white';
      case 'dark':
        return 'bg-gray-800/50 hover:bg-gray-800';
      default:
        return 'bg-gray-800/50 hover:bg-gray-800';
    }
  };

  const getBorderColor = () => {
    if (isDragOver && item.type === 'folder') {
      return theme === 'light' ? 'border-green-400' : 'border-green-500';
    }
    
    switch (theme) {
      case 'light':
        return 'border-gray-300 hover:border-gray-400';
      case 'dark':
        return 'border-gray-700/50 hover:border-gray-600/50';
      default:
        return 'border-gray-700/50 hover:border-gray-600/50';
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

  const getButtonBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200/50 hover:bg-gray-200';
      case 'dark':
        return 'bg-gray-700/50 hover:bg-gray-700';
      default:
        return 'bg-gray-700/50 hover:bg-gray-700';
    }
  };

  const Icon = typeIcons[item.type] || FolderIcon;
  const isFolder = item.type === 'folder';
  const date = new Date(item.created_at).toLocaleDateString();
  const displayName = cleanUrlForDisplay(item.name);

  return (
    <>
      <div 
        key={themeVersion}
        className={`relative group ${getCardBackground()} backdrop-blur-sm rounded-xl p-4 transition-colors border ${getBorderColor()} cursor-pointer select-none`}
        onClick={handleCardClick}
        onDragStart={handleDragStart}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        draggable={false}
      >
        {/* drag over overlay for folders */}
        {isDragOver && item.type === 'folder' && (
          <div className="absolute inset-0 bg-green-500/10 rounded-xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="text-green-500 font-medium text-sm">Drop files here</div>
              <div className="text-green-400 text-xs">Files will be added to this folder</div>
            </div>
          </div>
        )}
        
        {/* upload indicator */}
        {isUploading && (
          <div className="absolute inset-0 bg-blue-500/10 rounded-xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="text-blue-500 font-medium text-sm">Uploading...</div>
              <div className="text-blue-400 text-xs">Please wait</div>
            </div>
          </div>
        )}
        
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${isFolder ? 'bg-amber-600/20' : 'bg-indigo-600/20'}`}>
            <Icon className={`h-6 w-6 ${isFolder ? 'text-amber-400' : 'text-indigo-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${getTextColor()} truncate`}>{displayName}</p>
              <div className="flex items-center space-x-2 ml-2">
                {!isFolder && (
                    <button
                        onClick={handleDownload}
                        disabled={isLoading}
                        className={`p-1.5 ${getSecondaryTextColor()} hover:text-green-400 ${getButtonBackground()} rounded-lg transition-colors hover:bg-green-500/10`}
                        title="Download"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                )}
                <button
                  onClick={handleEdit}
                  disabled={isLoading}
                  className={`p-1.5 ${getSecondaryTextColor()} hover:text-blue-400 ${getButtonBackground()} rounded-lg transition-colors hover:bg-blue-500/10`}
                  title="Edit"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className={`p-1.5 ${getSecondaryTextColor()} hover:text-red-500 ${getButtonBackground()} rounded-lg transition-colors hover:bg-red-500/10`}
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className={`text-sm ${getSecondaryTextColor()} mt-1`}>{date}</p>
            {isFolder && (
              <div className="flex items-center mt-2">
                <span className={`text-xs ${getSecondaryTextColor()} flex items-center`}>
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Drop files here
                </span>
              </div>
            )}
            {!isFolder && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs border border-indigo-500/20`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-400">{error}</div>
        )}
      </div>

      <ItemDetailsModal
        item={item}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={item.name}
        itemType={item.type}
        isLoading={isLoading}
      />
      <AddItemModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
          setError(null);
        }}
        onSuccess={async () => {
          setIsEditModalOpen(false);
          setEditingItem(null);
          setError(null);
          await onItemUpdated();
        }}
        editingItem={editingItem}
      />
    </>
  );
}