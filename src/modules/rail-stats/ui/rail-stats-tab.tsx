import Link from "next/link"
import { CornerUpLeft, ExternalLink } from "lucide-react"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import {
  getLoopBackLog,
  getOverdueCycles,
  getRailBreakdown,
  getRailStatsKpis,
  type StatsWindow,
} from "../queries"
import { LoopBackDetailPanel } from "./loop-back-detail-panel"

/**
 * Rail Stats — the operational health of rails as a whole. Composes:
 *   - 4 KPI tiles
 *   - Rail Breakdown table
 *   - Overdue Cycles panel
 *   - Loop Back Log (with optional detail-panel side rail)
 *
 * Server component. Reads org-scoped stats from src/modules/rail-stats/queries.
 */
export async function RailStatsTab({
  orgId,
  window,
  loopBackDetailId,
  buildLoopBackHref,
}: {
  orgId: string
  window: StatsWindow
  loopBackDetailId: string | null
  buildLoopBackHref: (id: string | null) => string
}) {
  const [kpis, breakdown, overdue, loopBacks] = await Promise.all([
    getRailStatsKpis(orgId, window),
    getRailBreakdown(orgId, window),
    getOverdueCycles(orgId, window),
    getLoopBackLog(orgId, window),
  ])

  const detail = loopBackDetailId
    ? (loopBacks.find((r) => r.id === loopBackDetailId) ?? null)
    : null

  return (
    <div className="space-y-12">
      {/* KPI tiles */}
      <section className="space-y-4">
        <SectionDivider label="Fig · 01 / Operational health" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label="Active Rails"
            value={String(kpis.activeRails)}
            sub={`${String(kpis.totalStartedInWindow)} started in window`}
          />
          <KpiTile
            label="Completed"
            value={String(kpis.completedInWindow)}
            sub={
              kpis.completionRate != null
                ? `${(kpis.completionRate * 100).toFixed(0)}% completion rate`
                : "no closures yet"
            }
          />
          <KpiTile
            label="Loop Backs"
            value={String(kpis.loopBacksInWindow)}
            sub="re-do events fired"
            accent={kpis.loopBacksInWindow > 0 ? "warning" : "muted"}
          />
          <KpiTile
            label="Avg Completion"
            value={
              kpis.avgCompletionMinutes != null ? formatMinutes(kpis.avgCompletionMinutes) : "—"
            }
            sub="across completed rails"
          />
        </div>
      </section>

      {/* Rail Breakdown */}
      <section className="space-y-4">
        <SectionDivider label="Fig · 02 / Rail breakdown" count={breakdown.length} />
        {breakdown.length === 0 ? (
          <RegCard state="new" className="px-12 py-10 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "var(--bp-text-muted)",
                textTransform: "uppercase",
              }}
            >
              No rails yet · Build one in Rail Management
            </p>
          </RegCard>
        ) : (
          <RegCard state="queued" className="!p-0">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    color: "var(--bp-text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  <Th align="left">Rail</Th>
                  <Th>Started</Th>
                  <Th>Active</Th>
                  <Th>Completed</Th>
                  <Th>Cancelled</Th>
                  <Th>Loop Backs</Th>
                  <Th>Avg Time</Th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((r) => {
                  const lbHot =
                    r.startedInWindow > 0 && r.loopBacksInWindow / r.startedInWindow >= 0.25
                  return (
                    <tr
                      key={r.railId}
                      style={{ borderTop: "1px solid #E4E4E4" }}
                      className="hover:bg-[var(--bp-surface-card-active)]/60"
                    >
                      <Td align="left">
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            fontWeight: 500,
                            color: "var(--bp-text-primary)",
                          }}
                        >
                          {r.railName}
                        </span>
                      </Td>
                      <Td>{r.startedInWindow}</Td>
                      <Td accent={r.active > 0 ? "primary" : "muted"}>{r.active}</Td>
                      <Td>{r.completedInWindow}</Td>
                      <Td accent={r.cancelledInWindow > 0 ? "muted" : "muted"}>
                        {r.cancelledInWindow}
                      </Td>
                      <Td accent={lbHot ? "warning" : "muted"}>{r.loopBacksInWindow}</Td>
                      <Td>
                        {r.avgCompletionMinutes != null
                          ? formatMinutes(r.avgCompletionMinutes)
                          : "—"}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </RegCard>
        )}
      </section>

      {/* Overdue Cycles */}
      <section className="space-y-4">
        <SectionDivider
          label="Fig · 03 / Overdue cycles"
          count={overdue.length}
          variant={overdue.length > 0 ? "accent" : "default"}
        />
        {overdue.length === 0 ? (
          <RegCard state="new" className="px-12 py-10 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "var(--bp-text-muted)",
                textTransform: "uppercase",
              }}
            >
              No overdue cycles · Conveyor running on time
            </p>
          </RegCard>
        ) : (
          <ul className="space-y-2">
            {overdue.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/my-actions/${c.id}`}
                  className="block transition-colors hover:bg-[var(--bp-surface-card-active)]"
                >
                  <RegCard state="active" className="!px-4 !py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate"
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--bp-text-primary)",
                          }}
                        >
                          {c.particleName} — {c.cycleTitle}
                        </p>
                        <p
                          className="mt-1 truncate"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.12em",
                            color: "var(--bp-accent-steel-soft)",
                            textTransform: "uppercase",
                          }}
                        >
                          {c.railName} · Step {c.position} · {c.postTitle}
                        </p>
                      </div>
                      <div className="shrink-0 text-right whitespace-nowrap">
                        <p
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.16em",
                            color: "var(--bp-accent-orange)",
                            textTransform: "uppercase",
                          }}
                        >
                          {formatMinutes(c.overdueMinutes)} over
                        </p>
                        <p
                          className="mt-0.5"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            letterSpacing: "0.14em",
                            color: "var(--bp-text-muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          ideal {formatMinutes(c.idealMinutes)} · open{" "}
                          {formatMinutes(c.totalInboxMinutes)}
                        </p>
                      </div>
                    </div>
                  </RegCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Loop Back Log */}
      <section className="space-y-4">
        <SectionDivider
          label="Fig · 04 / Loop Back Log"
          count={loopBacks.length}
          variant={loopBacks.length > 0 ? "accent" : "default"}
        />
        {loopBacks.length === 0 ? (
          <RegCard state="new" className="px-12 py-10 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "var(--bp-text-muted)",
                textTransform: "uppercase",
              }}
            >
              No loop-backs in window
            </p>
          </RegCard>
        ) : (
          <RegCard state="queued" className="!p-0">
            <ul>
              {loopBacks.map((r) => {
                const active = r.id === loopBackDetailId
                return (
                  <li key={r.id} style={{ borderBottom: "1px solid #E4E4E4" }}>
                    <Link
                      href={buildLoopBackHref(active ? null : r.id)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--bp-surface-card-active)]"
                      style={
                        active ? { backgroundColor: "var(--bp-surface-card-active)" } : undefined
                      }
                    >
                      <CornerUpLeft
                        className="mt-0.5 size-4 shrink-0"
                        style={{ color: "var(--bp-accent-orange)" }}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate"
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            fontWeight: 500,
                            color: "var(--bp-text-primary)",
                          }}
                        >
                          {r.railName} — {r.particleName}
                        </p>
                        <p
                          className="mt-0.5 truncate"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.12em",
                            color: "var(--bp-text-muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          {r.initiatorPostTitle ?? "—"} → {r.destinationPostTitle} ·{" "}
                          {formatTimestamp(r.initiatedAt)}
                        </p>
                      </div>
                      <ResolutionPill resolution={r.resolution} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </RegCard>
        )}
        {detail && <LoopBackDetailPanel row={detail} closeHref={buildLoopBackHref(null)} />}
      </section>
    </div>
  )
}

function KpiTile({
  label,
  value,
  sub,
  accent = "muted",
}: {
  label: string
  value: string
  sub: string
  accent?: "muted" | "warning"
}) {
  const valueColor = accent === "warning" ? "var(--bp-accent-orange)" : "var(--bp-text-primary)"
  return (
    <RegCard state="queued" className="!px-5 !py-5">
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "var(--bp-text-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p
        className="mt-2.5"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 32,
          fontWeight: 600,
          color: valueColor,
          letterSpacing: "-0.015em",
          lineHeight: 1.05,
        }}
      >
        {value}
      </p>
      <p
        className="mt-1.5"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--bp-text-muted)",
        }}
      >
        {sub}
      </p>
    </RegCard>
  )
}

function Th({
  children,
  align = "right",
}: {
  children: React.ReactNode
  align?: "left" | "right"
}) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "10px 16px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = "right",
  accent = "muted",
}: {
  children: React.ReactNode
  align?: "left" | "right"
  accent?: "muted" | "warning" | "primary"
}) {
  const color =
    accent === "warning"
      ? "var(--bp-accent-orange)"
      : accent === "primary"
        ? "var(--bp-text-primary)"
        : "var(--bp-text-secondary)"
  return (
    <td
      style={{
        textAlign: align,
        padding: "12px 16px",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: accent === "warning" || accent === "primary" ? 600 : 400,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  )
}

function ResolutionPill({ resolution }: { resolution: "open" | "completed" | "cancelled" }) {
  const color =
    resolution === "open"
      ? "var(--bp-accent-orange)"
      : resolution === "completed"
        ? "var(--bp-accent-steel)"
        : "var(--bp-text-muted)"
  const label = resolution === "open" ? "Open" : resolution === "completed" ? "Resolved" : "Cancel"
  const filled = resolution === "open"
  return (
    <span
      className="shrink-0"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        padding: "3px 8px",
        color: filled ? "var(--bp-surface-card)" : color,
        backgroundColor: filled ? color : "transparent",
        border: `1px solid ${color}`,
      }}
    >
      {label}
    </span>
  )
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0m"
  if (minutes < 60) return `${String(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) {
    return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`
  }
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours === 0 ? `${String(days)}d` : `${String(days)}d ${String(restHours)}h`
}

function formatTimestamp(d: Date): string {
  const date = new Date(d)
  // "07 May 14:32" — engineering-log style
  const day = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return `${day} ${time}`
}

// Re-export so the cycle-detail link icon is reachable from this file's surface.
export { ExternalLink }
