import { boolean, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    type: varchar("type", { length: 32 }).notNull().default("system"), // 'system' | 'task' | 'membership' | 'achievement'
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  })
);

export type Notification = InferSelectModel<typeof notifications>;
