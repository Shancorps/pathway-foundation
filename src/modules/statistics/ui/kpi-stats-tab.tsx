import { SectionDivider } from "@/components/ui/section-divider"
import { getStatisticDetail, listStatisticsForOrg } from "../queries"
import { AddTilePlaceholder, StatTile } from "./stat-tile"
import { StatDetailPanel } from "./stat-detail-panel"

export async function KpiStatsTab({
  orgId,
  selectedStatId,
  buildStatHref,
}: {
  orgId: string
  selectedStatId: string | null
  buildStatHref: (id: string | null) => string
}) {
  const tiles = await listStatisticsForOrg(orgId)
  const detail = selectedStatId ? await getStatisticDetail(orgId, selectedStatId) : null

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <SectionDivider label="Fig · 01 / KPI Statistics" count={tiles.length} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <StatTile key={t.stat.id} data={t} href={buildStatHref(t.stat.id)} />
          ))}
          <AddTilePlaceholder href="#new-graph" />
        </div>
      </section>

      {detail && (
        <section className="space-y-4">
          <SectionDivider label="Fig · 02 / Stat detail" variant="accent" />
          <StatDetailPanel
            stat={detail.stat}
            points={detail.points}
            closeHref={buildStatHref(null)}
          />
        </section>
      )}
    </div>
  )
}
