import { MapPin, ZoomIn, ZoomOut } from 'lucide-react';
import { Site } from '@/data/sites';

interface SiteLabelProps {
  site: Site;
  onClick: (site: Site) => void;
  active?: boolean;
}

export function SiteLabel({ site, onClick, active = false }: SiteLabelProps) {
  return (
    <div
      data-testid={`site-label-${site.id}`}
      className="absolute"
      style={{
        left: `${site.x}%`,
        top: `${site.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 15,
      }}
    >
      <button
        onClick={() => onClick(site)}
        className={`group flex items-center gap-1.5 backdrop-blur-sm border rounded-lg px-2.5 py-1.5 shadow-md transition-all duration-150 cursor-pointer whitespace-nowrap ${
          active
            ? 'bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-200'
            : 'bg-white/90 border-gray-200 hover:bg-white hover:border-blue-300 hover:shadow-lg'
        }`}
        aria-label={active ? `Zoom out from ${site.name}` : `Zoom to ${site.name}`}
      >
        <MapPin size={11} className={active ? 'text-blue-200 shrink-0' : 'text-blue-500 shrink-0'} />
        <span className={`text-[11px] font-semibold leading-none ${active ? 'text-white' : 'text-gray-800'}`}>
          {site.name}
        </span>
        {active
          ? <ZoomOut size={10} className="text-blue-200 shrink-0 ml-0.5" />
          : <ZoomIn size={10} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0 ml-0.5" />
        }
      </button>
    </div>
  );
}
