import Link from "next/link"
import { redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { RegCard } from "@/components/ui/reg-card"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { resolveStatsWindow, type StatsRange } from "@/modules/rail-stats/queries"
import { RangePicker } from "@/modules/rail-stats/ui/range-picker"
import { RailStatsTab } from "@/modules/rail-stats/ui/rail-stats-tab"

type Tab = "kpi" | "rail"

const VALID_TABS = new Set<Tab>(["kpi", "rail"])
const VALID_RANGES = new Set<StatsRange>(["7d", "30d", "90d", "all"])

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const sp = await searchParams
  const tab = readTab(sp.tab) ?? "kpi"
  const range = readRange(sp.range) ?? "30d"
  const lb = readSingle(sp.lb)
  const window = resolveStatsWindow(range)

  function buildHref(next: { tab?: Tab; range?: StatsRange; lb?: string | null }): string {
    const t = next.tab ?? tab
    const r = next.range ?? range
    const l = next.lb === undefined ? lb : next.lb
    const params = new URLSearchParams()
    params.set("tab", t)
    if (t === "rail") {
      params.set("range", r)
      if (l) params.set("lb", l)
    }
    return `/stats?${params.toString()}`
  }

  return (
    <PageShell>
      <TitleBlock
        coordinate="01 / Workspace · Statistics"
        title="Statistics"
        subtitle="Operational reality, in numbers. KPI signals you maintain by hand and rail-flow signals derived from the conveyor belt."
        meta={
          tab === "rail" ? (
            <RangePicker
              range={range}
              buildHref={(r) => buildHref({ tab: "rail", range: r, lb: null })}
            />
          ) : null
        }
      />

      <TabStrip currentTab={tab} buildHref={buildHref} />

      <div className="mt-10">
        {tab === "rail" ? (
          <RailStatsTab
            orgId={orgId}
            window={window}
            loopBackDetailId={lb}
            buildLoopBackHref={(id) => buildHref({ tab: "rail", lb: id })}
          />
        ) : (
          <KpiStatsPlaceholder buildRailHref={() => buildHref({ tab: "rail", lb: null })} />
        )}
      </div>
    </PageShell>
  )
}

function TabStrip({
  currentTab,
  buildHref,
}: {
  currentTab: Tab
  buildHref: (next: { tab?: Tab; range?: StatsRange; lb?: string | null }) => string
}) {
  const tabs: { value: Tab; label: string }[] = [
    { value: "kpi", label: "KPI Stats" },
    { value: "rail", label: "Rail Stats" },
  ]
  return (
    <div className="mt-6 flex items-center gap-2 border-b border-[#E4E4E4]">
      {tabs.map((t) => {
        const active = t.value === currentTab
        return (
          <Link
            key={t.value}
            href={buildHref({ tab: t.value, lb: null })}
            className="relative -mb-px px-4 py-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: active ? "#0F0F0F" : "#888",
              textTransform: "uppercase",
              borderBottom: active ? "2px solid #E8711A" : "2px solid transparent",
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}

function KpiStatsPlaceholder({ buildRailHref }: { buildRailHref: () => string }) {
  return (
    <RegCard state="new" className="px-12 py-16 text-center">
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        KPI Stats · In design
      </p>
      <p
        className="mx-auto mt-3 max-w-[48ch]"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "#444",
          lineHeight: 1.55,
        }}
      >
        Hand-maintained KPI graphs (Gross Sales, Inspections Passed, Leads Captured&hellip;) ship in
        the next phase. Until then, the operational signals derived from the conveyor belt are live
        on the Rail Stats tab.
      </p>
      <Link
        href={buildRailHref()}
        className="mt-7 inline-flex items-center gap-2 border border-[#0F0F0F] bg-white px-5 py-2.5 transition-colors hover:bg-[#FAFAFA]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "#0F0F0F",
          textTransform: "uppercase",
        }}
      >
        Open Rail Stats →
      </Link>
    </RegCard>
  )
}

function readTab(v: string | string[] | undefined): Tab | null {
  const s = readSingle(v)
  return s !== null && VALID_TABS.has(s as Tab) ? (s as Tab) : null
}

function readRange(v: string | string[] | undefined): StatsRange | null {
  const s = readSingle(v)
  return s !== null && VALID_RANGES.has(s as StatsRange) ? (s as StatsRange) : null
}

function readSingle(v: string | string[] | undefined): string | null {
  if (typeof v === "string" && v.length > 0) return v
  if (Array.isArray(v) && v[0]) return v[0]
  return null
}
