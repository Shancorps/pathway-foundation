import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { organization, user } from "@/modules/auth/schema"
import { posts } from "@/modules/org-structure/schema"
import { particleTypes } from "@/modules/particles/schema"

/**
 * Rail status. Draft rails are editable but cannot be Run; only Published rails
 * can produce Rail Runs. Republishing a draft after edits is allowed; the spec
 * "has draft" badge (a published rail with unsynced edits) is a future polish.
 */
export const railStatuses = ["draft", "published"] as const
export type RailStatus = (typeof railStatuses)[number]

/**
 * Node types the kernel supports. The alpha shows many more (Initialize,
 * Condition, Parallel, End, Approval, Statistic, Manifest, Sub-Flow, Agent,
 * Integration). The kernel proves the conveyor belt with the minimum two —
 * future phases extend this enum.
 */
export const railNodeTypes = ["trigger", "task"] as const
export type RailNodeType = (typeof railNodeTypes)[number]

export const rails = pgTable(
  "rails",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    // Principle 0 — enforced at the DB level: a Rail is bound to a Particle Type
    // at design time. RESTRICT prevents hard-deleting a Type while rails reference it.
    particleTypeId: text("particle_type_id")
      .notNull()
      .references(() => particleTypes.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", { enum: railStatuses }).notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("rails_org_deleted_idx").on(t.organizationId, t.deletedAt),
    index("rails_org_type_deleted_idx").on(t.organizationId, t.particleTypeId, t.deletedAt),
  ],
)

export const railNodes = pgTable(
  "rail_nodes",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    railId: text("rail_id")
      .notNull()
      .references(() => rails.id, { onDelete: "restrict" }),
    type: text("type", { enum: railNodeTypes }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    // The Terminal a Task is performed at. NULL for trigger nodes. RESTRICT prevents
    // hard-deleting a Post that's wired into a rail — forces deliberate cleanup.
    postId: text("post_id").references(() => posts.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("rail_nodes_rail_pos_deleted_idx").on(t.railId, t.position, t.deletedAt),
    index("rail_nodes_org_deleted_idx").on(t.organizationId, t.deletedAt),
    index("rail_nodes_post_deleted_idx").on(t.postId, t.deletedAt),
  ],
)

export type Rail = typeof rails.$inferSelect
export type NewRail = typeof rails.$inferInsert
export type RailNode = typeof railNodes.$inferSelect
export type NewRailNode = typeof railNodes.$inferInsert
