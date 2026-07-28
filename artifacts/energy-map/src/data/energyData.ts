// ── Campus energy data ──────────────────────────────────────────────────────
// Parsed from the hourly CSV exports in "Backend City Data". Each series holds
// consecutive monthly totals (kWh) starting January 2025. Lengths vary: most
// buildings have 12 months (2025); the metered "Actual" series run 16 months
// (to April 2026). Generated from the source CSVs — re-run the parse to refresh.

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const ENERGY_START_YEAR = 2025; // every series' values[0] is January 2025

export type DataType = 'Actual' | 'Modelled';

export interface EnergySeries {
  dataType: DataType;
  values: number[]; // consecutive monthly kWh totals from Jan 2025
  // Offset (in months) from Jan 2025 where this series' values[0] actually
  // sits. Defaults to 0 (Jan 2025). Use when a meter was commissioned mid-
  // way through the timeline so the leading months render as "—" rather than
  // zeros. Example: startIndex = 5 means values[0] = June 2025.
  startIndex?: number;
}

export interface BuildingEnergy {
  consumption?: EnergySeries;
  generation?: EnergySeries;
}

// Total across every month the series covers.
export function energyTotal(series: EnergySeries): number {
  return series.values.reduce((a, b) => a + b, 0);
}

// Month label for value index i (0 = Jan 2025). Handles negative indices too
// (-1 = Dec 2024, -8 = May 2024), so series whose meters predate Jan 2025
// can be plotted without losing months.
export function energyMonthLabel(i: number): string {
  const m = ((i % 12) + 12) % 12;
  const year = ENERGY_START_YEAR + Math.floor(i / 12);
  return `${MONTH_ABBR[m]} ${year}`;
}

