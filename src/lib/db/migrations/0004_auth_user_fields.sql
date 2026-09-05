ALTER TABLE "users" ADD COLUMN "email_lower" varchar(256);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_lower_unique" UNIQUE("email_lower");--> statement-breakpoint
CREATE TABLE "auth_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"kind" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "auth_attempts_ip_kind_attempted_at_idx" ON "auth_attempts" USING btree ("ip","kind","attempted_at");