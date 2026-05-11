import { z } from "zod"
import { kernelFieldTypes } from "@/lib/field-types"

const fieldKey = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z][a-z0-9_]*$/, "Field key must be snake_case (lowercase, underscores, digits)")

const fieldDefBase = z
  .object({
    key: fieldKey,
    label: z.string().min(1).max(200),
    type: z.enum(kernelFieldTypes),
    position: z.number().int().nonnegative(),
    required: z.boolean(),
    readOnly: z.boolean(),
    helpText: z.string().max(500).optional(),
    placeholder: z.string().max(200).optional(),
    defaultValue: z.string().max(2000).optional(),
    options: z.array(z.string().min(1).max(200)).optional(),
    // Zod 4 excludes ±Infinity / NaN from z.number() by default.
    min: z.number().optional(),
    max: z.number().optional(),
    // ISO-4217 codes are 3 chars; we allow up to 8 to leave room for custom labels like "USD-cash".
    currency: z.string().min(3).max(8).optional(),
    fileMultiple: z.boolean().optional(),
    particleTypeIds: z.array(z.string()).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.min !== undefined && val.max !== undefined && val.min > val.max) {
      ctx.addIssue({
        code: "custom",
        path: ["max"],
        message: "max must be >= min",
      })
    }
  })

export const manifestFieldDefSchema = fieldDefBase

export const createManifestInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
})

export const updateManifestInput = z
  .object({
    id: z.string(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
    fields: z.array(manifestFieldDefSchema).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.fields) {
      const seen = new Set<string>()
      for (const f of val.fields) {
        if (seen.has(f.key)) {
          ctx.addIssue({
            code: "custom",
            path: ["fields"],
            message: `Duplicate field key: ${f.key}`,
          })
          return
        }
        seen.add(f.key)
      }
    }
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
  required: z.array(z.object({ manifestId: z.string(), fieldSlug: fieldKey })),
})

export const createManifestFolderInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const updateManifestFolderInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
})

export const deleteManifestFolderInput = z.object({ id: z.string() })

export const moveManifestToFolderInput = z.object({
  manifestId: z.string(),
  folderId: z.string().nullable(), // null = move to root
})

export type CreateManifestInput = z.infer<typeof createManifestInput>
export type UpdateManifestInput = z.infer<typeof updateManifestInput>
export type AttachManifestInput = z.infer<typeof attachManifestInput>
export type UpdateRunManifestDataInput = z.infer<typeof updateRunManifestDataInput>
