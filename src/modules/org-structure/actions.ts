"use server"

import { revalidatePath } from "next/cache"
import { and, eq, isNotNull, isNull } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { ActionError, orgAction } from "@/lib/safe-action"
import { audit } from "@/modules/audit/audit"
import { member } from "@/modules/auth/schema"
import { orgContainers, posts, type OrgContainerLevel } from "./schema"
import {
  assignPostInput,
  createOrgContainerInput,
  createPostInput,
  deleteOrgContainerInput,
  deletePostInput,
  restoreOrgContainerInput,
  restorePostInput,
  unassignPostInput,
  updateOrgContainerInput,
  updatePostInput,
} from "./types"

const LEVEL_RANK: Record<OrgContainerLevel, number> = {
  division: 1,
  department: 2,
  section: 3,
  unit: 4,
}

const STRUCTURE_PATH = "/organization/structure"

async function assertParentIsHigherLevel(
  ctx: Parameters<Parameters<typeof orgAction.action>[0]>[0]["ctx"],
  childLevel: OrgContainerLevel,
  parentId: string | null | undefined,
) {
  if (!parentId) return
  const [parent] = await ctx.db
    .select({ level: orgContainers.level, organizationId: orgContainers.organizationId })
    .from(orgContainers)
    .where(and(eq(orgContainers.id, parentId), isNull(orgContainers.deletedAt)))
    .limit(1)
  if (parent?.organizationId !== ctx.activeOrg.id) {
    throw new ActionError("NOT_FOUND", "Parent container not found")
  }
  if (LEVEL_RANK[parent.level] >= LEVEL_RANK[childLevel]) {
    throw new ActionError("VALIDATION", `A ${childLevel} cannot be nested inside a ${parent.level}`)
  }
}

async function assertContainerInOrg(
  ctx: Parameters<Parameters<typeof orgAction.action>[0]>[0]["ctx"],
  containerId: string | null | undefined,
) {
  if (!containerId) return
  const [row] = await ctx.db
    .select({ organizationId: orgContainers.organizationId })
    .from(orgContainers)
    .where(and(eq(orgContainers.id, containerId), isNull(orgContainers.deletedAt)))
    .limit(1)
  if (row?.organizationId !== ctx.activeOrg.id) {
    throw new ActionError("NOT_FOUND", "Container not found")
  }
}

