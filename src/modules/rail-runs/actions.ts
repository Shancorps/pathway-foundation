"use server"

import { revalidatePath } from "next/cache"
import { and, asc, eq, gt, isNull, lt } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { ActionError, orgAction } from "@/lib/safe-action"
import { audit } from "@/modules/audit/audit"
import { user } from "@/modules/auth/schema"
import { postAssignments, posts } from "@/modules/org-structure/schema"
import { particles } from "@/modules/particles/schema"
import { railNodes, rails } from "@/modules/rails/schema"
import { cycles, railRuns, type Cycle, type CycleChecklistItem } from "./schema"
import {
  cancelRailRunInput,
  completeCycleInput,
  loopBackCycleInput,
  startCycleTimerInput,
  startRailInput,
  stopCycleTimerInput,
  updateChecklistItemInput,
} from "./types"

const MY_ACTIONS_PATH = "/my-actions"
const RAILS_PATH = "/rails"

type Ctx = Parameters<Parameters<typeof orgAction.action>[0]>[0]["ctx"]

/** Loads a cycle and validates the current user holds its Post (i.e. it's in their inbox). */
async function loadCycleForUser(ctx: Ctx, cycleId: string): Promise<Cycle> {
  const [row] = await ctx.db
    .select({ cycle: cycles })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .where(
      and(
        eq(cycles.id, cycleId),
        eq(cycles.organizationId, ctx.activeOrg.id),
        eq(postAssignments.userId, ctx.session.user.id),
        isNull(cycles.deletedAt),
      ),
    )
    .limit(1)
  if (!row) {
    throw new ActionError("FORBIDDEN", "Cycle is not in your inbox")
  }
  if (row.cycle.completedAt || row.cycle.cancelledAt) {
    throw new ActionError("CONFLICT", "Cycle is already closed")
  }
  return row.cycle
}

/**
 * Snapshot a rail_node into the runtime shape used for new cycles. Checklist
 * items are copied with `checked: false` and timestamps null.
 */
function snapshotChecklist(
  source: { id: string; label: string; required: boolean; position: number }[],
): CycleChecklistItem[] {
  return source
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      label: item.label,
      required: item.required,
      position: item.position,
      checked: false,
      checkedAt: null,
      checkedBy: null,
    }))
}

async function findFirstTaskNode(ctx: Ctx, railId: string) {
  const [row] = await ctx.db
    .select()
    .from(railNodes)
    .where(
      and(
        eq(railNodes.railId, railId),
        eq(railNodes.organizationId, ctx.activeOrg.id),
        eq(railNodes.type, "task"),
        isNull(railNodes.deletedAt),
      ),
    )
    .orderBy(asc(railNodes.position))
    .limit(1)
  return row ?? null
}

/**
 * Find the next node in the rail after the given position, regardless of
 * type. completeCycle inspects the node's type to decide whether to issue a
 * cycle (task/approval/statistic-enter) or to auto-resolve (end / sub-flow /
 * statistic-count / statistic-manifest).
 */
async function findNextNode(ctx: Ctx, railId: string, afterPosition: number) {
  const [row] = await ctx.db
    .select()
    .from(railNodes)
    .where(
      and(
        eq(railNodes.railId, railId),
        eq(railNodes.organizationId, ctx.activeOrg.id),
        gt(railNodes.position, afterPosition),
        isNull(railNodes.deletedAt),
      ),
    )
    .orderBy(asc(railNodes.position))
    .limit(1)
  return row ?? null
}

interface AdvanceResult {
  nextCycleId: string | null
  runFinished: boolean
  endReached: boolean
  childRunId: string | null
}

/**
 * Mark a rail_run as completed and, if it was a child of a parent rail_run
 * waiting on a Sub-Flow, advance the parent past its Sub-Flow node.
 */
async function completeRun(
  ctx: Ctx,
  run: typeof railRuns.$inferSelect,
  endReached: boolean,
): Promise<void> {
  const now = new Date()
  await ctx.db
    .update(railRuns)
    .set({
      status: "completed",
      completedAt: now,
      completedBy: ctx.session.user.id,
      updatedAt: now,
    })
    .where(eq(railRuns.id, run.id))
  // If a parent run is waiting on this child via a Sub-Flow, advance it.
  void endReached
  if (run.parentRunId && run.parentAtNodeId) {
    const [parentRun] = await ctx.db
      .select()
      .from(railRuns)
      .where(
        and(
          eq(railRuns.id, run.parentRunId),
          eq(railRuns.organizationId, ctx.activeOrg.id),
          isNull(railRuns.deletedAt),
        ),
      )
      .limit(1)
    if (parentRun?.status === "running") {
      const [parentNode] = await ctx.db
        .select()
        .from(railNodes)
        .where(eq(railNodes.id, run.parentAtNodeId))
        .limit(1)
      if (parentNode) {
        await advanceRun(ctx, parentRun, parentNode.position)
      }
    }
  }
}

