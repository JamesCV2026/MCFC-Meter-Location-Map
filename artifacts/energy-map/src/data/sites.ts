export interface Site {
  id: string;
  name: string;
  x: number;
  y: number;
  zoom?: number;
  subMapId?: string;
  color?: string; // optional label text colour (defaults to dark grey)
  // Label style. 'pin' = the original chunky pill with a map-pin icon and
  // zoom-in chevron (Cable A, City Football Academy, etc.). 'tag' = a
  // compact text-only pill, useful for naming buildings or features that
  // don't navigate anywhere. Defaults to 'pin' when omitted.
  style?: 'pin' | 'tag';
  // Which map view this label belongs to. 'main' (default) is the overview;
  // a sub-map id like 'etihad-stadium-map' confines it to that sub-map.
  // The same name can appear on multiple views by adding multiple Site
  // records with distinct ids.
  view?: string;
}

// x, y are percentages of the map canvas — the permanent layout for site
// labels. Edit here to move a label for good; "Move labels" mode in the app
// only saves to the browser (localStorage).
export const sites: Site[] = [
  {
    id: 'etihad-stadium',
    name: 'Etihad Stadium',
    x: 41.39,
    y: 57.20,
    zoom: 2.8,
    subMapId: 'etihad-stadium-map',
  },
  {
    id: 'cfa',
    name: 'City Football Academy',
    x: 71.48,
    y: 59.51,
    zoom: 2.8,
    subMapId: 'cfa-map',
  },
  // Co-op Live removed for the Meter map (2026-07). To bring it back,
  // uncomment this block and the matching entry in submaps.ts.
  // {
  //   id: 'co-op-live',
  //   name: 'Co-op Live',
  //   x: 36.07,
  //   y: 10.69,
  //   zoom: 2.8,
  //   subMapId: 'co-op-live-map',
  // },
];
