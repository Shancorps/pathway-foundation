import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { organization, user } from "@/modules/auth/schema"

export const orgContainerLevels = ["division", "department", "section", "unit"] as const
export type OrgContainerLevel = (typeof orgContainerLevels)[number]

export const orgContainers = pgTable(
  "org_containers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    level: text("level", { enum: orgContainerLevels }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    vfp: text("vfp"),
    color: text("color"),
    parentId: text("parent_id").references((): AnyPgColumn => orgContainers.id, {
      onDelete: "restrict",
    }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("org_containers_org_parent_idx").on(t.organizationId, t.parentId, t.deletedAt),
    index("org_containers_org_deleted_idx").on(t.organizationId, t.deletedAt),
  ],
)

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    vfp: text("vfp"),
    parentContainerId: text("parent_container_id").references(() => orgContainers.id, {
      onDelete: "restrict",
    }),
    isSenior: boolean("is_senior").notNull().default(false),
    isAreaManager: boolean("is_area_manager").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("posts_org_parent_idx").on(t.organizationId, t.parentContainerId, t.deletedAt),
    index("posts_org_deleted_idx").on(t.organizationId, t.deletedAt),
  ],
)

/**
 * Many-to-many between Posts and Users. A Post can be held by 0, 1, or many
 * Employees (e.g. three salesmen sharing the "Salesperson" Post; day-shift +
 * night-shift foremen sharing the "Foreman" Post). All current holders see
 * cycles routed to that Post in their My Actions inbox; whichever one
 * completes the cycle first removes it from the others' inboxes.
 *
 * No soft-delete here on purpose — assignments are simple links. If a holder
 * leaves the Post, the row is removed. Audit log records who changed what.
 */
export const postAssignments = pgTable(
  "post_assignments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    // Prevents double-assigning the same user to the same post.
    uniqueIndex("post_assignments_post_user_uniq").on(t.postId, t.userId),
    // The routing primitive: "what posts does user X hold in this org?"
    index("post_assignments_org_user_idx").on(t.organizationId, t.userId),
  ],
)

export type OrgContainer = typeof orgContainers.$inferSelect
export type NewOrgContainer = typeof orgContainers.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type PostAssignment = typeof postAssignments.$inferSelect
export type NewPostAssignment = typeof postAssignments.$inferInsert
