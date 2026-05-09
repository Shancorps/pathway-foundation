import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { organization, user } from "@/modules/auth/schema"
import { posts } from "@/modules/org-structure/schema"
import { particles } from "@/modules/particles/schema"
import { railNodes, rails } from "@/modules/rails/schema"

export const railRunStatuses = ["running", "completed", "cancelled"] as const
export type RailRunStatus = (typeof railRunStatuses)[number]

/**
 * Runtime version of a rail node's checklist item. Snapshotted when the
 * Cycle is issued; the worker mutates `checked` / `checkedAt` / `checkedBy`
 * as they tick items off. The `id` matches the source rail_node checklist
 * item, so an in-flight cycle's progress survives a rail edit on the same
 * item key.
 */
export interface CycleChecklistItem {
  id: string
  label: string
  required: boolean
  position: number
  checked: boolean
  checkedAt: string | null
  checkedBy: string | null
}

/**
 * Snapshot of a rail_node SOP/Tool deep-link, copied onto the Cycle at issue
 * time. Read-only at runtime — the worker just clicks through. Editing the
 * rail's tools_links after issue does NOT mutate in-flight cycles.
 */
export interface CycleToolsLink {
  id: string
  label: string
  url: string
  position: number
}

/**
 * One execution of a Rail on a specific Particle. Created when someone clicks
 * "Start a Rail." Lives until every Cycle in it has been completed (status
 * → 'completed') or someone cancels the run (status → 'cancelled').
 */
export const railRuns = pgTable(
  "rail_runs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    railId: text("rail_id")
      .notNull()
      .references(() => rails.id, { onDelete: "restrict" }),
    // Principle 0 binding at runtime — every Run is tied to a specific Particle
    // Instance. RESTRICT prevents hard-deleting a Particle while runs reference it.
    particleId: text("particle_id")
      .notNull()
      .references(() => particles.id, { onDelete: "restrict" }),
    status: text("status", { enum: railRunStatuses }).notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    startedBy: text("started_by").references(() => user.id, { onDelete: "set null" }),
    completedBy: text("completed_by").references(() => user.id, { onDelete: "set null" }),
    cancelledBy: text("cancelled_by").references(() => user.id, { onDelete: "set null" }),
    // When set, this run was started by a Sub-Flow node in another rail run.
    // parent_at_node_id is the sub_flow rail_node — used to resume the parent
    // by advancing past it once this child reaches End.
    parentRunId: text("parent_run_id").references((): AnyPgColumn => railRuns.id, {
      onDelete: "set null",
    }),
    parentAtNodeId: text("parent_at_node_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("rail_runs_org_status_idx").on(t.organizationId, t.status, t.deletedAt),
    index("rail_runs_org_rail_idx").on(t.organizationId, t.railId, t.deletedAt),
    index("rail_runs_org_particle_idx").on(t.organizationId, t.particleId, t.deletedAt),
    index("rail_runs_parent_idx").on(t.parentRunId),
  ],
)

/**
 * One issued ticket. The Cycle is the runtime instance of a Task rail_node:
 * it's what shows up in My Actions when the conveyor belt advances to a
 * Terminal. Title / description / checklist / ideal_minutes are SNAPSHOTTED
 * from the source rail_node so editing the rail mid-flight doesn't mutate
 * live work. The Post assignment (post_id) is also frozen — but who CURRENTLY
 * holds that Post is resolved live via post_assignments at query time, so a
 * Post reassignment automatically routes the cycle to the new holder(s).
 */
export const cycles = pgTable(
  "cycles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    railRunId: text("rail_run_id")
      .notNull()
      .references(() => railRuns.id, { onDelete: "restrict" }),
    railNodeId: text("rail_node_id")
      .notNull()
      .references(() => railNodes.id, { onDelete: "restrict" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    checklistItems: jsonb("checklist_items").$type<CycleChecklistItem[]>().notNull().default([]),
    toolsLinks: jsonb("tools_links").$type<CycleToolsLink[]>().notNull().default([]),
    idealMinutes: integer("ideal_minutes"),
    position: integer("position").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    // Active work timer. timer_started_at non-null = the worker has the timer
    // running. On stop, elapsed minutes are added to time_spent_minutes and
    // timer_started_at is nulled.
    timerStartedAt: timestamp("timer_started_at", { withTimezone: true }),
    timerStartedBy: text("timer_started_by").references(() => user.id, {
      onDelete: "set null",
    }),
    timeSpentMinutes: integer("time_spent_minutes").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by").references(() => user.id, { onDelete: "set null" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: text("cancelled_by").references(() => user.id, { onDelete: "set null" }),
    // Loop-back metadata. When non-null, this cycle is a re-do of an earlier
    // cycle in the same run, sent back by a downstream holder who picked the
    // target step + a written reason. Completing a loop-back cycle does NOT
    // advance the rail — the originator's cycle stays open in their inbox
    // with an "Active Loop Back" tag, blocked from completion until the re-do
    // closes.
    //
    // - loop_back_of_cycle_id: the prior cycle being redone (snapshot source;
    //   routes the re-do to that cycle's Post).
    // - loop_back_initiated_from_cycle_id: the cycle the originator was
    //   holding when they triggered the loop-back. Used to identify the
    //   originator's "Active Loop Back" state — if any open cycle has this
    //   field pointing to my cycle, I'm blocked waiting on a re-do.
    loopBackOfCycleId: text("loop_back_of_cycle_id").references((): AnyPgColumn => cycles.id, {
      onDelete: "set null",
    }),
    loopBackReason: text("loop_back_reason"),
    loopBackInitiatedBy: text("loop_back_initiated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    loopBackInitiatedFromCycleId: text("loop_back_initiated_from_cycle_id").references(
      (): AnyPgColumn => cycles.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    // The My Actions inbox query: open cycles for a given Post (joined to
    // post_assignments to resolve to users at query time).
    index("cycles_org_post_open_idx").on(
      t.organizationId,
      t.postId,
      t.completedAt,
      t.cancelledAt,
      t.deletedAt,
    ),
    // For finding the "next cycle" within a run.
    index("cycles_run_position_idx").on(t.railRunId, t.position),
    index("cycles_org_deleted_idx").on(t.organizationId, t.deletedAt),
    // For looking up loop-back chains (uncommon read path but cheap to add).
    index("cycles_org_loopback_idx").on(t.organizationId, t.loopBackOfCycleId),
    // For the "Active Loop Back" check — given a cycle id, are there any open
    // cycles that point back to it as their initiating cycle? Run on the
    // /my-actions inbox load, so worth indexing.
    index("cycles_org_loopback_from_idx").on(t.organizationId, t.loopBackInitiatedFromCycleId),
  ],
)

export type RailRun = typeof railRuns.$inferSelect
export type NewRailRun = typeof railRuns.$inferInsert
export type Cycle = typeof cycles.$inferSelect
export type NewCycle = typeof cycles.$inferInsert
