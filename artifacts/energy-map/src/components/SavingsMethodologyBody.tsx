import React from 'react';

// Comprehensive savings methodology — presents the CFG/MCFC 100%
// self-consumption scenario (no export): formula → rates → per-site inputs &
// savings (styled like the Savings-by-asset table) → 25-year projection →
// assumptions & caveats. Source: CFG_MCFC_100pct_SelfConsumption.xlsx.

// Shared palette with the Savings summary / Energy data tables.
const HEADER_BG = '#1b3a6b';
const GROUP_BG = '#dbe3ee';
const ACTUALS_BG = '#eef6f0';
const MODELLED_BG = '#fdf4e7';
const ACTUAL_COLOR = '#15803d';
const MODELLED_COLOR = '#b45309';

function Formula({ title, note }: { title: string; note?: string }) {
  return (
    <div className="rounded-lg border-2 border-gray-900 bg-gray-50 px-3.5 py-2.5">
      <p className="text-[13px] font-semibold text-gray-900 leading-snug">{title}</p>
      {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pt-1">{children}</p>;
}

const fmtN = (n: number) => n.toLocaleString('en-GB');
const fmtGBP = (n: number) => '£' + n.toLocaleString('en-GB');

// Per-site inputs & savings — 100% self-consumption scenario.
interface SiteRow { site: string; kwp: number; gen: number; y1: number; y25: number }
interface PhaseGroup { label: string; actual: boolean; rows: SiteRow[] }

const PHASE_GROUPS: PhaseGroup[] = [
  {
    label: 'Phase 1: Actual metered', actual: true,
    rows: [
      { site: 'Joie Stadium', kwp: 1218, gen: 769313, y1: 47982, y25: 7319716 },
      { site: 'Indoor Pitch', kwp: 849.12, gen: 542423, y1: 33831, y25: 5160948 },
      { site: 'TV Studio', kwp: 21.75, gen: 16008, y1: 998, y25: 152310 },
      { site: 'FM Building', kwp: 124.41, gen: 80977, y1: 5051, y25: 770461 },
    ],
  },
  {
    label: 'Phase 2: Modelled', actual: false,
    rows: [
      { site: 'Ground Mount', kwp: 352.8, gen: 284627, y1: 17752, y25: 2708119 },
      { site: "Women's", kwp: 67.16, gen: 49733, y1: 3102, y25: 473189 },
    ],
  },
  {
    label: 'Phase 3: Modelled', actual: false,
    rows: [
      { site: 'Hotel', kwp: 95.63, gen: 86330, y1: 5384, y25: 821398 },
      { site: 'Commercial', kwp: 90.39, gen: 72596, y1: 4528, y25: 690721 },
      { site: 'Towers', kwp: 157.2, gen: 119890, y1: 7478, y25: 1140706 },
    ],
  },
];
const ALL_ROWS = PHASE_GROUPS.flatMap((g) => g.rows);

const th = 'px-3 py-2 text-left text-[11px] font-semibold text-white whitespace-nowrap';
const thR = th + ' text-right';
const td = 'px-3 py-1.5 text-[12px] text-gray-700 whitespace-nowrap';
const tdR = td + ' text-right font-mono tabular-nums';

export function SavingsMethodologyBody() {
  return (
    <div className="text-sm text-gray-600 leading-relaxed space-y-3">

      {/* ── 1. The formula ── */}
      <SectionTitle>How a saving is calculated</SectionTitle>
      <p>
        Each site's saving is the value of the grid electricity it avoids buying: the gap between the grid
        rate and the PPA rate on every unit generated and used on site:
      </p>
      <Formula
        title="Net saving = Generated kWh × (Grid rate − PPA rate)"
        note="100% self-consumption scenario, all generation is assumed used on site"
      />

      {/* ── 2. The rates ── */}
      <SectionTitle>Rates used (Year 1)</SectionTitle>
      <div className="rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className={td}>Grid rate</td>
              <td className={tdR}><b>21.80p/kWh</b></td>
              <td className={td + ' text-gray-400'}>escalating 8% per year</td>
            </tr>
            <tr>
              <td className={td}>PPA rate</td>
              <td className={tdR}><b>15.50p/kWh</b></td>
              <td className={td + ' text-gray-400'}>escalating 3% per year</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Generation data varies by phase: Phase 1 (Joie Stadium, Indoor Pitch, TV Studio, FM Building) uses
        actual metered generation; Phases 2 (Ground Mount, Women's) and 3 (Hotel, Commercial, Towers) use
        modelled profiles. All phases are treated as 100% self-consuming.
      </p>

      {/* ── 3. Inputs & savings by site ── */}
      <SectionTitle>Inputs &amp; savings by site</SectionTitle>
      <div className="rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: HEADER_BG }}>
              <th className={th}>Site</th>
              <th className={thR}>Array kWp</th>
              <th className={thR}>Annual Generated kWh</th>
              <th className={thR}>Year-1 savings</th>
              <th className={thR}>25-year savings</th>
            </tr>
          </thead>
          <tbody>
            {PHASE_GROUPS.map((g) => (
              <React.Fragment key={g.label}>
                <tr style={{ background: GROUP_BG }}>
                  <td colSpan={5} className="px-3 py-1.5 font-bold uppercase tracking-wide text-[11px]" style={{ color: HEADER_BG }}>
                    {g.label}
                  </td>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.site} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                    <td className={td}>{r.site}</td>
                    <td className={tdR}>{r.kwp.toLocaleString('en-GB')}</td>
                    <td className={tdR}>{fmtN(r.gen)}</td>
                    <td className={tdR}>{fmtGBP(r.y1)}</td>
                    <td className={tdR + ' font-semibold text-gray-900'}>{fmtGBP(r.y25)}</td>
                  </tr>
                ))}
                <tr style={{ background: g.actual ? ACTUALS_BG : MODELLED_BG }}>
                  <td colSpan={2} className="px-3 py-1.5 font-bold whitespace-nowrap" style={{ color: g.actual ? ACTUAL_COLOR : MODELLED_COLOR }}>
                    Subtotal ({g.actual ? 'Actual' : 'Modelled'})
                  </td>
                  <td className={tdR + ' font-bold'} style={{ color: g.actual ? ACTUAL_COLOR : MODELLED_COLOR }}>{fmtN(g.rows.reduce((s, r) => s + r.gen, 0))}</td>
                  <td className={tdR + ' font-bold'} style={{ color: g.actual ? ACTUAL_COLOR : MODELLED_COLOR }}>{fmtGBP(g.rows.reduce((s, r) => s + r.y1, 0))}</td>
                  <td className={tdR + ' font-bold'} style={{ color: g.actual ? ACTUAL_COLOR : MODELLED_COLOR }}>{fmtGBP(g.rows.reduce((s, r) => s + r.y25, 0))}</td>
                </tr>
              </React.Fragment>
            ))}
            <tr style={{ background: HEADER_BG }}>
              <td colSpan={2} className="px-3 py-2 text-white font-bold uppercase tracking-wide text-[11px]">
                Grand total
              </td>
              <td className={tdR + ' font-bold'} style={{ color: 'white' }}>{fmtN(ALL_ROWS.reduce((s, r) => s + r.gen, 0))}</td>
              <td className={tdR + ' font-bold'} style={{ color: 'white' }}>{fmtGBP(ALL_ROWS.reduce((s, r) => s + r.y1, 0))}</td>
              <td className={tdR + ' font-bold'} style={{ color: 'white' }}>{fmtGBP(ALL_ROWS.reduce((s, r) => s + r.y25, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 4. The 25-year projection ── */}
      <SectionTitle>Projecting over the 25-year term</SectionTitle>
      <p>
        The same calculation is repeated for each of the 25 years of the PPA term, with the grid rate
        escalating at 8% per year against 3% for the PPA rate. Because the grid rate rises faster, the gap
        between the two widens every year, so annual savings grow throughout the agreement. Summing each
        year gives the cumulative 25-year position for every site and the portfolio.
      </p>

      {/* ── 5. Assumptions & caveats ── */}
      <SectionTitle>Assumptions &amp; caveats</SectionTitle>
      <ul className="list-disc pl-5 space-y-1 text-[13px]">
        <li>This scenario assumes 100% self-consumption, so every generated unit displaces grid purchase and
          nothing is exported. Any actual export (sold below the PPA rate) would reduce these figures;
          half-hourly analysis is required to establish the true split.</li>
        <li>Rate escalators (grid 8%, PPA 3%) are assumptions held constant across the full 25-year term.</li>
        <li>Phase 2 and 3 generation is modelled, not metered; figures will be trued up as sites are
          commissioned and metered.</li>
      </ul>
    </div>
  );
}
