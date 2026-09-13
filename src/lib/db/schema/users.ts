import type { InferSelectModel } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    email: varchar("email", { length: 256 }).unique(),
    // 小写归一化邮箱：用于注册/登录邮箱查重（大小写不敏感）。
    // 与 `email` 共享唯一约束语义，但写入路径在 `register` 时由代码控制。
    emailLower: varchar("email_lower", { length: 256 }).unique(),
    // bcryptjs hash。临时账号为空字符串（`passwordHash = ''`）。
    passwordHash: text("password_hash").notNull().default(""),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    // 观猹 (Watcha.cn) OAuth OpenID
    watchaOpenId: varchar("watcha_openid", { length: 128 }).unique(),
    // 会员等级与有效期：free (普通) | pro (专业版) | premium (尊享版)
    membershipTier: varchar("membership_tier", { length: 32 }).notNull().default("free"),
    membershipExpiresAt: timestamp("membership_expires_at"),
    // 每日 AI 生成与调整配额计数（每日按 lastUsageDate 自动重置）
    aiGenerateCount: integer("ai_generate_count").notNull().default(0),
    aiAdjustCount: integer("ai_adjust_count").notNull().default(0),
    // 每日任务新建+删除操作总次数（每日按 lastUsageDate 自动重置）
    taskOpsCount: integer("task_ops_count").notNull().default(0),
    lastUsageDate: varchar("last_usage_date", { length: 10 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
  })
);

export type User = InferSelectModel<typeof users>;
