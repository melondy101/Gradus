import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    rawInput: text("raw_input"),          // 用户原始输入，AI 生成正式 title 后保留
    startDate: timestamp("start_date", { withTimezone: true }), // 大任务开始日期
    status: text("status").notNull().default("active"),
    totalDays: integer("total_days").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("tasks_user_id_idx").on(table.userId),
    createdAtIdx: index("tasks_created_at_idx").on(table.createdAt),
  })
);

export const subtasks = pgTable(
  "subtasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    durationDays: integer("duration_days").notNull().default(1),
    startDay: integer("start_day").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    resources: text("resources"),        // JSON: Array<{type,title,url?,searchQuery?,author?}>
    topic: text("topic"),                // 主题类别，如：数学/编程/语言
    urgency: integer("urgency"),         // 1-5 紧急度
    importance: integer("importance"),   // 1-5 重要度
    keywords: text("keywords"),          // JSON: string[] 关键词
    completedAt: timestamp("completed_at", { withTimezone: true }), // 完成时间（用于连续性追踪 / streak）
    bloomLevel: integer("bloom_level"),   // 1-6 Bloom 认知层级（AI 分析生成）
    deepWorkHours: real("deep_work_hours"), // 预计深度学习时长（小时）
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    taskIdIdx: index("subtasks_task_id_idx").on(table.taskId),
  })
);

export type Task = InferSelectModel<typeof tasks>;
export type Subtask = InferSelectModel<typeof subtasks>;
