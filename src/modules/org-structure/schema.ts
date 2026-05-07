import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
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
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
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
    index("posts_org_user_idx").on(t.organizationId, t.userId, t.deletedAt),
    index("posts_org_deleted_idx").on(t.organizationId, t.deletedAt),
  ],
)

export type OrgContainer = typeof orgContainers.$inferSelect
export type NewOrgContainer = typeof orgContainers.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
