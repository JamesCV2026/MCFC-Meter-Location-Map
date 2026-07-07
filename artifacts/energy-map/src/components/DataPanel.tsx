import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Zap, Sun, Wrench, Download } from 'lucide-react';
import { HHDataModal } from './HHDataModal';

const HEADER_BG = '#1b3a6b';       // table header / grand total
const GROUP_TOTAL_BG = '#3b5a8a';  // per-group TOTAL row
const GROUP_BG = '#dbe3ee';        // group heading row
const SECTION_BG = '#eef2f6';      // "Combined Totals" heading row
const ROW_ALT = '#f0f4f8';         // alt rows in the equipment register
const ACTUALS_BG = '#eef6f0';      // actuals subtotal row
const MODELLED_BG = '#fdf4e7';     // modelled subtotal row
const ACTUAL_COLOR = '#15803d';    // measured data
const MODELLED_COLOR = '#b45309';  // estimated data

type DataType = 'Actual' | 'Modelled';
type Group = 'etihad' | 'cfa';

interface EnergyRow {
  group: Group;
  site: string;
  dataType: DataType;
  kwh: number;
  // Path to the source spreadsheet that this row was derived from. Resolved
  // relative to the deploy root — these files live under public/data/ and
  // ship with the site. When set, a small download icon appears next to the
  // site name so viewers can grab the underlying half-hourly data.
  sourceUrl?: string;
  // When true the row is shown for comparison only and is EXCLUDED from the
  // actuals/modelled subtotals and the grand total — e.g. an alternative wind
  // turbine option, where only one machine would actually be built.
  alt?: boolean;
}

// Filenames inside public/data/ — referenced from the rows below. Defined as
// constants so a rename touches one place. We prefer the cleaner per-asset
// CSVs over the original raw .xlsx exports where both are available.
const DATA = {
  // Raw multi-sheet sources (whole-file downloads):
  etihad3Mpan: 'data/Etihad 3 MPAN Data.xlsx',
  etihadStadiumCombined: 'data/Etihad Stadium Combined HH.csv',
  coopLiveXlsx: 'data/Replace Coop Live data.xlsx',
  walkways: 'data/Etihad Walkways.xlsx',
  cityAtHome: 'data/City @ Home Data.xlsx',
  tempSubstationXlsx: 'data/Temp Substation.xlsx',
  cfaTotalXlsx: 'data/CFA Total.xlsx',
  commercialTowers: 'data/Commerical and Towers.xlsx',
  // Per-asset CSVs (preferred — one file per series):
  cfa: 'data/CFA Consumption Actual.csv',
  etihadMpan1: 'data/Etihad 1 Consumption Actual.csv',
  etihadMpan2: 'data/Etihad 2 Consumption Acutal.csv',
  etihadMpan3: 'data/Etihad 3 Consumption Acutal.csv',
  coopLive: 'data/Coop Live Arena Consumption.csv',
  tempSubstation: 'data/Temp Substation Consumption.csv',
  chpMachines: 'data/Consumption_CHP_Machines.csv',
  northStandExtension: 'data/Consumption_Etihad_North_Stand_Extension.csv',
  northStandHotel: 'data/Consumption_Etihad_North_Stand_Hotel.csv',
  northStandCommercial: 'data/Consumption_Etihad_North_Stand_Commercial.csv',
  mcwfcBuilding: 'data/Consumption_MCWFC_Building.csv',
  etihadTowers: 'data/Etihad Towers Consumption Actual.csv',
  cityAtHomeCsv: 'data/City @ Home Consumption Actual.csv',
  walkwaysCsv: 'data/Etihad Walkways Consumption Actual.csv',
  // Mamma Mia! Theatre — assumption-based HH consumption model, 2026 year.
  mammaMia: 'data/Consumption_Mamma_Mia_Theatre.csv',
  // Generation CSVs (per-asset hourly modelled or actual):
  genCoopLive: 'data/Generation_Coop_Live_Solar_Model.csv',
  genNorthStandCommercial: 'data/Generation_Etihad_North_Stand_Commercial.csv',
  genNorthStandHotel: 'data/Generation_Etihad_North_Stand_Hotel.csv',
  genFmBuilding: 'data/Generation_FM_Building.csv',
  genTvStudio: 'data/Generation_TV_Studio.csv',
  genJoieStadium: 'data/Generation_Joie_Stadium.csv',
  genPerformanceCentre: 'data/Generation_Performance_Centre.csv',
  genMcwfc: 'data/Generation_MCWFC.csv',
  genGroundMount2A: 'data/Generation_Phase2A_Ground_Mount.csv',
  genGroundMount2B: 'data/Generation_Phase2B_Ground_Mount.csv',
  // CHP Machine 1 + 2 — actual hourly meter readings, combined from two .xls exports each.
  genChpMachine1: 'data/Generation_CHP_Machine_1.csv',
  genChpMachine2: 'data/Generation_CHP_Machine_2.csv',
};

