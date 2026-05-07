import "server-only"
import { and, asc, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/modules/auth/schema"
import { orgContainers, posts } from "./schema"

interface ListOptions {
  withDeleted?: boolean
}

export async function listContainersForOrg(orgId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? eq(orgContainers.organizationId, orgId)
    : and(eq(orgContainers.organizationId, orgId), isNull(orgContainers.deletedAt))
  return db
    .select()
    .from(orgContainers)
    .where(where)
    .orderBy(asc(orgContainers.position), asc(orgContainers.createdAt))
}

export async function getContainerForOrg(orgId: string, id: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? and(eq(orgContainers.organizationId, orgId), eq(orgContainers.id, id))
    : and(
        eq(orgContainers.organizationId, orgId),
        eq(orgContainers.id, id),
        isNull(orgContainers.deletedAt),
      )
  const [row] = await db.select().from(orgContainers).where(where).limit(1)
  return row ?? null
}

/** All posts for an org, flat list. Client assembles into tree by parentContainerId. */
export async function listPostsForOrg(orgId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? eq(posts.organizationId, orgId)
    : and(eq(posts.organizationId, orgId), isNull(posts.deletedAt))
  return db
    .select({
      id: posts.id,
      organizationId: posts.organizationId,
      title: posts.title,
      description: posts.description,
      vfp: posts.vfp,
      parentContainerId: posts.parentContainerId,
      userId: posts.userId,
      isSenior: posts.isSenior,
      isAreaManager: posts.isAreaManager,
      position: posts.position,
      createdAt: posts.createdAt,
      deletedAt: posts.deletedAt,
      assignedUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(posts)
    .leftJoin(user, eq(posts.userId, user.id))
    .where(where)
    .orderBy(asc(posts.position), asc(posts.createdAt))
}

export async function getPostForOrg(orgId: string, id: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? and(eq(posts.organizationId, orgId), eq(posts.id, id))
    : and(eq(posts.organizationId, orgId), eq(posts.id, id), isNull(posts.deletedAt))
  const [row] = await db.select().from(posts).where(where).limit(1)
  return row ?? null
}

/**
 * CRITICAL routing primitive. Returns every post the given user currently holds in this org.
 * Used by My Actions to determine which cycles to surface.
 */
export async function listPostsHeldByUser(orgId: string, userId: string) {
  return db
    .select()
    .from(posts)
    .where(and(eq(posts.organizationId, orgId), eq(posts.userId, userId), isNull(posts.deletedAt)))
    .orderBy(asc(posts.position), asc(posts.createdAt))
}
