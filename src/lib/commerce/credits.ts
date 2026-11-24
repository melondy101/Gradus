import { and, asc, eq, gt, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiCreditGrants, aiUsageReservations, tasks, users } from "@/lib/db/schema";
import { isAdminUser } from "@/lib/auth/admin";
import { getBeijingDateString } from "@/lib/membership/quota";

/**
 * AI 额度模型（FB-03）
 *
 * 之前免费用户只有「终身 1 次」试用额度：生成一次之后，点「按意见重排」直接撞墙，
 * 而落地页对此只字未提。现在改为：
 *
 *   试用额度  source="trial"  终身 3 次（含生成与重排）
 *   每日额度  source="daily"   注册用户每天 1 次，东八区 00:00 刷新
 *   付费额度  source="pro"/"redeem"/"legacy"  次数包与会员
 *
 * 扣减顺序固定：试用 → 每日 → 付费。
 * 历史用户已有的 trial(total=1) 记录**不追溯扩容**（避免老用户额度被动增加），
 * 只有尚未发放过试用额度的账号首次发放即 3 次。
 */

/** 试用额度次数（含重排） */
export const TRIAL_CREDITS = 3;
/** 每日免费刷新次数（仅注册用户） */
export const DAILY_CREDITS = 1;

export class CreditExhaustedError extends Error {
  constructor() { super("AI 规划次数已用完，请购买次数包或专业版后继续"); }
}

/** 东八区次日零点 —— 每日额度的过期时间 */
export function nextBeijingMidnight(now = new Date()): Date {
  const dayStart = new Date(`${getBeijingDateString(now)}T00:00:00+08:00`);
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
}

/** 额度来源的扣减优先级：试用 → 每日 → 付费 */
function sourcePriority(source: string): number {
  if (source === "trial") return 0;
  if (source === "daily") return 1;
  return 2;
}

/**
 * 访客（临时账号）判定 —— 与 membership/quota.ts 的 isTempUser 同口径，
 * 这里拿到的是数据库行。
 */
function isTempUserRow(user: { passwordHash: string | null; email: string | null }): boolean {
  return (
    (user.passwordHash ?? "") === "" &&
    (!user.email || user.email.startsWith("temp-") || user.email.includes("@anon.local"))
  );
}

export async function getCreditBalance(userId: string) {
  const now = new Date();
  const grants = await db.select().from(aiCreditGrants).where(and(
    eq(aiCreditGrants.userId, userId),
    or(isNull(aiCreditGrants.expiresAt), gt(aiCreditGrants.expiresAt, now)),
  ));
  const issued = grants.reduce((sum, grant) => sum + grant.remaining, 0);
  const [user] = await db.select({ tier: users.membershipTier, expiresAt: users.membershipExpiresAt })
    .from(users).where(eq(users.id, userId)).limit(1);
  const needsLegacy = user?.tier !== "free" && user?.expiresAt && user.expiresAt > now &&
    !grants.some((grant) => ["pro", "redeem", "legacy"].includes(grant.source));
  const legacyMonths = needsLegacy && user.expiresAt
    ? Math.max(1, Math.ceil((user.expiresAt.getTime() - now.getTime()) / (30 * 24 * 60 * 60_000))) : 0;
  // 还没发放的试用额度与今日额度也要算进余额，否则会员中心会显示「0 次」
  const trialGrant = grants.find((grant) => grant.source === "trial");
  const hasDaily = grants.some((grant) => grant.source === "daily");
  const pendingTrial = trialGrant ? 0 : TRIAL_CREDITS;
  // 每日额度在试用额度用完之后才开始发放（见 reserveAiCredit）
  const pendingDaily = trialGrant && trialGrant.remaining <= 0 && !hasDaily ? DAILY_CREDITS : 0;
  return issued + pendingTrial + pendingDaily +
    legacyMonths * (user?.tier === "premium" ? 100 : 40);
}

