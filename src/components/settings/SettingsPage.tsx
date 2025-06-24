import { useNavigate } from 'react-router-dom';
import {
  XMarkIcon,
  ShieldCheckIcon,
  ArchiveBoxArrowDownIcon,
  ChartBarIcon,
  PaintBrushIcon,
  TagIcon 
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { MasterKeyConfirmationModal } from '../auth/MasterKeyConfirmationModal';
import { UpdateMasterKeyModal } from './UpdateMasterKeyModal';
import { SuccessPopup } from './SuccessPopup';
import { DeleteVaultModal } from './DeleteVaultModal';
import { AppearanceSettings } from './tabs/AppearanceSettings';
import { SecuritySettings } from './tabs/SecuritySettings';
import { VaultManagementSettings } from './tabs/VaultManagementSettings';
import { VaultStats } from './tabs/VaultStats';
import { TagManagementSettings } from './tabs/TagManagementSettings';
import { useSettings } from '../../hooks/useSettings';
import { useVaultManagement } from '../../hooks/useVaultManagement';
import { useVaultStats } from '../../hooks/useVaultStats';
import { useTheme } from '../../hooks/useTheme';

type Tab = 'appearance' | 'security' | 'management' | 'stats' | 'tags';

export function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  
  const { autoLock, requireKeyOnAccess } = useSettings();
  const { stats } = useVaultStats();
  const vaultManagement = useVaultManagement();
  const { theme, themeVersion } = useTheme();

  const [isUpdateKeyModalOpen, setIsUpdateKeyModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeleteVaultModalOpen, setIsDeleteVaultModalOpen] = useState(false);
  
  const getBackgroundClass = () => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-b from-gray-50 to-gray-100';
      case 'dark':
        return 'bg-gradient-to-b from-gray-900 to-black';
      default:
        return 'bg-gradient-to-b from-gray-900 to-black';
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

  const getBorder = () => {
    switch (theme) {
      case 'light':
        return 'border border-gray-300';
      case 'dark':
        return 'border border-gray-700';
      default:
        return 'border border-gray-700';
    }
  }

  const getHeaderBorder = () => {
    switch (theme) {
      case 'light':
        return 'border-b border-gray-300';
      case 'dark':
        return 'border-b border-gray-700';
      default:
        return 'border-b border-gray-700';
    }
  }

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

  const SettingsNavButton = ({ id, name, icon: Icon }: { id: Tab; name: string; icon: React.ElementType }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
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

  const renderTabContent = () => {
    switch(activeTab) {
        case 'appearance':
            return <AppearanceSettings key={themeVersion} />;
        case 'security':
            return <SecuritySettings 
                        onUpdateKey={() => setIsUpdateKeyModalOpen(true)} 
                        requireKeyOnAccess={requireKeyOnAccess.value} 
                        setRequireKeyOnAccess={requireKeyOnAccess.setValue} 
                        autoLock={autoLock.value} 
                        setAutoLock={autoLock.setValue} 
                    />;
        case 'management':
            return <VaultManagementSettings 
                        onExportEncrypted={vaultManagement.handleExportEncrypted} 
                        onExportDecrypted={() => setIsExportModalOpen(true)} 
                        onDeleteVault={() => setIsDeleteVaultModalOpen(true)} 
                    />;
        case 'stats':
            return <VaultStats stats={stats} />;
        case 'tags':
            return <TagManagementSettings />;
        default:
            return null;
    }
}

  return (
    <div key={themeVersion} className={`min-h-screen ${getBackgroundClass()}`}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-semibold text-white"></h1>
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/')} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50">
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>
        </div>

        <div className="flex flex-col md:flex-row md:space-x-8">
            <div className={`w-full md:w-64 flex-shrink-0 mb-8 md:mb-0 rounded-lg shadow-xl ${getSidebarBackground()} ${getBorder()}`}>
              {/* Header Section */}
              <div className={`flex flex-col items-center justify-center h-20 px-4 ${getHeaderBorder()}`}>
                <h2 className={`text-xl font-bold ${getTextColor()}`}>
                  Settings
                </h2>
              </div>

              {/* Navigation Section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-1">
                  <SettingsNavButton id="appearance" name="Appearance" icon={PaintBrushIcon} />
                </div>

                <div>
                  <div className={`px-2 mb-3 text-xs font-semibold ${getSecondaryTextColor()} uppercase tracking-wider`}>
                    Security & Management
                  </div>
                  <div className="space-y-1">
                    <SettingsNavButton id="security" name="Security" icon={ShieldCheckIcon} />
                    <SettingsNavButton id="management" name="Vault Management" icon={ArchiveBoxArrowDownIcon} />
                  </div>
                </div>

                <div>
                  <div className={`px-2 mb-3 text-xs font-semibold ${getSecondaryTextColor()} uppercase tracking-wider`}>
                    Data & Organization
                  </div>
                  <div className="space-y-1">
                    <SettingsNavButton id="stats" name="Statistics" icon={ChartBarIcon} />
                    <SettingsNavButton id="tags" name="Tag Management" icon={TagIcon} />
                  </div>
                </div>
              </div>
            </div>

            <main className={`flex-1 rounded-lg shadow-xl ${getSidebarBackground()} ${getBorder()} p-2 sm:p-4`}>
                {renderTabContent()}
            </main>
        </div>

        <SuccessPopup 
            show={vaultManagement.isSuccess}
            title="Master Key Updated"
            message="The application will reload in 3 seconds to apply changes."
            onClose={() => {}}
        />
        <UpdateMasterKeyModal
            isOpen={isUpdateKeyModalOpen}
            onClose={() => setIsUpdateKeyModalOpen(false)}
            onConfirm={vaultManagement.handleUpdateMasterKey}
            isLoading={vaultManagement.isLoading}
            error={vaultManagement.error}
        />
        <MasterKeyConfirmationModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onConfirm={async (key) => {
              try {
                  const success = await vaultManagement.handleExportDecrypted(key);
                  if (success) setIsExportModalOpen(false);
              } catch (e) {
                    console.error("Export failed:", e);
              }
          }}
          title="Confirm Decrypted Export"
          description="This will export all your vault data as an unencrypted JSON file. Please enter your master key to proceed."
          actionLabel="Confirm & Export"
          isLoading={vaultManagement.isLoading}
          error={vaultManagement.error}
          clearError={vaultManagement.clearError}
        />
        <DeleteVaultModal
          isOpen={isDeleteVaultModalOpen}
          onClose={() => setIsDeleteVaultModalOpen(false)}
          onConfirm={vaultManagement.handleDeleteVault}
        />
      </div>
    </div>
  );
}