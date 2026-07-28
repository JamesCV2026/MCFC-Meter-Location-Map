// AUTO-GENERATED from "Generation savings.xlsx" (25-year annual savings, GBP).
// Edit METHODOLOGY below for the narrative shown above each savings table.

export interface AssetSavings {
  unit?: string;        // default GBP symbol
  years: number[];      // annual savings, year 1..25
}

export const SAVINGS_METHODOLOGY = `We take the amount of solar electricity the site will generate each year, work out how much of that is used on site and how much is exported, and then compare the cost of buying that electricity under the PPA against what the same electricity would cost from the grid. The difference is the saving. We run that comparison year by year across the full 25-year term, allowing for the PPA price rising 3% a year while grid prices rise 8% a year. The figures below show the result for each site and for the portfolio as a whole.`;

export const SAVINGS_METHODOLOGY_FULL = `This analysis was produced using Clearvolt's in-house solar PPA financial modelling tool, built in Python specifically for long-term solar savings projections. Generation data varies by phase: Phase 1 (Joie Stadium, Indoor Pitch, TV Studio, FM Building) uses actual metered generation data, while Phase 2 (Ground Mount, Womens) and Phase 3 (Hotel, Commercial, Towers) use modelled generation profiles. For each site, generation is split between on-site consumption (90% for Phase 1/2, 100% for Phase 3) and any exported surplus, then projected over the full 25-year PPA term with the PPA rate (15.5p/kWh) escalating 3% annually against a grid rate (21.8p/kWh) escalating 8% annually. Annual savings reflect the value of grid electricity avoided plus export income, less the PPA cost, giving a year-by-year and cumulative savings position for each site and the portfolio.`;

const SAVINGS: Record<string, number[]> = {
  'joie-stadium': [40518, 48735, 57729, 67112, 77405, 89129, 101912, 115542, 130408, 146608, 164364, 183673, 204657, 227446, 252184, 279022, 308126, 339671, 373849, 410864, 451107, 494643, 541730, 592642, 647675],
  'indoor-pitch': [28568, 34362, 40704, 47319, 54576, 62843, 71856, 81466, 91947, 103369, 115889, 129503, 144298, 160367, 177809, 196732, 217252, 239494, 263592, 289690, 318064, 348761, 381960, 417857, 456660],
  'tv-studio': [843, 1014, 1201, 1396, 1611, 1855, 2121, 2404, 2714, 3051, 3420, 3822, 4259, 4733, 5248, 5806, 6412, 7068, 7779, 8549, 9387, 10293, 11272, 12332, 13477],
  'fm-building': [4265, 5130, 6076, 7064, 8147, 9382, 10727, 12162, 13726, 15432, 17301, 19333, 21542, 23941, 26544, 29369, 32433, 35753, 39351, 43247, 47483, 52065, 57022, 62380, 68173],
  'ground-mount': [14991, 18031, 21358, 24830, 28638, 32976, 37705, 42748, 48248, 54241, 60811, 67955, 75718, 84150, 93302, 103232, 113999, 125670, 138315, 152010, 166899, 183006, 200427, 219263, 239624],
  'womens': [2619, 3151, 3732, 4338, 5004, 5762, 6588, 7469, 8430, 9478, 10625, 11874, 13230, 14703, 16303, 18038, 19919, 21958, 24168, 26561, 29162, 31977, 35021, 38312, 41870],
  'hotel': [5384, 6452, 7617, 8887, 10272, 11780, 13422, 15206, 17146, 19253, 21540, 24022, 26714, 29632, 32795, 36220, 39929, 43944, 48288, 52987, 58069, 63564, 69502, 75920, 82853],
  'commercial': [4528, 5425, 6405, 7474, 8638, 9906, 11286, 12787, 14418, 16190, 18113, 20201, 22464, 24918, 27577, 30458, 33576, 36952, 40606, 44557, 48831, 53451, 58445, 63841, 69671],
  'towers': [7478, 8960, 10578, 12342, 14266, 16360, 18639, 21118, 23811, 26737, 29914, 33361, 37099, 41152, 45543, 50300, 55451, 61026, 67059, 73585, 80643, 88273, 96520, 105432, 115060],
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
