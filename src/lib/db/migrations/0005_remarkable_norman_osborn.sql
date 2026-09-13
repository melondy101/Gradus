CREATE TABLE "email_verifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(256) NOT NULL,
	"email_lower" varchar(256) NOT NULL,
	"code" varchar(6) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemption_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"tier" varchar(32) DEFAULT 'pro' NOT NULL,
	"duration_days" integer DEFAULT 30 NOT NULL,
	"max_uses" integer DEFAULT 100 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"description" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "redemption_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "redemption_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"code_id" uuid,
	"code" varchar(64) NOT NULL,
	"tier" varchar(32) NOT NULL,
	"duration_days" integer NOT NULL,
	"redeemed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" varchar(32) DEFAULT 'system' NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "watcha_openid" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "membership_tier" varchar(32) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "membership_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_generate_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_adjust_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "task_ops_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_usage_date" varchar(10);--> statement-breakpoint
CREATE INDEX "email_verifications_email_lower_idx" ON "email_verifications" USING btree ("email_lower");--> statement-breakpoint
CREATE INDEX "email_verifications_expires_at_idx" ON "email_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "redemption_codes_code_idx" ON "redemption_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "redemption_records_user_id_idx" ON "redemption_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "redemption_records_code_idx" ON "redemption_records" USING btree ("code");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_watcha_openid_unique" UNIQUE("watcha_openid");