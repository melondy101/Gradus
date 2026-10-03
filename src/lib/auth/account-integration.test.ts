import { afterAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, tasks, subtasks, notifications, redemptionRecords, emailVerifications } from "@/lib/db/schema";
import { mergeAccounts, mergedMembership } from "./merge-accounts";
import { accountCodeKey, consumeAccountCode, type AccountTx } from "./account-code";
import { hashPassword, verifyPassword } from "./password";
import { recoverAccountPassword, updateAccountEmail, updateAccountPassword } from "./account-credentials";

const integration = process.env.RUN_ACCOUNT_INTEGRATION === "1" ? test : test.skip;
afterAll(async () => { if (process.env.RUN_ACCOUNT_INTEGRATION === "1") await db.$client.end(); });
async function expectRejection(work: Promise<unknown>, message: string) {
  let caught: unknown;
  try { await work; } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toBe(message);
}
async function rollback(work: (tx: AccountTx) => Promise<void>) {
  const marker = new Error("rollback-test-fixtures");
  try { await db.transaction(async tx => { await work(tx); throw marker; }); }
  catch (error) { if (error !== marker) throw error; }
}
async function fixture(tx: AccountTx) {
  const sourceId = crypto.randomUUID(), targetId = crypto.randomUUID();
  const email = `${targetId}@account-tests.invalid`;
  const [source, target] = await tx.insert(users).values([
    { id: sourceId, email: `${sourceId}@watcha.user`, emailLower: `${sourceId}@watcha.user`, watchaOpenId: `test-${sourceId}`, name: "Companion" },
    { id: targetId, email, emailLower: email, passwordHash: await hashPassword("fixture-password"), name: "Existing" },
  ]).returning();
  const [task] = await tx.insert(tasks).values({ userId: sourceId, title: "fixture-task" }).returning();
  await tx.insert(subtasks).values({ taskId: task.id, title: "fixture-subtask", completed: true });
  await tx.insert(notifications).values({ id: crypto.randomUUID(), userId: sourceId, title: "fixture", content: "fixture" });
  await tx.insert(redemptionRecords).values([
    { userId: sourceId, code: "fixture-shared", tier: "pro", durationDays: 30 },
    { userId: targetId, code: "fixture-shared", tier: "pro", durationDays: 30 },
    { userId: sourceId, code: "fixture-unique", tier: "pro", durationDays: 30 },
  ]);
  return { source, target, task, email };
}

integration("merging verified accounts preserves task details and notifications, deduplicates redemptions, and switches both logins", () => rollback(async tx => {
  const { source, target, task, email } = await fixture(tx);
  const merged = await mergeAccounts(tx, source.id, email, "fixture-password", 0);
  expect(merged.id).toBe(target.id);
  expect(merged.name).toBe("Existing");
  expect(merged.watchaOpenId).toBe(source.watchaOpenId);
  expect(merged.passwordHash).toBe(target.passwordHash);
  expect(merged.sessionVersion).toBe(1);
  expect(await tx.select().from(users).where(eq(users.id, source.id))).toHaveLength(0);
  expect((await tx.select().from(tasks).where(eq(tasks.id, task.id)))[0].userId).toBe(target.id);
  expect((await tx.select().from(subtasks).where(eq(subtasks.taskId, task.id)))[0].completed).toBe(true);
  expect(await tx.select().from(notifications).where(eq(notifications.userId, target.id))).toHaveLength(1);
  expect(await tx.select().from(redemptionRecords).where(eq(redemptionRecords.userId, target.id))).toHaveLength(2);
}), 60000);

integration("wrong passwords and conflicting third-party identities leave both accounts and data untouched", () => rollback(async tx => {
  const { source, target, task, email } = await fixture(tx);
  await expectRejection(mergeAccounts(tx, source.id, email, "wrong-password", 0), "邮箱或密码不正确");
  await tx.update(users).set({ watchaOpenId: `other-${target.id}` }).where(eq(users.id, target.id));
  await expectRejection(mergeAccounts(tx, source.id, email, "fixture-password", 0), "旧账号已绑定另一个观猹账号");
  expect((await tx.select().from(tasks).where(eq(tasks.id, task.id)))[0].userId).toBe(source.id);
  expect(await tx.select().from(users).where(eq(users.id, source.id))).toHaveLength(1);
}), 60000);

