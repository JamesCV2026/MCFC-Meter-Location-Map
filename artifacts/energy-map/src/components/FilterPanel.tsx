import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AssetType, EnergyAsset } from '@/data/assets';
import { assetTypeConfig, ENABLED_TYPES } from '@/data/assetTypes';
import { panelInfoFor } from '@/data/panelInfo';

// What the index is currently highlighting on the map: a whole type (hovering a
// group header) or a single asset (hovering one list item).
export interface HighlightTarget {
  type?: AssetType;
  id?: string;
}

interface FilterPanelProps {
  visible: Set<AssetType>;
  onChange: (type: AssetType, checked: boolean) => void;
  // When true, drop the absolute positioning so a parent can place/stack it.
  embedded?: boolean;
  // ── Index mode ──────────────────────────────────────────────────────────
  // When `assets` + `onHover` are supplied, each type row becomes an expandable
  // index: it shows a count, can be opened to list every asset of that type,
  // and hovering the row (or an item) highlights the matching markers on the
  // map. Without these props it stays the plain filter legend it always was.
  assets?: EnergyAsset[];
  onHover?: (h: HighlightTarget | null) => void;
  onSelect?: (asset: EnergyAsset) => void;
}

// IDNO-flagged markers keep their real type's icon but index under "IDNO".
function effectiveType(a: EnergyAsset): AssetType {
  return (a.idno ? 'idno' : a.type) as AssetType;
}
function displayName(a: EnergyAsset): string {
  return panelInfoFor(a.id).title ?? a.name;
}

export function FilterPanel({ visible, onChange, embedded = false, assets, onHover, onSelect }: FilterPanelProps) {
  const indexMode = !!assets && !!onHover;
  const [expanded, setExpanded] = useState<Set<AssetType>>(new Set());

  // Group the supplied assets by their effective (index) type.
  const byType = new Map<AssetType, EnergyAsset[]>();
  if (assets) {
    for (const a of assets) {
      const t = effectiveType(a);
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(a);
    }
    for (const list of byType.values()) list.sort((x, y) => displayName(x).localeCompare(displayName(y)));
  }

  const toggle = (type: AssetType) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });

  return (
    <div
      data-testid="filter-panel"
      onMouseLeave={() => { if (indexMode) onHover!(null); }}
      className={`${embedded ? '' : 'hidden xs:block absolute top-3 right-3 z-20 '}bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-2 sm:p-3 min-w-[150px] sm:min-w-[190px] max-h-[70vh] overflow-y-auto text-[10px] sm:text-xs`}
    >
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 leading-none">
        {indexMode ? 'Infrastructure Index' : 'Filter Infrastructure'}
      </p>
      <ul className="space-y-1">
        {/* Driven by ENABLED_TYPES (see assetTypes.ts) so hiding/re-adding a
            type is a one-line change. 'building' lives as stickers, not a filter. */}
        {ENABLED_TYPES.filter((type) => type !== 'building').map((type) => {
          const { label, color, Icon } = assetTypeConfig[type];
          const checked = visible.has(type);
          const list = byType.get(type) ?? [];
          const isExp = expanded.has(type);
          const canExpand = indexMode && list.length > 0;
          return (
            <li key={type}>
              <div
                className="flex items-center gap-2 group rounded px-1 -mx-1 hover:bg-gray-50"
                onMouseEnter={() => { if (indexMode && checked) onHover!({ type }); }}
                onMouseLeave={() => { if (indexMode) onHover!(null); }}
              >
                <input
                  type="checkbox"
                  data-testid={`filter-${type}`}
                  checked={checked}
                  onChange={(e) => onChange(type, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer shrink-0"
                  style={{ accentColor: color }}
                />
                <Icon
                  size={12}
                  className="shrink-0"
                  style={{ color: checked ? color : '#9ca3af' }}
                />
                <button
                  type="button"
                  disabled={!canExpand}
                  onClick={() => canExpand && toggle(type)}
                  className={`flex-1 flex items-center gap-1 min-w-0 text-left text-xs font-medium transition-colors ${checked ? 'text-gray-700' : 'text-gray-400'} ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="truncate">{label}</span>
                  {indexMode && <span className="text-gray-400 font-normal shrink-0">({list.length})</span>}
                </button>
                {canExpand && (
                  <button
                    type="button"
                    onClick={() => toggle(type)}
                    aria-label={isExp ? `Collapse ${label} list` : `Expand ${label} list`}
                    className="shrink-0 p-1 -m-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <ChevronRight
                      size={12}
                      className={`transition-transform ${isExp ? 'rotate-90' : ''}`}
                    />
                  </button>
                )}
              </div>

              {canExpand && isExp && (
                <ul className="ml-6 mt-1 mb-1 space-y-0.5 border-l border-gray-200 pl-2">
                  {list.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        data-testid={`index-item-${a.id}`}
                        onMouseEnter={() => onHover!({ id: a.id })}
                        onMouseLeave={() => onHover!(null)}
                        onClick={() => onSelect?.(a)}
                        className="w-full text-left text-[11px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded px-1.5 py-0.5 truncate transition-colors"
                        title={displayName(a)}
                      >
                        {displayName(a)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
