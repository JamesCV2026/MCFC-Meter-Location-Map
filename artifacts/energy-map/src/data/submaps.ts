import map11 from '@assets/Etihad_Stadium_Map.png';
import map22 from '@assets/City_Football_Academy_Map.png';
import map33 from '@assets/33_1779203337354.png';

export interface SubMap {
  id: string;
  name: string;
  image: string;
}

export const submaps: SubMap[] = [
  { id: 'etihad-stadium-map', name: 'Etihad Campus', image: map11 },
  { id: 'cfa-map', name: 'City Football Academy', image: map22 },
  { id: 'co-op-live-map', name: 'Co-op Live', image: map33 },
];

export function getSubMap(id: string): SubMap | undefined {
  return submaps.find((m) => m.id === id);
}
