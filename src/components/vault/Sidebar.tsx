import { useState, useEffect } from 'react';
import {
  FolderIcon,
  PhotoIcon,
  MusicalNoteIcon,
  FilmIcon,
  DocumentTextIcon,
  KeyIcon,
  ArrowLeftOnRectangleIcon,
  PlusIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  FolderPlusIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AddItemModal } from './AddItemModal';
import { getVersion } from '@tauri-apps/api/app';
import { AboutModal } from '../shared/AboutModal';
import { AddFolderModal } from './AddFolderModal';
import { CsvImportModal } from './CsvImportModal';
import { useTheme } from '../../hooks/useTheme';
import { VaultItem } from '../../types';

interface SidebarProps {
  selectedType: string;
  onTypeSelect: (type: string) => void;
  onItemsChange: () => Promise<void>;
  currentFolderId: string | null;
  allItems: VaultItem[];
  onFolderClick: (folder: VaultItem) => void;
  onHomeClick: () => void;
}

const categories = [
  { id: 'text', name: 'Text Files', icon: DocumentTextIcon },
  { id: 'image', name: 'Images', icon: PhotoIcon },
  { id: 'video', name: 'Videos', icon: FilmIcon },
  { id: 'audio', name: 'Audio', icon: MusicalNoteIcon },
  { id: 'key', name: 'Keys & Tokens', icon: KeyIcon },
];

