import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emailVerifications } from "@/lib/db/schema";
import { isRealEmailConfigured, sendVerificationCodeEmail } from "@/lib/email/mailer";

export type AccountCodePurpose = "email" | "password" | "reset";
export type AccountTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Separate account verification from registration without changing existing codes.
export function accountCodeKey(email: string, purpose: AccountCodePurpose, principal: string) {
  return createHash("sha256").update(JSON.stringify([email.toLowerCase(), purpose, principal])).digest("hex");
}

export async function sendAccountCode(email: string, purpose: AccountCodePurpose, principal: string) {
  if (process.env.NODE_ENV === "production" && !isRealEmailConfigured()) {
    return { ok: false, error: "邮箱验证服务尚未配置" };
  }
  const key = accountCodeKey(email, purpose, principal);
  const code = randomInt(100000, 1000000).toString();
  const id = crypto.randomUUID();
  const waitSeconds = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
    const [recent] = await tx.select().from(emailVerifications).where(and(
      eq(emailVerifications.emailLower, key), gt(emailVerifications.createdAt, new Date(Date.now() - 60000)),
    )).orderBy(desc(emailVerifications.createdAt)).limit(1);
    if (recent) return Math.max(1, 60 - Math.floor((Date.now() - recent.createdAt.getTime()) / 1000));
    await tx.delete(emailVerifications).where(eq(emailVerifications.emailLower, key));
    await tx.insert(emailVerifications).values({ id, email, emailLower: key, code, expiresAt: new Date(Date.now() + 600000) });
    return 0;
  });
  if (waitSeconds) return { ok: false, error: "请稍后再发送验证码", waitSeconds };
  const result = await sendVerificationCodeEmail(email, code);
  if (!result.ok) {
    await db.delete(emailVerifications).where(eq(emailVerifications.id, id));
    return { ok: false, error: "验证码邮件发送失败，请稍后重试" };
  }
  return { ok: true, message: "验证码已发送，10 分钟内有效", devCode: !isRealEmailConfigured() ? code : undefined };
}

/** Lock and consume in the same transaction as the account change. */
export async function consumeAccountCode(tx: AccountTx, email: string, purpose: AccountCodePurpose, principal: string, code: string) {
  const key = accountCodeKey(email, purpose, principal);
  const [record] = await tx.select().from(emailVerifications).where(and(
    eq(emailVerifications.emailLower, key), gt(emailVerifications.expiresAt, new Date()),
  )).orderBy(desc(emailVerifications.createdAt)).limit(1).for("update");
  if (!record || record.attempts >= 5) return "验证码不存在、已失效或尝试次数过多";
  if (!/^\d{6}$/.test(code) || record.code !== code) {
    await tx.update(emailVerifications).set({ attempts: record.attempts + 1 }).where(eq(emailVerifications.id, record.id));
    return "验证码不正确";
  }
  await tx.delete(emailVerifications).where(eq(emailVerifications.id, record.id));
  return null;
}
