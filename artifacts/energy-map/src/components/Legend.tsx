import { useState } from 'react';
import { BarChart3, Table, PoundSterling, ChevronRight } from 'lucide-react';
import type { EnergyAsset, AssetType } from '@/data/assets';
import { assetTypeConfig } from '@/data/assetTypes';
import type { HighlightTarget } from './FilterPanel';
import { submaps } from '@/data/submaps';
import { ETIHAD_SITES } from '@/data/etihadSites';
import { CFA_SITES } from '@/data/cfaSites';
import { loadAllPanelInfo, panelInfoFor, savePanelInfo } from '@/data/panelInfo';
import { energyForName } from '@/data/energyData';
import { groupsForSubmap } from '@/data/siteAssetGroups';
import { VIEW_ONLY } from '@/viewOnly';

// Each campus has a canonical set of sites (its chooser entries) which is the
// list shown in the Legend. Sub-maps without a chooser fall back to whatever
// stickers are placed on them.
const SITES_BY_SUBMAP: Record<string, { id: string; label: string }[]> = {
  'etihad-stadium-map': ETIHAD_SITES.map((s) => ({ id: s.id, label: s.name })),
  'cfa-map': CFA_SITES.map((s) => ({ id: s.id, label: s.name })),
};

interface LegendProps {
  // Placed assets grouped by the view (sub-map) they sit on.
  stickersByView: Record<string, { id: string; label: string }[]>;
  // Optional "View as chart" trigger rendered as a footer button so it sits
  // directly under the assets list (top-left of the map).
  onOpenChart?: () => void;
  // Optional "Energy data" trigger — opens the bottom data drawer from the
  // same top-left footer, next to the chart button.
  onOpenData?: () => void;
  // Optional "Savings" trigger — opens the 25-year savings summary modal.
  onOpenSavings?: () => void;
  // When true, render as an in-flow sidebar panel (no absolute positioning),
  // so it can live in the off-map dashboard column rather than overlaying it.
  embedded?: boolean;
  // Proximity index: infrastructure assets grouped under each site id. When
  // provided, a site with assets becomes expandable to list them, with
  // hover-to-highlight and click-to-open on the map.
  siteAssets?: Record<string, EnergyAsset[]>;
  onHoverAsset?: (h: HighlightTarget | null) => void;
  onSelectAsset?: (a: EnergyAsset) => void;
  // Open a whole-site info panel (used for sites that have their own energy
  // series but no grouped infrastructure, e.g. Etihad Towers / City At Home /
  // Etihad Walkways). Clicking the label opens the standard consumption panel.
  onSelectSite?: (site: { id: string; name: string }) => void;
  // Restrict the list to a single sub-map (used by the sub-map dashboards, so
  // each submap shows only its own sites/groups).
  onlySubmap?: string;
}

