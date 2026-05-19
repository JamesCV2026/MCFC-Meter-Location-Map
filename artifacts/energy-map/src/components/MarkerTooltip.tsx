import { EnergyAsset } from '@/data/assets';

interface MarkerTooltipProps {
  asset: EnergyAsset;
  onViewData: () => void;
}

function fmt(n: number | undefined) {
  if (n === undefined) return '—';
  return n.toLocaleString('en-GB') + ' kWh';
}

export function MarkerTooltip({ asset, onViewData }: MarkerTooltipProps) {
  return (
    <div
      data-testid={`tooltip-${asset.id}`}
      className="absolute z-30 pointer-events-auto"
      style={{ bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)', minWidth: 220 }}
    >
      <div className="rounded-lg shadow-2xl overflow-hidden" style={{ background: '#1a1a1a' }}>
        <div className="h-1 w-full" style={{ background: '#dc2626' }} />
        <div className="px-3.5 py-3">
          <p className="text-white font-semibold text-sm leading-tight mb-1">{asset.name}</p>
          {asset.mpan && (
            <p className="text-gray-400 text-xs mb-2 font-mono">MPAN: {asset.mpan}</p>
          )}
          <div className="space-y-1 mb-2.5">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 text-xs">Generation</span>
              <span className="text-gray-200 text-xs font-medium">{fmt(asset.generation_kwh)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 text-xs">Consumption</span>
              <span className="text-gray-200 text-xs font-medium">{fmt(asset.consumption_kwh)}</span>
            </div>
          </div>
          <button
            data-testid={`tooltip-view-${asset.id}`}
            onClick={(e) => { e.stopPropagation(); onViewData(); }}
            className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
          >
            View data →
          </button>
        </div>
      </div>
      <div
        className="mx-auto"
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #1a1a1a',
        }}
      />
    </div>
  );
}
