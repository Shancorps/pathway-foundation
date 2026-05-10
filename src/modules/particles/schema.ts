import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { type ParticleFieldType, particleFieldTypes } from "@/lib/field-types"
import { organization, user } from "@/modules/auth/schema"

// Re-export for backwards compat with any local consumers.
export { particleFieldTypes }
export type { ParticleFieldType }

/**
 * One field definition stored in the particle_types.fields jsonb column.
 *
 * `key` is a stable machine identifier (snake_case) used as the JSON key in
 * `particles.data`. Renaming a field's `label` is safe; changing its `key`
 * orphans existing values stored under the old key.
 */
export interface ParticleFieldDef {
  key: string
  label: string
  type: ParticleFieldType
  required: boolean
  position: number
  options?: string[]
  helpText?: string
}

export const particleTypes = pgTable(
  "particle_types",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    icon: text("icon"),
    showInSidebar: boolean("show_in_sidebar").notNull().default(false),
    fields: jsonb("fields").$type<ParticleFieldDef[]>().notNull().default([]),
    nameLabel: text("name_label").notNull().default("Name"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [index("particle_types_org_deleted_idx").on(t.organizationId, t.deletedAt)],
)

export const particles = pgTable(
  "particles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    particleTypeId: text("particle_type_id")
      .notNull()
      .references(() => particleTypes.id, { onDelete: "restrict" }),
    /**
     * Optional parent particle. The "Client → Car" pattern: a Client particle
     * can have many child particles (their cars, properties, pets) that move
     * through their own rails independently. RESTRICT prevents soft-deleting
     * a parent silently while children still reference it; the action layer
     * also rejects self-reference.
     */
    parentParticleId: text("parent_particle_id").references((): AnyPgColumn => particles.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("particles_org_type_deleted_idx").on(t.organizationId, t.particleTypeId, t.deletedAt),
    index("particles_org_parent_deleted_idx").on(t.organizationId, t.parentParticleId, t.deletedAt),
    index("particles_org_deleted_idx").on(t.organizationId, t.deletedAt),
  ],
)

export type ParticleType = typeof particleTypes.$inferSelect
export type NewParticleType = typeof particleTypes.$inferInsert
export type Particle = typeof particles.$inferSelect
export type NewParticle = typeof particles.$inferInsert
