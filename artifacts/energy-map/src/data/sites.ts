export interface Site {
  id: string;
  name: string;
  x: number;
  y: number;
  zoom?: number;
}

export const sites: Site[] = [
  {
    id: 'etihad-stadium',
    name: 'Etihad Stadium',
    x: 38,
    y: 40,
    zoom: 2.8,
  },
  {
    id: 'cfa',
    name: 'City Football Academy',
    x: 22,
    y: 32,
    zoom: 2.8,
  },
  {
    id: 'co-op-live',
    name: 'Co-op Live',
    x: 28,
    y: 18,
    zoom: 2.8,
  },
  {
    id: 'eastern-campus',
    name: 'Eastern Campus',
    x: 60,
    y: 50,
    zoom: 2.5,
  },
];
