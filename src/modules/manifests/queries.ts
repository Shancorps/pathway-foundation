import "server-only"
import { createId } from "@paralleldrive/cuid2"
import { and, asc, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { rails } from "@/modules/rails/schema"
import { railRuns } from "@/modules/rail-runs/schema"
import { manifests, railManifests, railRunManifests } from "./schema"

interface ListOptions {
  withDeleted?: boolean
}

export async function listManifestsForOrg(orgId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? eq(manifests.organizationId, orgId)
    : and(eq(manifests.organizationId, orgId), isNull(manifests.deletedAt))
  return db.select().from(manifests).where(where).orderBy(manifests.name)
}

export async function getManifestForOrg(orgId: string, id: string) {
  const [row] = await db
    .select()
    .from(manifests)
    .where(
      and(eq(manifests.organizationId, orgId), eq(manifests.id, id), isNull(manifests.deletedAt)),
    )
    .limit(1)
  return row ?? null
}

/**
 * The manifests currently attached to a rail, in attachment order.
 * Returned with the manifest template fields joined in for one-shot rendering.
 */
export async function getRailManifests(railId: string) {
  return db
    .select({
      attachment: railManifests,
      manifest: manifests,
    })
    .from(railManifests)
    .innerJoin(manifests, eq(manifests.id, railManifests.manifestId))
    .where(and(eq(railManifests.railId, railId), isNull(manifests.deletedAt)))
    .orderBy(asc(railManifests.position))
}

/**
 * Manifest data rows for a rail run. Includes detached manifests
 * (template-joined) so the cycle UI can show "Detached: ..." entries.
 */
export async function getRailRunManifests(railRunId: string) {
  return db
    .select({
      runRow: railRunManifests,
      manifest: manifests,
    })
    .from(railRunManifests)
    .innerJoin(manifests, eq(manifests.id, railRunManifests.manifestId))
    .where(eq(railRunManifests.railRunId, railRunId))
}

/**
 * Lazy-creates rail_run_manifests rows for any manifest currently attached
 * to the rail but missing a run row. Idempotent. Called from the cycle
 * detail loader and from updateRunData before any write.
 */
export async function ensureRailRunManifestRows(railRunId: string) {
  const [run] = await db
    .select({ railId: railRuns.railId })
    .from(railRuns)
    .where(eq(railRuns.id, railRunId))
    .limit(1)
  if (!run) return

  const attached = await db
    .select({ manifestId: railManifests.manifestId })
    .from(railManifests)
    .where(eq(railManifests.railId, run.railId))

  if (attached.length === 0) return

  const existing = await db
    .select({ manifestId: railRunManifests.manifestId })
    .from(railRunManifests)
    .where(eq(railRunManifests.railRunId, railRunId))
  const existingSet = new Set(existing.map((r) => r.manifestId))

  const toInsert = attached
    .filter((a) => !existingSet.has(a.manifestId))
    .map((a) => ({
      id: createId(),
      railRunId,
      manifestId: a.manifestId,
      data: {},
    }))

  if (toInsert.length > 0) {
    await db.insert(railRunManifests).values(toInsert)
  }
}

/**
 * Which rails currently use a given manifest. For the deletion-refusal
 * error message and the field-deletion-refusal check.
 */
export async function getRailsUsingManifest(orgId: string, manifestId: string) {
  return db
    .select({ id: rails.id, name: rails.name })
    .from(railManifests)
    .innerJoin(rails, eq(rails.id, railManifests.railId))
    .where(
      and(
        eq(railManifests.manifestId, manifestId),
        eq(rails.organizationId, orgId),
        isNull(rails.deletedAt),
      ),
    )
    .orderBy(rails.name)
}
