import { Listbox, Transition, Switch } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { SettingRow } from '../SettingRow';
import { useTheme } from '../../../hooks/useTheme';
import { invoke } from '@tauri-apps/api/core';
import { VaultItem } from '../../../types';
import { CollapsibleSection } from '../CollapsibleSection';
import { ExclamationTriangleIcon, DocumentDuplicateIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
// @ts-ignore
import sha1 from 'crypto-js/sha1';
// @ts-ignore
import sha256 from 'crypto-js/sha256';

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
    onOpenVaultItem?: (itemName: string) => void;
    vaultUpdated?: boolean;
}

export const SecuritySettings = ({ onUpdateKey, requireKeyOnAccess, setRequireKeyOnAccess, autoLock, setAutoLock, onOpenVaultItem, vaultUpdated }: SecuritySettingsProps) => {
    const { theme } = useTheme();
    const [checking, setChecking] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    // const [results, setResults] = useState<any[]>([]);

    // Password Health Checker state
    const [healthResults, setHealthResults] = useState<null | {
        weak: { name: string; password: string; entropy: number }[];
        duplicates: { password: string; items: { name: string; url: string }[] }[];
        checked: boolean;
        hibp: { [password: string]: number };
        passwords: { password: string; name: string; url: string }[];
    }>(null);
    const [showDuplicates, setShowDuplicates] = useState<{ [idx: number]: boolean }>({});
    
    // Entropy calculation (same as PasswordGeneratorModal)
    function getPasswordEntropy(password: string): number {
        let charSetSize = 0;
        if (/[a-z]/.test(password)) charSetSize += 26;
        if (/[A-Z]/.test(password)) charSetSize += 26;
        if (/[0-9]/.test(password)) charSetSize += 10;
        if (/[^a-zA-Z0-9]/.test(password)) charSetSize += 32; // rough for symbols
        if (charSetSize === 0) return 0;
        return Math.round(password.length * Math.log2(charSetSize));
    }

    // Extract password and url from key item content
    function extractPasswordAndUrl(content: string): { password: string, url: string } {
        let password = '';
        let url = '';
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('Password:')) {
                password = line.replace('Password:', '').trim();
            } else if (line.startsWith('URL:')) {
                url = line.replace('URL:', '').trim();
            }
        }
        return { password, url };
    }

    // Normalize URL for duplicate detection
    function normalizeUrl(url: string): string {
        if (!url) return '';
        return url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    // Extract base domain for better duplicate detection
    function extractBaseDomain(url: string): string {
        if (!url) return '';
        const normalized = normalizeUrl(url);
        const parts = normalized.split('.');
        if (parts.length >= 2) {
            // Handle common subdomain patterns
            if (parts.length >= 3 && ['www', 'app', 'api', 'mobile', 'm', 'secure', 'login', 'auth', 'account', 'accounts', 'signin', 'signup'].includes(parts[0])) {
                return parts.slice(1).join('.');
            }
            return parts.slice(-2).join('.');
        }
        return normalized;
    }





    async function checkHIBP(password: string, cache: Record<string, number>): Promise<number> {
        if (cache[password] !== undefined) return cache[password];

        try {
            const hash = sha1(password).toString().toUpperCase();
            const prefix = hash.slice(0, 5);
            const suffix = hash.slice(5);

            // Security: Use secure fetch with timeout and proper error handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Fetch-Vault-Security-Check/1.0'
                }
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                console.warn('HIBP API request failed:', res.status);
                cache[password] = -1; // Mark as error
                return -1;
            }

            const text = await res.text();
            const found = text.split('\n').find(line => line.startsWith(suffix));
            const count = found ? parseInt(found.split(':')[1], 10) : 0;
            cache[password] = count;
            return count;
        } catch (error) {
            console.warn('HIBP check failed:', error);
            cache[password] = -1; // Mark as error
            return -1;
        }
    }

    async function runPasswordHealthCheck() {
        setChecking(true);
        setHealthResults(null);
        setProgress({ current: 0, total: 0 });
        try {
            // Force refresh by calling the backend multiple times to ensure we get fresh data
            console.log('Fetching fresh vault data for password health check...');
            
            // Multiple calls with delays to ensure backend cache is cleared
            for (let attempt = 1; attempt <= 3; attempt++) {
                console.log(`Attempt ${attempt}: Fetching vault data...`);
                await invoke('get_all_vault_items');
                
                // Increasing delay between attempts
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 200 * attempt));
                }
            }
            
            // Final call to get the actual fresh data
            const items: VaultItem[] = await invoke('get_all_vault_items');
            console.log('Fetched fresh items:', items);
            console.log('Total items in vault:', items.length);
            
            // Filter out deleted items - only process active items
            const activeItems = items.filter(item => !item.deleted_at);
            console.log('Active items (excluding deleted):', activeItems.length);
            
            // Only key-type items
            const keyItems = activeItems.filter(i => i.type === 'key');
            console.log('Key items found:', keyItems.length);
            
            // Additional verification - log some item names to confirm we have fresh data
            console.log('Sample key items:', keyItems.slice(0, 5).map(item => item.name));
            
            const passwords: { password: string; name: string; url: string }[] = [];
            setProgress({ current: 0, total: keyItems.length });
            
            for (let idx = 0; idx < keyItems.length; idx++) {
                const item = keyItems[idx];
                // fetch content
                const result = await invoke<number[]>('get_item_content', { id: item.id });
                const content = new TextDecoder().decode(new Uint8Array(result));
                const { password, url } = extractPasswordAndUrl(content);
                console.log(`Item: ${item.name}, Extracted password: '${password}', URL: '${url}'`);
                if (password) {
                    passwords.push({ password, name: item.name, url });
                }
                setProgress(prev => ({ current: prev.current + 1, total: keyItems.length }));
            }
            console.log('Extracted passwords:', passwords);
            // Check for weak passwords (entropy < 50 = weak)
            const weak = passwords
                .map(({ password, name }) => ({ password, name, entropy: getPasswordEntropy(password) }))
                .filter(({ entropy }) => entropy < 50);
            console.log('Weak passwords:', weak);
            // Check for duplicates, ignoring those with same URL
            const passMap: Record<string, { name: string; url: string }[]> = {};
            for (const { password, name, url } of passwords) {
                if (!passMap[password]) passMap[password] = [];
                passMap[password].push({ name, url });
            }
            const duplicates = Object.entries(passMap)
                .filter(([password, entries]: [string, { name: string; url: string }[]]) => {
                    if (entries.length <= 1) return false;
                    
                    // Skip very strong passwords (entropy > 80) as they're likely random and legitimate
                    const entropy = getPasswordEntropy(password);
                    if (entropy > 80) return false;
                    
                    // Debug logging for passwords with multiple entries
                    console.log(`Processing password with ${entries.length} entries:`);
                    console.log('Entries:', entries);
                    
                    // Group entries by service (base domain)
                    const serviceGroups: Record<string, { name: string; url: string }[]> = {};
                    for (const entry of entries) {
                        const baseDomain = extractBaseDomain(entry.url);
                        if (!serviceGroups[baseDomain]) serviceGroups[baseDomain] = [];
                        serviceGroups[baseDomain].push(entry);
                        
                        console.log(`URL: ${entry.url} -> Base domain: ${baseDomain}`);
                    }
                    
                    const services = Object.keys(serviceGroups);
                    
                    console.log('Service groups:', serviceGroups);
                    console.log('Services found:', services);
                    console.log('Will flag as duplicate:', services.length > 1);
                    
                    // Only flag as duplicate if:
                    // 1. Password is used across different services (not just different accounts on same service)
                    // 2. Password is not extremely strong (entropy <= 80)
                    // 3. There are at least 2 different services
                    return services.length > 1;
                })
                .map(([password, entries]: [string, { name: string; url: string }[]]) => ({ 
                    password, 
                    items: entries.map(e => ({ name: e.name, url: e.url }))
                }));
            console.log('Duplicate passwords:', duplicates);
            // HIBP check
            const hibpCache: Record<string, number> = {};
            const hibpResults: { [password: string]: number } = {};
            for (const { password } of passwords) {
                hibpResults[password] = await checkHIBP(password, hibpCache);
                console.log(`HIBP check for '${password}':`, hibpResults[password]);
            }
            setHealthResults({ weak, duplicates, checked: true, hibp: hibpResults, passwords });
        } catch (err) {
            setHealthResults({ weak: [], duplicates: [], checked: true, hibp: {}, passwords: [] });
            console.error('Password health check error:', err);
        } finally {
            setChecking(false);
        }
    }

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

    // Generate a privacy-focused, non-traceable UID with machine-based uniqueness
    async function getMasterKeyUid() {
        const masterKey = localStorage.getItem('masterKey') || '';
        
        // Generate machine-specific data for uniqueness across devices
        const machineData = navigator.userAgent + '|' + screen.width + '|' + screen.height + '|' + navigator.language;
        
        // Generate a random, non-traceable identifier
        let vaultId: string = localStorage.getItem('vaultId') || '';
        if (!vaultId) {
            try {
                // Use crypto.randomUUID() for true randomness (if available)
                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                    vaultId = crypto.randomUUID();
                } else {
                    // Fallback: generate random string using available entropy
                    const randomBytes = new Uint8Array(16);
                    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                        crypto.getRandomValues(randomBytes);
                    } else {
                        // Last resort: use Math.random (less secure but still random)
                        for (let i = 0; i < 16; i++) {
                            randomBytes[i] = Math.floor(Math.random() * 256);
                        }
                    }
                    vaultId = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
                }
                localStorage.setItem('vaultId', vaultId);
            } catch (error) {
                console.error('Failed to generate vault ID:', error);
                // Generate a simple random string as last resort
                vaultId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                localStorage.setItem('vaultId', vaultId);
            }
        }
        
        // Security: Generate salt per vault using secure methods
        let vaultSalt: string = sessionStorage.getItem('vaultSalt') || ''; // Use sessionStorage for security
        if (!vaultSalt) {
            try {
                // Use cryptographically secure random generation
                const randomBytes = new Uint8Array(32); // Increased to 32 bytes for better security
                if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                    crypto.getRandomValues(randomBytes);
                    vaultSalt = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
                } else {
                    // Fallback should not happen in modern browsers
                    console.warn('crypto.getRandomValues not available - using fallback');
                    vaultSalt = crypto.randomUUID?.() || 'fallback-' + Date.now() + '-' + Math.random();
                }
                sessionStorage.setItem('vaultSalt', vaultSalt); // Store in session only
            } catch (error) {
                console.error('Failed to generate vault salt:', error);
                // Security: More secure fallback using timestamp and crypto if available
                const timestamp = Date.now().toString(36);
                const randomPart = crypto.randomUUID?.() || Math.random().toString(36);
                vaultSalt = 'fallback-' + timestamp + '-' + randomPart;
                sessionStorage.setItem('vaultSalt', vaultSalt);
            }
        }
        
        // Combine master key + vault ID + salt + machine data for maximum uniqueness
        const combinedData = masterKey + '|' + vaultId + '|' + vaultSalt + '|' + machineData;
        const hash = sha256(combinedData).toString();
        // Use 16 digits instead of 11 for even lower collision probability
        const uid = hash.replace(/\D/g, '').slice(0, 16);
        
        // Security: Store UID in session storage only (not persistent)
        sessionStorage.setItem('userId11_' + hash, uid);
        return uid;
    }
    const [userId11, setUserId11] = useState('Loading...');
    
    // Load UID asynchronously
    useEffect(() => {
        getMasterKeyUid().then(uid => setUserId11(uid));
    }, []);



    // Clear health check results when vault is updated
    useEffect(() => {
        if (vaultUpdated && healthResults) {
            console.log('Vault updated, clearing health check results to ensure fresh data');
            setHealthResults(null);
        }
    }, [vaultUpdated, healthResults]);

    return (
        <div className="p-2">
            <SettingRow title="Password Health Checker" description="Check for weak or duplicate passwords in your vault.">
                <div className="flex space-x-2">
                    <button
                        onClick={runPasswordHealthCheck}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                        disabled={checking}
                    >
                        {checking ? 'Checking...' : 'Run Check'}
                    </button>
                    <button
                        onClick={() => {
                            setHealthResults(null);
                            console.log('Manual refresh: Cleared health check results');
                        }}
                        className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                        disabled={checking}
                        title="Clear results and force fresh data on next check"
                    >
                        Refresh
                    </button>
                </div>
            </SettingRow>
            {checking && progress.total > 0 && (
                <div className="text-xs text-gray-400 mt-2 text-center">
                    Scanning {progress.total} entr{progress.total === 1 ? 'y' : 'ies'}... Checked {progress.current} / {progress.total}
                </div>
            )}
            {healthResults && healthResults.checked && (
                <div className="mt-4 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                        <div className="space-y-3 p-4">
                            {healthResults.weak.length > 0 && (
                                <CollapsibleSection title={`Weak Passwords (${healthResults.weak.length})`} icon={ExclamationTriangleIcon}>
                                    <ul className="list-disc ml-6 text-red-400">
                                        {healthResults.weak.map(({ name, entropy }, i) => (
                                            <li key={i}>
                                                <span className="font-mono">{name}</span> (entropy: {entropy})
                                            </li>
                                        ))}
                                    </ul>
                                </CollapsibleSection>
                            )}
                            {healthResults.duplicates.length > 0 && (
                                <CollapsibleSection title={`Duplicate Passwords (${healthResults.duplicates.length})`} icon={DocumentDuplicateIcon}>
                                    <ul className="list-disc ml-6 text-amber-400">
                                        {healthResults.duplicates.map(({ password, items }, i) => (
                                            <li key={i}>
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="font-mono">Password {i + 1}:</span>
                                                    <span className="font-mono">
                                                        {showDuplicates[i] ? password : '•'.repeat(password.length)}
                                                    </span>
                                                    <button
                                                        onClick={() => setShowDuplicates(prev => ({ ...prev, [i]: !prev[i] }))}
                                                        className="ml-2 text-gray-400 hover:text-white transition"
                                                        title={showDuplicates[i] ? 'Hide password' : 'Show password'}
                                                    >
                                                        {showDuplicates[i] ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <ul className="list-disc ml-6 text-amber-300">
                                                    {items.map(({ name, url }, j) => (
                                                        <li key={j} className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => onOpenVaultItem?.(name)}
                                                                className="font-mono text-blue-400 hover:text-blue-300 underline cursor-pointer"
                                                                title="Click to open this entry"
                                                            >
                                                                {name}
                                                            </button>
                                                            {url && (
                                                                <span className="text-xs text-gray-500">
                                                                    ({url})
                                                                </span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ul>
                                </CollapsibleSection>
                            )}
                            {/* HIBP tab: only show breached passwords */}
                            {healthResults.passwords && Object.values(healthResults.hibp).some(v => v > 0) && (
                                <CollapsibleSection title={`HIBP Breached Passwords (${healthResults.passwords.filter(({ password }) => healthResults.hibp[password] > 0).length})`} icon={ExclamationTriangleIcon}>
                                    <ul className="list-disc ml-6 text-red-400">
                                        {healthResults.passwords.filter(({ password }) => healthResults.hibp[password] > 0).map(({ name }, i) => (
                                            <li key={i}>
                                                <span className="font-mono">{name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CollapsibleSection>
                            )}
                            {/* If nothing found */}
                            {healthResults.weak.length === 0 && healthResults.duplicates.length === 0 && (!healthResults.hibp || Object.values(healthResults.hibp).every(v => v === 0)) && (
                                <div className="flex items-center justify-center space-x-2 p-4 rounded-lg bg-green-900/20 border border-green-600/50">
                                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span className="text-green-400 font-medium">All passwords are strong and secure!</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
            <div className="mt-8 text-xs text-gray-500 text-center select-all">
                User ID: <span className="font-mono">{userId11}</span>
            </div>
        </div>
    );
};