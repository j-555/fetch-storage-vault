import { useState, useEffect, Fragment } from 'react';
import { Switch, Listbox, Transition } from '@headlessui/react';

import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { SettingRow } from '../SettingRow';
import { useTheme } from '../../../hooks/useTheme';
import { useLockoutStatus } from '../../../hooks/useLockoutStatus';
import { invoke } from '@tauri-apps/api/core';
import { BruteForceConfig } from '../../../types';

// Dropdown options
const maxAttemptsOptions = [
    { value: 3, label: '3 attempts' },
    { value: 5, label: '5 attempts' },
    { value: 10, label: '10 attempts' },
    { value: 15, label: '15 attempts' },
    { value: 20, label: '20 attempts' },
];

const lockoutDurationOptions = [
    { value: 1, label: '1 minute' },
    { value: 5, label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
];

export const BruteForceSettings = () => {
    const { theme } = useTheme();
    const [bruteForceConfig, setBruteForceConfig] = useState<BruteForceConfig | null>(null);
    const [bruteForceLoading, setBruteForceLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const {
        fetchLockoutStatus
    } = useLockoutStatus();

    // Load brute force configuration
    const loadBruteForceConfig = async () => {
        try {
            const config = await invoke<BruteForceConfig>('get_brute_force_config');
            setBruteForceConfig(config);
        } catch (error) {
            console.error('Failed to load brute force config:', error);
            // Set default config on error
            setBruteForceConfig({
                enabled: true,
                max_attempts: 5,
                lockout_duration_minutes: 5,
            });
        } finally {
            setIsInitialLoading(false);
        }
    };

    // Save brute force configuration
    const saveBruteForceConfig = async (config: BruteForceConfig) => {
        try {
            setBruteForceLoading(true);
            await invoke('set_brute_force_config', { config });
            setBruteForceConfig(config);
            await fetchLockoutStatus(); // Refresh lockout status
        } catch (error) {
            console.error('Failed to save brute force config:', error);
        } finally {
            setBruteForceLoading(false);
        }
    };



    // Load configuration on mount
    useEffect(() => {
        loadBruteForceConfig();
    }, []);

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
        if (!bruteForceConfig) return 'bg-gray-400';

        switch (theme) {
            case 'light':
                return bruteForceConfig.enabled ? 'bg-indigo-600' : 'bg-gray-400';
            case 'dark':
                return bruteForceConfig.enabled ? 'bg-indigo-600' : 'bg-gray-600';
            default:
                return bruteForceConfig.enabled ? 'bg-indigo-600' : 'bg-gray-600';
        }
    };

    // Show loading state until config is loaded
    if (isInitialLoading || !bruteForceConfig) {
        return (
            <div className="p-2">
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2">
            {/* Current Configuration Preview */}
            <div className={`flex items-center justify-center space-x-2 p-4 rounded-lg mb-4 ${
                bruteForceConfig.enabled
                    ? 'bg-blue-900/20 border border-blue-600/50'
                    : 'bg-red-900/20 border border-red-600/50'
            }`}>
                <svg className={`w-5 h-5 ${bruteForceConfig.enabled ? 'text-blue-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.5-2a11 11 0 11-18 0 11 11 0 0118 0z"></path>
                </svg>
                <span className={`font-medium ${bruteForceConfig.enabled ? 'text-blue-400' : 'text-red-400'}`}>
                    {bruteForceConfig.enabled
                        ? `Protection enabled: ${bruteForceConfig.max_attempts} attempts, ${bruteForceConfig.lockout_duration_minutes < 60 ? `${bruteForceConfig.lockout_duration_minutes}m` : `${bruteForceConfig.lockout_duration_minutes / 60}h`} lockout`
                        : 'Protection disabled'
                    }
                </span>
            </div>

                <SettingRow
                    title="Enable Protection" 
                    description="Automatically lock the account after multiple failed login attempts"
                >
                    <Switch 
                        checked={bruteForceConfig.enabled} 
                        onChange={(enabled) => saveBruteForceConfig({ ...bruteForceConfig, enabled })}
                        disabled={bruteForceLoading}
                        className={`${getSwitchBackground()} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50`}
                    >
                        <span className={`${bruteForceConfig.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </Switch>
                </SettingRow>

                <SettingRow
                    title="Maximum Attempts"
                    description="Number of failed login attempts before the account is locked"
                >
                    <Listbox
                        value={maxAttemptsOptions.find(opt => opt.value === bruteForceConfig.max_attempts) || maxAttemptsOptions[1]}
                        onChange={(option) => saveBruteForceConfig({ ...bruteForceConfig, max_attempts: option.value })}
                        disabled={bruteForceLoading || !bruteForceConfig.enabled}
                    >
                        <div className="relative w-40">
                            <Listbox.Button className={`relative w-full px-3 py-1.5 text-left text-sm rounded-lg transition-colors border focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${getDropdownBackground()} ${getDropdownHover()}`}>
                                <span className="block truncate">
                                    {maxAttemptsOptions.find(opt => opt.value === bruteForceConfig.max_attempts)?.label || '5 attempts'}
                                </span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                                </span>
                            </Listbox.Button>
                            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                <Listbox.Options className={`absolute z-10 top-full mt-2 w-full rounded-lg border shadow-lg max-h-60 overflow-auto focus:outline-none sm:text-sm ${getDropdownOptionsBackground()}`}>
                                    {maxAttemptsOptions.map((option) => (
                                        <Listbox.Option
                                            key={option.value}
                                            value={option}
                                            className={({ active }) => `relative cursor-pointer select-none py-2 px-3 text-sm ${active ? 'bg-indigo-600/50 text-white' : getDropdownOptionText()}`}
                                        >
                                            {option.label}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                </SettingRow>

                <SettingRow
                    title="Lockout Duration"
                    description="How long the account remains locked after reaching maximum attempts"
                >
                    <Listbox
                        value={lockoutDurationOptions.find(opt => opt.value === bruteForceConfig.lockout_duration_minutes) || lockoutDurationOptions[1]}
                        onChange={(option) => saveBruteForceConfig({ ...bruteForceConfig, lockout_duration_minutes: option.value })}
                        disabled={bruteForceLoading || !bruteForceConfig.enabled}
                    >
                        <div className="relative w-40">
                            <Listbox.Button className={`relative w-full px-3 py-1.5 text-left text-sm rounded-lg transition-colors border focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${getDropdownBackground()} ${getDropdownHover()}`}>
                                <span className="block truncate">
                                    {lockoutDurationOptions.find(opt => opt.value === bruteForceConfig.lockout_duration_minutes)?.label || '5 minutes'}
                                </span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                                </span>
                            </Listbox.Button>
                            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                <Listbox.Options className={`absolute z-10 top-full mt-2 w-full rounded-lg border shadow-lg max-h-60 overflow-auto focus:outline-none sm:text-sm ${getDropdownOptionsBackground()}`}>
                                    {lockoutDurationOptions.map((option) => (
                                        <Listbox.Option
                                            key={option.value}
                                            value={option}
                                            className={({ active }) => `relative cursor-pointer select-none py-2 px-3 text-sm ${active ? 'bg-indigo-600/50 text-white' : getDropdownOptionText()}`}
                                        >
                                            {option.label}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                </SettingRow>
        </div>
    );
};