const GROUP_LABELS: Record<Group, string> = {
  etihad: 'Etihad Stadium Campus',
  cfa: 'City Football Academy (CFA)',
};

// Every kwh figure below is the literal sum of its underlying monthly series
// in src/data/energyData.ts, so the table mirrors what each marker / panel
// shows. When a series changes, update the matching row here.

export const consumptionData: EnergyRow[] = [
  // Etihad Stadium — 16 months actual (Jan 2025 – Apr 2026), MPANs 1650000243940 + 1650000425182 + 1620000879750 combined.
  // Per-meter CSV split available; the .xlsx is the original full export.
  // Etihad Stadium total = row-wise sum of MPAN 5 + 15 + 16. Pre-merged at
  // build time so the modal can render the full HH table inline; the original
  // multi-sheet .xlsx is still bundled at /data/Etihad 3 MPAN Data.xlsx.
  // Etihad Stadium — most recent 12 months (Jun 2025 to May 2026) from the
  // fresh combined HH workbook supplied 03/06/2026. The bundled CSV covers
  // 25 months but only the latest 12 are headlined here.
  { group: 'etihad', site: 'Etihad Stadium', dataType: 'Actual', kwh: 10298885, sourceUrl: DATA.etihadStadiumCombined },
  { group: 'etihad', site: 'Co-op Live Arena', dataType: 'Actual', kwh: 8116026, sourceUrl: DATA.coopLive },
  // Etihad Walkways — May to 12 Oct 2025 (Oct is a partial month); total
  // includes the Oct part-month per James, matching the marker panel.
  { group: 'etihad', site: 'Etihad Walkways', dataType: 'Actual', kwh: 11236, sourceUrl: DATA.walkwaysCsv },
  { group: 'etihad', site: 'City At Home', dataType: 'Actual', kwh: 278396, sourceUrl: DATA.cityAtHomeCsv },
  // Etihad Substation 1 (Rowsley Street) intentionally removed from the
  // bottom data panel per the user's request to drop it from everywhere.
  { group: 'etihad', site: 'Etihad North Stand Commercial', dataType: 'Modelled', kwh: 1966999, sourceUrl: DATA.northStandCommercial },
  { group: 'etihad', site: 'Etihad North Stand Extension', dataType: 'Modelled', kwh: 3446000, sourceUrl: DATA.northStandExtension },
  { group: 'etihad', site: 'Etihad North Stand Hotel', dataType: 'Modelled', kwh: 4620003, sourceUrl: DATA.northStandHotel },
  // Mamma Mia! Theatre — assumption-based HH model, 2000 m² immersive
  // dinner-theatre venue, annual ~425 MWh.
  { group: 'etihad', site: 'Mamma Mia! Theatre', dataType: 'Modelled', kwh: 424998, sourceUrl: DATA.mammaMia },
  // Etihad Towers moved to generation: see generationData below.
  // City Football Academy — MPAN 1640000249306, 12-month window (May 2025 – Apr
  // 2026) to match the MPAN 12 marker / energyData 'cfa' series and the table's
  // other 12-month annuals. (Previously a 16-month figure of 5,574,288.)
  { group: 'cfa', site: 'CFA', dataType: 'Actual', kwh: 4058000, sourceUrl: DATA.cfa },
  // CHP Machines (combined modelled) removed in favour of the per-unit actual
  // meter rows below — CHP Machine 1 and CHP Machine 2.
  { group: 'cfa', site: 'CHP Machine 1', dataType: 'Actual', kwh: 1521816, sourceUrl: DATA.genChpMachine1 },
  { group: 'cfa', site: 'CHP Machine 2', dataType: 'Actual', kwh: 475256, sourceUrl: DATA.genChpMachine2 },
  { group: 'cfa', site: 'MCWFC Building', dataType: 'Modelled', kwh: 1576902, sourceUrl: DATA.mcwfcBuilding },
  // Diesel standby generators — modelled HH run data 2025 (output treated as a
  // consumption line item, like CHP). Tiny: ~72.5 MWh total across the 4 sets.
  { group: 'cfa', site: 'Diesel Generator 1', dataType: 'Modelled', kwh: 17224 },
  { group: 'cfa', site: 'Diesel Generator 2', dataType: 'Modelled', kwh: 17380 },
  { group: 'etihad', site: 'Diesel Generator 3', dataType: 'Modelled', kwh: 108806 },
  { group: 'etihad', site: 'Diesel Generator 4', dataType: 'Modelled', kwh: 115944 },
];

