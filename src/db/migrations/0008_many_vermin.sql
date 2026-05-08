-- KERNEL-STAGE CORRECTION: posts → post_assignments (1:1 → 1:N).
--
-- Strict expand-migrate-contract would split this into multiple migrations,
-- but the kernel has no production data yet — only seed/demo rows. We do all
-- three steps in one migration here. Once we ship to real users, future
-- destructive changes follow expand-migrate-contract per AGENTS.md rule #10.

CREATE TABLE "post_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "posts_org_user_idx";--> statement-breakpoint
ALTER TABLE "post_assignments" ADD CONSTRAINT "post_assignments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_assignments" ADD CONSTRAINT "post_assignments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_assignments" ADD CONSTRAINT "post_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_assignments" ADD CONSTRAINT "post_assignments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_assignments_post_user_uniq" ON "post_assignments" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "post_assignments_org_user_idx" ON "post_assignments" USING btree ("organization_id","user_id");--> statement-breakpoint

-- Backfill: copy any existing posts.user_id assignments into the new table
-- BEFORE we drop the column. Soft-deleted posts are skipped — their
-- assignments don't carry forward.
INSERT INTO "post_assignments" ("id", "organization_id", "post_id", "user_id", "created_at", "created_by")
SELECT
  'pa_' || replace(gen_random_uuid()::text, '-', ''),
  "organization_id",
  "id",
  "user_id",
  COALESCE("updated_at", now()),
  "updated_by"
FROM "posts"
WHERE "user_id" IS NOT NULL AND "deleted_at" IS NULL;
--> statement-breakpoint

ALTER TABLE "posts" DROP COLUMN "user_id";
