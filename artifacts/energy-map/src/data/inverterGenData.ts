// AUTO-GENERATED from plant_generation_sorted_cleaned.xlsx (raw hourly ->
// monthly per column/inverter). Window Jul 2025 -> Jun 2026 (startIndex 6).
export interface InverterColumn { name: string; roof?: string; values: number[]; startIndex: number; }
export const inverterColumns: Record<string, InverterColumn> = {
  'tv-studio': { name: 'TV Studio', startIndex: 6, values: [2480, 2201, 1507, 668, 370, 208, 173, 419, 1199, 2314, 2422, 2047] },
  'fm-building': { name: 'FM Building', startIndex: 6, values: [13604, 11819, 8094, 3621, 2047, 1263, 1490, 2274, 5239, 8404, 11336, 11786] },
  'joie-stadium-1-roof-east': { name: 'Joie Stadium 1 (Roof East)', roof: 'East', startIndex: 6, values: [12296, 10675, 7132, 3197, 1512, 846, 1148, 1991, 4838, 7808, 10311, 10389] },
  'joie-stadium-2-roof-west': { name: 'Joie Stadium 2 (Roof West)', roof: 'West', startIndex: 6, values: [12706, 11001, 7335, 3339, 1754, 914, 1210, 2030, 4688, 7260, 9179, 9286] },
  'joie-stadium-3-roof-east': { name: 'Joie Stadium 3 (Roof East)', roof: 'East', startIndex: 6, values: [12689, 11067, 7412, 3320, 1583, 883, 1200, 2068, 4975, 7925, 10564, 10659] },
  'joie-stadium-4-roof-north': { name: 'Joie Stadium 4 (Roof North)', roof: 'North', startIndex: 6, values: [5168, 4510, 3066, 1389, 728, 419, 520, 805, 1973, 3024, 4167, 4270] },
  'joie-stadium-5-roof-south': { name: 'Joie Stadium 5 (Roof South)', roof: 'South', startIndex: 6, values: [4992, 4433, 3050, 1374, 810, 85, 22, 0, 0, 0, 0, 0] },
  'joie-stadium-6-roof-west': { name: 'Joie Stadium 6 (Roof West)', roof: 'West', startIndex: 6, values: [12649, 11024, 7363, 3351, 1764, 979, 1213, 2085, 4834, 7749, 10329, 10575] },
  'joie-stadium-7-roof-north': { name: 'Joie Stadium 7 (Roof North)', roof: 'North', startIndex: 6, values: [5091, 4421, 3003, 1368, 741, 422, 524, 787, 1933, 2981, 4085, 4181] },
  'joie-stadium-8-roof-north': { name: 'Joie Stadium 8 (Roof North)', roof: 'North', startIndex: 6, values: [5067, 4396, 2960, 1350, 721, 414, 512, 771, 1911, 2987, 4084, 4176] },
  'joie-stadium-9-roof-west': { name: 'Joie Stadium 9 (Roof West)', roof: 'West', startIndex: 6, values: [12804, 11217, 7553, 3371, 1793, 996, 1224, 2136, 5019, 8013, 10596, 10801] },
  'joie-stadium-10-roof-east': { name: 'Joie Stadium 10 (Roof East)', roof: 'East', startIndex: 6, values: [12614, 10991, 7396, 3348, 1616, 892, 1220, 2055, 4922, 7885, 10497, 10632] },
  'joie-stadium-11-roof-south': { name: 'Joie Stadium 11 (Roof South)', roof: 'South', startIndex: 6, values: [4735, 4272, 2958, 1374, 798, 79, 20, 0, 0, 0, 0, 0] },
  'joie-stadium-12-roof-east': { name: 'Joie Stadium 12 (Roof East)', roof: 'East', startIndex: 6, values: [16609, 14749, 10034, 4566, 2269, 1252, 1704, 2802, 6417, 9754, 13508, 13780] },
  'joie-stadium-13-roof-south': { name: 'Joie Stadium 13 (Roof South)', roof: 'South', startIndex: 6, values: [5020, 4532, 3145, 1453, 857, 84, 20, 0, 0, 0, 0, 0] },
  'joie-stadium-14-roof-west': { name: 'Joie Stadium 14 (Roof West)', roof: 'West', startIndex: 6, values: [16779, 14817, 10016, 4514, 2423, 1357, 1671, 2849, 6412, 9843, 13560, 13901] },
  'meter-22571483': { name: 'Meter 22571483', startIndex: 6, values: [15994, 14122, 9572, 4521, 2470, 1481, 1747, 2852, 6299, 9441, 10441, 12759] },
  'meter-22571532': { name: 'Meter 22571532', startIndex: 6, values: [16441, 14595, 9932, 4653, 2567, 1540, 1808, 2887, 6476, 9688, 10258, 13359] },
  'meter-22571671': { name: 'Meter 22571671', startIndex: 6, values: [14535, 12774, 8581, 4041, 2096, 1267, 1503, 2546, 5755, 8908, 9343, 11986] },
  'meter-22571782': { name: 'Meter 22571782', startIndex: 6, values: [16476, 14563, 9830, 4614, 2460, 1472, 1744, 2914, 6419, 9665, 10065, 13432] },
  'meter-22571957': { name: 'Meter 22571957', startIndex: 6, values: [15157, 13319, 8966, 4202, 2201, 1316, 1562, 2618, 5946, 9202, 10625, 12102] },
  'meter-22571976': { name: 'Meter 22571976', startIndex: 6, values: [16400, 14357, 9639, 4515, 2339, 1407, 1677, 2812, 6367, 9682, 9621, 13502] },
  // Phase 2A Ground Mount (modelled, 284,628 kWh/yr, Jan-Dec 2025) split evenly
  // across its two inverters — each column is half the monthly generation.
  // The two columns sum back to the full ground-mount total (142,312 + 142,316).
  'ground-mount-inv-1': { name: 'Ground Mount Inverter 1', startIndex: 0, values: [4183, 8224, 11266, 16657, 19695, 18140, 18134, 15487, 12709, 8955, 5184, 3678] },
  'ground-mount-inv-2': { name: 'Ground Mount Inverter 2', startIndex: 0, values: [4184, 8224, 11267, 16657, 19695, 18141, 18134, 15487, 12710, 8955, 5184, 3678] },
};

