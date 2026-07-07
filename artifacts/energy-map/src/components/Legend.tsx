import { useState } from 'react';
import { submaps } from '@/data/submaps';
import { ETIHAD_SITES } from '@/data/etihadSites';
import { CFA_SITES } from '@/data/cfaSites';
import { loadAllPanelInfo, panelInfoFor, savePanelInfo } from '@/data/panelInfo';
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
}

// Campus asset legend — lists every placed asset, grouped by sub-map area
// (Etihad Stadium / City Football Academy / Co-op Live). In the editor, click
// any entry to rename it; the new name applies everywhere that asset shows
// (its info panel too). The published view-only build is read-only.
export function Legend({ stickersByView }: LegendProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
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
      // use the legend toggle button to show it).
      className="hidden xs:block absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-2 sm:p-3 min-w-[140px] sm:min-w-[170px] max-w-[180px] sm:max-w-[230px] max-h-[78%] overflow-y-auto text-[10px] sm:text-xs"
    >
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 leading-none">
        Assets
      </p>
      <div className="space-y-2.5">
        {submaps.map((sm) => {
          const source = SITES_BY_SUBMAP[sm.id] ?? (stickersByView[sm.id] ?? []);
          const items = source
            .map((it) => ({ id: it.id, label: overrides[it.id]?.title ?? it.label }))
            .sort((a, b) => a.label.localeCompare(b.label));
          return (
            <div key={sm.id}>
              <p className="text-[11px] font-bold text-gray-800 mb-1 leading-tight">
                {sm.name}
              </p>
              {items.length > 0 ? (
                <ul className="space-y-0.5 pl-2 border-l border-gray-200">
                  {items.map((it) => (
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
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-gray-400 pl-2">No assets yet</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