// Per-building energy, keyed by a stable building key.
export const energyData: Record<string, BuildingEnergy> = {
  'chp-machines': {
    consumption: { dataType: 'Modelled', values: [317961, 287045, 278831, 223984, 40224, 9165, 180753, 187039, 267757, 230682, 395764, 390364] },
  },

  // CHP Machine 1 — ACTUAL meter readings, hourly. Two .xls exports combined:
  // 09/07/2025 → 31/12/2025 and 01/01/2026 → 02/06/2026. November 2025 was
  // off (0 kWh). June 2026 is partial (first 2 days). startIndex = 6 means
  // values[0] sits at July 2025 (six months after Jan 2025). Stored on the
  // consumption field per the user's preference for treating CHP output as
  // a campus electricity consumption line item.
  'chp-machine-1': {
    consumption: {
      dataType: 'Actual',
      startIndex: 6,
      values: [127120, 171417, 86329, 23205, 0, 147953, 207345, 170151, 223156, 165348, 186355, 13437],
    },
  },

  // CHP Machine 2 — ACTUAL meter readings, hourly. Two .xls exports combined:
  // 11/09/2025 → 31/12/2025 and 01/01/2026 → 02/06/2026. Dec 2025 and Jan
  // 2026 generated 0 kWh (meter on but idle). Feb to April 2026 are absent
  // from the export (4-month gap, filled with 0). May/Jun 2026 partial.
  // Padded with two leading zeros to align to a 12-month Jul 2025 to Jun
  // 2026 window (matching CHP Machine 1). startIndex = 6 → values[0] is
  // July 2025. Total: 475,256 kWh.
  'chp-machine-2': {
    consumption: {
      dataType: 'Actual',
      startIndex: 6,
      values: [0, 0, 123348, 209407, 111430, 0, 0, 0, 0, 0, 28199, 2872],
    },
  },
  'commercial': {
    consumption: { dataType: 'Modelled', values: [215797, 185924, 163508, 152620, 147904, 129062, 134657, 130807, 149302, 169184, 172437, 215797] },
    generation: { dataType: 'Modelled', values: [1541, 3285, 5473, 8695, 10957, 10457, 10323, 8358, 6370, 3909, 1976, 1251] },
  },
  'hotel': {
    consumption: { dataType: 'Modelled', values: [494797, 437364, 398328, 352719, 349432, 307709, 308754, 318663, 345052, 387921, 424467, 494797] },
    generation: { dataType: 'Modelled', values: [1833, 3907, 6508, 10340, 13030, 12436, 12276, 9940, 7575, 4649, 2350, 1487] },
  },
  'mcwfc': {
    consumption: { dataType: 'Modelled', values: [172651, 149072, 131484, 122173, 118622, 103610, 107745, 105209, 119536, 135345, 138804, 172651] },
    generation: { dataType: 'Modelled', values: [1030, 2249, 3724, 5945, 7525, 7181, 7091, 5812, 4319, 2690, 1335, 832] },
  },
  // MCWFC rooftop solar array. Same modelled generation series as the 'mcwfc'
  // building, surfaced as a generation-only key so the "MCWFC Solar" array
  // panel shows generation alone (the building's consumption stays on the
  // Women's Facility / MPAN 11 panel). 12-month modelled total ≈ 49,733 kWh.
  'mcwfc-solar': {
    generation: { dataType: 'Modelled', values: [1030, 2249, 3724, 5945, 7525, 7181, 7091, 5812, 4319, 2690, 1335, 832] },
  },
  // Phase 1 solar — ACTUAL metered generation, Jul 2025 to Jun 2026 (12 months),
  // from the "as recorded" plant export (plant_generation_sorted_cleaned).
  // Annual totals: Joie Stadium 769,313 kWh (14 strings summed), Indoor Pitch /
  // Performance Centre 542,423 kWh (6 meters summed), FM Building 80,977 kWh,
  // TV Studio 16,008 kWh. Phase 1 total 1,408,721 kWh. All four use
  // startIndex = 6 (values[0] = July 2025) and reconcile to the per-inverter
  // breakdown in inverterGenData.ts.
  'fm-building': {
    generation: {
      dataType: 'Actual',
      startIndex: 6,
      values: [13604, 11819, 8094, 3621, 2047, 1263, 1490, 2274, 5239, 8404, 11336, 11786],
    },
  },
  'indoor-pitch': {
    generation: {
      dataType: 'Actual',
      startIndex: 6,
      values: [95001, 83731, 56519, 26545, 14133, 8484, 10040, 16629, 37263, 56585, 60353, 77140],
    },
  },
  'joie-stadium': {
    generation: {
      dataType: 'Actual',
      startIndex: 6,
      values: [139220, 122104, 82423, 37313, 19369, 9622, 12207, 20378, 47921, 75228, 100879, 102649],
    },
  },
  'ground-mount-2a': {
    generation: { dataType: 'Modelled', values: [8367, 16448, 22533, 33314, 39390, 36281, 36268, 30974, 25419, 17910, 10368, 7356] },
  },
  // TV Studio — ACTUAL metered generation, Jul 2025 to Jun 2026 (12 months).
  // Total: 16,008 kWh / 16.0 MWh. startIndex = 6 → values[0] is July 2025.
  'tv-studio': {
    generation: {
      dataType: 'Actual',
      startIndex: 6,
      values: [2480, 2201, 1507, 668, 370, 208, 173, 419, 1199, 2314, 2422, 2047],
    },
  },

  // Proposed CFA wind turbine — modelled generation from the wind-model
  // workbooks (8,760 generic-year hourly rows, aggregated to months). The three
  // wind-turbine markers are candidate LOCATIONS for ONE turbine, so they map
  // to the 6.2 MW (primary large-turbine) series. The 750 kW alternative is
  // kept here too for the side-by-side comparison in the bottom Data Panel.
  //   6.2 MW: 12,328,307 kWh/yr (≈22.7% capacity factor)
  //   750 kW:  1,470,487 kWh/yr (≈22.4% capacity factor)
  'wind-turbine-6-2mw': {
    generation: { dataType: 'Modelled', values: [1265446, 1674673, 1339588, 834703, 632339, 675856, 604191, 739427, 731348, 1229747, 1191248, 1409741] },
  },
  'wind-turbine-750kw': {
    generation: { dataType: 'Modelled', values: [148262, 196730, 157555, 99631, 78903, 82885, 75340, 90663, 89691, 145134, 140133, 165560] },
  },

  // Diesel generators — modelled standby HH run data, Jan-Dec 2025, Energy (kWh)
  // column, from MCFC_Genset_HH_2025_4.xlsx. Treated as a consumption line item
  // (like the CHP units). All 4 sets run as occasional standby, totalling
  // ~259 MWh/yr (CFA pair ~17 MWh each, Etihad pair ~109 / ~116 MWh).
  //   DG1 = Gen 3 (CFA), DG2 = Gen 4 (CFA), DG3 = Gen 6 (Etihad), DG4 = Gen 5 (Etihad).
  'diesel-gen-1': {
    consumption: { dataType: 'Modelled', values: [1217, 1789, 1701, 1766, 1737, 111, 139, 1190, 1741, 1798, 2307, 1728] },
  },
  'diesel-gen-2': {
    consumption: { dataType: 'Modelled', values: [1225, 1772, 1813, 1772, 1797, 111, 140, 1205, 1699, 1760, 2324, 1762] },
  },
  'diesel-gen-3': {
    consumption: { dataType: 'Modelled', values: [8755, 8931, 8747, 8753, 13125, 9161, 9190, 10089, 8831, 5833, 8669, 8722] },
  },
  'diesel-gen-4': {
    consumption: { dataType: 'Modelled', values: [9305, 9361, 9286, 9479, 13732, 9720, 9792, 10788, 9452, 6384, 9395, 9250] },
  },

  // Mamma Mia! Theatre — modelled HH consumption from the assumption-based
  // model spreadsheet. 425 MWh/yr, 2000 m² immersive dinner-theatre venue.
  // startIndex 12 → values[0] is January 2026, since the model runs in 2026.
  'mamma-mia': {
    consumption: {
      dataType: 'Modelled',
      startIndex: 12,
      values: [41666, 35432, 33806, 32447, 33116, 31555, 38913, 38366, 32027, 34301, 34316, 39053],
    },
  },

  // Etihad Stadium — actual metered consumption, combined from the half-hourly
  // data of its 3 MPANs (1650000243940, 1650000425182, 1620000879750). The
  // per-MPAN breakdown lives below as etihad-mpan-1/2/3.
  //
  // Updated 03/06/2026 to use the fresh combined HH workbook supplied by
  // James, which spans 23 May 2024 to 21 May 2026 (25 months, 20.79 GWh).
  // The full dataset is in /data/Etihad Stadium Combined HH.csv and viewable
  // via the panel's "View raw HH data" button. Here we store the MOST RECENT
  // 12 MONTHS only (Jun 2025 to May 2026) so the panel headline figure and
  // the MonthlyEnergyTable show a clean 12-month annual view.
  // startIndex = 5 means values[0] = June 2025.
  'etihad-stadium': {
    consumption: {
      dataType: 'Actual',
      startIndex: 5,
      values: [666009, 678653, 763393, 794806, 980279, 1095622, 1108709, 1119187, 1023033, 864727, 712482, 491985],
    },
  },

  // Etihad Stadium MPAN breakdown — three meters making up etihad-stadium.
  // Full series from each meter's first reading. Leading/trailing months are
  // partial where the source data starts/ends mid-month (May 2024 and May
  // 2026); values are taken as-is so totals match the supplied spreadsheets.

  // MPAN 5  ← Etihad 1 sheet (MPAN 1650000243940). Low-usage backup meter.
  // Trimmed to the latest 12 months Jun 2025 to May 2026. startIndex = 5.
  // Total over this window: 2,190 kWh. Full 25-month history available in
  // the source CSV /data/Etihad 1 Consumption Actual.csv.
  'etihad-mpan-1': {
    consumption: {
      dataType: 'Actual',
      startIndex: 5,
      values: [0, 0, 27, 92, 1355, 4, 565, 119, 1, 0, 25, 2],
    },
  },
  // MPAN 16 ← Etihad 2 sheet (MPAN 1650000425182). Main stadium meter.
  // Trimmed to the latest 12 months Jun 2025 to May 2026. startIndex = 5.
  // Total over this window: 5,110,533 kWh. Full 23-month history available
  // in /data/Etihad 2 Consumption Acutal.csv.
  'etihad-mpan-2': {
    consumption: {
      dataType: 'Actual',
      startIndex: 5,
      values: [341821, 340734, 386753, 376430, 481288, 548422, 518282, 581264, 499871, 426871, 358132, 250665],
    },
  },
  // MPAN 15 ← Etihad 3 sheet (MPAN 1620000879750). Main stadium meter.
  // Trimmed to the latest 12 months Jun 2025 to May 2026. startIndex = 5.
  // Total over this window: 5,186,164 kWh. Full 25-month history available
  // in /data/Etihad 3 Consumption Acutal.csv.
  // Sum of the three trimmed MPANs = 10,298,887 kWh ≈ 10,298.9 MWh,
  // matching the Etihad Stadium combined headline exactly.
  'etihad-mpan-3': {
    consumption: {
      dataType: 'Actual',
      startIndex: 5,
      values: [324188, 337920, 376612, 418285, 497636, 547196, 589863, 537805, 523161, 437856, 354325, 241317],
    },
  },

  // Co-op Live Arena — actual metered consumption, MPAN 1650000208876.
  // 12 months of daily totals (Jun 2025 – May 2026) read from the file's
  // pre-summed TotalUnits column. Modelled solar generation alongside is
  // from the ~1.40 MWp roof array model (Manchester 53.49 N, low-tilt
  // commercial roof, central yield ~893 kWh/kWp/yr → 1,250,000 kWh/yr).
  'co-op-live': {
    consumption: {
      dataType: 'Actual',
      // values[0] = June 2025 (5 months after the Jan-2025 timeline start).
      startIndex: 5,
      values: [691144, 733675, 563903, 620925, 706564, 691459, 739393, 688205, 730138, 684609, 615565, 650446],
    },
    generation: {
      dataType: 'Modelled',
      startIndex: 5,
      values: [174632, 168067, 144433, 108981, 70903, 38078, 23634, 34139, 59086, 107668, 147059, 173319],
    },
  },

  // Etihad Walkways — actual metered, MPAN 1650000448524. Meter energised
  // mid-2025: Jan–Apr 2025 read zero (not yet commissioned); real data from
  // May 2025 onward. Padded to a full 12-month Jan to Dec 2025 window so
  // the asset table displays the same shape as every other site. Trailing
  // zeros (Oct/Nov/Dec 2025) reflect months where the source export had
  // no readings yet. Total: 10,335 kWh.
  // Etihad Campus Walkways — actual metered consumption, MPAN 1650000448533
  // (came online May 2025; the file's other MPAN 1650000448524 reads zero).
  // Readings run May to 12 Oct 2025. October is a PARTIAL month (1-12 Oct =
  // 901 kWh) but included per James so the total reflects all recorded
  // consumption. Total = 11,236 kWh. values[0] = January 2025.
  'etihad-walkways': {
    consumption: { dataType: 'Actual', values: [0, 0, 0, 0, 1593, 1989, 2303, 2242, 2208, 901, 0, 0] },
  },

  // City At Home — actual metered consumption, MPAN 1630000819961.
  // Full 12-month window from the refreshed HH export: Jun 2025 to May 2026,
  // 364 daily readings aggregated to monthly. Total 278,395 kWh / 278.4 MWh.
  // startIndex = 5 → values[0] is June 2025 (five months after the Jan-2025
  // series-start convention used across this file).
  'city-at-home': {
    consumption: {
      dataType: 'Actual',
      startIndex: 5,
      values: [23699, 24736, 25088, 21295, 20562, 22859, 23872, 26679, 23103, 23046, 20655, 22801],
    },
  },

  // City Football Academy — actual metered consumption, MPAN 1640000249306.
  // 12-month window from the 16-month half-hourly export (the latest 12 months,
  // May 2025 to Apr 2026). startIndex = 4 → values[0] is May 2025.
  // Total: 4,122,873 kWh / 4,122.9 MWh — matches the exec summary headline.
  'cfa': {
    consumption: {
      dataType: 'Actual',
      startIndex: 4,
      // Aligned to the Phase 4 Wind Feasibility Study (June 2026): CFA annual
      // demand 4,058 MWh (MPAN HH May 2025-Apr 2026). Monthly shape preserved,
      // rescaled from the raw meter sum (4,122,873) to the report's 4,058,000.
      values: [302661, 196909, 116353, 192545, 145161, 364618, 573396, 606144, 590588, 499960, 275294, 194371],
    },
  },

  // Etihad Substation 1 (Rowsley Street) series intentionally removed — the
  // marker has been dropped from the map per the user's request to delete it
  // from everywhere.

  // ── Parked for the Etihad stadium-popup stage — data is ready but not yet
  //    surfaced on the map (intentionally absent from ENERGY_BY_NAME below).
  'etihad-extension': {
    consumption: { dataType: 'Modelled', values: [343470, 310116, 309376, 269530, 259603, 239672, 240865, 250447, 265755, 291947, 316981, 348238] },
  },
  'etihad-towers': {
    // Modelled GENERATION — values were originally wired as consumption but
    // the source CSV header is "Generation (kWh)" and the monthly profile is
    // a textbook UK solar yield curve (low Jan/Dec, peaks May-Jul). Annual
    // 119,890 kWh. The CSV filename still says "Consumption Actual" but its
    // contents are generation; kept the filename so downstream links don't
    // break.
    generation: { dataType: 'Modelled', values: [3621, 7048, 9731, 14229, 16528, 15347, 15014, 12919, 10672, 7440, 4300, 3041] },
  },
};

