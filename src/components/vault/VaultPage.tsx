import { useState, useEffect, Fragment } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSearchParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ItemList } from './ItemList';
import { VaultItem, RawBackendItem, Breadcrumb } from '../../types';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon, ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';
import { sortOptions } from '../../utils/constants';
import { getSimplifiedType } from '../../utils/helpers';
import { AddItemModal } from './AddItemModal';
import { useTheme } from '../../hooks/useTheme';
import { RecyclingBin } from './RecyclingBin';
import { useAuth } from '../../hooks/useAuth';

// custom hook for debounced search (no spam allowed)
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface VaultPageProps {
  showRecyclingBin?: boolean;
}

export function VaultPage({ showRecyclingBin = false }: VaultPageProps) {
  const [searchParams] = useSearchParams();
  const [allItems, setAllItems] = useState<VaultItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState(sortOptions[0]);
  const [addType] = useState<'text' | 'key' | 'image' | 'video' | 'audio'>('text');

  const debouncedSearchQuery = useDebounce(searchTerm, 300);

  const [vaultView, setVaultView] = useState(() => localStorage.getItem('vaultView') || 'grid');

  // pagination state (because we can't show everything at once)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // show 50 items per page (not too greedy)
  const { logout } = useAuth();
  const { theme, themeVersion } = useTheme();

  const getBackgroundColor = () => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-b from-gray-50 to-gray-100';
      case 'dark':
        return 'bg-gradient-to-b from-gray-900 to-black';
      default:
        return 'bg-gradient-to-b from-gray-900 to-black';
    }
  };

  const getOverlayBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-b from-gray-50/90 to-gray-50/70';
      case 'dark':
        return 'bg-gradient-to-b from-gray-900/90 to-gray-900/70';
      default:
        return 'bg-gradient-to-b from-gray-900/90 to-gray-900/70';
    }
  };

  const getBorderColor = () => {
    switch (theme) {
      case 'light':
        return 'border-gray-200';
      case 'dark':
        return 'border-gray-700';
      default:
        return 'border-gray-700';
    }
  };

  const getTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-900';
      case 'dark':
        return 'text-gray-100';
      default:
        return 'text-gray-100';
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
        return 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';
      case 'dark':
        return 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400';
      default:
        return 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400';
    }
  };

  const getButtonBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200 hover:bg-gray-300 border-gray-400 text-gray-800';
      case 'dark':
        return 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300';
      default:
        return 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300';
    }
  };

  const fetchAllItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Loading all items...');
      const fetchedItemsRaw = await invoke<RawBackendItem[]>('get_all_vault_items');
      console.log('Raw items from backend:', fetchedItemsRaw);
      const transformedItems: VaultItem[] = fetchedItemsRaw.map(rawItem => ({
        ...rawItem,
        item_type: rawItem.type,
        folder_type: rawItem.folder_type,
        type: getSimplifiedType(rawItem),
        created_at: new Date(rawItem.created_at).getTime(),
        updated_at: new Date(rawItem.updated_at).getTime(),
        deleted_at: rawItem.deleted_at ? new Date(rawItem.deleted_at).getTime() : null,
      }));
      console.log('Transformed items:', transformedItems);
      setAllItems(transformedItems);
    } catch (err) {
      console.error('Error loading all items:', err);
      setError('Failed to load vault items.');
    } finally {
        setIsLoading(false);
    }
  };

  // folders first is absolutely crucial, not dumb. luke, don't fuck this up. (I've not - luke)
  const sortItems = (items: VaultItem[]) => {
    const folders = items.filter(i => i.type === 'folder');
    const files = items.filter(i => i.type !== 'folder');
    const sortFn = (a: VaultItem, b: VaultItem) => {
      switch (sortOrder.value) {
        case 'NameAsc':
          return a.name.localeCompare(b.name);
        case 'NameDesc':
          return b.name.localeCompare(a.name);
        case 'CreatedAtAsc':
          return a.created_at - b.created_at;
        case 'CreatedAtDesc':
          return b.created_at - a.created_at;
        case 'UpdatedAtAsc':
          return a.updated_at - b.updated_at;
        case 'UpdatedAtDesc':
          return b.updated_at - a.updated_at;
        default:
          return 0;
      }
    };
    return [...folders.sort(sortFn), ...files.sort(sortFn)];
  };

  const handleFolderClick = (folder: VaultItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  // go back home you fucking idiot
  const handleHomeClick = () => {
    setCurrentFolderId(null);
    setBreadcrumbs([]);
  };

  const handleBreadcrumbClick = (breadcrumbIndex: number) => {
    setCurrentFolderId(breadcrumbs[breadcrumbIndex].id);
    setBreadcrumbs(breadcrumbs.slice(0, breadcrumbIndex + 1));
  };

  const handleViewChange = (newView: string) => {
    setVaultView(newView);
    localStorage.setItem('vaultView', newView);
  };

  const handleItemsChange = async () => {
    console.log('handleItemsChange called - refreshing items');
    await fetchAllItems();
  };

  // in-memory delete handler (bye bye item)
  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_item', { id }); // call backend to  make that shit disappear jake you fucking retard (sorry - jake)
      await fetchAllItems(); // reload items from backend refresh that shit
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };

  const handleRestore = async (id: string, includeContents: boolean) => {
    try {
        const itemToRestore = allItems.find(item => item.id === id);
        if (!itemToRestore) {
            console.error('Item to restore not found');
            return;
        }

        await invoke('restore_item_to_root', { id });

        if (itemToRestore.type === 'folder' && includeContents) {
            const descendantsToRestore = new Set<string>();
            const getDescendants = (folderId: string) => {
                const children = allItems.filter(i => i.parent_id === folderId && i.deleted_at);
                for (const child of children) {
                    descendantsToRestore.add(child.id);
                    if (child.type === 'folder') {
                        getDescendants(child.id);
                    }
                }
            };
            getDescendants(id);
            
            if (descendantsToRestore.size > 0) {
                await Promise.all(
                    Array.from(descendantsToRestore).map(itemId => invoke('restore_item', { id: itemId }))
                );
            }
        }

        await fetchAllItems();
    } catch (err) {
        console.error('Error restoring item:', err);
        setError('Failed to restore item');
    }
  };

  const handlePermanentlyDelete = async (id: string) => {
    try {
        await invoke('permanently_delete_item', { id });
        await fetchAllItems();
    } catch (err) {
        console.error('Error permanently deleting item:', err);
        setError('Failed to permanently delete item');
    }
  };

  const handleClearAll = async () => {
    try {
        await invoke('permanently_delete_all_items');
        await fetchAllItems();
    } catch (err) {
        console.error('Error clearing all items:', err);
        setError('Failed to clear all items');
    }
  };

  useEffect(() => {
    fetchAllItems();
  }, []);
  
  useEffect(() => {
    const newFilteredItems = allItems.filter(item => {
        if (showRecyclingBin) {
          return !!item.deleted_at;
        } else {
          if (item.deleted_at) return false;
        }

        if (currentFolderId && item.parent_id !== currentFolderId) return false;
        if (!currentFolderId && item.parent_id !== null) return false;
        
        if (selectedType !== 'all') {
          if (item.item_type === 'folder') {
            if (item.folder_type && item.folder_type !== selectedType) {
              return false;
            }
          } else {
            if (item.type !== selectedType) return false;
          }
        }
        
        if (debouncedSearchQuery.trim() !== '') {
          const q = debouncedSearchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            (item.tags && item.tags.some(tag => tag.toLowerCase().includes(q)))
          );
        }
        return true;
      });

      setFilteredItems(sortItems(newFilteredItems));

  }, [allItems, selectedType, sortOrder, currentFolderId, debouncedSearchQuery, showRecyclingBin]);

  useEffect(() => {
    if (showRecyclingBin) {
      setCurrentFolderId(null);
      setBreadcrumbs([]);
      setSelectedType('recycling-bin');
      setSearchTerm('');
    } else if (selectedType === 'recycling-bin') {
      setSelectedType('all');
    }
  }, [showRecyclingBin]);

  useEffect(() => {
    const handleStorageChange = () => {
      console.log('Storage changed, reloading items...');
      fetchAllItems();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handle URL search parameters
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
      // Clear the URL parameter after setting the search term
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('search');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    const checkVaultStatus = async () => {
      const unlocked = await invoke('is_vault_unlocked');
      if (!unlocked) {
        await logout();
      }
    };
    checkVaultStatus();
    
    const interval = setInterval(checkVaultStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const getMainTitle = () => {
    if (showRecyclingBin) {
      return 'Recycling Bin';
    }
    if (selectedType === 'all') {
      return currentFolderId ? breadcrumbs[breadcrumbs.length - 1].name : 'All Items';
    }
    const category = categories.find(c => c.id === selectedType);
    return category ? category.name : 'Items';
  };

  // Calculate counts for each category
  const getCategoryCounts = () => {
    const counts = {
      all: allItems.filter(item => !item.deleted_at).length,
      text: allItems.filter(item => !item.deleted_at && item.type === 'text').length,
      image: allItems.filter(item => !item.deleted_at && item.type === 'image').length,
      video: allItems.filter(item => !item.deleted_at && item.type === 'video').length,
      audio: allItems.filter(item => !item.deleted_at && item.type === 'audio').length,
      key: allItems.filter(item => !item.deleted_at && item.type === 'key').length,
    };
    return counts;
  };

  // Get category summary text
  const getCategorySummary = () => {
    if (showRecyclingBin) {
      const deletedCount = allItems.filter(item => item.deleted_at).length;
      return deletedCount > 0 ? `${deletedCount} deleted item${deletedCount === 1 ? '' : 's'}` : 'No deleted items';
    }
    
    const counts = getCategoryCounts();
    
    // If viewing a specific category, show only that count
    if (selectedType !== 'all') {
      const categoryCount = counts[selectedType as keyof typeof counts] || 0;
      const categoryName = categories.find(c => c.id === selectedType)?.name.toLowerCase() || 'items';
      return categoryCount > 0 ? `${categoryCount} ${categoryName}` : `No ${categoryName}`;
    }
    
    // If viewing "All Items", show the breakdown
    const parts = [];
    if (counts.all > 0) parts.push(`${counts.all} total`);
    if (counts.text > 0) parts.push(`${counts.text} text`);
    if (counts.image > 0) parts.push(`${counts.image} images`);
    if (counts.video > 0) parts.push(`${counts.video} videos`);
    if (counts.audio > 0) parts.push(`${counts.audio} audio`);
    if (counts.key > 0) parts.push(`${counts.key} keys`);
    
    return parts.length > 0 ? parts.join(' • ') : 'No items';
  };

  // pagination logic
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const categories = [
    { id: 'text', name: 'Text Files' },
    { id: 'image', name: 'Images' },
    { id: 'video', name: 'Videos' },
    { id: 'audio', name: 'Audio' },
    { id: 'key', name: 'Keys & Tokens' },
  ];

  return (
    <div key={themeVersion} className={`flex h-screen ${getBackgroundColor()} text-gray-800`}>
      <Sidebar
        selectedType={selectedType}
        onTypeSelect={setSelectedType}
        onItemsChange={handleItemsChange}
        currentFolderId={currentFolderId}
        allItems={allItems}
        onFolderClick={handleFolderClick}
        onHomeClick={handleHomeClick}
      />

      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* top bar */}
          <div className={`sticky top-0 z-10 flex flex-col justify-center h-20 px-4 sm:px-6 md:px-8 ${getOverlayBackground()} backdrop-blur-sm border-b ${getBorderColor()}`}>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <h1 className={`text-xl font-semibold ${getTextColor()}`}>
                    {getMainTitle()}
                  </h1>
                  <p className={`text-sm ${getSecondaryTextColor()}`}>
                    {getCategorySummary()}
                  </p>
                </div>
                {!showRecyclingBin && currentFolderId && (
                  <span className={`text-sm ${getSecondaryTextColor()}`}>
                    {breadcrumbs.length > 1 ? `${breadcrumbs.length - 1} levels deep` : ''}
                  </span>
                )}
              </div>
              
              {/* breadcrumb navigation */}
              {!showRecyclingBin && (
                <div className="flex items-center space-x-1">
                  <nav aria-label="Breadcrumb" className="flex-1 overflow-auto text-sm text-right">
                    <ol className={`inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse ${getSecondaryTextColor()}`}>
                      <li>
                        <div className="flex items-center">
                          <button
                            onClick={handleHomeClick}
                            className={`breadcrumb-button inline-flex items-center font-medium ${getTextColor()} opacity-70 hover:opacity-100 transition-opacity duration-200 focus:outline-none focus-visible:ring-0 border border-transparent`}
                          >
                            <HomeIcon className="w-4 h-4 mr-1.5" />
                            Home
                          </button>
                        </div>
                      </li>
                      {breadcrumbs.map((breadcrumb, index) => (
                        <li key={breadcrumb.id}>
                          <div className="flex items-center">
                            <ChevronRightIcon className="w-4 h-4 mx-1" />
                            <button
                              onClick={() => handleBreadcrumbClick(index)}
                              className={`breadcrumb-button inline-flex items-center font-medium ${getTextColor()} opacity-70 hover:opacity-100 transition-opacity duration-200 focus:outline-none focus-visible:ring-0 border border-transparent`}
                            >
                              {breadcrumb.name}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </div>
              )}
            </div>
          </div>

          {/* search bar */}
          {!showRecyclingBin && (
            <section className={`w-full flex justify-center ${getOverlayBackground()} py-4 border-b ${getBorderColor()}`} style={{ zIndex: 1, position: 'relative' }}>
              <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center gap-4 px-4">
                {/* Search Input with search icon */}
                <div className="flex-1 min-w-[180px] max-w-xl relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className={`h-5 w-5 ${getSecondaryTextColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search items and tags..."
                    className={`w-full pl-10 pr-3 py-2 ${getInputBackground()} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors`}
                  />
                </div>
                
                {/* view Switch with color-coded icons */}
                <div className={`flex items-center ${getButtonBackground()} rounded-lg p-1`}>
                  <button
                    onClick={() => handleViewChange('grid')}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      vaultView === 'grid'
                        ? 'bg-indigo-500/30 text-indigo-300'
                        : `${getSecondaryTextColor()} hover:text-indigo-300`
                    }`}
                    title="Grid View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleViewChange('list')}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      vaultView === 'list'
                        ? 'bg-indigo-500/30 text-indigo-300'
                        : `${getSecondaryTextColor()} hover:text-indigo-300`
                    }`}
                    title="List View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
                
                {/* filter dropdown with color-coded icon */}
                <div className="flex-shrink-0 w-full sm:w-48">
                  <Listbox value={sortOrder} onChange={setSortOrder}>
                    {({ open }) => (
                      <div className="relative w-full">
                        <Listbox.Button className={`relative w-full cursor-default rounded-lg ${getButtonBackground()} py-2 pl-3 pr-10 text-left text-sm focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800`}>
                          <div className="flex items-center">
                            <svg className={`h-4 w-4 mr-2 ${getSecondaryTextColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                            <span className={`block truncate ${getTextColor()}`}>{sortOrder.label}</span>
                          </div>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDownIcon
                              className={`h-5 w-5 ${getSecondaryTextColor()} transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                              aria-hidden="true"
                            />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className={`absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md ${getButtonBackground()} py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm border ${getBorderColor()}`}>
                            {sortOptions.map((option, optionIdx) => (
                              <Listbox.Option
                                key={optionIdx}
                                className={({ active }) =>
                                  `relative cursor-pointer select-none py-2 px-4 ${
                                    active ? "bg-indigo-600/50 text-white" : getTextColor()
                                  }`
                                }
                                value={option}
                              >
                                {({ selected }) => (
                                  <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>{option.label}</span>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    )}
                  </Listbox>
                </div>
                
                {/* refresh button with color-coded icon */}
                <button
                  onClick={fetchAllItems}
                  disabled={isLoading}
                  className={`p-2 ${getButtonBackground()} rounded-lg ${getSecondaryTextColor()} hover:text-indigo-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
                  title="Refresh"
                >
                  <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </section>
          )}

          <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
            {isLoading && filteredItems.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <p className={`${getSecondaryTextColor()}`}>Loading items...</p>
              </div>
            ) : showRecyclingBin ? (
              <RecyclingBin
                items={allItems.filter(i => i.deleted_at)}
                allItems={allItems}
                onRestore={handleRestore}
                onPermanentlyDelete={handlePermanentlyDelete}
                onClearAll={handleClearAll}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <>
                <ItemList
                  items={currentItems}
                  onItemsChange={fetchAllItems}
                  onDelete={handleDelete}
                  isLoading={isLoading}
                  error={error}
                  view={vaultView}
                  onFolderClick={handleFolderClick}
                  allItems={allItems}
                />
                
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-6">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 ${getButtonBackground()} rounded-lg ${getSecondaryTextColor()} hover:text-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                              currentPage === pageNum
                                ? 'bg-indigo-600 text-white'
                                : `${getButtonBackground()} ${getSecondaryTextColor()} hover:text-gray-300`
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      <span className={`text-sm ${getSecondaryTextColor()}`}>Go to:</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        defaultValue={currentPage}
                        onChange={e => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= totalPages) {
                            handlePageChange(value);
                          }
                        }}
                        className={`w-16 px-2 py-1 ${getInputBackground()} rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                        placeholder={currentPage.toString()}
                      />
                      <span className={`text-sm ${getSecondaryTextColor()}`}>of {totalPages}</span>
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 ${getButtonBackground()} rounded-lg ${getSecondaryTextColor()} hover:text-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <AddItemModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            type={addType}
            onSuccess={handleItemsChange}
            parentId={currentFolderId}
          />
        </main>
      </div>
    </div>
  );
}

// const categories = [
//     { id: 'text', name: 'Text Files' },
//     { id: 'image', name: 'Images' },
//     { id: 'video', name: 'Videos' },
//     { id: 'audio', name: 'Audio' },
//     { id: 'key', name: 'Keys & Tokens' },
// ];