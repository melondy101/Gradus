import { getUserById, upsertUser } from "@/lib/db/queries";
import type { User } from "@/lib/db/schema";

/**
 * 创建一个**临时账号**（匿名访客）。
 *
 * 设计要点：
 *   - 不做密码（passwordHash = ""），永远无法登录——这是演示版本对临时账号的明确预期。
 *   - email 用 `temp-{uuid}@anon.local` 形式，UUID 保证唯一性；邮箱唯一约束不会撞。
 *   - emailLower 与 email 同值（已经是小写）。
 *   - name = "访客 {4 位 hex}"：以 userName 显示，让用户感知到"我是个临时身份"。
 *
 * 调用方：middleware 在缺 cookie 时调用。
 */
export async function createTempAccount(): Promise<User> {
  const id = crypto.randomUUID();
  const hex = id.replace(/-/g, "").slice(0, 4);
  const email = `temp-${id}@anon.local`;

  const user = await upsertUser({
    id,
    email,
    emailLower: email,
    name: `访客 ${hex}`,
    passwordHash: "",
  });

  if (user) {
    return user;
  }

  // 如果 upsert 在并发/迁移差异场景下未返回行，回退按主键读取，避免把临时账号创建变成 500。
  const existing = await getUserById(id);
  if (existing) return existing;

  throw new Error("createTempAccount: temp user insert returned no row");
}

/**
 * 判断某 user 是否为临时账号。
 * 临时账号的判定用 `passwordHash === ""` + email 后缀。
 *
 * 用于：
 *   - register 合并：临时账号用户注册时把数据迁过去
 *   - 清理任务（v2 TODO）：批量删 30 天未动的临时账号
 */
export function isTempAccount(user: Pick<User, "email" | "passwordHash">): boolean {
  if (user.passwordHash !== "") return false;
  return typeof user.email === "string" && user.email.endsWith("@anon.local");
}