export const createContainer = orgAction
  .metadata({ actionName: "org_structure.container.create" })
  .inputSchema(createOrgContainerInput)
  .action(async ({ parsedInput, ctx }) => {
    await assertParentIsHigherLevel(ctx, parsedInput.level, parsedInput.parentId ?? null)
    const id = createId()
    await ctx.db.insert(orgContainers).values({
      id,
      organizationId: ctx.activeOrg.id,
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
      level: parsedInput.level,
      name: parsedInput.name,
      description: parsedInput.description,
      vfp: parsedInput.vfp,
      color: parsedInput.color,
      parentId: parsedInput.parentId ?? null,
      position: parsedInput.position ?? 0,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "org_containers.created",
      { resourceType: "org_container", resourceId: id, metadata: { level: parsedInput.level } },
    )
    revalidatePath(STRUCTURE_PATH)
    return { id }
  })

export const updateContainer = orgAction
  .metadata({ actionName: "org_structure.container.update" })
  .inputSchema(updateOrgContainerInput)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...rest } = parsedInput
    const [existing] = await ctx.db
      .select({ level: orgContainers.level })
      .from(orgContainers)
      .where(
        and(
          eq(orgContainers.id, id),
          eq(orgContainers.organizationId, ctx.activeOrg.id),
          isNull(orgContainers.deletedAt),
        ),
      )
      .limit(1)
    if (!existing) throw new ActionError("NOT_FOUND", "Container not found")
    if (rest.parentId !== undefined) {
      await assertParentIsHigherLevel(ctx, existing.level, rest.parentId)
    }
    const result = await ctx.db
      .update(orgContainers)
      .set({ ...rest, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(
        and(
          eq(orgContainers.id, id),
          eq(orgContainers.organizationId, ctx.activeOrg.id),
          isNull(orgContainers.deletedAt),
        ),
      )
      .returning({ id: orgContainers.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Container not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "org_containers.updated",
      { resourceType: "org_container", resourceId: id, metadata: rest },
    )
    revalidatePath(STRUCTURE_PATH)
    return { id }
  })

export const deleteContainer = orgAction
  .metadata({ actionName: "org_structure.container.delete" })
  .inputSchema(deleteOrgContainerInput)
  .action(async ({ parsedInput, ctx }) => {
    // Look up the target's parent so we can reparent direct children before deletion.
    // Children of a deleted Section bubble up to its Department; deleting a top-level
    // Division leaves children as floating (parentId/parentContainerId = NULL).
    const [target] = await ctx.db
      .select({ parentId: orgContainers.parentId })
      .from(orgContainers)
      .where(
        and(
          eq(orgContainers.id, parsedInput.id),
          eq(orgContainers.organizationId, ctx.activeOrg.id),
          isNull(orgContainers.deletedAt),
        ),
      )
      .limit(1)
    if (!target) {
      throw new ActionError("NOT_FOUND", "Container not found or already deleted")
    }

    const reparentedContainers = await ctx.db
      .update(orgContainers)
      .set({ parentId: target.parentId, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(
        and(
          eq(orgContainers.organizationId, ctx.activeOrg.id),
          eq(orgContainers.parentId, parsedInput.id),
          isNull(orgContainers.deletedAt),
        ),
      )
      .returning({ id: orgContainers.id })

    const reparentedPosts = await ctx.db
      .update(posts)
      .set({
        parentContainerId: target.parentId,
        updatedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .where(
        and(
          eq(posts.organizationId, ctx.activeOrg.id),
          eq(posts.parentContainerId, parsedInput.id),
          isNull(posts.deletedAt),
        ),
      )
      .returning({ id: posts.id })

    const result = await ctx.db
      .update(orgContainers)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(
        and(
          eq(orgContainers.id, parsedInput.id),
          eq(orgContainers.organizationId, ctx.activeOrg.id),
          isNull(orgContainers.deletedAt),
        ),
      )
      .returning({ id: orgContainers.id })
    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Container not found or already deleted")
    }
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "org_containers.deleted",
      {
        resourceType: "org_container",
        resourceId: parsedInput.id,
        metadata: {
          newParentId: target.parentId,
          reparentedContainers: reparentedContainers.length,
          reparentedPosts: reparentedPosts.length,
        },
      },
    )
    revalidatePath(STRUCTURE_PATH)
    return {
      id: parsedInput.id,
      reparentedContainers: reparentedContainers.length,
      reparentedPosts: reparentedPosts.length,
    }
  })

export const restoreContainer = orgAction
  .metadata({ actionName: "org_structure.container.restore" })
  .inputSchema(restoreOrgContainerInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(orgContainers)
      .set({ deletedAt: null, deletedBy: null })
      .where(
        and(
          eq(orgContainers.id, parsedInput.id),
          eq(orgContainers.organizationId, ctx.activeOrg.id),
          isNotNull(orgContainers.deletedAt),
        ),
      )
      .returning({ id: orgContainers.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Deleted container not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "org_containers.restored",
      { resourceType: "org_container", resourceId: parsedInput.id },
    )
    revalidatePath(STRUCTURE_PATH)
    return { id: parsedInput.id }
  })

export const createPost = orgAction
  .metadata({ actionName: "org_structure.post.create" })
  .inputSchema(createPostInput)
  .action(async ({ parsedInput, ctx }) => {
    await assertContainerInOrg(ctx, parsedInput.parentContainerId ?? null)
    const id = createId()
    await ctx.db.insert(posts).values({
      id,
      organizationId: ctx.activeOrg.id,
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
      title: parsedInput.title,
      description: parsedInput.description,
      vfp: parsedInput.vfp,
      parentContainerId: parsedInput.parentContainerId ?? null,
      isSenior: parsedInput.isSenior ?? false,
      isAreaManager: parsedInput.isAreaManager ?? false,
      position: parsedInput.position ?? 0,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "posts.created",
      { resourceType: "post", resourceId: id },
    )
    revalidatePath(STRUCTURE_PATH)
    return { id }
  })

export const updatePost = orgAction
  .metadata({ actionName: "org_structure.post.update" })
  .inputSchema(updatePostInput)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...rest } = parsedInput
    if (rest.parentContainerId !== undefined) {
      await assertContainerInOrg(ctx, rest.parentContainerId)
    }
    const result = await ctx.db
      .update(posts)
      .set({ ...rest, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(
        and(eq(posts.id, id), eq(posts.organizationId, ctx.activeOrg.id), isNull(posts.deletedAt)),
      )
      .returning({ id: posts.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Post not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "posts.updated",
      { resourceType: "post", resourceId: id, metadata: rest },
    )
    revalidatePath(STRUCTURE_PATH)
    return { id }
  })

export const deletePost = orgAction
  .metadata({ actionName: "org_structure.post.delete" })
  .inputSchema(deletePostInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(posts)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(
        and(
          eq(posts.id, parsedInput.id),
          eq(posts.organizationId, ctx.activeOrg.id),
          isNull(posts.deletedAt),
        ),
      )
      .returning({ id: posts.id })
    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Post not found or already deleted")
    }
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "posts.deleted",
      { resourceType: "post", resourceId: parsedInput.id },
    )
    revalidatePath(STRUCTURE_PATH)
    return { id: parsedInput.id }
  })

export const restorePost = orgAction
  .metadata({ actionName: "org_structure.post.restore" })
  .inputSchema(restorePostInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(posts)
      .set({ deletedAt: null, deletedBy: null })
      .where(
        and(
          eq(posts.id, parsedInput.id),
          eq(posts.organizationId, ctx.activeOrg.id),
          isNotNull(posts.deletedAt),
        ),
      )
      .returning({ id: posts.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Deleted post not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "posts.restored",
      { resourceType: "post", resourceId: parsedInput.id },
    )
    revalidatePath(STRUCTURE_PATH)
    return { id: parsedInput.id }
  })

export const assignPost = orgAction
  .metadata({ actionName: "org_structure.post.assign" })
  .inputSchema(assignPostInput)
  .action(async ({ parsedInput, ctx }) => {
    const [assignee] = await ctx.db
      .select({ userId: member.userId })
      .from(member)
      .where(
        and(eq(member.organizationId, ctx.activeOrg.id), eq(member.userId, parsedInput.userId)),
      )
      .limit(1)
    if (!assignee) {
      throw new ActionError("VALIDATION", "User is not a member of this organization")
    }
    const result = await ctx.db
      .update(posts)
      .set({
        userId: parsedInput.userId,
        updatedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .where(
        and(
          eq(posts.id, parsedInput.id),
          eq(posts.organizationId, ctx.activeOrg.id),
          isNull(posts.deletedAt),
        ),
      )
      .returning({ id: posts.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Post not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "posts.assigned",
      {
        resourceType: "post",
        resourceId: parsedInput.id,
        metadata: { assigneeUserId: parsedInput.userId },
      },
    )
    revalidatePath(STRUCTURE_PATH)
    return { id: parsedInput.id }
  })

export const unassignPost = orgAction
  .metadata({ actionName: "org_structure.post.unassign" })
  .inputSchema(unassignPostInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(posts)
      .set({ userId: null, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(
        and(
          eq(posts.id, parsedInput.id),
          eq(posts.organizationId, ctx.activeOrg.id),
          isNull(posts.deletedAt),
        ),
      )
      .returning({ id: posts.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Post not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "posts.unassigned",
      { resourceType: "post", resourceId: parsedInput.id },
    )
    revalidatePath(STRUCTURE_PATH)
    return { id: parsedInput.id }
  })
