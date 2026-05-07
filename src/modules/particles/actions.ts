"use server"

import { revalidatePath } from "next/cache"
import { and, eq, isNotNull, isNull } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { ActionError, orgAction } from "@/lib/safe-action"
import { audit } from "@/modules/audit/audit"
import { particleTypes, particles, type ParticleFieldDef } from "./schema"
import {
  addFieldInput,
  createParticleInput,
  createParticleTypeInput,
  deleteFieldInput,
  deleteParticleInput,
  deleteParticleTypeInput,
  reorderFieldsInput,
  restoreParticleInput,
  restoreParticleTypeInput,
  updateFieldInput,
  updateParticleInput,
  updateParticleTypeInput,
} from "./types"

const PARTICLES_PATH = "/particles"

/**
 * Validates a particle's `data` blob against its type's field schema. Coerces
 * obvious inputs (numbers from strings, dates from ISO strings), strips keys not
 * in the schema, and throws on missing required fields or type mismatches.
 */
function validateAndCoerceData(
  fields: ParticleFieldDef[],
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of fields) {
    const value = raw[field.key]
    const isEmpty =
      value === undefined || value === null || (typeof value === "string" && value.trim() === "")
    if (isEmpty) {
      if (field.required) {
        throw new ActionError("VALIDATION", `${field.label} is required`)
      }
      continue
    }
    const asString = (v: unknown): string => {
      if (typeof v === "string") return v
      if (typeof v === "number" || typeof v === "boolean") return String(v)
      throw new ActionError("VALIDATION", `${field.label} must be text`)
    }
    switch (field.type) {
      case "text":
      case "text_area":
      case "phone":
      case "email":
        out[field.key] = asString(value)
        break
      case "number": {
        const num = typeof value === "number" ? value : Number(asString(value))
        if (!Number.isFinite(num)) {
          throw new ActionError("VALIDATION", `${field.label} must be a number`)
        }
        out[field.key] = num
        break
      }
      case "date": {
        const d = value instanceof Date ? value : new Date(asString(value))
        if (Number.isNaN(d.getTime())) {
          throw new ActionError("VALIDATION", `${field.label} must be a valid date`)
        }
        out[field.key] = d.toISOString()
        break
      }
      case "select": {
        const str = asString(value)
        if (!field.options?.includes(str)) {
          throw new ActionError(
            "VALIDATION",
            `${field.label} must be one of: ${field.options?.join(", ") ?? ""}`,
          )
        }
        out[field.key] = str
        break
      }
    }
  }
  return out
}

async function loadParticleType(
  ctx: Parameters<Parameters<typeof orgAction.action>[0]>[0]["ctx"],
  particleTypeId: string,
) {
  const [row] = await ctx.db
    .select()
    .from(particleTypes)
    .where(
      and(
        eq(particleTypes.id, particleTypeId),
        eq(particleTypes.organizationId, ctx.activeOrg.id),
        isNull(particleTypes.deletedAt),
      ),
    )
    .limit(1)
  if (!row) throw new ActionError("NOT_FOUND", "Particle type not found")
  return row
}

export const createParticleType = orgAction
  .metadata({ actionName: "particles.type.create" })
  .inputSchema(createParticleTypeInput)
  .action(async ({ parsedInput, ctx }) => {
    const id = createId()
    await ctx.db.insert(particleTypes).values({
      id,
      organizationId: ctx.activeOrg.id,
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
      name: parsedInput.name,
      description: parsedInput.description,
      color: parsedInput.color,
      icon: parsedInput.icon,
      showInSidebar: parsedInput.showInSidebar ?? false,
      nameLabel: parsedInput.nameLabel ?? "Name",
      fields: [],
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particle_types.created",
      { resourceType: "particle_type", resourceId: id, metadata: { name: parsedInput.name } },
    )
    revalidatePath(PARTICLES_PATH)
    return { id }
  })

export const updateParticleType = orgAction
  .metadata({ actionName: "particles.type.update" })
  .inputSchema(updateParticleTypeInput)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...rest } = parsedInput
    const result = await ctx.db
      .update(particleTypes)
      .set({ ...rest, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(
        and(
          eq(particleTypes.id, id),
          eq(particleTypes.organizationId, ctx.activeOrg.id),
          isNull(particleTypes.deletedAt),
        ),
      )
      .returning({ id: particleTypes.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Particle type not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particle_types.updated",
      { resourceType: "particle_type", resourceId: id, metadata: rest },
    )
    revalidatePath(PARTICLES_PATH)
    revalidatePath(`${PARTICLES_PATH}/${id}`)
    return { id }
  })

export const deleteParticleType = orgAction
  .metadata({ actionName: "particles.type.delete" })
  .inputSchema(deleteParticleTypeInput)
  .action(async ({ parsedInput, ctx }) => {
    // Soft-delete the type and cascade soft-delete to its instances. The hard FK is
    // restrict, so a hard purge would be blocked while instances still exist — but
    // soft-deletion of both keeps the system consistent and the cron can drain them.
    await ctx.db
      .update(particles)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(
        and(
          eq(particles.particleTypeId, parsedInput.id),
          eq(particles.organizationId, ctx.activeOrg.id),
          isNull(particles.deletedAt),
        ),
      )

    const result = await ctx.db
      .update(particleTypes)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(
        and(
          eq(particleTypes.id, parsedInput.id),
          eq(particleTypes.organizationId, ctx.activeOrg.id),
          isNull(particleTypes.deletedAt),
        ),
      )
      .returning({ id: particleTypes.id })
    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Particle type not found or already deleted")
    }
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particle_types.deleted",
      { resourceType: "particle_type", resourceId: parsedInput.id },
    )
    revalidatePath(PARTICLES_PATH)
    return { id: parsedInput.id }
  })