// Campus asset legend — lists every placed asset, grouped by sub-map area
// (Etihad Stadium / City Football Academy / Co-op Live). In the editor, click
// any entry to rename it; the new name applies everywhere that asset shows
// (its info panel too). The published view-only build is read-only.
export function Legend({ stickersByView, onOpenChart, onOpenData, onOpenSavings, embedded = false, siteAssets, onHoverAsset, onSelectAsset, onSelectSite, onlySubmap }: LegendProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const toggleSite = (id: string) =>
    setExpandedSites((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const overrides = loadAllPanelInfo();

  const startEdit = (id: string, label: string) => {
    setDraft(label);
    setEditingId(id);
  };
  const commit = (id: string) => {
    savePanelInfo(id, { ...panelInfoFor(id), title: draft.trim() || undefined });
    setEditingId(null);
  };

  return (
    <div
      data-testid="legend"
      onClick={(e) => e.stopPropagation()}
      // Responsive: shrink the panel on narrow screens so it leaves more
      // room for the map. Hidden entirely below ~480 px (hidden xs:block —
      // use the legend toggle button to show it). The panel is now a
      // flex column so the assets list can scroll internally while the
      // "View as chart" footer stays pinned at the bottom.
      className={embedded
        ? 'flex-1 flex flex-col w-full min-h-0'
        : 'hidden xs:flex flex-col absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg min-w-[140px] sm:min-w-[170px] max-w-[180px] sm:max-w-[230px] max-h-[78%] text-[10px] sm:text-xs overflow-hidden'}
    >
      {/* Embedded: the "Assets" title sits OUTSIDE the card (matching the
          Infrastructure Index), and the list + footer live inside the card. */}
      {embedded && (
        <p className="shrink-0 text-[13px] font-bold text-gray-700 uppercase tracking-wide mb-2 leading-none">Assets</p>
      )}
      <div className={embedded
        ? 'flex-1 min-h-0 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm text-[10px] sm:text-xs overflow-hidden'
        : 'contents'}>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3">
      {!embedded && (
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 leading-none">Assets</p>
      )}
      <div className={embedded ? 'flex flex-col gap-8' : 'space-y-2.5'}>
        {submaps.filter((sm) => !onlySubmap || sm.id === onlySubmap).map((sm) => {
          const baseSites = SITES_BY_SUBMAP[sm.id] ?? (stickersByView[sm.id] ?? []);
          const baseIds = new Set(baseSites.map((s) => s.id));
          // Add the functional groups (Ground Mount, Substation) that aren't a
          // base site, so they show as extra entries in the Assets list.
          const extra = groupsForSubmap(sm.id)
            .filter((g) => !baseIds.has(g.id))
            .map((g) => ({ id: g.id, label: g.name }));
          const items = [...baseSites, ...extra]
            .map((it) => {
              const label = overrides[it.id]?.title ?? it.label;
              return { id: it.id, label, count: siteAssets?.[it.id]?.length ?? 0, isSub: label.toLowerCase() === 'substation' };
            })
            // Order: most infrastructure first; Substation pinned to the bottom.
            .sort((a, b) => (a.isSub !== b.isSub) ? (a.isSub ? 1 : -1)
              : (b.count !== a.count) ? (b.count - a.count)
              : a.label.localeCompare(b.label));
          return (
            <div key={sm.id}>
              <p className="text-[13px] font-bold text-gray-800 mb-2 pb-1 border-b-2 border-gray-200 leading-tight">
                {sm.name}
              </p>
              {items.length > 0 ? (
                <ul className="space-y-0.5 pl-2 border-l border-gray-200">
                  {items.map((it) => {
                    const grouped = siteAssets?.[it.id] ?? [];
                    const canExpand = grouped.length > 0 && !!onHoverAsset;
                    const isExp = expandedSites.has(it.id);
                    // A site with its own energy series but no grouped assets
                    // becomes a one-click panel (its label opens the info panel).
                    const canOpenPanel = !canExpand && !!onSelectSite && !!energyForName(it.label);
                    return (
                    <li key={it.id} className="pl-1.5">
                      {editingId === it.id ? (
                        <input
                          data-testid={`legend-edit-${it.id}`}
                          value={draft}
                          autoFocus
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commit(it.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commit(it.id);
                            else if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full text-xs text-gray-800 border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      ) : canExpand ? (
                        <>
                          <div
                            data-testid={`legend-site-${it.id}`}
                            className="flex items-center gap-1 rounded px-1 -mx-1 hover:bg-blue-50/70 cursor-pointer"
                            onMouseEnter={() => onHoverAsset!({ ids: grouped.map((a) => a.id) })}
                            onMouseLeave={() => onHoverAsset!(null)}
                            onClick={() => toggleSite(it.id)}
                          >
                            <span className="flex-1 min-w-0 text-xs text-gray-700 font-medium leading-snug truncate">{it.label}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">({grouped.length})</span>
                            <ChevronRight size={11} className={`shrink-0 text-gray-400 transition-transform ${isExp ? 'rotate-90' : ''}`} />
                          </div>
                          {isExp && (
                            <ul className="ml-2 mt-0.5 mb-1 space-y-0.5 border-l border-gray-200 pl-2">
                              {grouped.map((a) => {
                                // Colour + icon come from the asset's map type, so
                                // each row is recognisable at a glance (e.g. an
                                // inverter shows a purple plug on a light-purple bar).
                                const et = (a.idno ? 'idno' : a.type) as AssetType;
                                const cfg = assetTypeConfig[et];
                                // Under a site dropdown the location is already
                                // implied, so drop the site prefix from solar
                                // arrays ("Hotel Solar Array" → "Solar Array").
                                const full = panelInfoFor(a.id).title ?? a.name;
                                const short = full.endsWith('Solar Array') ? 'Solar Array' : full;
                                return (
                                <li key={a.id}>
                                  <button
                                    type="button"
                                    onMouseEnter={() => onHoverAsset!({ id: a.id })}
                                    onMouseLeave={() => onHoverAsset!(null)}
                                    onClick={() => onSelectAsset?.(a)}
                                    className="w-full flex items-center gap-1.5 text-left text-[11px] font-medium text-gray-700 rounded px-1.5 py-1 transition-all hover:brightness-95"
                                    style={cfg ? { backgroundColor: cfg.color + '14' } : undefined}
                                    title={full}
                                  >
                                    {cfg && (
                                      <span className="shrink-0 w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: cfg.color + '2b' }}>
                                        <cfg.Icon size={10} style={{ color: cfg.color }} />
                                      </span>
                                    )}
                                    <span className="truncate">{short}</span>
                                  </button>
                                </li>
                                );
                              })}
                            </ul>
                          )}
                        </>
                      ) : canOpenPanel ? (
                        <button
                          type="button"
                          data-testid={`legend-site-panel-${it.id}`}
                          onClick={() => onSelectSite!({ id: it.id, name: it.label })}
                          onMouseEnter={() => onHoverAsset?.({ stickerName: it.label })}
                          onMouseLeave={() => onHoverAsset?.(null)}
                          title={`Open ${it.label} panel`}
                          className="w-full flex items-center gap-1 text-left rounded px-1 -mx-1 hover:bg-blue-50/70 transition-colors group"
                        >
                          <span className="flex-1 min-w-0 text-xs text-gray-700 font-medium leading-snug truncate">{it.label}</span>
                          <ChevronRight size={11} className="shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </button>
                      ) : (
                        <span
                          onClick={VIEW_ONLY ? undefined : () => startEdit(it.id, it.label)}
                          title={VIEW_ONLY ? undefined : 'Click to rename'}
                          className={`block text-xs text-gray-600 leading-snug${VIEW_ONLY ? '' : ' cursor-pointer hover:text-indigo-600 transition-colors'}`}
                        >
                          {it.label}
                        </span>
                      )}
                    </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[11px] text-gray-400 pl-2">No assets yet</p>
              )}
            </div>
          );
        })}
      </div>
      </div>
      {onOpenChart && (
        <button
          type="button"
          data-testid="btn-open-chart"
          onClick={onOpenChart}
          className="shrink-0 border-t border-amber-600/30 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs px-3 py-2.5 flex items-center justify-center gap-1.5 transition-colors"
          title="View the consumption vs generation breakdown as a stacked bar chart."
        >
          <BarChart3 size={14} className="shrink-0" />
          View as chart ↗
        </button>
      )}
      {onOpenData && (
        <button
          type="button"
          data-testid="btn-open-data"
          onClick={onOpenData}
          className="shrink-0 border-t border-emerald-600/20 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-3 py-2.5 flex items-center justify-center gap-1.5 transition-colors"
          title="Open the consumption & generation data table (half-hourly totals per site)."
        >
          <Table size={14} className="shrink-0" />
          Energy data ↗
        </button>
      )}
      {onOpenSavings && (
        <button
          type="button"
          data-testid="btn-open-savings"
          onClick={onOpenSavings}
          className="shrink-0 border-t border-blue-700/30 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2.5 flex items-center justify-center gap-1.5 transition-colors"
          title="Open the 25-year savings summary across all solar assets."
        >
          <PoundSterling size={14} className="shrink-0" />
          Savings ↗
        </button>
      )}
      </div>
    </div>
  );
}
