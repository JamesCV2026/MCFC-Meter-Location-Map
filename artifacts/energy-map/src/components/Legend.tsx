import { Zap } from 'lucide-react';
import { AssetType } from '@/data/assets';

interface LegendItem {
  type: AssetType;
  label: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const items: LegendItem[] = [
  { type: 'mpan', label: 'MPAN', color: '#dc2626', Icon: Zap },
];

export function Legend() {
  return (
    <div
      data-testid="legend"
      className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3 min-w-[160px]"
    >
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 leading-none">
        Asset Types
      </p>
      <ul className="space-y-1.5">
        {items.map(({ type, label, color, Icon }) => (
          <li key={type} className="flex items-center gap-2">
            <span
              className="flex items-center justify-center rounded-full shrink-0"
              style={{ width: 20, height: 20, background: color }}
            >
              <Icon size={11} className="text-white" />
            </span>
            <span className="text-xs font-medium text-gray-700">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
