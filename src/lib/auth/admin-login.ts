import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { configuredAdminEmail, configuredAdminId } from "./admin-config";
import { syncAdminIdentity } from "./admin-identity";
import { AccountError } from "./account-error";

export async function loginConfiguredAdmin(password: string) {
  if (password !== process.env.ADMIN_PASSWORD) throw new AccountError("邮箱或密码不正确", 401);
  return syncConfiguredAdmin();
}

/** Call only after authenticating an already bound provider account. */
export async function syncConfiguredAdmin(expectedUserId?: string) {
  const email = configuredAdminEmail(), configuredPassword = process.env.ADMIN_PASSWORD;
  if (!email || !configuredPassword) throw new AccountError("管理员登录尚未完成安全配置", 503);
  if (expectedUserId && configuredAdminId() && expectedUserId !== configuredAdminId()) {
    throw new AccountError("管理员账号身份不匹配", 403);
  }
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('gradus-admin-identity', 0))`);
    return syncAdminIdentity({
      byId: async id => (await tx.select().from(users).where(eq(users.id, id)).for("update"))[0],
      byEmail: async address => (await tx.select().from(users).where(eq(users.emailLower, address)).for("update"))[0],
      update: async (id, patch) => (await tx.update(users).set(patch).where(eq(users.id, id)).returning())[0],
      create: async (id, patch) => (await tx.insert(users).values({
        id, ...patch, name: "系统管理员", membershipTier: "premium",
        membershipExpiresAt: new Date("2099-12-31T23:59:59Z"),
      }).returning())[0],
    }, { id: configuredAdminId() ?? expectedUserId, email, password: configuredPassword });
  });
}
