CREATE TYPE "public"."app_status_mode" AS ENUM('active', 'maintenance');--> statement-breakpoint
ALTER TABLE "app_status" ADD COLUMN "mode" "app_status_mode" DEFAULT 'active' NOT NULL;
--> statement-breakpoint
UPDATE "app_status" SET "mode" = 'maintenance' WHERE "maintenance" = true;
