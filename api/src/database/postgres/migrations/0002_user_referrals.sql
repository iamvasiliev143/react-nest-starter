ALTER TABLE "users" ADD COLUMN "referrer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_referrer_id_idx" ON "users" USING btree ("referrer_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_no_self_referral" CHECK ("users"."referrer_id" <> "users"."id");