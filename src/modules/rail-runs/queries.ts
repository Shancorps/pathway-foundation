import "server-only"
import { aliasedTable, and, asc, count, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/modules/auth/schema"
import {
  manifests as manifestsTable,
  railManifests,
  type ManifestFieldDef,
} from "@/modules/manifests/schema"
import { posts, postAssignments } from "@/modules/org-structure/schema"
import { particles } from "@/modules/particles/schema"
import { railNodes, rails } from "@/modules/rails/schema"
import { cycles, railRuns, type Cycle } from "./schema"

/**
 * Narrowing predicate for cycle visibility under Initialize.
 *
 * A cycle is visible to `userId` iff one of:
 *  1. The run's `post_holder_assignments` has no entry for this cycle's
 *     postId (default fan-out: every current holder sees it).
 *  2. The entry matches `userId` (you're the chosen holder).
 *  3. The chosen holder is no longer a holder of the Post (graceful
 *     fallback per spec §9: re-open routing to all current holders).
 *
 * Used in tandem with the existing `postAssignments.userId = userId` filter,
 * which already guarantees the caller currently holds the Post.
 */
export function cycleVisibleToUserPredicate(userId: string) {
  return sql`(
    ${railRuns.postHolderAssignments} ->> ${cycles.postId} is null
    or ${railRuns.postHolderAssignments} ->> ${cycles.postId} = ${userId}
    or not exists (
      select 1 from ${postAssignments} pa
      where pa.post_id = ${cycles.postId}
        and pa.user_id = ${railRuns.postHolderAssignments} ->> ${cycles.postId}
    )
  )`
}

interface ListOptions {
  withDeleted?: boolean
}

export interface MyActionCycle extends Cycle {
  particleName: string
  railName: string
  railId: string
  postTitle: string
  /** Source rail_node type — drives type-specific badges on the inbox tile. */
  sourceNodeType: string
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
      outcome: cycles.outcome,
      outcomeReason: cycles.outcomeReason,
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
      sourceNodeType: railNodes.type,
    })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    .innerJoin(railNodes, eq(railNodes.id, cycles.railNodeId))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.completedAt),
        isNull(cycles.cancelledAt),
        isNull(cycles.deletedAt),
        isNull(posts.deletedAt),
        // Honor Initialize's post-holder pick: hide cycles narrowed to a
        // different user (and don't show cycles to non-holders).
        cycleVisibleToUserPredicate(userId),
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
      // Source-node info so the cycle UI knows whether this is an Approval
      // cycle (and which approval mode to render — "with_reason" requires a
      // reason on reject; default is just two buttons).
      sourceNodeType: railNodes.type,
      sourceNodeConfig: railNodes.config,
      // Per-node required manifest fields — drives the red asterisk on the
      // cycle's Manifest panel and is checked again on Mark Complete.
      sourceNodeRequiredManifestFieldSlugs: railNodes.requiredManifestFieldSlugs,
      loopBackInitiatorName: user.name,
    })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    .innerJoin(railNodes, eq(railNodes.id, cycles.railNodeId))
    // Optional join: only present when the cycle is a loop-back. Used by the UI
    // to show "Re-do requested by NAME" without a second round-trip.
    .leftJoin(user, eq(user.id, cycles.loopBackInitiatedBy))
    .where(
      and(
        eq(cycles.id, cycleId),
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.deletedAt),
        // Honor Initialize's post-holder pick: cycle is hidden from non-chosen
        // holders (unless the chosen holder no longer holds the Post — see
        // cycleVisibleToUserPredicate).
        cycleVisibleToUserPredicate(userId),
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

/**
 * Full timeline for one rail run — every cycle in position order, with
 * resolved actor names (completer + loop-back initiator) and the run's own
 * metadata. Powers the /runs/[runId] page.
 */
export interface RunTimelineCycle {
  id: string
  position: number
  title: string
  description: string | null
  postTitle: string
  idealMinutes: number | null
  issuedAt: Date
  completedAt: Date | null
  cancelledAt: Date | null
  timeSpentMinutes: number
  /** Live timer running on this cycle — needed for "in flight, X min so far". */
  timerStartedAt: Date | null
  completerName: string | null
  loopBackOfCycleId: string | null
  loopBackReason: string | null
  loopBackInitiatorName: string | null
  /** True if THIS cycle had an outstanding loop-back from it (originator side). */
  hadLoopBackFromThis: boolean
}

export interface RunTimeline {
  run: {
    id: string
    railId: string
    railName: string
    particleId: string
    particleName: string
    status: "running" | "completed" | "cancelled"
    startedAt: Date
    completedAt: Date | null
    cancelledAt: Date | null
    cancellationReason: string | null
    starterName: string | null
    finisherName: string | null
    cancellerName: string | null
  }
  cycles: RunTimelineCycle[]
  /** Total minutes across all cycles' timeSpentMinutes. */
  totalActiveMinutes: number
  /** End-to-end clock time: now (or completed/cancelled) minus startedAt. */
  totalElapsedMinutes: number
}

export async function getRunTimeline(orgId: string, runId: string): Promise<RunTimeline | null> {
  // Run + the three actor names in one go using left joins with aliasing.
  const userStarter = aliasedTable(user, "user_starter")
  const userFinisher = aliasedTable(user, "user_finisher")
  const userCanceller = aliasedTable(user, "user_canceller")
  const [runRow] = await db
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
      cancellationReason: railRuns.cancellationReason,
      starterName: userStarter.name,
      finisherName: userFinisher.name,
      cancellerName: userCanceller.name,
    })
    .from(railRuns)
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    .leftJoin(userStarter, eq(userStarter.id, railRuns.startedBy))
    .leftJoin(userFinisher, eq(userFinisher.id, railRuns.completedBy))
    .leftJoin(userCanceller, eq(userCanceller.id, railRuns.cancelledBy))
    .where(
      and(eq(railRuns.id, runId), eq(railRuns.organizationId, orgId), isNull(railRuns.deletedAt)),
    )
    .limit(1)
  if (!runRow) return null

  const userCompleter = aliasedTable(user, "user_completer")
  const userInitiator = aliasedTable(user, "user_initiator")
  const cycleRows = await db
    .select({
      id: cycles.id,
      position: cycles.position,
      title: cycles.title,
      description: cycles.description,
      postTitle: posts.title,
      idealMinutes: cycles.idealMinutes,
      issuedAt: cycles.issuedAt,
      completedAt: cycles.completedAt,
      cancelledAt: cycles.cancelledAt,
      timeSpentMinutes: cycles.timeSpentMinutes,
      timerStartedAt: cycles.timerStartedAt,
      completerName: userCompleter.name,
      loopBackOfCycleId: cycles.loopBackOfCycleId,
      loopBackReason: cycles.loopBackReason,
      loopBackInitiatorName: userInitiator.name,
      loopBackInitiatedFromCycleId: cycles.loopBackInitiatedFromCycleId,
    })
    .from(cycles)
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .leftJoin(userCompleter, eq(userCompleter.id, cycles.completedBy))
    .leftJoin(userInitiator, eq(userInitiator.id, cycles.loopBackInitiatedBy))
    .where(
      and(eq(cycles.organizationId, orgId), eq(cycles.railRunId, runId), isNull(cycles.deletedAt)),
    )
    .orderBy(asc(cycles.position), asc(cycles.issuedAt))

  // Mark cycles that had a loop-back originated FROM them (originator side).
  // A cycle X had a loop-back from it when some other cycle has
  // loopBackInitiatedFromCycleId = X.id.
  const initiatedFrom = new Set<string>()
  for (const c of cycleRows) {
    if (c.loopBackInitiatedFromCycleId) initiatedFrom.add(c.loopBackInitiatedFromCycleId)
  }

  const timelineCycles: RunTimelineCycle[] = cycleRows.map((c) => ({
    id: c.id,
    position: c.position,
    title: c.title,
    description: c.description,
    postTitle: c.postTitle,
    idealMinutes: c.idealMinutes,
    issuedAt: c.issuedAt,
    completedAt: c.completedAt,
    cancelledAt: c.cancelledAt,
    timeSpentMinutes: c.timeSpentMinutes,
    timerStartedAt: c.timerStartedAt,
    completerName: c.completerName,
    loopBackOfCycleId: c.loopBackOfCycleId,
    loopBackReason: c.loopBackReason,
    loopBackInitiatorName: c.loopBackInitiatorName,
    hadLoopBackFromThis: initiatedFrom.has(c.id),
  }))

  const totalActiveMinutes = timelineCycles.reduce((acc, c) => acc + c.timeSpentMinutes, 0)
  const endStamp = runRow.completedAt ?? runRow.cancelledAt ?? new Date()
  const totalElapsedMinutes = Math.max(
    0,
    Math.round((endStamp.getTime() - runRow.startedAt.getTime()) / 60000),
  )

  return {
    run: {
      id: runRow.id,
      railId: runRow.railId,
      railName: runRow.railName,
      particleId: runRow.particleId,
      particleName: runRow.particleName,
      status: runRow.status,
      startedAt: runRow.startedAt,
      completedAt: runRow.completedAt,
      cancelledAt: runRow.cancelledAt,
      cancellationReason: runRow.cancellationReason,
      starterName: runRow.starterName,
      finisherName: runRow.finisherName,
      cancellerName: runRow.cancellerName,
    },
    cycles: timelineCycles,
    totalActiveMinutes,
    totalElapsedMinutes,
  }
}

