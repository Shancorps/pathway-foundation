import "server-only"
import { and, asc, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/modules/auth/schema"
import { posts } from "@/modules/org-structure/schema"
import { particles } from "@/modules/particles/schema"
import { rails } from "@/modules/rails/schema"
import { cycles, railRuns } from "@/modules/rail-runs/schema"

/**
 * Rail Stats — aggregations over the rail-runs domain that power the /stats
 * Rail Stats tab. Read-only; no schema of its own. The two write-side rules
 * to remember:
 *   - "Active" always means "currently running right now," irrespective of
 *     the time window — Active Rails is a snapshot count.
 *   - "in window" metrics are scoped to the row's `*_at` timestamp falling
 *     inside the picker window. Completion is filtered by `completedAt`,
 *     loop-backs by `cycles.createdAt`, etc.
 */

export type StatsRange = "7d" | "30d" | "90d" | "all"

export interface StatsWindow {
  range: StatsRange
  /** Lower bound (inclusive). Null when range = "all". */
  startsAt: Date | null
  /** Upper bound (now). Always defined so callers can use `lte(t.col, endsAt)`. */
  endsAt: Date
}

export function resolveStatsWindow(range: StatsRange): StatsWindow {
  const endsAt = new Date()
  if (range === "all") return { range, startsAt: null, endsAt }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const startsAt = new Date(endsAt.getTime() - days * 24 * 60 * 60 * 1000)
  return { range, startsAt, endsAt }
}

export interface RailStatsKpis {
  activeRails: number
  /** Total rail runs started inside the window (subtitle context for activeRails). */
  totalStartedInWindow: number
  completedInWindow: number
  cancelledInWindow: number
  /** Completion rate over (completed + cancelled) in the window. Null when no closures. */
  completionRate: number | null
  loopBacksInWindow: number
  /** Average minutes from rail_runs.startedAt to rail_runs.completedAt, scoped to the window. */
  avgCompletionMinutes: number | null
}

export async function getRailStatsKpis(orgId: string, w: StatsWindow): Promise<RailStatsKpis> {
  const lo = w.startsAt
  // Active = currently running, not soft-deleted. Snapshot, not windowed.
  const [activeRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(railRuns)
    .where(
      and(
        eq(railRuns.organizationId, orgId),
        eq(railRuns.status, "running"),
        isNull(railRuns.deletedAt),
      ),
    )

  // Started in window — uses startedAt.
  const [startedRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(railRuns)
    .where(
      and(
        eq(railRuns.organizationId, orgId),
        isNull(railRuns.deletedAt),
        ...(lo !== null ? [gte(railRuns.startedAt, lo)] : []),
        lte(railRuns.startedAt, w.endsAt),
      ),
    )

  // Completed in window — uses completedAt. avg returned as float (Postgres
  // would otherwise cast numeric → string).
  const [completedRow] = await db
    .select({
      n: sql<number>`count(*)::int`,
      avgMin: sql<
        number | null
      >`(avg(extract(epoch from (${railRuns.completedAt} - ${railRuns.startedAt})) / 60.0))::float`,
    })
    .from(railRuns)
    .where(
      and(
        eq(railRuns.organizationId, orgId),
        eq(railRuns.status, "completed"),
        isNull(railRuns.deletedAt),
        isNotNull(railRuns.completedAt),
        ...(lo !== null ? [gte(railRuns.completedAt, lo)] : []),
        lte(railRuns.completedAt, w.endsAt),
      ),
    )

  const [cancelledRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(railRuns)
    .where(
      and(
        eq(railRuns.organizationId, orgId),
        eq(railRuns.status, "cancelled"),
        isNull(railRuns.deletedAt),
        isNotNull(railRuns.cancelledAt),
        ...(lo !== null ? [gte(railRuns.cancelledAt, lo)] : []),
        lte(railRuns.cancelledAt, w.endsAt),
      ),
    )

  // Loop-backs in window — every cycle with loopBackOfCycleId != null is a
  // loop-back event. Scope by cycles.createdAt (when the re-do was issued).
  const [loopBackRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cycles)
    .where(
      and(
        eq(cycles.organizationId, orgId),
        isNotNull(cycles.loopBackOfCycleId),
        isNull(cycles.deletedAt),
        ...(lo !== null ? [gte(cycles.createdAt, lo)] : []),
        lte(cycles.createdAt, w.endsAt),
      ),
    )

  const completed = completedRow?.n ?? 0
  const cancelled = cancelledRow?.n ?? 0
  const totalClosed = completed + cancelled
  const completionRate = totalClosed > 0 ? completed / totalClosed : null
  const avg = completedRow?.avgMin != null ? Math.round(completedRow.avgMin) : null

  return {
    activeRails: activeRow?.n ?? 0,
    totalStartedInWindow: startedRow?.n ?? 0,
    completedInWindow: completed,
    cancelledInWindow: cancelled,
    completionRate,
    loopBacksInWindow: loopBackRow?.n ?? 0,
    avgCompletionMinutes: avg,
  }
}

export interface RailBreakdownRow {
  railId: string
  railName: string
  startedInWindow: number
  active: number
  completedInWindow: number
  cancelledInWindow: number
  loopBacksInWindow: number
  avgCompletionMinutes: number | null
}

export async function getRailBreakdown(orgId: string, w: StatsWindow): Promise<RailBreakdownRow[]> {
  const lo = w.startsAt
  // Per-rail aggregation. Single query with conditional sums per status,
  // joined to a loop-back count subquery.
  const startedFilter = lo !== null ? sql`${railRuns.startedAt} >= ${lo}` : sql`true`
  const completedFilter = lo !== null ? sql`${railRuns.completedAt} >= ${lo}` : sql`true`
  const cancelledFilter = lo !== null ? sql`${railRuns.cancelledAt} >= ${lo}` : sql`true`

  const rows = await db
    .select({
      railId: rails.id,
      railName: rails.name,
      startedInWindow: sql<number>`count(*) filter (where ${startedFilter} and ${railRuns.startedAt} <= ${w.endsAt})::int`,
      active: sql<number>`count(*) filter (where ${railRuns.status} = 'running')::int`,
      completedInWindow: sql<number>`count(*) filter (where ${railRuns.status} = 'completed' and ${railRuns.completedAt} is not null and ${completedFilter} and ${railRuns.completedAt} <= ${w.endsAt})::int`,
      cancelledInWindow: sql<number>`count(*) filter (where ${railRuns.status} = 'cancelled' and ${railRuns.cancelledAt} is not null and ${cancelledFilter} and ${railRuns.cancelledAt} <= ${w.endsAt})::int`,
      avgCompletionMinutes: sql<
        number | null
      >`(avg(extract(epoch from (${railRuns.completedAt} - ${railRuns.startedAt})) / 60.0) filter (where ${railRuns.status} = 'completed' and ${railRuns.completedAt} is not null and ${completedFilter} and ${railRuns.completedAt} <= ${w.endsAt}))::float`,
    })
    .from(rails)
    .leftJoin(railRuns, and(eq(railRuns.railId, rails.id), isNull(railRuns.deletedAt)))
    .where(and(eq(rails.organizationId, orgId), isNull(rails.deletedAt)))
    .groupBy(rails.id, rails.name)

  // Loop-backs are on cycles (not rail_runs) — fetch per-rail counts separately.
  const loopBackRows = await db
    .select({
      railId: railRuns.railId,
      n: sql<number>`count(*)::int`,
    })
    .from(cycles)
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        isNotNull(cycles.loopBackOfCycleId),
        isNull(cycles.deletedAt),
        ...(lo !== null ? [gte(cycles.createdAt, lo)] : []),
        lte(cycles.createdAt, w.endsAt),
      ),
    )
    .groupBy(railRuns.railId)
  const loopBackByRail = new Map(loopBackRows.map((r) => [r.railId, r.n]))

  return rows
    .map((r) => ({
      railId: r.railId,
      railName: r.railName,
      startedInWindow: r.startedInWindow,
      active: r.active,
      completedInWindow: r.completedInWindow,
      cancelledInWindow: r.cancelledInWindow,
      loopBacksInWindow: loopBackByRail.get(r.railId) ?? 0,
      avgCompletionMinutes:
        r.avgCompletionMinutes != null ? Math.round(r.avgCompletionMinutes) : null,
    }))
    .sort((a, b) => b.startedInWindow - a.startedInWindow || a.railName.localeCompare(b.railName))
}

export interface OverdueCycle {
  id: string
  particleName: string
  railName: string
  cycleTitle: string
  postTitle: string
  position: number
  idealMinutes: number
  /** Total minutes the cycle has been in someone's inbox (now - issuedAt). */
  totalInboxMinutes: number
  /** Minutes over the ideal threshold. */
  overdueMinutes: number
}

/**
 * Open cycles where (now - issuedAt) > idealMinutes. Spec §5.4: the primary
 * "where is the bottleneck" signal without a heatmap.
 */
export async function getOverdueCycles(orgId: string, _w: StatsWindow): Promise<OverdueCycle[]> {
  // The window picker doesn't really fit overdue (overdue is "right now" by
  // definition) — we keep the param for shape consistency and ignore it.
  void _w
  const now = new Date()
  const rows = await db
    .select({
      id: cycles.id,
      title: cycles.title,
      idealMinutes: cycles.idealMinutes,
      issuedAt: cycles.issuedAt,
      position: cycles.position,
      particleName: particles.name,
      railName: rails.name,
      postTitle: posts.title,
    })
    .from(cycles)
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        isNull(cycles.completedAt),
        isNull(cycles.cancelledAt),
        isNull(cycles.deletedAt),
        isNotNull(cycles.idealMinutes),
        // (now - issuedAt) > idealMinutes — i.e. the elapsed time exceeds ideal.
        sql`extract(epoch from (now() - ${cycles.issuedAt})) / 60.0 > ${cycles.idealMinutes}`,
      ),
    )
    .orderBy(asc(cycles.issuedAt))

  return rows.map((r) => {
    const totalInboxMinutes = Math.max(
      0,
      Math.round((now.getTime() - new Date(r.issuedAt).getTime()) / 60000),
    )
    const ideal = r.idealMinutes ?? 0
    return {
      id: r.id,
      particleName: r.particleName,
      railName: r.railName,
      cycleTitle: r.title,
      postTitle: r.postTitle,
      position: r.position,
      idealMinutes: ideal,
      totalInboxMinutes,
      overdueMinutes: totalInboxMinutes - ideal,
    }
  })
}

