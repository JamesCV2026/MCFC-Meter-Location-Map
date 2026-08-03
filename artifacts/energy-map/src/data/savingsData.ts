// AUTO-GENERATED from "CFG_MCFC_100pct_SelfConsumption.xlsx" (25-year annual
// savings, GBP, 100% self-consumption scenario).
// Edit METHODOLOGY below for the narrative shown above each savings table.

export interface AssetSavings {
  unit?: string;        // default GBP symbol
  years: number[];      // annual savings, year 1..25
}

export const SAVINGS_METHODOLOGY = `We take the amount of solar electricity the site generates each year, assume it is all used on site, and compare the cost of buying that electricity under the PPA against what the same electricity would cost from the grid. The difference is the saving. We run that comparison year by year across the full 25-year term, allowing for the PPA price rising 3% a year while grid prices rise 8% a year. The figures below show the result for each site and for the portfolio as a whole.`;

// One-line version for tight spaces (e.g. the summary panel headline).
export const SAVINGS_METHODOLOGY_BRIEF = `The saving is the gap between the site's solar electricity under the PPA and the same power bought from the grid, projected year by year over 25 years (PPA +3%/yr vs grid +8%/yr).`;


const SAVINGS: Record<string, number[]> = {
  'joie-stadium': [47982, 57492, 67874, 79198, 91539, 104979, 119603, 135508, 152794, 171569, 191953, 214070, 238058, 264062, 292242, 322766, 355817, 391594, 430306, 472184, 517471, 566434, 619355, 676542, 738324],
  'indoor-pitch': [33831, 40536, 47857, 55841, 64542, 74018, 84329, 95543, 107731, 120969, 135341, 150935, 167848, 186184, 206052, 227574, 250878, 276103, 303398, 332925, 364856, 399378, 436692, 477013, 520574],
  'tv-studio': [998, 1196, 1412, 1648, 1905, 2184, 2489, 2820, 3179, 3570, 3994, 4454, 4954, 5495, 6081, 6716, 7404, 8148, 8954, 9825, 10768, 11786, 12888, 14078, 15364],
  'fm-building': [5051, 6052, 7144, 8336, 9635, 11050, 12589, 14263, 16083, 18059, 20205, 22533, 25058, 27795, 30761, 33974, 37453, 41218, 45293, 49701, 54468, 59622, 65192, 71212, 77714],
  'ground-mount': [17752, 21271, 25112, 29301, 33867, 38840, 44250, 50135, 56530, 63477, 71018, 79201, 88076, 97697, 108122, 119416, 131644, 144880, 159203, 174697, 191452, 209567, 229147, 250304, 273160],
  'womens': [3102, 3717, 4388, 5120, 5918, 6786, 7732, 8760, 9877, 11091, 12409, 13839, 15389, 17071, 18892, 20865, 23002, 25315, 27818, 30525, 33452, 36618, 40039, 43736, 47728],
  'hotel': [5384, 6452, 7617, 8887, 10272, 11780, 13422, 15206, 17146, 19253, 21540, 24022, 26714, 29632, 32795, 36220, 39929, 43944, 48288, 52987, 58069, 63564, 69502, 75920, 82853],
  'commercial': [4528, 5425, 6405, 7474, 8638, 9906, 11286, 12787, 14418, 16190, 18113, 20201, 22464, 24918, 27577, 30458, 33576, 36952, 40606, 44557, 48831, 53451, 58445, 63841, 69674],
  'towers': [7478, 8960, 10578, 12342, 14266, 16360, 18639, 21118, 23811, 26737, 29914, 33361, 37099, 41152, 45543, 50300, 55451, 61026, 67059, 73585, 80643, 88273, 96520, 105432, 115059],
};

const NAME_TO_KEY: Record<string, string> = {
  'Joie Stadium': 'joie-stadium',
  'Joie Stadium Solar Array': 'joie-stadium',
  'Indoor Pitch': 'indoor-pitch',
  'Indoor Pitch Solar Array': 'indoor-pitch',
  'TV Studio': 'tv-studio',
  'TV Studio Solar Array': 'tv-studio',
  'FM Building': 'fm-building',
  'FM Building Solar Array': 'fm-building',
  'Ground Mount': 'ground-mount',
  'Ground Mount 2A': 'ground-mount',
  'Ground Mount Array': 'ground-mount',
  'Womens': 'womens',
  "Women's Facility": 'womens',
  'MCWFC Solar': 'womens',
  'Hotel': 'hotel',
  'Hotel Solar Array': 'hotel',
  'Hotel Building': 'hotel',
  'Commercial': 'commercial',
  'Commercial Building': 'commercial',
  'Commercial Building Solar Array': 'commercial',
  'Towers': 'towers',
  'Etihad Towers': 'towers',
};

