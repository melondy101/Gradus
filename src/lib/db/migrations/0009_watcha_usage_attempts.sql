CREATE TABLE IF NOT EXISTS watcha_usage_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar(128) NOT NULL,
  task_id uuid NOT NULL,
  entitlement_id varchar(128) NOT NULL,
  status varchar(16) DEFAULT 'prepared' NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS watcha_usage_attempts_user_idx ON watcha_usage_attempts (user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS watcha_usage_attempts_active_task_unique
  ON watcha_usage_attempts (task_id) WHERE status IN ('prepared', 'consumed');
