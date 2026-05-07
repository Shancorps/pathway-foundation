import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { organization, user } from "@/modules/auth/schema"

/**
 * The 7 field types the kernel supports. More can be added later (multi-select,
 * file upload, address, related-particle, post, currency) without a schema change —
 * just extend this enum and the validator.
 */
export const particleFieldTypes = [
  "text",
  "text_area",
  "number",
  "date",
  "select",
  "phone",
  "email",
] as const
export type ParticleFieldType = (typeof particleFieldTypes)[number]

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
    index("particles_org_deleted_idx").on(t.organizationId, t.deletedAt),
  ],
)

export type ParticleType = typeof particleTypes.$inferSelect
export type NewParticleType = typeof particleTypes.$inferInsert
export type Particle = typeof particles.$inferSelect
export type NewParticle = typeof particles.$inferInsert
