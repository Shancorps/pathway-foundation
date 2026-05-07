CREATE TABLE "org_containers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"level" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"vfp" text,
	"color" text,
	"parent_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"vfp" text,
	"parent_container_id" text,
	"user_id" text,
	"is_senior" boolean DEFAULT false NOT NULL,
	"is_area_manager" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "org_containers" ADD CONSTRAINT "org_containers_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_containers" ADD CONSTRAINT "org_containers_parent_id_org_containers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."org_containers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_containers" ADD CONSTRAINT "org_containers_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_containers" ADD CONSTRAINT "org_containers_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_containers" ADD CONSTRAINT "org_containers_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_parent_container_id_org_containers_id_fk" FOREIGN KEY ("parent_container_id") REFERENCES "public"."org_containers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_containers_org_parent_idx" ON "org_containers" USING btree ("organization_id","parent_id","deleted_at");--> statement-breakpoint
CREATE INDEX "org_containers_org_deleted_idx" ON "org_containers" USING btree ("organization_id","deleted_at");--> statement-breakpoint
CREATE INDEX "posts_org_parent_idx" ON "posts" USING btree ("organization_id","parent_container_id","deleted_at");--> statement-breakpoint
CREATE INDEX "posts_org_user_idx" ON "posts" USING btree ("organization_id","user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "posts_org_deleted_idx" ON "posts" USING btree ("organization_id","deleted_at");