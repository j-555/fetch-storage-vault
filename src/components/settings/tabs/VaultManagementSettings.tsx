import { SettingRow } from '../SettingRow';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';

interface VaultManagementSettingsProps {
    onExportEncrypted: () => void;
    onExportDecrypted: (format: string) => void;
    onDeleteVault: () => void;
    onVaultUpdated?: () => void;
}

export const VaultManagementSettings = ({ onExportEncrypted, onExportDecrypted, onDeleteVault, onVaultUpdated }: VaultManagementSettingsProps) => {
    const [cleaning, setCleaning] = useState(false);
    const [cleanSummary, setCleanSummary] = useState<string | null>(null);
    const [cleanProgress, setCleanProgress] = useState({ current: 0, total: 0 });
    const [cleanReport, setCleanReport] = useState<{
        processedUrls: string[];
        groupsFound: Array<{ domain: string; entries: Array<{ name: string; url: string; username: string }> }>;
        deletedItems: Array<{ name: string; url: string; reason: string }>;
        keptItems: Array<{ name: string; url: string; reason: string }>;
    } | null>(null);
    const [showReport, setShowReport] = useState(false);

    const exportFormats = [
        { name: 'JSON (Readable)', value: 'json', description: 'Export as a formatted JSON file' },
        { name: 'CSV', value: 'csv', description: 'For spreadsheets and data analysis' },
        { name: 'Plain Text', value: 'txt', description: 'Export as a simple text file' },
        { name: 'Markdown', value: 'md', description: 'Export as formatted markdown' }
    ];

    const handleExportFormat = (format: string) => {
        try {
            onExportDecrypted(format);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    // // Helper to normalize URL
    // function normalizeUrl(url: string): string {
    //     if (!url) return '';
    //     return url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    // }

    // Helper to extract base domain for fuzzy matching (ignores path, query, fragment)
    function extractBaseDomain(url: string): string {
        if (!url) return '';
        
        // Remove protocol
        let domain = url.trim().toLowerCase().replace(/^https?:\/\//, '');
        // Remove everything after the first '/'
        domain = domain.split('/')[0];
        // Remove common subdomains
        domain = domain.replace(/^(www\.|my\.|quote\.|admin\.|accounts\.|signin\.|logon\.|myaccount\.|newmyplans\.|cashbackprog\.)/, '');
        
        // Handle special multi-part TLDs
        const parts = domain.split('.');
        
        // List of known multi-part TLDs
        const multiPartTlds = [
            'co.uk', 'ac.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk', 'sch.uk', 'gov.uk', 'nhs.uk',
            'co.za', 'org.za', 'web.za', 'net.za',
            'co.jp', 'ac.jp', 'or.jp', 'go.jp',
            'co.in', 'org.in', 'net.in', 'gov.in',
            'co.au', 'org.au', 'net.au', 'gov.au',
            'co.nz', 'org.nz', 'net.nz', 'gov.nz',
            'co.ke', 'org.ke', 'net.ke', 'gov.ke',
            'co.ug', 'org.ug', 'net.ug', 'gov.ug',
            'co.tz', 'org.tz', 'net.tz', 'gov.tz',
            'co.zw', 'org.zw', 'net.zw', 'gov.zw',
            'co.bw', 'org.bw', 'net.bw', 'gov.bw',
            'co.mw', 'org.mw', 'net.mw', 'gov.mw',
            'co.zm', 'org.zm', 'net.zm', 'gov.zm',
            'co.na', 'org.na', 'net.na', 'gov.na',
            'co.sz', 'org.sz', 'net.sz', 'gov.sz',
            'co.ls', 'org.ls', 'net.ls', 'gov.ls',
            'co.bz', 'org.bz', 'net.bz', 'gov.bz',
            'co.ck', 'org.ck', 'net.ck', 'gov.ck',
            'co.fj', 'org.fj', 'net.fj', 'gov.fj',
            'co.ki', 'org.ki', 'net.ki', 'gov.ki',
            'co.nr', 'org.nr', 'net.nr', 'gov.nr',
            'co.nu', 'org.nu', 'net.nu', 'gov.nu',
            'co.pg', 'org.pg', 'net.pg', 'gov.pg',
            'co.pw', 'org.pw', 'net.pw', 'gov.pw',
            'co.sb', 'org.sb', 'net.sb', 'gov.sb',
            'co.to', 'org.to', 'net.to', 'gov.to',
            'co.tv', 'org.tv', 'net.tv', 'gov.tv',
            'co.vu', 'org.vu', 'net.vu', 'gov.vu',
            'co.ws', 'org.ws', 'net.ws', 'gov.ws',
            'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
            'com.br', 'net.br', 'org.br', 'edu.br', 'gov.br',
            'com.cn', 'net.cn', 'org.cn', 'edu.cn', 'gov.cn',
            'com.hk', 'net.hk', 'org.hk', 'edu.hk', 'gov.hk',
            'com.my', 'net.my', 'org.my', 'edu.my', 'gov.my',
            'com.ph', 'net.ph', 'org.ph', 'edu.ph', 'gov.ph',
            'com.sg', 'net.sg', 'org.sg', 'edu.sg', 'gov.sg',
            'com.th', 'net.th', 'org.th', 'edu.th', 'gov.th',
            'com.tw', 'net.tw', 'org.tw', 'edu.tw', 'gov.tw',
            'com.vn', 'net.vn', 'org.vn', 'edu.vn', 'gov.vn',
            'com.mx', 'net.mx', 'org.mx', 'edu.mx', 'gov.mx',
            'com.ar', 'net.ar', 'org.ar', 'edu.ar', 'gov.ar',
            'com.cl', 'net.cl', 'org.cl', 'edu.cl', 'gov.cl',
            'com.pe', 'net.pe', 'org.pe', 'edu.pe', 'gov.pe',
            'com.uy', 'net.uy', 'org.uy', 'edu.uy', 'gov.uy',
            'com.ve', 'net.ve', 'org.ve', 'edu.ve', 'gov.ve',
            'com.ec', 'net.ec', 'org.ec', 'edu.ec', 'gov.ec',
            'com.bo', 'net.bo', 'org.bo', 'edu.bo', 'gov.bo',
            'com.py', 'net.py', 'org.py', 'edu.py', 'gov.py',
            'com.gt', 'net.gt', 'org.gt', 'edu.gt', 'gov.gt',
            'com.hn', 'net.hn', 'org.hn', 'edu.hn', 'gov.hn',
            'com.ni', 'net.ni', 'org.ni', 'edu.ni', 'gov.ni',
            'com.sv', 'net.sv', 'org.sv', 'edu.sv', 'gov.sv',
            'com.cr', 'net.cr', 'org.cr', 'edu.cr', 'gov.cr',
            'com.pa', 'net.pa', 'org.pa', 'edu.pa', 'gov.pa',
            'com.do', 'net.do', 'org.do', 'edu.do', 'gov.do',
            'com.pr', 'net.pr', 'org.pr', 'edu.pr', 'gov.pr',
            'com.jm', 'net.jm', 'org.jm', 'edu.jm', 'gov.jm',
            'com.tt', 'net.tt', 'org.tt', 'edu.tt', 'gov.tt',
            'com.bb', 'net.bb', 'org.bb', 'edu.bb', 'gov.bb',
            'com.gd', 'net.gd', 'org.gd', 'edu.gd', 'gov.gd',
            'com.lc', 'net.lc', 'org.lc', 'edu.lc', 'gov.lc',
            'com.vc', 'net.vc', 'org.vc', 'edu.vc', 'gov.vc',
            'com.ag', 'net.ag', 'org.ag', 'edu.ag', 'gov.ag',
            'com.kn', 'net.kn', 'org.kn', 'edu.kn', 'gov.kn',
            'com.dm', 'net.dm', 'org.dm', 'edu.dm', 'gov.dm',
            'com.lc', 'net.lc', 'org.lc', 'edu.lc', 'gov.lc',
            'com.vc', 'net.vc', 'org.vc', 'edu.vc', 'gov.vc',
            'com.ag', 'net.ag', 'org.ag', 'edu.ag', 'gov.ag',
            'com.kn', 'net.kn', 'org.kn', 'edu.kn', 'gov.kn',
            'com.dm', 'net.dm', 'org.dm', 'edu.dm', 'gov.dm',
            'com.lc', 'net.lc', 'org.lc', 'edu.lc', 'gov.lc',
            'com.vc', 'net.vc', 'org.vc', 'edu.vc', 'gov.vc',
            'com.ag', 'net.ag', 'org.ag', 'edu.ag', 'gov.ag',
            'com.kn', 'net.kn', 'org.kn', 'edu.kn', 'gov.kn',
            'com.dm', 'net.dm', 'org.dm', 'edu.dm', 'gov.dm'
        ];
        
        // Check if the domain ends with a multi-part TLD
        for (const tld of multiPartTlds) {
            if (domain.endsWith('.' + tld)) {
                const tldParts = tld.split('.');
                const domainParts = domain.split('.');
                
                // For multi-part TLDs, we want the main domain + the TLD
                // e.g., "amazon.co.uk" -> "amazon.co.uk"
                // e.g., "www.amazon.co.uk" -> "amazon.co.uk"
                if (domainParts.length >= tldParts.length + 1) {
                    const mainDomain = domainParts.slice(-tldParts.length - 1).join('.');
                    return mainDomain;
                }
            }
        }
        
        // For regular domains, use the last two parts
        if (parts.length >= 2) {
            return parts.slice(-2).join('.');
        }
        
        return domain;
    }

    // Helper to extract username, password, url from content
    function extractLogin(content: string): { username: string, password: string, url: string } {
        let username = '';
        let password = '';
        let url = '';
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('Username:')) username = line.replace('Username:', '').trim();
            else if (line.startsWith('Password:')) password = line.replace('Password:', '').trim();
            else if (line.startsWith('URL:')) url = line.replace('URL:', '').trim();
        }
        return { username, password, url };
    }

    async function handleDetectAndClean() {
        setCleaning(true);
        setCleanSummary(null);
        setCleanProgress({ current: 0, total: 0 });
        setCleanReport(null);
        setShowReport(false);
        
        const processedUrls: string[] = [];
        const groupsFound: Array<{ domain: string; entries: Array<{ name: string; url: string; username: string }> }> = [];
        const deletedItems: Array<{ name: string; url: string; reason: string }> = [];
        const keptItems: Array<{ name: string; url: string; reason: string }> = [];
        
        try {
            const items = await invoke<any[]>('get_all_vault_items');
            // Filter out deleted items - only process active items
            const activeItems = items.filter(item => !item.deleted_at);
            const keyItems = activeItems.filter(i => i.type === 'key');
            
            setCleanProgress({ current: 0, total: keyItems.length });
            
            // Fuzzy grouping: base domain + login (username or password, whichever is present, or both if available)
            const loginMap: Record<string, { id: string, name: string, username: string, password: string, url: string }[]> = {};
            const toDelete: { id: string, name: string, url: string, reason: string }[] = [];
            
            for (let i = 0; i < keyItems.length; i++) {
                const item = keyItems[i];
                setCleanProgress({ current: i + 1, total: keyItems.length });
                
                const result = await invoke<number[]>('get_item_content', { id: item.id });
                const content = new TextDecoder().decode(new Uint8Array(result));
                const { username, password, url } = extractLogin(content);
                
                if (url) {
                    processedUrls.push(url);
                }
                
                // If both username and password are missing, mark for deletion
                if (!username && !password) {
                    toDelete.push({ 
                        id: item.id, 
                        name: item.name, 
                        url: url || 'No URL',
                        reason: 'Missing both username and password'
                    });
                    continue;
                }
                
                if (!url) continue;
                const baseDomain = extractBaseDomain(url);
                
                // Flexible login key: prefer username, else password, else both
                let loginKey = '';
                if (username && password && username === password) {
                    loginKey = username.toLowerCase();
                } else if (username) {
                    loginKey = username.toLowerCase();
                } else if (password) {
                    loginKey = password;
                }
                
                const key = `${baseDomain}|${loginKey}`;
                if (!loginMap[key]) loginMap[key] = [];
                loginMap[key].push({ id: item.id, name: item.name, username, password, url });
            }
            
            // For each group, keep the most complete entry (prefer both username and password), delete the rest
            for (const [groupKey, group] of Object.entries(loginMap)) {
                const domain = groupKey.split('|')[0];
                
                if (group.length > 1) {
                    // Sort: prefer entry with both username and password, then username, then password
                    group.sort((a, b) => {
                        const aScore = (a.username ? 1 : 0) + (a.password ? 1 : 0);
                        const bScore = (b.username ? 1 : 0) + (b.password ? 1 : 0);
                        return bScore - aScore;
                    });
                    
                    // Record the group for the report
                    groupsFound.push({
                        domain,
                        entries: group.map(g => ({ name: g.name, url: g.url, username: g.username }))
                    });
                    
                    // Keep the first (best) entry, delete the rest
                    keptItems.push({
                        name: group[0].name,
                        url: group[0].url,
                        reason: `Best entry (score: ${(group[0].username ? 1 : 0) + (group[0].password ? 1 : 0)})`
                    });
                    
                    for (let i = 1; i < group.length; i++) {
                        toDelete.push({ 
                            id: group[i].id, 
                            name: group[i].name, 
                            url: group[i].url,
                            reason: `Duplicate of ${group[0].name}`
                        });
                    }
                } else {
                    // Single entry, keep it
                    keptItems.push({
                        name: group[0].name,
                        url: group[0].url,
                        reason: 'Single entry'
                    });
                }
            }
            
            setCleanProgress({ current: 0, total: toDelete.length });
            let deletedCount = 0;
            
            for (let i = 0; i < toDelete.length; i++) {
                await invoke('delete_item', { id: toDelete[i].id });
                deletedCount++;
                deletedItems.push(toDelete[i]);
                setCleanProgress({ current: i + 1, total: toDelete.length });
            }
            
            const report = {
                processedUrls,
                groupsFound,
                deletedItems,
                keptItems
            };
            
            setCleanReport(report);
            setCleanSummary(deletedCount > 0
                ? `Removed ${deletedCount} login entr${deletedCount === 1 ? 'y' : 'ies'}. Click "View Report" for details.`
                : 'No logins found to remove.');
            
            // Notify that the vault has been updated
            if (onVaultUpdated) {
                onVaultUpdated();
            }
        } catch (err) {
            setCleanSummary('Error during cleanup: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setCleaning(false);
        }
    }

    return (
        <div className="p-2">
            <SettingRow title="Export Encrypted Vault" description="Create a secure, portable backup of your vault as a .zip file.">
                <button onClick={onExportEncrypted} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Export</button>
            </SettingRow>
            
            <SettingRow title="Export Decrypted Vault" description="Export your vault data in various formats. Choose the format that works best for you.">
                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors inline-flex items-center">
                        Export
                        <ChevronDownIcon className="ml-1 -mr-1 h-4 w-4" aria-hidden="true" />
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg bg-gray-800/95 backdrop-blur-sm shadow-2xl ring-1 ring-white/10 focus:outline-none divide-y divide-gray-700/50">
                            <div className="p-1">
                                {exportFormats.map((format) => (
                                    <Menu.Item key={format.value}>
                                        {({ active }) => (
                                            <button
                                                onClick={() => handleExportFormat(format.value)}
                                                className={`${
                                                    active ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white' : 'text-gray-300'
                                                } group flex w-full items-center rounded-md px-3 py-2.5 text-sm transition-all duration-150`}
                                            >
                                                <div className="flex flex-col items-start">
                                                    <span className="font-medium">{format.name}</span>
                                                    <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-150">{format.description}</span>
                                                </div>
                                            </button>
                                        )}
                                    </Menu.Item>
                                ))}
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </SettingRow>

            <SettingRow title="Detect & Clean Reused Logins" description="Find and remove duplicate logins (same URL, username, and password). Only one entry will be kept.">
                <button onClick={handleDetectAndClean} disabled={cleaning} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                    {cleaning ? 'Cleaning...' : 'Detect & Clean'}
                </button>
            </SettingRow>
            
            {cleaning && cleanProgress.total > 0 && (
                <div className="w-full flex flex-col items-center mt-2">
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-200"
                            style={{ width: `${(cleanProgress.current / cleanProgress.total) * 100}%` }}
                        />
                    </div>
                    <div className="text-xs text-gray-400">
                        {cleanProgress.total > 0 && cleanProgress.current <= cleanProgress.total / 2 
                            ? `Analyzing ${cleanProgress.total} entr${cleanProgress.total === 1 ? 'y' : 'ies'}... ${cleanProgress.current} / ${cleanProgress.total}`
                            : `Deleting ${cleanProgress.total} entr${cleanProgress.total === 1 ? 'y' : 'ies'}... ${cleanProgress.current} / ${cleanProgress.total}`
                        }
                    </div>
                </div>
            )}
            
            {cleanSummary && (
                <div className="mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                    <p className="text-sm text-gray-300 text-center">
                        {cleanSummary === 'No logins found to remove.' ? (
                            <span className="flex items-center justify-center space-x-2">
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Your vault is clean! No duplicate entries found.</span>
                            </span>
                        ) : (
                            <div className="flex flex-col items-center space-y-2">
                                <span>{cleanSummary}</span>
                                {cleanReport && (
                                    <button
                                        onClick={() => setShowReport(!showReport)}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {showReport ? 'Hide Report' : 'View Report'}
                                    </button>
                                )}
                            </div>
                        )}
                    </p>
                </div>
            )}

            {showReport && cleanReport && (
                <div className="mt-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700 max-h-96 overflow-y-auto">
                    <h4 className="text-sm font-semibold text-gray-200 mb-3">Detailed Clean Report</h4>
                    
                    <div className="space-y-4 text-xs">
                        <div>
                            <h5 className="text-gray-300 font-medium mb-2">📊 Summary</h5>
                            <div className="grid grid-cols-2 gap-4 text-gray-400">
                                <div>Processed URLs: {cleanReport.processedUrls.length}</div>
                                <div>Groups Found: {cleanReport.groupsFound.length}</div>
                                <div>Items Kept: {cleanReport.keptItems.length}</div>
                                <div>Items Deleted: {cleanReport.deletedItems.length}</div>
                            </div>
                        </div>
                        
                        {cleanReport.groupsFound.length > 0 && (
                            <div>
                                <h5 className="text-gray-300 font-medium mb-2">🔍 Duplicate Groups Found</h5>
                                <div className="space-y-2">
                                    {cleanReport.groupsFound.map((group, idx) => (
                                        <div key={idx} className="p-2 bg-gray-700/50 rounded border-l-2 border-amber-500">
                                            <div className="text-amber-400 font-medium break-all">{group.domain}</div>
                                            <div className="text-gray-400 mt-1 space-y-1">
                                                {group.entries.map((entry, entryIdx) => (
                                                    <div key={entryIdx} className="ml-2">
                                                        <div className="font-medium">• {entry.name}</div>
                                                        <div className="ml-2 text-gray-500 break-all">URL: {entry.url}</div>
                                                        <div className="ml-2 text-gray-500">User: {entry.username || 'No username'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {cleanReport.deletedItems.length > 0 && (
                            <div>
                                <h5 className="text-gray-300 font-medium mb-2">🗑️ Deleted Items</h5>
                                <div className="space-y-2">
                                    {cleanReport.deletedItems.map((item, idx) => (
                                        <div key={idx} className="p-2 bg-gray-700/30 rounded border-l-2 border-red-500">
                                            <div className="text-red-400 font-medium">• {item.name}</div>
                                            <div className="ml-2 text-gray-500 break-all">URL: {item.url}</div>
                                            <div className="ml-2 text-gray-500">Reason: {item.reason}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {cleanReport.keptItems.length > 0 && (
                            <div>
                                <h5 className="text-gray-300 font-medium mb-2">✅ Kept Items</h5>
                                <div className="space-y-2">
                                    {cleanReport.keptItems.map((item, idx) => (
                                        <div key={idx} className="p-2 bg-gray-700/30 rounded border-l-2 border-green-500">
                                            <div className="text-green-400 font-medium">• {item.name}</div>
                                            <div className="ml-2 text-gray-500 break-all">URL: {item.url}</div>
                                            <div className="ml-2 text-gray-500">Reason: {item.reason}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div>
                            <h5 className="text-gray-300 font-medium mb-2">🌐 Processed URLs</h5>
                            <div className="text-gray-400 max-h-20 overflow-y-auto space-y-1">
                                {cleanReport.processedUrls.map((url, idx) => (
                                    <div key={idx} className="text-xs break-all p-1 bg-gray-700/30 rounded">
                                        • {url}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SettingRow title="Delete Vault" description="Permanently delete all data and reset the application. This action cannot be undone.">
                <button onClick={onDeleteVault} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">Delete Vault</button>
            </SettingRow>
        </div>
    );
};