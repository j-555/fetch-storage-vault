import React from 'react';
import { useTheme } from '../../hooks/useTheme';

interface SettingRowProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

export const SettingRow = ({ title, description, children }: SettingRowProps) => {
    const { theme } = useTheme();

    const getTextColor = () => {
        switch (theme) {
            case 'light':
                return 'text-gray-900';
            case 'dark':
                return 'text-gray-200';
            default:
                return 'text-gray-200';
        }
    };

    const getSecondaryTextColor = () => {
        switch (theme) {
            case 'light':
                return 'text-gray-600';
            case 'dark':
                return 'text-gray-500';
            default:
                return 'text-gray-500';
        }
    };

    const getBorderColor = () => {
        switch (theme) {
            case 'light':
                return 'border-gray-300/50';
            case 'dark':
                return 'border-gray-700/50';
            default:
                return 'border-gray-700/50';
        }
    };

    return (
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b ${getBorderColor()} last:border-b-0`}>
            <div className="mb-2 sm:mb-0">
                <p className={`text-sm font-medium ${getTextColor()}`}>{title}</p>
                <p className={`text-xs ${getSecondaryTextColor()} max-w-xs`}>{description}</p>
            </div>
            <div className="flex-shrink-0">
                {children}
            </div>
        </div>
    );
};