ALTER TABLE "rail_runs" ADD COLUMN "parent_run_id" text;--> statement-breakpoint
ALTER TABLE "rail_runs" ADD COLUMN "parent_at_node_id" text;--> statement-breakpoint
ALTER TABLE "rail_runs" ADD CONSTRAINT "rail_runs_parent_run_id_rail_runs_id_fk" FOREIGN KEY ("parent_run_id") REFERENCES "public"."rail_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rail_runs_parent_idx" ON "rail_runs" USING btree ("parent_run_id");