import { EnergyAsset } from '@/data/assets';
import { panelInfoFor } from '@/data/panelInfo';
import { CAMPUS_HUBS, linksForSubmap, SupplyLink } from '@/data/supplyConnections';

interface Props {
  submapId: string;
  assets: EnergyAsset[];
  // Panel title / name of the currently-open array (auto-shows its own link).
  activeArray?: string | null;
  // When true, draw every array's link at once.
  showAll: boolean;
}

const CAMPUS_COLOR = '#16a34a';   // green — feeds the whole campus
const BUILDING_COLOR = '#2563eb'; // blue — powers only its own building

// Draws the array → load supply links over the map (inside the zoom layer, so it
// pans/zooms with the base map). Non-interactive. Renders nothing unless the
// toggle is on or an array with a link is selected.
export function SupplyConnectionsOverlay({ submapId, assets, activeArray, showAll }: Props) {
  const hub = CAMPUS_HUBS[submapId];
  const links = linksForSubmap(submapId);
  if (!links.length) return null;

  const posFor = (link: SupplyLink) => {
    const a = assets.find((x) => (panelInfoFor(x.id).title ?? x.name) === link.array || x.name === link.array);
    return a ? { x: a.x, y: a.y } : null;
  };

  const active = links.filter((l) => showAll || (!!activeArray && l.array === activeArray));
  if (!active.length) return null;

  const campus = active.filter((l) => l.scope === 'campus').map((l) => ({ l, p: posFor(l) })).filter((x) => x.p) as { l: SupplyLink; p: { x: number; y: number } }[];
  const building = active.filter((l) => l.scope === 'building').map((l) => ({ l, p: posFor(l) })).filter((x) => x.p) as { l: SupplyLink; p: { x: number; y: number } }[];
  const showHub = campus.length > 0 && !!hub;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      <defs>
        <style>{`@keyframes supplyFlow { to { stroke-dashoffset: -12; } } .supply-flow { animation: supplyFlow 0.9s linear infinite; }`}</style>
      </defs>

      {/* Campus flow lines: each array → the campus supply hub */}
      {showHub && campus.map(({ l, p }) => (
        <g key={l.array}>
          <line x1={`${p.x}%`} y1={`${p.y}%`} x2={`${hub!.x}%`} y2={`${hub!.y}%`} stroke={CAMPUS_COLOR} strokeWidth={3} strokeOpacity={0.22} strokeLinecap="round" />
          <line x1={`${p.x}%`} y1={`${p.y}%`} x2={`${hub!.x}%`} y2={`${hub!.y}%`} stroke={CAMPUS_COLOR} strokeWidth={2} strokeLinecap="round" strokeDasharray="2 10" className="supply-flow" />
          <circle cx={`${p.x}%`} cy={`${p.y}%`} r={5} fill={CAMPUS_COLOR} stroke="white" strokeWidth={1.5} />
        </g>
      ))}

      {/* Campus supply hub node */}
      {showHub && (
        <g>
          <circle cx={`${hub!.x}%`} cy={`${hub!.y}%`} r={11} fill={CAMPUS_COLOR} fillOpacity={0.14} />
          <circle cx={`${hub!.x}%`} cy={`${hub!.y}%`} r={6} fill={CAMPUS_COLOR} stroke="white" strokeWidth={2} />
          <text x={`${hub!.x}%`} y={`${hub!.y}%`} dy={-14} textAnchor="middle" fontSize={11} fontWeight={700} fill={CAMPUS_COLOR} style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 3 }}>
            {hub!.label}
          </text>
        </g>
      )}

      {/* Building-local rings: powers only its own building */}
      {building.map(({ l, p }) => (
        <g key={l.array}>
          <circle cx={`${p.x}%`} cy={`${p.y}%`} r="2.8%" fill="none" stroke={BUILDING_COLOR} strokeWidth={2.5} strokeOpacity={0.9} />
          <circle cx={`${p.x}%`} cy={`${p.y}%`} r="4%" fill="none" stroke={BUILDING_COLOR} strokeWidth={1.5} strokeOpacity={0.35} />
          <text x={`${p.x}%`} y={`${p.y}%`} dy={-18} textAnchor="middle" fontSize={10} fontWeight={700} fill={BUILDING_COLOR} style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 3 }}>
            on-site only
          </text>
        </g>
      ))}
    </svg>
  );
}
