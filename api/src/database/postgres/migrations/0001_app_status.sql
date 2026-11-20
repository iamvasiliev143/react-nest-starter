CREATE TABLE "app_status" (
	"singleton" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"maintenance" boolean DEFAULT false NOT NULL,
	"message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "app_status_singleton" CHECK ("app_status"."singleton" = true)
);
--> statement-breakpoint
INSERT INTO "app_status" ("singleton") VALUES (true);
