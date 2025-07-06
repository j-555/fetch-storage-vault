export const strengthOptions = [
    { id: 'Recommended', name: 'Recommended' },
    { id: 'Paranoid', name: 'Paranoid (Slower)' },
    { id: 'Fast', name: 'Fast (Less Secure)' },
];

export const sortOptions = [
    { value: 'CreatedAtDesc', label: 'Date Added (Newest)' },
    { value: 'CreatedAtAsc', label: 'Date Added (Oldest)' },
    { value: 'NameAsc', label: 'Name (A-Z)' },
    { value: 'NameDesc', label: 'Name (Z-A)' },
    { value: 'UpdatedAtDesc', label: 'Date Modified (Newest)'},
    { value: 'UpdatedAtAsc', label: 'Date Modified (Oldest)'},
];

import {
    DocumentTextIcon,
    KeyIcon,
    PhotoIcon,
    FilmIcon,
    MusicalNoteIcon,
    FolderIcon,
    SpeakerWaveIcon
} from '@heroicons/react/24/outline';

export const typeIcons = {
    text: DocumentTextIcon,
    key: KeyIcon,
    image: PhotoIcon,
    video: FilmIcon,
    audio: MusicalNoteIcon,
    folder: FolderIcon,
};

export const fileTypeFilters = {
    image: { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
    video: { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
    audio: { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] },
};

export const itemTypeConfig = {
    text: {
        icon: DocumentTextIcon,
        title: 'Text File',
        color: 'text-blue-400',
        borderColor: 'border-blue-500/20',
        bgColor: 'bg-blue-500/10'
    },
    key: {
        icon: KeyIcon,
        title: 'Key & Token',
        color: 'text-orange-400',
        borderColor: 'border-orange-500/20',
        bgColor: 'bg-orange-500/10'
    },
    image: {
        icon: PhotoIcon,
        title: 'Image',
        color: 'text-green-400',
        borderColor: 'border-green-500/20',
        bgColor: 'bg-green-500/10'
    },
    video: {
        icon: FilmIcon,
        title: 'Video',
        color: 'text-purple-400',
        borderColor: 'border-purple-500/20',
        bgColor: 'bg-purple-500/10'
    },
    audio: {
        icon: SpeakerWaveIcon,
        title: 'Audio',
        color: 'text-pink-400',
        borderColor: 'border-pink-500/20',
        bgColor: 'bg-pink-500/10'
    }
};