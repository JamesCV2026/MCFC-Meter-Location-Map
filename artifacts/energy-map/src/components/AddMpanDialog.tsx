import { useState, useRef, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { AssetType } from '@/data/assets';
import { assetTypeConfig, ALL_ASSET_TYPES } from '@/data/assetTypes';
import { nextAssetName } from '@/data/assetNaming';

interface AddMpanDialogProps {
  x: number;
  y: number;
  onConfirm: (type: AssetType, name: string, mpan: string, notes: string) => void;
  onCancel: () => void;
}

export function AddMpanDialog({ x, y, onConfirm, onCancel }: AddMpanDialogProps) {
  const [type, setType] = useState<AssetType>('mpan');
  // The name is auto-suggested as the next number in sequence for the chosen
  // type. It keeps following the type until the user edits it themselves.
  const [name, setName] = useState(() => nextAssetName('mpan'));
  const [nameEdited, setNameEdited] = useState(false);
  const [mpan, setMpan] = useState('');
  const [notes, setNotes] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const activeMeta = assetTypeConfig[type];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(type, name.trim(), type === 'mpan' ? mpan.trim() : '', notes.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: activeMeta.color }}
            >
              <MapPin size={12} className="text-white" />
            </span>
            <h2 className="text-sm font-semibold text-gray-900">Add Asset Marker</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-3 pb-1">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
            <span className="text-gray-300">position</span>
            <span className="font-semibold" style={{ color: activeMeta.color }}>{x.toFixed(1)}%</span>
            <span className="text-gray-300">,</span>
            <span className="font-semibold" style={{ color: activeMeta.color }}>{y.toFixed(1)}%</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Asset type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_ASSET_TYPES.map((t) => {
                const meta = assetTypeConfig[t];
                const Icon = meta.Icon;
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    data-testid={`asset-type-${t}`}
                    onClick={() => { setType(t); if (!nameEdited) setName(nextAssetName(t)); }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      active
                        ? 'border-transparent text-white'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    style={active ? { background: meta.color } : undefined}
                  >
                    <Icon
                      size={13}
                      className="shrink-0"
                      style={active ? undefined : { color: meta.color }}
                    />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
              placeholder={`e.g. ${activeMeta.label} 1`}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
            />
          </div>

          {type === 'mpan' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                MPAN number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={mpan}
                onChange={(e) => setMpan(e.target.value)}
                placeholder="e.g. 1013000000012"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes…"
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ background: activeMeta.color }}
            >
              Place marker
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
