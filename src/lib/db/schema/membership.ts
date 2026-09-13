import type { InferSelectModel } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const redemptionCodes = pgTable(
  "redemption_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    tier: varchar("tier", { length: 32 }).notNull().default("pro"), // "pro" | "premium"
    durationDays: integer("duration_days").notNull().default(30), // 天数，如 30, 90, 365, 9999
    maxUses: integer("max_uses").notNull().default(100),
    usedCount: integer("used_count").notNull().default(0),
    description: text("description"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("redemption_codes_code_idx").on(table.code),
  })
);

export const redemptionRecords = pgTable(
  "redemption_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    codeId: uuid("code_id"),
    code: varchar("code", { length: 64 }).notNull(),
    tier: varchar("tier", { length: 32 }).notNull(),
    durationDays: integer("duration_days").notNull(),
    redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("redemption_records_user_id_idx").on(table.userId),
    codeIdx: index("redemption_records_code_idx").on(table.code),
  })
);

export type RedemptionCode = InferSelectModel<typeof redemptionCodes>;
export type RedemptionRecord = InferSelectModel<typeof redemptionRecords>;
