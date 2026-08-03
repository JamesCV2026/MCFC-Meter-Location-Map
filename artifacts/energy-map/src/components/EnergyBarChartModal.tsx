import { X } from 'lucide-react';

// Structurally compatible with DataPanel's EnergyRow.
interface ChartRow { site: string; kwh: number; alt?: boolean; }

interface Props {
  open: boolean;
  onClose: () => void;
  consumption: ChartRow[];
  generation: ChartRow[];
}

interface GroupDef { name: string; color: string; match: string[]; leader?: boolean; }

// ── Groupings (per James) ────────────────────────────────────────────────────
const CONS_GROUPS: GroupDef[] = [
  { name: 'Etihad', color: '#2563eb', match: ['Etihad Stadium', 'City At Home', 'Mamma Mia! Theatre'] },
  { name: 'Etihad North Stand', color: '#7c3aed', match: ['Etihad North Stand Commercial', 'Etihad North Stand Hotel', 'Etihad North Stand Extension'] },
  { name: 'CFA', color: '#0891b2', match: ['CFA'] },
  { name: 'CHP', color: '#d97706', match: ['CHP Machine 1', 'CHP Machine 2'] },
  { name: 'Womens (MCWFC)', color: '#0ea5e9', match: ['MCWFC Building'] },
  { name: 'Diesel Generators', color: '#6b7280', match: ['Diesel Generator 1', 'Diesel Generator 2', 'Diesel Generator 3', 'Diesel Generator 4'] },
];

const GEN_GROUPS: GroupDef[] = [
  { name: 'Wind Turbine', color: '#15803d', match: ['Wind Turbine (6.2 MW)'] },
  // Solar phases — tagged "- Solar" and forced to a side leader label (never an
  // in-box label) so they read as solar, distinct from the wind block.
  { name: 'Phase 1 - Solar', color: '#22c55e', match: ['Joie Stadium', 'FM Building', 'TV Studio', 'Indoor Pitch (Performance Centre)', 'Performance Centre'], leader: true },
  { name: 'Phase 2 - Solar', color: '#84cc16', match: ['MCWFC Building', 'Phase 2A Ground Mount'], leader: true },
  { name: 'Phase 3 - Solar', color: '#0d9488', match: ['Etihad North Stand Commercial', 'Etihad North Stand Hotel', 'Etihad Towers'], leader: true },
  // Co-op Live sits outside the phased solar programme, but it IS in the
  // Energy Data table's generation total — charting it keeps the two views
  // reconciled (chart total == table Grand Total).
  { name: 'Co-op Live Arena', color: '#059669', match: ['Co-op Live Arena'], leader: true },
];

interface Segment { name: string; value: number; color: string; leader?: boolean; }

