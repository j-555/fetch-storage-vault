export interface VaultItem {
    id: string;
    parent_id: string | null;
    name: string;
    item_type: string; 
    data_path: string;
    folder_type?: string;
    comments?: string;
    tags: string[];
    created_at: number;
    updated_at: number;
    type: 'text' | 'key' | 'image' | 'video' | 'audio' | 'folder'; 
}

export interface RawBackendItem {
    id: string;
    parent_id: string | null;
    name: string;
    data_path: string;
    type: string;
    folder_type?: string;
    tags: string[];
    created_at: string;
    updated_at: string;
}

export interface Breadcrumb {
    id: string | null;
    name: string;
}

export interface BruteForceConfig {
    enabled: boolean;
    max_attempts: number;
    lockout_duration_minutes: number;
}