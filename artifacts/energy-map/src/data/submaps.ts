import map11 from '@assets/11_1779202631496.png';
import map22 from '@assets/22_1779202631496.png';
import map33 from '@assets/33_1779202631495.png';

export interface SubMap {
  id: string;
  name: string;
  image: string;
}

export const submaps: SubMap[] = [
  { id: 'etihad-stadium-map', name: 'Etihad Stadium', image: map11 },
  { id: 'cfa-map', name: 'City Football Academy', image: map33 },
  { id: 'co-op-live-map', name: 'Co-op Live', image: map22 },
];

export function getSubMap(id: string): SubMap | undefined {
  return submaps.find((m) => m.id === id);
}
