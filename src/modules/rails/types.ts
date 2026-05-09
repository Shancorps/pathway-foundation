import { z } from "zod"

// A checklist item submitted from the form. `id` is optional on input — the
// action assigns one for new items; existing items keep theirs so per-item
// runtime state can survive an edit.
export const checklistItemInput = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(500),
  required: z.boolean(),
})

// SOP/Tool deep-link submitted from the form. Same id-preservation rule as
// checklist items. URL must be a valid http(s) URL.
export const toolsLinkInput = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(200),
  url: z.url().max(2000),
})

export const createRailInput = z.object({
  particleTypeId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
})

export const updateRailInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
})

export const deleteRailInput = z.object({ id: z.string() })
export const restoreRailInput = z.object({ id: z.string() })
export const publishRailInput = z.object({ id: z.string() })
export const unpublishRailInput = z.object({ id: z.string() })
export const pushRailUpdateToCyclesInput = z.object({ railId: z.string() })

export const addTaskNodeInput = z.object({
  railId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  postId: z.string(),
  checklistItems: z.array(checklistItemInput).optional(),
  toolsLinks: z.array(toolsLinkInput).optional(),
  idealMinutes: z.number().int().positive().optional(),
})

/**
 * Add a structural node (End / Sub-Flow today; Approval as that type ships).
 * Auto-resolving nodes don't take a Post. Defaults name from the type.
 */
export const addStructuralNodeInput = z.object({
  railId: z.string(),
  type: z.enum(["end", "sub_flow"]),
  name: z.string().min(1).max(200).optional(),
})

/** Edit a Sub-Flow node's target rail + wait toggle. */
export const updateSubFlowConfigInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  targetRailId: z.string().nullable(),
  waitForCompletion: z.boolean(),
})

export const updateNodeInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  postId: z.string().nullable().optional(),
  checklistItems: z.array(checklistItemInput).optional(),
  toolsLinks: z.array(toolsLinkInput).optional(),
  idealMinutes: z.number().int().positive().nullable().optional(),
})

export const deleteNodeInput = z.object({ id: z.string() })

export const reorderNodesInput = z.object({
  railId: z.string(),
  nodeIdsInOrder: z.array(z.string()).min(1),
})

export type CreateRailInput = z.infer<typeof createRailInput>
export type AddTaskNodeInput = z.infer<typeof addTaskNodeInput>