export const restoreParticleType = orgAction
  .metadata({ actionName: "particles.type.restore" })
  .inputSchema(restoreParticleTypeInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(particleTypes)
      .set({ deletedAt: null, deletedBy: null })
      .where(
        and(
          eq(particleTypes.id, parsedInput.id),
          eq(particleTypes.organizationId, ctx.activeOrg.id),
          isNotNull(particleTypes.deletedAt),
        ),
      )
      .returning({ id: particleTypes.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Deleted type not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particle_types.restored",
      { resourceType: "particle_type", resourceId: parsedInput.id },
    )
    revalidatePath(PARTICLES_PATH)
    return { id: parsedInput.id }
  })

export const addFieldToType = orgAction
  .metadata({ actionName: "particles.type.add_field" })
  .inputSchema(addFieldInput)
  .action(async ({ parsedInput, ctx }) => {
    const type = await loadParticleType(ctx, parsedInput.particleTypeId)
    if (type.fields.some((f) => f.key === parsedInput.field.key)) {
      throw new ActionError("CONFLICT", `Field key "${parsedInput.field.key}" already exists`)
    }
    const newField: ParticleFieldDef = {
      ...parsedInput.field,
      position: type.fields.length,
    }
    const updatedFields = [...type.fields, newField]
    await ctx.db
      .update(particleTypes)
      .set({ fields: updatedFields, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(eq(particleTypes.id, type.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particle_types.field_added",
      {
        resourceType: "particle_type",
        resourceId: type.id,
        metadata: { key: newField.key, type: newField.type },
      },
    )
    revalidatePath(`${PARTICLES_PATH}/${type.id}`)
    return { key: newField.key }
  })

export const updateField = orgAction
  .metadata({ actionName: "particles.type.update_field" })
  .inputSchema(updateFieldInput)
  .action(async ({ parsedInput, ctx }) => {
    const type = await loadParticleType(ctx, parsedInput.particleTypeId)
    const idx = type.fields.findIndex((f) => f.key === parsedInput.key)
    const current = idx === -1 ? null : type.fields[idx]
    if (!current) throw new ActionError("NOT_FOUND", "Field not found")
    const next: ParticleFieldDef = {
      ...current,
      ...parsedInput.patch,
      key: current.key,
      position: current.position,
    }
    if (next.type === "select" && (!next.options || next.options.length === 0)) {
      throw new ActionError("VALIDATION", "Select fields must have at least one option")
    }
    const fields = [...type.fields]
    fields[idx] = next
    await ctx.db
      .update(particleTypes)
      .set({ fields, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(eq(particleTypes.id, type.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particle_types.field_updated",
      { resourceType: "particle_type", resourceId: type.id, metadata: { key: next.key } },
    )
    revalidatePath(`${PARTICLES_PATH}/${type.id}`)
    return { key: next.key }
  })

export const deleteField = orgAction
  .metadata({ actionName: "particles.type.delete_field" })
  .inputSchema(deleteFieldInput)
  .action(async ({ parsedInput, ctx }) => {
    const type = await loadParticleType(ctx, parsedInput.particleTypeId)
    const exists = type.fields.some((f) => f.key === parsedInput.key)
    if (!exists) throw new ActionError("NOT_FOUND", "Field not found")
    const remaining = type.fields
      .filter((f) => f.key !== parsedInput.key)
      .map((f, i) => ({ ...f, position: i }))
    await ctx.db
      .update(particleTypes)
      .set({ fields: remaining, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(eq(particleTypes.id, type.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particle_types.field_deleted",
      { resourceType: "particle_type", resourceId: type.id, metadata: { key: parsedInput.key } },
    )
    revalidatePath(`${PARTICLES_PATH}/${type.id}`)
    return { key: parsedInput.key }
  })

export const reorderFields = orgAction
  .metadata({ actionName: "particles.type.reorder_fields" })
  .inputSchema(reorderFieldsInput)
  .action(async ({ parsedInput, ctx }) => {
    const type = await loadParticleType(ctx, parsedInput.particleTypeId)
    const byKey = new Map(type.fields.map((f) => [f.key, f]))
    if (parsedInput.keysInOrder.length !== type.fields.length) {
      throw new ActionError(
        "VALIDATION",
        "Reorder list must include every existing field exactly once",
      )
    }
    const seen = new Set<string>()
    const reordered: ParticleFieldDef[] = []
    for (const [i, key] of parsedInput.keysInOrder.entries()) {
      const field = byKey.get(key)
      if (!field) throw new ActionError("VALIDATION", `Unknown field key: ${key}`)
      if (seen.has(key)) throw new ActionError("VALIDATION", `Duplicate field key in order: ${key}`)
      seen.add(key)
      reordered.push({ ...field, position: i })
    }
    await ctx.db
      .update(particleTypes)
      .set({ fields: reordered, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(eq(particleTypes.id, type.id))
    revalidatePath(`${PARTICLES_PATH}/${type.id}`)
    return { id: type.id }
  })

export const createParticle = orgAction
  .metadata({ actionName: "particles.particle.create" })
  .inputSchema(createParticleInput)
  .action(async ({ parsedInput, ctx }) => {
    const type = await loadParticleType(ctx, parsedInput.particleTypeId)
    const data = validateAndCoerceData(type.fields, parsedInput.data ?? {})
    const id = createId()
    await ctx.db.insert(particles).values({
      id,
      organizationId: ctx.activeOrg.id,
      particleTypeId: type.id,
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
      name: parsedInput.name,
      data,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particles.created",
      { resourceType: "particle", resourceId: id, metadata: { particleTypeId: type.id } },
    )
    revalidatePath(`${PARTICLES_PATH}/${type.id}`)
    return { id }
  })

export const updateParticle = orgAction
  .metadata({ actionName: "particles.particle.update" })
  .inputSchema(updateParticleInput)
  .action(async ({ parsedInput, ctx }) => {
    const [existing] = await ctx.db
      .select()
      .from(particles)
      .where(
        and(
          eq(particles.id, parsedInput.id),
          eq(particles.organizationId, ctx.activeOrg.id),
          isNull(particles.deletedAt),
        ),
      )
      .limit(1)
    if (!existing) throw new ActionError("NOT_FOUND", "Particle not found")
    const type = await loadParticleType(ctx, existing.particleTypeId)

    const patch: { name?: string; data?: Record<string, unknown> } = {}
    if (parsedInput.name !== undefined) patch.name = parsedInput.name
    if (parsedInput.data !== undefined) {
      patch.data = validateAndCoerceData(type.fields, {
        ...existing.data,
        ...parsedInput.data,
      })
    }

    await ctx.db
      .update(particles)
      .set({ ...patch, updatedAt: new Date(), updatedBy: ctx.session.user.id })
      .where(eq(particles.id, existing.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particles.updated",
      { resourceType: "particle", resourceId: existing.id },
    )
    revalidatePath(`${PARTICLES_PATH}/${type.id}`)
    revalidatePath(`${PARTICLES_PATH}/${type.id}/${existing.id}`)
    return { id: existing.id }
  })

export const deleteParticle = orgAction
  .metadata({ actionName: "particles.particle.delete" })
  .inputSchema(deleteParticleInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(particles)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(
        and(
          eq(particles.id, parsedInput.id),
          eq(particles.organizationId, ctx.activeOrg.id),
          isNull(particles.deletedAt),
        ),
      )
      .returning({ id: particles.id, particleTypeId: particles.particleTypeId })
    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Particle not found or already deleted")
    }
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particles.deleted",
      { resourceType: "particle", resourceId: parsedInput.id },
    )
    revalidatePath(PARTICLES_PATH)
    if (result[0]) revalidatePath(`${PARTICLES_PATH}/${result[0].particleTypeId}`)
    return { id: parsedInput.id }
  })

export const restoreParticle = orgAction
  .metadata({ actionName: "particles.particle.restore" })
  .inputSchema(restoreParticleInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(particles)
      .set({ deletedAt: null, deletedBy: null })
      .where(
        and(
          eq(particles.id, parsedInput.id),
          eq(particles.organizationId, ctx.activeOrg.id),
          isNotNull(particles.deletedAt),
        ),
      )
      .returning({ id: particles.id })
    if (result.length === 0) throw new ActionError("NOT_FOUND", "Deleted particle not found")
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "particles.restored",
      { resourceType: "particle", resourceId: parsedInput.id },
    )
    revalidatePath(PARTICLES_PATH)
    return { id: parsedInput.id }
  })
