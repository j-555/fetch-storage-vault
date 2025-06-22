import { useTheme } from '../../../hooks/useTheme';

interface VaultStats {
    total: number;
    byType: Record<string, number>;
}

interface VaultStatsProps {
    stats: VaultStats | null;
}

export const VaultStats = ({ stats }: VaultStatsProps) => {
    const { theme } = useTheme();

    const getTextColor = () => {
        switch (theme) {
            case 'light':
                return 'text-gray-900';
            case 'dark':
                return 'text-white';
            default:
                return 'text-white';
        }
    };

    const getSecondaryTextColor = () => {
        switch (theme) {
            case 'light':
                return 'text-gray-600';
            case 'dark':
                return 'text-gray-400';
            default:
                return 'text-gray-400';
        }
    };

    const getTertiaryTextColor = () => {
        switch (theme) {
            case 'light':
                return 'text-gray-500';
            case 'dark':
                return 'text-gray-500';
            default:
                return 'text-gray-500';
        }
    };

    const getBackgroundColor = () => {
        switch (theme) {
            case 'light':
                return 'bg-gray-200/50';
            case 'dark':
                return 'bg-gray-800/50';
            default:
                return 'bg-gray-800/50';
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
        <div className="p-4">
            <h3 className={`text-base font-medium ${getTextColor()} mb-4`}>Vault Statistics</h3>
            <div className={`space-y-2 rounded-lg ${getBackgroundColor()} p-4`}>
                {stats ? (
                    <>
                        <div className="flex justify-between text-sm">
                            <span className={getSecondaryTextColor()}>Total Items</span>
                            <span className={`font-medium ${getTextColor()}`}>{stats.total}</span>
                        </div>
                        {Object.entries(stats.byType).length > 0 && <div className={`pt-2 border-t ${getBorderColor()}`} />}
                        {Object.entries(stats.byType).map(([type, count]) => (
                            <div key={type} className="flex justify-between text-sm pl-2">
                                <span className={getTertiaryTextColor()}>{type}</span>
                                <span className={`font-medium ${getSecondaryTextColor()}`}>{count}</span>
                            </div>
                        ))}
                    </>
                ) : (
                    <p className={`text-sm ${getTertiaryTextColor()}`}>Loading stats...</p>
                )}
            </div>
        </div>
    );
};