import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Pencil, Upload, ImagePlus, Download, ChevronLeft, ChevronRight, Plug, Zap, PiggyBank } from 'lucide-react';
import { EnergyAsset } from '@/data/assets';
import { assetTypeConfig } from '@/data/assetTypes';
import { VIEW_ONLY } from '@/viewOnly';
import { energyForName, energyTotal, energyMonthLabel } from '@/data/energyData';
import { savingsForName, savingsTotal, SAVINGS_METHODOLOGY, SAVINGS_METHODOLOGY_FULL } from '@/data/savingsData';
import { inverterColumnsFor, invColMonthlyTotal } from '@/data/inverterGenData';
import { panelInfoFor, savePanelInfo, PanelInfo } from '@/data/panelInfo';
import { equipmentSpecsFor, hasAnySpec } from '@/data/equipmentSpecs';
import { dataSourcesFor } from '@/data/dataSourceMap';
import { loadStickerPhotos, saveStickerPhotos, fileToPhotoDataUrl } from '@/data/stickerLibrary';
import { MonthlyEnergyTable } from './MonthlyEnergyTable';
import { HHDataModal } from './HHDataModal';

interface SidePanelProps {
  asset: EnergyAsset | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  // Projected sub-map assets shown on the overview can't be deleted here —
  // deletion happens on the asset's own sub-map.
  hideDelete?: boolean;
}

function fmt(n: number | undefined) {
  if (n === undefined) return 'n/a';
  return n.toLocaleString('en-GB') + ' kWh';
}

// A solar array shows its building's photo (from the site's photo store) when it
// has no photo of its own. Maps the array's name to the building-site photo id.
const ARRAY_IMAGE_SITE: Record<string, string> = {
  'Joie Stadium Solar Array': 'cfa-site-joie-stadium',
  'Indoor Pitch Solar Array': 'cfa-site-indoor-pitch',
  'FM Building Solar Array': 'cfa-site-fm-building',
  'TV Studio Solar Array': 'cfa-site-tv-studio',
  'MCWFC Solar': 'cfa-site-womens-facility',
  'Hotel Solar Array': 'etihad-site-hotel',
  'Commercial Building Solar Array': 'etihad-site-commercial',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value}</p>
    </div>
  );
}

