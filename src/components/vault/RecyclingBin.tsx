import { VaultItem } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { typeIcons } from '../../utils/constants';
import { getItemPath } from '../../utils/helpers';
import { CubeTransparentIcon, ArrowUturnLeftIcon, TrashIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { PermanentDeleteConfirmationModal } from './PermanentDeleteConfirmationModal';
import { RestoreConfirmationModal } from './RestoreConfirmationModal';
import { ClearAllConfirmationModal } from './ClearAllConfirmationModal';

function DeletedItemCard({ item, allItems, onRestore, onPermanentlyDelete }: { item: VaultItem, allItems: VaultItem[], onRestore: (item: VaultItem) => void, onPermanentlyDelete: (item: VaultItem) => void }) {
    const { theme } = useTheme();
    const Icon = typeIcons[item.type] || CubeTransparentIcon;

    const getCardBackground = () => {
        return theme === 'light' ? 'bg-gray-50/70 border-gray-200/80' : 'bg-gray-800/40 border-gray-700/40';
    };

    const getTextColor = () => {
        return theme === 'light' ? 'text-gray-800' : 'text-gray-200';
    };
    
    const getSecondaryTextColor = () => {
        return theme === 'light' ? 'text-gray-500' : 'text-gray-400';
    };

    return (
        <div className={`rounded-lg p-3 flex items-center justify-between border ${getCardBackground()}`}>
            <div className="flex items-center space-x-3">
                <Icon className={`h-5 w-5 ${getSecondaryTextColor()}`} />
                <div>
                    <p className={`font-medium ${getTextColor()}`}>{item.name}</p>
                    <p className={`text-xs ${getSecondaryTextColor()}`}>
                        Type: {item.type} | Deleted: {new Date(item.deleted_at!).toLocaleDateString()}
                    </p>
                    <p className={`text-xs ${getSecondaryTextColor()} italic`}>
                        Original location: {getItemPath(item, allItems)}
                    </p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onRestore(item)}
                    className="p-1.5 text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/40 rounded-md transition-colors"
                    title="Restore"
                >
                    <ArrowUturnLeftIcon className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onPermanentlyDelete(item)}
                    className="p-1.5 text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 rounded-md transition-colors"
                    title="Permanently Delete"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function DeletedFolderCard({ item, allItems, onRestore, onPermanentlyDelete, onPermanentlyDeleteFolder }: { item: VaultItem, allItems: VaultItem[], onRestore: (item: VaultItem) => void, onPermanentlyDelete: (item: VaultItem) => void, onPermanentlyDeleteFolder: (item: VaultItem) => void }) {
    const { theme } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    const Icon = typeIcons[item.type] || CubeTransparentIcon;

    const children = allItems.filter(child => child.parent_id === item.id);
    const sortedChildren = [...children].sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return 1;
        if (a.type !== 'folder' && b.type === 'folder') return -1;
        return 0;
    });

    const hasChildren = children.length > 0;

    const getCardBackground = () => {
        return theme === 'light' ? 'bg-gray-50/70 border-gray-200/80' : 'bg-gray-800/40 border-gray-700/40';
    };

    const getNestedAreaBackground = () => {
        return theme === 'light' ? 'bg-gray-50/30' : 'bg-gray-900/20';
    }

    const getTextColor = () => {
        return theme === 'light' ? 'text-gray-800' : 'text-gray-200';
    };
    
    const getSecondaryTextColor = () => {
        return theme === 'light' ? 'text-gray-500' : 'text-gray-400';
    };

    const handleRestore = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRestore(item);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPermanentlyDeleteFolder(item);
    };

    const handleExpand = () => {
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <div className={`rounded-lg border ${getCardBackground()}`}>
            <div 
                className={`p-3 flex items-center justify-between ${hasChildren ? 'cursor-pointer hover:bg-gray-500/10' : ''}`} 
                onClick={handleExpand}
            >
                <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${getSecondaryTextColor()}`} />
                    <div>
                        <p className={`font-medium ${getTextColor()}`}>{item.name}</p>
                        <p className={`text-xs ${getSecondaryTextColor()}`}>
                            {children.length} items | Deleted: {new Date(item.deleted_at!).toLocaleDateString()}
                        </p>
                        <p className={`text-xs ${getSecondaryTextColor()} italic`}>
                            Original location: {getItemPath(item, allItems)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {hasChildren ? (
                        <ChevronRightIcon className={`h-5 w-5 ${getSecondaryTextColor()} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    ) : (
                        <div className="h-5 w-5" /> // Placeholder for alignment
                    )}
                    <button
                        onClick={handleRestore}
                        className="p-1.5 text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/40 rounded-md transition-colors"
                        title="Restore"
                    >
                        <ArrowUturnLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 rounded-md transition-colors"
                        title="Permanently Delete"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
            {isExpanded && hasChildren && (
                <div className={`pl-8 pr-3 pb-3 space-y-2 pt-3 border-t border-gray-500/20 ${getNestedAreaBackground()}`}>
                    {sortedChildren.map(child => (
                        child.type === 'folder' ? (
                            <DeletedFolderCard
                                key={child.id}
                                item={child}
                                allItems={allItems}
                                onRestore={onRestore}
                                onPermanentlyDelete={onPermanentlyDelete}
                                onPermanentlyDeleteFolder={onPermanentlyDeleteFolder}
                            />
                        ) : (
                            <DeletedItemCard 
                                key={child.id} 
                                item={child}
                                allItems={allItems} 
                                onRestore={onRestore} 
                                onPermanentlyDelete={onPermanentlyDelete}
                            />
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

interface RecyclingBinProps {
  items: VaultItem[];
  allItems: VaultItem[];
    onRestore: (id: string, includeContents: boolean) => Promise<void>;
    onPermanentlyDelete: (id: string) => Promise<void>;
    onClearAll: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function RecyclingBin({ items, allItems, onRestore, onPermanentlyDelete, onClearAll, isLoading, error }: RecyclingBinProps) {
    const { theme } = useTheme();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
    const [isFolder, setIsFolder] = useState(false);

    const handleDeleteClick = (item: VaultItem) => {
        setSelectedItem(item);
        setIsDeleteModalOpen(true);
        setIsFolder(false);
    };

    const handleRestoreClick = (item: VaultItem) => {
        setSelectedItem(item);
        setIsRestoreModalOpen(true);
        setIsFolder(item.type === 'folder');
    };

    const handleDeleteFolderClick = (item: VaultItem) => {
        setSelectedItem(item);
        setIsDeleteModalOpen(true);
        setIsFolder(true);
    }

    const confirmPermanentlyDelete = async () => {
        if (selectedItem) {
            await onPermanentlyDelete(selectedItem.id);
            setIsDeleteModalOpen(false);
            setSelectedItem(null);
        }
    };

    const confirmRestore = async (includeContents: boolean) => {
        if (selectedItem) {
            await onRestore(selectedItem.id, includeContents);
            setIsRestoreModalOpen(false);
            setSelectedItem(null);
        }
    };

    const confirmClearAll = async () => {
        await onClearAll();
        setIsClearAllModalOpen(false);
    };

    const getTextColor = () => {
        return theme === 'light' ? 'text-gray-600' : 'text-gray-400';
    };

    const getBorderColor = () => {
        return theme === 'light' ? 'border-gray-200' : 'border-gray-700';
    };

    if (isLoading) {
        return <div className={`text-center p-8 ${getTextColor()}`}>Loading...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-400">{error}</div>;
    }

    const deletedItemIds = new Set(items.map(i => i.id));
    const topLevelItems = items.filter(item => !item.parent_id || !deletedItemIds.has(item.parent_id));

    return (
        <>
            {items.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-[50vh] text-center ${getBorderColor()} rounded-xl`}>
                    <CubeTransparentIcon className={`h-16 w-16 ${getTextColor()} mb-4`} />
                    <h3 className={`text-lg font-semibold ${getTextColor()}`}>Recycling Bin is Empty</h3>
                    <p className={`text-sm ${getTextColor()} mt-1`}>
                        Deleted items will appear here.
                    </p>
                </div>
            ) : (
                <>
                    {/* Clear All Button */}
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setIsClearAllModalOpen(true)}
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-400 bg-red-900/20 border border-red-600/50 rounded-lg hover:bg-red-900/40 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors"
                        >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Clear All ({items.length})
                        </button>
                    </div>

                    <div className="space-y-4">
                        {topLevelItems.map(item => (
                        item.type === 'folder' ? (
                            <DeletedFolderCard
                                key={item.id}
                                item={item}
                                allItems={allItems}
                                onRestore={handleRestoreClick}
                                onPermanentlyDelete={handleDeleteClick}
                                onPermanentlyDeleteFolder={handleDeleteFolderClick}
                            />
                        ) : (
                            <DeletedItemCard 
                                key={item.id} 
                                item={item}
                                allItems={allItems} 
                                onRestore={handleRestoreClick} 
                                onPermanentlyDelete={handleDeleteClick} 
                            />
                        )
                        ))}
                    </div>
                </>
            )}

            {selectedItem && (
                 <PermanentDeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmPermanentlyDelete}
                    itemName={selectedItem.name}
                    isLoading={isLoading}
                    isFolder={isFolder}
                 />
            )}

            {selectedItem && (
                <RestoreConfirmationModal
                    isOpen={isRestoreModalOpen}
                    onClose={() => setIsRestoreModalOpen(false)}
                    onConfirm={confirmRestore}
                    itemName={selectedItem.name}
                    isLoading={isLoading}
                    isFolder={isFolder}
                />
            )}

            <ClearAllConfirmationModal
                isOpen={isClearAllModalOpen}
                onClose={() => setIsClearAllModalOpen(false)}
                onConfirm={confirmClearAll}
                itemCount={items.length}
                isLoading={isLoading}
            />
        </>
    );
}