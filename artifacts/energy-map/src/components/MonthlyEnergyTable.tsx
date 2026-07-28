import { BuildingEnergy, EnergySeries, energyMonthLabel, energyTotal } from '@/data/energyData';

// Shared monthly-totals table for the asset panels. Driven by the parsed
// campus energy data (src/data/energyData.ts). Renders whichever of the two
// series — consumption / generation — a building actually has, one row per
// month with a year-stamped label, plus a grand total. Series lengths vary
// (12 months for most, 16 for the metered "Actual" exports) so a missing
// month shows "—".

const ACTUAL_COLOR = '#15803d';   // measured data
const MODELLED_COLOR = '#b45309'; // estimated data

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}

function DataTypePill({ type }: { type: 'Actual' | 'Modelled' }) {
  const actual = type === 'Actual';
  return (
    <span
      className="inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mt-0.5"
      style={{
        color: actual ? ACTUAL_COLOR : MODELLED_COLOR,
        background: actual ? '#dcfce7' : '#fef3c7',
      }}
    >
      {type}
    </span>
  );
}

function cell(series: EnergySeries | undefined, i: number): string {
  if (!series) return 'n/a';
  const start = series.startIndex ?? 0;
  const idx = i - start;
  if (idx < 0 || idx >= series.values.length) return 'n/a';
  return fmt(series.values[idx]);
}

// First and last month index this series covers (inclusive). Used to size the
// table — both can be negative if the meter predates Jan 2025.
function firstIndex(series: EnergySeries | undefined): number | null {
  if (!series) return null;
  return series.startIndex ?? 0;
}
function lastIndex(series: EnergySeries | undefined): number | null {
  if (!series) return null;
  return (series.startIndex ?? 0) + series.values.length - 1;
}

interface MonthlyEnergyTableProps {
  energy: BuildingEnergy;
  // Asset name — used to add a clarifying note for shared assets (CHP 1 & 2).
  name?: string;
}

export function MonthlyEnergyTable({ energy, name }: MonthlyEnergyTableProps) {
  const cons = energy.consumption;
  const gen = energy.generation;
  // Table spans from the earliest month either series covers (can be before
  // Jan 2025 if a meter has historical data) through the latest month, with
  // "—" in any cell outside a series' real range.
  const starts = [firstIndex(cons), firstIndex(gen)].filter((v): v is number => v !== null);
  const ends = [lastIndex(cons), lastIndex(gen)].filter((v): v is number => v !== null);
  if (!starts.length || !ends.length) return null;
  const first = Math.min(...starts);
  const last = Math.max(...ends);
  const months = Array.from({ length: last - first + 1 }, (_, i) => i + first);
  const isChp = !!name && /^CHP Machine/i.test(name);

  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold text-gray-800 mb-2">Monthly Totals (kWh)</h3>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 align-top">
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Month</th>
              {cons && (
                <th className="text-right px-3 py-2 whitespace-nowrap">
                  <span className="font-semibold text-amber-600">Consumption</span>
                  <span className="block">
                    <DataTypePill type={cons.dataType} />
                  </span>
                </th>
              )}
              {gen && (
                <th className="text-right px-3 py-2 whitespace-nowrap">
                  <span className="font-semibold text-green-600">Generation</span>
                  <span className="block">
                    <DataTypePill type={gen.dataType} />
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {months.map((i) => (
              <tr key={i} className={i % 2 ? 'bg-gray-50/60' : ''}>
                <td className="px-3 py-1 text-gray-600 whitespace-nowrap">{energyMonthLabel(i)}</td>
                {cons && (
                  <td className="px-3 py-1 text-right font-mono text-gray-800">{cell(cons, i)}</td>
                )}
                {gen && (
                  <td className="px-3 py-1 text-right font-mono text-gray-800">{cell(gen, i)}</td>
                )}
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 bg-gray-100 font-bold">
              <td className="px-3 py-2 text-gray-700">Total</td>
              {cons && (
                <td className="px-3 py-2 text-right font-mono text-gray-900">{fmt(energyTotal(cons))}</td>
              )}
              {gen && (
                <td className="px-3 py-2 text-right font-mono text-gray-900">{fmt(energyTotal(gen))}</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
      {isChp && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] text-gray-400">
            Figures represent CHP Machines 1 &amp; 2 combined.
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            To ensure accuracy, the underlying CHP machine data was reviewed and
            cleansed where anomalies were identified. A small number of unexplained
            gaps in the dataset were modelled using actual operational data from
            surrounding periods, providing a reliable and representative picture of
            performance.
          </p>
        </div>
      )}
    </div>
  );
}