/**
 * Advance a rail_run past the given position. Returns what happened: a new
 * cycle issued, the run finished, or a child run started. Recurses through
 * structural nodes (End, Sub-Flow with no-wait) until a cycle-issuing node
 * is reached or the run terminates.
 */
async function advanceRun(
  ctx: Ctx,
  run: typeof railRuns.$inferSelect,
  fromPosition: number,
): Promise<AdvanceResult> {
  const next = await findNextNode(ctx, run.railId, fromPosition)
  if (!next) {
    await completeRun(ctx, run, false)
    return { nextCycleId: null, runFinished: true, endReached: false, childRunId: null }
  }
  if (next.type === "end") {
    await completeRun(ctx, run, true)
    return { nextCycleId: null, runFinished: true, endReached: true, childRunId: null }
  }
  if (next.type === "task") {
    const cycleId = await issueCycleForNode(ctx, run.id, next)
    return { nextCycleId: cycleId, runFinished: false, endReached: false, childRunId: null }
  }
  if (next.type === "sub_flow") {
    return await fireSubFlow(ctx, run, next)
  }
  throw new ActionError("VALIDATION", `Unsupported node type at runtime: ${next.type}`)
}

/**
 * Reach a Sub-Flow node: spin up a child run on the configured target rail,
 * link parentRunId + parentAtNodeId, and either pause (waitForCompletion) or
 * keep advancing the parent.
 */
async function fireSubFlow(
  ctx: Ctx,
  parentRun: typeof railRuns.$inferSelect,
  subFlowNode: typeof railNodes.$inferSelect,
): Promise<AdvanceResult> {
  if (subFlowNode.config.kind !== "sub_flow" || !subFlowNode.config.targetRailId) {
    throw new ActionError(
      "VALIDATION",
      `Sub-Flow "${subFlowNode.name}" has no target rail configured.`,
    )
  }
  const targetRailId = subFlowNode.config.targetRailId
  const [targetRail] = await ctx.db
    .select()
    .from(rails)
    .where(
      and(
        eq(rails.id, targetRailId),
        eq(rails.organizationId, ctx.activeOrg.id),
        isNull(rails.deletedAt),
      ),
    )
    .limit(1)
  if (!targetRail) {
    throw new ActionError("VALIDATION", `Sub-Flow target rail no longer exists.`)
  }
  if (targetRail.status !== "published") {
    throw new ActionError(
      "VALIDATION",
      `Sub-Flow target rail "${targetRail.name}" is not published.`,
    )
  }
  const childFirst = await findFirstTaskNode(ctx, targetRail.id)
  if (!childFirst) {
    throw new ActionError("VALIDATION", `Sub-Flow target rail has no Task node to start at.`)
  }

  const childRunId = createId()
  await ctx.db.insert(railRuns).values({
    id: childRunId,
    organizationId: ctx.activeOrg.id,
    railId: targetRail.id,
    particleId: parentRun.particleId,
    status: "running",
    startedBy: ctx.session.user.id,
    parentRunId: parentRun.id,
    parentAtNodeId: subFlowNode.id,
  })
  await issueCycleForNode(ctx, childRunId, childFirst)

  if (subFlowNode.config.waitForCompletion) {
    // Parent pauses here. No cycle for parent until child reaches End and
    // completeRun resumes us.
    return { nextCycleId: null, runFinished: false, endReached: false, childRunId }
  }
  // Fire-and-forget: keep advancing parent past the sub-flow.
  const downstream = await advanceRun(ctx, parentRun, subFlowNode.position)
  return { ...downstream, childRunId }
}

