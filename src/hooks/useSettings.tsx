import { useState } from 'react';
import { useAutoLock } from './useAutoLock';

const autoLockOptions = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 0, label: 'Never' },
];

const sortOptions = [
    { value: 'CreatedAtDesc', label: 'Date Added (Newest)' },
    { value: 'CreatedAtAsc', label: 'Date Added (Oldest)' },
    { value: 'NameAsc', label: 'Name (A-Z)' },
    { value: 'NameDesc', label: 'Name (Z-A)' },
    { value: 'UpdatedAtDesc', label: 'Date Modified (Newest)'},
    { value: 'UpdatedAtAsc', label: 'Date Modified (Oldest)'},
];


function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item === null) {
                return initialValue;
            }
            try {
                return JSON.parse(item);
            } catch (jsonError) {
                if (typeof initialValue === 'object' && initialValue !== null) {
                    console.warn(`Error parsing localStorage item for key "${key}":`, jsonError);
                }
                return item as unknown as T;
            }
        } catch (error) {
            console.error(`Error accessing localStorage for key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            window.dispatchEvent(new Event('storage'));
        } catch (error) {
            console.error(`Error setting localStorage for key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}

export function useSettings() {
    const [autoLock, setAutoLock] = useLocalStorage('autoLock', autoLockOptions[0]);
    const [sortOrder, setSortOrder] = useLocalStorage('sortOrder', sortOptions[0]);
    const [vaultView, setVaultView] = useLocalStorage('vaultView', 'grid');
    const [requireKeyOnAccess, setRequireKeyOnAccess] = useLocalStorage('requireKeyOnAccess', false);

    useAutoLock(autoLock.value);

    return {
        autoLock: {
            value: autoLock,
            setValue: setAutoLock,
            options: autoLockOptions
        },
        sortOrder: {
            value: sortOrder,
            setValue: setSortOrder,
            options: sortOptions
        },
        vaultView: {
            value: vaultView,
            setValue: setVaultView
        },
        requireKeyOnAccess: {
            value: requireKeyOnAccess,
            setValue: setRequireKeyOnAccess
        }
    }
}