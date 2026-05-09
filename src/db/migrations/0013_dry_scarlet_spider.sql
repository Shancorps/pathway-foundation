ALTER TABLE "cycles" ADD COLUMN "loop_back_of_cycle_id" text;--> statement-breakpoint
ALTER TABLE "cycles" ADD COLUMN "loop_back_reason" text;--> statement-breakpoint
ALTER TABLE "cycles" ADD COLUMN "loop_back_initiated_by" text;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_loop_back_of_cycle_id_cycles_id_fk" FOREIGN KEY ("loop_back_of_cycle_id") REFERENCES "public"."cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_loop_back_initiated_by_user_id_fk" FOREIGN KEY ("loop_back_initiated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cycles_org_loopback_idx" ON "cycles" USING btree ("organization_id","loop_back_of_cycle_id");