import { and, isNotNull, lt, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { verifyCronAuth } from "@/modules/jobs/cron-auth"
import { items } from "@/modules/items/schema"
import { files } from "@/modules/files/schema"
import { orgContainers, posts } from "@/modules/org-structure/schema"
import { particleTypes, particles } from "@/modules/particles/schema"
import { audit } from "@/modules/audit/audit"
import { blob } from "@/lib/blob"
import { log } from "@/lib/log"

const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 90)
const BATCH_LIMIT = Number(process.env.PURGE_BATCH_LIMIT ?? 1000)
const PURGE_ENABLED = (process.env.PURGE_ENABLED ?? "true") !== "false"

/**
 * Hard-deletes soft-deleted rows older than RETENTION_DAYS. This is the ONLY
 * place hard deletes happen, and the only place blob storage gets `del()`'d.
 *
 * Safety properties:
 *   - PURGE_ENABLED env can be set to "false" as a kill-switch without a deploy.
 *   - Each invocation processes at most BATCH_LIMIT rows per resource type;
 *     larger backlogs are drained over multiple cron runs.
 *   - Audit row is written BEFORE the DB delete so even a crash mid-run leaves
 *     a forensic trail.
 *   - Blob deletes are best-effort and run after the DB delete; orphan blobs
 *     can be reaped by a separate sweep if any fail.
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return new Response("Unauthorized", { status: 401 })
  }
  if (!PURGE_ENABLED) {
    log.warn("[purge] PURGE_ENABLED=false — skipping")
    return Response.json({ ok: true, skipped: true, reason: "PURGE_ENABLED=false" })
  }
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  // -------- Items --------
  const itemRows = await db
    .select({ id: items.id, organizationId: items.organizationId })
    .from(items)
    .where(and(isNotNull(items.deletedAt), lt(items.deletedAt, cutoff)))
    .limit(BATCH_LIMIT)

  const itemOrgCounts = new Map<string, number>()
  for (const r of itemRows) {
    itemOrgCounts.set(r.organizationId, (itemOrgCounts.get(r.organizationId) ?? 0) + 1)
  }
  for (const [orgId, count] of itemOrgCounts) {
    await audit({ db, organizationId: orgId, actorUserId: null }, "purge.items", {
      metadata: { count, retentionDays: RETENTION_DAYS },
    })
  }
  if (itemRows.length > 0) {
    await db.delete(items).where(
      inArray(
        items.id,
        itemRows.map((r) => r.id),
      ),
    )
  }

  // -------- Files --------
  const fileRows = await db
    .select({
      id: files.id,
      url: files.url,
      organizationId: files.organizationId,
    })
    .from(files)
    .where(and(isNotNull(files.deletedAt), lt(files.deletedAt, cutoff)))
    .limit(BATCH_LIMIT)

  const fileOrgCounts = new Map<string, number>()
  for (const r of fileRows) {
    fileOrgCounts.set(r.organizationId, (fileOrgCounts.get(r.organizationId) ?? 0) + 1)
  }
  for (const [orgId, count] of fileOrgCounts) {
    await audit({ db, organizationId: orgId, actorUserId: null }, "purge.files", {
      metadata: { count, retentionDays: RETENTION_DAYS },
    })
  }
  if (fileRows.length > 0) {
    await db.delete(files).where(
      inArray(
        files.id,
        fileRows.map((r) => r.id),
      ),
    )
  }

  // Best-effort blob cleanup AFTER the DB delete commits. A failure here leaves
  // an orphan blob (cheap, reapable) rather than an orphan DB row pointing at a
  // deleted blob (which would 404 on next read).
  for (const f of fileRows) {
    try {
      await blob.del(f.url)
    } catch (e) {
      log.error({ err: e, url: f.url }, "[purge] blob delete failed")
    }
  }

  // -------- Posts --------
  // Posts must be purged BEFORE org_containers (posts.parentContainerId has FK ON DELETE RESTRICT).
  const postRows = await db
    .select({ id: posts.id, organizationId: posts.organizationId })
    .from(posts)
    .where(and(isNotNull(posts.deletedAt), lt(posts.deletedAt, cutoff)))
    .limit(BATCH_LIMIT)

  const postOrgCounts = new Map<string, number>()
  for (const r of postRows) {
    postOrgCounts.set(r.organizationId, (postOrgCounts.get(r.organizationId) ?? 0) + 1)
  }
  for (const [orgId, count] of postOrgCounts) {
    await audit({ db, organizationId: orgId, actorUserId: null }, "purge.posts", {
      metadata: { count, retentionDays: RETENTION_DAYS },
    })
  }
  if (postRows.length > 0) {
    await db.delete(posts).where(
      inArray(
        posts.id,
        postRows.map((r) => r.id),
      ),
    )
  }

  // -------- Particles --------
  // Particles must be purged BEFORE particle_types (FK ON DELETE RESTRICT).
  const particleRows = await db
    .select({ id: particles.id, organizationId: particles.organizationId })
    .from(particles)
    .where(and(isNotNull(particles.deletedAt), lt(particles.deletedAt, cutoff)))
    .limit(BATCH_LIMIT)

  const particleOrgCounts = new Map<string, number>()
  for (const r of particleRows) {
    particleOrgCounts.set(r.organizationId, (particleOrgCounts.get(r.organizationId) ?? 0) + 1)
  }
  for (const [orgId, count] of particleOrgCounts) {
    await audit({ db, organizationId: orgId, actorUserId: null }, "purge.particles", {
      metadata: { count, retentionDays: RETENTION_DAYS },
    })
  }
  if (particleRows.length > 0) {
    await db.delete(particles).where(
      inArray(
        particles.id,
        particleRows.map((r) => r.id),
      ),
    )
  }

  // -------- Particle Types --------
  const particleTypeRows = await db
    .select({ id: particleTypes.id, organizationId: particleTypes.organizationId })
    .from(particleTypes)
    .where(and(isNotNull(particleTypes.deletedAt), lt(particleTypes.deletedAt, cutoff)))
    .limit(BATCH_LIMIT)

  const particleTypeOrgCounts = new Map<string, number>()
  for (const r of particleTypeRows) {
    particleTypeOrgCounts.set(
      r.organizationId,
      (particleTypeOrgCounts.get(r.organizationId) ?? 0) + 1,
    )
  }
  for (const [orgId, count] of particleTypeOrgCounts) {
    await audit({ db, organizationId: orgId, actorUserId: null }, "purge.particle_types", {
      metadata: { count, retentionDays: RETENTION_DAYS },
    })
  }
  let particleTypesDeleted = 0
  for (const r of particleTypeRows) {
    try {
      await db.delete(particleTypes).where(inArray(particleTypes.id, [r.id]))
      particleTypesDeleted += 1
    } catch (e) {
      log.warn({ err: e, id: r.id }, "[purge] particle_types delete deferred (likely FK)")
    }
  }

  // -------- Org Containers --------
  // Self-referential FK with ON DELETE RESTRICT: a parent container can't be hard-deleted
  // until its children are gone. The cron drains nested levels over multiple runs.
  const containerRows = await db
    .select({ id: orgContainers.id, organizationId: orgContainers.organizationId })
    .from(orgContainers)
    .where(and(isNotNull(orgContainers.deletedAt), lt(orgContainers.deletedAt, cutoff)))
    .limit(BATCH_LIMIT)

  const containerOrgCounts = new Map<string, number>()
  for (const r of containerRows) {
    containerOrgCounts.set(r.organizationId, (containerOrgCounts.get(r.organizationId) ?? 0) + 1)
  }
  for (const [orgId, count] of containerOrgCounts) {
    await audit({ db, organizationId: orgId, actorUserId: null }, "purge.org_containers", {
      metadata: { count, retentionDays: RETENTION_DAYS },
    })
  }
  let containersDeleted = 0
  for (const r of containerRows) {
    try {
      await db.delete(orgContainers).where(inArray(orgContainers.id, [r.id]))
      containersDeleted += 1
    } catch (e) {
      // Likely a FK violation because a child container or post is still around.
      // Leave for a subsequent run; nothing fatal.
      log.warn({ err: e, id: r.id }, "[purge] org_containers delete deferred (likely FK)")
    }
  }

  return Response.json({
    ok: true,
    purged: {
      items: itemRows.length,
      files: fileRows.length,
      posts: postRows.length,
      orgContainers: containersDeleted,
      particles: particleRows.length,
      particleTypes: particleTypesDeleted,
    },
    cutoff: cutoff.toISOString(),
    batchLimit: BATCH_LIMIT,
    moreToProcess:
      itemRows.length === BATCH_LIMIT ||
      fileRows.length === BATCH_LIMIT ||
      postRows.length === BATCH_LIMIT ||
      containerRows.length === BATCH_LIMIT ||
      particleRows.length === BATCH_LIMIT ||
      particleTypeRows.length === BATCH_LIMIT,
  })
}
