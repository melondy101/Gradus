import { and, asc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiCreditGrants, aiUsageReservations, tasks, users } from "@/lib/db/schema";
import { isAdminUser } from "@/lib/auth/admin";
import { getBeijingDateString } from "@/lib/membership/quota";

export class CreditExhaustedError extends Error {
  constructor() { super("AI 规划次数已用完，请购买次数包或专业版后继续"); }
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
  return issued + (grants.some((grant) => grant.source === "trial") ? 0 : 1) +
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
        .where(eq(aiUsageReservations.id, reservation.id));
      if (!delivered) await tx.update(aiCreditGrants).set({ remaining: sql`${aiCreditGrants.remaining} + 1` })
        .where(eq(aiCreditGrants.id, reservation.grantId));
    }

    const [trial] = await tx.select({ id: aiCreditGrants.id }).from(aiCreditGrants).where(and(
      eq(aiCreditGrants.userId, userId), eq(aiCreditGrants.source, "trial"),
    )).limit(1);
    if (!trial) {
      await tx.insert(aiCreditGrants).values({ userId, source: "trial", total: 1, remaining: 1 });
    }

    const [membershipGrant] = await tx.select({ id: aiCreditGrants.id }).from(aiCreditGrants).where(and(
      eq(aiCreditGrants.userId, userId), inArray(aiCreditGrants.source, ["pro", "redeem", "legacy"]),
    )).limit(1);
    if (!membershipGrant && user.membershipTier !== "free" && user.membershipExpiresAt && user.membershipExpiresAt > now) {
      const months = Math.max(1, Math.ceil((user.membershipExpiresAt.getTime() - now.getTime()) / (30 * 24 * 60 * 60_000)));
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
    const grant = grants.find((item) => item.source !== "pro" || (todayProUses[0]?.count ?? 0) < 4);
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
