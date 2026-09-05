import type { InferSelectModel } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Auth 限流记录表（演示版）。
 *
 * 仅用于 `/api/auth/register` 与 `/api/auth/login` 的滑动窗口限流
 * （60s / 5 次 / IP）。每次允许时插入一行；查询时按窗口阈值过滤。
 * 不维护"账号级"锁定，只防 IP 级暴力撞库。
 *
 * 选型理由：用现成的 Postgres 替代 Redis / 内存 Map，serverless 友好
 * （冷启动不会让限流形同虚设）。演示场景 QPS 低，DELETE 前置清理成本
 * 可忽略。详见 docs/plans/2026-08-14-multi-user-isolation.md。
 */
export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: text("id").primaryKey(),
    ip: text("ip").notNull(),
    // "register" | "login"
    kind: text("kind").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 滑动窗口查询：WHERE ip=? AND kind=? AND attempted_at > NOW() - INTERVAL '60 seconds'
    ipKindAttemptedAtIdx: index("auth_attempts_ip_kind_attempted_at_idx").on(
      table.ip,
      table.kind,
      table.attemptedAt,
    ),
  }),
);

export type AuthAttempt = InferSelectModel<typeof authAttempts>;