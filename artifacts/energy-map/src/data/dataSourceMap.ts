// Single source of truth: asset display name → URL(s) of the raw HH/hourly
// CSV that backs it. Used by the bottom Data Panel, the marker side panel,
// the sticker info panel, and the build-time data-catalogue generator.
//
// All paths are relative to the deploy root so they work the same whether the
// site is served from Netlify, a local static server, or opened as a file.
//
// An asset can have one or both of:
//   - consumption: link to the consumption HH file
//   - generation:  link to the generation HH file
// Sites with only one series just set that one (or use the shorthand `url`
// for backward compat). The panel renders one button per series present.

export interface DataSourceLink {
  url: string;
  label: string;
}

export interface DataSourceEntry {
  /** Consumption HH source for this asset, if any. */
  consumption?: DataSourceLink;
  /** Generation HH source for this asset, if any. */
  generation?: DataSourceLink;
}

const sources: Record<string, DataSourceEntry> = {
  // ── Etihad campus — Actual consumption ─────────────────────────────────
  'Etihad Stadium': {
    consumption: { url: 'data/Etihad Stadium Combined HH.csv', label: 'Stadium total: MPAN 5 + 15 + 16 row-summed (HH)' },
  },
  'MPAN 5': {
    consumption: { url: 'data/Etihad 1 Consumption Actual.csv', label: 'MPAN 5 (HH)' },
  },
  'MPAN 1': {
    consumption: { url: 'data/Etihad 1 Consumption Actual.csv', label: 'MPAN 1 (HH)' },
  },
  'MPAN 2': {
    consumption: { url: 'data/Etihad 2 Consumption Acutal.csv', label: 'MPAN 2 (HH)' },
  },
  'MPAN 1650000425182': {
    consumption: { url: 'data/Etihad 1 Consumption Actual.csv', label: 'MPAN 1650000425182 (HH)' },
  },
  'MPAN 1620000879750': {
    consumption: { url: 'data/Etihad 2 Consumption Acutal.csv', label: 'MPAN 1620000879750 (HH)' },
  },
  'MPAN CFA': {
    consumption: { url: 'data/CFA Consumption Actual.csv', label: 'CFA consumption (HH)' },
  },
  'MPAN MCWFC': {
    consumption: { url: 'data/Consumption_MCWFC_Building.csv', label: 'MCWFC Building consumption (hourly modelled)' },
    generation: { url: 'data/Generation_MCWFC.csv', label: 'MCWFC solar generation (hourly modelled)' },
  },
  'MPAN Commercial Building Substation': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Commercial.csv', label: 'Commercial consumption (hourly modelled)' },
    generation: { url: 'data/Generation_Etihad_North_Stand_Commercial.csv', label: 'Commercial solar generation (hourly modelled)' },
  },
  'MPAN hotel Podium Substation': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Hotel.csv', label: 'Hotel consumption (hourly modelled)' },
    generation: { url: 'data/Generation_Etihad_North_Stand_Hotel.csv', label: 'Hotel solar generation (hourly modelled)' },
  },
  'MPAN 16': {
    consumption: { url: 'data/Etihad 2 Consumption Acutal.csv', label: 'MPAN 16 (HH)' },
  },
  'MPAN 15': {
    consumption: { url: 'data/Etihad 3 Consumption Acutal.csv', label: 'MPAN 15 (HH)' },
  },
  'Co-op Live Arena': {
    consumption: { url: 'data/Coop Live Arena Consumption.csv', label: 'Co-op Live Arena consumption (HH)' },
    generation: { url: 'data/Generation_Coop_Live_Solar_Model.csv', label: 'Co-op Live solar generation (hourly modelled, 1.40 MWp roof model)' },
  },
  'Co-op Live': {
    consumption: { url: 'data/Coop Live Arena Consumption.csv', label: 'Co-op Live Arena consumption (HH)' },
    generation: { url: 'data/Generation_Coop_Live_Solar_Model.csv', label: 'Co-op Live solar generation (hourly modelled)' },
  },
  'Co-op Live Solar Array': {
    generation: { url: 'data/Generation_Coop_Live_Solar_Model.csv', label: 'Co-op Live solar generation (hourly modelled, 1.40 MWp roof model)' },
  },
  'MPAN 14': {
    consumption: { url: 'data/Coop Live Arena Consumption.csv', label: 'Co-op Live Arena consumption (HH)' },
  },
  'Etihad Walkways': {
    consumption: { url: 'data/Etihad Walkways Consumption Actual.csv', label: 'Etihad Walkways consumption (HH)' },
  },
  'City At Home': {
    consumption: { url: 'data/City @ Home Consumption Actual.csv', label: 'City At Home consumption (HH)' },
  },
  // 'Etihad Substation 1' / 'Substation 1' data source entries removed —
  // the marker has been dropped from the map entirely.

  // ── Etihad campus — buildings with BOTH consumption + generation ─────
  'Etihad North Stand Commercial': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Commercial.csv', label: 'Commercial consumption (hourly modelled)' },
    generation: { url: 'data/Generation_Etihad_North_Stand_Commercial.csv', label: 'Commercial solar generation (hourly modelled)' },
  },
  'Commercial': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Commercial.csv', label: 'Commercial consumption (hourly modelled)' },
    generation: { url: 'data/Generation_Etihad_North_Stand_Commercial.csv', label: 'Commercial solar generation (hourly modelled)' },
  },
  'Commercial Building': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Commercial.csv', label: 'Commercial consumption (hourly modelled)' },
    generation: { url: 'data/Generation_Etihad_North_Stand_Commercial.csv', label: 'Commercial solar generation (hourly modelled)' },
  },
  'Commercial Building Solar Array': {
    generation: { url: 'data/Generation_Etihad_North_Stand_Commercial.csv', label: 'Commercial solar generation (hourly modelled)' },
  },
  'MPAN 6': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Commercial.csv', label: 'MPAN 6 → North Stand Commercial consumption (hourly modelled)' },
  },

  'Etihad North Stand Extension': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Extension.csv', label: 'North Stand Extension consumption (hourly modelled)' },
  },
  'North Stand': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Extension.csv', label: 'North Stand Extension consumption (hourly modelled)' },
  },

  'Etihad North Stand Hotel': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Hotel.csv', label: 'Hotel consumption (hourly modelled)' },
    generation: { url: 'data/Generation_Etihad_North_Stand_Hotel.csv', label: 'Hotel solar generation (hourly modelled)' },
  },
  'Hotel': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Hotel.csv', label: 'Hotel consumption (hourly modelled)' },
    generation: { url: 'data/Generation_Etihad_North_Stand_Hotel.csv', label: 'Hotel solar generation (hourly modelled)' },
  },
  'Hotel Building': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Hotel.csv', label: 'Hotel consumption (hourly modelled)' },
    generation: { url: 'data/Generation_Etihad_North_Stand_Hotel.csv', label: 'Hotel solar generation (hourly modelled)' },
  },
  'Hotel Solar Array': {
    generation: { url: 'data/Generation_Etihad_North_Stand_Hotel.csv', label: 'Hotel solar generation (hourly modelled)' },
  },
  'MPAN 7': {
    consumption: { url: 'data/Consumption_Etihad_North_Stand_Hotel.csv', label: 'MPAN 7 → North Stand Hotel consumption (hourly modelled)' },
  },

  'Etihad Towers': {
    // CSV is named "...Consumption Actual" historically, but the data inside
    // is generation (the header column literally reads "Generation (kWh)").
    // Wired as generation here so the panel shows the green button + card.
    generation: { url: 'data/Etihad Towers Consumption Actual.csv', label: 'Etihad Towers generation (HH)' },
  },

  // ── Mamma Mia! Theatre — modelled assumption-based HH consumption ──────
  // 425 MWh/yr from the immersive dinner-theatre venue at the Etihad. Multiple
  // name aliases so any sticker label resolves.
  'Mamma Mia Theatre': {
    consumption: { url: 'data/Consumption_Mamma_Mia_Theatre.csv', label: 'Mamma Mia! Theatre consumption (HH modelled, assumption-based)' },
  },
  'Mamma Mia! Theatre': {
    consumption: { url: 'data/Consumption_Mamma_Mia_Theatre.csv', label: 'Mamma Mia! Theatre consumption (HH modelled, assumption-based)' },
  },
  'Mamma Mia studio': {
    consumption: { url: 'data/Consumption_Mamma_Mia_Theatre.csv', label: 'Mamma Mia! Theatre consumption (HH modelled, assumption-based)' },
  },
  'Mama Mia Building': {
    consumption: { url: 'data/Consumption_Mamma_Mia_Theatre.csv', label: 'Mamma Mia! Theatre consumption (HH modelled, assumption-based)' },
  },
  'Mamma Mia Building': {
    consumption: { url: 'data/Consumption_Mamma_Mia_Theatre.csv', label: 'Mamma Mia! Theatre consumption (HH modelled, assumption-based)' },
  },

  // ── CFA ─────────────────────────────────────────────────────────────────
  'CFA': {
    consumption: { url: 'data/CFA Consumption Actual.csv', label: 'CFA consumption (HH)' },
  },
  'City Football Academy': {
    consumption: { url: 'data/CFA Consumption Actual.csv', label: 'CFA consumption (HH)' },
  },
  'MPAN 12': {
    consumption: { url: 'data/CFA Consumption Actual.csv', label: 'CFA consumption (HH)' },
  },

  'CHP Machines': {
    consumption: { url: 'data/Consumption_CHP_Machines.csv', label: 'CHP machines consumption (hourly modelled)' },
  },
  // CHP Machine 1 — ACTUAL hourly readings from the meter (Manchester City
  // Football Academy 1, 3002411). Two source .xls files were combined into
  // a single CSV covering 09/07/2025 → 02/06/2026. Displayed on the
  // consumption side of the panel per the user's preference for treating
  // CHP output as a campus electricity consumption line item.
  'CHP Machine 1': {
    consumption: { url: 'data/Generation_CHP_Machine_1.csv', label: 'CHP Machine 1 actual electricity (hourly meter)' },
  },
  // CHP Machine 2 — ACTUAL hourly readings from the meter (Manchester City
  // Football Academy 2, 3002412). Two source .xls files combined. The meter
  // recorded zero output Dec 2025 to Jan 2026, then had a four-month gap in
  // the export through Apr 2026; gap months are filled with 0 in the monthly
  // series so later months align correctly. Displayed on the consumption side.
  'CHP Machine 2': {
    consumption: { url: 'data/Generation_CHP_Machine_2.csv', label: 'CHP Machine 2 actual electricity (hourly meter)' },
  },

  // MCWFC has both consumption + generation
  'MCWFC Building': {
    consumption: { url: 'data/Consumption_MCWFC_Building.csv', label: 'MCWFC Building consumption (hourly modelled)' },
    generation: { url: 'data/Generation_MCWFC.csv', label: 'MCWFC solar generation (hourly modelled)' },
  },
  "Women's Facility": {
    consumption: { url: 'data/Consumption_MCWFC_Building.csv', label: 'MCWFC Building consumption (hourly modelled)' },
    generation: { url: 'data/Generation_MCWFC.csv', label: 'MCWFC solar generation (hourly modelled)' },
  },
  'MPAN 11': {
    consumption: { url: 'data/Consumption_MCWFC_Building.csv', label: 'MPAN 11 → MCWFC consumption (hourly modelled)' },
  },

  // ── CFA — Phase 1 generation-only assets ─────────────────────────────
  // All four Phase 1 sites now point at the single combined hourly workbook
  // (plant_generation_sorted_cleaned) — one file with every string/meter
  // column, Jul 2025 to Jun 2026 — rather than the old per-site CSVs.
  'FM Building': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'FM Building Solar Array': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'TV Studio': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'TV Studio Solar Array': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'Joie Stadium': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'Joie Stadium Solar Array': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'Indoor Pitch': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'Indoor Pitch Solar Array': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'Indoor Pitch (Performance Centre)': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'Performance Centre': { generation: { url: 'data/Generation_Phase1_All_Sites_HH.xlsx', label: 'Phase 1 combined generation — all sites, per string/meter (hourly)' } },
  'Ground Mount Array': { generation: { url: 'data/Generation_Phase2A_Ground_Mount.csv', label: 'Phase 2A Ground Mount generation (hourly modelled)' } },
  'Ground Mount 2A': { generation: { url: 'data/Generation_Phase2A_Ground_Mount.csv', label: 'Phase 2A Ground Mount generation (hourly modelled)' } },
  'Phase 2A Ground Mount': { generation: { url: 'data/Generation_Phase2A_Ground_Mount.csv', label: 'Phase 2A Ground Mount generation (hourly modelled)' } },
  'Phase 2B Ground Mount': { generation: { url: 'data/Generation_Phase2B_Ground_Mount.csv', label: 'Phase 2B Ground Mount generation (hourly modelled)' } },
};

export const DATA_SOURCES = sources;

/** Full entry for an asset (may have consumption, generation, or both). */
export function dataSourcesFor(name: string): DataSourceEntry | undefined {
  return sources[name];
}

/**
 * Back-compat helper that returns whichever single source we have, preferring
 * consumption when both exist. Kept so older call sites keep compiling.
 */
export function dataSourceFor(name: string): DataSourceLink | undefined {
  const entry = sources[name];
  if (!entry) return undefined;
  return entry.consumption ?? entry.generation;
}
