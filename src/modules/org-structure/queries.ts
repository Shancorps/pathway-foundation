import "server-only"
import { and, asc, eq, inArray, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/modules/auth/schema"
import { orgContainers, postAssignments, posts } from "./schema"

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

export interface PostAssignedUser {
  id: string
  name: string
  email: string
  image: string | null
}

export interface PostWithAssignments {
  id: string
  organizationId: string
  title: string
  description: string | null
  vfp: string | null
  parentContainerId: string | null
  isSenior: boolean
  isAreaManager: boolean
  position: number
  createdAt: Date
  deletedAt: Date | null
  assignedUsers: PostAssignedUser[]
}

/**
 * All posts for an org, flat list. Each post carries its current holders
 * (`assignedUsers`). Client assembles the tree by parentContainerId.
 */
export async function listPostsForOrg(
  orgId: string,
  opts: ListOptions = {},
): Promise<PostWithAssignments[]> {
  const postWhere = opts.withDeleted
    ? eq(posts.organizationId, orgId)
    : and(eq(posts.organizationId, orgId), isNull(posts.deletedAt))
  const postRows = await db
    .select()
    .from(posts)
    .where(postWhere)
    .orderBy(asc(posts.position), asc(posts.createdAt))
  if (postRows.length === 0) return []

  const assignmentRows = await db
    .select({
      postId: postAssignments.postId,
      userId: postAssignments.userId,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(postAssignments)
    .innerJoin(user, eq(postAssignments.userId, user.id))
    .where(
      and(
        eq(postAssignments.organizationId, orgId),
        inArray(
          postAssignments.postId,
          postRows.map((p) => p.id),
        ),
      ),
    )

  const byPost = new Map<string, PostAssignedUser[]>()
  for (const a of assignmentRows) {
    const list = byPost.get(a.postId) ?? []
    list.push({ id: a.userId, name: a.userName, email: a.userEmail, image: a.userImage })
    byPost.set(a.postId, list)
  }

  return postRows.map((p) => ({
    id: p.id,
    organizationId: p.organizationId,
    title: p.title,
    description: p.description,
    vfp: p.vfp,
    parentContainerId: p.parentContainerId,
    isSenior: p.isSenior,
    isAreaManager: p.isAreaManager,
    position: p.position,
    createdAt: p.createdAt,
    deletedAt: p.deletedAt,
    assignedUsers: byPost.get(p.id) ?? [],
  }))
}

export async function getPostForOrg(orgId: string, id: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? and(eq(posts.organizationId, orgId), eq(posts.id, id))
    : and(eq(posts.organizationId, orgId), eq(posts.id, id), isNull(posts.deletedAt))
  const [row] = await db.select().from(posts).where(where).limit(1)
  return row ?? null
}

/**
 * CRITICAL routing primitive. Returns every Post the given user currently
 * holds in this org. A Post can have multiple holders; this returns the
 * subset where THIS user is one of them. Used by My Actions to decide which
 * cycles to surface.
 */
export async function listPostsHeldByUser(orgId: string, userId: string) {
  return db
    .select({
      id: posts.id,
      organizationId: posts.organizationId,
      title: posts.title,
      parentContainerId: posts.parentContainerId,
      position: posts.position,
    })
    .from(posts)
    .innerJoin(postAssignments, eq(postAssignments.postId, posts.id))
    .where(
      and(
        eq(posts.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(posts.deletedAt),
      ),
    )
    .orderBy(asc(posts.position), asc(posts.createdAt))
}
