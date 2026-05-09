"use server"

import { revalidatePath } from "next/cache"
import { and, eq, inArray, isNotNull, isNull, max } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { ActionError, orgAction } from "@/lib/safe-action"
import { audit } from "@/modules/audit/audit"
import { posts } from "@/modules/org-structure/schema"
import { particleTypes } from "@/modules/particles/schema"
import {
  railNodes,
  rails,
  type RailNode,
  type RailNodeChecklistItem,
  type RailNodeToolsLink,
} from "./schema"
import { cycles, type CycleChecklistItem } from "@/modules/rail-runs/schema"
import {
  addStructuralNodeInput,
  addTaskNodeInput,
  createRailInput,
  deleteNodeInput,
  deleteRailInput,
  publishRailInput,
  pushRailUpdateToCyclesInput,
  reorderNodesInput,
  restoreRailInput,
  unpublishRailInput,
  updateNodeInput,
  updateRailInput,
} from "./types"

const RAILS_PATH = "/rails"

/**
 * Normalize inbound checklist items into the stored shape. Existing items keep
 * their `id` so runtime check-state can survive a rail edit; new items (no id)
 * get a fresh CUID. Positions are reassigned to match the submitted order.
 */
function normalizeChecklist(
  items: readonly { id?: string; label: string; required: boolean }[],
): RailNodeChecklistItem[] {
  return items.map((item, position) => ({
    id: item.id ?? createId(),
    label: item.label,
    required: item.required,
    position,
  }))
}

function normalizeToolsLinks(
  items: readonly { id?: string; label: string; url: string }[],
): RailNodeToolsLink[] {
  return items.map((item, position) => ({
    id: item.id ?? createId(),
    label: item.label,
    url: item.url,
    position,
  }))
}

async function loadRail(
  ctx: Parameters<Parameters<typeof orgAction.action>[0]>[0]["ctx"],
  railId: string,
) {
  const [row] = await ctx.db
    .select()
    .from(rails)
    .where(
      and(
        eq(rails.id, railId),
        eq(rails.organizationId, ctx.activeOrg.id),
        isNull(rails.deletedAt),
      ),
    )
    .limit(1)
  if (!row) throw new ActionError("NOT_FOUND", "Rail not found")
  return row
}

async function assertPostInOrg(
  ctx: Parameters<Parameters<typeof orgAction.action>[0]>[0]["ctx"],
  postId: string,
) {
  const [row] = await ctx.db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.id, postId),
        eq(posts.organizationId, ctx.activeOrg.id),
        isNull(posts.deletedAt),
      ),
    )
    .limit(1)
  if (!row) throw new ActionError("VALIDATION", "Post not found in this organization")
}

async function assertParticleTypeInOrg(
  ctx: Parameters<Parameters<typeof orgAction.action>[0]>[0]["ctx"],
  particleTypeId: string,
) {
  const [row] = await ctx.db
    .select({ id: particleTypes.id })
    .from(particleTypes)
    .where(
      and(
        eq(particleTypes.id, particleTypeId),
        eq(particleTypes.organizationId, ctx.activeOrg.id),
        isNull(particleTypes.deletedAt),
      ),
    )
    .limit(1)
  if (!row) throw new ActionError("VALIDATION", "Particle type not found in this organization")
}

