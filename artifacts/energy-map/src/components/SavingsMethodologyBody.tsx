// Comprehensive savings methodology, rendered inside the Savings modal, the
// marker side panel and the solar panel body. Structured as: the net-savings
// formula → the rates used → Year-1 inputs per site → export-income
// sensitivity → the 25-year projection → assumptions & caveats.

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

// Year-1 inputs per site (self-consumed / exported kWh and the resulting net
// saving). Rates are common to every site: grid 21.80p, PPA 15.50p, export 12.00p.
const Y1_ROWS = [
  { site: 'Joie Stadium', self: 685458, exported: 76162, net: 40518 },
  { site: 'Indoor Pitch', self: 483299, exported: 53700, net: 28568 },
  { site: 'TV Studio', self: 14263, exported: 1585, net: 843 },
  { site: 'FM Building', self: 72150, exported: 8017, net: 4265 },
  { site: 'Ground Mount', self: 253603, exported: 28178, net: 14991 },
  { site: "Women's", self: 44312, exported: 4924, net: 2619 },
  { site: 'Hotel', self: 85467, exported: 0, net: 5384 },
  { site: 'Commercial', self: 71870, exported: 0, net: 4528 },
  { site: 'Towers', self: 118691, exported: 0, net: 7478 },
];

// Export-income sensitivity: Year 1 and 25-year totals with vs without export.
const SENSITIVITY_ROWS = [
  { site: 'Joie Stadium', y1w: 40518, y1n: 31379, w25: 6346752, n25: 6179880 },
  { site: 'Indoor Pitch', y1w: 28568, y1n: 22124, w25: 4474935, n25: 4357278 },
  { site: 'TV Studio', y1w: 843, y1n: 653, w25: 132065, n25: 128592 },
  { site: 'FM Building', y1w: 4265, y1n: 3303, w25: 668048, n25: 650484 },
  { site: 'Ground Mount', y1w: 14991, y1n: 11609, w25: 2348146, n25: 2286407 },
  { site: "Women's", y1w: 2619, y1n: 2029, w25: 410291, n25: 399504 },
  { site: 'Hotel', y1w: 5384, y1n: 5384, w25: 821398, n25: 821398 },
  { site: 'Commercial', y1w: 4528, y1n: 4528, w25: 690721, n25: 690721 },
  { site: 'Towers', y1w: 7478, y1n: 7478, w25: 1140706, n25: 1140706 },
];
const SENS_TOTAL = { y1w: 109194, y1n: 88487, w25: 17033062, n25: 16654970 };

const th = 'px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap';
const thR = th + ' text-right';
const td = 'px-2 py-1.5 text-[12px] text-gray-700 whitespace-nowrap';
const tdR = td + ' text-right tabular-nums';

export function SavingsMethodologyBody() {
  return (
    <div className="text-sm text-gray-600 leading-relaxed space-y-3">

      {/* ── 1. The formula ── */}
      <SectionTitle>How a saving is calculated</SectionTitle>
      <p>
        Each site's saving is the value of grid electricity it avoids buying, less the small loss on any
        surplus exported at below the PPA rate:
      </p>
      <Formula
        title="Net saving = [Self-consumed × (Grid rate − PPA rate)] − [Exported × (PPA rate − Export rate)]"
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
            <tr className="border-b border-gray-100">
              <td className={td}>PPA rate</td>
              <td className={tdR}><b>15.50p/kWh</b></td>
              <td className={td + ' text-gray-400'}>escalating 3% per year</td>
            </tr>
            <tr>
              <td className={td}>Export rate</td>
              <td className={tdR}><b>12.00p/kWh</b></td>
              <td className={td + ' text-gray-400'}>applied to exported surplus</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Generation data varies by phase: Phase 1 (Joie Stadium, Indoor Pitch, TV Studio, FM Building) uses
        actual metered generation; Phases 2 (Ground Mount, Women's) and 3 (Hotel, Commercial, Towers) use
        modelled profiles. Generation is split 90% self-consumed / 10% exported for Phases 1 and 2, and
        100% self-consumed for Phase 3.
      </p>

      {/* ── 3. Year-1 inputs per site ── */}
      <SectionTitle>Year-1 inputs by site</SectionTitle>
      <div className="rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={th}>Site</th>
              <th className={thR}>Self-consumed kWh</th>
              <th className={thR}>Exported kWh</th>
              <th className={thR}>Net £ (Y1)</th>
            </tr>
          </thead>
          <tbody>
            {Y1_ROWS.map((r) => (
              <tr key={r.site} className="border-b border-gray-100 last:border-0">
                <td className={td}>{r.site}</td>
                <td className={tdR}>{fmtN(r.self)}</td>
                <td className={tdR}>{r.exported ? fmtN(r.exported) : '—'}</td>
                <td className={tdR + ' font-semibold text-gray-900'}>{fmtGBP(r.net)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className={td + ' font-bold text-gray-900'}>Portfolio</td>
              <td className={tdR + ' font-semibold'}>{fmtN(Y1_ROWS.reduce((s, r) => s + r.self, 0))}</td>
              <td className={tdR + ' font-semibold'}>{fmtN(Y1_ROWS.reduce((s, r) => s + r.exported, 0))}</td>
              <td className={tdR + ' font-bold text-gray-900'}>{fmtGBP(Y1_ROWS.reduce((s, r) => s + r.net, 0))}</td>
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

      {/* ── 5. Export sensitivity ── */}
      <SectionTitle>Sensitivity: value of export income</SectionTitle>
      <p>
        Export income is a modest share of the total. Excluding it entirely reduces the portfolio's 25-year
        savings by about 2%:
      </p>
      <div className="rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={th}>Site</th>
              <th className={thR}>Y1 (with export)</th>
              <th className={thR}>Y1 (no export)</th>
              <th className={thR}>25yr (with export)</th>
              <th className={thR}>25yr (no export)</th>
            </tr>
          </thead>
          <tbody>
            {SENSITIVITY_ROWS.map((r) => (
              <tr key={r.site} className="border-b border-gray-100 last:border-0">
                <td className={td}>{r.site}</td>
                <td className={tdR}>{fmtGBP(r.y1w)}</td>
                <td className={tdR}>{fmtGBP(r.y1n)}</td>
                <td className={tdR}>{fmtGBP(r.w25)}</td>
                <td className={tdR}>{fmtGBP(r.n25)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className={td + ' font-bold text-gray-900'}>Portfolio</td>
              <td className={tdR + ' font-bold text-gray-900'}>{fmtGBP(SENS_TOTAL.y1w)}</td>
              <td className={tdR + ' font-bold'}>{fmtGBP(SENS_TOTAL.y1n)}</td>
              <td className={tdR + ' font-bold text-gray-900'}>{fmtGBP(SENS_TOTAL.w25)}</td>
              <td className={tdR + ' font-bold'}>{fmtGBP(SENS_TOTAL.n25)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 6. Assumptions & caveats ── */}
      <SectionTitle>Assumptions &amp; caveats</SectionTitle>
      <ul className="list-disc pl-5 space-y-1 text-[13px]">
        <li>Self-consumption is assumed at 90% for Phases 1 and 2. Metered data suggests actual export
          shares may be higher than assumed; further half-hourly analysis is required to refine the split.</li>
        <li>Phase 3 sites are treated as 100% self-consuming (no export income assumed).</li>
        <li>Rate escalators (grid 8%, PPA 3%) are assumptions held constant across the full term.</li>
        <li>Phase 2 and 3 generation is modelled, not metered; figures will be trued up as sites are
          commissioned and metered.</li>
      </ul>
    </div>
  );
}