integration("account codes are scoped to purpose and user, count incorrect attempts, and can only be consumed once", () => rollback(async tx => {
  const email = `${crypto.randomUUID()}@account-tests.invalid`, principal = crypto.randomUUID(), id = crypto.randomUUID();
  await tx.insert(emailVerifications).values({ id, email, emailLower: accountCodeKey(email, "email", principal), code: "234567", expiresAt: new Date(Date.now() + 60000) });
  expect(await consumeAccountCode(tx, email, "password", principal, "234567")).toBeTruthy();
  expect(await consumeAccountCode(tx, email, "email", "another-user", "234567")).toBeTruthy();
  expect(await consumeAccountCode(tx, email, "email", principal, "999999")).toBe("验证码不正确");
  expect((await tx.select().from(emailVerifications).where(eq(emailVerifications.id, id)))[0].attempts).toBe(1);
  expect(await consumeAccountCode(tx, email, "email", principal, "234567")).toBeNull();
  expect(await consumeAccountCode(tx, email, "email", principal, "234567")).toBeTruthy();
}), 60000);

test("merge keeps the strongest valid membership without extending premium with lower-tier time", () => {
  const now = new Date("2026-10-03"), proExpiry = new Date("2027-10-03"), premiumExpiry = new Date("2026-11-03");
  const source = { membershipTier: "premium", membershipExpiresAt: premiumExpiry } as Parameters<typeof mergedMembership>[0];
  const target = { membershipTier: "pro", membershipExpiresAt: proExpiry } as Parameters<typeof mergedMembership>[1];
  expect(mergedMembership(source, target, now)).toEqual({ membershipTier: "premium", membershipExpiresAt: premiumExpiry });
  expect(mergedMembership(source, target, new Date("2026-12-03"))).toEqual({ membershipTier: "pro", membershipExpiresAt: proExpiry });
});

integration("a third-party user verifies an email, creates a password, and later changes it using the current password", () => rollback(async tx => {
  const { source } = await fixture(tx);
  const email = `${crypto.randomUUID()}@account-tests.invalid`;
  const addCode = async (purpose: "email" | "password", code: string) => tx.insert(emailVerifications).values({
    id: crypto.randomUUID(), email, emailLower: accountCodeKey(email, purpose, source.id), code, expiresAt: new Date(Date.now() + 60000),
  });
  await addCode("email", "234567");
  const bound = await updateAccountEmail(tx, source.id, 0, email, "234567", "");
  expect(bound.user?.email).toBe(email);
  expect(bound.user?.sessionVersion).toBe(1);
  const hash = await hashPassword("new-login-password");
  expect((await updateAccountPassword(tx, source.id, 1, hash, "", "234567")).error).toBeTruthy();
  await addCode("password", "345678");
  const set = await updateAccountPassword(tx, source.id, 1, hash, "", "345678");
  expect(set.user?.sessionVersion).toBe(2);
  expect(await verifyPassword("new-login-password", set.user!.passwordHash)).toBe(true);
  await expectRejection(updateAccountPassword(tx, source.id, 2, hash, "wrong-password", ""), "当前密码不正确");
  const changed = await updateAccountPassword(tx, source.id, 2, await hashPassword("updated-login-password"), "new-login-password", "");
  expect(changed.user?.sessionVersion).toBe(3);
  expect(await verifyPassword("new-login-password", changed.user!.passwordHash)).toBe(false);
  expect(await verifyPassword("updated-login-password", changed.user!.passwordHash)).toBe(true);
}), 60000);

integration("email recovery changes only the verified account, revokes old sessions, and rejects reuse", () => rollback(async tx => {
  const { source, target, email } = await fixture(tx);
  const passwordHash = await hashPassword("recovered-password");
  await tx.insert(emailVerifications).values({ id: crypto.randomUUID(), email, emailLower: accountCodeKey(email, "reset", email), code: "456789", expiresAt: new Date(Date.now() + 60000) });
  expect((await recoverAccountPassword(tx, email, passwordHash, "111111")).error).toBe("验证码不正确");
  expect((await recoverAccountPassword(tx, email, passwordHash, "456789")).error).toBeNull();
  const [updated] = await tx.select().from(users).where(eq(users.id, target.id));
  expect(updated.sessionVersion).toBe(1);
  expect(await verifyPassword("fixture-password", updated.passwordHash)).toBe(false);
  expect(await verifyPassword("recovered-password", updated.passwordHash)).toBe(true);
  expect((await recoverAccountPassword(tx, email, passwordHash, "456789")).error).toBeTruthy();
  expect((await tx.select().from(users).where(eq(users.id, source.id)))[0].sessionVersion).toBe(0);
}), 60000);
