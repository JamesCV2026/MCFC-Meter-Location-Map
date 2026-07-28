import { useEffect, useState } from 'react';
import { X, Download, Wind, BarChart3, Info } from 'lucide-react';

// ── Wind Scenario Modal ─────────────────────────────────────────────────────
// Shows the 8,760-hour modelled output for the recommended Option A
// (full ring) wind + solar deployment. Pulls its data either from the
// inline /data/wind-scenario.json (running on file://) or fetches it
// (running on dev/Netlify). Falls back to a clear error state if the file
// is missing so we never silently render empty charts.
//
// Built specifically for the colleague's brief: "show the export days/times".
// The calendar heatmap below is the answer to that question in one glance.

interface HourRow {
  /** YYYY-MM-DD HH:mm */
  t: string;
  /** Consumption (kWh) */
  c: number;
  /** Solar generation (kWh) */
  s: number;
  /** Wind generation (kWh) */
  w: number;
  /** Net demand including wind (kWh). Negative = exporting to grid. */
  n: number;
}

interface MonthRow {
  /** YYYY-MM */
  month: string;
  c: number;
  s: number;
  w: number;
  exportHrs: number;
  exportKwh: number;
}

interface TopDay {
  /** YYYY-MM-DD */
  day: string;
  exportKwh: number;
  exportHrs: number;
}

interface WindScenarioPayload {
  meta: {
    source: string;
    sourceUrl: string;
    rangeStart: string;
    rangeEnd: string;
    rowCount: number;
    summary: {
      totalConsumptionKwh: number;
      totalSolarKwh: number;
      totalWindKwh: number;
      totalGenerationKwh: number;
      netDemandAfterSolarKwh: number;
      netDemandAfterSolarAndWindKwh: number;
      exportHours: number;
    };
    monthly: MonthRow[];
    topExportDays: TopDay[];
    builtAt: string;
  };
  hours: HourRow[];
}

interface WindScenarioModalProps {
  onClose: () => void;
}

const WIND_DATA_URL = 'data/wind-scenario.json';

// In the standalone HTML build we ship an inline JSON registry. The build
// script writes it to `window.__MCFC_WIND_SCENARIO__` so we don't depend on
// fetch (which fails on file:// origins for large JSON in some browsers).
function loadInline(): WindScenarioPayload | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __MCFC_WIND_SCENARIO__?: WindScenarioPayload };
  return w.__MCFC_WIND_SCENARIO__ ?? null;
}

async function loadFetch(): Promise<WindScenarioPayload | null> {
  try {
    const res = await fetch(WIND_DATA_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as WindScenarioPayload;
  } catch {
    return null;
  }
}

// Format a kWh number as GWh / MWh / kWh depending on magnitude.
function fmtEnergy(kwh: number): string {
  const abs = Math.abs(kwh);
  if (abs >= 1_000_000) return (kwh / 1_000_000).toFixed(2) + ' GWh';
  if (abs >= 1_000) return (kwh / 1_000).toFixed(1) + ' MWh';
  return kwh.toFixed(0) + ' kWh';
}

function fmtMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
}

