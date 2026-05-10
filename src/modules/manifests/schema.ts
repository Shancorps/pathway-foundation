import { sql } from "drizzle-orm"
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import type { KernelFieldType } from "@/lib/field-types"
import { organization, user } from "@/modules/auth/schema"
import { rails } from "@/modules/rails/schema"
import { railRuns } from "@/modules/rail-runs/schema"

/**
 * One field definition in a manifest template. Stored as an entry in the
 * manifests.fields jsonb array.
 *
 * `key` is the system slug (snake_case, unique within a manifest). It's the
 * stable identifier for the field's value in rail_run_manifests.data.
 * Renaming the label is safe; changing the key orphans existing values.
 */
export interface ManifestFieldDef {
  key: string
  label: string
  type: KernelFieldType
  position: number
  required: boolean
  readOnly: boolean
  helpText?: string
  placeholder?: string
  defaultValue?: string
  // Per-type extras
  options?: string[] // select, multi_select
  min?: number // number
  max?: number // number
  currency?: string // currency (e.g., "USD")
  fileMultiple?: boolean // file_upload
  particleTypeIds?: string[] // particle_ref ("any" if empty)
}

/**
 * Manifest template. Mirrors particle_types: a JSONB array of field defs
 * lets us evolve the field shape without a migration each time.
 */
export const manifests = pgTable(
  "manifests",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    fields: jsonb("fields").$type<ManifestFieldDef[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("manifests_org_deleted_idx")
      .on(t.organizationId, t.createdAt.desc())
      .where(sql`${t.deletedAt} is null`),
  ],
)

/**
 * Join table — which manifests are attached to which rails, in what order.
 * Multiple manifests per rail are allowed (the spec example: a delivery rail
 * with separate roofing + painting manifests).
 *
 * `manifest_id` uses ON DELETE RESTRICT — that's how "manifests in use can't
 * be deleted" is enforced at the DB level. Action layer translates the
 * Postgres FK violation into a friendly error with dependent rail names.
 */
export const railManifests = pgTable(
  "rail_manifests",
  {
    id: text("id").primaryKey(),
    railId: text("rail_id")
      .notNull()
      .references(() => rails.id, { onDelete: "cascade" }),
    manifestId: text("manifest_id")
      .notNull()
      .references(() => manifests.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rail_manifests_rail_manifest_idx").on(t.railId, t.manifestId),
    index("rail_manifests_manifest_idx").on(t.manifestId),
  ],
)

/**
 * Runtime data — one row per (rail run × attached manifest). Created lazily
 * when a rail run starts (matching the rail's currently-attached manifests)
 * or on first read/write for a manifest attached after the run started.
 *
 * `data` is a JSONB blob keyed by ManifestFieldDef.key (slug). Values are
 * untyped at the DB level; the action layer validates against the current
 * field defs at write time.
 */
export const railRunManifests = pgTable(
  "rail_run_manifests",
  {
    id: text("id").primaryKey(),
    railRunId: text("rail_run_id")
      .notNull()
      .references(() => railRuns.id, { onDelete: "cascade" }),
    manifestId: text("manifest_id")
      .notNull()
      .references(() => manifests.id, { onDelete: "restrict" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("rail_run_manifests_run_manifest_idx").on(t.railRunId, t.manifestId)],
)

export type Manifest = typeof manifests.$inferSelect
export type NewManifest = typeof manifests.$inferInsert
export type RailManifest = typeof railManifests.$inferSelect
export type NewRailManifest = typeof railManifests.$inferInsert
export type RailRunManifest = typeof railRunManifests.$inferSelect
export type NewRailRunManifest = typeof railRunManifests.$inferInsert