export const generationData: EnergyRow[] = [
  // Co-op Live Arena — ~1.40 MWp roof array, modelled 12-month annual = 1,250,000 kWh.
  { group: 'etihad', site: 'Co-op Live Arena', dataType: 'Modelled', kwh: 1250000, sourceUrl: DATA.genCoopLive },
  { group: 'etihad', site: 'Etihad North Stand Commercial', dataType: 'Modelled', kwh: 72595, sourceUrl: DATA.genNorthStandCommercial },
  { group: 'etihad', site: 'Etihad North Stand Hotel', dataType: 'Modelled', kwh: 86331, sourceUrl: DATA.genNorthStandHotel },
  // Etihad Towers — modelled generation (was previously wired as consumption
  // by mistake; the CSV's own header column is "Generation (kWh)").
  { group: 'etihad', site: 'Etihad Towers', dataType: 'Modelled', kwh: 119890, sourceUrl: DATA.etihadTowers },
  // Phase 1 actuals — all four rows are 12-month totals (Jan to Dec 2025) to
  // sit apples-to-apples alongside the 12-month modelled generation series.
  { group: 'cfa', site: 'FM Building', dataType: 'Actual', kwh: 81000, sourceUrl: DATA.genFmBuilding },
  { group: 'cfa', site: 'TV Studio', dataType: 'Actual', kwh: 16000, sourceUrl: DATA.genTvStudio },
  { group: 'cfa', site: 'Joie Stadium', dataType: 'Actual', kwh: 804000, sourceUrl: DATA.genJoieStadium },
  { group: 'cfa', site: 'Performance Centre', dataType: 'Actual', kwh: 587000, sourceUrl: DATA.genPerformanceCentre },
  { group: 'cfa', site: 'MCWFC Building', dataType: 'Modelled', kwh: 49733, sourceUrl: DATA.genMcwfc },
  { group: 'cfa', site: 'Phase 2A Ground Mount', dataType: 'Modelled', kwh: 284628, sourceUrl: DATA.genGroundMount2A },
  // Proposed CFA wind turbine — one 6.2 MW machine (candidate locations 1-3).
  { group: 'cfa', site: 'Wind Turbine — 6.2 MW', dataType: 'Modelled', kwh: 12328307 },
  // Phase 2B Ground Mount removed from the bottom Data Panel to mirror the
  // map, which only shows the Phase 2A ground-mount marker. The 2B CSV
  // remains bundled in /data/ for completeness but is no longer surfaced
  // as a row here.
  //
  // CHP Machine 1 and CHP Machine 2 moved to consumptionData above, per the
  // user's preference for treating CHP output as a campus electricity
  // consumption line item rather than generation.
];