export interface LoopBackLogRow {
  id: string
  railId: string
  railName: string
  particleName: string
  cycleTitle: string
  reason: string | null
  initiatedAt: Date
  initiatorName: string | null
  initiatorPostTitle: string | null
  destinationPostTitle: string
  resolution: "open" | "completed" | "cancelled"
  resolvedAt: Date | null
}

/**
 * Chronological log of loop-back events in the window. Spec §5.5.
 * Each row is one re-do cycle (i.e., a cycle whose loop_back_of_cycle_id is
 * non-null), with provenance joined in for the detail view.
 */
export async function getLoopBackLog(orgId: string, w: StatsWindow): Promise<LoopBackLogRow[]> {
  const lo = w.startsAt
  const rows = await db
    .select({
      id: cycles.id,
      railId: railRuns.railId,
      railName: rails.name,
      particleName: particles.name,
      cycleTitle: cycles.title,
      reason: cycles.loopBackReason,
      initiatedAt: cycles.createdAt,
      initiatorName: user.name,
      destinationPostTitle: posts.title,
      resolvedCompletedAt: cycles.completedAt,
      resolvedCancelledAt: cycles.cancelledAt,
      initiatorFromCycleId: cycles.loopBackInitiatedFromCycleId,
    })
    .from(cycles)
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .leftJoin(user, eq(user.id, cycles.loopBackInitiatedBy))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        isNotNull(cycles.loopBackOfCycleId),
        isNull(cycles.deletedAt),
        ...(lo !== null ? [gte(cycles.createdAt, lo)] : []),
        lte(cycles.createdAt, w.endsAt),
      ),
    )
    .orderBy(desc(cycles.createdAt))

  // Second pass: resolve initiator post titles via the originator cycle. Cheap
  // even at scale — the loop-back log is bounded by the time window.
  const initiatorCycleIds = rows
    .map((r) => r.initiatorFromCycleId)
    .filter((id): id is string => id !== null)
  const initiatorPostByCycle = new Map<string, string>()
  if (initiatorCycleIds.length > 0) {
    const initiators = await db
      .select({ cycleId: cycles.id, postTitle: posts.title })
      .from(cycles)
      .innerJoin(posts, eq(posts.id, cycles.postId))
      .where(
        and(
          eq(cycles.organizationId, orgId),
          // Drizzle-friendly IN — use sql for a reasonable upper bound.
          sql`${cycles.id} = ANY(${initiatorCycleIds})`,
        ),
      )
    for (const i of initiators) initiatorPostByCycle.set(i.cycleId, i.postTitle)
  }

  return rows.map((r): LoopBackLogRow => {
    const resolution: LoopBackLogRow["resolution"] = r.resolvedCompletedAt
      ? "completed"
      : r.resolvedCancelledAt
        ? "cancelled"
        : "open"
    const resolvedAt = r.resolvedCompletedAt ?? r.resolvedCancelledAt ?? null
    return {
      id: r.id,
      railId: r.railId,
      railName: r.railName,
      particleName: r.particleName,
      cycleTitle: r.cycleTitle,
      reason: r.reason,
      initiatedAt: r.initiatedAt,
      initiatorName: r.initiatorName,
      initiatorPostTitle: r.initiatorFromCycleId
        ? (initiatorPostByCycle.get(r.initiatorFromCycleId) ?? null)
        : null,
      destinationPostTitle: r.destinationPostTitle,
      resolution,
      resolvedAt,
    }
  })
}