export function SidePanel({ asset, onClose, onDelete, hideDelete = false }: SidePanelProps) {
  const isOpen = !!asset;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [info, setInfo] = useState<PanelInfo>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [narrativeDraft, setNarrativeDraft] = useState('');
  // Active HH-data modal: holds the URL + label of the source being viewed,
  // or null when closed. We can have up to two sources per asset (consumption
  // + generation) so a boolean isn't enough.
  const [hhModal, setHhModal] = useState<{ url: string; label: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Multi-photo carousel — used by substations (and any other marker type
  // that supports image uploads). Photos live in the same per-asset photo
  // store as building stickers (energy-map-sticker-photos).
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const carouselFileRef = useRef<HTMLInputElement>(null);
  // Generation | Savings tab (solar arrays). Resets to Generation per asset.
  const [tab, setTab] = useState<'generation' | 'savings'>('generation');
  const [showMethodology, setShowMethodology] = useState(false);
  // Inverter panel: 0 = Total/Summary, 1..N = individual inverter columns.
  const [invTab, setInvTab] = useState(0);

  // Reset state whenever a different marker is opened/closed.
  useEffect(() => {
    setConfirmingDelete(false);
    setHhModal(null);
    setInfo(asset ? panelInfoFor(asset.id) : {});
    setEditingTitle(false);
    setTab('generation');
    setInvTab(0);
    // Load this asset's stored photos for the carousel.
    if (asset) {
      const store = loadStickerPhotos();
      const own = store[asset.id] ?? [];
      // Fall back to the building's image when the array has none of its own.
      const fbId = own.length === 0 ? ARRAY_IMAGE_SITE[asset.name] : undefined;
      const arr = own.length ? own : (fbId ? (store[fbId] ?? []) : []);
      setPhotos(arr);
      setPhotoIdx(0);
    } else {
      setPhotos([]);
      setPhotoIdx(0);
    }
  }, [asset?.id]);

  return (
    <>
      {isOpen && (
        <div
          data-testid="side-panel-overlay"
          className="fixed inset-0 z-40 bg-black/10"
          onClick={onClose}
        />
      )}
      <div
        data-testid="side-panel"
        className="fixed top-0 right-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: 480,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {asset && (() => {
          const cfg = assetTypeConfig[asset.type];
          const { Icon } = cfg;
          // Editable panel title — overrides the marker name for display.
          const displayTitle = info.title ?? asset.name;
          // Real campus energy data for this marker, if any (keyed by name).
          // Every 'tower' marker shares the single Etihad Towers dataset.
          const energyName = asset.type === 'tower' ? 'Etihad Towers' : displayTitle;
          const energy = energyForName(energyName);
          const genValue = energy?.generation ? energyTotal(energy.generation) : asset.generation_kwh;
          const consValue = energy?.consumption ? energyTotal(energy.consumption) : asset.consumption_kwh;
          const narrative = info.narrative;
          const startEditingTitle = () => {
            setTitleDraft(displayTitle);
            setNarrativeDraft(info.narrative ?? '');
            setEditingTitle(true);
          };
          const handleSaveTitle = () => {
            const next: PanelInfo = {
              ...info,
              title: titleDraft.trim() || undefined,
              narrative: narrativeDraft.trim() || undefined,
            };
            savePanelInfo(asset.id, next);
            setInfo(next);
            setEditingTitle(false);
          };
          // Battery markers show just a title and a photo — no energy figures.
          const isBattery = asset.type === 'battery';
          // Substations also support an uploaded panel photo, but they DO have
          // meter data, so the image sits ABOVE the data fields rather than
          // replacing them.
          const isSubstation = asset.type === 'substation';
          const showsImageUpload = isBattery || isSubstation;
          // Photo carousel — substations + solar arrays only (e.g. the Ground
          // Mount Array shots). Inverters/meters have no photos, so they get a
          // clean dashboard summary (count + status) instead.
          const showsPhotos = isSubstation || asset.type === 'solar-panel';
          const isInverter = asset.type === 'inverter';
          const qty = asset.quantity ?? 1;
          // Build status (built vs proposed) for solar/meter/inverter markers.
          const showStatus = asset.type === 'solar-panel' || asset.type === 'inverter' || asset.type === 'meter-behind' || asset.type === 'meter-front';
          const status: 'built' | 'proposed' = info.status ?? 'built';
          const changeStatus = (s: 'built' | 'proposed') => {
            const next: PanelInfo = { ...info, status: s };
            savePanelInfo(asset.id, next);
            setInfo(next);
          };
          // Solar arrays get Generation | Savings tabs.
          const showTabs = asset.type === 'solar-panel';
          const savings = savingsForName(displayTitle);
          const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const next: PanelInfo = { ...info, image: reader.result as string };
              savePanelInfo(asset.id, next);
              setInfo(next);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          };
          const handleRemoveImage = () => {
            const next: PanelInfo = { ...info, image: undefined };
            savePanelInfo(asset.id, next);
            setInfo(next);
          };
          return (
            <>
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center rounded-lg shrink-0"
                    style={{ width: 40, height: 40, background: cfg.color }}
                  >
                    <Icon size={20} className="text-white" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: cfg.color }}>
                      {cfg.label}
                    </p>
                    {editingTitle ? (
                      <div className="mt-0.5">
                        <input
                          data-testid="side-panel-title-input"
                          value={titleDraft}
                          onChange={(e) => setTitleDraft(e.target.value)}
                          placeholder="Marker name"
                          className="w-full text-base font-bold text-gray-900 border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-2 mb-1">
                          Narrative
                        </label>
                        <textarea
                          data-testid="side-panel-narrative-input"
                          value={narrativeDraft}
                          onChange={(e) => setNarrativeDraft(e.target.value)}
                          placeholder="Optional description shown when there's no energy data"
                          rows={4}
                          className="w-full text-xs text-gray-700 border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                        />
                        <div className="flex gap-1.5 mt-1">
                          <button
                            data-testid="side-panel-title-save"
                            onClick={handleSaveTitle}
                            className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTitle(false)}
                            className="px-2.5 py-1 rounded border border-gray-300 text-gray-600 text-[11px] font-semibold hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{displayTitle}</h2>
                        {!VIEW_ONLY && (
                          <button
                            data-testid="side-panel-title-edit"
                            onClick={startEditingTitle}
                            title="Edit name"
                            className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  data-testid="side-panel-close"
                  onClick={onClose}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-4 mt-0.5"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {showStatus && (
                  <div data-testid="side-panel-status" className="mb-5 flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Status</span>
                    {VIEW_ONLY ? (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status === 'built' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 border border-dashed border-amber-400'}`}>
                        {status === 'built' ? 'Built' : 'In build'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                          data-testid="side-panel-status-built"
                          onClick={() => changeStatus('built')}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${status === 'built' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}
                        >Built</button>
                        <button
                          data-testid="side-panel-status-proposed"
                          onClick={() => changeStatus('proposed')}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${status === 'proposed' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}
                        >In build</button>
                      </span>
                    )}
                  </div>
                )}
                {isInverter && (
                  <div data-testid="side-panel-inverter-count" className="mb-5 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        <Plug size={20} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-widest">Inverters at this location</p>
                        <p className="text-3xl font-extrabold text-purple-900 leading-none mt-0.5">{qty}</p>
                      </div>
                    </div>
                  </div>
                )}
                {isInverter && (() => {
                  const cols = inverterColumnsFor(asset.name);
                  if (!cols.length) {
                    return (
                      <div data-testid="inverter-gen" className="mb-6 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-gray-500">No inverter columns mapped yet</p>
                        <p className="text-xs text-gray-400 mt-1">Tell me which roof columns feed this inverter and I'll wire them in.</p>
                      </div>
                    );
                  }
                  const nMonths = cols[0].values.length;
                  const startIdx = cols[0].startIndex;
                  const totalVals = Array.from({ length: nMonths }, (_, i) => cols.reduce((s, c) => s + (c.values[i] || 0), 0));
                  // A single-column inverter has nothing to sum, so skip the
                  // Total tab entirely and just show that one column.
                  const singleCol = cols.length === 1;
                  const idx = singleCol ? 1 : Math.min(invTab, cols.length);
                  const isTotal = idx === 0;
                  const shown = isTotal ? { name: `All ${cols.length} inverters combined`, values: totalVals } : cols[idx - 1];
                  const shownTotal = shown.values.reduce((a, b) => a + (b || 0), 0);
                  return (
                    <div data-testid="inverter-gen" className="mb-6">
                      {!singleCol && (
                      <div className="flex gap-1 mb-3 overflow-x-auto pb-1 border-b border-gray-200">
                        <button
                          data-testid="inv-tab-total"
                          onClick={() => setInvTab(0)}
                          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap -mb-px border-b-2 transition-colors ${isTotal ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                        >Total</button>
                        {cols.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => setInvTab(i + 1)}
                            title={c.name}
                            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap -mb-px border-b-2 transition-colors ${idx === i + 1 ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                          >Inv {i + 1}</button>
                        ))}
                      </div>
                      )}
                      <div className="mb-3 rounded-lg bg-purple-50 border border-purple-100 px-4 py-3">
                        <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-widest mb-0.5">Generation</p>
                        <p className="text-2xl font-bold text-purple-800">{shownTotal.toLocaleString('en-GB')} kWh</p>
                        <p className="text-[11px] text-purple-600/80 mt-0.5">{shown.name}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 align-top">
                              <th className="text-left px-3 py-2 font-semibold text-gray-500">Month</th>
                              <th className="text-right px-3 py-2 whitespace-nowrap">
                                <span className="font-semibold text-purple-600">Generation</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {shown.values.map((v, i) => (
                              <tr key={i} className={i % 2 ? 'bg-gray-50/60' : ''}>
                                <td className="px-3 py-1 text-gray-600 whitespace-nowrap">{energyMonthLabel(i + startIdx)}</td>
                                <td className="px-3 py-1 text-right font-mono text-gray-800">{(v || 0).toLocaleString('en-GB')} kWh</td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-gray-200 bg-gray-100 font-bold">
                              <td className="px-3 py-2 text-gray-700">Total</td>
                              <td className="px-3 py-2 text-right font-mono text-gray-900">{shownTotal.toLocaleString('en-GB')} kWh</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <a
                        href="data/Generation_Phase1_All_Sites_HH.xlsx"
                        download
                        className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors"
                      >
                        <Download size={14} />
                        Download full generation spreadsheet
                      </a>
                    </div>
                  );
                })()}
                {isBattery && (
                  /* Battery panel image — kept as the simple single-photo
                     upload it's always been. */
                  <div>
                    {info.image ? (
                      <img
                        data-testid="battery-panel-image"
                        src={info.image}
                        alt={displayTitle}
                        className="w-full rounded-lg border border-gray-200 object-cover"
                      />
                    ) : (
                      <div
                        data-testid="battery-panel-image-placeholder"
                        className="w-full rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50"
                        style={{ height: 260 }}
                      >
                        <div className="text-center px-4">
                          <div className="w-9 h-9 rounded-full bg-gray-200 mx-auto mb-2 flex items-center justify-center">
                            <ImagePlus size={16} className="text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">No image yet</p>
                          {!VIEW_ONLY && (
                            <p className="text-xs text-gray-400 mt-0.5">Upload a photo of this battery</p>
                          )}
                        </div>
                      </div>
                    )}

                    {!VIEW_ONLY && (
                      <div className="flex gap-2 mt-3">
                        <button
                          data-testid="battery-panel-upload"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Upload size={13} />
                          {info.image ? 'Change image' : 'Upload image'}
                        </button>
                        {info.image && (
                          <button
                            onClick={handleRemoveImage}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={13} />
                            Remove
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                )}

                {showsPhotos && (() => {
                  // Photo carousel. Photos live in the same per-asset
                  // store as building stickers (energy-map-sticker-photos)
                  // so the user can add multiple shots per substation and
                  // page through them.
                  const safeIdx = Math.min(photoIdx, Math.max(0, photos.length - 1));
                  const hasMultiple = photos.length > 1;
                  const handleAddPhoto = async (files: FileList | null) => {
                    if (!files || !files.length || !asset) return;
                    setPhotoBusy(true);
                    let next = photos;
                    for (const file of Array.from(files)) {
                      if (!file.type.startsWith('image/')) continue;
                      try {
                        next = [...next, await fileToPhotoDataUrl(file)];
                      } catch { /* skip unreadable file */ }
                    }
                    setPhotos(next);
                    saveStickerPhotos(asset.id, next);
                    setPhotoIdx(Math.max(0, next.length - 1));
                    setPhotoBusy(false);
                    if (carouselFileRef.current) carouselFileRef.current.value = '';
                  };
                  const handleRemovePhoto = () => {
                    if (!photos.length || !asset) return;
                    const next = photos.filter((_, i) => i !== safeIdx);
                    setPhotos(next);
                    saveStickerPhotos(asset.id, next);
                    setPhotoIdx((i) => Math.max(0, Math.min(i, next.length - 1)));
                  };
                  return (
                    <div className="mb-6">
                      <div className="relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200" style={{ height: 240 }}>
                        {photos.length > 0 ? (
                          <img
                            data-testid="substation-panel-image"
                            src={photos[safeIdx]}
                            alt={displayTitle}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        ) : (
                          <div
                            data-testid="substation-panel-image-placeholder"
                            className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-gray-400"
                          >
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                              <ImagePlus size={16} className="text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-500">No photos yet</p>
                            {!VIEW_ONLY && (
                              <p className="text-xs text-gray-400">Use "Add photo" to upload one or more shots of this substation</p>
                            )}
                          </div>
                        )}

                        {hasMultiple && (
                          <>
                            <button
                              data-testid="substation-photo-prev"
                              onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm shadow flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                              aria-label="Previous photo"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              data-testid="substation-photo-next"
                              onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm shadow flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                              aria-label="Next photo"
                            >
                              <ChevronRight size={16} />
                            </button>
                            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
                              {photos.map((_, i) => (
                                <span
                                  key={i}
                                  className={`h-1.5 rounded-full transition-all ${i === safeIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {!VIEW_ONLY && (
                        <div className="flex gap-2 mt-3">
                          <input
                            ref={carouselFileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleAddPhoto(e.target.files)}
                          />
                          <button
                            data-testid="substation-panel-upload"
                            onClick={() => carouselFileRef.current?.click()}
                            disabled={photoBusy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                          >
                            <ImagePlus size={13} />
                            {photoBusy ? 'Adding…' : 'Add photo'}
                          </button>
                          {photos.length > 0 && (
                            <button
                              data-testid="substation-photo-remove"
                              onClick={handleRemovePhoto}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} />
                              Remove
                            </button>
                          )}
                          <span className="ml-auto self-center text-[11px] text-gray-400 font-mono">
                            {photos.length > 0 ? `${safeIdx + 1} / ${photos.length}` : '0 photos'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {showTabs && (
                  <div data-testid="panel-tabs" className="flex gap-2 mb-4">
                    <button
                      data-testid="tab-generation"
                      onClick={() => setTab('generation')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'generation' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >Generation</button>
                    <button
                      data-testid="tab-savings"
                      onClick={() => setTab('savings')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'savings' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >Savings</button>
                  </div>
                )}
                {showTabs && tab === 'savings' && (
                  <div data-testid="savings-view" className="mb-6">
                    {savings ? (
                      <>
                        {/* Total at the TOP so it's visible without scrolling. Blue = savings. */}
                        <div className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-4 py-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <PiggyBank size={20} className="text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest">25-year total savings</p>
                              <p className="text-3xl font-extrabold text-blue-900 leading-none mt-0.5">{(savings.unit ?? '£')}{savingsTotal(savings).toLocaleString('en-GB')}</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed mb-2">{SAVINGS_METHODOLOGY}</p>
                        <button
                          data-testid="savings-methodology-link"
                          onClick={() => setShowMethodology(true)}
                          className="block mb-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                        >
                          Read the full methodology →
                        </button>
                        <a
                          data-testid="savings-download"
                          href="data/MCFC Solar Savings.xlsx"
                          download
                          className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        >
                          <Download size={13} />
                          Download savings spreadsheet
                        </a>
                        <h3 className="text-sm font-bold text-gray-800 mb-2">Year 1–25 savings</h3>
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200 align-top">
                                <th className="text-left px-3 py-2 font-semibold text-gray-500">Year</th>
                                <th className="text-right px-3 py-2 whitespace-nowrap">
                                  <span className="font-semibold text-blue-600">Savings</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {savings.years.map((v, i) => (
                                <tr key={i} className={i % 2 ? 'bg-gray-50/60' : ''}>
                                  <td className="px-3 py-1 text-gray-600 whitespace-nowrap">Year {i + 1}</td>
                                  <td className="px-3 py-1 text-right font-mono text-gray-800">{(savings.unit ?? '£')}{v.toLocaleString('en-GB')}</td>
                                </tr>
                              ))}
                              <tr className="border-t-2 border-gray-200 bg-gray-100 font-bold">
                                <td className="px-3 py-2 text-gray-700">Total</td>
                                <td className="px-3 py-2 text-right font-mono text-gray-900">{(savings.unit ?? '£')}{savingsTotal(savings).toLocaleString('en-GB')}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                        <p className="text-sm font-medium text-gray-500">No savings data yet</p>
                        <p className="text-xs text-gray-400 mt-1">Send me the savings figures and they'll appear on this tab.</p>
                      </div>
                    )}
                  </div>
                )}
                {(!showTabs || tab === 'generation') && !isBattery && (() => {
                  const hasEnergy = !!(energy && (energy.consumption || energy.generation));
                  const hasRealNumbers = genValue !== undefined || consValue !== undefined;
                  // Equipment register entry (diesel gens, CHPs) — show specs
                  // alongside the energy fields so the panel has the same info
                  // as the bottom Data Panel's infrastructure table.
                  const specs = equipmentSpecsFor(displayTitle);
                  const showSpecs = hasAnySpec(specs);
                  // If we have no real data for this marker, hide the empty
                  // Generation/Consumption placeholders and the HH preview
                  // block — the panel stays clean. Narrative (if any) shows
                  // in place; otherwise the panel below the header is blank.
                  // Equipment specs (if any) count as real content too, so
                  // diesel-gen / CHP markers still get a populated panel.
                  const hideDataPlaceholders = !hasEnergy && !hasRealNumbers && !showSpecs;
                  return (
                  <>
                    {!hideDataPlaceholders && (
                      <div className="mb-6">
                        {asset.mpan && <Field label="MPAN" value={<span className="font-mono">{asset.mpan}</span>} />}
                        {(hasEnergy || hasRealNumbers) && (
                          <>
                            {/* Green boxed generation total — mirrors the savings
                                design (savings is blue, generation is green). */}
                            {(genValue !== undefined || energy?.generation) ? (
                              <div className="mb-4 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-4 py-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <Zap size={20} className="text-emerald-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest">Generation</p>
                                    <p className="text-3xl font-extrabold text-emerald-900 leading-none mt-0.5">{fmt(genValue)}</p>
                                  </div>
                                </div>
                                <p className="text-[10px] text-emerald-500/90 italic mt-2.5">
                                  12-month figure (Jul 2025 to Jun 2026 for metered actuals; 12-month annual for modelled).
                                </p>
                              </div>
                            ) : (
                              <Field label="Generation" value={fmt(genValue)} />
                            )}
                            {/* Solar panels and wind turbines generate only — hide the Consumption field. */}
                            {asset.type !== 'solar-panel' && asset.type !== 'wind-turbine' && (
                              <Field label="Consumption" value={fmt(consValue)} />
                            )}
                          </>
                        )}
                        {asset.notes && <Field label="Notes" value={asset.notes} />}
                        {/* Equipment specs from the infrastructure register. */}
                        {showSpecs && specs!.make && <Field label="Make" value={specs!.make} />}
                        {showSpecs && specs!.engine && <Field label="Engine" value={specs!.engine} />}
                        {showSpecs && specs!.alternator && <Field label="Alternator" value={specs!.alternator} />}
                        {showSpecs && specs!.rating && <Field label="Rating" value={specs!.rating} />}
                      </div>
                    )}

                    {hasEnergy && (
                      <div className="mb-6">
                        <MonthlyEnergyTable energy={energy} name={energyName} />
                      </div>
                    )}

                    {/* Direct access to the raw HH source files. An asset
                        with both consumption and generation gets ONE BUTTON
                        EACH — clicking opens the modal with that specific
                        series, so a viewer can drill into either side. */}
                    {(() => {
                      const entry = dataSourcesFor(displayTitle);
                      if (!entry) return null;
                      const buttons: { kind: 'Consumption' | 'Generation'; url: string; label: string }[] = [];
                      if (entry.consumption) buttons.push({ kind: 'Consumption', url: entry.consumption.url, label: entry.consumption.label });
                      if (entry.generation) buttons.push({ kind: 'Generation', url: entry.generation.url, label: entry.generation.label });
                      if (buttons.length === 0) return null;
                      return (
                        <div className="mb-6 flex flex-col gap-2">
                          {buttons.map((b) => (
                            <button
                              key={b.kind}
                              type="button"
                              data-testid={`side-panel-view-hh-${b.kind.toLowerCase()}`}
                              onClick={() => setHhModal({ url: b.url, label: b.label })}
                              title={b.label}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                                b.kind === 'Consumption'
                                  ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300'
                                  : 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-300'
                              }`}
                            >
                              <Download size={13} />
                              View raw HH {b.kind.toLowerCase()} data
                              <span className={`text-[10px] font-normal truncate max-w-[200px] ${
                                b.kind === 'Consumption' ? 'text-amber-700' : 'text-green-700'
                              }`}>{b.url.split('/').pop()}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    {narrative && (
                      <p
                        data-testid="side-panel-narrative"
                        className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-6"
                      >
                        {narrative}
                      </p>
                    )}

                    {/* Half-hourly visualisation will render here once real HH
                        data is connected. Until then the section is hidden so
                        the panel stays clean. */}
                  </>
                  );
                })()}
              </div>

              {!VIEW_ONLY && !hideDelete && (
              <div className="border-t border-gray-100 px-6 py-4 shrink-0">
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-600 flex-1 leading-snug">
                      Remove <span className="font-semibold text-gray-800">{displayTitle}</span> from the map?
                    </p>
                    <button
                      data-testid="side-panel-delete-cancel"
                      onClick={() => setConfirmingDelete(false)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
                    >
                      Cancel
                    </button>
                    <button
                      data-testid="side-panel-delete-confirm"
                      onClick={() => onDelete(asset.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    data-testid="side-panel-delete"
                    onClick={() => setConfirmingDelete(true)}
                    className="flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete marker
                  </button>
                )}
              </div>
              )}
            </>
          );
        })()}
      </div>
      {/* HH data viewer modal — rendered at the panel root so it sits above
          everything (including the panel itself). The state holds the exact
          source the user clicked (consumption or generation). */}
      {showMethodology && (
        <div
          data-testid="methodology-modal"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowMethodology(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">Savings methodology</h3>
              <button
                onClick={() => setShowMethodology(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{SAVINGS_METHODOLOGY_FULL}</p>
          </div>
        </div>
      )}
      {hhModal && asset && (
        <HHDataModal
          url={hhModal.url}
          title={panelInfoFor(asset.id).title ?? asset.name}
          subtitle={hhModal.label}
          onClose={() => setHhModal(null)}
        />
      )}
    </>
  );
}