/** Count of open (not completed, not cancelled) cycles in the user's inbox. */
export async function countMyActionCycles(orgId: string, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count(cycles.id) })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.completedAt),
        isNull(cycles.cancelledAt),
        isNull(cycles.deletedAt),
        isNull(posts.deletedAt),
        // Same Initialize-narrowing as the inbox list query.
        cycleVisibleToUserPredicate(userId),
      ),
    )
  return row?.count ?? 0
}

/**
 * Pre-flight for the Start Rail UI. Inspects the rail for an Initialize node
 * and, if present, returns the requirements the operator must fulfill before
 * the rail can start: the required manifest fields (resolved to their
 * definitions for rendering) plus every multi-holder Post referenced by the
 * rail (so the operator picks which single holder gets each cycle).
 *
 * Returns `{ requiresInitialize: false }` for rails without Initialize, for
 * rails that don't exist, or for rails belonging to a different org — the
 * caller can't distinguish missing-vs-foreign rails from this result, which is
 * deliberate (don't leak existence across orgs).
 */
export type PrepareStartRailResult =
  | { requiresInitialize: false }
  | {
      requiresInitialize: true
      requirements: {
        manifestFields: {
          manifestId: string
          manifestName: string
          field: ManifestFieldDef
        }[]
        multiHolderPosts: {
          postId: string
          postTitle: string
          holders: { userId: string; userName: string }[]
        }[]
      }
    }

