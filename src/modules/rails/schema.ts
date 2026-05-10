import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
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
 * Node types. The conveyor model classifies nodes by who/what advances them:
 *
 * - **trigger** — defines how a rail run begins. Auto. Always exactly one.
 * - **task** — assigned step at a Terminal. Issues a cycle to a Post holder.
 * - **end** — terminator. Auto-resolves: when reached, the rail run is
 *   completed. A rail must have at least one End at publish time.
 * - **approval** — Task variant that asks for an Approve/Reject decision.
 *   Issues a cycle to a Post holder; UI surfaces approve/reject affordances.
 * - **statistic** — records a stat value at a step. Auto when value comes
 *   from a manifest field or a +1 count; cycle-issuing only when the
 *   assignee must enter the value by hand.
 * - **sub_flow** — auto. When reached, a child rail_run is initiated with
 *   the same particle handoff; parent pauses until the child hits End if
 *   `waitForCompletion` is set.
 *
 * Future (need additional infra): condition (branches via predicate +
 * rail_edges), parallel (forks via rail_edges), initialize (gate at run
 * start; needs the manifest module).
 */
export const railNodeTypes = [
  "trigger",
  "task",
  "end",
  "approval",
  "statistic",
  "sub_flow",
] as const
export type RailNodeType = (typeof railNodeTypes)[number]

/**
 * Per-type configuration for nodes that need extra parameters beyond the
 * shared columns (postId, checklistItems, toolsLinks, idealMinutes,
 * description). Stored as jsonb so each new node type can extend its config
 * shape without a schema migration.
 *
 * - sub_flow → { targetRailId, waitForCompletion }
 * - statistic → { statisticId, valueMode: "count" | "enter" | "manifest", manifestField? }
 * - approval → { mode: "approve_reject" | "with_reason", onRejection: "loop_back" | "end" | "branch", loopBackToNodeId? }
 * - end / task / trigger → empty {}
 */
export type RailNodeConfig =
  | { kind: "sub_flow"; targetRailId: string | null; waitForCompletion: boolean }
  | {
      kind: "statistic"
      statisticId: string | null
      valueMode: "count" | "enter" | "manifest"
      manifestField: string | null
    }
  | {
      kind: "approval"
      mode: "approve_reject" | "with_reason"
      onRejection: "loop_back" | "end" | "branch"
      loopBackToNodeId: string | null
    }
  | { kind: "none" }

/**
 * One sub-step a worker ticks off while running a Task. The Task is the Cycle;
 * its checklist is the granular breakdown of how to produce the sub-product.
 * Stored as a jsonb array on rail_nodes.checklist_items.
 */
export interface RailNodeChecklistItem {
  id: string
  label: string
  required: boolean
  position: number
}

/**
 * One SOP / Tool deep-link attached to a Task. Per spec Principle 5
 * ("Pathway is workflow infrastructure, not production tooling"), each Cycle
 * surfaces direct links to the resources the worker needs — the SOP doc, the
 * specific Canva file, the QuickBooks page. The label is the human name; the
 * URL opens externally in a new tab.
 */
export interface RailNodeToolsLink {
  id: string
  label: string
  url: string
  position: number
}

/**
 * Per-node required-manifest-field reference. Used by Task and Approval nodes
 * to gate cycle advance: the cycle cannot complete until every entry's
 * `fieldSlug` has a non-empty value in the rail_run_manifests row for the
 * referenced `manifestId`.
 *
 * Stored top-level (not in `config`) because it applies to multiple node
 * types and benefits from being uniformly addressable, like checklistItems
 * and toolsLinks.
 *
 * Stale entries (manifest no longer attached, or field removed from the
 * manifest) are silently ignored at advance time — see spec §5.4.
 */
export interface RailNodeRequiredManifestField {
  manifestId: string
  fieldSlug: string
}

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
    checklistItems: jsonb("checklist_items").$type<RailNodeChecklistItem[]>().notNull().default([]),
    // SOP/Tool deep-links shown on the cycle detail. Snapshotted onto each
    // Cycle when issued so editing the rail later doesn't mutate live work.
    toolsLinks: jsonb("tools_links").$type<RailNodeToolsLink[]>().notNull().default([]),
    // Manifest fields that must be filled before this node's Cycle can
    // advance. Top-level (not in config) because Task and Approval both use
    // it. Stale refs (manifest detached, field removed) are ignored at
    // advance time — see spec §5.4.
    requiredManifestFieldSlugs: jsonb("required_manifest_field_slugs")
      .$type<RailNodeRequiredManifestField[]>()
      .notNull()
      .default([]),
    // Target time to complete this Cycle, in minutes. Snapshotted onto each
    // Cycle when issued, then displayed alongside actual elapsed time.
    idealMinutes: integer("ideal_minutes"),
    // Per-type configuration. Empty {} for trigger / task / end. See
    // RailNodeConfig for the typed shapes per node type. Stored as jsonb so
    // adding a new node type doesn't require a migration.
    config: jsonb("config").$type<RailNodeConfig>().notNull().default({ kind: "none" }),
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
