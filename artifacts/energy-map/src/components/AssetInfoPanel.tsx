import { useRef, useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Zap, Leaf, BarChart3, ImagePlus, ImageOff, Trash2, Pencil, Download } from 'lucide-react';
import { fileToPhotoDataUrl, saveStickerPhotos } from '@/data/stickerLibrary';
import type { AssetPanelItem } from '@/data/stickerLibrary';
import { VIEW_ONLY } from '@/viewOnly';
import { energyForName, energyTotal } from '@/data/energyData';
import { savingsForName } from '@/data/savingsData';
import { panelInfoFor, savePanelInfo, PanelInfo } from '@/data/panelInfo';
import { dataSourcesFor } from '@/data/dataSourceMap';
import { MonthlyEnergyTable } from './MonthlyEnergyTable';
import { SolarPanelBody } from './SolarPanelBody';
import { HHDataModal } from './HHDataModal';

interface AssetInfoPanelProps {
  item: AssetPanelItem;
  onClose: () => void;
  // When set, a back arrow is shown (e.g. to return to the Etihad site chooser).
  onBack?: () => void;
}

// Google-Maps-style asset panel: a bottom sheet on mobile, a right-hand side
// panel on desktop. Shows an image carousel, the asset name, and (only when
// real data is provided) consumption / generation / view-data sections. In
// the editor (not the published view-only build) the user can upload/remove
// the panel photos. Sites without any data show a clean, blank body.
export function AssetInfoPanel({ item, onClose, onBack }: AssetInfoPanelProps) {
  const [idx, setIdx] = useState(0);
  const [photos, setPhotos] = useState<string[]>(item.photos);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Editable panel text (title + subtitle) — stored per asset id.
  const [info, setInfo] = useState<PanelInfo>(() => panelInfoFor(item.id));
  const [editingInfo, setEditingInfo] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [subtitleDraft, setSubtitleDraft] = useState('');
  const [narrativeDraft, setNarrativeDraft] = useState('');
  const [hhModal, setHhModal] = useState<{ url: string; label: string } | null>(null);

  // Reset photo list + carousel + panel text when a different asset's panel opens.
  useEffect(() => {
    setPhotos(item.photos);
    setIdx(0);
    setInfo(panelInfoFor(item.id));
    setEditingInfo(false);
    setHhModal(null);
  }, [item.id]);

  // What the carousel shows: real photos if any, otherwise the sticker graphic.
  // Markers / cable labels have no graphic — they show an empty banner instead.
  const displayImages = photos.length ? photos : (item.fallbackImage ? [item.fallbackImage] : []);
  const hasMultiple = displayImages.length > 1;
  const safeIdx = Math.min(idx, Math.max(0, displayImages.length - 1));
  const showingRealPhoto = photos.length > 0;

  // Editable panel title / subtitle — fall back to the asset name / a default.
  const displayTitle = info.title ?? item.name;
  const displaySubtitle = info.subtitle ?? 'Campus asset';
  // Optional narrative — when set it replaces the placeholder data cards.
  const narrative = info.narrative;

  // Real campus energy data for this asset, if any (keyed by its map name).
  // When present it drives the headline figures and the monthly table below;
  // a metric the building does not record shows "—" rather than a placeholder.
  const energy = energyForName(displayTitle);
  const hasEnergy = !!energy && (!!energy.consumption || !!energy.generation);
  // Solar sites (those with 25-year savings data) render the SAME tabbed
  // Generation + Savings body as their Solar Array marker, so a building blob
  // and its solar array panel are practically identical.
  const solarSite = !!savingsForName(displayTitle);

  // Real-data only — no placeholder figures. If a metric isn't recorded for
  // this asset we leave the card off entirely, so panels for sites without
  // data stay clean and blank.
  const consumption = energy?.consumption
    ? energyTotal(energy.consumption).toLocaleString('en-GB') + ' kWh'
    : item.consumption;
  const generation = energy?.generation
    ? energyTotal(energy.generation).toLocaleString('en-GB') + ' kWh'
    : item.generation;
  const hasData = !!consumption || !!generation;

  const startEditingInfo = () => {
    setTitleDraft(displayTitle);
    setSubtitleDraft(displaySubtitle);
    setNarrativeDraft(info.narrative ?? '');
    setEditingInfo(true);
  };

  const handleSaveInfo = () => {
    const next: PanelInfo = {
      title: titleDraft.trim() || undefined,
      subtitle: subtitleDraft.trim() || undefined,
      narrative: narrativeDraft.trim() || undefined,
    };
    savePanelInfo(item.id, next);
    setInfo(next);
    setEditingInfo(false);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    let next = photos;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        next = [...next, await fileToPhotoDataUrl(file)];
      } catch { /* skip unreadable file */ }
    }
    setPhotos(next);
    saveStickerPhotos(item.id, next);
    setIdx(Math.max(0, next.length - 1));
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemove = () => {
    if (!photos.length) return;
    const next = photos.filter((_, i) => i !== safeIdx);
    setPhotos(next);
    saveStickerPhotos(item.id, next);
    setIdx((i) => Math.max(0, Math.min(i, next.length - 1)));
  };

  return (
    <>
      <style>{`
        @keyframes asset-panel-in { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @media (min-width: 640px) {
          @keyframes asset-panel-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        }
      `}</style>

      {/* Dimmed backdrop — mobile only; desktop keeps the map interactive */}
      <div
        className="fixed inset-0 z-[89] bg-black/40 sm:hidden"
        onClick={onClose}
      />

      <div
        data-testid="asset-info-panel"
        className="fixed z-[90] flex flex-col bg-white shadow-2xl overflow-hidden
                   inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl
                   sm:inset-x-auto sm:left-auto sm:right-0 sm:top-0 sm:bottom-0
                   sm:w-[400px] sm:max-h-none sm:rounded-t-none sm:border-l sm:border-gray-200"
        style={{ animation: 'asset-panel-in 0.28s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag-handle affordance (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Image area / carousel */}
        <div className="relative shrink-0 h-48 sm:h-60 bg-gray-100">
          {displayImages.length > 0 ? (
            <img
              src={displayImages[safeIdx]}
              alt={item.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-gray-400">
              <ImageOff size={26} />
              <span className="text-xs">{VIEW_ONLY ? 'No photo' : 'No photo yet. Use "Add photo".'}</span>
            </div>
          )}

          {hasMultiple && (
            <>
              <button
                onClick={() => setIdx((i) => (i - 1 + displayImages.length) % displayImages.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm shadow flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setIdx((i) => (i + 1) % displayImages.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm shadow flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                aria-label="Next image"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
                {displayImages.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === safeIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                  />
                ))}
              </div>
            </>
          )}

          {onBack && (
            <button
              data-testid="asset-info-back"
              onClick={onBack}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
              aria-label="Back to chooser"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <button
            data-testid="asset-info-close"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {/* Photo manager — editor only, hidden on the published view-only site */}
          {!VIEW_ONLY && (
            <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <button
                data-testid="asset-photo-add"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm shadow text-[11px] font-semibold text-gray-700 hover:bg-white transition-colors disabled:opacity-60"
              >
                <ImagePlus size={13} />
                {busy ? 'Adding…' : 'Add photo'}
              </button>
              {showingRealPhoto && (
                <button
                  data-testid="asset-photo-remove"
                  onClick={handleRemove}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm shadow text-[11px] font-semibold text-red-600 hover:bg-white transition-colors"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {editingInfo ? (
            <div className="space-y-2">
              <input
                data-testid="asset-info-title-input"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Asset name"
                className="w-full text-lg font-bold text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                data-testid="asset-info-subtitle-input"
                value={subtitleDraft}
                onChange={(e) => setSubtitleDraft(e.target.value)}
                placeholder="Subtitle, e.g. Etihad Campus asset"
                className="w-full text-xs text-gray-600 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <textarea
                data-testid="asset-info-narrative-input"
                value={narrativeDraft}
                onChange={(e) => setNarrativeDraft(e.target.value)}
                placeholder="Narrative / description (optional). Shown instead of the data cards."
                rows={4}
                className="w-full text-xs text-gray-600 border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
              />
              <div className="flex gap-2 pt-0.5">
                <button
                  data-testid="asset-info-save"
                  onClick={handleSaveInfo}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingInfo(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{displayTitle}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{displaySubtitle}</p>
              </div>
              {!VIEW_ONLY && (
                <button
                  data-testid="asset-info-edit"
                  onClick={startEditingInfo}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-gray-500 text-[11px] font-semibold hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  title="Edit name & subtitle"
                >
                  <Pencil size={11} />
                  Edit
                </button>
              )}
            </div>
          )}

          {hasData && !solarSite && (
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {consumption && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <Zap size={13} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">Consumption</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-1.5 leading-tight">{consumption}</p>
                </div>
              )}
              {generation && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                  <div className="flex items-center gap-1.5 text-green-600">
                    <Leaf size={13} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">Generation</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-1.5 leading-tight">{generation}</p>
                </div>
              )}
            </div>
          )}
          {/* 12-month disclaimer — only shown when a Generation card is on the
              panel. Applies to every generation series in the map: Phase 1
              actuals are truncated to Jan-Dec 2025; modelled generation series
              are 12-month annuals as supplied. */}
          {generation && !solarSite && (
            <p className="text-[10px] text-gray-400 italic mt-1.5">
              Generation total is a 12-month figure (Jul 2025 to Jun 2026 for metered actuals; 12-month annual for modelled).
            </p>
          )}

          {/* Solar sites: the full tabbed Generation + Savings body, identical
              to the Solar Array marker's panel. */}
          {solarSite && <SolarPanelBody name={displayTitle} />}

          {narrative && (
            <p
              data-testid="asset-info-narrative"
              className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mt-4"
            >
              {narrative}
            </p>
          )}

          {energy && !solarSite && <MonthlyEnergyTable energy={energy} name={displayTitle} />}

          {/* Raw HH data viewer trigger — one button per series. When an
              asset has both consumption AND generation (Hotel, Commercial,
              MCWFC, Co-op Live) the user gets BOTH buttons, so neither
              series is hidden behind the other. */}
          {!solarSite && (() => {
            const entry = dataSourcesFor(displayTitle);
            if (!entry) return null;
            const buttons: { kind: 'Consumption' | 'Generation'; url: string; label: string }[] = [];
            if (entry.consumption) buttons.push({ kind: 'Consumption', url: entry.consumption.url, label: entry.consumption.label });
            if (entry.generation) buttons.push({ kind: 'Generation', url: entry.generation.url, label: entry.generation.label });
            if (buttons.length === 0) return null;
            return (
              <div className="mt-4 flex flex-col gap-2">
                {buttons.map((b) => (
                  <button
                    key={b.kind}
                    type="button"
                    data-testid={`asset-info-view-hh-${b.kind.toLowerCase()}`}
                    onClick={() => setHhModal({ url: b.url, label: b.label })}
                    title={b.label}
                    className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      b.kind === 'Consumption'
                        ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300'
                        : 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-300'
                    }`}
                  >
                    <Download size={13} />
                    View raw HH {b.kind.toLowerCase()} data
                    <span className={`text-[10px] font-normal truncate max-w-[160px] ${
                      b.kind === 'Consumption' ? 'text-amber-700' : 'text-green-700'
                    }`}>{b.url.split('/').pop()}</span>
                  </button>
                ))}
              </div>
            );
          })()}

          {item.viewDataUrl && (
            <button
              data-testid="asset-info-view-data"
              onClick={() => window.open(item.viewDataUrl, '_blank', 'noopener')}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <BarChart3 size={15} />
              View Data
            </button>
          )}
        </div>
      </div>

      {/* HH data viewer modal — opens the exact series the user clicked
          (consumption OR generation) rather than a default. */}
      {hhModal && (
        <HHDataModal
          url={hhModal.url}
          title={displayTitle}
          subtitle={hhModal.label}
          onClose={() => setHhModal(null)}
        />
      )}
    </>
  );
}
