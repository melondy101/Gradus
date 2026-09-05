import type { InferSelectModel } from "drizzle-orm";
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
  })
);

export type User = InferSelectModel<typeof users>;
