import { useState } from 'react';
import { X, Download, Zap, PiggyBank } from 'lucide-react';
import { energyForName, energyTotal } from '@/data/energyData';
import { savingsForName, savingsTotal, SAVINGS_METHODOLOGY } from '@/data/savingsData';
import { SavingsMethodologyBody } from './SavingsMethodologyBody';
import { dataSourcesFor } from '@/data/dataSourceMap';
import { MonthlyEnergyTable } from './MonthlyEnergyTable';
import { HHDataModal } from './HHDataModal';

// Shared solar-array body: the tabbed Generation + Savings view used by both the
// solar-panel SidePanel and the site "blob" AssetInfoPanel, so a building blob
// (e.g. Joie Stadium) shows exactly the same content as its Solar Array marker.
// Renders nothing meaningful unless the named site has generation or savings.
export function SolarPanelBody({ name }: { name: string }) {
  const [tab, setTab] = useState<'generation' | 'savings'>('generation');
  const [showMethodology, setShowMethodology] = useState(false);
  const [hhModal, setHhModal] = useState<{ url: string; label: string } | null>(null);

  const energy = energyForName(name);
  const savings = savingsForName(name);
  const genTotal = energy?.generation ? energyTotal(energy.generation) : undefined;
  const genSource = dataSourcesFor(name)?.generation;
  const showTabs = !!savings; // solar sites with savings data get the two tabs

  return (
    <div className="mt-4">
      {showTabs && (
        <div data-testid="panel-tabs" className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('generation')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'generation' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >Generation</button>
          <button
            onClick={() => setTab('savings')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'savings' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >Savings</button>
        </div>
      )}

      {(!showTabs || tab === 'generation') && (
        <div className="mb-2">
          {genTotal !== undefined && (
            <div className="mb-4 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-4 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Zap size={20} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest">Generation</p>
                  <p className="text-3xl font-extrabold text-emerald-900 leading-none mt-0.5">{genTotal.toLocaleString('en-GB')} kWh</p>
                </div>
              </div>
              <p className="text-[10px] text-emerald-500/90 italic mt-2.5">
                12-month figure (Jul 2025 to Jun 2026 for metered actuals; 12-month annual for modelled).
              </p>
            </div>
          )}
          {energy && <MonthlyEnergyTable energy={energy} name={name} />}
          {genSource && (
            <button
              type="button"
              onClick={() => setHhModal({ url: genSource.url, label: genSource.label })}
              title={genSource.label}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-300 transition-colors"
            >
              <Download size={13} />
              View raw HH generation data
              <span className="text-[10px] font-normal truncate max-w-[160px] text-green-700">{genSource.url.split('/').pop()}</span>
            </button>
          )}
        </div>
      )}

      {showTabs && tab === 'savings' && savings && (
        <div data-testid="savings-view" className="mb-2">
          <div className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <PiggyBank size={20} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest">25-year total savings</p>
                <p className="text-3xl font-extrabold text-blue-900 leading-none mt-0.5">{(savings.unit ?? '£')}{savingsTotal(savings).toLocaleString('en-GB')}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-2">{SAVINGS_METHODOLOGY}</p>
          <button
            onClick={() => setShowMethodology(true)}
            className="block mb-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
          >
            Read the full methodology →
          </button>
          <a
            href="data/MCFC Solar Savings.xlsx"
            download
            className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-300 transition-colors"
          >
            <Download size={13} />
            Download savings spreadsheet
          </a>
          <h3 className="text-sm font-bold text-gray-800 mb-2">Year 1–25 savings</h3>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 align-top">
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Year</th>
                  <th className="text-right px-3 py-2 whitespace-nowrap">
                    <span className="font-semibold text-blue-600">Savings</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {savings.years.map((v, i) => (
                  <tr key={i} className={i % 2 ? 'bg-gray-50/60' : ''}>
                    <td className="px-3 py-1 text-gray-600 whitespace-nowrap">Year {i + 1}</td>
                    <td className="px-3 py-1 text-right font-mono text-gray-800">{(savings.unit ?? '£')}{v.toLocaleString('en-GB')}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 bg-gray-100 font-bold">
                  <td className="px-3 py-2 text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900">{(savings.unit ?? '£')}{savingsTotal(savings).toLocaleString('en-GB')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showMethodology && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowMethodology(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
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

      {hhModal && (
        <HHDataModal url={hhModal.url} title={name} subtitle={hhModal.label} onClose={() => setHhModal(null)} />
      )}
    </div>
  );
}
