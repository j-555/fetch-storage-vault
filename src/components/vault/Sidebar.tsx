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
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AddItemModal } from './AddItemModal';
import { getVersion } from '@tauri-apps/api/app';
import { AboutModal } from '../shared/AboutModal';
import { AddFolderModal } from './AddFolderModal';
import { CsvImportModal } from './CsvImportModal';
import { useTheme } from '../../hooks/useTheme';

interface SidebarProps {
  selectedType: string;
  onTypeSelect: (type: string) => void;
  onItemsChange: () => Promise<void>;
  currentFolderId: string | null;
}

const categories = [
  { id: 'text', name: 'Text Files', icon: DocumentTextIcon },
  { id: 'image', name: 'Images', icon: PhotoIcon },
  { id: 'video', name: 'Videos', icon: FilmIcon },
  { id: 'audio', name: 'Audio', icon: MusicalNoteIcon },
  { id: 'key', name: 'Keys & Tokens', icon: KeyIcon },
];

export function Sidebar({ selectedType, onTypeSelect, onItemsChange, currentFolderId }: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, themeVersion } = useTheme();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    const fetchVersion = async () => {
        const version = await getVersion();
        setAppVersion(version);
    };
    fetchVersion();
  }, []);

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
        return 'border-gray-300';
      case 'dark':
        return 'border-gray-700/30';
      default:
        return 'border-gray-700/30';
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
    const isActive = selectedType === id;
    return (
      <button
        onClick={() => onTypeSelect(id)}
        className={`relative w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm group ${
          isActive
            ? `bg-gradient-to-r from-indigo-500/10 via-indigo-500/20 to-transparent ${getActiveTextColor()}`
            : `${getSecondaryTextColor()} hover:${getTextColor()} hover:bg-white/5`
        }`}
      >
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1 rounded-r-full bg-indigo-400 transition-all duration-200 ease-in-out ${isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}`}></span>
        <Icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
            isActive ? 'text-indigo-300' : `${getSecondaryTextColor()} group-hover:text-gray-300`
        }`} />
        <span>{name}</span>
      </button>
    );
  };

  return (
    <div key={themeVersion} className={`w-64 h-full flex flex-col ${getSidebarBackground()}`}>
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
              <NavButton key={category.id} {...category} />
            ))}
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