export const createRail = orgAction
  .metadata({ actionName: "rails.create" })
  .inputSchema(createRailInput)
  .action(async ({ parsedInput, ctx }) => {
    await assertParticleTypeInOrg(ctx, parsedInput.particleTypeId)
    const id = createId()
    await ctx.db.insert(rails).values({
      id,
      organizationId: ctx.activeOrg.id,
      particleTypeId: parsedInput.particleTypeId,
      name: parsedInput.name,
      description: parsedInput.description,
      status: "draft",
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
    })
    // Every rail starts with a Trigger node at position 0. The user can't add
    // or remove this — it's the entry point of the conveyor belt.
    await ctx.db.insert(railNodes).values({
      id: createId(),
      organizationId: ctx.activeOrg.id,
      railId: id,
      type: "trigger",
      name: "Manual start",
      position: 0,
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.created",
      {
        resourceType: "rail",
        resourceId: id,
        metadata: { particleTypeId: parsedInput.particleTypeId, name: parsedInput.name },
      },
    )
    revalidatePath(RAILS_PATH)
    return { id }
  })

export const updateRail = orgAction
  .metadata({ actionName: "rails.update" })
  .inputSchema(updateRailInput)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...rest } = parsedInput
    const result = await ctx.db
      .update(rails)
      .set({ ...rest, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(
        and(eq(rails.id, id), eq(rails.organizationId, ctx.activeOrg.id), isNull(rails.deletedAt)),
      )
      .returning({ id: rails.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Rail not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.updated",
      { resourceType: "rail", resourceId: id, metadata: rest },
    )
    revalidatePath(RAILS_PATH)
    revalidatePath(`${RAILS_PATH}/${id}`)
    return { id }
  })

export const deleteRail = orgAction
  .metadata({ actionName: "rails.delete" })
  .inputSchema(deleteRailInput)
  .action(async ({ parsedInput, ctx }) => {
    // Cascade soft-delete to every node so the editor doesn't try to render orphans.
    await ctx.db
      .update(railNodes)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(
        and(
          eq(railNodes.railId, parsedInput.id),
          eq(railNodes.organizationId, ctx.activeOrg.id),
          isNull(railNodes.deletedAt),
        ),
      )
    const result = await ctx.db
      .update(rails)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(
        and(
          eq(rails.id, parsedInput.id),
          eq(rails.organizationId, ctx.activeOrg.id),
          isNull(rails.deletedAt),
        ),
      )
      .returning({ id: rails.id })
    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Rail not found or already deleted")
    }
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.deleted",
      { resourceType: "rail", resourceId: parsedInput.id },
    )
    revalidatePath(RAILS_PATH)
    return { id: parsedInput.id }
  })

export const restoreRail = orgAction
  .metadata({ actionName: "rails.restore" })
  .inputSchema(restoreRailInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(rails)
      .set({ deletedAt: null, deletedBy: null })
      .where(
        and(
          eq(rails.id, parsedInput.id),
          eq(rails.organizationId, ctx.activeOrg.id),
          isNotNull(rails.deletedAt),
        ),
      )
      .returning({ id: rails.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Deleted rail not found")
    // Restore nodes too — they were soft-deleted at the same instant.
    await ctx.db
      .update(railNodes)
      .set({ deletedAt: null, deletedBy: null })
      .where(
        and(
          eq(railNodes.railId, parsedInput.id),
          eq(railNodes.organizationId, ctx.activeOrg.id),
          isNotNull(railNodes.deletedAt),
        ),
      )
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.restored",
      { resourceType: "rail", resourceId: parsedInput.id },
    )
    revalidatePath(RAILS_PATH)
    return { id: parsedInput.id }
  })

