import { useState, useEffect, Fragment } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './Sidebar';
import { ItemList } from './ItemList';
import { VaultItem, RawBackendItem, Breadcrumb } from '../../types';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon, ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';
import { sortOptions } from '../../utils/constants';
import { getSimplifiedType } from '../../utils/helpers';
import { AddItemModal } from './AddItemModal';
import { useTheme } from '../../hooks/useTheme';

// custom hook for debounced search (no spam allowed, you patient bastard!)
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

export function VaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState(sortOptions[0]);
  const [addType] = useState<'text' | 'key' | 'image' | 'video' | 'audio'>('text');

  // debounced search to prevent excessive api calls (be nice to the server, you asshole!)
  const debouncedSearchQuery = useDebounce(searchTerm, 300);

  const [vaultView, setVaultView] = useState(() => localStorage.getItem('vaultView') || 'grid');

  // pagination state (because we can't show everything at once, you greedy bastard!)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // show 50 items per page (not too greedy, you reasonable bastard!)
  const [totalItems, setTotalItems] = useState(0);

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

  const loadAllItems = async () => {
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
      }));
      console.log('Transformed items:', transformedItems);
      return transformedItems;
    } catch (err) {
      console.error('Error loading all items:', err);
      return [];
    }
  };

  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('loadItems called with filters:', { currentFolderId, selectedType, debouncedSearchQuery });
      const allItemsData = await loadAllItems();
      // only filter for display, do not call get_vault_items again because we're not fucking stupid
      // add this log to inspect the field names debugging is a bitch
      console.log('All items:', allItemsData);
      const filteredItems = allItemsData.filter(item => {
        if (currentFolderId && item.parent_id !== currentFolderId) return false;
        if (!currentFolderId && item.parent_id !== null) return false;
        
        // handle folder filtering based on folder_type folders are special little snowflakes
        if (selectedType !== 'all') {
          if (item.item_type === 'folder') {
            // for folders, check if they have a folder_type that matches the selected type folder logic is fucking complicated
            if (item.folder_type && item.folder_type !== selectedType) {
              return false;
            }
          } else {
            // for non-folders, use the regular type filtering the normal shit
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
      console.log('Filtered items:', filteredItems);
      setItems(filteredItems);
      setTotalItems(filteredItems.length);
    } catch (err: any) {
      console.error('Error loading items:', err);
      const errorMessage = err.message ? `${err.message}\n${err.stack}` : String(err);
      setError(`Failed to load items. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folder: VaultItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
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
    setIsLoading(true);
    try {
      await loadAllItems();
      await loadItems();
      console.log('handleItemsChange completed successfully');
    } finally {
      setIsLoading(false);
    }
  };

  // in-memory delete handler (bye bye item, you destructive bastard!)
  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_item', { id }); // call backend to  make that shit disappear jake you fucking retard
      await handleItemsChange(); // reload items from backend refresh that shit
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };

  useEffect(() => {
    loadAllItems();
  }, []);

  useEffect(() => {
    loadItems();
  }, [selectedType, sortOrder, currentFolderId, debouncedSearchQuery]);

  useEffect(() => {
    const handleStorageChange = () => {
        setVaultView(localStorage.getItem('vaultView') || 'grid');
        const savedSort = localStorage.getItem('sortOrder');
        const newSortOrder = sortOptions.find(o => o.value === savedSort) || sortOptions[0];
        setSortOrder(newSortOrder);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // monitor vault status (keep an eye on that vault, you paranoid bastard!)
  useEffect(() => {
    const checkVaultStatus = async () => {
      try {
        const status = await invoke('get_vault_status');
        console.log('Vault status:', status);
      } catch (err) {
        console.error('Error checking vault status:', err);
      }
    };
    
    checkVaultStatus();
  }, []);

  // breaking something
  /*const getVaultTitle = () => {
    if (breadcrumbs.length > 1) {
        return breadcrumbs[breadcrumbs.length - 1].name;
    }
    return selectedType === 'all'
        ? 'Vault'
        : `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Vault`;
  };*/

  const getMainTitle = () => {
    if (currentFolderId) {
      return 'Folder';
    }
    
    // convert selectedType to proper display name make it look pretty, you perfectionist bastard
    switch (selectedType) {
      case 'all':
        return 'All Items';
      case 'text':
        return 'Text Files';
      case 'key':
        return 'Keys & Tokens';
      case 'image':
        return 'Images';
      case 'video':
        return 'Videos';
      case 'audio':
        return 'Audio Files';
      case 'folder':
        return 'Folders';
      default:
        return selectedType.charAt(0).toUpperCase() + selectedType.slice(1);
    }
  };

  // page logic (math is fun, you nerd bastard!)
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  // scroll to top when changing pages (because scrolling is so last year, you lazy bastard)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    // allow empty input for typing because users are fucking stupid
    if (page === 0) {
      setCurrentPage(1);
      return;
    }
    
    // reset to current page if invalid don't let them break shit
    if (page > totalPages) {
      setCurrentPage(totalPages);
      return;
    }
    
    setCurrentPage(page);
  };

  // reset to first page when filters change because fuck you, that's why
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, currentFolderId, debouncedSearchQuery]);

  return (
    <div key={themeVersion} className={`flex h-screen ${getBackgroundColor()}`}>
      <div className="relative">
        <Sidebar
          selectedType={selectedType || 'all'}
          onTypeSelect={setSelectedType}
          onItemsChange={handleItemsChange}
          currentFolderId={currentFolderId}
        />
        <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-gray-700/50 to-transparent"></div>
      </div>

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* top bar */}
        <div className={`sticky top-0 z-10 flex flex-col justify-center h-20 px-4 sm:px-6 md:px-8 ${getOverlayBackground()} backdrop-blur-sm border-b ${getBorderColor()}`}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className={`text-xl font-semibold ${getTextColor()}`}>
                {getMainTitle()}
              </h1>
              {currentFolderId && (
                <span className={`text-sm ${getSecondaryTextColor()}`}>
                  {breadcrumbs.length > 1 ? `${breadcrumbs.length - 1} levels deep` : ''}
                </span>
              )}
            </div>
            
            {/* breadcrumb navigation */}
            <div className="flex items-center space-x-1">
              {breadcrumbs.map((breadcrumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRightIcon className={`h-4 w-4 mx-1 ${getSecondaryTextColor()}`} />
                  )}
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
                      index === breadcrumbs.length - 1
                        ? `${getTextColor()} font-medium`
                        : `${getSecondaryTextColor()} hover:${getTextColor()} hover:bg-gray-700/50`
                    }`}
                  >
                    {index === 0 ? (
                      <HomeIcon className="h-4 w-4" />
                    ) : null}
                    <span className="text-sm">{breadcrumb.name}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* search bar */}
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
              onClick={loadItems}
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

        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <ItemList
            items={currentItems}
            onItemsChange={loadItems}
            onDelete={handleDelete}
            isLoading={isLoading}
            error={error}
            view={vaultView}
            onFolderClick={handleFolderClick}
          />
          
          {/* I'm a genius nigga -luke */}
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
              
              {/* page number type in this */}
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
  );
}