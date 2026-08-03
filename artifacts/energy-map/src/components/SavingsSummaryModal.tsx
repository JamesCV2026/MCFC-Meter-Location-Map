import { X, PoundSterling } from 'lucide-react';
import { Fragment, useState } from 'react';
import {
  SAVINGS_SUMMARY, SAVINGS_GRAND_TOTAL, SAVINGS_PORTFOLIO_YEARS,
  SAVINGS_METHODOLOGY_BRIEF, SavingsSummaryRow,
} from '@/data/savingsData';
import { SavingsMethodologyBody } from './SavingsMethodologyBody';

interface Props {
  open: boolean;
  onClose: () => void;
  // Row click → open that site's panel (the parent closes this modal first).
  onSelectSite?: (panelName: string, panelId: string) => void;
}

const HEADER_BG = '#1e3a5f';
const GROUP_BG = '#e8eef5';
const GROUP_TOTAL_BG = '#2c4a6e';
const ACTUAL_COLOR = '#166534';
const MODELLED_COLOR = '#b45309';
const ACTUALS_BG = '#f0fdf4';
const MODELLED_BG = '#fff7ed';

const PHASES: { phase: 1 | 2 | 3; label: string }[] = [
  { phase: 1, label: 'Phase 1 — Actual metered' },
  { phase: 2, label: 'Phase 2 — Modelled' },
  { phase: 3, label: 'Phase 3 — Modelled' },
];

const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');

