// Plain-English definitions for each infrastructure type, shown in the
// Legend panel (the "Legend" button beside the Infrastructure Index title).
//
// EDIT THE TEXT BELOW to refine each definition — one entry per type. The
// panel renders whatever is written here, in this order.

import type { AssetType } from './assets';

export interface InfraDefinition {
  type: AssetType;
  // Optional display-name override; defaults to the type's index label.
  name?: string;
  definition: string;
}

export const INFRA_DEFINITIONS: InfraDefinition[] = [
  {
    type: 'meter-behind',
    definition: 'A private meter on the campus side of the grid connection. It records electricity used or generated behind the main supply point, so this energy is not billed through the grid supplier.',
  },
  {
    type: 'mpan',
    definition: 'A Meter Point Administration Number: the unique reference for a registered electricity supply point. Each MPAN marker is a billed grid connection with its own meter and supply agreement.',
  },
  {
    type: 'meter-front',
    definition: 'A meter on the grid side of the connection, recording electricity flowing between the campus and the distribution network. These readings drive grid billing.',
  },
  {
    type: 'inverter',
    definition: 'Converts the DC electricity produced by solar panels into AC electricity the buildings and grid can use. Each marker shows where an inverter (or bank of inverters) is installed.',
  },
  {
    type: 'solar-panel',
    definition: 'A rooftop or ground-mounted solar array. Its panel shows the metered or modelled generation for that array and the savings it delivers.',
  },
  {
    type: 'substation',
    definition: 'Transforms electricity between voltage levels and distributes it around the campus. Substations are the hubs the site supplies flow through.',
  },
  {
    type: 'idno',
    definition: 'Infrastructure owned and operated by an Independent Distribution Network Operator rather than the regional grid company. Shown in pink to distinguish ownership.',
  },
];
