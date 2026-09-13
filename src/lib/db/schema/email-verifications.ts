import { pgTable, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: varchar("email", { length: 256 }).notNull(),
    emailLower: varchar("email_lower", { length: 256 }).notNull(),
    code: varchar("code", { length: 6 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    emailLowerIdx: index("email_verifications_email_lower_idx").on(table.emailLower),
    expiresAtIdx: index("email_verifications_expires_at_idx").on(table.expiresAt),
  })
);

export type EmailVerification = InferSelectModel<typeof emailVerifications>;
