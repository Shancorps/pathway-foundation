CREATE TABLE "rail_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"rail_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"post_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "rails" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"particle_type_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "rail_nodes" ADD CONSTRAINT "rail_nodes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_nodes" ADD CONSTRAINT "rail_nodes_rail_id_rails_id_fk" FOREIGN KEY ("rail_id") REFERENCES "public"."rails"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_nodes" ADD CONSTRAINT "rail_nodes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_nodes" ADD CONSTRAINT "rail_nodes_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_nodes" ADD CONSTRAINT "rail_nodes_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_nodes" ADD CONSTRAINT "rail_nodes_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rails" ADD CONSTRAINT "rails_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rails" ADD CONSTRAINT "rails_particle_type_id_particle_types_id_fk" FOREIGN KEY ("particle_type_id") REFERENCES "public"."particle_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rails" ADD CONSTRAINT "rails_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rails" ADD CONSTRAINT "rails_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rails" ADD CONSTRAINT "rails_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rail_nodes_rail_pos_deleted_idx" ON "rail_nodes" USING btree ("rail_id","position","deleted_at");--> statement-breakpoint
CREATE INDEX "rail_nodes_org_deleted_idx" ON "rail_nodes" USING btree ("organization_id","deleted_at");--> statement-breakpoint
CREATE INDEX "rail_nodes_post_deleted_idx" ON "rail_nodes" USING btree ("post_id","deleted_at");--> statement-breakpoint
CREATE INDEX "rails_org_deleted_idx" ON "rails" USING btree ("organization_id","deleted_at");--> statement-breakpoint
CREATE INDEX "rails_org_type_deleted_idx" ON "rails" USING btree ("organization_id","particle_type_id","deleted_at");