// Maps a sticker label / marker / Etihad-site name (as shown on the map) to its
// building key. Ground Mount 2B was dropped per the data review.
export const ENERGY_BY_NAME: Record<string, string> = {
  // CHP Machine 1 and 2 now have their own actual-meter series, distinct
  // from the modelled combined-machines consumption profile.
  'CHP Machine 1': 'chp-machine-1',
  'CHP Machine 2': 'chp-machine-2',
  'Commercial Building': 'commercial',
  'Commercial': 'commercial',
  'MPAN 6': 'commercial',
  'Commercial Building Solar Array': 'commercial',
  'Hotel Building': 'hotel',
  'Hotel': 'hotel',
  'MPAN 7': 'hotel',
  'Hotel Solar Array': 'hotel',
  "Women's Facility": 'mcwfc',
  'MPAN 11': 'mcwfc',
  'MCWFC Solar': 'mcwfc-solar',
  'FM Building': 'fm-building',
  'FM Building 2026': 'fm-building',
  'Facilities Management Building': 'fm-building',
  'FM Building Solar Array': 'fm-building',
  'Indoor Pitch': 'indoor-pitch',
  'Indoor Pitch Solar Array': 'indoor-pitch',
  'Joie Stadium': 'joie-stadium',
  'Joie Stadium Solar Array': 'joie-stadium',
  'Ground Mount 2A': 'ground-mount-2a',
  'Ground Mount Array': 'ground-mount-2a',
  'Ground Mount': 'ground-mount-2a',
  // The 3 wind-turbine markers are candidate locations for one 6.2 MW turbine.
  'Wind Turbine 1': 'wind-turbine-6-2mw',
  'Wind Turbine 2': 'wind-turbine-6-2mw',
  'Wind Turbine 3': 'wind-turbine-6-2mw',
  // Diesel standby generators — output treated as a consumption line item.
  'Diesel Generator 1': 'diesel-gen-1',
  'Diesel Generator 2': 'diesel-gen-2',
  'Diesel Generator 3': 'diesel-gen-3',
  'Diesel Generator 4': 'diesel-gen-4',
  'Co-op Live': 'co-op-live',
  'Co-op Live Arena': 'co-op-live',
  'Coop Live': 'co-op-live',
  'Co-op Live Solar Array': 'co-op-live',
  'MPAN 14': 'co-op-live',
  'Etihad Walkways': 'etihad-walkways',
  'Etihad Campus Walkways': 'etihad-walkways',
  'City At Home': 'city-at-home',
  'City @ Home': 'city-at-home',
  'CFA': 'cfa',
  'CFA Total': 'cfa',
  'City Football Academy': 'cfa',
  'MPAN 12': 'cfa',
  // Etihad Stadium MPAN breakdown — each marker shows its own meter's series.
  'MPAN 5': 'etihad-mpan-1',
  'MPAN 16': 'etihad-mpan-2',
  'MPAN 15': 'etihad-mpan-3',
  // Substation 1 / Etihad Substation 1 mappings removed — series gone.
  'TV Studio': 'tv-studio',
  'TV Studio Solar Array': 'tv-studio',
  // Etihad Stadium chooser sites:
  'Etihad Stadium': 'etihad-stadium',
  'North Stand': 'etihad-extension',
  'Etihad Towers': 'etihad-towers',
  // Mamma Mia! Theatre — modelled assumption-based series. Same aliases as
  // dataSourceMap.ts so sticker labels resolve regardless of spelling.
  'Mamma Mia Theatre': 'mamma-mia',
  'Mamma Mia! Theatre': 'mamma-mia',
  'Mamma Mia studio': 'mamma-mia',
  'Mama Mia Building': 'mamma-mia',
  'Mamma Mia Building': 'mamma-mia',
};

// Look up a building's energy by the sticker label / marker name on the map.
export function energyForName(name: string): BuildingEnergy | undefined {
  const key = ENERGY_BY_NAME[name];
  return key ? energyData[key] : undefined;
}
