import { useState } from 'react';
import { ChevronUp, ChevronDown, Zap, Sun } from 'lucide-react';

const HEADER_BG = '#1b3a6b';
const TOTAL_BG = '#1a7a44';
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

interface TableProps {
  title: string;
  colLabel: string;
  icon: React.ReactNode;
  rows: { site: string; kwh: number }[];
  total: number;
}

function EnergyTable({ title, colLabel, icon, rows, total }: TableProps) {
  return (
    <div className="flex-1 min-w-0 overflow-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: HEADER_BG }}>
            <th className="text-left px-3 py-2 text-white font-semibold flex items-center gap-1.5 whitespace-nowrap">
              {icon}
              {title}
            </th>
            <th className="text-right px-3 py-2 text-white font-semibold whitespace-nowrap">
              {colLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.site} style={{ background: i % 2 === 1 ? ROW_ALT : 'white' }}>
              <td className="px-3 py-1.5 text-gray-700">{row.site}</td>
              <td className="px-3 py-1.5 text-right font-mono text-gray-800 whitespace-nowrap">
                {fmt(row.kwh)}
              </td>
            </tr>
          ))}
          <tr style={{ background: TOTAL_BG }}>
            <td className="px-3 py-2 text-white font-bold text-center tracking-wide">Total</td>
            <td className="px-3 py-2 text-right font-mono font-bold text-white whitespace-nowrap">
              {fmt(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface DataPanelProps {
  open: boolean;
  onToggle: () => void;
}

export function DataPanel({ open, onToggle }: DataPanelProps) {
  return (
    <div className="shrink-0 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-gray-50 transition-colors group"
        aria-label={open ? 'Collapse data panel' : 'Expand data panel'}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700 tracking-wide uppercase">
            Energy Data
          </span>
          <span className="text-[10px] text-gray-400 font-normal">
            Consumption &amp; Generation summary
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 group-hover:text-gray-600 transition-colors">
          {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </div>
      </button>

      {open && (
        <div className="px-6 pb-5 pt-1 flex gap-4">
          <EnergyTable
            title="Site"
            colLabel="Total Consumption (kWh)"
            icon={<Zap size={12} className="text-yellow-300 shrink-0" />}
            rows={consumptionData}
            total={CONSUMPTION_TOTAL}
          />
          <EnergyTable
            title="Site"
            colLabel="Total Generation (kWh)"
            icon={<Sun size={12} className="text-green-300 shrink-0" />}
            rows={generationData}
            total={GENERATION_TOTAL}
          />
        </div>
      )}
    </div>
  );
}
