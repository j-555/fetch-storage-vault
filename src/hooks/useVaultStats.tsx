import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RawBackendItem } from '../types';
import { getSimplifiedType } from '../utils/helpers';

interface VaultStatsData {
    total: number;
    byType: Record<string, number>;
}

export function useVaultStats() {
    const [stats, setStats] = useState<VaultStatsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const items = await invoke<RawBackendItem[]>('get_vault_items', { parentId: null, itemType: null, orderBy: null });
                
                const byType = items.reduce((acc, item) => {
                    const typeName = getSimplifiedType(item);
                    acc[typeName] = (acc[typeName] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                setStats({ total: items.length, byType });
            } catch (err) {
                console.error("Failed to fetch vault stats:", err);
                setStats(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    return { stats, isLoading };
}