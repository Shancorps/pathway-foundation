CREATE TABLE "data_points" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"statistic_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"value" double precision NOT NULL,
	"note" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_ref" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "statistics" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"frequency" text NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"color" text NOT NULL,
	"lower_is_better" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "data_points" ADD CONSTRAINT "data_points_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_points" ADD CONSTRAINT "data_points_statistic_id_statistics_id_fk" FOREIGN KEY ("statistic_id") REFERENCES "public"."statistics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_points" ADD CONSTRAINT "data_points_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_points" ADD CONSTRAINT "data_points_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_points_stat_date_idx" ON "data_points" USING btree ("organization_id","statistic_id","date");--> statement-breakpoint
CREATE INDEX "data_points_org_deleted_idx" ON "data_points" USING btree ("organization_id","deleted_at");--> statement-breakpoint
CREATE INDEX "statistics_org_deleted_idx" ON "statistics" USING btree ("organization_id","deleted_at");