/**
 * The kernel field type catalog. Shared between particles (entity-scoped data)
 * and manifests (run-scoped data). Adding a new type here makes it available
 * everywhere field types are consumed.
 *
 * Type-specific properties live in the consumer's field-def shape
 * (e.g., ParticleFieldDef.options for select; ManifestFieldDef.currency for currency).
 */
export const kernelFieldTypes = [
  "text",
  "text_area",
  "number",
  "date",
  "select",
  "phone",
  "email",
  "yes_no",
  "currency",
  "multi_select",
  "url",
  "file_upload",
  "particle_ref",
] as const

export type KernelFieldType = (typeof kernelFieldTypes)[number]

/**
 * Subset of kernel types that particles supports. Particles intentionally
 * excludes file_upload (use the files module separately) and particle_ref
 * (parent_particle_id is the structured way to reference a parent).
 *
 * Manifests use the full kernel.
 */
export const particleFieldTypes = [
  "text",
  "text_area",
  "number",
  "date",
  "select",
  "phone",
  "email",
  "yes_no",
  "currency",
  "multi_select",
  "url",
] as const satisfies readonly KernelFieldType[]

export type ParticleFieldType = (typeof particleFieldTypes)[number]
