import mime from 'mime-types';
import { RawBackendItem, VaultItem } from '../types';

export const getSimplifiedType = (item: RawBackendItem): VaultItem['type'] => {
    const mime_type = item.type;
    if (mime_type === 'folder') return 'folder';
    if (mime_type.startsWith('image')) return 'image';
    if (mime_type.startsWith('video')) return 'video';
    if (mime_type.startsWith('audio')) return 'audio';
    if (mime_type === 'key') return 'key';
    return 'text';
};

export const getExtensionFromMime = (mime_type: string) => {
    return mime.extension(mime_type) || 'bin';
};

export const cleanUrlForDisplay = (url: string): string => {
    return url.replace(/https?:\/\//g, '').replace(/www\./g, '');
};