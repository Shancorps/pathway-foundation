CREATE TABLE "cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"rail_run_id" text NOT NULL,
	"rail_node_id" text NOT NULL,
	"post_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"checklist_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ideal_minutes" integer,
	"position" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"timer_started_at" timestamp with time zone,
	"timer_started_by" text,
	"time_spent_minutes" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "rail_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"rail_id" text NOT NULL,
	"particle_id" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"started_by" text,
	"completed_by" text,
	"cancelled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_rail_run_id_rail_runs_id_fk" FOREIGN KEY ("rail_run_id") REFERENCES "public"."rail_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_rail_node_id_rail_nodes_id_fk" FOREIGN KEY ("rail_node_id") REFERENCES "public"."rail_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_timer_started_by_user_id_fk" FOREIGN KEY ("timer_started_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_runs" ADD CONSTRAINT "rail_runs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_runs" ADD CONSTRAINT "rail_runs_rail_id_rails_id_fk" FOREIGN KEY ("rail_id") REFERENCES "public"."rails"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_runs" ADD CONSTRAINT "rail_runs_particle_id_particles_id_fk" FOREIGN KEY ("particle_id") REFERENCES "public"."particles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_runs" ADD CONSTRAINT "rail_runs_started_by_user_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_runs" ADD CONSTRAINT "rail_runs_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_runs" ADD CONSTRAINT "rail_runs_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_runs" ADD CONSTRAINT "rail_runs_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cycles_org_post_open_idx" ON "cycles" USING btree ("organization_id","post_id","completed_at","cancelled_at","deleted_at");--> statement-breakpoint
CREATE INDEX "cycles_run_position_idx" ON "cycles" USING btree ("rail_run_id","position");--> statement-breakpoint
CREATE INDEX "cycles_org_deleted_idx" ON "cycles" USING btree ("organization_id","deleted_at");--> statement-breakpoint
CREATE INDEX "rail_runs_org_status_idx" ON "rail_runs" USING btree ("organization_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX "rail_runs_org_rail_idx" ON "rail_runs" USING btree ("organization_id","rail_id","deleted_at");--> statement-breakpoint
CREATE INDEX "rail_runs_org_particle_idx" ON "rail_runs" USING btree ("organization_id","particle_id","deleted_at");