import "server-only"
import { and, asc, count, desc, eq, inArray, isNull, lt } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/modules/auth/schema"
import { posts, postAssignments } from "@/modules/org-structure/schema"
import { particles } from "@/modules/particles/schema"
import { rails } from "@/modules/rails/schema"
import { cycles, railRuns, type Cycle } from "./schema"

interface ListOptions {
  withDeleted?: boolean
}

export interface MyActionCycle extends Cycle {
  particleName: string
  railName: string
  railId: string
  postTitle: string
  /**
   * True when this cycle has an outstanding loop-back the user initiated —
   * the originator is blocked from completing until that re-do closes.
   */
  hasActiveLoopBack: boolean
}

/**
 * THE routing primitive. Returns every open Cycle currently in the user's
 * inbox — i.e. cycles assigned to a Post the user holds. Multi-holder Posts:
 * a cycle assigned to a Post with three holders shows up in all three of
 * their inboxes; whoever completes it removes it from everyone's view.
 */
export async function listMyActionCycles(orgId: string, userId: string): Promise<MyActionCycle[]> {
  const rows = await db
    .select({
      id: cycles.id,
      organizationId: cycles.organizationId,
      railRunId: cycles.railRunId,
      railNodeId: cycles.railNodeId,
      postId: cycles.postId,
      title: cycles.title,
      description: cycles.description,
      checklistItems: cycles.checklistItems,
      toolsLinks: cycles.toolsLinks,
      idealMinutes: cycles.idealMinutes,
      position: cycles.position,
      issuedAt: cycles.issuedAt,
      timerStartedAt: cycles.timerStartedAt,
      timerStartedBy: cycles.timerStartedBy,
      timeSpentMinutes: cycles.timeSpentMinutes,
      completedAt: cycles.completedAt,
      completedBy: cycles.completedBy,
      cancelledAt: cycles.cancelledAt,
      cancelledBy: cycles.cancelledBy,
      loopBackOfCycleId: cycles.loopBackOfCycleId,
      loopBackReason: cycles.loopBackReason,
      loopBackInitiatedBy: cycles.loopBackInitiatedBy,
      loopBackInitiatedFromCycleId: cycles.loopBackInitiatedFromCycleId,
      createdAt: cycles.createdAt,
      updatedAt: cycles.updatedAt,
      deletedAt: cycles.deletedAt,
      deletedBy: cycles.deletedBy,
      particleName: particles.name,
      railName: rails.name,
      railId: rails.id,
      postTitle: posts.title,
    })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.completedAt),
        isNull(cycles.cancelledAt),
        isNull(cycles.deletedAt),
        isNull(posts.deletedAt),
      ),
    )
    .orderBy(asc(cycles.issuedAt))

  // Second pass: for each non-loop-back cycle in the inbox, check whether
  // there's an open cycle in the system whose initiating cycle is this one.
  // If yes, the user is blocked waiting on that re-do. Cheap to do as a
  // single IN (...) query on the inbox cycle ids.
  const candidateIds = rows.filter((r) => !r.loopBackOfCycleId).map((r) => r.id)
  const activeOriginatorIds = new Set<string>()
  if (candidateIds.length > 0) {
    const open = await db
      .select({ from: cycles.loopBackInitiatedFromCycleId })
      .from(cycles)
      .where(
        and(
          eq(cycles.organizationId, orgId),
          inArray(cycles.loopBackInitiatedFromCycleId, candidateIds),
          isNull(cycles.completedAt),
          isNull(cycles.cancelledAt),
          isNull(cycles.deletedAt),
        ),
      )
    for (const row of open) {
      if (row.from) activeOriginatorIds.add(row.from)
    }
  }

  return rows.map((r) => ({ ...r, hasActiveLoopBack: activeOriginatorIds.has(r.id) }))
}

