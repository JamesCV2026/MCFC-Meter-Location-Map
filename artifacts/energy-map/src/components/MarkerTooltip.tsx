import { Trash2 } from 'lucide-react';
import { EnergyAsset } from '@/data/assets';
import { assetTypeConfig } from '@/data/assetTypes';
import { VIEW_ONLY } from '@/viewOnly';
import { panelInfoFor } from '@/data/panelInfo';
import { energyForName, energyTotal } from '@/data/energyData';
import { equipmentSpecsFor, hasAnySpec } from '@/data/equipmentSpecs';

interface MarkerTooltipProps {
  asset: EnergyAsset;
  onViewData: () => void;
  onDelete: () => void;
  flipDown?: boolean;
  // Projected sub-map assets shown on the overview can't be deleted here —
  // they're edited on their own sub-map.
  hideDelete?: boolean;
}

function fmt(n: number | undefined) {
  if (n === undefined) return '—';
  return n.toLocaleString('en-GB') + ' kWh';
}

export function MarkerTooltip({ asset, onViewData, onDelete, flipDown = false, hideDelete = false }: MarkerTooltipProps) {
  const meta = assetTypeConfig[asset.type];
  const TypeIcon = meta.Icon;
  // Headline figures — real campus energy (matched by display name) takes
  // precedence over any value on the asset record itself, so renamed/aliased
  // MPANs (e.g. "MPAN 6" → commercial building) pick up the right numbers.
  const displayTitle = panelInfoFor(asset.id).title ?? asset.name;
  const energy = energyForName(displayTitle);
  const genValue = energy?.generation ? energyTotal(energy.generation) : asset.generation_kwh;
  const consValue = energy?.consumption ? energyTotal(energy.consumption) : asset.consumption_kwh;
  // Equipment register entry, if this marker has one (diesel generators, CHPs).
  const specs = equipmentSpecsFor(displayTitle);
  const showSpecs = hasAnySpec(specs);
  return (
    <div
      data-testid={`tooltip-${asset.id}`}
      className="absolute z-30 pointer-events-auto"
      style={{
        left: '50%',
        transform: 'translateX(-50%)',
        minWidth: 220,
        // The wrapper touches the marker (top/bottom: 100%) and keeps the
        // visual 10px offset as padding — that padding is still part of the
        // hover target, so moving the cursor from the marker to the tooltip
        // never crosses dead space and the tooltip stays open.
        ...(flipDown
          ? { top: '100%', paddingTop: 10 }
          : { bottom: '100%', paddingBottom: 10 }),
      }}
    >
      {flipDown && (
        <div
          className="mx-auto mb-0"
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '6px solid #1a1a1a',
          }}
        />
      )}

      <div className="rounded-lg shadow-2xl overflow-hidden" style={{ background: '#1a1a1a' }}>
        <div className="h-1 w-full" style={{ background: meta.color }} />
        <div className="px-3.5 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TypeIcon size={11} className="shrink-0" style={{ color: meta.color }} />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
          </div>
          <p className="text-white font-semibold text-sm leading-tight mb-1">{displayTitle}</p>
          {asset.mpan && (
            <p className="text-gray-400 text-xs mb-2 font-mono">MPAN: {asset.mpan}</p>
          )}
          <div className="space-y-1 mb-2.5">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 text-xs">Generation</span>
              <span className="text-gray-200 text-xs font-medium">{fmt(genValue)}</span>
            </div>
            {/* Solar panels generate only — hide the Consumption row. */}
            {asset.type !== 'solar-panel' && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 text-xs">Consumption</span>
                <span className="text-gray-200 text-xs font-medium">{fmt(consValue)}</span>
              </div>
            )}
            {/* Equipment register entries (diesel gens, CHPs) — compact list. */}
            {showSpecs && (
              <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
                {specs!.make && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 text-xs">Make</span>
                    <span className="text-gray-200 text-xs font-medium">{specs!.make}</span>
                  </div>
                )}
                {specs!.engine && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 text-xs">Engine</span>
                    <span className="text-gray-200 text-xs font-medium">{specs!.engine}</span>
                  </div>
                )}
                {specs!.alternator && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 text-xs">Alternator</span>
                    <span className="text-gray-200 text-xs font-medium">{specs!.alternator}</span>
                  </div>
                )}
                {specs!.rating && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 text-xs">Rating</span>
                    <span className="text-gray-200 text-xs font-medium">{specs!.rating}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              data-testid={`tooltip-view-${asset.id}`}
              onClick={(e) => { e.stopPropagation(); onViewData(); }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              View data →
            </button>
            {!VIEW_ONLY && !hideDelete && (
              <button
                data-testid={`tooltip-delete-${asset.id}`}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
                title="Remove MPAN"
              >
                <Trash2 size={11} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {!flipDown && (
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
      )}
    </div>
  );
}