export async function prepareStartRail(
  orgId: string,
  railId: string,
  _particleId: string,
): Promise<PrepareStartRailResult> {
  // Confirm the rail belongs to this org. Cross-org / missing → treat as
  // "no Initialize" so we don't leak existence.
  const [rail] = await db
    .select({ id: rails.id })
    .from(rails)
    .where(and(eq(rails.id, railId), eq(rails.organizationId, orgId), isNull(rails.deletedAt)))
    .limit(1)
  if (!rail) return { requiresInitialize: false }

  const nodes = await db
    .select()
    .from(railNodes)
    .where(and(eq(railNodes.railId, railId), isNull(railNodes.deletedAt)))
    .orderBy(asc(railNodes.position))

  const initializeNode = nodes.find((n) => n.type === "initialize")
  if (!initializeNode) return { requiresInitialize: false }

  // Resolve required manifest fields. Stale refs (manifest no longer attached
  // to the rail, or field removed from the manifest) are silently skipped —
  // same semantics as per-cycle required-field gating.
  const requiredRefs =
    initializeNode.config.kind === "initialize"
      ? initializeNode.config.requiredManifestFieldSlugs
      : []
  const manifestFields: {
    manifestId: string
    manifestName: string
    field: ManifestFieldDef
  }[] = []
  if (requiredRefs.length > 0) {
    const attached = await db
      .select({
        manifestId: railManifests.manifestId,
        manifestName: manifestsTable.name,
        fields: manifestsTable.fields,
      })
      .from(railManifests)
      .innerJoin(manifestsTable, eq(manifestsTable.id, railManifests.manifestId))
      .where(and(eq(railManifests.railId, railId), isNull(manifestsTable.deletedAt)))
    const byId = new Map(attached.map((a) => [a.manifestId, a]))
    for (const ref of requiredRefs) {
      const m = byId.get(ref.manifestId)
      if (!m) continue
      const field = m.fields.find((f) => f.key === ref.fieldSlug)
      if (!field) continue
      manifestFields.push({ manifestId: m.manifestId, manifestName: m.manifestName, field })
    }
  }

  // Distinct Post ids referenced by any node on the rail. Skip nodes without
  // a postId (trigger, end, sub_flow, initialize).
  const postIds = Array.from(
    new Set(nodes.map((n) => n.postId).filter((id): id is string => Boolean(id))),
  )
  const multiHolderPosts: {
    postId: string
    postTitle: string
    holders: { userId: string; userName: string }[]
  }[] = []
  if (postIds.length > 0) {
    const rows = await db
      .select({
        postId: posts.id,
        postTitle: posts.title,
        userId: user.id,
        userName: user.name,
      })
      .from(posts)
      .innerJoin(postAssignments, eq(postAssignments.postId, posts.id))
      .innerJoin(user, eq(user.id, postAssignments.userId))
      .where(
        and(inArray(posts.id, postIds), eq(posts.organizationId, orgId), isNull(posts.deletedAt)),
      )
    const byPost = new Map<
      string,
      { postId: string; postTitle: string; holders: { userId: string; userName: string }[] }
    >()
    for (const r of rows) {
      const existing = byPost.get(r.postId)
      if (existing) {
        existing.holders.push({ userId: r.userId, userName: r.userName })
      } else {
        byPost.set(r.postId, {
          postId: r.postId,
          postTitle: r.postTitle,
          holders: [{ userId: r.userId, userName: r.userName }],
        })
      }
    }
    for (const entry of byPost.values()) {
      if (entry.holders.length > 1) multiHolderPosts.push(entry)
    }
  }

  return {
    requiresInitialize: true,
    requirements: { manifestFields, multiHolderPosts },
  }
}