export function Sidebar({ selectedType, onTypeSelect, onItemsChange, currentFolderId, allItems, onFolderClick, onHomeClick }: SidebarProps) {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // State for expanded categories - load from localStorage
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('expandedCategories');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    const fetchVersion = async () => {
        const version = await getVersion();
        setAppVersion(version);
    };
    fetchVersion();
  }, []);

  // Save expanded categories to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('expandedCategories', JSON.stringify(Array.from(expandedCategories)));
  }, [expandedCategories]);

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Get folders for a specific category (root level only)
  const getFoldersForCategory = (categoryId: string) => {
    return allItems.filter(item =>
      item.type === 'folder' &&
      !item.deleted_at &&
      item.parent_id === null && // Only root-level folders
      item.folder_type === categoryId
    );
  };

  // Get child folders for a specific parent folder
  const getChildFolders = (parentId: string) => {
    return allItems.filter(item =>
      item.type === 'folder' &&
      !item.deleted_at &&
      item.parent_id === parentId
    );
  };

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      window.location.reload();
    }
  };

  const getSidebarBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-b from-gray-100 to-gray-200';
      case 'dark':
        return 'bg-gradient-to-b from-gray-900 to-black';
      default:
        return 'bg-gradient-to-b from-gray-900 to-black';
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
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getActiveTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-800';
      case 'dark':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  const NavButton = ({ id, name, icon: Icon }: { id: string; name: string; icon: React.ElementType }) => {
    const isActive = id === 'recycling-bin' ? location.pathname === '/recycling-bin' : location.pathname !== '/recycling-bin' && selectedType === id;
    const isExpanded = expandedCategories.has(id);

    // Get all root-level folders for "All Items" dropdown
    const getAllRootFolders = () => {
      return allItems.filter(item =>
        item.type === 'folder' &&
        !item.deleted_at &&
        item.parent_id === null
      );
    };

    const folders = id === 'all' ? getAllRootFolders() : [];
    const hasFolders = folders.length > 0;

    const handleNavClick = () => {
      if (id === 'recycling-bin') {
        navigate('/recycling-bin');
      } else {
        navigate('/');
        onTypeSelect(id);
        // If we're currently inside a folder, go back to home directory
        if (currentFolderId) {
          onHomeClick();
        }
      }
    };

    return (
      <div>
        <button
          onClick={handleNavClick}
          className={`relative w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm group ${
            isActive
              ? `bg-gradient-to-r from-indigo-500/10 via-indigo-500/20 to-transparent ${getActiveTextColor()}`
              : `${getSecondaryTextColor()} hover:${getTextColor()} hover:bg-white/5`
          }`}
        >
          <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1 rounded-r-full bg-indigo-400 transition-all duration-200 ease-in-out ${isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}`} />

          <Icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
              isActive ? 'text-indigo-300' : `${getSecondaryTextColor()} group-hover:text-gray-300`
          }`} />
          <span className="flex-1 text-left transition-colors duration-200">{name}</span>

          {/* Expand/collapse button - only visible if there are folders and it's "All Items" */}
          {hasFolders && id === 'all' && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                toggleCategoryExpansion(id);
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors duration-200 cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 transition-transform duration-200" />
              )}
            </div>
          )}
        </button>

        {/* Nested folders for "All Items" */}
        {isExpanded && hasFolders && id === 'all' && (
          <div className="ml-8 mt-2 space-y-1 border-l border-gray-600/30 pl-4">
            {folders.map((folder) => (
              <NestedFolder
                key={folder.id}
                folder={folder}
                categoryId="all"
                depth={0}
                currentFolderId={currentFolderId}
                onFolderClick={onFolderClick}
                onTypeSelect={onTypeSelect}
                navigate={navigate}
                getChildFolders={getChildFolders}
                getSecondaryTextColor={getSecondaryTextColor}
                expandedCategories={expandedCategories}
                toggleCategoryExpansion={toggleCategoryExpansion}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Recursive component for nested folders
  const NestedFolder = ({
    folder,
    categoryId,
    depth,
    currentFolderId,
    onFolderClick,
    onTypeSelect,
    navigate,
    getChildFolders,
    getSecondaryTextColor,
    expandedCategories,
    toggleCategoryExpansion
  }: {
    folder: VaultItem;
    categoryId: string;
    depth: number;
    currentFolderId: string | null;
    onFolderClick: (folder: VaultItem) => void;
    onTypeSelect: (type: string) => void;
    navigate: (path: string) => void;
    getChildFolders: (parentId: string) => VaultItem[];
    getSecondaryTextColor: () => string;
    expandedCategories: Set<string>;
    toggleCategoryExpansion: (id: string) => void;
  }) => {
    const childFolders = getChildFolders(folder.id);
    const hasChildren = childFolders.length > 0;
    const isExpanded = expandedCategories.has(folder.id);
    const isActive = currentFolderId === folder.id;

    return (
      <div>
        <div className={`relative w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            : `${getSecondaryTextColor()} hover:text-indigo-300 hover:bg-indigo-900/10`
        }`}>
          <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-0.5 rounded-r-full bg-indigo-400 transition-all duration-200 ease-in-out ${isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}`} />

          {/* Main folder button */}
          <button
            onClick={() => {
              if (currentFolderId !== folder.id) {
                navigate('/');
                onTypeSelect(categoryId);
                onFolderClick(folder);
              }
            }}
            disabled={isActive}
            className="flex items-center flex-1 cursor-pointer disabled:cursor-default"
          >
            <FolderIcon className={`h-4 w-4 mr-3 transition-colors duration-200 ${
              isActive ? 'text-indigo-300' : `${getSecondaryTextColor()} group-hover:text-gray-300`
            }`} />
            <span className="transition-colors duration-200">{folder.name}</span>
          </button>

          {/* Expand/collapse button for child folders */}
          {hasChildren && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                toggleCategoryExpansion(folder.id);
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors duration-200 cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-3 w-3 transition-transform duration-200" />
              ) : (
                <ChevronRightIcon className="h-3 w-3 transition-transform duration-200" />
              )}
            </div>
          )}
        </div>

        {/* Recursively render child folders */}
        {isExpanded && hasChildren && (
          <div className={`ml-6 mt-1 space-y-1 border-l border-gray-600/30 pl-4`}>
            {childFolders.map((childFolder) => (
              <NestedFolder
                key={childFolder.id}
                folder={childFolder}
                categoryId={categoryId}
                depth={depth + 1}
                currentFolderId={currentFolderId}
                onFolderClick={onFolderClick}
                onTypeSelect={onTypeSelect}
                navigate={navigate}
                getChildFolders={getChildFolders}
                getSecondaryTextColor={getSecondaryTextColor}
                expandedCategories={expandedCategories}
                toggleCategoryExpansion={toggleCategoryExpansion}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const CategoryButton = ({ id, name, icon: Icon }: { id: string; name: string; icon: React.ElementType }) => {
    const isActive = location.pathname !== '/recycling-bin' && selectedType === id;
    const isExpanded = expandedCategories.has(id);
    const folders = getFoldersForCategory(id);
    const hasFolders = folders.length > 0;

    const handleCategoryClick = () => {
      navigate('/');
      onTypeSelect(id);
      // If we're currently inside a folder, go back to home directory
      if (currentFolderId) {
        onHomeClick();
      }
    };

    return (
      <div>
        <button
          onClick={handleCategoryClick}
          className={`relative w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm group ${
            isActive
              ? `bg-gradient-to-r from-indigo-500/10 via-indigo-500/20 to-transparent ${getActiveTextColor()}`
              : `${getSecondaryTextColor()} hover:${getTextColor()} hover:bg-white/5`
          }`}
        >
          <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1 rounded-r-full bg-indigo-400 transition-all duration-200 ease-in-out ${isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}`} />

          <Icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
              isActive ? 'text-indigo-300' : `${getSecondaryTextColor()} group-hover:text-gray-300`
          }`} />
          <span className="flex-1 text-left transition-colors duration-200">{name}</span>

          {/* Expand/collapse button - only visible if there are folders */}
          {hasFolders && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                toggleCategoryExpansion(id);
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors duration-200 cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 transition-transform duration-200" />
              )}
            </div>
          )}
        </button>

        {/* Nested folders */}
        {isExpanded && hasFolders && (
          <div className="ml-8 mt-2 space-y-1 border-l border-gray-600/30 pl-4">
            {folders.map((folder) => (
              <NestedFolder
                key={folder.id}
                folder={folder}
                categoryId={id}
                depth={0}
                currentFolderId={currentFolderId}
                onFolderClick={onFolderClick}
                onTypeSelect={onTypeSelect}
                navigate={navigate}
                getChildFolders={getChildFolders}
                getSecondaryTextColor={getSecondaryTextColor}
                expandedCategories={expandedCategories}
                toggleCategoryExpansion={toggleCategoryExpansion}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // const isRecyclingBinActive = location.pathname === '/recycling-bin';

  return (
    <div key={theme} className={`w-64 h-full flex flex-col ${getSidebarBackground()} border-r ${getBorderColor()}`}>
      {/* Header Section */}
      <div className={`flex flex-col items-center justify-center h-20 px-4 border-b ${getBorderColor()}`}>
        <h1 className={`text-2xl font-bold ${getTextColor()}`}>
          Fetch
        </h1>
        {appVersion && (
            <div className="flex items-center space-x-2 mt-1">
                <p className={`text-xs ${getSecondaryTextColor()}`}>v{appVersion}</p>
                <button 
                  onClick={() => setIsAboutModalOpen(true)} 
                  title="About Fetch" 
                  className={`${getSecondaryTextColor()} hover:text-indigo-400 transition-colors duration-200`}
                >
                    <InformationCircleIcon className="h-4 w-4" />
                </button>
            </div>
        )}
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-1">
          <NavButton id="all" name="All Items" icon={FolderIcon} />
        </div>

        <div>
          <div className={`px-2 mb-3 text-xs font-semibold ${getSecondaryTextColor()} uppercase tracking-wider`}>
            Categories
          </div>
          <div className="space-y-1">
            {categories.map((category) => (
              <CategoryButton key={category.id} {...category} />
            ))}
          </div>
        </div>

        <div>
            <div className={`px-2 mb-3 text-xs font-semibold ${getSecondaryTextColor()} uppercase tracking-wider`}>
                Other
            </div>
            <div className="space-y-1">
                <NavButton id="recycling-bin" name="Recycling Bin" icon={TrashIcon} />
            </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className={`p-4 border-t ${getBorderColor()}`}>
        <div className="space-y-2">
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    title="Add Item"
                    className="flex-1 flex items-center justify-center px-4 py-3 text-indigo-400 bg-indigo-900/20 hover:bg-indigo-900/30 hover:text-indigo-300 rounded-lg font-medium transition-all duration-200 border border-indigo-700/50"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
                <button
                    onClick={() => setIsAddFolderModalOpen(true)}
                    title="Add Folder"
                    className="flex-1 flex items-center justify-center px-4 py-3 text-indigo-400 bg-indigo-900/20 hover:bg-indigo-900/30 hover:text-indigo-300 rounded-lg font-medium transition-all duration-200 border border-indigo-700/50"
                >
                    <FolderPlusIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => setIsCsvImportModalOpen(true)}
                    title="Import CSV"
                    className="flex-1 flex items-center justify-center px-4 py-3 text-green-400 bg-green-900/20 hover:bg-green-900/30 hover:text-green-300 rounded-lg font-medium transition-all duration-200 border border-green-700/50"
                >
                    <ArrowUpTrayIcon className="h-5 w-5" />
                </button>
                <button
                    onClick={() => navigate('/settings')}
                    title="Settings"
                    className={`flex-1 flex items-center justify-center px-4 py-3 ${getSecondaryTextColor()} bg-gray-800/50 hover:bg-gray-800/70 hover:text-gray-200 rounded-lg font-medium transition-all duration-200 border border-gray-700/50`}
                >
                    <Cog6ToothIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={handleLogout}
                    title="Logout"
                    className="w-full flex items-center justify-center px-4 py-3 bg-red-900/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-lg font-medium transition-all duration-200 border border-red-700/50"
                >
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
      </div>

      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        type={selectedType === 'all' ? 'text' : selectedType as 'text' | 'key' | 'image' | 'video' | 'audio'}
        onSuccess={onItemsChange}
        parentId={currentFolderId}
        allItems={allItems}
      />
      <AddFolderModal
        isOpen={isAddFolderModalOpen}
        onClose={() => setIsAddFolderModalOpen(false)}
        onSuccess={onItemsChange}
        parentId={currentFolderId}
        folderType={selectedType === 'all' ? undefined : selectedType}
      />
      <CsvImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
        onSuccess={onItemsChange}
        parentId={currentFolderId}
      />
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
    </div>
  );
}