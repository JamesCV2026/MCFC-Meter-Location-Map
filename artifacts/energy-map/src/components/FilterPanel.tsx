import { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { AssetType, EnergyAsset } from '@/data/assets';
import { assetTypeConfig, ENABLED_TYPES } from '@/data/assetTypes';
import { panelInfoFor } from '@/data/panelInfo';
import { INFRA_DEFINITIONS } from '@/data/infrastructureDefinitions';

// What the index is currently highlighting on the map: a whole type (hovering a
// group header) or a single asset (hovering one list item).
export interface HighlightTarget {
  type?: AssetType;
  id?: string;
  ids?: string[]; // highlight a specific set of assets (e.g. all of a site's)
  // Point at a photo STICKER by name instead of a marker (sites like Mamma Mia
  // or City At Home have no markers — their map presence is the photo circle).
  stickerName?: string;
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

// Inside the Solar Array group the type is already stated by the card header,
// so items show just the site — "Hotel Solar Array" → "Hotel".
function indexItemName(a: EnergyAsset): string {
  const n = displayName(a);
  if (effectiveType(a) !== 'solar-panel') return n;
  const stripped = n.replace(/\s*Solar Array\s*$/i, '').replace(/\s*Solar\s*$/i, '').trim();
  return stripped || n;
}

export function FilterPanel({ visible, onChange, embedded = false, assets, onHover, onSelect }: FilterPanelProps) {
  const indexMode = !!assets && !!onHover;
  const [expanded, setExpanded] = useState<Set<AssetType>>(new Set());
  const [legendOpen, setLegendOpen] = useState(false);

  // Group the supplied assets by their effective (index) type.
  const byType = new Map<AssetType, EnergyAsset[]>();
  if (assets) {
    for (const a of assets) {
      const t = effectiveType(a);
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(a);
    }
    // Natural/numeric sort so "Behind the Meter 2" comes before "…11" (a plain
    // string sort would order them 1, 10, 11, 2, 3 — the "all over the place" look).
    // The numbered series ("Grid Meter 1", "Grid Meter 2" …) sorts first;
    // special-named assets ("DNO Grid Meter", "IDNO Grid Meter") follow after.
    for (const [t, list] of byType) {
      const typeLabel = assetTypeConfig[t]?.label ?? '';
      const sortKey = (n: string) => (typeLabel && n.startsWith(typeLabel) ? '0' : '1') + n;
      list.sort((x, y) => sortKey(displayName(x)).localeCompare(sortKey(displayName(y)), undefined, { numeric: true, sensitivity: 'base' }));
    }
  }

  const toggle = (type: AssetType) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });

  const indexTypes = ENABLED_TYPES.filter((type) => type !== 'building');

  // ── Index list (dashboard) ────────────────────────────────────────────────
  // Google-Maps-style category list: each infrastructure type is a compact
  // card that sizes to its content (single centered row: checkbox, icon tile,
  // text block, chevron). Cards sit close together as one group; expanding a
  // card reveals its assets beneath the row.
  if (embedded && indexMode) {
    return (
      <div
        data-testid="filter-panel"
        onMouseLeave={() => onHover!(null)}
        className="flex-1 min-h-0 w-full flex flex-col"
      >
        <div className="shrink-0 flex items-center gap-2 mb-2">
          <p className="flex-1 min-w-0 text-[13px] font-bold text-gray-700 uppercase tracking-wide leading-none truncate">
            Infrastructure Index
          </p>
          <button
            type="button"
            data-testid="btn-open-legend"
            onClick={() => setLegendOpen(true)}
            title="What each infrastructure type means"
            className="shrink-0 flex items-center gap-1 rounded-full border border-emerald-600 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-bold px-2 py-1 transition-colors"
          >
            <BookOpen size={11} className="shrink-0" />
            Legend
          </button>
        </div>
        {legendOpen && createPortal(
          <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4" onClick={() => setLegendOpen(false)}>
            <div
              data-testid="legend-definitions-panel"
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Infrastructure legend</h3>
                  <p className="text-xs text-gray-500 mt-0.5">What each infrastructure type on the map means.</p>
                </div>
                <button onClick={() => setLegendOpen(false)} aria-label="Close legend" className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                {INFRA_DEFINITIONS.map((d) => {
                  const cfg = assetTypeConfig[d.type];
                  if (!cfg) return null;
                  const DIcon = cfg.Icon;
                  return (
                    <div key={d.type} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                      <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.color + '1f' }}>
                        <DIcon size={18} style={{ color: cfg.color }} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 leading-tight">{d.name ?? cfg.label}</p>
                        <p className="text-[12px] text-gray-600 leading-relaxed mt-0.5">{d.definition}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col gap-2">
          {indexTypes.filter((type) => (byType.get(type)?.length ?? 0) > 0).map((type) => {
            const { label, color, Icon } = assetTypeConfig[type];
            const checked = visible.has(type);
            const list = byType.get(type) ?? [];
            const isExp = expanded.has(type);
            const canExpand = list.length > 0;
            return (
              <div
                key={type}
                className={`flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden transition-colors ${isExp ? 'flex-[3] min-h-[150px]' : 'flex-1 min-h-[60px] justify-center hover:bg-gray-50'}`}
                // onMouseOver (not onMouseEnter) so the highlight re-registers
                // wherever the pointer re-enters the card — including after a
                // layout shift under a stationary cursor, which was making the
                // arrows only appear when approaching from the side.
                onMouseOver={() => { if (checked) onHover!({ type }); }}
                onMouseLeave={() => onHover!(null)}
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <input
                    type="checkbox"
                    data-testid={`filter-${type}`}
                    checked={checked}
                    onChange={(e) => onChange(type, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer shrink-0"
                    style={{ accentColor: color }}
                  />
                  <span
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-opacity"
                    style={{ backgroundColor: color + '1f', opacity: checked ? 1 : 0.45 }}
                  >
                    <Icon size={18} style={{ color }} />
                  </span>
                  <button
                    type="button"
                    disabled={!canExpand}
                    onClick={() => canExpand && toggle(type)}
                    className={`flex-1 min-w-0 text-left ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`block text-[14px] font-semibold leading-tight truncate ${checked ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
                    <span className="block text-[13px] font-normal text-gray-400 leading-tight mt-0.5">
                      {list.length} {list.length === 1 ? 'asset' : 'assets'}
                    </span>
                  </button>
                  {canExpand && (
                    <button
                      type="button"
                      onClick={() => toggle(type)}
                      aria-label={isExp ? `Collapse ${label} list` : `Expand ${label} list`}
                      className="shrink-0 p-1 -m-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <ChevronRight size={16} className={`transition-transform ${isExp ? 'rotate-90' : ''}`} />
                    </button>
                  )}
                </div>
                {canExpand && isExp && (
                  <ul className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 pt-2 space-y-0.5 border-t border-gray-100">
                    {list.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          data-testid={`index-item-${a.id}`}
                          // stopPropagation so this single-asset highlight isn't
                          // immediately overwritten by the card's onMouseOver
                          // (which highlights the whole type).
                          onMouseOver={(e) => { e.stopPropagation(); onHover!({ id: a.id }); }}
                          onMouseLeave={() => onHover!(null)}
                          onClick={() => onSelect?.(a)}
                          className="w-full text-left text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md px-2 py-1.5 truncate transition-colors"
                          title={displayName(a)}
                        >
                          {indexItemName(a)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="filter-panel"
      onMouseLeave={() => { if (indexMode) onHover!(null); }}
      className={embedded
        ? 'flex-1 min-h-0 w-full bg-white rounded-lg border border-gray-200 shadow-sm p-2 sm:p-3 overflow-y-auto text-[10px] sm:text-xs'
        : 'hidden xs:block absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-2 sm:p-3 min-w-[150px] sm:min-w-[190px] max-h-[70vh] overflow-y-auto text-[10px] sm:text-xs'}
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
                        {indexItemName(a)}
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
