import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { organization, user } from "@/modules/auth/schema"

export const statisticFrequencies = ["daily", "weekly", "monthly"] as const
export type StatisticFrequency = (typeof statisticFrequencies)[number]

/**
 * Eight-color palette for KPI graphs (spec §4.5). Stored as a slug; the UI
 * maps to hex. Keeping this enumerated keeps the design language clean and
 * lets us recolor later without touching data.
 */
export const statisticColors = [
  "orange",
  "steel",
  "graphite",
  "forest",
  "wine",
  "lavender",
  "ochre",
  "slate",
] as const
export type StatisticColor = (typeof statisticColors)[number]

/**
 * A KPI Statistic — a tracked numerical value with a name, unit, frequency,
 * color, and "lower is better" flag. Spec §2.1.
 *
 * v1 scope: org-wide statistics only. Per-Post and per-Container scoping plus
 * computed-from-children + rail-tracked stats are explicitly deferred — those
 * require org-chart authority traversal and Rail Builder integration.
 */
export const statistics = pgTable(
  "statistics",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    /** Optional display unit shown next to values, e.g. "$", "%", "leads". */
    unit: text("unit"),
    frequency: text("frequency", { enum: statisticFrequencies }).notNull(),
    /** 0=Sunday … 6=Saturday. Set only when frequency='weekly'. */
    dayOfWeek: integer("day_of_week"),
    /** 1–31, or 0 for "last day of month". Set only when frequency='monthly'. */
    dayOfMonth: integer("day_of_month"),
    color: text("color", { enum: statisticColors }).notNull(),
    /** When true, the graph inverts visually so improvements always look like rises. */
    lowerIsBetter: boolean("lower_is_better").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [index("statistics_org_deleted_idx").on(t.organizationId, t.deletedAt)],
)

export const dataPointSources = ["manual", "rail", "computed", "api"] as const
export type DataPointSource = (typeof dataPointSources)[number]

/**
 * A single time-series entry on a Statistic. Spec §2.3.
 *
 * `source` records provenance: 'manual' for hand-entered, 'rail' for values
 * captured by a rail's Track-as-Statistic toggle (deferred), 'computed' for
 * container roll-ups (deferred), 'api' for external pulls (deferred).
 * `sourceRef` carries the detail (e.g. `<rail-id>:<cycle-id>`) so the UI can
 * deep-link a rail-sourced point back to its cycle.
 */
export const dataPoints = pgTable(
  "data_points",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    statisticId: text("statistic_id")
      .notNull()
      .references(() => statistics.id, { onDelete: "restrict" }),
    /** When the value applies. Distinct from createdAt (when it was entered). */
    date: timestamp("date", { withTimezone: true }).notNull(),
    value: doublePrecision("value").notNull(),
    note: text("note"),
    source: text("source", { enum: dataPointSources }).notNull().default("manual"),
    sourceRef: text("source_ref"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    // List points for a stat ordered by date — the side panel's main read path.
    index("data_points_stat_date_idx").on(t.organizationId, t.statisticId, t.date),
    index("data_points_org_deleted_idx").on(t.organizationId, t.deletedAt),
  ],
)

export type Statistic = typeof statistics.$inferSelect
export type NewStatistic = typeof statistics.$inferInsert
export type DataPoint = typeof dataPoints.$inferSelect
export type NewDataPoint = typeof dataPoints.$inferInsert
