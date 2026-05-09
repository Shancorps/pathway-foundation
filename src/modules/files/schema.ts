import { sql } from "drizzle-orm"
import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core"
import { organization, user } from "@/modules/auth/schema"

export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    pathname: text("pathname").notNull(),
    url: text("url").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    // Partial index — list queries always filter `deleted_at IS NULL`, so
    // pruning soft-deleted rows out of the index keeps it tight.
    index("files_org_created_active_idx")
      .on(t.organizationId, t.createdAt.desc())
      .where(sql`${t.deletedAt} is null`),
  ],
)

export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
