import { Zap, Sun } from 'lucide-react';
import { AssetType } from '@/data/assets';

interface FilterPanelProps {
  visible: Set<AssetType>;
  onChange: (type: AssetType, checked: boolean) => void;
}

const filterItems: { type: AssetType; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { type: 'mpan', label: 'MPAN', Icon: Zap },
  { type: 'generation', label: 'Generation', Icon: Sun },
];

export function FilterPanel({ visible, onChange }: FilterPanelProps) {
  return (
    <div
      data-testid="filter-panel"
      className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3 min-w-[170px]"
    >
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 leading-none">
        Filter Assets
      </p>
      <ul className="space-y-1.5">
        {filterItems.map(({ type, label, Icon }) => {
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
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-red-600 cursor-pointer"
                />
                <Icon size={12} className={`shrink-0 ${checked ? 'text-gray-700' : 'text-gray-400'}`} />
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
