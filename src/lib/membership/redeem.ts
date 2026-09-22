import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { redemptionCodes, redemptionRecords, users } from "@/lib/db/schema";
import { TIER_CONFIGS, type MembershipTier } from "./tiers";

export interface RedeemResult {
  ok: boolean;
  error?: string;
  message?: string;
  tier?: MembershipTier;
  tierName?: string;
  durationDays?: number;
  expiresAt?: string;
}

class DuplicateRedemptionError extends Error {}

export async function redeemMembershipCode(userId: string, rawCode: string): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "请输入兑换码" };

  try {
    const result = await db.transaction(async (tx): Promise<RedeemResult> => {
      const [codeObj] = await tx
        .select()
        .from(redemptionCodes)
        .where(sql`UPPER(${redemptionCodes.code}) = ${code}`)
        .limit(1);

      if (!codeObj) return { ok: false, error: "无效的兑换码，请检查拼写后重试" };
      if (codeObj.expiresAt && codeObj.expiresAt.getTime() < Date.now()) {
        return { ok: false, error: "该兑换码已过有效期" };
      }

      const [alreadyUsed] = await tx
        .select({ id: redemptionRecords.id })
        .from(redemptionRecords)
        .where(and(eq(redemptionRecords.userId, userId), eq(redemptionRecords.code, code)))
        .limit(1);
      if (alreadyUsed) return { ok: false, error: "您已兑换过此兑换码，每个兑换码限使用一次" };

      const [claimedCode] = await tx
        .update(redemptionCodes)
        .set({ usedCount: sql`${redemptionCodes.usedCount} + 1` })
        .where(
          and(
            eq(redemptionCodes.id, codeObj.id),
            sql`${redemptionCodes.usedCount} < ${redemptionCodes.maxUses}`
          )
        )
        .returning();
      if (!claimedCode) return { ok: false, error: "该兑换码已被领完，请使用其他兑换码" };

      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new Error("Redeeming user does not exist");

      const targetTier = codeObj.tier.toLowerCase() as MembershipTier;
      const durationDays = codeObj.durationDays;
      const durationMs = durationDays * 24 * 60 * 60 * 1000;
      const newExpiresAt =
        user.membershipTier === targetTier &&
        user.membershipExpiresAt &&
        user.membershipExpiresAt.getTime() > Date.now()
          ? new Date(user.membershipExpiresAt.getTime() + durationMs)
          : new Date(Date.now() + durationMs);

      const [record] = await tx
        .insert(redemptionRecords)
        .values({ userId, codeId: codeObj.id, code, tier: targetTier, durationDays })
        .onConflictDoNothing({ target: [redemptionRecords.userId, redemptionRecords.code] })
        .returning({ id: redemptionRecords.id });
      if (!record) throw new DuplicateRedemptionError();

      await tx
        .update(users)
        .set({ membershipTier: targetTier, membershipExpiresAt: newExpiresAt, updatedAt: new Date() })
        .where(eq(users.id, userId));

      const tierName = TIER_CONFIGS[targetTier]?.name || targetTier.toUpperCase();
      return {
        ok: true,
        tier: targetTier,
        tierName,
        durationDays,
        expiresAt: newExpiresAt.toISOString(),
        message: `兑换成功！已为您开通「${tierName}」${durationDays} 天特权。`,
      };
    });

    if (result.ok) await notifyRedemption(userId, result);
    return result;
  } catch (error) {
    if (error instanceof DuplicateRedemptionError) {
      return { ok: false, error: "您已兑换过此兑换码，每个兑换码限使用一次" };
    }
    console.error("[membership] redemption transaction failed", error);
    return { ok: false, error: "兑换服务暂时不可用，请稍后重试" };
  }
}

async function notifyRedemption(userId: string, result: RedeemResult) {
  try {
    const { createNotification } = await import("@/lib/db/queries/notifications");
    await createNotification({
      userId,
      title: "会员特权兑换成功",
      content: `您已成功激活「${result.tierName}」${result.durationDays} 天特权，有效期至 ${new Date(result.expiresAt!).toLocaleDateString("zh-CN")}。每日配额与全部功能已解锁！`,
      type: "membership",
    });
  } catch {
    // Membership has already been committed; notification delivery is optional.
  }
}