async function issueCycleForNode(
  ctx: Ctx,
  runId: string,
  node: typeof railNodes.$inferSelect,
): Promise<string> {
  if (!node.postId) {
    throw new ActionError(
      "VALIDATION",
      `Task "${node.name}" has no Post assigned. Republish the rail with a Terminal.`,
    )
  }
  // Ensure the assigned Post still exists (not soft-deleted).
  const [post] = await ctx.db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.id, node.postId),
        eq(posts.organizationId, ctx.activeOrg.id),
        isNull(posts.deletedAt),
      ),
    )
    .limit(1)
  if (!post) {
    throw new ActionError(
      "VALIDATION",
      `Terminal for task "${node.name}" no longer exists. Cannot route the Particle.`,
    )
  }
  const cycleId = createId()
  await ctx.db.insert(cycles).values({
    id: cycleId,
    organizationId: ctx.activeOrg.id,
    railRunId: runId,
    railNodeId: node.id,
    postId: node.postId,
    title: node.name,
    description: node.description,
    checklistItems: snapshotChecklist(node.checklistItems),
    toolsLinks: snapshotToolsLinks(node.toolsLinks),
    idealMinutes: node.idealMinutes,
    position: node.position,
  })
  return cycleId
}

/**
 * Copy a rail_node's tools_links onto a Cycle. Frozen at issue time so
 * editing the rail later doesn't mutate live work.
 */
function snapshotToolsLinks(
  source: { id: string; label: string; url: string; position: number }[],
): { id: string; label: string; url: string; position: number }[] {
  return source
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      label: item.label,
      url: item.url,
      position: item.position,
    }))
}

export const startRail = orgAction
  .metadata({ actionName: "rail_runs.start" })
  .inputSchema(startRailInput)
  .action(async ({ parsedInput, ctx }) => {
    // Validate the rail: must be published.
    const [rail] = await ctx.db
      .select()
      .from(rails)
      .where(
        and(
          eq(rails.id, parsedInput.railId),
          eq(rails.organizationId, ctx.activeOrg.id),
          isNull(rails.deletedAt),
        ),
      )
      .limit(1)
    if (!rail) throw new ActionError("NOT_FOUND", "Rail not found")
    if (rail.status !== "published") {
      throw new ActionError("VALIDATION", "Only published rails can be started")
    }

    // Validate the particle: must exist and match the rail's particle type
    // (Principle 0 — runtime binding).
    const [particle] = await ctx.db
      .select()
      .from(particles)
      .where(
        and(
          eq(particles.id, parsedInput.particleId),
          eq(particles.organizationId, ctx.activeOrg.id),
          isNull(particles.deletedAt),
        ),
      )
      .limit(1)
    if (!particle) throw new ActionError("NOT_FOUND", "Particle not found")
    if (particle.particleTypeId !== rail.particleTypeId) {
      throw new ActionError(
        "VALIDATION",
        "Particle type doesn't match this rail. A rail only operates on its declared Particle Type.",
      )
    }

    // Find the first Task (skip the trigger).
    const firstTask = await findFirstTaskNode(ctx, rail.id)
    if (!firstTask) {
      throw new ActionError("VALIDATION", "Rail has no Task nodes — nothing to start")
    }

    const runId = createId()
    await ctx.db.insert(railRuns).values({
      id: runId,
      organizationId: ctx.activeOrg.id,
      railId: rail.id,
      particleId: particle.id,
      status: "running",
      startedBy: ctx.session.user.id,
    })
    const cycleId = await issueCycleForNode(ctx, runId, firstTask)

    // Look up the Post + its current holders so the UI can tell the actor where
    // the first cycle went. Without this they wouldn't know which sign-in to test.
    const [firstPost] = await ctx.db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      // firstTask.postId is guaranteed non-null by issueCycleForNode's checks above
      .where(eq(posts.id, firstTask.postId ?? ""))
      .limit(1)
    const holders = firstTask.postId
      ? await ctx.db
          .select({ userId: postAssignments.userId, userName: user.name })
          .from(postAssignments)
          .innerJoin(user, eq(user.id, postAssignments.userId))
          .where(eq(postAssignments.postId, firstTask.postId))
      : []

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rail_runs.started",
      {
        resourceType: "rail_run",
        resourceId: runId,
        metadata: { railId: rail.id, particleId: particle.id, firstCycleId: cycleId },
      },
    )
    revalidatePath(MY_ACTIONS_PATH)
    revalidatePath(RAILS_PATH)
    return {
      runId,
      cycleId,
      firstPostTitle: firstPost?.title ?? null,
      firstPostHolders: holders.map((h) => h.userName),
    }
  })

