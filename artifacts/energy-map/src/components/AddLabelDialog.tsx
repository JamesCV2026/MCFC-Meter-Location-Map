import { useState, useEffect, useRef } from 'react';
import { Tag, MapPin } from 'lucide-react';

type LabelStyle = 'pin' | 'tag';

interface AddLabelDialogProps {
  x: number;
  y: number;
  onConfirm: (name: string, style: LabelStyle) => void;
  onCancel: () => void;
}

export function AddLabelDialog({ x, y, onConfirm, onCancel }: AddLabelDialogProps) {
  const [name, setName] = useState('');
  const [style, setStyle] = useState<LabelStyle>('pin');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), style);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <Tag size={14} className="text-indigo-600" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Add label</p>
            <p className="text-[10px] text-gray-400">
              Position: {x.toFixed(1)}%, {y.toFixed(1)}%
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Label name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Substation A"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Pin (the original) — full pill with map-pin + zoom chevron */}
              <button
                type="button"
                onClick={() => setStyle('pin')}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-[11px] font-semibold transition-colors ${
                  style === 'pin'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <MapPin size={14} />
                <span>Pin</span>
                <span className="text-[9px] font-normal text-gray-500 leading-none">
                  Full pill with icons
                </span>
              </button>
              {/* Tag (new) — small text-only pill */}
              <button
                type="button"
                onClick={() => setStyle('tag')}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-[11px] font-semibold transition-colors ${
                  style === 'tag'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Tag size={14} />
                <span>Tag</span>
                <span className="text-[9px] font-normal text-gray-500 leading-none">
                  Compact text only
                </span>
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Place label
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