function fmt(n: number): string {
  return n.toLocaleString('en-GB');
}

function DataRow({ row, onOpen }: { row: EnergyRow; onOpen: (row: EnergyRow) => void }) {
  // Clicking the site name opens the HH data viewer modal (instead of a
  // direct download). The modal fetches the CSV and shows the full table
  // inline; from there the viewer offers a Download button too. Rows
  // without a source URL stay plain text.
  const siteCell = row.sourceUrl ? (
    <button
      type="button"
      onClick={() => onOpen(row)}
      title={`View full HH data: ${row.sourceUrl.split('/').pop()}`}
      className="inline-flex items-center gap-1 text-gray-700 hover:text-blue-700 hover:underline cursor-pointer text-left"
    >
      {row.site}
      <Download size={11} className="text-gray-400" />
    </button>
  ) : (
    <span className="text-gray-700">{row.site}</span>
  );
  return (
    <tr
      style={{ background: row.alt ? '#fafafa' : 'white' }}
      title={row.alt ? 'Comparison only — not included in the subtotals or grand total' : undefined}
    >
      <td className={`px-3 py-1.5${row.alt ? ' italic text-gray-400' : ''}`}>{siteCell}</td>
      <td className="px-3 py-1.5">
        <span
          className="font-bold"
          style={{ color: row.dataType === 'Actual' ? ACTUAL_COLOR : MODELLED_COLOR }}
        >
          {row.dataType}
        </span>
      </td>
      <td className="px-3 py-1.5 text-right font-mono text-gray-800 whitespace-nowrap">
        {fmt(row.kwh)}
      </td>
    </tr>
  );
}

function SubtotalRow({
  label, value, color, bg,
}: { label: string; value: number; color: string; bg: string }) {
  return (
    <tr style={{ background: bg }}>
      <td colSpan={2} className="px-3 py-1.5 font-bold whitespace-nowrap" style={{ color }}>
        {label}
      </td>
      <td
        className="px-3 py-1.5 text-right font-mono font-bold whitespace-nowrap"
        style={{ color }}
      >
        {fmt(value)} kWh
      </td>
    </tr>
  );
}

interface TableProps {
  title: string;
  colLabel: string;
  icon: React.ReactNode;
  rows: EnergyRow[];
  onOpen: (row: EnergyRow) => void;
}

