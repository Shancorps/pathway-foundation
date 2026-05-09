import { z } from "zod"

export const startRailInput = z.object({
  railId: z.string(),
  particleId: z.string(),
})

export const cancelRailRunInput = z.object({
  runId: z.string(),
  reason: z.string().max(2000).optional(),
})

// Loop Back: send a flagged duplicate of the previous step back to its Post.
// The reason is mandatory — accountability through UI per spec Principle 7.
export const loopBackCycleInput = z.object({
  cycleId: z.string(),
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

export const startCycleTimerInput = z.object({
  cycleId: z.string(),
})

export const stopCycleTimerInput = z.object({
  cycleId: z.string(),
})

export type StartRailInput = z.infer<typeof startRailInput>
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemInput>
