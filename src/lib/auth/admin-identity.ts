import type { User } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "./password";
import { AccountError } from "./account-error";

type AdminUpdate = Pick<User, "email" | "emailLower" | "passwordHash" | "sessionVersion" | "updatedAt">;
export interface AdminIdentityStore {
  byId(id: string): Promise<User | undefined>;
  byEmail(email: string): Promise<User | undefined>;
  update(id: string, patch: AdminUpdate): Promise<User>;
  create(id: string, patch: AdminUpdate): Promise<User>;
}

/** The caller serializes provisioning/rotation in a database transaction. */
export async function syncAdminIdentity(store: AdminIdentityStore, config: { id?: string; email: string; password: string }) {
  const emailOwner = await store.byEmail(config.email);
  const anchored = await store.byId(config.id ?? "admin-system-root");
  const current = anchored ?? (config.id ? undefined : emailOwner);
  const id = current?.id ?? config.id ?? "admin-system-root";
  if (emailOwner && emailOwner.id !== id) {
    throw new AccountError("管理员邮箱已属于其他账号，请先处理邮箱冲突", 409);
  }
  // Explicit IDs bind existing rows only: a typo must not silently create another identity.
  if (config.id && !current) throw new AccountError("ADMIN_USER_ID 对应账号不存在，请核对原账号 ID", 503);
  const passwordChanged = !current || !await verifyPassword(config.password, current.passwordHash);
  const emailChanged = current?.emailLower !== config.email || current?.email !== config.email;
  if (current && !passwordChanged && !emailChanged) return current;
  const patch: AdminUpdate = {
    email: config.email, emailLower: config.email,
    passwordHash: passwordChanged ? await hashPassword(config.password) : current!.passwordHash,
    sessionVersion: current ? current.sessionVersion + 1 : 0, updatedAt: new Date(),
  };
  return current ? store.update(id, patch) : store.create(id, patch);
}
