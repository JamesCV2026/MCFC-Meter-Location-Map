import { AssetType } from '@/data/assets';
import { assetTypeConfig, ENABLED_TYPES } from '@/data/assetTypes';

interface FilterPanelProps {
  visible: Set<AssetType>;
  onChange: (type: AssetType, checked: boolean) => void;
  // When true, drop the absolute positioning so a parent can place/stack it.
  embedded?: boolean;
}

export function FilterPanel({ visible, onChange, embedded = false }: FilterPanelProps) {
  return (
    <div
      data-testid="filter-panel"
      className={`${embedded ? '' : 'hidden xs:block absolute top-3 right-3 z-20 '}bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-2 sm:p-3 min-w-[140px] sm:min-w-[170px] text-[10px] sm:text-xs`}
    >
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 leading-none">
        Filter Infrastructure
      </p>
      <ul className="space-y-1.5">
        {/* Driven by ENABLED_TYPES (see assetTypes.ts) so hiding/re-adding a
            type is a one-line change. 'building' lives as stickers, not a filter. */}
        {ENABLED_TYPES.filter((type) => type !== 'building').map((type) => {
          const { label, color, Icon } = assetTypeConfig[type];
          const checked = visible.has(type);
          return (
            <li key={type}>
              <label
                data-testid={`filter-${type}`}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChange(type, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                  style={{ accentColor: color }}
                />
                <Icon
                  size={12}
                  className="shrink-0"
                  style={{ color: checked ? color : '#9ca3af' }}
                />
                <span className={`text-xs font-medium transition-colors ${checked ? 'text-gray-700' : 'text-gray-400'}`}>
                  {label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
