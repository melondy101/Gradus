import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import { consumeAccountCode, type AccountTx } from "./account-code";
import { AccountError } from "./account-error";
import { loginEmail } from "./account-validation";
import { verifyPassword } from "./password";
import { isReservedAdminEmail } from "./reserved-identity";
import { isManagedAdminAccount } from "./admin-config";

async function lockAccount(tx: AccountTx, id: string, version: number) {
  const [user] = await tx.select().from(users).where(eq(users.id, id)).for("update");
  if (!user || user.sessionVersion !== version) throw new AccountError("会话已失效，请重新登录", 401);
  if (isManagedAdminAccount(user)) {
    throw new AccountError("管理员登录凭据由站点配置管理", 403);
  }
  return user;
}

export async function updateAccountEmail(tx: AccountTx, id: string, version: number, email: string, code: string, password: string) {
  if (isReservedAdminEmail(email)) throw new AccountError("该邮箱不支持账号绑定", 403);
  const user = await lockAccount(tx, id, version);
  if (user.passwordHash && !(await verifyPassword(password, user.passwordHash))) throw new AccountError("当前密码不正确", 401);
  const error = await consumeAccountCode(tx, email, "email", id, code);
  if (error) return { error };
  const [updated] = await tx.update(users).set({ email, emailLower: email, sessionVersion: version + 1, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  return { user: updated };
}

export async function updateAccountPassword(tx: AccountTx, id: string, version: number, passwordHash: string, currentPassword: string, code: string) {
  const user = await lockAccount(tx, id, version);
  const email = loginEmail(user.email);
  if (!email) throw new AccountError("请先绑定真实邮箱，再设置密码");
  if (user.passwordHash) {
    if (!(await verifyPassword(currentPassword, user.passwordHash))) throw new AccountError("当前密码不正确", 401);
  } else {
    const error = await consumeAccountCode(tx, email, "password", id, code);
    if (error) return { error };
  }
  const [updated] = await tx.update(users).set({ passwordHash, sessionVersion: version + 1, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  return { user: updated };
}

export async function recoverAccountPassword(tx: AccountTx, email: string, passwordHash: string, code: string) {
  const [user] = await tx.select().from(users).where(eq(users.emailLower, email)).for("update");
  if (!user || isManagedAdminAccount(user)) throw new AccountError("验证码无效或已过期");
  const error = await consumeAccountCode(tx, email, "reset", email, code);
  if (error) return { error };
  await tx.update(users).set({ passwordHash, sessionVersion: user.sessionVersion + 1, updatedAt: new Date() }).where(eq(users.id, user.id));
  return { error: null };
}
