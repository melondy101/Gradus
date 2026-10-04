import { expect, test } from "bun:test";
import type { User } from "@/lib/db/schema";
import { syncAdminIdentity, type AdminIdentityStore } from "./admin-identity";
import { hashPassword, verifyPassword } from "./password";

async function fixture() {
  const user = { id: "legacy-admin", email: "old@example.com", emailLower: "old@example.com",
    passwordHash: await hashPassword("old-password"), sessionVersion: 2, name: "Original",
    avatarUrl: "original-avatar", watchaOpenId: "bound-provider", membershipTier: "premium" } as User;
  const rows = new Map<string, User>([[user.id, user]]);
  let writes = 0;
  const store: AdminIdentityStore = {
    byId: async id => rows.get(id),
    byEmail: async email => [...rows.values()].find(row => row.emailLower === email),
    update: async (id, patch) => { writes++; const row = { ...rows.get(id)!, ...patch }; rows.set(id, row); return row; },
    create: async (id, patch) => { writes++; const row = { id, ...patch } as User; rows.set(id, row); return row; },
  };
  return { user, rows, store, writes: () => writes };
}

test("rotation preserves the account ID, profile and provider binding and increments version only once", async () => {
  const f = await fixture();
  const config = { id: f.user.id, email: "new@example.com", password: "new-password" };
  const rotated = await syncAdminIdentity(f.store, config);
  expect(rotated.id).toBe(f.user.id);
  expect(rotated.name).toBe(f.user.name);
  expect(rotated.avatarUrl).toBe(f.user.avatarUrl);
  expect(rotated.watchaOpenId).toBe(f.user.watchaOpenId);
  expect(rotated.membershipTier).toBe(f.user.membershipTier);
  expect(rotated.sessionVersion).toBe(3);
  expect(await verifyPassword(config.password, rotated.passwordHash)).toBe(true);
  expect(await verifyPassword("old-password", rotated.passwordHash)).toBe(false);
  expect(await syncAdminIdentity(f.store, config)).toBe(rotated);
  expect(f.writes()).toBe(1);
  expect(f.rows.size).toBe(1);
});

test("email collision and mistyped explicit ID fail without modifying either account", async () => {
  const f = await fixture();
  f.rows.set("other", { ...f.user, id: "other", emailLower: "taken@example.com" });
  await expect(syncAdminIdentity(f.store, { id: f.user.id, email: "taken@example.com", password: "new" })).rejects.toThrow("邮箱冲突");
  await expect(syncAdminIdentity(f.store, { id: "typo", email: "unused@example.com", password: "new" })).rejects.toThrow("不存在");
  expect(f.writes()).toBe(0);
  expect(f.rows.get(f.user.id)).toBe(f.user);
});

test("legacy email adoption and new-instance bootstrap keep deterministic identities", async () => {
  const f = await fixture();
  expect((await syncAdminIdentity(f.store, { email: f.user.email!, password: "old-password" })).id).toBe(f.user.id);
  f.rows.clear();
  expect((await syncAdminIdentity(f.store, { email: "admin@example.com", password: "new-password" })).id).toBe("admin-system-root");
});
