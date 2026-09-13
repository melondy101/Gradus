import { db } from "@/lib/db/client";
import { emailVerifications } from "@/lib/db/schema";
import { memStore } from "@/lib/db/memory-store";
import { eq, and, gt, desc } from "drizzle-orm";
import { sendVerificationCodeEmail, isRealEmailConfigured } from "./mailer";

export interface CreateCodeResult {
  ok: boolean;
  error?: string;
  waitSeconds?: number;
  devCode?: string;
}

export interface VerifyCodeResult {
  ok: boolean;
  error?: string;
}

/**
 * 生成 6 位随机数字验证码
 */
function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 发送验证码：
 * 1. 检查 60 秒防刷冷却
 * 2. 生成 6 位数字验证码
 * 3. 记录至 DB / MemoryStore（有效期 10 分钟）
 * 4. 调 Resend 发送邮件
 */
export async function createAndSendVerificationCode(
  rawEmail: string
): Promise<CreateCodeResult> {
  const email = rawEmail.trim();
  const emailLower = email.toLowerCase();
  const now = new Date();

  // 1. 检查防刷冷却（60 秒内不可重复发送）
  try {
    const recent = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.emailLower, emailLower),
          gt(emailVerifications.createdAt, new Date(now.getTime() - 60 * 1000))
        )
      )
      .orderBy(desc(emailVerifications.createdAt))
      .limit(1);

    if (recent.length > 0) {
      const elapsed = Math.floor(
        (now.getTime() - new Date(recent[0].createdAt).getTime()) / 1000
      );
      const waitSeconds = Math.max(1, 60 - elapsed);
      return {
        ok: false,
        error: `发送太频繁，请在 ${waitSeconds} 秒后再试`,
        waitSeconds,
      };
    }
  } catch {
    // 降级使用 memStore
    const memRecords = Array.from(memStore.emailVerifications.values()).filter(
      (r) => r.emailLower === emailLower
    );
    const recentMem = memRecords.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
    if (recentMem && now.getTime() - recentMem.createdAt.getTime() < 60 * 1000) {
      const elapsed = Math.floor(
        (now.getTime() - recentMem.createdAt.getTime()) / 1000
      );
      const waitSeconds = Math.max(1, 60 - elapsed);
      return {
        ok: false,
        error: `发送太频繁，请在 ${waitSeconds} 秒后再试`,
        waitSeconds,
      };
    }
  }

  // 2. 生成 6 位验证码（10分钟有效）
  const code = generate6DigitCode();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  const id = crypto.randomUUID();

  // 3. 写入数据库 / memStore
  try {
    await db.insert(emailVerifications).values({
      id,
      email,
      emailLower,
      code,
      attempts: 0,
      expiresAt,
      createdAt: now,
    });
  } catch (dbErr) {
    console.warn("[EmailVerification] DB insert fallback to memory:", dbErr);
    memStore.emailVerifications.set(id, {
      id,
      email,
      emailLower,
      code,
      attempts: 0,
      expiresAt,
      createdAt: now,
    });
  }

  // 4. 发送邮件
  const sendRes = await sendVerificationCodeEmail(email, code);
  if (!sendRes.ok) {
    return {
      ok: false,
      error: sendRes.error || "邮件发送失败，请稍后再试",
    };
  }

  return {
    ok: true,
    devCode: !isRealEmailConfigured() ? code : undefined,
  };
}

/**
 * 校验邮箱验证码：
 * 1. 查找对应 emailLower 且未过期的最新记录
 * 2. 尝试次数 > 5 次作废
 * 3. 匹配则通过并删除记录
 */
export async function verifyEmailCode(
  rawEmail: string,
  rawCode: string
): Promise<VerifyCodeResult> {
  const email = rawEmail.trim();
  const emailLower = email.toLowerCase();
  const code = rawCode.trim();
  const now = new Date();

  if (!code || code.length !== 6) {
    return { ok: false, error: "请输入 6 位有效验证码" };
  }

  try {
    const records = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.emailLower, emailLower),
          gt(emailVerifications.expiresAt, now)
        )
      )
      .orderBy(desc(emailVerifications.createdAt))
      .limit(1);

    if (records.length === 0) {
      return { ok: false, error: "验证码不存在或已过期，请重新获取" };
    }

    const record = records[0];
    if (record.attempts >= 5) {
      return { ok: false, error: "验证码输错次数过多，已作废，请重新获取" };
    }

    if (record.code !== code) {
      // 增加错误尝试次数
      await db
        .update(emailVerifications)
        .set({ attempts: record.attempts + 1 })
        .where(eq(emailVerifications.id, record.id));
      return { ok: false, error: "验证码错误，请重新输入" };
    }

    // 验证成功：删除已用验证码
    await db
      .delete(emailVerifications)
      .where(eq(emailVerifications.id, record.id));

    return { ok: true };
  } catch (err) {
    console.warn("[EmailVerification] DB verify fallback to memory:", err);
    // 降级使用 memStore
    const memRecords = Array.from(memStore.emailVerifications.values()).filter(
      (r) => r.emailLower === emailLower && r.expiresAt.getTime() > now.getTime()
    );
    const record = memRecords.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];

    if (!record) {
      return { ok: false, error: "验证码不存在或已过期，请重新获取" };
    }

    if (record.attempts >= 5) {
      return { ok: false, error: "验证码输错次数过多，已作废，请重新获取" };
    }

    if (record.code !== code) {
      record.attempts += 1;
      return { ok: false, error: "验证码错误，请重新输入" };
    }

    memStore.emailVerifications.delete(record.id);
    return { ok: true };
  }
}