export async function getCycleForUser(orgId: string, userId: string, cycleId: string) {
  const rows = await db
    .select({
      cycle: cycles,
      particleName: particles.name,
      particleId: particles.id,
      railName: rails.name,
      railId: rails.id,
      postTitle: posts.title,
      loopBackInitiatorName: user.name,
    })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    // Optional join: only present when the cycle is a loop-back. Used by the UI
    // to show "Re-do requested by NAME" without a second round-trip.
    .leftJoin(user, eq(user.id, cycles.loopBackInitiatedBy))
    .where(
      and(
        eq(cycles.id, cycleId),
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.deletedAt),
      ),
    )
    .limit(1)
  const row = rows[0]
  if (!row) return null

  // If this cycle has an outstanding loop-back the holder initiated, surface
  // its current state so the UI can render the "Active Loop Back" tag with
  // target step name + reason.
  const [activeLoopBack] = await db
    .select({
      id: cycles.id,
      targetTitle: cycles.title,
      targetPosition: cycles.position,
      reason: cycles.loopBackReason,
    })
    .from(cycles)
    .where(
      and(
        eq(cycles.organizationId, orgId),
        eq(cycles.loopBackInitiatedFromCycleId, row.cycle.id),
        isNull(cycles.completedAt),
        isNull(cycles.cancelledAt),
        isNull(cycles.deletedAt),
      ),
    )
    .limit(1)

  return { ...row, activeLoopBack: activeLoopBack ?? null }
}

/**
 * Loop-back target picker: lists prior cycles in the same run that are valid
 * snapshot sources. Excludes other loop-backs (so chains route to the original
 * step) and cycles whose Post has been retired.
 */
export async function listLoopBackTargetsForCycle(orgId: string, userId: string, cycleId: string) {
  // Confirm the user holds the cycle's Post first — otherwise they shouldn't
  // see prior steps.
  const [holding] = await db
    .select({ position: cycles.position, railRunId: cycles.railRunId })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .where(
      and(
        eq(cycles.id, cycleId),
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.deletedAt),
      ),
    )
    .limit(1)
  if (!holding) return []

  return db
    .select({
      id: cycles.id,
      title: cycles.title,
      position: cycles.position,
      postTitle: posts.title,
      completedAt: cycles.completedAt,
    })
    .from(cycles)
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        eq(cycles.railRunId, holding.railRunId),
        lt(cycles.position, holding.position),
        isNull(cycles.loopBackOfCycleId),
        isNull(cycles.deletedAt),
        isNull(posts.deletedAt),
      ),
    )
    .orderBy(asc(cycles.position))
}

export async function getRailRun(orgId: string, runId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? and(eq(railRuns.organizationId, orgId), eq(railRuns.id, runId))
    : and(eq(railRuns.organizationId, orgId), eq(railRuns.id, runId), isNull(railRuns.deletedAt))
  const [row] = await db.select().from(railRuns).where(where).limit(1)
  return row ?? null
}

export async function listCyclesForRun(orgId: string, runId: string) {
  return db
    .select()
    .from(cycles)
    .where(
      and(eq(cycles.organizationId, orgId), eq(cycles.railRunId, runId), isNull(cycles.deletedAt)),
    )
    .orderBy(asc(cycles.position))
}

export async function listRunsForOrg(orgId: string) {
  return db
    .select({
      id: railRuns.id,
      railId: railRuns.railId,
      railName: rails.name,
      particleId: railRuns.particleId,
      particleName: particles.name,
      status: railRuns.status,
      startedAt: railRuns.startedAt,
      completedAt: railRuns.completedAt,
      cancelledAt: railRuns.cancelledAt,
    })
    .from(railRuns)
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    .where(and(eq(railRuns.organizationId, orgId), isNull(railRuns.deletedAt)))
    .orderBy(desc(railRuns.startedAt))
}

/** Count of open (not completed, not cancelled) cycles in the user's inbox. */
export async function countMyActionCycles(orgId: string, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count(cycles.id) })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.completedAt),
        isNull(cycles.cancelledAt),
        isNull(cycles.deletedAt),
        isNull(posts.deletedAt),
      ),
    )
  return row?.count ?? 0
}
