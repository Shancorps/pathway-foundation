import "server-only"
import { and, asc, count, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { particleTypes, particles } from "./schema"

interface ListOptions {
  withDeleted?: boolean
}

export async function listParticleTypes(orgId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? eq(particleTypes.organizationId, orgId)
    : and(eq(particleTypes.organizationId, orgId), isNull(particleTypes.deletedAt))
  return db
    .select()
    .from(particleTypes)
    .where(where)
    .orderBy(asc(particleTypes.position), asc(particleTypes.createdAt))
}

export async function getParticleType(orgId: string, id: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? and(eq(particleTypes.organizationId, orgId), eq(particleTypes.id, id))
    : and(
        eq(particleTypes.organizationId, orgId),
        eq(particleTypes.id, id),
        isNull(particleTypes.deletedAt),
      )
  const [row] = await db.select().from(particleTypes).where(where).limit(1)
  return row ?? null
}

export async function listParticlesForType(orgId: string, typeId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? and(eq(particles.organizationId, orgId), eq(particles.particleTypeId, typeId))
    : and(
        eq(particles.organizationId, orgId),
        eq(particles.particleTypeId, typeId),
        isNull(particles.deletedAt),
      )
  return db
    .select()
    .from(particles)
    .where(where)
    .orderBy(asc(particles.name), asc(particles.createdAt))
}

export async function listParticlesForOrg(orgId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? eq(particles.organizationId, orgId)
    : and(eq(particles.organizationId, orgId), isNull(particles.deletedAt))
  return db.select().from(particles).where(where).orderBy(asc(particles.createdAt))
}

export async function getParticle(orgId: string, id: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? and(eq(particles.organizationId, orgId), eq(particles.id, id))
    : and(eq(particles.organizationId, orgId), eq(particles.id, id), isNull(particles.deletedAt))
  const [row] = await db.select().from(particles).where(where).limit(1)
  return row ?? null
}

/** Map of particle_type_id → count of live instances. Used to render badges on the Types index. */
export async function particleCountByType(orgId: string) {
  const rows = await db
    .select({
      particleTypeId: particles.particleTypeId,
      count: count(particles.id),
    })
    .from(particles)
    .where(and(eq(particles.organizationId, orgId), isNull(particles.deletedAt)))
    .groupBy(particles.particleTypeId)
  const map = new Map<string, number>()
  for (const r of rows) {
    map.set(r.particleTypeId, r.count)
  }
  return map
}
