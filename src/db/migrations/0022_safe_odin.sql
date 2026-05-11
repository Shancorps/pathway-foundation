CREATE TABLE "manifest_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "manifests" ADD COLUMN "folder_id" text;--> statement-breakpoint
ALTER TABLE "manifest_folders" ADD CONSTRAINT "manifest_folders_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifest_folders" ADD CONSTRAINT "manifest_folders_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifest_folders" ADD CONSTRAINT "manifest_folders_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manifest_folders_org_idx" ON "manifest_folders" USING btree ("organization_id","position");--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_folder_id_manifest_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."manifest_folders"("id") ON DELETE set null ON UPDATE no action;