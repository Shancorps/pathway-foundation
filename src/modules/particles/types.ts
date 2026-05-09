import { z } from "zod"
import { particleFieldTypes } from "./schema"

export const particleFieldTypeSchema = z.enum(particleFieldTypes)

const fieldKey = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Field key must be snake_case (lowercase, underscores, digits)")

// Base shape (no refinements) so we can derive `.omit()` / `.partial()` views.
const particleFieldDefBase = z.object({
  key: fieldKey,
  label: z.string().min(1).max(120),
  type: particleFieldTypeSchema,
  required: z.boolean(),
  position: z.number().int().nonnegative(),
  options: z.array(z.string().min(1).max(120)).optional(),
  helpText: z.string().max(500).optional(),
})

const requireSelectOptions = (
  field: { type?: string; options?: string[] | undefined },
  ctx: z.RefinementCtx,
) => {
  if (field.type === "select" && (!field.options || field.options.length === 0)) {
    ctx.addIssue({
      code: "custom",
      message: "Select fields must have at least one option",
      path: ["options"],
    })
  }
}

export const particleFieldDefSchema = particleFieldDefBase.superRefine(requireSelectOptions)

export const createParticleTypeInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
  showInSidebar: z.boolean().optional(),
  nameLabel: z.string().min(1).max(60).optional(),
})

export const updateParticleTypeInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(64).nullable().optional(),
  showInSidebar: z.boolean().optional(),
  nameLabel: z.string().min(1).max(60).optional(),
})

export const deleteParticleTypeInput = z.object({ id: z.string() })
export const restoreParticleTypeInput = z.object({ id: z.string() })

export const addFieldInput = z.object({
  particleTypeId: z.string(),
  field: particleFieldDefBase.omit({ position: true }).superRefine(requireSelectOptions),
})

// Patches don't carry full context (type may not be sent), so enforce select-option
// integrity at the action layer when the merged field def is built, not here.
export const updateFieldInput = z.object({
  particleTypeId: z.string(),
  key: fieldKey,
  patch: particleFieldDefBase.partial().omit({ key: true, position: true }),
})

export const deleteFieldInput = z.object({
  particleTypeId: z.string(),
  key: fieldKey,
})

export const reorderFieldsInput = z.object({
  particleTypeId: z.string(),
  keysInOrder: z.array(fieldKey).min(1),
})

export const createParticleInput = z.object({
  particleTypeId: z.string(),
  name: z.string().min(1).max(200),
  data: z.record(z.string(), z.unknown()).optional(),
  parentParticleId: z.string().nullable().optional(),
})

export const updateParticleInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  parentParticleId: z.string().nullable().optional(),
})

export const deleteParticleInput = z.object({ id: z.string() })
export const restoreParticleInput = z.object({ id: z.string() })

export type ParticleFieldDefInput = z.infer<typeof particleFieldDefSchema>
export type CreateParticleTypeInput = z.infer<typeof createParticleTypeInput>
export type CreateParticleInput = z.infer<typeof createParticleInput>
