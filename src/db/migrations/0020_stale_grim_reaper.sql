CREATE TABLE "manifests" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "rail_manifests" (
	"id" text PRIMARY KEY NOT NULL,
	"rail_id" text NOT NULL,
	"manifest_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rail_run_manifests" (
	"id" text PRIMARY KEY NOT NULL,
	"rail_run_id" text NOT NULL,
	"manifest_id" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "rail_nodes" ADD COLUMN "required_manifest_field_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_manifests" ADD CONSTRAINT "rail_manifests_rail_id_rails_id_fk" FOREIGN KEY ("rail_id") REFERENCES "public"."rails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_manifests" ADD CONSTRAINT "rail_manifests_manifest_id_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."manifests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_run_manifests" ADD CONSTRAINT "rail_run_manifests_rail_run_id_rail_runs_id_fk" FOREIGN KEY ("rail_run_id") REFERENCES "public"."rail_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_run_manifests" ADD CONSTRAINT "rail_run_manifests_manifest_id_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."manifests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rail_run_manifests" ADD CONSTRAINT "rail_run_manifests_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manifests_org_deleted_idx" ON "manifests" USING btree ("organization_id","created_at" DESC NULLS LAST) WHERE "manifests"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "rail_manifests_rail_manifest_idx" ON "rail_manifests" USING btree ("rail_id","manifest_id");--> statement-breakpoint
CREATE INDEX "rail_manifests_manifest_idx" ON "rail_manifests" USING btree ("manifest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rail_run_manifests_run_manifest_idx" ON "rail_run_manifests" USING btree ("rail_run_id","manifest_id");