import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const paymentOrders = pgTable("payment_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  clientKey: uuid("client_key").notNull(),
  sku: varchar("sku", { length: 32 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  providerTradeNo: varchar("provider_trade_no", { length: 64 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("payment_orders_user_idx").on(table.userId),
  clientUnique: uniqueIndex("payment_orders_client_unique").on(table.userId, table.clientKey),
  providerTradeUnique: uniqueIndex("payment_orders_provider_trade_unique").on(table.providerTradeNo),
}));

export const aiCreditGrants = pgTable("ai_credit_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  source: varchar("source", { length: 24 }).notNull(),
  orderId: uuid("order_id"),
  total: integer("total").notNull(),
  remaining: integer("remaining").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("ai_credit_grants_user_idx").on(table.userId),
  orderUnique: uniqueIndex("ai_credit_grants_order_unique").on(table.orderId),
  trialUnique: uniqueIndex("ai_credit_grants_trial_unique").on(table.userId).where(sql`${table.source} = 'trial'`),
  legacyUnique: uniqueIndex("ai_credit_grants_legacy_unique").on(table.userId).where(sql`${table.source} = 'legacy'`),
}));

export const aiUsageReservations = pgTable("ai_usage_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  grantId: uuid("grant_id").notNull(),
  taskId: uuid("task_id").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("reserved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  settledAt: timestamp("settled_at"),
}, (table) => ({
  userIdx: index("ai_usage_reservations_user_idx").on(table.userId),
  activeTaskUnique: uniqueIndex("ai_usage_reservations_active_task_unique").on(table.taskId).where(sql`${table.status} = 'reserved'`),
}));

export const watchaUsageAttempts = pgTable("watcha_usage_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  taskId: uuid("task_id").notNull(),
  entitlementId: varchar("entitlement_id", { length: 128 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("prepared"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("watcha_usage_attempts_user_idx").on(table.userId),
  activeTaskUnique: uniqueIndex("watcha_usage_attempts_active_task_unique").on(table.taskId)
    .where(sql`${table.status} IN ('prepared', 'consumed')`),
}));
