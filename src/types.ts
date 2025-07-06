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
    deleted_at?: number | null;
    type: 'text' | 'key' | 'image' | 'video' | 'audio' | 'folder';
    totp_secret?: string;
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
    deleted_at?: string | null;
    totp_secret?: string;
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

export interface LockoutStatus {
    is_locked_out: boolean;
    remaining_seconds: number;
    failed_attempts: number;
    max_attempts: number;
    lockout_duration_minutes: number;
}