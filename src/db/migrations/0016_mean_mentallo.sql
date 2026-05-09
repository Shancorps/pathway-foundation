DROP INDEX "items_org_deleted_created_idx";--> statement-breakpoint
DROP INDEX "files_org_deleted_created_idx";--> statement-breakpoint
CREATE INDEX "invitation_expires_at_idx" ON "invitation" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_lower_uidx" ON "user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "items_org_created_active_idx" ON "items" USING btree ("organization_id","created_at" DESC NULLS LAST) WHERE "items"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "files_org_created_active_idx" ON "files" USING btree ("organization_id","created_at" DESC NULLS LAST) WHERE "files"."deleted_at" is null;