// PLACEHOLDER column -> inverter mapping. East -> Inverter 8 is confirmed; the
// rest are grouped by roof orientation as a first pass. Edit these arrays to
// reassign columns to inverters (keyed by the inverter marker's display name).
// Keyed by the inverter marker's letter name (Inverters 2..10 renamed A..I).
export const inverterMapping: Record<string, string[]> = {
  'Inverter G': ['joie-stadium-1-roof-east', 'joie-stadium-3-roof-east', 'joie-stadium-10-roof-east', 'joie-stadium-12-roof-east'], // was Inverters 8 (East)
  'Inverter A': ['joie-stadium-4-roof-north', 'joie-stadium-7-roof-north', 'joie-stadium-8-roof-north'],                            // was Inverters 2 (now North — by elimination)
  'Inverter B': ['joie-stadium-5-roof-south', 'joie-stadium-11-roof-south', 'joie-stadium-13-roof-south'],                          // was Inverters 3 (now South) [user]
  'Inverter C': ['joie-stadium-2-roof-west', 'joie-stadium-6-roof-west', 'joie-stadium-9-roof-west', 'joie-stadium-14-roof-west'], // was Inverters 4 (now West) [user]
  'Inverter D': ['meter-22571483', 'meter-22571532', 'meter-22571671', 'meter-22571782', 'meter-22571957', 'meter-22571976'],      // was Inverters 5 (Indoor Pitch, 6 meters)
  'Inverter E': ['tv-studio'],   // was Inverters 6
  'Inverter F': ['fm-building'], // was Inverters 7
  'Inverter H': ['ground-mount-inv-1', 'ground-mount-inv-2'], // Phase 2A Ground Mount split across its 2 inverters (each ≈ half of 284,628)
};

export function inverterColumnsFor(name: string): InverterColumn[] {
  return (inverterMapping[name] || []).map((id) => inverterColumns[id]).filter(Boolean);
}

export function invColMonthlyTotal(c: InverterColumn): number {
  return c.values.reduce((a, b) => a + (b || 0), 0);
}
