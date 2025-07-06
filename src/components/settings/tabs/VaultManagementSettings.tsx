import { SettingRow } from '../SettingRow';

interface VaultManagementSettingsProps {
    onExportEncrypted: () => void;
    onExportDecrypted: () => void;
    onDeleteVault: () => void;
}

export const VaultManagementSettings = ({ onExportEncrypted, onExportDecrypted, onDeleteVault }: VaultManagementSettingsProps) => (
    <div className="p-2">
        <SettingRow title="Export Encrypted Vault" description="Create a secure, portable backup of your vault as a .zip file.">
            <button onClick={onExportEncrypted} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Export</button>
        </SettingRow>
        <SettingRow title="Export Decrypted Vault" description="Export all data to a readable, unencrypted JSON file. Handle with care.">
            <button onClick={onExportDecrypted} className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors">Export</button>
        </SettingRow>
        <SettingRow title="Delete Vault" description="Permanently delete all data and reset the application. This action cannot be undone.">
            <button onClick={onDeleteVault} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">Delete Vault</button>
        </SettingRow>
    </div>
);