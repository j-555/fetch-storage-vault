import { ItemCard } from './ItemCard';
import { CubeTransparentIcon } from '@heroicons/react/24/outline';
import { VaultItem } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface ItemListProps {
  items: VaultItem[];
  onItemsChange: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  view: string;
  onFolderClick: (item: VaultItem) => void;
  onDelete: (id: string) => Promise<void>;
}

export const ItemList = ({ items, onItemsChange, error, view, onFolderClick, onDelete }: ItemListProps) => {
    const { theme, themeVersion } = useTheme();

    const getTextColor = () => {
      switch (theme) {
        case 'light':
          return 'text-gray-600';
        case 'dark':
          return 'text-gray-400';
        default:
          return 'text-gray-400';
      }
    };

    const getBorderColor = () => {
      switch (theme) {
        case 'light':
          return 'border-gray-200';
        case 'dark':
          return 'border-gray-700';
        default:
          return 'border-gray-700';
      }
    };

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
          <p className="text-red-400">{error}</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div key={themeVersion} className={`flex flex-col items-center justify-center h-[50vh] text-center ${getBorderColor()} rounded-xl`}>
          <CubeTransparentIcon className={`h-16 w-16 ${getTextColor()} mb-4`} />
          <h3 className={`text-lg font-semibold ${getTextColor()}`}>No items yet</h3>
          <p className={`text-sm ${getTextColor()} mt-1`}>
            Click the '+' or folder icon in the sidebar to add something here.
          </p>
        </div>
      );
    }

    const containerClasses = view === 'grid'
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        : "flex flex-col space-y-4";
    
    return (
      <div className={containerClasses}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onDelete={() => onDelete(item.id)}
            onFolderClick={onFolderClick}
            onItemUpdated={onItemsChange}
          />
        ))}
      </div>
    );
}