export function savingsForName(name: string): AssetSavings | undefined {
  const key = NAME_TO_KEY[name];
  const years = key ? SAVINGS[key] : undefined;
  return years ? { unit: "£", years } : undefined;
}

export function savingsTotal(s: AssetSavings): number {
  return s.years.reduce((a, b) => a + (b || 0), 0);
}

// ── Portfolio savings summary ───────────────────────────────────────────────
// A flat, display-ready breakdown of the 25-year total savings per asset,
// grouped by delivery phase (Phase 1 = actual metered, Phase 2/3 = modelled),
// for the Savings Summary modal. Mirrors the generation breakdown in DataPanel.
export interface SavingsSummaryRow {
  key: string;
  name: string;       // display label in the summary table
  panelName: string;  // resolves the site panel (energy/savings by name)
  panelId: string;    // id for the panel's photo / stored overrides
  phase: 1 | 2 | 3;
  actual: boolean;    // Phase 1 uses actual metered generation; 2/3 modelled
  year1: number;      // Year-1 saving (£)
  total: number;      // 25-year total savings (£)
}

export const SAVINGS_SUMMARY: SavingsSummaryRow[] = ([
  { key: 'joie-stadium',  name: 'Joie Stadium',                phase: 1, panelName: 'Joie Stadium',      panelId: 'cfa-site-joie-stadium' },
  { key: 'indoor-pitch',  name: 'Indoor Pitch (Performance Centre)', phase: 1, panelName: 'Indoor Pitch',      panelId: 'cfa-site-indoor-pitch' },
  { key: 'fm-building',   name: 'FM Building',                 phase: 1, panelName: 'FM Building',       panelId: 'cfa-site-fm-building' },
  { key: 'tv-studio',     name: 'TV Studio',                   phase: 1, panelName: 'TV Studio',         panelId: 'cfa-site-tv-studio' },
  { key: 'ground-mount',  name: 'Ground Mount (Phase 2A)',     phase: 2, panelName: 'Ground Mount',      panelId: 'ground-mount-2a' },
  { key: 'womens',        name: "Women's Facility (MCWFC)",    phase: 2, panelName: "Women's Facility",  panelId: 'cfa-site-womens-facility' },
  { key: 'hotel',         name: 'Hotel',                       phase: 3, panelName: 'Hotel',             panelId: 'etihad-site-hotel' },
  { key: 'commercial',    name: 'Commercial',                  phase: 3, panelName: 'Commercial',        panelId: 'etihad-site-commercial' },
  { key: 'towers',        name: 'Etihad Towers',               phase: 3, panelName: 'Etihad Towers',     panelId: 'etihad-site-towers' },
] as Array<Omit<SavingsSummaryRow, 'actual' | 'year1' | 'total'>>).map((r) => ({
  ...r,
  actual: r.phase === 1,
  year1: (SAVINGS[r.key] ?? [0])[0] ?? 0,
  total: (SAVINGS[r.key] ?? []).reduce((a, b) => a + (b || 0), 0),
}));

export const SAVINGS_GRAND_TOTAL = SAVINGS_SUMMARY.reduce((s, r) => s + r.total, 0);

// Portfolio savings year by year: annual (all assets summed) + running cumulative.
export interface PortfolioSavingsYear { year: number; annual: number; cumulative: number; }
export const SAVINGS_PORTFOLIO_YEARS: PortfolioSavingsYear[] = (() => {
  const nYears = Math.max(0, ...SAVINGS_SUMMARY.map((r) => (SAVINGS[r.key] ?? []).length));
  const out: PortfolioSavingsYear[] = [];
  let cumulative = 0;
  for (let i = 0; i < nYears; i++) {
    const annual = SAVINGS_SUMMARY.reduce((s, r) => s + ((SAVINGS[r.key] ?? [])[i] || 0), 0);
    cumulative += annual;
    out.push({ year: i + 1, annual, cumulative });
  }
  return out;
})();