/** One row lock per user serializes all grants and reservations across serverless instances. */
export async function reserveAiCredit(userId: string, taskId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user) throw new Error("User no longer exists");
    if (isAdminUser(user)) return null;

    const now = new Date();
    const stale = await tx.select().from(aiUsageReservations).where(and(
      eq(aiUsageReservations.userId, userId),
      eq(aiUsageReservations.status, "reserved"),
      lt(aiUsageReservations.createdAt, new Date(now.getTime() - 30 * 60_000)),
    ));
    for (const reservation of stale) {
      const [task] = await tx.select({ status: tasks.status, updatedAt: tasks.updatedAt })
        .from(tasks).where(eq(tasks.id, reservation.taskId)).limit(1);
      const delivered = task?.status === "done" && task.updatedAt > reservation.createdAt;
      await tx.update(aiUsageReservations).set({ status: delivered ? "consumed" : "released", settledAt: now })
        .where(and(eq(aiUsageReservations.id, reservation.id), eq(aiUsageReservations.status, "reserved")));
      if (!delivered) await tx.update(aiCreditGrants).set({ remaining: sql`${aiCreditGrants.remaining} + 1` })
        .where(eq(aiCreditGrants.id, reservation.grantId));
    }

    const [trial] = await tx.select({ id: aiCreditGrants.id, remaining: aiCreditGrants.remaining })
      .from(aiCreditGrants).where(and(
        eq(aiCreditGrants.userId, userId), eq(aiCreditGrants.source, "trial"),
      )).limit(1);
    if (!trial) {
      await tx.insert(aiCreditGrants).values({ userId, source: "trial", total: TRIAL_CREDITS, remaining: TRIAL_CREDITS });
    }

    // 每日额度：注册用户每天 1 次，东八区零点刷新；访客（临时账号）不发放。
    // ⚠️ 只有试用额度用完之后才开始发放每日额度 —— 「先试用 3 次，之后每天再送 1 次」。
    const trialExhausted = !!trial && trial.remaining <= 0;
    const [daily] = await tx.select({ id: aiCreditGrants.id }).from(aiCreditGrants).where(and(
      eq(aiCreditGrants.userId, userId), eq(aiCreditGrants.source, "daily"),
      gt(aiCreditGrants.expiresAt, now),
    )).limit(1);
    if (!daily && trialExhausted && !isTempUserRow(user)) {
      await tx.delete(aiCreditGrants).where(and(
        eq(aiCreditGrants.userId, userId), eq(aiCreditGrants.source, "daily"),
        lte(aiCreditGrants.expiresAt, now),
      ));
      await tx.insert(aiCreditGrants).values({
        userId, source: "daily", total: DAILY_CREDITS, remaining: DAILY_CREDITS,
        expiresAt: nextBeijingMidnight(now),
      });
    }

    const [membershipGrant] = await tx.select({ id: aiCreditGrants.id }).from(aiCreditGrants).where(and(
      eq(aiCreditGrants.userId, userId), inArray(aiCreditGrants.source, ["pro", "redeem", "legacy"]),
    )).limit(1);
    if (!membershipGrant && user.membershipTier !== "free" && user.membershipExpiresAt && user.membershipExpiresAt > now) {
      const months = Math.max(1, Math.ceil((user.membershipExpiresAt.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      const credits = (user.membershipTier === "premium" ? 100 : 40) * months;
      await tx.insert(aiCreditGrants).values({
        userId, source: "legacy", total: credits, remaining: credits,
        expiresAt: user.membershipExpiresAt,
      });
    }

    const grants = await tx.select().from(aiCreditGrants).where(and(
      eq(aiCreditGrants.userId, userId), gt(aiCreditGrants.remaining, 0),
      or(isNull(aiCreditGrants.expiresAt), gt(aiCreditGrants.expiresAt, now)),
    )).orderBy(asc(aiCreditGrants.expiresAt), asc(aiCreditGrants.createdAt));

    const beijingToday = getBeijingDateString(now);
    const dayStart = new Date(`${beijingToday}T00:00:00+08:00`);
    const todayProUses = await tx.select({ count: sql<number>`count(*)::int` })
      .from(aiUsageReservations).innerJoin(aiCreditGrants, eq(aiCreditGrants.id, aiUsageReservations.grantId))
      .where(and(eq(aiUsageReservations.userId, userId), inArray(aiUsageReservations.status, ["reserved", "consumed"]),
        eq(aiCreditGrants.source, "pro"), gt(aiUsageReservations.createdAt, dayStart)));
    // 扣减顺序：试用 → 每日 → 付费（pro 源仍保留每日 4 次的限流）
    const ordered = [...grants].sort(
      (a, b) =>
        sourcePriority(a.source) - sourcePriority(b.source) ||
        (a.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER)
    );
    const grant = ordered.find((item) => item.source !== "pro" || (todayProUses[0]?.count ?? 0) < 4);
    if (!grant) throw new CreditExhaustedError();

    await tx.update(aiCreditGrants).set({ remaining: sql`${aiCreditGrants.remaining} - 1` })
      .where(eq(aiCreditGrants.id, grant.id));
    const [reservation] = await tx.insert(aiUsageReservations).values({
      userId, taskId, grantId: grant.id,
    }).returning({ id: aiUsageReservations.id });
    return reservation.id;
  });
}

export async function settleAiCredit(reservationId: string, success: boolean) {
  await db.transaction(async (tx) => {
    const [initial] = await tx.select({ userId: aiUsageReservations.userId })
      .from(aiUsageReservations).where(eq(aiUsageReservations.id, reservationId)).limit(1);
    if (!initial) return;
    await tx.select({ id: users.id }).from(users).where(eq(users.id, initial.userId)).for("update");
    const [reservation] = await tx.select().from(aiUsageReservations)
      .where(eq(aiUsageReservations.id, reservationId)).for("update");
    if (!reservation || reservation.status !== "reserved") return;
    await tx.update(aiUsageReservations).set({
      status: success ? "consumed" : "released", settledAt: new Date(),
    }).where(eq(aiUsageReservations.id, reservationId));
    if (!success) await tx.update(aiCreditGrants).set({ remaining: sql`${aiCreditGrants.remaining} + 1` })
      .where(eq(aiCreditGrants.id, reservation.grantId));
  });
}
