import { eq, sql } from "drizzle-orm";
import { db } from "../client";
import { users, type User } from "../schema/users";
import { memStore } from "../memory-store";

/** 仅按主键查；用于 cookie / JWT 解析后的"当前用户"加载。 */
export async function getUserById(id: string): Promise<User | undefined> {
  try {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (rows[0]) return rows[0];
  } catch {
    // DB offline, fallback to memory
  }
  return memStore.users.get(id);
}

/** 按 email 查（精确匹配）。注册时主查使用 emailLower。 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows[0]) return rows[0];
  } catch {
    // DB offline, fallback to memory
  }
  return Array.from(memStore.users.values()).find((u) => u.email === email);
}

/** 按小写邮箱查。登录/注册唯一性检查统一走这里。 */
export async function getUserByEmailLower(emailLower: string): Promise<User | undefined> {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.emailLower, emailLower))
      .limit(1);
    if (rows[0]) return rows[0];
  } catch {
    // DB offline, fallback to memory
  }
  return Array.from(memStore.users.values()).find((u) => u.emailLower === emailLower);
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
  } catch {
    // ignore
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
  } catch (dbErr) {
    console.warn("[users] upsertUser fallback to memory or update:", dbErr);
  }

  const existing = memStore.users.get(targetId) || Array.from(memStore.users.values()).find(u => u.emailLower === normalizedEmailLower);
  const updatedUser: User = {
    id: targetId,
    email: values.email,
    emailLower: values.emailLower,
    name: values.name,
    avatarUrl: values.avatarUrl,
    watchaOpenId: values.watchaOpenId ?? existing?.watchaOpenId ?? null,
    passwordHash: data.passwordHash ? values.passwordHash : (existing ? existing.passwordHash : values.passwordHash),
    membershipTier: data.membershipTier ?? existing?.membershipTier ?? values.membershipTier,
    membershipExpiresAt: (data.membershipExpiresAt !== undefined ? values.membershipExpiresAt : existing?.membershipExpiresAt) ?? null,
    aiGenerateCount: existing?.aiGenerateCount ?? values.aiGenerateCount,
    aiAdjustCount: existing?.aiAdjustCount ?? values.aiAdjustCount,
    taskOpsCount: existing?.taskOpsCount ?? values.taskOpsCount,
    lastUsageDate: existing?.lastUsageDate ?? values.lastUsageDate,
    createdAt: existing ? existing.createdAt : new Date(),
    updatedAt: new Date(),
  };
  memStore.users.set(targetId, updatedUser);
  return updatedUser;
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
  } catch {
    // DB offline, fallback to memory
  }

  const existing = memStore.users.get(id);
  if (existing) {
    const updated: User = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    memStore.users.set(id, updated);
    return updated;
  }
  return undefined;
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const rows = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    memStore.users.delete(id);
    return rows.length > 0;
  } catch {
    const existed = memStore.users.has(id);
    memStore.users.delete(id);
    return existed;
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
  } catch {
    let count = 0;
    for (const u of memStore.users.values()) {
      if (u.email && (!u.emailLower || u.emailLower !== u.email.toLowerCase())) {
        u.emailLower = u.email.toLowerCase();
        count++;
      }
    }
    return count;
  }
}
