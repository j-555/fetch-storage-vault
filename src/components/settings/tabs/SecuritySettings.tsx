import { Listbox, Transition, Switch } from '@headlessui/react';
import { Fragment } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { SettingRow } from '../SettingRow';
import { useTheme } from '../../../hooks/useTheme';

const autoLockOptions = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 0, label: 'Never' },
];

interface SecuritySettingsProps {
    onUpdateKey: () => void;
    requireKeyOnAccess: boolean;
    setRequireKeyOnAccess: (value: boolean) => void;
    autoLock: { value: number; label: string; };
    setAutoLock: (value: { value: number; label: string; }) => void;
}

export const SecuritySettings = ({ onUpdateKey, requireKeyOnAccess, setRequireKeyOnAccess, autoLock, setAutoLock }: SecuritySettingsProps) => {
    const { theme } = useTheme();

    const getDropdownBackground = () => {
        switch (theme) {
            case 'light':
                return 'bg-gray-200/50 text-gray-900 border-gray-400/50';
            case 'dark':
                return 'bg-gray-700/50 text-white border-gray-600/50';
            default:
                return 'bg-gray-700/50 text-white border-gray-600/50';
        }
    };

    const getDropdownHover = () => {
        switch (theme) {
            case 'light':
                return 'hover:bg-gray-300';
            case 'dark':
                return 'hover:bg-gray-700';
            default:
                return 'hover:bg-gray-700';
        }
    };

    const getDropdownOptionsBackground = () => {
        switch (theme) {
            case 'light':
                return 'bg-white border-gray-300';
            case 'dark':
                return 'bg-gray-800 border-gray-700';
            default:
                return 'bg-gray-800 border-gray-700';
        }
    };

    const getDropdownOptionText = () => {
        switch (theme) {
            case 'light':
                return 'text-gray-700';
            case 'dark':
                return 'text-gray-300';
            default:
                return 'text-gray-300';
        }
    };

    const getSwitchBackground = () => {
        switch (theme) {
            case 'light':
                return requireKeyOnAccess ? 'bg-indigo-600' : 'bg-gray-400';
            case 'dark':
                return requireKeyOnAccess ? 'bg-indigo-600' : 'bg-gray-600';
            default:
                return requireKeyOnAccess ? 'bg-indigo-600' : 'bg-gray-600';
        }
    };

    return (
        <div className="p-2">
            <SettingRow title="Master Key" description="Change your vault's master key & derivation strength.">
                 <button onClick={onUpdateKey} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Update Master Key</button>
            </SettingRow>
            <SettingRow title="Require Key on Access" description="Ask for the master key to view an item's content.">
                <Switch checked={requireKeyOnAccess} onChange={setRequireKeyOnAccess} className={`${getSwitchBackground()} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900`}>
                    <span className={`${requireKeyOnAccess ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </Switch>
            </SettingRow>
            <SettingRow title="Auto-Lock Vault" description="Automatically lock the vault after a period of inactivity.">
                <Listbox value={autoLock} onChange={setAutoLock}>
                    <div className="relative w-40">
                        <Listbox.Button className={`relative w-full px-3 py-1.5 text-left text-sm rounded-lg transition-colors border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getDropdownBackground()} ${getDropdownHover()}`}>
                            <span className="block truncate">{autoLock.label}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDownIcon className="h-4 w-4 text-gray-400" /></span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                            <Listbox.Options className={`absolute z-10 bottom-full mb-2 w-full rounded-lg border shadow-lg max-h-60 overflow-auto focus:outline-none sm:text-sm ${getDropdownOptionsBackground()}`}>
                                {autoLockOptions.map((option) => (<Listbox.Option key={option.value} value={option} className={({ active }) => `relative cursor-pointer select-none py-2 px-3 text-sm ${active ? 'bg-indigo-600/50 text-white' : getDropdownOptionText()}`}>{option.label}</Listbox.Option>))}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
            </SettingRow>
        </div>
    );
};