export const addTaskNode = orgAction
  .metadata({ actionName: "rails.add_task" })
  .inputSchema(addTaskNodeInput)
  .action(async ({ parsedInput, ctx }) => {
    const rail = await loadRail(ctx, parsedInput.railId)
    // Editing a published rail is allowed — cycles already issued keep their
    // snapshot of the old data, so in-progress work isn't disturbed. New
    // cycles will reference the updated rail nodes.
    void rail
    await assertPostInOrg(ctx, parsedInput.postId)
    const [maxRow] = await ctx.db
      .select({ maxPosition: max(railNodes.position) })
      .from(railNodes)
      .where(and(eq(railNodes.railId, rail.id), isNull(railNodes.deletedAt)))
    const nextPosition = (maxRow?.maxPosition ?? 0) + 1
    const id = createId()
    await ctx.db.insert(railNodes).values({
      id,
      organizationId: ctx.activeOrg.id,
      railId: rail.id,
      type: "task",
      name: parsedInput.name,
      description: parsedInput.description,
      postId: parsedInput.postId,
      position: nextPosition,
      checklistItems: normalizeChecklist(parsedInput.checklistItems ?? []),
      toolsLinks: normalizeToolsLinks(parsedInput.toolsLinks ?? []),
      idealMinutes: parsedInput.idealMinutes ?? null,
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.task_added",
      { resourceType: "rail_node", resourceId: id, metadata: { railId: rail.id } },
    )
    revalidatePath(`${RAILS_PATH}/${rail.id}`)
    return { id }
  })

/**
 * Add a structural node (currently End; future: Sub-Flow, Statistic, Approval).
 * Goes at the end of the rail. Default name comes from the type — the user
 * can rename via Edit on the canvas.
 */
export const addStructuralNode = orgAction
  .metadata({ actionName: "rails.structural_added" })
  .inputSchema(addStructuralNodeInput)
  .action(async ({ parsedInput, ctx }) => {
    const rail = await loadRail(ctx, parsedInput.railId)
    void rail
    const [maxRow] = await ctx.db
      .select({ maxPosition: max(railNodes.position) })
      .from(railNodes)
      .where(and(eq(railNodes.railId, rail.id), isNull(railNodes.deletedAt)))
    const nextPosition = (maxRow?.maxPosition ?? 0) + 1
    const defaultNames: Record<string, string> = { end: "End" }
    const id = createId()
    await ctx.db.insert(railNodes).values({
      id,
      organizationId: ctx.activeOrg.id,
      railId: rail.id,
      type: parsedInput.type,
      name: parsedInput.name ?? defaultNames[parsedInput.type] ?? "Node",
      position: nextPosition,
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      `rails.${parsedInput.type}_added`,
      { resourceType: "rail_node", resourceId: id, metadata: { railId: rail.id } },
    )
    revalidatePath(`${RAILS_PATH}/${rail.id}`)
    return { id }
  })

async function loadNode(
  ctx: Parameters<Parameters<typeof orgAction.action>[0]>[0]["ctx"],
  nodeId: string,
): Promise<RailNode> {
  const [row] = await ctx.db
    .select()
    .from(railNodes)
    .where(
      and(
        eq(railNodes.id, nodeId),
        eq(railNodes.organizationId, ctx.activeOrg.id),
        isNull(railNodes.deletedAt),
      ),
    )
    .limit(1)
  if (!row) throw new ActionError("NOT_FOUND", "Rail node not found")
  return row
}

export const updateNode = orgAction
  .metadata({ actionName: "rails.update_node" })
  .inputSchema(updateNodeInput)
  .action(async ({ parsedInput, ctx }) => {
    const node = await loadNode(ctx, parsedInput.id)
    const rail = await loadRail(ctx, node.railId)
    // Edits on published rails are permitted; the snapshot model on cycles
    // protects in-progress work from being disturbed.
    void rail
    if (
      node.type === "trigger" &&
      parsedInput.postId !== undefined &&
      parsedInput.postId !== null
    ) {
      throw new ActionError("VALIDATION", "Trigger nodes cannot have a Post assignment")
    }
    if (parsedInput.postId !== undefined && parsedInput.postId !== null) {
      await assertPostInOrg(ctx, parsedInput.postId)
    }
    const patch: Partial<typeof railNodes.$inferInsert> = {}
    if (parsedInput.name !== undefined) patch.name = parsedInput.name
    if (parsedInput.description !== undefined) patch.description = parsedInput.description
    if (parsedInput.postId !== undefined) patch.postId = parsedInput.postId
    if (parsedInput.checklistItems !== undefined) {
      if (node.type === "trigger" && parsedInput.checklistItems.length > 0) {
        throw new ActionError("VALIDATION", "Trigger nodes cannot have a checklist")
      }
      patch.checklistItems = normalizeChecklist(parsedInput.checklistItems)
    }
    if (parsedInput.toolsLinks !== undefined) {
      if (node.type === "trigger" && parsedInput.toolsLinks.length > 0) {
        throw new ActionError("VALIDATION", "Trigger nodes cannot have SOP/Tool links")
      }
      patch.toolsLinks = normalizeToolsLinks(parsedInput.toolsLinks)
    }
    if (parsedInput.idealMinutes !== undefined) {
      if (node.type === "trigger" && parsedInput.idealMinutes !== null) {
        throw new ActionError("VALIDATION", "Trigger nodes cannot have an ideal time")
      }
      patch.idealMinutes = parsedInput.idealMinutes
    }
    await ctx.db
      .update(railNodes)
      .set({ ...patch, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(eq(railNodes.id, node.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.node_updated",
      { resourceType: "rail_node", resourceId: node.id, metadata: { railId: rail.id } },
    )
    revalidatePath(`${RAILS_PATH}/${rail.id}`)
    return { id: node.id }
  })

export const deleteNode = orgAction
  .metadata({ actionName: "rails.delete_node" })
  .inputSchema(deleteNodeInput)
  .action(async ({ parsedInput, ctx }) => {
    const node = await loadNode(ctx, parsedInput.id)
    const rail = await loadRail(ctx, node.railId)
    void rail // edits permitted on published rails — see snapshot semantics on cycles
    if (node.type === "trigger") {
      throw new ActionError("VALIDATION", "The Trigger node is required and cannot be deleted")
    }
    await ctx.db
      .update(railNodes)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(eq(railNodes.id, node.id))
    // Renumber subsequent nodes to keep positions contiguous.
    const remaining = await ctx.db
      .select({ id: railNodes.id })
      .from(railNodes)
      .where(and(eq(railNodes.railId, rail.id), isNull(railNodes.deletedAt)))
      .orderBy(railNodes.position, railNodes.createdAt)
    for (const [i, r] of remaining.entries()) {
      await ctx.db.update(railNodes).set({ position: i }).where(eq(railNodes.id, r.id))
    }
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.node_deleted",
      { resourceType: "rail_node", resourceId: node.id, metadata: { railId: rail.id } },
    )
    revalidatePath(`${RAILS_PATH}/${rail.id}`)
    return { id: node.id }
  })

export const reorderNodes = orgAction
  .metadata({ actionName: "rails.reorder_nodes" })
  .inputSchema(reorderNodesInput)
  .action(async ({ parsedInput, ctx }) => {
    const rail = await loadRail(ctx, parsedInput.railId)
    // Reordering a published rail is permitted; in-progress cycles snapshot
    // their position at issue time so they aren't disturbed.
    void rail
    const existing = await ctx.db
      .select({ id: railNodes.id, type: railNodes.type })
      .from(railNodes)
      .where(and(eq(railNodes.railId, rail.id), isNull(railNodes.deletedAt)))
    if (parsedInput.nodeIdsInOrder.length !== existing.length) {
      throw new ActionError("VALIDATION", "Reorder list must include every node exactly once")
    }
    const knownIds = new Set(existing.map((n) => n.id))
    for (const id of parsedInput.nodeIdsInOrder) {
      if (!knownIds.has(id)) {
        throw new ActionError("VALIDATION", `Unknown node id: ${id}`)
      }
    }
    // Trigger must remain at position 0.
    const firstId = parsedInput.nodeIdsInOrder[0]
    const firstNode = existing.find((n) => n.id === firstId)
    if (firstNode?.type !== "trigger") {
      throw new ActionError("VALIDATION", "Trigger must remain the first node")
    }
    for (const [i, id] of parsedInput.nodeIdsInOrder.entries()) {
      await ctx.db
        .update(railNodes)
        .set({ position: i, updatedAt: new Date(), updatedBy: ctx.session.user.id })
        .where(eq(railNodes.id, id))
    }
    revalidatePath(`${RAILS_PATH}/${rail.id}`)
    return { id: rail.id }
  })

export const publishRail = orgAction
  .metadata({ actionName: "rails.publish" })
  .inputSchema(publishRailInput)
  .action(async ({ parsedInput, ctx }) => {
    const rail = await loadRail(ctx, parsedInput.id)
    const nodes = await ctx.db
      .select()
      .from(railNodes)
      .where(and(eq(railNodes.railId, rail.id), isNull(railNodes.deletedAt)))
      .orderBy(railNodes.position)
    if (!nodes.some((n) => n.type === "trigger")) {
      throw new ActionError("VALIDATION", "Rail is missing a Trigger node")
    }
    const tasks = nodes.filter((n) => n.type === "task")
    if (tasks.length === 0) {
      throw new ActionError("VALIDATION", "Rail must have at least one Task")
    }
    // Every rail must terminate at an End node. Runs without one fall off
    // the conveyor belt (last task completes → run auto-completes by
    // implicit terminator), but the spec requires an explicit End so the
    // canvas reads as a complete graph.
    if (!nodes.some((n) => n.type === "end")) {
      throw new ActionError(
        "VALIDATION",
        "Rail needs an End node — drag one from the palette and place it after the last Task.",
      )
    }
    // Block publishing rails that reference node types whose runtime hasn't
    // shipped yet — would produce a "Unsupported node type at runtime" error
    // mid-run otherwise.
    const unsupported = nodes.find((n) => !["trigger", "task", "end"].includes(n.type))
    if (unsupported) {
      throw new ActionError(
        "VALIDATION",
        `Node "${unsupported.name}" uses type "${unsupported.type}" which doesn't have a runtime yet — remove it before publishing.`,
      )
    }
    const missingPost = tasks.find((t) => !t.postId)
    if (missingPost) {
      throw new ActionError(
        "VALIDATION",
        `Task "${missingPost.name}" has no Post assigned. Every Task needs a Terminal.`,
      )
    }
    // Verify referenced posts are still alive.
    const postIds = tasks.map((t) => t.postId).filter((p): p is string => Boolean(p))
    const livePosts = await ctx.db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          inArray(posts.id, postIds),
          eq(posts.organizationId, ctx.activeOrg.id),
          isNull(posts.deletedAt),
        ),
      )
    if (livePosts.length !== new Set(postIds).size) {
      throw new ActionError("VALIDATION", "One or more assigned Posts no longer exist")
    }
    await ctx.db
      .update(rails)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .where(eq(rails.id, rail.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.published",
      { resourceType: "rail", resourceId: rail.id, metadata: { taskCount: tasks.length } },
    )
    revalidatePath(RAILS_PATH)
    revalidatePath(`${RAILS_PATH}/${rail.id}`)
    return { id: rail.id }
  })

export const unpublishRail = orgAction
  .metadata({ actionName: "rails.unpublish" })
  .inputSchema(unpublishRailInput)
  .action(async ({ parsedInput, ctx }) => {
    const rail = await loadRail(ctx, parsedInput.id)
    if (rail.status !== "published") {
      throw new ActionError("VALIDATION", "Rail is not published")
    }
    await ctx.db
      .update(rails)
      .set({
        status: "draft",
        publishedAt: null,
        updatedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .where(eq(rails.id, rail.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.unpublished",
      { resourceType: "rail", resourceId: rail.id },
    )
    revalidatePath(RAILS_PATH)
    revalidatePath(`${RAILS_PATH}/${rail.id}`)
    return { id: rail.id }
  })

/**
 * Push the rail's CURRENT node definitions onto every still-open cycle in
 * every still-running rail_run for that rail. Used after editing a published
 * rail when the user wants the change to apply to in-progress work too
 * (e.g., a new policy step added mid-flight).
 *
 * What gets re-snapshotted, per cycle:
 *   - title, description from the matching rail_node
 *   - checklist: structurally re-snapshotted, but `checked` / `checkedAt` /
 *     `checkedBy` are preserved for items whose `id` survives (so progress
 *     isn't wiped by an unrelated edit)
 *   - tools_links — full replace
 *   - ideal_minutes — replace
 *   - post_id — replace (the cycle re-routes to the new Terminal)
 *
 * What does NOT change:
 *   - position — structural, locked at issue
 *   - the cycle's own runtime fields (issuedAt, timer state, completedAt, etc)
 *   - cycles whose rail_node has been deleted (orphaned; left alone for the
 *     worker to finish under the original terms)
 *   - completed / cancelled cycles — they're done
 */
export const pushRailUpdateToCycles = orgAction
  .metadata({ actionName: "rails.push_update_to_cycles" })
  .inputSchema(pushRailUpdateToCyclesInput)
  .action(async ({ parsedInput, ctx }) => {
    const rail = await loadRail(ctx, parsedInput.railId)
    const nodes = await ctx.db
      .select()
      .from(railNodes)
      .where(and(eq(railNodes.railId, rail.id), isNull(railNodes.deletedAt)))
    const nodeById = new Map(nodes.map((n) => [n.id, n]))

    const { railRuns } = await import("@/modules/rail-runs/schema")
    const cyclesToUpdate = await ctx.db
      .select({
        id: cycles.id,
        railNodeId: cycles.railNodeId,
        checklistItems: cycles.checklistItems,
      })
      .from(cycles)
      .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
      .where(
        and(
          eq(cycles.organizationId, ctx.activeOrg.id),
          eq(railRuns.railId, rail.id),
          eq(railRuns.status, "running"),
          isNull(cycles.completedAt),
          isNull(cycles.cancelledAt),
          isNull(cycles.deletedAt),
          isNull(railRuns.deletedAt),
        ),
      )

    let updated = 0
    let skipped = 0
    const now = new Date()
    for (const c of cyclesToUpdate) {
      const node = nodeById.get(c.railNodeId)
      if (!node) {
        skipped += 1
        continue
      }
      // Merge checklist: preserve checked-state for items whose id survives.
      const previous = new Map(c.checklistItems.map((i) => [i.id, i]))
      const mergedChecklist: CycleChecklistItem[] = node.checklistItems
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((item) => {
          const prev = previous.get(item.id)
          return {
            id: item.id,
            label: item.label,
            required: item.required,
            position: item.position,
            checked: prev?.checked ?? false,
            checkedAt: prev?.checkedAt ?? null,
            checkedBy: prev?.checkedBy ?? null,
          }
        })

      await ctx.db
        .update(cycles)
        .set({
          title: node.name,
          description: node.description,
          checklistItems: mergedChecklist,
          toolsLinks: node.toolsLinks.slice().sort((a, b) => a.position - b.position),
          idealMinutes: node.idealMinutes,
          postId: node.postId ?? c.railNodeId, // keep something non-null; if a node has no post, leave the cycle's previous routing in place
          updatedAt: now,
        })
        .where(eq(cycles.id, c.id))
      updated += 1
    }

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rails.update_pushed_to_cycles",
      {
        resourceType: "rail",
        resourceId: rail.id,
        metadata: { updated, skipped },
      },
    )
    revalidatePath(RAILS_PATH)
    revalidatePath(`${RAILS_PATH}/${rail.id}`)
    revalidatePath("/my-actions")
    return { updated, skipped }
  })