function buildSegments(rows: ChartRow[], groups: GroupDef[]): Segment[] {
  const by = new Map<string, number>();
  for (const r of rows) if (!r.alt) by.set(r.site, (by.get(r.site) || 0) + r.kwh);
  return groups
    .map((g) => ({ name: g.name, color: g.color, leader: g.leader, value: g.match.reduce((s, m) => s + (by.get(m) || 0), 0) }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value); // largest at the bottom of the stack
}

function fmtGWh(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' GWh';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + ' MWh';
  return Math.round(n) + ' kWh';
}

// ── Chart geometry ───────────────────────────────────────────────────────────
// Sized to fill the modal's full width (max-w-840 minus padding ≈ 780).
const W = 780, H = 540;
const ML = 56, MR = 24, MT = 26, MB = 46;
const plotL = ML, plotR = W - MR, plotT = MT, plotB = H - MB;
const plotW = plotR - plotL, plotH = plotB - plotT;
const BAR_W = 132;
const INSIDE_MIN = 26;  // px height at/above which a block holds NAME + value inside
const NAME_MIN = 16;    // px height at/above which a shorter block holds its NAME
                        // inside, with only the value on the external leader label
const EXT_GAP = 42;     // min vertical spacing between external labels (well spread)
const EXT_OFFSET = 40;  // how far right of the bar the external labels sit

// Split a long multi-word label so it fits inside a bar segment without being
// clipped (e.g. "Etihad North Stand"). Short labels stay on a single line.
function wrapInside(name: string, maxChars = 12): string[] {
  if (name.length <= maxChars) return [name];
  const words = name.split(' ');
  if (words.length === 1) return [name];
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) { lines.push(cur); cur = w; }
    else { cur = cur ? cur + ' ' + w : w; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function Legend({ title, segs, total }: { title: string; segs: Segment[]; total: number }) {
  return (
    <div className="min-w-[210px]">
      <p className="text-[11px] font-bold text-gray-700 mb-1.5">{title}</p>
      <div className="flex flex-col gap-1">
        {segs.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-[11px]">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-gray-700 flex-1 truncate">{s.name}</span>
            <span className="font-mono font-semibold text-gray-800">{fmtGWh(s.value)}</span>
            <span className="text-gray-400 w-9 text-right">{total ? ((s.value / total) * 100).toFixed(0) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnergyBarChartModal({ open, onClose, consumption, generation }: Props) {
  if (!open) return null;

  const consSegs = buildSegments(consumption, CONS_GROUPS);
  const genSegs = buildSegments(generation, GEN_GROUPS);
  const consTotal = consSegs.reduce((s, r) => s + r.value, 0);
  const genTotal = genSegs.reduce((s, r) => s + r.value, 0);
  const dataMax = Math.max(consTotal, genTotal) || 1;

  const STEP = 10_000_000;       // axis top rounds up to a clean 10 GWh
  const TICK = 5_000_000;        // labelled gridline every 5 GWh
  const MINOR = 1_000_000;       // faint, unlabelled gridline every 1 GWh
  const axisMax = Math.ceil(dataMax / STEP) * STEP;
  const ticks: number[] = [];
  for (let t = 0; t <= axisMax; t += TICK) ticks.push(t);
  // Minor lines at every 1 GWh, skipping those that coincide with a labelled line.
  const minorTicks: number[] = [];
  for (let t = MINOR; t < axisMax; t += MINOR) if (t % TICK !== 0) minorTicks.push(t);
  const yOf = (v: number) => plotB - (v / axisMax) * plotH;

  const bars = [
    { label: 'Consumption', cx: plotL + plotW * 0.26, total: consTotal, segs: consSegs },
    { label: 'Green Generation', cx: plotL + plotW * 0.66, total: genTotal, segs: genSegs },
  ];

  const coverage = consTotal > 0 ? (genTotal / consTotal) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        data-testid="energy-bar-chart"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[840px] max-h-[94vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Campus Energy Balance: Consumption vs Green Generation</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Annual GWh, grouped per the feasibility study · single shared scale</p>
          </div>
          <button
            data-testid="energy-bar-chart-close"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }}>
            {/* faint minor gridlines + short left tick every 1 GWh (no labels) */}
            {minorTicks.map((t) => (
              <g key={`m-${t}`}>
                <line x1={plotL} y1={yOf(t)} x2={plotR} y2={yOf(t)} stroke="#f4f6f9" strokeWidth={1} />
                <line x1={plotL - 4} y1={yOf(t)} x2={plotL} y2={yOf(t)} stroke="#b8c0c9" strokeWidth={1} />
              </g>
            ))}
            {/* gridlines + longer left tick + label every 5 GWh */}
            {ticks.map((t) => (
              <g key={`t-${t}`}>
                <line x1={plotL} y1={yOf(t)} x2={plotR} y2={yOf(t)} stroke={t === 0 ? '#9ca3af' : '#eceff3'} strokeWidth={1} />
                <line x1={plotL - 7} y1={yOf(t)} x2={plotL} y2={yOf(t)} stroke="#9ca3af" strokeWidth={1} />
                <text x={plotL - 11} y={yOf(t) + 3.5} textAnchor="end" fontSize={10.5} fill="#6b7280">{(t / 1_000_000).toFixed(0)}</text>
              </g>
            ))}
            <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke="#9ca3af" strokeWidth={1} />
            <text x={plotL - 42} y={plotT + plotH / 2} fontSize={11} fontWeight={600} fill="#6b7280" transform={`rotate(-90 ${plotL - 42} ${plotT + plotH / 2})`} textAnchor="middle">Energy (GWh / yr)</text>

            {bars.map((bar) => {
              const x = bar.cx - BAR_W / 2;
              const barRight = bar.cx + BAR_W / 2;
              // segment geometry, stacked from the baseline up
              let bottom = plotB;
              const geo = bar.segs.map((s) => {
                const h = (s.value / axisMax) * plotH;
                const y = bottom - h;
                bottom = y;
                // 'full' = name + value inside · 'name' = name inside, value on a
                // leader · 'ext' = name + value both on the leader (tiny blocks).
                const mode = s.leader ? 'ext' : h >= INSIDE_MIN ? 'full' : h >= NAME_MIN ? 'name' : 'ext';
                return { ...s, y, h, mid: y + h / 2, mode };
              });
              // leader labels for every block that doesn't hold its value inside —
              // ordered top-to-bottom so the leader lines fan out without crossing.
              const smalls = geo.filter((s) => s.mode !== 'full').sort((a, b) => a.mid - b.mid);
              let prev = -Infinity;
              const ext = smalls.map((s) => { const ly = Math.max(s.mid, prev + EXT_GAP); prev = ly; return { ...s, labelY: ly }; });
              const lx = barRight + EXT_OFFSET;
              return (
                <g key={bar.label}>
                  {geo.map((s) => (
                    <g key={s.name}>
                      <rect x={x} y={s.y} width={BAR_W} height={s.h} fill={s.color} stroke="#ffffff" strokeWidth={1} />
                      {s.mode === 'full' && (() => {
                        const lines = wrapInside(s.name);
                        const cy = s.y + s.h / 2;
                        const lh = 12;
                        const total = lines.length + 1; // name line(s) + value line
                        const top = cy - (total * lh) / 2;
                        return (
                          <>
                            {lines.map((ln, li) => (
                              <text key={li} x={bar.cx} y={top + (li + 1) * lh - 2} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffffff">{ln}</text>
                            ))}
                            <text x={bar.cx} y={top + total * lh - 2} textAnchor="middle" fontSize={9.5} fill="#ffffff" opacity={0.92}>{fmtGWh(s.value)}</text>
                          </>
                        );
                      })()}
                      {/* Short block: name sits inside, value rides the leader. */}
                      {s.mode === 'name' && (
                        <text x={bar.cx} y={s.y + s.h / 2 + 3.4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#ffffff">{s.name}</text>
                      )}
                    </g>
                  ))}
                  {/* leaders + external labels for the small blocks */}
                  {ext.map((s) => (
                    <g key={`ext-${s.name}`}>
                      <polyline
                        points={`${barRight},${s.mid} ${barRight + 8},${s.mid} ${lx - 10},${s.labelY} ${lx - 4},${s.labelY}`}
                        fill="none" stroke={s.color} strokeWidth={1.2} opacity={0.85}
                      />
                      <rect x={lx - 4} y={s.labelY - 9} width={9} height={9} rx={2} fill={s.color} />
                      {s.mode === 'name' ? (
                        // Name already shown inside the box — leader carries just the value.
                        <text x={lx + 9} y={s.labelY - 1} fontSize={11} fontWeight={700} fill={s.color}>{fmtGWh(s.value)}</text>
                      ) : (
                        <>
                          <text x={lx + 9} y={s.labelY - 2} fontSize={10.5} fontWeight={700} fill="#1f2937">{s.name}</text>
                          <text x={lx + 9} y={s.labelY + 9} fontSize={9.5} fontWeight={600} fill={s.color}>{fmtGWh(s.value)}</text>
                        </>
                      )}
                    </g>
                  ))}
                  <text x={bar.cx} y={yOf(bar.total) - 8} textAnchor="middle" fontSize={14} fontWeight={800} fill="#111827">{fmtGWh(bar.total)}</text>
                  <text x={bar.cx} y={plotB + 20} textAnchor="middle" fontSize={12} fontWeight={700} fill="#374151">{bar.label}</text>
                </g>
              );
            })}
            <line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke="#9ca3af" strokeWidth={1} />
          </svg>
        </div>

        <div className="flex gap-10 px-6 pt-3 pb-2 justify-center flex-wrap">
          <Legend title="Consumption" segs={consSegs} total={consTotal} />
          <Legend title="Green Generation" segs={genSegs} total={genTotal} />
        </div>

        {/* Tiny breakdown of what each generation phase contains — kept light
            and out of the way. */}
        <div className="px-6 pb-3">
          <p className="text-[10px] leading-snug text-gray-400">
            <span className="font-semibold text-gray-500">Solar phases.</span>
            {' '}Phase 1: Joie Stadium, Indoor Pitch (Performance Centre), FM Building, TV Studio ·
            {' '}Phase 2: MCWFC, Ground Mount 2A ·
            {' '}Phase 3: NS Commercial, NS Hotel, Etihad Towers
          </p>
        </div>

        <div className="px-6 pb-5">
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-[12px] text-gray-600">
            With the proposed wind turbine, on-site generation could meet up to{' '}
            <span className="font-bold text-green-700">{coverage.toFixed(0)}%</span> of
            grid consumption: <span className="font-semibold">{fmtGWh(genTotal)}</span> of{' '}
            <span className="font-semibold">{fmtGWh(consTotal)}</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
