import { eq, inArray, asc, sql } from "drizzle-orm";
import { notifications, redemptionRecords, tasks, users, type User } from "@/lib/db/schema";
import type { AccountTx } from "./account-code";
import { AccountError } from "./account-error";
import { verifyPassword } from "./password";

export function mergedMembership(source: User, target: User, now = new Date()) {
  const rank: Record<string, number> = { free: 0, pro: 1, premium: 2 };
  const active = [target, source].filter(u => u.membershipTier !== "free" && u.membershipExpiresAt && u.membershipExpiresAt > now);
  active.sort((a, b) => (rank[b.membershipTier] ?? 0) - (rank[a.membershipTier] ?? 0) || (b.membershipExpiresAt?.getTime() ?? 0) - (a.membershipExpiresAt?.getTime() ?? 0));
  return { membershipTier: active[0]?.membershipTier ?? "free", membershipExpiresAt: active[0]?.membershipExpiresAt ?? null };
}

/** Both identities must be proven. Lock users in stable order; rollback is all-or-nothing. */
export async function mergeAccounts(tx: AccountTx, sourceId: string, targetEmail: string, password: string, version: number) {
  const [found] = await tx.select({ id: users.id }).from(users).where(eq(users.emailLower, targetEmail)).limit(1);
  if (!found) throw new AccountError("邮箱或密码不正确", 401);
  if (found.id === sourceId) throw new AccountError("这已经是当前账号，无需合并");
  const locked = await tx.select().from(users).where(inArray(users.id, [sourceId, found.id])).orderBy(asc(users.id)).for("update");
  const source = locked.find(u => u.id === sourceId);
  const target = locked.find(u => u.id === found.id);
  if (!source || source.sessionVersion !== version) throw new AccountError("会话已失效，请重新登录", 401);
  if (!target || !await verifyPassword(password, target.passwordHash)) throw new AccountError("邮箱或密码不正确", 401);
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if ([source, target].some(u => u.id === "admin-system-root" || (adminEmail && u.emailLower === adminEmail))) throw new AccountError("管理员账号不支持合并", 403);
  if (!source.watchaOpenId) throw new AccountError("请先使用观猹账号登录，再绑定旧账号");
  if (target.watchaOpenId && target.watchaOpenId !== source.watchaOpenId) throw new AccountError("旧账号已绑定另一个观猹账号", 409);
  await tx.update(tasks).set({ userId: target.id, updatedAt: new Date() }).where(eq(tasks.userId, source.id));
  await tx.update(notifications).set({ userId: target.id }).where(eq(notifications.userId, source.id));
  const records = await tx.select().from(redemptionRecords).where(eq(redemptionRecords.userId, source.id));
  if (records.length) {
    const existing = await tx.select({ code: redemptionRecords.code }).from(redemptionRecords).where(eq(redemptionRecords.userId, target.id));
    const seen = new Set(existing.map(r => r.code));
    const move: string[] = [], duplicate: string[] = [];
    for (const record of records) {
      if (seen.has(record.code)) duplicate.push(record.id);
      else { seen.add(record.code); move.push(record.id); }
    }
    if (move.length) await tx.update(redemptionRecords).set({ userId: target.id }).where(inArray(redemptionRecords.id, move));
    if (duplicate.length) await tx.delete(redemptionRecords).where(inArray(redemptionRecords.id, duplicate));
  }
  await tx.update(users).set({ watchaOpenId: null }).where(eq(users.id, source.id));
  const today = new Date().toISOString().slice(0, 10);
  const usage = (key: "aiGenerateCount" | "aiAdjustCount" | "taskOpsCount") =>
    (source.lastUsageDate === today ? source[key] : 0) + (target.lastUsageDate === today ? target[key] : 0);
  const [updated] = await tx.update(users).set({
    watchaOpenId: source.watchaOpenId, avatarUrl: target.avatarUrl ?? source.avatarUrl,
    name: target.name || source.name, ...mergedMembership(source, target),
    aiGenerateCount: usage("aiGenerateCount"), aiAdjustCount: usage("aiAdjustCount"), taskOpsCount: usage("taskOpsCount"), lastUsageDate: today,
    sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date(),
  }).where(eq(users.id, target.id)).returning();
  await tx.delete(users).where(eq(users.id, source.id));
  return updated;
}
