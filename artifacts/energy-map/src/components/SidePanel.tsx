import { X, Zap, Activity, Building2, Sun } from 'lucide-react';
import { EnergyAsset, AssetType } from '@/data/assets';

interface SidePanelProps {
  asset: EnergyAsset | null;
  onClose: () => void;
}

const typeConfig: Record<AssetType, { label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  mpan: { label: 'MPAN', Icon: Zap, color: '#dc2626' },
  transformer: { label: 'Transformer', Icon: Activity, color: '#ea580c' },
  substation: { label: 'Substation', Icon: Building2, color: '#2563eb' },
  generation: { label: 'Generation', Icon: Sun, color: '#16a34a' },
};

function fmt(n: number | undefined) {
  if (n === undefined) return '—';
  return n.toLocaleString('en-GB') + ' kWh';
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value}</p>
    </div>
  );
}

export function SidePanel({ asset, onClose }: SidePanelProps) {
  const isOpen = !!asset;

  return (
    <>
      {isOpen && (
        <div
          data-testid="side-panel-overlay"
          className="fixed inset-0 z-40 bg-black/10"
          onClick={onClose}
        />
      )}
      <div
        data-testid="side-panel"
        className="fixed top-0 right-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: 480,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {asset && (() => {
          const cfg = typeConfig[asset.type];
          const { Icon } = cfg;
          return (
            <>
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center rounded-lg shrink-0"
                    style={{ width: 40, height: 40, background: cfg.color }}
                  >
                    <Icon size={20} className="text-white" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: cfg.color }}>
                      {cfg.label}
                    </p>
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">{asset.name}</h2>
                  </div>
                </div>
                <button
                  data-testid="side-panel-close"
                  onClick={onClose}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-4 mt-0.5"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="mb-6">
                  {asset.mpan && <Field label="MPAN" value={<span className="font-mono">{asset.mpan}</span>} />}
                  <Field label="Asset ID" value={asset.id} />
                  <Field label="Position" value={`${asset.x.toFixed(1)}% × ${asset.y.toFixed(1)}%`} />
                  <Field label="Generation" value={fmt(asset.generation_kwh)} />
                  <Field label="Consumption" value={fmt(asset.consumption_kwh)} />
                  {asset.notes && <Field label="Notes" value={asset.notes} />}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold text-gray-800">Half-Hourly Data</h3>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 uppercase tracking-wider">
                      Preview
                    </span>
                  </div>
                  <div
                    data-testid="hh-chart-placeholder"
                    className="w-full rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50"
                    style={{ height: 220 }}
                  >
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 mx-auto mb-2 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500">HH data visualisation goes here</p>
                      <p className="text-xs text-gray-400 mt-0.5">Connect to your data source to populate</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
