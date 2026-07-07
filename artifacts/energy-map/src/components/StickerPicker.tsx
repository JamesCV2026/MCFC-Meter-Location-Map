import { useRef, useState } from 'react';
import { X, Upload, Trash2, ImageOff } from 'lucide-react';
import type { LibrarySticker, UploadResult } from '@/data/stickerLibrary';

interface StickerPickerProps {
  available: LibrarySticker[];
  onPick: (id: string) => void;
  onUpload: (file: File) => Promise<UploadResult>;
  onDeleteUpload: (id: string) => void;
  onClose: () => void;
}

// Modal that lets the user pick a sticker from the library to drop on the
// current map, or upload a new image into the library.
export function StickerPicker({ available, onPick, onUpload, onDeleteUpload, onClose }: StickerPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files (PNG, JPG, etc.) can be used as stickers.');
        continue;
      }
      const res = await onUpload(file);
      if (!res.ok) setError(res.error ?? 'Upload failed');
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="sticker-picker"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Add a sticker</h2>
            <p className="text-[11px] text-gray-500">
              Pick a sticker to drop onto the current map, or upload your own image.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            data-testid="sticker-upload-btn"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-4 rounded-lg border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors text-xs font-semibold disabled:opacity-60"
          >
            <Upload size={14} />
            {busy ? 'Processing image…' : 'Upload sticker image (PNG / JPG)'}
          </button>

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-3">
              {error}
            </p>
          )}

          {available.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <ImageOff size={28} />
              <p className="text-xs text-center">
                No stickers available yet.<br />Upload an image above to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {available.map((s) => {
                const isUpload = s.id.startsWith('upload-');
                return (
                  <div key={s.id} className="group relative">
                    <button
                      data-testid={`sticker-pick-${s.id}`}
                      onClick={() => onPick(s.id)}
                      className="w-full aspect-square rounded-lg border border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center p-2"
                      title={`Add "${s.label}" to the map`}
                    >
                      <img
                        src={s.src}
                        alt={s.label}
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                      />
                    </button>
                    <p className="mt-1 text-[10px] text-gray-500 text-center truncate" title={s.label}>
                      {s.label}
                    </p>
                    {isUpload && (
                      <button
                        onClick={() => onDeleteUpload(s.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 shadow"
                        title="Remove this sticker from the library"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
