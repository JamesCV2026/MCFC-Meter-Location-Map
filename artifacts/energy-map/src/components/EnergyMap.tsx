import { useState, useCallback } from 'react';
import { assets, EnergyAsset, AssetType } from '@/data/assets';
import { MarkerTooltip } from './MarkerTooltip';
import { SidePanel } from './SidePanel';
import { Legend } from './Legend';
import { FilterPanel } from './FilterPanel';
import mapImage from '@assets/Overview_1779198593346.png';

const ALL_TYPES: AssetType[] = ['mpan', 'transformer', 'substation', 'generation'];

export function EnergyMap() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<EnergyAsset | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<AssetType>>(new Set(ALL_TYPES));

  const handleFilterChange = useCallback((type: AssetType, checked: boolean) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(type);
      else next.delete(type);
      return next;
    });
  }, []);

  const handleOpen = useCallback((asset: EnergyAsset) => {
    setSelectedAsset(asset);
    setHoveredId(null);
  }, []);

  const visibleAssets = assets.filter((a) => visibleTypes.has(a.type));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#6CABDD' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Etihad Campus</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Energy Asset Map</p>
          </div>
        </div>
        <div className="h-5 w-px bg-gray-200 mx-1" />
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span data-testid="asset-count">
            <span className="font-semibold text-gray-800">{assets.length}</span> assets registered
          </span>
          <span>
            <span className="font-semibold text-gray-800">{visibleAssets.length}</span> visible
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-6">
        <div
          data-testid="map-container"
          className="relative w-full rounded-xl overflow-hidden shadow-xl border border-gray-200 bg-white"
          style={{ maxWidth: 1600 }}
        >
          <img
            src={mapImage}
            alt="Etihad Campus map"
            data-testid="map-image"
            className="w-full h-auto block"
            draggable={false}
          />

          <Legend />
          <FilterPanel visible={visibleTypes} onChange={handleFilterChange} />

          {visibleAssets.map((asset) => {
            const isHovered = hoveredId === asset.id;
            return (
              <div
                key={asset.id}
                data-testid={`marker-${asset.id}`}
                className="absolute"
                style={{
                  left: `${asset.x}%`,
                  top: `${asset.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isHovered ? 25 : 20,
                }}
                onMouseEnter={() => setHoveredId(asset.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleOpen(asset)}
              >
                <button
                  className="relative flex items-center justify-center cursor-pointer focus:outline-none"
                  style={{ width: 18, height: 18 }}
                  aria-label={`Open ${asset.name}`}
                >
                  <span
                    className="absolute rounded-full marker-pulse"
                    style={{
                      width: 18,
                      height: 18,
                      background: '#dc2626',
                      border: '2px solid white',
                      boxShadow: '0 2px 8px rgba(220,38,38,0.5)',
                    }}
                  />
                </button>

                {isHovered && (
                  <MarkerTooltip asset={asset} onViewData={() => handleOpen(asset)} />
                )}
              </div>
            );
          })}
        </div>
      </main>

      <SidePanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}