function EnergyTable({ title, colLabel, icon, rows, onOpen }: TableProps) {
  const groups: Group[] = ['etihad', 'cfa'];
  const actualsTotal = rows
    .filter((r) => r.dataType === 'Actual' && !r.alt)
    .reduce((s, r) => s + r.kwh, 0);
  const modelledTotal = rows
    .filter((r) => r.dataType === 'Modelled' && !r.alt)
    .reduce((s, r) => s + r.kwh, 0);
  const grandTotal = actualsTotal + modelledTotal;

  return (
    <div className="flex-1 min-w-0 overflow-auto rounded-lg border border-gray-200 shadow-sm">
      {/* h-full makes the shorter table stretch its rows to match the taller
          one, so the two tables always end level with no gap underneath. */}
      <table className="w-full h-full text-xs border-collapse">
        <thead>
          <tr style={{ background: HEADER_BG }}>
            <th className="text-left px-3 py-2 text-white font-semibold whitespace-nowrap">
              <span className="flex items-center gap-1.5">
                {icon}
                {title}
              </span>
            </th>
            <th className="text-left px-3 py-2 text-white font-semibold whitespace-nowrap">
              Type
            </th>
            <th className="text-right px-3 py-2 text-white font-semibold whitespace-nowrap">
              {colLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const groupRows = rows.filter((r) => r.group === g);
            if (groupRows.length === 0) return null;
            const actuals = groupRows.filter((r) => r.dataType === 'Actual');
            const modelled = groupRows.filter((r) => r.dataType === 'Modelled');
            const gActuals = actuals.filter((r) => !r.alt).reduce((s, r) => s + r.kwh, 0);
            const gModelled = modelled.filter((r) => !r.alt).reduce((s, r) => s + r.kwh, 0);
            const gTotal = gActuals + gModelled;

            return (
              <Fragment key={g}>
                {/* Group heading */}
                <tr style={{ background: GROUP_BG }}>
                  <td
                    colSpan={3}
                    className="px-3 py-1.5 font-bold uppercase tracking-wide text-[11px]"
                    style={{ color: HEADER_BG }}
                  >
                    {GROUP_LABELS[g]}
                  </td>
                </tr>

                {/* Actual rows + subtotal */}
                {actuals.map((row) => (
                  <DataRow key={`${g}-${row.site}-a`} row={row} onOpen={onOpen} />
                ))}
                {actuals.length > 0 && (
                  <SubtotalRow
                    label="Actuals Subtotal"
                    value={gActuals}
                    color={ACTUAL_COLOR}
                    bg={ACTUALS_BG}
                  />
                )}

                {/* Modelled rows + subtotal */}
                {modelled.map((row) => (
                  <DataRow key={`${g}-${row.site}-m`} row={row} onOpen={onOpen} />
                ))}
                {modelled.length > 0 && (
                  <SubtotalRow
                    label="Modelled Subtotal"
                    value={gModelled}
                    color={MODELLED_COLOR}
                    bg={MODELLED_BG}
                  />
                )}

                {/* Group total */}
                <tr style={{ background: GROUP_TOTAL_BG }}>
                  <td
                    colSpan={2}
                    className="px-3 py-1.5 text-white font-bold uppercase tracking-wide text-[11px] whitespace-nowrap"
                  >
                    {GROUP_LABELS[g]} Total
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-white whitespace-nowrap">
                    {fmt(gTotal)} kWh
                  </td>
                </tr>
              </Fragment>
            );
          })}

          {/* Combined totals */}
          <tr style={{ background: SECTION_BG }}>
            <td
              colSpan={3}
              className="px-3 py-1.5 font-bold uppercase tracking-wide text-[11px]"
              style={{ color: HEADER_BG }}
            >
              Combined Totals
            </td>
          </tr>
          <SubtotalRow
            label="Total Actuals"
            value={actualsTotal}
            color={ACTUAL_COLOR}
            bg={ACTUALS_BG}
          />
          <SubtotalRow
            label="Total Modelled"
            value={modelledTotal}
            color={MODELLED_COLOR}
            bg={MODELLED_BG}
          />
          <tr style={{ background: HEADER_BG }}>
            <td colSpan={2} className="px-3 py-2 text-white font-bold text-left tracking-wide">
              Grand Total
            </td>
            <td className="px-3 py-2 text-right font-mono font-bold text-white whitespace-nowrap">
              {fmt(grandTotal)} kWh
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Infrastructure ─────────────────────────────────────────────────────────
// DRAFT content — narrative built from the stated facts (6.6 kV HV network,
// transformers, diesel sets, CHP units 310 kWe / 2,500 kWth each).
// The register holds four diesel generators (two FG Wilson at the CFA, two
// Cummins at the Etihad) read from the supplied screenshots plus the two CHP
// units; transformers / HV cabling to follow.
const equipmentRegister = [
  // CFA diesel generators — numbered 3 and 4 (the site team's preferred
  // numbering; 1 and 2 sit with another older set not surfaced on the map).
  { ref: 'Diesel Generator 3', site: 'City Football Academy', make: 'FG Wilson', engine: 'Perkins 1106C-E66TAG4', alternator: 'Leroy Somer LL5014D', rating: '200 kVA' },
  { ref: 'Diesel Generator 4', site: 'City Football Academy', make: 'FG Wilson', engine: 'Perkins 1106C-E66TAG4', alternator: 'Leroy Somer LL5014D', rating: '200 kVA' },
  // Etihad Stadium diesel generators — numbered 5 and 6.
  { ref: 'Diesel Generator 5', site: 'Etihad Stadium', make: 'Cummins', engine: '—', alternator: '—', rating: '750 kVA' },
  { ref: 'Diesel Generator 6', site: 'Etihad Stadium', make: 'Cummins', engine: 'Cummins VTA-28-GS', alternator: 'Stamford HC1534F1', rating: '706 kVA' },
  { ref: 'CHP 1', site: 'City Football Academy', make: '—', engine: '—', alternator: '—', rating: '310 kWe / 2,500 kWth' },
  { ref: 'CHP 2', site: 'City Football Academy', make: '—', engine: '—', alternator: '—', rating: '310 kWe / 2,500 kWth' },
];

