import { X, Zap, Sun } from 'lucide-react';

const HEADER_BG = '#1b3a6b';
const GEN_HEADER_BG = '#1a7a44';
const TOTAL_BG = '#1b3a6b';
const ROW_ALT = '#f0f4f8';

const consumptionData = [
  { site: 'Etihad Stadium (Actual)', kwh: 10476994 },
  { site: 'CFA (Actual)', kwh: 4106776 },
  { site: 'CHP Machines (Actual)', kwh: 2809569 },
  { site: 'Etihad North Stand Commercial (Modelled)', kwh: 1966999 },
  { site: 'Etihad North Stand Extension (Modelled)', kwh: 3446000 },
  { site: 'Etihad North Stand Hotel (Modelled)', kwh: 4620002 },
  { site: 'MCWFC Building (Modelled)', kwh: 1576903 },
];
const CONSUMPTION_TOTAL = consumptionData.reduce((s, r) => s + r.kwh, 0);

const generationData = [
  { site: 'Etihad North Stand Commercial (Modelled)', kwh: 72596 },
  { site: 'Etihad North Stand Hotel (Modelled)', kwh: 86330 },
  { site: 'Etihad Towers (Modelled)', kwh: 125242 },
  { site: 'FM Building (Actual)', kwh: 93782 },
  { site: 'Joie Stadium (Actual)', kwh: 995297 },
  { site: 'MCWFC Building (Modelled)', kwh: 49733 },
  { site: 'Performance Centre (Actual)', kwh: 612425 },
  { site: 'Phase2A Ground Mount (Modelled)', kwh: 284627 },
  { site: 'Phase2B Ground Mount (Modelled)', kwh: 696635 },
  { site: 'TV Studio (Actual)', kwh: 17564 },
];
const GENERATION_TOTAL = generationData.reduce((s, r) => s + r.kwh, 0);

function fmt(n: number): string {
  return n.toLocaleString('en-GB');
}

interface EnergyTableProps {
  headerBg: string;
  colLabel: string;
  icon: React.ReactNode;
  rows: { site: string; kwh: number }[];
  total: number;
}

function EnergyTable({ headerBg, colLabel, icon, rows, total }: EnergyTableProps) {
  return (
    <table className="w-full text-xs border-collapse rounded-lg overflow-hidden shadow-sm">
      <thead>
        <tr style={{ background: headerBg }}>
          <th className="text-left px-4 py-2.5 text-white font-semibold">
            <span className="flex items-center gap-1.5">
              {icon}
              Site
            </span>
          </th>
          <th className="text-right px-4 py-2.5 text-white font-semibold whitespace-nowrap">
            {colLabel}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.site} style={{ background: i % 2 === 1 ? ROW_ALT : 'white' }}>
            <td className="px-4 py-2 text-gray-700 border-b border-gray-100">{row.site}</td>
            <td className="px-4 py-2 text-right font-mono text-gray-800 whitespace-nowrap border-b border-gray-100">
              {fmt(row.kwh)}
            </td>
          </tr>
        ))}
        <tr style={{ background: TOTAL_BG }}>
          <td className="px-4 py-2.5 text-white font-bold text-center tracking-wide">Total</td>
          <td className="px-4 py-2.5 text-right font-mono font-bold text-white whitespace-nowrap">
            {fmt(total)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

interface TableModalProps {
  onClose: () => void;
}

export function TableModal({ onClose }: TableModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Generation &amp; Consumption Table</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">MCFC Campus Map Meter Locations: annual energy summary</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tables */}
        <div className="overflow-auto px-6 py-5 flex flex-col gap-6">
          <EnergyTable
            headerBg={HEADER_BG}
            colLabel="Total Consumption (kWh)"
            icon={<Zap size={12} className="text-yellow-300 shrink-0" fill="currentColor" />}
            rows={consumptionData}
            total={CONSUMPTION_TOTAL}
          />
          <EnergyTable
            headerBg={GEN_HEADER_BG}
            colLabel="Total Generation (kWh)"
            icon={<Sun size={12} className="text-green-200 shrink-0" />}
            rows={generationData}
            total={GENERATION_TOTAL}
          />
        </div>
      </div>
    </div>
  );
}
