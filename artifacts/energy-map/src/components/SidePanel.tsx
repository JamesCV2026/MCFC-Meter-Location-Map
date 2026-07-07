import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Pencil, Upload, ImagePlus, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { EnergyAsset } from '@/data/assets';
import { assetTypeConfig } from '@/data/assetTypes';
import { VIEW_ONLY } from '@/viewOnly';
import { energyForName, energyTotal } from '@/data/energyData';
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
  if (n === undefined) return '—';
  return n.toLocaleString('en-GB') + ' kWh';
}

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

  // Reset state whenever a different marker is opened/closed.
  useEffect(() => {
    setConfirmingDelete(false);
    setHhModal(null);
    setInfo(asset ? panelInfoFor(asset.id) : {});
    setEditingTitle(false);
    // Load this asset's stored photos for the carousel.
    if (asset) {
      const arr = loadStickerPhotos()[asset.id] ?? [];
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
          const energy = energyForName(displayTitle);
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

                {isSubstation && (() => {
                  // Substation carousel. Photos live in the same per-asset
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
                {!isBattery && (() => {
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
                            <Field label="Generation" value={fmt(genValue)} />
                            {/* 12-month-window disclaimer — applies to every
                                generation series in the data. Phase 1 actuals
                                are now truncated to Jan-Dec 2025 and modelled
                                generation series are 12-month annuals, so a
                                single note covers them all. */}
                            {(genValue !== undefined || energy?.generation) && (
                              <p className="text-[10px] text-gray-400 italic -mt-1 mb-2 pl-[88px]">
                                Generation total is a 12-month figure (Jan to Dec 2025 for actuals; 12-month annual for modelled).
                              </p>
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
                        <MonthlyEnergyTable energy={energy} name={displayTitle} />
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