export const updateChecklistItem = orgAction
  .metadata({ actionName: "rail_runs.update_checklist_item" })
  .inputSchema(updateChecklistItemInput)
  .action(async ({ parsedInput, ctx }) => {
    const cycle = await loadCycleForUser(ctx, parsedInput.cycleId)
    const idx = cycle.checklistItems.findIndex((i) => i.id === parsedInput.itemId)
    if (idx === -1) throw new ActionError("NOT_FOUND", "Checklist item not found")
    const next = cycle.checklistItems.map((item, i) =>
      i === idx
        ? {
            ...item,
            checked: parsedInput.checked,
            checkedAt: parsedInput.checked ? new Date().toISOString() : null,
            checkedBy: parsedInput.checked ? ctx.session.user.id : null,
          }
        : item,
    )
    await ctx.db
      .update(cycles)
      .set({ checklistItems: next, updatedAt: new Date() })
      .where(eq(cycles.id, cycle.id))
    revalidatePath(`${MY_ACTIONS_PATH}/${cycle.id}`)
    revalidatePath(MY_ACTIONS_PATH)
    return { id: cycle.id }
  })

export const startCycleTimer = orgAction
  .metadata({ actionName: "rail_runs.start_timer" })
  .inputSchema(startCycleTimerInput)
  .action(async ({ parsedInput, ctx }) => {
    const cycle = await loadCycleForUser(ctx, parsedInput.cycleId)
    if (cycle.timerStartedAt) {
      // Idempotent — return without churn.
      return { id: cycle.id, alreadyRunning: true }
    }
    await ctx.db
      .update(cycles)
      .set({
        timerStartedAt: new Date(),
        timerStartedBy: ctx.session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(cycles.id, cycle.id))
    revalidatePath(`${MY_ACTIONS_PATH}/${cycle.id}`)
    return { id: cycle.id }
  })

export const stopCycleTimer = orgAction
  .metadata({ actionName: "rail_runs.stop_timer" })
  .inputSchema(stopCycleTimerInput)
  .action(async ({ parsedInput, ctx }) => {
    const cycle = await loadCycleForUser(ctx, parsedInput.cycleId)
    if (!cycle.timerStartedAt) {
      return { id: cycle.id, alreadyStopped: true }
    }
    const elapsedMs = Date.now() - cycle.timerStartedAt.getTime()
    const elapsedMinutes = Math.max(0, Math.round(elapsedMs / 60000))
    await ctx.db
      .update(cycles)
      .set({
        timerStartedAt: null,
        timerStartedBy: null,
        timeSpentMinutes: cycle.timeSpentMinutes + elapsedMinutes,
        updatedAt: new Date(),
      })
      .where(eq(cycles.id, cycle.id))
    revalidatePath(`${MY_ACTIONS_PATH}/${cycle.id}`)
    return { id: cycle.id, addedMinutes: elapsedMinutes }
  })

/**
 * THE CONVEYOR-BELT TRANSITION. Validates required checklist items are checked,
 * stops any running timer, marks the cycle complete, and issues the next
 * cycle (if any) for the next Task in the rail. If there are no more tasks,
 * the rail run is marked complete.
 */
export const completeCycle = orgAction
  .metadata({ actionName: "rail_runs.complete_cycle" })
  .inputSchema(completeCycleInput)
  .action(async ({ parsedInput, ctx }) => {
    const cycle = await loadCycleForUser(ctx, parsedInput.cycleId)

    // Validate all required items are checked.
    const missing = cycle.checklistItems.find((i) => i.required && !i.checked)
    if (missing) {
      throw new ActionError("VALIDATION", `Required item "${missing.label}" is unchecked`)
    }

    // Block while a loop-back originated from this cycle is still open. The
    // originator must wait for the upstream re-do to close before they can
    // advance — otherwise the rail moves on with an orphaned re-do request.
    if (!cycle.loopBackOfCycleId) {
      const [activeLoopBack] = await ctx.db
        .select({ id: cycles.id })
        .from(cycles)
        .where(
          and(
            eq(cycles.organizationId, ctx.activeOrg.id),
            eq(cycles.loopBackInitiatedFromCycleId, cycle.id),
            isNull(cycles.completedAt),
            isNull(cycles.cancelledAt),
            isNull(cycles.deletedAt),
          ),
        )
        .limit(1)
      if (activeLoopBack) {
        throw new ActionError(
          "CONFLICT",
          "An active loop-back is still open. Wait for it to close before completing.",
        )
      }
    }

    // Stop the timer if running so accumulated time is correct.
    let timeSpentMinutes = cycle.timeSpentMinutes
    if (cycle.timerStartedAt) {
      const elapsedMs = Date.now() - cycle.timerStartedAt.getTime()
      timeSpentMinutes += Math.max(0, Math.round(elapsedMs / 60000))
    }

    await ctx.db
      .update(cycles)
      .set({
        completedAt: new Date(),
        completedBy: ctx.session.user.id,
        timerStartedAt: null,
        timerStartedBy: null,
        timeSpentMinutes,
        updatedAt: new Date(),
      })
      .where(eq(cycles.id, cycle.id))

    // Loop-back cycles are re-dos — they don't advance the rail. The original
    // cycle is still open in the looper-backer's inbox. Skip successor logic.
    if (cycle.loopBackOfCycleId) {
      await audit(
        {
          db: ctx.db,
          organizationId: ctx.activeOrg.id,
          actorUserId: ctx.session.user.id,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        "rail_runs.loop_back_completed",
        {
          resourceType: "cycle",
          resourceId: cycle.id,
          metadata: {
            originCycleId: cycle.loopBackOfCycleId,
            timeSpentMinutes,
          },
        },
      )
      revalidatePath(MY_ACTIONS_PATH)
      revalidatePath(`${MY_ACTIONS_PATH}/${cycle.id}`)
      return { id: cycle.id, nextCycleId: null, runFinished: false, loopBack: true }
    }

    // Find the run and the next node. If no next node, the run is finished.
    const [run] = await ctx.db
      .select()
      .from(railRuns)
      .where(eq(railRuns.id, cycle.railRunId))
      .limit(1)
    if (!run) {
      // Shouldn't happen given FK + load check above, but guard anyway.
      throw new ActionError("NOT_FOUND", "Rail run not found")
    }
    // Hand off to the generalized advance logic — handles End, Sub-Flow
    // (with parent-resume on child completion), and Task. Future types
    // plug into advanceRun's switch.
    const advance = await advanceRun(ctx, run, cycle.position)
    const nextCycleId = advance.nextCycleId
    const runFinished = advance.runFinished
    const endReached = advance.endReached
    const childRunId = advance.childRunId

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rail_runs.cycle_completed",
      {
        resourceType: "cycle",
        resourceId: cycle.id,
        metadata: {
          runId: run.id,
          nextCycleId,
          runFinished,
          endReached,
          childRunId,
          timeSpentMinutes,
        },
      },
    )
    revalidatePath(MY_ACTIONS_PATH)
    revalidatePath(`${MY_ACTIONS_PATH}/${cycle.id}`)
    return { id: cycle.id, nextCycleId, runFinished }
  })

/**
 * Loop Back: the holder of an open cycle picks an earlier step in the run
 * (any prior non-loop-back cycle) and returns the Particle there with a
 * written reason. We snapshot the target's title / description / checklist
 * (reset to unchecked) / tools / ideal minutes / post / position into a new
 * cycle flagged with loop_back_of_cycle_id (the snapshot source) and
 * loop_back_initiated_from_cycle_id (the originator's cycle).
 *
 * The originator's cycle stays open in their inbox tagged "Active Loop Back"
 * and is blocked from completion until the re-do closes (see `completeCycle`).
 * Completing the re-do cycle does NOT advance the rail.
 *
 * The target must be a non-loop-back cycle, so chains of loop-backs always
 * route to the original step rather than re-doing a re-do.
 */
export const loopBackCycle = orgAction
  .metadata({ actionName: "rail_runs.loop_back" })
  .inputSchema(loopBackCycleInput)
  .action(async ({ parsedInput, ctx }) => {
    const cycle = await loadCycleForUser(ctx, parsedInput.cycleId)
    if (cycle.loopBackOfCycleId) {
      throw new ActionError(
        "VALIDATION",
        "This cycle is itself a loop-back. Complete the re-do instead.",
      )
    }

    // Block stacking — one active loop-back per originator cycle. The
    // originator must wait for the prior re-do to close before sending another.
    const [outstanding] = await ctx.db
      .select({ id: cycles.id })
      .from(cycles)
      .where(
        and(
          eq(cycles.organizationId, ctx.activeOrg.id),
          eq(cycles.loopBackInitiatedFromCycleId, cycle.id),
          isNull(cycles.completedAt),
          isNull(cycles.cancelledAt),
          isNull(cycles.deletedAt),
        ),
      )
      .limit(1)
    if (outstanding) {
      throw new ActionError(
        "CONFLICT",
        "You already have an active loop-back from this cycle. Wait for it to close.",
      )
    }

    // Validate the target: same run, earlier position, non-loop-back, alive.
    const [target] = await ctx.db
      .select()
      .from(cycles)
      .where(
        and(
          eq(cycles.id, parsedInput.targetCycleId),
          eq(cycles.organizationId, ctx.activeOrg.id),
          eq(cycles.railRunId, cycle.railRunId),
          lt(cycles.position, cycle.position),
          isNull(cycles.loopBackOfCycleId),
          isNull(cycles.deletedAt),
        ),
      )
      .limit(1)
    if (!target) {
      throw new ActionError(
        "VALIDATION",
        "Selected step isn't a valid loop-back target in this run.",
      )
    }

    // Ensure the target step's Post still exists (not soft-deleted). If the
    // Terminal was retired we can't route the re-do anywhere.
    const [targetPost] = await ctx.db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.id, target.postId),
          eq(posts.organizationId, ctx.activeOrg.id),
          isNull(posts.deletedAt),
        ),
      )
      .limit(1)
    if (!targetPost) {
      throw new ActionError(
        "VALIDATION",
        "The Terminal for that step no longer exists. Cannot route the loop-back.",
      )
    }

    const newCycleId = createId()
    await ctx.db.insert(cycles).values({
      id: newCycleId,
      organizationId: ctx.activeOrg.id,
      railRunId: target.railRunId,
      railNodeId: target.railNodeId,
      postId: target.postId,
      title: target.title,
      description: target.description,
      checklistItems: target.checklistItems.map((item) => ({
        ...item,
        checked: false,
        checkedAt: null,
        checkedBy: null,
      })),
      toolsLinks: target.toolsLinks,
      idealMinutes: target.idealMinutes,
      position: target.position,
      loopBackOfCycleId: target.id,
      loopBackReason: parsedInput.reason,
      loopBackInitiatedBy: ctx.session.user.id,
      loopBackInitiatedFromCycleId: cycle.id,
    })

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "rail_runs.looped_back",
      {
        resourceType: "cycle",
        resourceId: newCycleId,
        metadata: {
          fromCycleId: cycle.id,
          targetCycleId: target.id,
          targetPosition: target.position,
          runId: cycle.railRunId,
          reason: parsedInput.reason,
        },
      },
    )
    revalidatePath(MY_ACTIONS_PATH)
    revalidatePath(`${MY_ACTIONS_PATH}/${cycle.id}`)
    return { id: newCycleId, targetCycleId: target.id }
  })

