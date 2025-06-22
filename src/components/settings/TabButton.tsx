import React from 'react';
import { useTheme } from '../../hooks/useTheme';

interface TabButtonProps {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

export const TabButton = ({ icon: Icon, label, isActive, onClick }: TabButtonProps) => {
    const { theme } = useTheme();

    const getActiveBackground = () => {
        switch (theme) {
            case 'light':
                return 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/20 to-transparent';
            case 'dark':
                return 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/20 to-transparent';
            default:
                return 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/20 to-transparent';
        }
    };

    const getHoverBackground = () => {
        switch (theme) {
            case 'light':
                return 'hover:bg-gray-200/50';
            case 'dark':
                return 'hover:bg-white/5';
            default:
                return 'hover:bg-white/5';
        }
    };

    const getTextColor = () => {
        switch (theme) {
            case 'light':
                return isActive ? 'text-gray-900' : 'text-gray-600';
            case 'dark':
                return isActive ? 'text-white' : 'text-gray-400';
            default:
                return isActive ? 'text-white' : 'text-gray-400';
        }
    };

    const getHoverTextColor = () => {
        switch (theme) {
            case 'light':
                return 'hover:text-gray-900';
            case 'dark':
                return 'hover:text-white';
            default:
                return 'hover:text-white';
        }
    };

    const getIconColor = () => {
        switch (theme) {
            case 'light':
                return isActive ? 'text-indigo-600' : 'text-gray-500';
            case 'dark':
                return isActive ? 'text-indigo-300' : 'text-gray-500';
            default:
                return isActive ? 'text-indigo-300' : 'text-gray-500';
        }
    };

    const getHoverIconColor = () => {
        switch (theme) {
            case 'light':
                return 'group-hover:text-indigo-600';
            case 'dark':
                return 'group-hover:text-gray-300';
            default:
                return 'group-hover:text-gray-300';
        }
    };

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm group ${
                isActive
                    ? `${getActiveBackground()} ${getTextColor()}`
                    : `${getTextColor()} ${getHoverTextColor()} ${getHoverBackground()}`
            }`}
        >
            <Icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                isActive ? getIconColor() : `${getIconColor()} ${getHoverIconColor()}`
            }`} />
            <span>{label}</span>
        </button>
    );
};