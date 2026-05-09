import "server-only"
import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { particleTypes } from "@/modules/particles/schema"
import { railRuns } from "@/modules/rail-runs/schema"
import { railNodes, rails } from "./schema"

interface ListOptions {
  withDeleted?: boolean
}

export async function listRailsForOrg(orgId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? eq(rails.organizationId, orgId)
    : and(eq(rails.organizationId, orgId), isNull(rails.deletedAt))
  return db
    .select({
      id: rails.id,
      organizationId: rails.organizationId,
      particleTypeId: rails.particleTypeId,
      particleTypeName: particleTypes.name,
      name: rails.name,
      description: rails.description,
      status: rails.status,
      publishedAt: rails.publishedAt,
      createdAt: rails.createdAt,
      updatedAt: rails.updatedAt,
      deletedAt: rails.deletedAt,
    })
    .from(rails)
    .leftJoin(particleTypes, eq(rails.particleTypeId, particleTypes.id))
    .where(where)
    .orderBy(asc(rails.name), asc(rails.createdAt))
}

export async function getRailForOrg(orgId: string, id: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? and(eq(rails.organizationId, orgId), eq(rails.id, id))
    : and(eq(rails.organizationId, orgId), eq(rails.id, id), isNull(rails.deletedAt))
  const [row] = await db.select().from(rails).where(where).limit(1)
  return row ?? null
}

export async function listNodesForRail(orgId: string, railId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? and(eq(railNodes.organizationId, orgId), eq(railNodes.railId, railId))
    : and(
        eq(railNodes.organizationId, orgId),
        eq(railNodes.railId, railId),
        isNull(railNodes.deletedAt),
      )
  return db
    .select()
    .from(railNodes)
    .where(where)
    .orderBy(asc(railNodes.position), asc(railNodes.createdAt))
}

/**
 * Convenience: returns the rail + its ordered nodes in a single shape. Used by
 * the editor and (later) the run-instantiation logic.
 */
export async function getRailWithNodes(orgId: string, id: string, opts: ListOptions = {}) {
  const rail = await getRailForOrg(orgId, id, opts)
  if (!rail) return null
  const nodes = await listNodesForRail(orgId, rail.id, opts)
  return { rail, nodes }
}

/**
 * Count of currently-running rail_runs for a rail. Drives the "Editing a
 * published rail with N runs in progress" warning in the builder.
 */
export async function countRunningRunsForRail(orgId: string, railId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(railRuns)
    .where(
      and(
        eq(railRuns.organizationId, orgId),
        eq(railRuns.railId, railId),
        eq(railRuns.status, "running"),
        isNull(railRuns.deletedAt),
      ),
    )
  return row?.n ?? 0
}

export async function listRailsForParticleType(orgId: string, particleTypeId: string) {
  return db
    .select()
    .from(rails)
    .where(
      and(
        eq(rails.organizationId, orgId),
        eq(rails.particleTypeId, particleTypeId),
        isNull(rails.deletedAt),
      ),
    )
    .orderBy(asc(rails.name))
}