export function SavingsSummaryModal({ open, onClose, onSelectSite }: Props) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [view, setView] = useState<'byAsset' | 'cumulative'>('byAsset');
  if (!open) return null;

  const Row = ({ r }: { r: SavingsSummaryRow }) => (
    <tr className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
      <td className="px-3 py-1.5 whitespace-nowrap">
        <button
          type="button"
          onClick={() => onSelectSite?.(r.panelName, r.panelId)}
          className="text-gray-700 hover:text-blue-700 hover:underline font-medium text-left"
          title={`Open the ${r.panelName} panel`}
        >
          {r.name}
        </button>
      </td>
      <td className="px-3 py-1.5">
        <span className="font-bold" style={{ color: r.actual ? ACTUAL_COLOR : MODELLED_COLOR }}>
          {r.actual ? 'Actual' : 'Modelled'}
        </span>
      </td>
      {/* share of the portfolio's total savings */}
      <td className="px-3 py-1.5 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <span className="block h-2 flex-1 min-w-[40px] rounded-full bg-blue-100 overflow-hidden">
            <span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.max(2, (r.total / SAVINGS_GRAND_TOTAL) * 100)}%` }} />
          </span>
          <span className="text-[11px] font-mono text-gray-500 w-9 text-right shrink-0">{Math.round((r.total / SAVINGS_GRAND_TOTAL) * 100)}%</span>
        </div>
      </td>
      <td className="px-3 py-1.5 text-right font-mono text-gray-700 whitespace-nowrap">{gbp(r.year1)}</td>
      <td className="px-3 py-1.5 text-right font-mono text-gray-900 whitespace-nowrap">{gbp(r.total)}</td>
    </tr>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      data-testid="savings-summary-modal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <PoundSterling size={18} className="text-blue-600" />
              25-Year Savings Summary
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Total projected savings across the solar portfolio, by asset and phase.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Headline: total (left) + plain-English methodology summary (right) */}
        <div className="px-5 pt-4 shrink-0">
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <PoundSterling size={22} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest">Total savings over 25 years — whole solar portfolio</p>
                <p className="text-4xl sm:text-5xl font-extrabold text-blue-900 leading-none mt-1.5 whitespace-nowrap">{gbp(SAVINGS_GRAND_TOTAL)}</p>
              </div>
            </div>
            <div className="min-w-0 sm:border-l sm:border-blue-200/70 sm:pl-4">
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-0.5">How the savings are worked out</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{SAVINGS_METHODOLOGY_BRIEF}</p>
              <button
                onClick={() => setShowMethodology(true)}
                className="mt-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
              >
                Read the full methodology →
              </button>
            </div>
          </div>
        </div>

        {/* Tabs — switch between the by-asset view and the cumulative view */}
        <div className="px-5 pt-4 shrink-0">
          <div className="flex gap-2 border-b border-gray-200">
            {([['byAsset', 'Savings by asset'], ['cumulative', 'Cumulative savings']] as const).map(([id, label]) => (
              <button
                key={id}
                data-testid={`savings-tab-${id}`}
                onClick={() => setView(id)}
                className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors ${view === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {view === 'byAsset' && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2">Savings by asset (25-year total)</h3>
              <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ background: HEADER_BG }}>
                      <th className="text-left px-3 py-2 text-white font-semibold">Asset (click to open)</th>
                      <th className="text-left px-3 py-2 text-white font-semibold whitespace-nowrap">Data type</th>
                      <th className="text-left px-3 py-2 text-white font-semibold hidden sm:table-cell whitespace-nowrap">Share of total savings</th>
                      <th className="text-right px-3 py-2 text-white font-semibold whitespace-nowrap">Year 1 savings (with export)</th>
                      <th className="text-right px-3 py-2 text-white font-semibold whitespace-nowrap">25-year savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PHASES.map(({ phase, label }) => {
                      const rows = SAVINGS_SUMMARY.filter((r) => r.phase === phase);
                      if (!rows.length) return null;
                      const subtotal = rows.reduce((s, r) => s + r.total, 0);
                      const actual = rows[0].actual;
                      return (
                        <Fragment key={phase}>
                          <tr style={{ background: GROUP_BG }}>
                            <td colSpan={5} className="px-3 py-1.5 font-bold uppercase tracking-wide text-[11px]" style={{ color: HEADER_BG }}>
                              {label}
                            </td>
                          </tr>
                          {rows.map((r) => <Row key={r.key} r={r} />)}
                          <tr style={{ background: actual ? ACTUALS_BG : MODELLED_BG }}>
                            <td colSpan={3} className="px-3 py-1.5 font-bold whitespace-nowrap" style={{ color: actual ? ACTUAL_COLOR : MODELLED_COLOR }}>
                              Phase {phase} subtotal
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold whitespace-nowrap" style={{ color: actual ? ACTUAL_COLOR : MODELLED_COLOR }}>
                              {gbp(rows.reduce((s, r) => s + r.year1, 0))}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold whitespace-nowrap" style={{ color: actual ? ACTUAL_COLOR : MODELLED_COLOR }}>
                              {gbp(subtotal)}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                    <tr style={{ background: GROUP_TOTAL_BG }}>
                      <td colSpan={3} className="px-3 py-2 text-white font-bold uppercase tracking-wide text-[11px]">
                        Portfolio total (all assets)
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-white whitespace-nowrap">
                        {gbp(SAVINGS_SUMMARY.reduce((s, r) => s + r.year1, 0))}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-white whitespace-nowrap">
                        {gbp(SAVINGS_GRAND_TOTAL)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'cumulative' && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2">Savings building up, year by year</h3>
              <div className="max-w-2xl rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ background: HEADER_BG }}>
                      <th className="text-left px-2 py-2 text-white font-semibold">Year</th>
                      <th className="text-right px-2 py-2 text-white font-semibold whitespace-nowrap">Saved that year</th>
                      <th className="text-right px-2 py-2 text-white font-semibold whitespace-nowrap">Total so far</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAVINGS_PORTFOLIO_YEARS.map((y, i) => (
                      <tr key={y.year} className={i % 2 ? 'bg-gray-50/60' : ''}>
                        <td className="px-2 py-1 text-gray-600 whitespace-nowrap">Year {y.year}</td>
                        <td className="px-2 py-1 text-right font-mono text-gray-700">{gbp(y.annual)}</td>
                        <td className="px-2 py-1 text-right font-mono font-semibold text-blue-700">{gbp(y.cumulative)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: GROUP_TOTAL_BG }}>
                      <td colSpan={2} className="px-2 py-2 text-white font-bold uppercase tracking-wide text-[10px]">Total after 25 years</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-white whitespace-nowrap">{gbp(SAVINGS_GRAND_TOTAL)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full methodology modal */}
      {showMethodology && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowMethodology(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-base font-bold text-gray-900">Savings methodology</h3>
              <button onClick={() => setShowMethodology(false)} className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <SavingsMethodologyBody />
          </div>
        </div>
      )}
    </div>
  );
}
