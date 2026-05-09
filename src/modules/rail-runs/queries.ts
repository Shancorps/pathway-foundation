import "server-only"
import { and, asc, count, desc, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
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
}

/**
 * THE routing primitive. Returns every open Cycle currently in the user's
 * inbox — i.e. cycles assigned to a Post the user holds. Multi-holder Posts:
 * a cycle assigned to a Post with three holders shows up in all three of
 * their inboxes; whoever completes it removes it from everyone's view.
 */
export async function listMyActionCycles(orgId: string, userId: string): Promise<MyActionCycle[]> {
  return db
    .select({
      id: cycles.id,
      organizationId: cycles.organizationId,
      railRunId: cycles.railRunId,
      railNodeId: cycles.railNodeId,
      postId: cycles.postId,
      title: cycles.title,
      description: cycles.description,
      checklistItems: cycles.checklistItems,
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
    })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    .where(
      and(
        eq(cycles.id, cycleId),
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.deletedAt),
      ),
    )
    .limit(1)
  return rows[0] ?? null
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