export const cancelRailRun = orgAction
  .metadata({ actionName: "rail_runs.cancel" })
  .inputSchema(cancelRailRunInput)
  .action(async ({ parsedInput, ctx }) => {
    const [run] = await ctx.db
      .select()
      .from(railRuns)
      .where(
        and(
          eq(railRuns.id, parsedInput.runId),
          eq(railRuns.organizationId, ctx.activeOrg.id),
          isNull(railRuns.deletedAt),
        ),
      )
      .limit(1)
    if (!run) throw new ActionError("NOT_FOUND", "Rail run not found")
    if (run.status !== "running") {
      throw new ActionError("CONFLICT", "Run is not running")
    }
    const now = new Date()
    // Cancel the run and any open cycles inside it in one go.
    await ctx.db
      .update(railRuns)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancelledBy: ctx.session.user.id,
        cancellationReason: parsedInput.reason,
        updatedAt: now,
      })
      .where(eq(railRuns.id, run.id))
    await ctx.db
      .update(cycles)
      .set({
        cancelledAt: now,
        cancelledBy: ctx.session.user.id,
        timerStartedAt: null,
        timerStartedBy: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(cycles.railRunId, run.id),
          isNull(cycles.completedAt),
          isNull(cycles.cancelledAt),
          isNull(cycles.deletedAt),
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
      "rail_runs.cancelled",
      {
        resourceType: "rail_run",
        resourceId: run.id,
        metadata: { reason: parsedInput.reason },
      },
    )
    revalidatePath(MY_ACTIONS_PATH)
    return { id: run.id }
  })
