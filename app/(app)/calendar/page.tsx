import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { listCalendarEvents, resolveMonthWindow } from "@/modules/calendar/queries"
import { MonthGrid } from "@/modules/calendar/ui/month-grid"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const sp = await searchParams
  const window = resolveMonthWindow(readSingle(sp.y), readSingle(sp.m))
  const events = await listCalendarEvents(orgId, session.user.id, window.gridStart, window.gridEnd)

  // Open & overdue tallies for the title meta panel.
  const overdueCount = events.filter((e) => e.isOverdue).length
  const openCount = events.filter((e) => e.isOpen).length

  // Prev / next / today URLs.
  const prev = stepMonth(window.year, window.month, -1)
  const next = stepMonth(window.year, window.month, 1)
  const todayHref = "/calendar"
  const prevHref = `/calendar?y=${String(prev.year)}&m=${String(prev.month)}`
  const nextHref = `/calendar?y=${String(next.year)}&m=${String(next.month)}`

  const monthLabel = `${MONTHS[window.month - 1] ?? ""} ${String(window.year)}`

  return (
    <PageShell>
      <TitleBlock
        coordinate="01 / Workspace · Calendar"
        title={monthLabel}
        subtitle="Time-axis view of your inbox. Open cycles plot on their deadline (issued + ideal time); completed cycles plot on the day they closed. Cancelled cycles drop off."
        meta={
          <div
            className="space-y-1 text-right"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: "#666",
              textTransform: "uppercase",
            }}
          >
            <div>
              <span style={{ color: "#AAA" }}>Open</span>{" "}
              <span style={{ color: "#0F0F0F" }}>·</span>{" "}
              <span style={{ color: "#0F0F0F", fontWeight: 600 }}>{String(openCount)}</span>
            </div>
            <div>
              <span style={{ color: "#AAA" }}>Overdue</span>{" "}
              <span style={{ color: overdueCount > 0 ? "#B83229" : "#0F0F0F" }}>·</span>{" "}
              <span
                style={{
                  color: overdueCount > 0 ? "#B83229" : "#0F0F0F",
                  fontWeight: 600,
                }}
              >
                {String(overdueCount)}
              </span>
            </div>
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <Link
              href={prevHref}
              aria-label="Previous month"
              className="inline-flex items-center justify-center border border-[#0F0F0F] bg-white p-2 transition-colors hover:bg-[#FAFAFA]"
            >
              <ChevronLeft className="size-3.5" strokeWidth={2} />
            </Link>
            <Link
              href={todayHref}
              className="inline-flex items-center justify-center border border-[#0F0F0F] bg-white px-4 py-2 transition-colors hover:bg-[#FAFAFA]"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "#0F0F0F",
                textTransform: "uppercase",
              }}
            >
              Today
            </Link>
            <Link
              href={nextHref}
              aria-label="Next month"
              className="inline-flex items-center justify-center border border-[#0F0F0F] bg-white p-2 transition-colors hover:bg-[#FAFAFA]"
            >
              <ChevronRight className="size-3.5" strokeWidth={2} />
            </Link>
          </div>
        }
      />

      <div className="mt-10">
        <MonthGrid window={window} events={events} />
      </div>

      <div className="mt-6">
        <Legend />
      </div>
    </PageShell>
  )
}

function Legend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-2"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.18em",
        color: "#888",
        textTransform: "uppercase",
      }}
    >
      <LegendItem color="#E8711A" label="Open cycle" />
      <LegendItem color="#B83229" label="Overdue" />
      <LegendItem color="#2A3D52" label="Completed" />
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block"
        style={{ width: 10, height: 10, backgroundColor: color }}
      />
      <span>{label}</span>
    </span>
  )
}

function stepMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month - 1 + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() + 1 }
}

function readSingle(v: string | string[] | undefined): string | null {
  if (typeof v === "string" && v.length > 0) return v
  if (Array.isArray(v) && v[0]) return v[0]
  return null
}
