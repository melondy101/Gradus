import { eq, sql } from "drizzle-orm";
import { db } from "../client";
import { users, type User } from "../schema/users";
import { memStore } from "../memory-store";
import { ensureSchema } from "../ensure-schema";

/** 仅按主键查；用于 cookie / JWT 解析后的"当前用户"加载。 */
export async function getUserById(id: string): Promise<User | undefined> {
  try {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (rows[0]) {
      memStore.users.set(rows[0].id, rows[0]);
      return rows[0];
    }
    // 查不到行就是真没有。这里不能拿 memStore 顶包——memStore 是写穿缓存，
    // 账号被删后旧条目还在，顶包会让「已删除的用户」继续以 200 通过鉴权，
    // 而 tasks 等关联查询走 DB 返回空，最终呈现为一片空面板。
    return undefined;
  } catch (err) {
    // 只有 DB 真的不可达时才降级到内存态（本地无库运行的兜底）。
    console.error("[users] getUserById DB query failed:", { id, err });
    return memStore.users.get(id);
  }
}

/** 按 email 查（精确匹配）。注册时主查使用 emailLower。 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows[0]) {
      memStore.users.set(rows[0].id, rows[0]);
      return rows[0];
    }
    return undefined; // 库里没有就是没有，不拿 memStore 顶包（见 getUserById）
  } catch (err) {
    console.error("[users] getUserByEmail DB query failed:", { email, err });
    return Array.from(memStore.users.values()).find((u) => u.email === email);
  }
}

/** 按小写邮箱查。登录/注册唯一性检查统一走这里。 */
export async function getUserByEmailLower(emailLower: string): Promise<User | undefined> {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.emailLower, emailLower))
      .limit(1);
    if (rows[0]) {
      memStore.users.set(rows[0].id, rows[0]);
      return rows[0];
    }
    return undefined; // 库里没有就是没有，不拿 memStore 顶包（见 getUserById）
  } catch (err) {
    console.error("[users] getUserByEmailLower DB query failed:", { emailLower, err });
    return Array.from(memStore.users.values()).find((u) => u.emailLower === emailLower);
  }
}

export async function upsertUser(data: {
  id: string;
  email?: string | null;
  emailLower?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  watchaOpenId?: string | null;
  passwordHash?: string | null;
  membershipTier?: string;
  membershipExpiresAt?: Date | null;
  aiGenerateCount?: number;
  aiAdjustCount?: number;
  taskOpsCount?: number;
  lastUsageDate?: string | null;
}): Promise<User> {
  // 确保存储层 schema 完备（自动修补缺失的 watcha_openid 等字段）
  await ensureSchema().catch((err) => {
    console.warn("[users] ensureSchema check returned error:", err);
  });

  const normalizedEmailLower = data.emailLower ?? (data.email ? data.email.toLowerCase() : null);
  const normalizedEmail = data.email ?? normalizedEmailLower;

  // 1. 如果存在邮箱，先检查数据库中是否已存在该邮箱的用户（避免产生新的 ID 触发 email UNIQUE 冲突）
  let targetId = data.id;
  try {
    if (normalizedEmailLower) {
      const existingByEmail = await db
        .select()
        .from(users)
        .where(eq(users.emailLower, normalizedEmailLower))
        .limit(1);
      if (existingByEmail[0]) {
        targetId = existingByEmail[0].id;
      }
    }
  } catch (lookupErr) {
    console.warn("[users] upsertUser email lookup warning:", lookupErr);
  }

  const values: User = {
    id: targetId,
    email: normalizedEmail,
    emailLower: normalizedEmailLower,
    name: data.name ?? null,
    avatarUrl: data.avatarUrl ?? null,
    watchaOpenId: data.watchaOpenId ?? null,
    passwordHash: data.passwordHash ?? "",
    membershipTier: data.membershipTier ?? "free",
    membershipExpiresAt: data.membershipExpiresAt ?? null,
    aiGenerateCount: data.aiGenerateCount ?? 0,
    aiAdjustCount: data.aiAdjustCount ?? 0,
    taskOpsCount: data.taskOpsCount ?? 0,
    lastUsageDate: data.lastUsageDate ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const rows = await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: values.email,
          emailLower: values.emailLower,
          name: values.name,
          avatarUrl: values.avatarUrl,
          watchaOpenId: values.watchaOpenId,
          passwordHash: data.passwordHash ? values.passwordHash : sql`COALESCE(NULLIF(${values.passwordHash}, ''), users.password_hash)`,
          membershipTier: data.membershipTier ? values.membershipTier : sql`users.membership_tier`,
          membershipExpiresAt: data.membershipExpiresAt !== undefined ? values.membershipExpiresAt : sql`users.membership_expires_at`,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (rows[0]) {
      memStore.users.set(rows[0].id, rows[0]);
      return rows[0];
    }
    throw new Error(`upsertUser returning empty rows for id=${targetId}`);
  } catch (dbErr) {
    // 坚决移除静默吞错！DB 写入失败必须抛出错误，不可假装成功导致内存丢失
    console.error("[users] upsertUser FATAL DB ERROR:", {
      targetId,
      email: normalizedEmail,
      error: dbErr instanceof Error ? dbErr.message : dbErr,
      stack: dbErr instanceof Error ? dbErr.stack : undefined,
    });
    throw dbErr;
  }
}

export async function updateUser(
  id: string,
  data: {
    name?: string | null;
    avatarUrl?: string | null;
    membershipTier?: string;
    membershipExpiresAt?: Date | null;
    aiGenerateCount?: number;
    aiAdjustCount?: number;
    taskOpsCount?: number;
    lastUsageDate?: string | null;
  }
): Promise<User | undefined> {
  if (Object.keys(data).length === 0) return getUserById(id);

  try {
    const rows = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (rows[0]) {
      memStore.users.set(rows[0].id, rows[0]);
      return rows[0];
    }
    return undefined;
  } catch (err) {
    console.error("[users] updateUser FATAL DB ERROR:", {
      id,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const rows = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    memStore.users.delete(id);
    return rows.length > 0;
  } catch (err) {
    console.error("[users] deleteUser FATAL DB ERROR:", { id, err });
    throw err;
  }
}

/**
 * 把 users 行上所有 `email` 值同步写入 `emailLower`（小写）。
 */
export async function backfillEmailLower(): Promise<number> {
  try {
    const result = await db.execute(sql`
      UPDATE users
         SET email_lower = LOWER(email)
       WHERE email IS NOT NULL
         AND (email_lower IS NULL OR email_lower <> LOWER(email))
    `);
    const count = (result as unknown as { count?: number }).count;
    return typeof count === "number" ? count : 0;
  } catch (err) {
    console.error("[users] backfillEmailLower failed:", err);
    throw err;
  }
}
