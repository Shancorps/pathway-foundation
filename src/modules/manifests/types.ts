import { z } from "zod"
import { kernelFieldTypes } from "@/lib/field-types"

const fieldDefBase = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  type: z.enum(kernelFieldTypes),
  position: z.number().int().nonnegative(),
  required: z.boolean(),
  readOnly: z.boolean(),
  helpText: z.string().max(500).optional(),
  placeholder: z.string().max(200).optional(),
  defaultValue: z.string().max(2000).optional(),
  options: z.array(z.string().min(1).max(200)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string().min(3).max(8).optional(),
  fileMultiple: z.boolean().optional(),
  particleTypeIds: z.array(z.string()).optional(),
})

export const manifestFieldDefSchema = fieldDefBase

export const createManifestInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
})

export const updateManifestInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  fields: z.array(manifestFieldDefSchema).optional(),
})

export const deleteManifestInput = z.object({ id: z.string() })

export const attachManifestInput = z.object({
  railId: z.string(),
  manifestId: z.string(),
})

export const detachManifestInput = z.object({
  railId: z.string(),
  manifestId: z.string(),
})

export const reorderRailManifestsInput = z.object({
  railId: z.string(),
  manifestIds: z.array(z.string()).min(1),
})

export const updateRunManifestDataInput = z.object({
  railRunId: z.string(),
  manifestId: z.string(),
  data: z.record(z.string(), z.unknown()),
})

export const setRequiredFieldsInput = z.object({
  railNodeId: z.string(),
  required: z.array(z.object({ manifestId: z.string(), fieldSlug: z.string().min(1).max(80) })),
})

export type CreateManifestInput = z.infer<typeof createManifestInput>
export type UpdateManifestInput = z.infer<typeof updateManifestInput>
export type AttachManifestInput = z.infer<typeof attachManifestInput>
export type UpdateRunManifestDataInput = z.infer<typeof updateRunManifestDataInput>
