import { X } from 'lucide-react';
import { ETIHAD_SITES, EtihadSite } from '@/data/etihadSites';
import { loadStickerPhotos } from '@/data/stickerLibrary';
import { panelInfoFor } from '@/data/panelInfo';

interface EtihadChooserProps {
  onSelect: (site: EtihadSite) => void;
  onClose: () => void;
}

// Site chooser for the Etihad Stadium complex — a vertical list of photo cards.
// Picking one opens that site's standard info panel.
export function EtihadChooser({ onSelect, onClose }: EtihadChooserProps) {
  const photos = loadStickerPhotos();

  return (
    <>
      <style>{`
        @keyframes etihad-chooser-in { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @media (min-width: 640px) {
          @keyframes etihad-chooser-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        }
      `}</style>

      <div className="fixed inset-0 z-[89] bg-black/40 sm:hidden" onClick={onClose} />

      <div
        data-testid="etihad-chooser"
        className="fixed z-[90] flex flex-col bg-white shadow-2xl overflow-hidden
                   inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl
                   sm:inset-x-auto sm:left-auto sm:right-0 sm:top-0 sm:bottom-0
                   sm:w-[400px] sm:max-h-none sm:rounded-t-none sm:border-l sm:border-gray-200"
        style={{ animation: 'etihad-chooser-in 0.28s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">Etihad Campus</h2>
            <p className="text-[11px] text-gray-400">Choose a site to view</p>
          </div>
          <button
            data-testid="etihad-chooser-close"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {ETIHAD_SITES.map((site) => {
            const title = panelInfoFor(site.id).title ?? site.name;
            const photo = photos[site.id]?.[0];
            return (
              <button
                key={site.id}
                data-testid={`etihad-site-${site.id}`}
                onClick={() => onSelect(site)}
                className="relative w-full h-28 rounded-xl overflow-hidden bg-gray-200 ring-1 ring-gray-200 hover:ring-2 hover:ring-indigo-400 transition-all"
              >
                {photo ? (
                  <img src={photo} alt={title} className="w-full h-full object-cover" draggable={false} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No photo yet
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <span className="absolute bottom-2.5 left-3.5 right-3.5 text-left text-white font-extrabold text-lg uppercase tracking-wide leading-tight">
                  {title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
