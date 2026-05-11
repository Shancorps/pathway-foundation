import { z } from "zod"

export const startRailInput = z.object({
  railId: z.string(),
  particleId: z.string(),
  // Set when the rail has an Initialize node — the operator's pre-flight
  // answers. `postHolderAssignments` is Record<postId, userId> covering every
  // multi-holder Post on the rail. `manifestData` is Record<manifestId,
  // Record<fieldSlug, value>> covering every field the Initialize node
  // declared as required-at-start. The action validates both and writes them
  // into rail_runs.post_holder_assignments and rail_run_manifests.data inside
  // the same start transaction.
  initializeData: z
    .object({
      postHolderAssignments: z.record(z.string(), z.string()),
      manifestData: z.record(z.string(), z.record(z.string(), z.unknown())),
    })
    .optional(),
})

export const cancelRailRunInput = z.object({
  runId: z.string(),
  reason: z.string().max(2000).optional(),
})

// Loop Back: originator picks any prior step in the run as the target, gives
// a mandatory written reason, and the system snapshots the target into a new
// re-do cycle. The originator's cycle stays open with an "Active Loop Back"
// tag and is blocked from completion until the re-do closes.
export const loopBackCycleInput = z.object({
  cycleId: z.string(),
  targetCycleId: z.string(),
  reason: z.string().min(1).max(2000),
})

export const updateChecklistItemInput = z.object({
  cycleId: z.string(),
  itemId: z.string(),
  checked: z.boolean(),
})

export const cycleIdInput = z.object({
  cycleId: z.string(),
})

export const completeCycleInput = z.object({
  cycleId: z.string(),
})

/**
 * Reject an Approval cycle. Reason is optional unless the source rail_node's
 * config.mode === "with_reason" — server validates that against the node.
 */
export const rejectApprovalCycleInput = z.object({
  cycleId: z.string(),
  reason: z.string().max(2000).optional(),
})

export const startCycleTimerInput = z.object({
  cycleId: z.string(),
})

export const stopCycleTimerInput = z.object({
  cycleId: z.string(),
})

export type StartRailInput = z.infer<typeof startRailInput>
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemInput>
