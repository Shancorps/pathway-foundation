ALTER TABLE "rail_nodes" ADD COLUMN "tools_links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "cycles" ADD COLUMN "tools_links" jsonb DEFAULT '[]'::jsonb NOT NULL;