// Gas metering & billing summary — supplied by James, four GAS meter accounts
// that cover the campus gas supply. These figures are the 12-month annual
// view for billing. The gas drives the CHP units (see equipment register
// above — 2 × 310 kWe / 2,500 kWth), so this is the fuel-input side of the
// CHP electricity output shown in Generation_CHP_Machine_1/2.csv.
const meteringRegister = [
  { site: 'Man City - CFA (main)',     account: '00093693', consumption: '1,816,449 kWh', annualCost: '£94,918',  rate: '5.23 p/kWh' },
  { site: 'Man City - CFA (small)',    account: '00093694', consumption: '10,412 kWh',    annualCost: '£833',     rate: '8.00 p/kWh' },
  { site: 'Man City - South of CFA',   account: '00153313', consumption: '478,286 kWh',   annualCost: '£38,982',  rate: '8.15 p/kWh' },
  { site: 'Man City - Etihad Stadium', account: '00093695', consumption: '5,318,600 kWh', annualCost: '£273,681', rate: '5.15 p/kWh' },
];
const meteringTotal = {
  site: 'Total (4 meters)', account: '', consumption: '7,623,747 kWh', annualCost: '£408,414', rate: '~5.36 p/kWh',
};

function InfrastructureSection() {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div
        className="px-3 py-2 text-white font-semibold text-xs flex items-center gap-1.5"
        style={{ background: HEADER_BG }}
      >
        <Wrench size={12} className="shrink-0" />
        Campus Infrastructure
      </div>
      <div className="bg-white p-3">
        <p className="text-xs text-gray-700 leading-relaxed">
          The campus is supplied via a <span className="font-semibold">6.6 kV high-voltage network</span>,
          stepped down through on-site transformers to serve each building. Standby generation is
          provided by diesel generating sets &mdash; <span className="font-semibold">FG Wilson</span> at the
          City Football Academy and <span className="font-semibold">Cummins</span> at the Etihad
          Stadium. Two <span className="font-semibold">CHP units</span> are
          also installed &mdash; each rated <span className="font-semibold">310 kWe / 2,500 kWth</span>, together providing
          roughly <span className="font-semibold">620 kWe electrical</span> and <span className="font-semibold">5 MW thermal</span>.
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          Draft — transformer capacity, HV cabling spec and the full equipment figures to be confirmed.
        </p>

        <table className="w-full text-xs border-collapse mt-3">
          <thead>
            <tr style={{ background: HEADER_BG }}>
              {['Ref', 'Site', 'Make', 'Engine', 'Alternator', 'Rating'].map((h) => (
                <th key={h} className="text-left px-2.5 py-1.5 text-white font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipmentRegister.map((g, i) => (
              <tr key={g.ref} style={{ background: i % 2 === 1 ? ROW_ALT : 'white' }}>
                <td className="px-2.5 py-1.5 text-gray-700 whitespace-nowrap">{g.ref}</td>
                <td className="px-2.5 py-1.5 text-gray-700">{g.site}</td>
                <td className="px-2.5 py-1.5 text-gray-700">{g.make}</td>
                <td className="px-2.5 py-1.5 text-gray-700">{g.engine}</td>
                <td className="px-2.5 py-1.5 text-gray-700">{g.alternator}</td>
                <td className="px-2.5 py-1.5 text-gray-800 font-mono whitespace-nowrap">{g.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-gray-400 mt-1.5">
          Sample equipment register — 4 diesel generators and 2 CHP units. Transformers and HV cabling to follow.
        </p>

        {/* Gas metering & billing summary — 4 GAS meter accounts. The gas
            feeds the CHP units (listed in the equipment register above), so
            this is the fuel-input view that pairs with the CHP electricity
            output series. Distinct from the electricity MPAN HH totals
            shown elsewhere on the map. */}
        <div className="mt-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-600 mb-1.5">
            Gas Metering &amp; Billing Summary
          </h4>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ background: HEADER_BG }}>
                {['Site / Meter', 'Account', 'Consumption', 'Annual cost', 'Blended rate'].map((h) => (
                  <th key={h} className="text-left px-2.5 py-1.5 text-white font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meteringRegister.map((m, i) => (
                <tr key={m.account} style={{ background: i % 2 === 1 ? ROW_ALT : 'white' }}>
                  <td className="px-2.5 py-1.5 text-gray-700 whitespace-nowrap">{m.site}</td>
                  <td className="px-2.5 py-1.5 text-gray-700 font-mono">{m.account}</td>
                  <td className="px-2.5 py-1.5 text-gray-800 font-mono whitespace-nowrap">{m.consumption}</td>
                  <td className="px-2.5 py-1.5 text-gray-800 font-mono whitespace-nowrap">{m.annualCost}</td>
                  <td className="px-2.5 py-1.5 text-gray-800 font-mono whitespace-nowrap">{m.rate}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-bold">
                <td className="px-2.5 py-1.5 text-gray-900 whitespace-nowrap">{meteringTotal.site}</td>
                <td className="px-2.5 py-1.5 text-gray-900 font-mono">{meteringTotal.account}</td>
                <td className="px-2.5 py-1.5 text-gray-900 font-mono whitespace-nowrap">{meteringTotal.consumption}</td>
                <td className="px-2.5 py-1.5 text-gray-900 font-mono whitespace-nowrap">{meteringTotal.annualCost}</td>
                <td className="px-2.5 py-1.5 text-gray-900 font-mono whitespace-nowrap">{meteringTotal.rate}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 mt-1.5">
            12-month annual gas billing view across 4 meter accounts. Gas feeds the CHP units. Account numbers are billing references, not MPRNs.
          </p>

          {/* Downloadable source spreadsheet — SystemsLink monthly gas billing
              report. The href works directly on dev / hosted builds. On the
              standalone HTML the onClick handler checks the inline attachments
              registry and serves the file via a Blob URL so file:// also works. */}
          <a
            href="data/Gas_Billing_SystemsLink_2025.xlsx"
            download="Gas_Billing_SystemsLink_2025.xlsx"
            onClick={(e) => {
              const registry = (window as unknown as { __MCFC_ATTACHMENTS__?: Record<string, string> }).__MCFC_ATTACHMENTS__;
              const key = 'data/Gas_Billing_SystemsLink_2025.xlsx';
              if (registry && registry[key]) {
                e.preventDefault();
                const dataUrl = registry[key];
                // Convert data URL to blob and trigger download.
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = 'Gas_Billing_SystemsLink_2025.xlsx';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
            title="Download the SystemsLink monthly gas billing report (xlsx)"
          >
            <Download size={12} />
            Download source spreadsheet (SystemsLink, 2025)
          </a>
        </div>
      </div>
    </div>
  );
}

interface DataPanelProps {
  open: boolean;
  onToggle: () => void;
}

export function DataPanel({ open, onToggle }: DataPanelProps) {
  // Currently-opened row drives the HH data viewer modal. Null when closed.
  const [openRow, setOpenRow] = useState<EnergyRow | null>(null);

  // Data catalogue modal — opens in an iframe overlay, so it works on
  // dev / hosted / standalone file:// identically. Source: the inline
  // catalogue HTML if present (window.__MCFC_CATALOG_HTML__, populated by
  // the standalone build) or the sibling file otherwise.
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogBlobUrl = useMemo(() => {
    if (!catalogOpen) return null;
    if (typeof window === 'undefined') return null;
    const inlined = (window as unknown as { __MCFC_CATALOG_HTML__?: string }).__MCFC_CATALOG_HTML__;
    if (inlined && inlined.length > 0) {
      const blob = new Blob([inlined], { type: 'text/html;charset=utf-8' });
      return URL.createObjectURL(blob);
    }
    // No inline catalogue — fall back to the sibling file (works on dev /
    // hosted builds where the file is reachable).
    return 'data-catalog.html';
  }, [catalogOpen]);
  useEffect(() => {
    return () => {
      // Revoke the blob URL when the modal closes / DataPanel unmounts.
      if (catalogBlobUrl && catalogBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(catalogBlobUrl);
      }
    };
  }, [catalogBlobUrl]);
  useEffect(() => {
    if (!catalogOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setCatalogOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [catalogOpen]);
  const subtitle = openRow
    ? `${openRow.group === 'etihad' ? 'Etihad Stadium Campus' : 'City Football Academy'} · ${openRow.dataType} · ${fmt(openRow.kwh)} kWh total`
    : '';
  return (
    <div className="shrink-0 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-gray-50 transition-colors group"
        aria-label={open ? 'Collapse data panel' : 'Expand data panel'}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700 tracking-wide uppercase">
            Energy Data
          </span>
          <span className="text-[10px] text-gray-400 font-normal">
            Consumption &amp; Generation summary — click any site to view its half-hourly data
          </span>
          {/* Static AI-readable catalogue — opens in an iframe modal over
              the map. Previously this was a window.open() into a new tab,
              but the Blob URL flow gets quietly blocked by modern browsers
              on file:// origins (where window.open of a blob is treated as
              a popup). The in-page modal works identically across dev,
              hosted, and standalone file:// builds. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCatalogOpen(true); }}
            className="ml-2 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
            title="Open the full data catalogue (static HTML, AI-readable)."
          >
            Open data catalogue ↗
          </button>
        </div>
        <div className="flex items-center gap-1 text-gray-400 group-hover:text-gray-600 transition-colors">
          {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </div>
      </button>

      {open && (
        <div className="px-6 pb-5 pt-1">
          <div className="flex gap-4">
            <EnergyTable
              title="Total Grid Consumption"
              colLabel="Consumption (kWh)"
              icon={<Zap size={12} className="text-yellow-300 shrink-0" />}
              rows={consumptionData}
              onOpen={setOpenRow}
            />
            <EnergyTable
              title="Total Green Generation"
              colLabel="Generation (kWh)"
              icon={<Sun size={12} className="text-green-300 shrink-0" />}
              rows={generationData}
              onOpen={setOpenRow}
            />
          </div>
          <InfrastructureSection />
        </div>
      )}

      {openRow?.sourceUrl && (
        <HHDataModal
          url={openRow.sourceUrl}
          title={openRow.site}
          subtitle={subtitle}
          onClose={() => setOpenRow(null)}
        />
      )}

      {/* Data catalogue modal — iframe overlay. Source URL is either the
          inline blob (standalone build) or the sibling file (dev/hosted). */}
      {catalogOpen && catalogBlobUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setCatalogOpen(false)}
          data-testid="data-catalog-modal"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[92vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Data Catalogue</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Every consumption + generation series the map carries, with monthly figures and source pointers. AI-readable.
                </p>
              </div>
              <button
                onClick={() => setCatalogOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close data catalogue"
                data-testid="data-catalog-close"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>
            <iframe
              src={catalogBlobUrl}
              title="Data catalogue"
              className="flex-1 w-full border-0 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
