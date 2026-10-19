CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar(128) NOT NULL,
  client_key uuid NOT NULL,
  sku varchar(32) NOT NULL,
  amount_cents integer NOT NULL,
  status varchar(24) DEFAULT 'pending' NOT NULL,
  provider_trade_no varchar(64),
  paid_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payment_orders_user_idx ON payment_orders (user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_client_unique ON payment_orders (user_id, client_key);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_provider_trade_unique ON payment_orders (provider_trade_no);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ai_credit_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar(128) NOT NULL,
  source varchar(24) NOT NULL,
  order_id uuid,
  total integer NOT NULL,
  remaining integer NOT NULL,
  expires_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_credit_grants_user_idx ON ai_credit_grants (user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS ai_credit_grants_order_unique ON ai_credit_grants (order_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS ai_credit_grants_trial_unique ON ai_credit_grants (user_id) WHERE source = 'trial';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS ai_credit_grants_legacy_unique ON ai_credit_grants (user_id) WHERE source = 'legacy';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ai_usage_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar(128) NOT NULL,
  grant_id uuid NOT NULL,
  task_id uuid NOT NULL,
  status varchar(16) DEFAULT 'reserved' NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  settled_at timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_usage_reservations_user_idx ON ai_usage_reservations (user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_reservations_active_task_unique ON ai_usage_reservations (task_id) WHERE status = 'reserved';
