// Savings methodology copy, rendered with each pricing formula in its own
// boxed callout so the calculation stands out from the surrounding prose.
// Used by the Savings modal, the marker side panel, and the solar panel body.

function Formula({ title, note }: { title: string; note?: string }) {
  return (
    <div className="rounded-lg border-2 border-gray-900 bg-gray-50 px-3.5 py-2.5">
      <p className="text-[13px] font-semibold text-gray-900 leading-snug">{title}</p>
      {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
    </div>
  );
}

export function SavingsMethodologyBody() {
  return (
    <div className="text-sm text-gray-600 leading-relaxed space-y-3">
      <p>
        Generation data varies by phase: Phase 1 (Joie Stadium, Indoor Pitch, TV Studio, FM Building) uses
        actual metered generation data, while Phases 2 (Ground Mount, Womens) and 3 (Hotel, Commercial, Towers)
        use modelled generation profiles. For each site, generation is split between on-site consumption
        (90% for Phases 1 and 2, 100% for Phase 3) and any exported surplus.
      </p>
      <p>
        Savings are calculated on a year-by-year basis over the full 25-year PPA term. In each year, the cost of
        solar electricity under the PPA is compared against the cost of purchasing the same electricity from the grid:
      </p>
      <div className="space-y-2">
        <Formula title="Annual PPA cost = On-site generation consumed × PPA rate" note="starting at 15.5p/kWh, escalating at 3% per year" />
        <Formula title="Annual avoided grid cost = On-site generation consumed × grid rate" note="starting at 21.8p/kWh, escalating at 8% per year" />
        <Formula title="Annual saving = Avoided grid cost + Export income − PPA cost" />
      </div>
      <p>
        Because the grid rate is assumed to escalate faster than the PPA rate (8% vs 3% per year), the gap between
        the two widens each year, meaning annual savings grow over the life of the agreement. Summing each year's
        saving gives the cumulative 25-year savings position for each site and for the portfolio as a whole.
      </p>
    </div>
  );
}