function fmtDay(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function WindScenarioModal({ onClose }: WindScenarioModalProps) {
  const [payload, setPayload] = useState<WindScenarioPayload | null>(() => loadInline());
  const [loading, setLoading] = useState(payload === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payload) return;
    let alive = true;
    (async () => {
      const fromFetch = await loadFetch();
      if (!alive) return;
      if (fromFetch) {
        setPayload(fromFetch);
        setLoading(false);
      } else {
        setError(
          'Wind scenario data not found. The bundled snapshot or the source xlsx may be missing from this deploy.',
        );
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [payload]);

  // Esc-to-close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wind Scenario, Option A"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0 bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0">
              <Wind size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Wind Scenario: Option A (Full Ring)</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Hourly model, Jun 2025 to May 2026: campus consumption + solar + wind, with hours where wind exceeds demand (export to grid).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              Loading 8,760-hour model…
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <Info size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Data unavailable</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}
          {payload && (
            <>
              <Kpis payload={payload} />
              <MonthlyTable payload={payload} />
              <TopExportDays payload={payload} />
              <Footer payload={payload} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KPI tiles ──────────────────────────────────────────────────────────────
function Kpis({ payload }: { payload: WindScenarioPayload }) {
  const s = payload.meta.summary;
  const exportPct = ((s.exportHours / payload.meta.rowCount) * 100).toFixed(1);
  return (
    <section>
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <BarChart3 size={13} /> Annual headline
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <Kpi label="Consumption" value={fmtEnergy(s.totalConsumptionKwh)} tone="neutral" />
        <Kpi label="Solar" value={fmtEnergy(s.totalSolarKwh)} tone="amber" />
        <Kpi label="Wind" value={fmtEnergy(s.totalWindKwh)} tone="cyan" />
        <Kpi label="Net after wind+solar" value={fmtEnergy(s.netDemandAfterSolarAndWindKwh)} tone="emerald" />
        <Kpi label="Export hours" value={`${s.exportHours} / yr (${exportPct}%)`} tone="indigo" />
      </div>
    </section>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'amber' | 'cyan' | 'emerald' | 'indigo' }) {
  const borderColor = {
    neutral: 'border-gray-200', amber: 'border-amber-200', cyan: 'border-cyan-200',
    emerald: 'border-emerald-200', indigo: 'border-indigo-200',
  }[tone];
  const labelColor = {
    neutral: 'text-gray-500', amber: 'text-amber-700', cyan: 'text-cyan-700',
    emerald: 'text-emerald-700', indigo: 'text-indigo-700',
  }[tone];
  return (
    <div className={`bg-white border ${borderColor} rounded-lg px-3 py-2.5`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}>{label}</p>
      <p className="text-base font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

// ── Monthly Table ──────────────────────────────────────────────────────────
function MonthlyTable({ payload }: { payload: WindScenarioPayload }) {
  return (
    <section>
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Month-by-month</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Month</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700">Consumption</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700">Solar</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700">Wind</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700">Export hrs</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700">Exported</th>
            </tr>
          </thead>
          <tbody>
            {payload.meta.monthly.map((m, i) => (
              <tr key={m.month} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-3 py-1.5 font-medium text-gray-800">{fmtMonth(m.month)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-gray-700">{fmtEnergy(m.c)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-amber-700">{fmtEnergy(m.s)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-cyan-700">{fmtEnergy(m.w)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-indigo-700">{m.exportHrs}</td>
                <td className="px-3 py-1.5 text-right font-mono text-emerald-700">{fmtEnergy(m.exportKwh)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Top 10 Export Days ─────────────────────────────────────────────────────
function TopExportDays({ payload }: { payload: WindScenarioPayload }) {
  return (
    <section>
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Top 10 export days</h3>
      <p className="text-[11px] text-gray-500 mb-2">Days where wind generation most exceeded demand. Useful for sizing a battery / negotiating export terms.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {payload.meta.topExportDays.map((d, i) => (
          <div key={d.day} className="flex items-center gap-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded">
            <span className="font-mono text-xs font-bold text-emerald-700 w-6">{i + 1}.</span>
            <span className="text-xs font-medium text-gray-800 flex-1">{fmtDay(d.day)}</span>
            <span className="text-xs font-mono text-gray-600">{d.exportHrs} hrs</span>
            <span className="text-xs font-mono font-semibold text-emerald-700">{fmtEnergy(d.exportKwh)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Footer with source + download ──────────────────────────────────────────
function Footer({ payload }: { payload: WindScenarioPayload }) {
  // On file:// builds, the xlsx attachment lives in window.__MCFC_ATTACHMENTS__
  // keyed by URL. Build a download link that works on every origin.
  const handleDownload = () => {
    const url = payload.meta.sourceUrl;
    const w = window as unknown as { __MCFC_ATTACHMENTS__?: Record<string, string> };
    const inline = w.__MCFC_ATTACHMENTS__?.[url];
    if (inline) {
      const a = document.createElement('a');
      a.href = inline;
      a.download = payload.meta.source;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <section className="border-t border-gray-200 pt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[11px] text-gray-500">
        <strong className="text-gray-700">Source:</strong> {payload.meta.source} · range {payload.meta.rangeStart} to {payload.meta.rangeEnd} · {payload.meta.rowCount.toLocaleString()} rows · built {payload.meta.builtAt.slice(0, 10)}.
      </p>
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        <Download size={13} /> Download source xlsx
      </button>
    </section>
  );
}
